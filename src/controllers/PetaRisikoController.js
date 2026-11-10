import * as PetakLahan from '../models/PetakLahan.js';
import * as TitikPanas from '../models/TitikPanas.js';
import * as Notifikasi from '../models/Notifikasi.js';

// KF02: bobot dan ambang ditetapkan tim (SKPL batasan 8)
export const KONFIG_SKOR = {
  w1: 20,
  w2: 1,
  w3: 5,
  ambangSedang: 30,
  ambangTinggi: 60
};

const TIGA_JAM_MS = 3 * 60 * 60 * 1000;
const BBOX_WILAYAH = '101.371,-0.561,101.488,-0.471';
const PUSAT_WILAYAH = { lat: -0.516, lng: 101.43 };

export function tingkatDariSkor(skor) {
  if (skor >= KONFIG_SKOR.ambangTinggi) return 'tinggi';
  if (skor >= KONFIG_SKOR.ambangSedang) return 'sedang';
  return 'rendah';
}

export function isDataUsang(waktuUpdateTerakhir, sekarang = new Date()) {
  if (!waktuUpdateTerakhir) return true;
  const waktu = new Date(waktuUpdateTerakhir);
  if (Number.isNaN(waktu.getTime())) return true;
  return sekarang.getTime() - waktu.getTime() > TIGA_JAM_MS;
}

export function hitungHariKering(riwayatHujanHarian = []) {
  let hariKering = 0;
  for (let i = riwayatHujanHarian.length - 1; i >= 0; i--) {
    if (riwayatHujanHarian[i] < 1) hariKering++;
    else break;
  }
  return hariKering;
}

export function hitungSkorRisiko(titikBerlaku, dataCurahHujan = {}, daftarPetak = []) {
  const curahHujan = dataCurahHujan.curahHujan ?? 0;
  const hariKering = dataCurahHujan.hariKering ?? 0;

  return daftarPetak.map((petak) => {
    const b = petak.batasWilayah;
    const jumlahTitik = titikBerlaku.filter((t) => {
      const { lat, lng } = t.koordinat;
      return lat >= b.latMin && lat < b.latMaks && lng >= b.lngMin && lng < b.lngMaks;
    }).length;

    const skorMentah =
      KONFIG_SKOR.w1 * jumlahTitik +
      KONFIG_SKOR.w3 * hariKering -
      KONFIG_SKOR.w2 * curahHujan;
    const skor = Math.max(0, Math.round(skorMentah * 100) / 100);

    return {
      idPetak: petak.idPetak,
      skor,
      tingkatRisiko: tingkatDariSkor(skor)
    };
  });
}

async function ambilDataTitikPanas() {
  const mapKey = process.env.MAP_KEY?.trim();
  if (!mapKey) return [];

  try {
    const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${mapKey}/VIIRS_SNPP_NRT/${BBOX_WILAYAH}/1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];

    const isi = await res.text();
    const [header, ...baris] = isi.trim().split('\n');
    if (!header || baris.length === 0) return [];

    const kolom = header.split(',');
    const iLat = kolom.indexOf('latitude');
    const iLng = kolom.indexOf('longitude');
    const iTanggal = kolom.indexOf('acq_date');
    const iJam = kolom.indexOf('acq_time');

    return baris
      .filter(Boolean)
      .map((b) => {
        const isiBaris = b.split(',');
        const jam = (isiBaris[iJam] || '0000').padStart(4, '0');
        return {
          latitude: Number(isiBaris[iLat]),
          longitude: Number(isiBaris[iLng]),
          waktuDeteksi: new Date(`${isiBaris[iTanggal]}T${jam.slice(0, 2)}:${jam.slice(2)}:00Z`)
        };
      })
      .filter(
        (t) =>
            !Number.isNaN(t.latitude) &&
            !Number.isNaN(t.longitude) &&
            !Number.isNaN(t.waktuDeteksi.getTime())
      );
  } catch {
    return [];
  }
}

async function ambilDataCuaca() {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${PUSAT_WILAYAH.lat}&longitude=${PUSAT_WILAYAH.lng}` +
    '&daily=precipitation_sum&past_days=7&forecast_days=1&timezone=Asia%2FJakarta';
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Open-Meteo membalas ${res.status}`);
  const json = await res.json();
  // elemen terakhir = hari ini (belum lengkap), jadi pakai sampai kemarin
  const sampaiKemarin = json.daily.precipitation_sum.slice(0, -1);
  return {
    curahHujan: sampaiKemarin.at(-1) ?? 0,
    hariKering: hitungHariKering(sampaiKemarin)
  };
}

async function picuCekAmbang(daftarPetakNaik) {
  // TODO(C18): panggil PeringatanSMSController.cekAmbangRisiko(daftarPetakNaik) setelah UC07 di-merge
}

async function jalankanHapusNomorDicabut() {
  // TODO(C18): panggil PeringatanSMSController.hapusNomorDicabut() setelah UC07 di-merge
}

// C02 perbaruiData(token): Object, sesuai DPPL (Algo-001)
export async function perbaruiData(token) {
  if (!process.env.CRON_TOKEN || token !== process.env.CRON_TOKEN) {
    return { status: 401, pesan: 'Token rahasia tidak valid' };
  }

  try {
    const [dataTitik, dataCuaca] = await Promise.all([
      ambilDataTitikPanas(),
      ambilDataCuaca()
    ]);

    if (dataTitik.length > 0) {
      await TitikPanas.simpanBaru(dataTitik);
    }

    const titikBerlaku = await TitikPanas.ambilTitikBerlaku();
    const daftarPetakLama = await PetakLahan.ambilSemua();
    const petaLama = new Map(daftarPetakLama.map((p) => [p.idPetak, p]));

    const hasilSkor = hitungSkorRisiko(titikBerlaku, dataCuaca, daftarPetakLama);
    const daftarPetakNaik = [];

    for (const item of hasilSkor) {
      const petakLama = petaLama.get(item.idPetak);
      await PetakLahan.perbaruiSkor(item.idPetak, item.skor, item.tingkatRisiko);

      if (petakLama && petakLama.tingkatRisiko !== 'tinggi' && item.tingkatRisiko === 'tinggi') {
        daftarPetakNaik.push(item);
      }
    }

    if (daftarPetakNaik.length > 0) {
      await picuCekAmbang(daftarPetakNaik);
    }
    await jalankanHapusNomorDicabut();

    return {
      status: 200,
      pesan: 'Pembaruan skor berhasil',
      jumlahPetak: hasilSkor.length,
      jumlahTitik: titikBerlaku.length
    };
  } catch (err) {
    console.error('Gagal memperbarui skor:', err.message);
    return {
      status: 500,
      pesan: 'Pembaruan skor gagal, menggunakan data cache terakhir'
    };
  }
}

// Pembungkus untuk POST /api/perbarui (cron eksternal)
export async function perbaruiDataHandler(req, res) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const hasil = await perbaruiData(token);
  res.status(hasil.status).json(hasil);
}

// Algo-002 (GET /api/peta)
export async function ambilDataPeta(req, res) {
  const idPetugas = req.pengguna.idPengguna;
  try {
    const daftarPetak = await PetakLahan.ambilSemua();
    if (daftarPetak.length === 0) {
      return res.status(404).json({ pesan: 'Data petak belum dikonfigurasi' });
    }

    let waktuTerakhir = daftarPetak[0].waktuUpdateTerakhir;
    for (const p of daftarPetak) {
      if (!p.waktuUpdateTerakhir) {
        waktuTerakhir = null;
        break;
      }
      if (waktuTerakhir && new Date(p.waktuUpdateTerakhir) < new Date(waktuTerakhir)) {
        waktuTerakhir = p.waktuUpdateTerakhir;
      }
    }

    const isUsang = isDataUsang(waktuTerakhir);
    const daftarNotifikasi = await Notifikasi.ambilBelumDibaca(idPetugas);

    return res.status(200).json({
      isUsang,
      waktuUpdate: waktuTerakhir,
      daftarPetak,
      daftarNotifikasi
    });
  } catch (err) {
    console.error('Gagal mengambil data peta:', err.message);
    return res.status(500).json({ pesan: 'Terjadi kesalahan di server' });
  }
}