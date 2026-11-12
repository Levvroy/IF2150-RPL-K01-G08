import pool from '../db.js';

// Tambahan di luar DPPL untuk cek kepemilikan tugas pada tandai keliru (UC06). Lihat catatan deviasi.
export async function adaTugasTitikPanas(idTitikPanas, idRelawan, db = pool) {
  const hasil = await db.query(
    `SELECT 1 FROM jadwal_pekerjaan
     WHERE id_titik_panas = $1 AND id_relawan = $2 AND status <> 'dibatalkan'`,
    [idTitikPanas, idRelawan]
  );
  return hasil.rows.length > 0;
}

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

function keObjek(b) {
  return {
    idJadwal: b.id_jadwal,
    idPetak: b.id_petak,
    idTitikPanas: b.id_titik_panas,
    jenisPekerjaan: b.jenis_pekerjaan,
    status: b.status,
    tanggal: b.tanggal
  };
}

// Q-009. Kolom tanggal dibaca sebagai teks 'YYYY-MM-DD' supaya tidak bergeser zona waktu saat diubah ke JSON.
export async function ambilAktifByRelawan(idRelawan, db = pool) {
  const hasil = await db.query(
    `SELECT id_jadwal, id_petak, id_titik_panas, jenis_pekerjaan, status, TO_CHAR(tanggal, 'YYYY-MM-DD') AS tanggal
     FROM jadwal_pekerjaan
     WHERE id_relawan = $1
       AND status IN ('ditugaskan', 'menunggu verifikasi')`,
    [idRelawan]
  );
  return hasil.rows.map(keObjek);
}

// Q-011. Syarat pemilik dan status ada di WHERE, jadi pengecekan dan perubahan terjadi dalam satu perintah.
export async function batalkan(idJadwal, alasan, idRelawan, db = pool) {
  const hasil = await db.query(
    `UPDATE jadwal_pekerjaan
     SET status = 'dibatalkan', alasan_pembatalan = $2
     WHERE id_jadwal = $1
       AND id_relawan = $3
       AND status = 'ditugaskan'`,
    [idJadwal, alasan, idRelawan]
  );
  return hasil.rowCount > 0;
}
