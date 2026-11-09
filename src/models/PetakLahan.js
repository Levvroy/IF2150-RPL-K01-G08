import pool from '../db.js';

function keObjek(b) {
  return {
    idPetak: b.id_petak,
    batasWilayah: { latMin: b.lat_min, latMaks: b.lat_maks, lngMin: b.lng_min, lngMaks: b.lng_maks },
    skorRisiko: b.skor_risiko,
    tingkatRisiko: b.tingkat_risiko,
    waktuUpdateTerakhir: b.waktu_update_terakhir
  };
}

// Q-001
export async function ambilSemua(db = pool) {
  const hasil = await db.query(
    `SELECT id_petak, lat_min, lat_maks, lng_min, lng_maks, skor_risiko, tingkat_risiko, waktu_update_terakhir
     FROM petak_lahan
     ORDER BY id_petak`
  );
  return hasil.rows.map(keObjek);
}

// Q-002
export async function ambilById(idPetak, db = pool) {
  const hasil = await db.query(
    `SELECT id_petak, lat_min, lat_maks, lng_min, lng_maks, skor_risiko, tingkat_risiko, waktu_update_terakhir
     FROM petak_lahan WHERE id_petak = $1`,
    [idPetak]
  );
  return hasil.rows.length === 0 ? null : keObjek(hasil.rows[0]);
}

// Q-003
export async function ambilRekomendasi(batas = 5, db = pool) {
  const hasil = await db.query(
    `SELECT p.id_petak, p.skor_risiko, p.tingkat_risiko
     FROM petak_lahan p
     WHERE p.id_petak NOT IN (
       SELECT id_petak FROM jadwal_pekerjaan
       WHERE status IN ('ditugaskan', 'menunggu verifikasi')
     )
     ORDER BY p.skor_risiko DESC
     LIMIT $1`,
    [batas]
  );
  return hasil.rows.map((b) => ({
    idPetak: b.id_petak,
    skorRisiko: b.skor_risiko,
    tingkatRisiko: b.tingkat_risiko
  }));
}

// Q-004
export async function perbaruiSkor(idPetak, skor, tingkat, db = pool) {
  await db.query(
    `UPDATE petak_lahan
     SET skor_risiko = $2, tingkat_risiko = $3, waktu_update_terakhir = NOW()
     WHERE id_petak = $1`,
    [idPetak, skor, tingkat]
  );
}