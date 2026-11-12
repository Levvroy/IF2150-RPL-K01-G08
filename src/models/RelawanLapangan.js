import pool from '../db.js';

// Q-012. Kontak tidak diambil karena formulir jadwal hanya menampilkan nama
export async function ambilRelawanAktif(db = pool) {
  const hasil = await db.query(
    `SELECT id_relawan, nama
     FROM relawan_lapangan
     WHERE status_aktif = TRUE
     ORDER BY nama`
  );
  return hasil.rows.map((r) => ({ idRelawan: r.id_relawan, nama: r.nama }));
}

// Q-013. ::int karena COUNT bertipe bigint yang oleh pg dikembalikan sebagai string
export async function hitungTugasAktif(idRelawan, db = pool) {
  const hasil = await db.query(
    `SELECT COUNT(*)::int AS jumlah
     FROM jadwal_pekerjaan
     WHERE id_relawan = $1
       AND status IN ('ditugaskan', 'menunggu verifikasi')`,
    [idRelawan]
  );
  return hasil.rows[0].jumlah;
}
