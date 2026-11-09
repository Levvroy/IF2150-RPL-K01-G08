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
  const lat1 = k1.lat ?? k1.latitude;
  const lng1 = k1.lng ?? k1.longitude;
  const lat2 = k2.lat ?? k2.latitude;
  const lng2 = k2.lng ?? k2.longitude;

  const selisihLat = keRadian(lat2 - lat1);
  const selisihLng = keRadian(lng2 - lng1);
  const a =
    Math.sin(selisihLat / 2) ** 2 +
    Math.cos(keRadian(lat1)) * Math.cos(keRadian(lat2)) * Math.sin(selisihLng / 2) ** 2;
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

  const kAsal = titik.koordinat ?? { lat: titik.latitude, lng: titik.longitude };

  for (const t of titikBaru) {
    if (t.idTitikPanas === titik.idTitikPanas) continue;
    if (new Date(t.waktuDeteksi) <= waktuKeliru) continue;

    const kPembanding = t.koordinat ?? { lat: t.latitude, lng: t.longitude };
    if (haversine(kAsal, kPembanding) <= 0.5) {
      return false;
    }
  }

  return true;
}

// Q-005
export async function simpanBaru(daftarTitik, db = pool) {
  let jumlahBaru = 0;
  for (const t of daftarTitik) {
    const lat = t.koordinat?.lat ?? t.latitude ?? t.lat;
    const lng = t.koordinat?.lng ?? t.longitude ?? t.lng;
    const waktu = t.waktuDeteksi ?? t.waktu;
    const hasil = await db.query(
      `INSERT INTO titik_panas (latitude, longitude, waktu_deteksi, status_validitas)
       VALUES ($1, $2, $3, 'valid')
       ON CONFLICT (latitude, longitude, waktu_deteksi) DO NOTHING`,
      [lat, lng, waktu]
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

// Q-007. rowCount 0 berarti titik tidak ditemukan, sehingga controller bisa membalas 404 (KF14)
export async function tandaiKeliru(idTitikPanas, keterangan, db = pool) {
  const hasil = await db.query(
    `UPDATE titik_panas
     SET status_validitas = 'keliru', keterangan = $2, waktu_tandai_keliru = NOW()
     WHERE id_titik_panas = $1`,
    [idTitikPanas, keterangan]
  );
  return hasil.rowCount > 0;
}