import * as Warga from '../models/Warga.js';
import * as PeringatanSMS from '../models/PeringatanSMS.js';
import { kirimKeGateway } from './SimulasiSMSController.js';

// C18 PeringatanSMSController

const BATAS_HARI_NOMOR_DICABUT = 30; // KNF12

// Mengirim pesan lewat gateway. Bernilai true jika gateway menerima, false jika gagal atau error.
async function kirimSMS(nomorHP, isiPesan) {
  try {
    return await kirimKeGateway(nomorHP, isiPesan);
  } catch (err) {
    return false;
  }
}

// Algo-012. Dipanggil dari perbaruiData untuk petak yang naik ke tingkat 'tinggi'.
export async function cekAmbangRisiko(daftarPetakNaik) {
  for (const petak of daftarPetakNaik) {
    if (petak.tingkatRisiko !== 'tinggi') {
      continue;
    }

    const id = petak.idPetak;
    try {
      const sudahDikirim = await PeringatanSMS.adaDalam24Jam(id);
      if (sudahDikirim) {
        continue;
      }

      const daftarWarga = await Warga.ambilAktifByPetak(id);
      for (const warga of daftarWarga) {
        const pesan =
          'PERINGATAN!! Petak Lahan ' + id + ' yang dekat dengan anda berisiko tinggi terjadinya karhutla. ' +
          "Balas pesan ini dengan 'STOP' untuk berhenti menerima peringatan";

        let status = 'gagal';
        if (await kirimSMS(warga.nomorHP, pesan)) {
          status = 'terkirim';
        }
        await PeringatanSMS.catat(warga.idWarga, id, pesan, status);
      }
    } catch (err) {
      console.error('Gagal memproses peringatan SMS untuk petak ' + id + ':', err.message);
    }
  }
}

// KF22. Hanya balasan "STOP" yang diproses. Mengembalikan true jika persetujuan dicabut.
export async function prosesBalasanSTOP(nomorHP, isiBalasan) {
  if (typeof isiBalasan !== 'string') {
    return false;
  }
  if (isiBalasan.trim().toUpperCase() !== 'STOP') {
    return false;
  }

  const warga = await Warga.cariByNomor(nomorHP);
  if (warga === null || warga.statusPersetujuan !== 'aktif') {
    return false;
  }

  await Warga.cabutPersetujuan(warga.idWarga);
  return true;
}

// KNF12. Dipanggil di akhir perbaruiData.
export async function hapusNomorDicabut() {
  await Warga.hapusDicabutLama(BATAS_HARI_NOMOR_DICABUT);
}