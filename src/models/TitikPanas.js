import pool from '../db.js';

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
