import pool from '../db.js';

// Q-028
export async function buat(idPengguna, isiPesan, db = pool) {
  await db.query(
    'INSERT INTO notifikasi (id_pengguna, isi_pesan, waktu_dibuat, sudah_dibaca) VALUES ($1, $2, NOW(), FALSE)',
    [idPengguna, isiPesan]
  );
}

// Q-029
export async function ambilBelumDibaca(idPengguna, db = pool) {
  const hasil = await db.query(
    `SELECT id_notifikasi, isi_pesan, waktu_dibuat
     FROM notifikasi
     WHERE id_pengguna = $1
       AND sudah_dibaca = FALSE
     ORDER BY waktu_dibuat DESC`,
    [idPengguna]
  );
  return hasil.rows.map((b) => ({ idNotifikasi: b.id_notifikasi, isiPesan: b.isi_pesan, waktuDibuat: b.waktu_dibuat }));
}

// Q-030
export async function tandaiDibaca(idNotifikasi, idPengguna, db = pool) {
  await db.query(
    'UPDATE notifikasi SET sudah_dibaca = TRUE WHERE id_notifikasi = $1 AND id_pengguna = $2',
    [idNotifikasi, idPengguna]
  );
}
