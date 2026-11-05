import pool from '../db.js';

// Q-028
export async function buat(idPengguna, isiPesan, db = pool) {
  await db.query(
    'INSERT INTO notifikasi (id_pengguna, isi_pesan, waktu_dibuat, sudah_dibaca) VALUES ($1, $2, NOW(), FALSE)',
    [idPengguna, isiPesan]
  );
}
