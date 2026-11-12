import * as PeringatanSMS from '../models/PeringatanSMS.js';
import { prosesBalasanSTOP } from './PeringatanSMSController.js';

// Gateway SMS simulasi (SKPL batasan 4) dan handler halaman public/simulasi-sms/ (I-08).
// Hanya untuk prototipe, bukan bagian C18.

const PESAN_GALAT_SERVER = 'Terjadi kesalahan di server';

// Nomor yang dianggap tidak aktif diatur lewat .env, dipisahkan koma, misalnya:
// NOMOR_TIDAK_AKTIF=081200000099,081200000098
// Jika variabel ini kosong atau tidak ada, semua nomor dianggap aktif.
function ambilDaftarNomorTidakAktif() {
  const teks = process.env.NOMOR_TIDAK_AKTIF;
  if (!teks) {
    return [];
  }

  const hasil = [];
  for (const bagian of teks.split(',')) {
    const nomor = bagian.trim();
    if (nomor !== '') {
      hasil.push(nomor);
    }
  }
  return hasil;
}

// Gateway tiruan: tidak memanggil layanan apa pun.
// Bernilai true jika gateway "menerima" pesan, false jika gagal (UC07 alternatif 1).
export async function kirimKeGateway(nomorHP, isiPesan) {
  const daftarTidakAktif = ambilDaftarNomorTidakAktif();
  if (daftarTidakAktif.includes(nomorHP)) {
    return false;
  }
  return true;
}

// GET /api/simulasi-sms/pesan
export async function ambilPesanSimulasi(req, res) {
  try {
    const daftarPesan = await PeringatanSMS.ambilTerkirimTerbaru(50);
    res.set('Cache-Control', 'no-store');
    res.json(daftarPesan);
  } catch (err) {
    console.error('Gagal mengambil pesan simulasi:', err.message);
    res.status(500).json({ pesan: PESAN_GALAT_SERVER });
  }
}

// POST /api/simulasi-sms/balasan
export async function balasSimulasi(req, res) {
  const nomorHP = req.body.nomorHP;
  const isiBalasan = req.body.isiBalasan;

  if (typeof nomorHP !== 'string' || typeof isiBalasan !== 'string' || nomorHP === '' || isiBalasan.trim() === '') {
    return res.status(400).json({ pesan: 'nomorHP dan isiBalasan wajib diisi' });
  }

  try {
    const dicabut = await prosesBalasanSTOP(nomorHP, isiBalasan);
    res.json({ diterima: true, dicabut: dicabut });
  } catch (err) {
    console.error('Gagal memproses balasan simulasi:', err.message);
    res.status(500).json({ pesan: PESAN_GALAT_SERVER });
  }
}