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

// Q-002
export async function ambilById(idPetak, db = pool) {
  const hasil = await db.query(
    `SELECT id_petak, lat_min, lat_maks, lng_min, lng_maks, skor_risiko, tingkat_risiko, waktu_update_terakhir
     FROM petak_lahan WHERE id_petak = $1`,
    [idPetak]
  );
  return hasil.rows.length === 0 ? null : keObjek(hasil.rows[0]);
}
