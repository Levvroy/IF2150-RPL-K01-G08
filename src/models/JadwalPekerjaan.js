import pool from '../db.js';

// Q-010. idRelawan null berarti petugas boleh memproses tugas relawan mana pun.
// Pengecekan status lama dan perubahan terjadi dalam satu perintah (KF13, KF24).
export async function perbaruiStatus(idJadwal, statusBaru, statusLama, idRelawan = null, db = pool) {
  const hasil = await db.query(
    `UPDATE jadwal_pekerjaan
     SET status = $2
     WHERE id_jadwal = $1
       AND status = $3
       AND ($4::int IS NULL OR id_relawan = $4)`,
    [idJadwal, statusBaru, statusLama, idRelawan]
  );
  return hasil.rowCount > 0;
}
