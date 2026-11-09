import pool from '../db.js';

// Q-025
export async function catat(idWarga, idPetak, isiPesan, status) {
  await pool.query(
    `INSERT INTO peringatan_sms (id_warga, id_petak, isi_pesan, waktu_kirim, status)
     VALUES ($1, $2, $3, NOW(), $4)`,
    [idWarga, idPetak, isiPesan, status]
  );
}

// Algo-014 and Q-024
export async function adaDalam24Jam(idPetak) {
  const { rows } = await pool.query(
    `SELECT COUNT(id_peringatan)::int AS jumlah
     FROM peringatan_sms
     WHERE id_petak = $1
     AND waktu_kirim >= NOW() - INTERVAL '24 hours'
     AND status = 'terkirim'`,
    [idPetak]
  );
  return rows[0].jumlah > 0;
}

// Tambahan di luar DPPL untuk dipakai halaman simulasi (I-08). Lihat catatan deviasi.
export async function ambilTerkirimTerbaru(batas = 50) {
  const { rows } = await pool.query(
    `SELECT p.id_peringatan, p.isi_pesan, p.waktu_kirim, w.nomor_hp
     FROM peringatan_sms p JOIN warga w ON w.id_warga = p.id_warga
     WHERE p.status = 'terkirim'
     ORDER BY p.waktu_kirim DESC
     LIMIT $1`,
    [batas]
  );
  return rows.map((r) => ({
    idPeringatan: r.id_peringatan,
    isiPesan: r.isi_pesan,
    waktuKirim: r.waktu_kirim,
    nomorHP: r.nomor_hp,
  }));
}