import pool from '../db.js';

const R_BUMI_KM = 6371;

function keRadian(derajat) {
  return (derajat * Math.PI) / 180;
}

function keObjek(b) {
  return {
    idTitikPanas: b.id_titik_panas,
    koordinat: { lat: b.latitude, lng: b.longitude },
    waktuDeteksi: b.waktu_deteksi,
    statusValiditas: b.status_validitas,
    keterangan: b.keterangan,
    waktuTandaiKeliru: b.waktu_tandai_keliru
  };
}

export function haversine(k1, k2) {
  const selisihLat = keRadian(k2.lat - k1.lat);
  const selisihLng = keRadian(k2.lng - k1.lng);
  const a =
    Math.sin(selisihLat / 2) ** 2 +
    Math.cos(keRadian(k1.lat)) * Math.cos(keRadian(k2.lat)) * Math.sin(selisihLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R_BUMI_KM * c;
}

// Algo-003 (KF15)
export function isDikecualikan(titik, titikBaru = [], sekarang = new Date()) {
  if (titik.statusValiditas !== 'keliru' || !titik.waktuTandaiKeliru) {
    return false;
  }

  const waktuKeliru = new Date(titik.waktuTandaiKeliru);
  const selisihJam = (sekarang.getTime() - waktuKeliru.getTime()) / (1000 * 60 * 60);
  if (selisihJam > 24) {
    return false;
  }

  for (const t of titikBaru) {
    if (t.idTitikPanas === titik.idTitikPanas) continue;
    if (new Date(t.waktuDeteksi) <= waktuKeliru) continue;

    if (haversine(titik.koordinat, t.koordinat) <= 0.5) {
      return false;
    }
  }

  return true;
}

// Q-005
export async function simpanBaru(daftarTitik, db = pool) {
  let jumlahBaru = 0;
  for (const t of daftarTitik) {
    const hasil = await db.query(
      `INSERT INTO titik_panas (latitude, longitude, waktu_deteksi, status_validitas)
       VALUES ($1, $2, $3, 'valid')
       ON CONFLICT (latitude, longitude, waktu_deteksi) DO NOTHING`,
      [t.latitude, t.longitude, t.waktuDeteksi]
    );
    jumlahBaru += hasil.rowCount;
  }
  return jumlahBaru;
}

// Q-006
export async function ambilTitikBerlaku(db = pool) {
  const hasil = await db.query(
    `SELECT id_titik_panas, latitude, longitude, waktu_deteksi, status_validitas, keterangan, waktu_tandai_keliru
     FROM titik_panas
     WHERE waktu_deteksi >= NOW() - INTERVAL '24 hours'`
  );
  const hasilQ006 = hasil.rows.map(keObjek);
  return hasilQ006.filter((titik) => !isDikecualikan(titik, hasilQ006));
}

// Tambahan di luar DPPL untuk membedakan 404 dan 403 pada tandai keliru. Lihat catatan deviasi.
export async function ambilById(idTitikPanas, db = pool) {
  const hasil = await db.query(
    `SELECT id_titik_panas, latitude, longitude, waktu_deteksi, status_validitas, keterangan, waktu_tandai_keliru
     FROM titik_panas WHERE id_titik_panas = $1`,
    [idTitikPanas]
  );
  return hasil.rows.length === 0 ? null : keObjek(hasil.rows[0]);
}

// Q-007. Titik yang sudah ditandai dalam 24 jam terakhir tidak diubah lagi, supaya masa
// pengecualian dari skor risiko tidak bisa diperpanjang dengan menandai ulang (KF15)
export async function tandaiKeliru(idTitikPanas, keterangan, db = pool) {
  const hasil = await db.query(
    `UPDATE titik_panas
     SET status_validitas = 'keliru', keterangan = $2, waktu_tandai_keliru = NOW()
     WHERE id_titik_panas = $1
       AND (waktu_tandai_keliru IS NULL OR waktu_tandai_keliru < NOW() - INTERVAL '24 hours')`,
    [idTitikPanas, keterangan]
  );
  return hasil.rowCount > 0;
}