import bcrypt from 'bcrypt';
import pool from '../../db.js';

export const PASSWORD = 'rahasia123';

export async function bersihkan() {
  const idUji = `SELECT id_pengguna FROM pengguna WHERE username LIKE 'uji-setup-%'`;
  await pool.query(`DELETE FROM laporan_bukti_kerja WHERE id_jadwal IN (SELECT id_jadwal FROM jadwal_pekerjaan WHERE id_relawan IN (${idUji}))`);
  await pool.query(`DELETE FROM notifikasi WHERE id_pengguna IN (${idUji}) OR isi_pesan LIKE '%uji-setup%'`);
  await pool.query(`DELETE FROM jadwal_pekerjaan WHERE id_relawan IN (${idUji})`);
  const petakUji = `SELECT id_petak FROM petak_lahan WHERE lat_min < -80`;
  await pool.query(`DELETE FROM peringatan_sms WHERE id_petak IN (${petakUji})`);
  await pool.query(`DELETE FROM warga WHERE id_petak IN (${petakUji})`);
  await pool.query(`DELETE FROM petak_lahan WHERE lat_min < -80`);
  await pool.query(`DELETE FROM petak_lahan WHERE lat_min < -80`);
  await pool.query(`DELETE FROM relawan_lapangan WHERE id_relawan IN (${idUji})`);
  await pool.query(`DELETE FROM pengguna WHERE username LIKE 'uji-setup-%'`);
}

export async function buatPengguna(nama, peran) {
  const hash = await bcrypt.hash(PASSWORD, 10);
  const username = 'uji-setup-' + nama;
  const { rows } = await pool.query('INSERT INTO pengguna (username, password_hash, peran) VALUES ($1, $2, $3) RETURNING id_pengguna', [username, hash, peran]);
  const id = rows[0].id_pengguna;
  if (peran === 'relawan') {
    await pool.query('INSERT INTO relawan_lapangan (id_relawan, nama) VALUES ($1, $2)', [id, username]);
  }
  return { id, username };
}

export async function buatPetak(skor, tingkat) {
  const { rows } = await pool.query(`INSERT INTO petak_lahan (lat_min, lat_maks, lng_min, lng_maks, skor_risiko, tingkat_risiko) VALUES (-88, -87.99, 101.40, 101.41, $1, $2) RETURNING id_petak`, [skor, tingkat]);
  return rows[0].id_petak;
}

export async function buatJadwal(idRelawan, idPetak, status = 'ditugaskan') {
  const { rows } = await pool.query(`INSERT INTO jadwal_pekerjaan (id_relawan, id_petak, jenis_pekerjaan, tanggal, status) VALUES ($1, $2, 'patroli', '2026-11-20', $3) RETURNING id_jadwal`, [idRelawan, idPetak, status]);
  return rows[0].id_jadwal;
}

export function resPalsu() {
  return {
    kode: 200,
    isi: null,
    status(k) { this.kode = k; return this; },
    json(i) { this.isi = i; return this; }
  };
}

export async function buatWarga(idPetak, nomorHP, status = 'aktif', hariLaluDicabut = null) {
  const { rows } = await pool.query(
    `INSERT INTO warga (nomor_hp, id_petak, status_persetujuan, waktu_dicabut)
     VALUES ($1, $2, $3, NOW() - make_interval(days => $4::int))
     RETURNING id_warga`,
    [nomorHP, idPetak, status, hariLaluDicabut]
  );
  return rows[0].id_warga;
}