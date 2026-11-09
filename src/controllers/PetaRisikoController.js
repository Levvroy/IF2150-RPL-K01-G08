import * as PetakLahan from '../models/PetakLahan.js';
import * as TitikPanas from '../models/TitikPanas.js';
import * as Notifikasi from '../models/Notifikasi.js';
import { tandaiNotifikasiDibaca as tandaiDibacaHandler } from './DaftarTugasController.js';

export const KONFIG_SKOR = {
  w1: Number(process.env.BOBOT_TITIK ?? 20),
  w2: Number(process.env.BOBOT_HUJAN ?? 1),
  w3: Number(process.env.BOBOT_KERING ?? 5),
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
  const hariKering =
    dataCurahHujan.hariKering ?? hitungHariKering(dataCurahHujan.riwayatHarian ?? []);

  return daftarPetak.map((petak) => {
    const b = petak.batasWilayah ?? petak;
    const jumlahTitik = titikBerlaku.filter((t) => {
      const lat = t.koordinat?.lat ?? t.latitude ?? t.lat;
      const lng = t.koordinat?.lng ?? t.longitude ?? t.lng;
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
      skorRisiko: skor,
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
    const baris = isi.trim().split('\n').slice(1);
    return baris
      .filter(Boolean)
      .map((b) => {
        const [lat, lng, tanggal, jam] = b.split(',');
        const jamPad = (jam || '0000').padStart(4, '0');
        const waktuDeteksi = new Date(`${tanggal}T${jamPad.slice(0, 2)}:${jamPad.slice(2, 4)}:00Z`);
        return { latitude: Number(lat), longitude: Number(lng), waktuDeteksi };
      })
      .filter((t) => !Number.isNaN(t.latitude) && !Number.isNaN(t.longitude));
  } catch {
    return [];
  }
}

async function ambilDataCuaca() {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${PUSAT_WILAYAH.lat}&longitude=${PUSAT_WILAYAH.lng}` +
      '&daily=precipitation_sum&past_days=7&forecast_days=1&timezone=GMT';
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error('Gagal memuat cuaca');

    const json = await res.json();
    const riwayatHarian = json?.daily?.precipitation_sum ?? [];
    const curahHujan = riwayatHarian.at(-1) ?? 0;
    return { curahHujan, hariKering: hitungHariKering(riwayatHarian), riwayatHarian };
  } catch {
    return { curahHujan: 0, hariKering: 2, riwayatHarian: [0, 0] };
  }
}

async function picuCekAmbang(daftarPetakNaik) {
  try {
    const modul = await import('./PeringatanSMSController.js');
    const fn = modul.cekAmbangRisiko ?? modul.default?.cekAmbangRisiko;
    if (fn) await fn(daftarPetakNaik);
  } catch {
    // PeringatanSMSController belum di-merge
  }
}

async function jalankanHapusNomorDicabut() {
  try {
    const modul = await import('./PeringatanSMSController.js');
    const fn = modul.hapusNomorDicabut ?? modul.default?.hapusNomorDicabut;
    if (fn) await fn();
  } catch {
    // PeringatanSMSController belum di-merge
  }
}

function ekstrakTokenCron(req) {
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7).trim();
  return (
    req.headers['x-cron-token'] ||
    req.headers['cron-token'] ||
    auth ||
    req.body?.token ||
    ''
  );
}

// Algo-001 (POST /api/perbarui dan npm run perbarui)
export async function perbaruiData(tokenAtauReq, res) {
  const adalahExpress =
    tokenAtauReq && typeof tokenAtauReq === 'object' && 'headers' in tokenAtauReq;
  const token = adalahExpress ? ekstrakTokenCron(tokenAtauReq) : tokenAtauReq;

  if (!process.env.CRON_TOKEN || token !== process.env.CRON_TOKEN) {
    const hasil = { status: 401, pesan: 'Token rahasia tidak valid' };
    return res ? res.status(401).json({ pesan: hasil.pesan }) : hasil;
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

    const hasil = {
      status: 200,
      pesan: 'Pembaruan skor berhasil',
      jumlahPetak: hasilSkor.length,
      jumlahTitik: titikBerlaku.length
    };
    return res ? res.status(200).json(hasil) : hasil;
  } catch (err) {
    console.error('Gagal memperbarui skor:', err.message);
    const hasil = {
      status: 500,
      pesan: 'Pembaruan skor gagal, menggunakan data cache terakhir'
    };
    return res ? res.status(500).json({ pesan: hasil.pesan }) : hasil;
  }
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

export const tandaiNotifikasiDibaca = tandaiDibacaHandler;