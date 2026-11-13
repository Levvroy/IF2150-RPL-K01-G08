// Butuh Postgres dari docker compose
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../db.js';
import { buatJadwal } from '../../controllers/JadwalController.js';

const LAT_PENANDA = -87.789;
let idRelawan;
let idPetak;

async function bersihkan() {
  await pool.query(`DELETE FROM notifikasi WHERE id_pengguna IN (SELECT id_pengguna FROM pengguna WHERE username LIKE 'uji-jadwal-%')`);
  await pool.query(`DELETE FROM jadwal_pekerjaan WHERE id_relawan IN (SELECT id_pengguna FROM pengguna WHERE username LIKE 'uji-jadwal-%')`);
  await pool.query(`DELETE FROM petak_lahan WHERE lat_min = $1`, [LAT_PENANDA]);
  await pool.query(`DELETE FROM relawan_lapangan WHERE id_relawan IN (SELECT id_pengguna FROM pengguna WHERE username LIKE 'uji-jadwal-%')`);
  await pool.query(`DELETE FROM pengguna WHERE username LIKE 'uji-jadwal-%'`);
}

async function panggil() {
  const res = { kode: 200, data: null, status(k) { this.kode = k; return this; }, json(d) { this.data = d; return this; } };
  await buatJadwal({ body: { idRelawan, idPetak, jenisPekerjaan: 'patroli', tanggal: '2026-11-20' } }, res);
  return res.kode;
}

before(async () => {
  await bersihkan();
  const { rows } = await pool.query(
    `INSERT INTO pengguna (username, password_hash, peran) VALUES ('uji-jadwal-relawan', 'tidak-dipakai', 'relawan') RETURNING id_pengguna`
  );
  idRelawan = rows[0].id_pengguna;
  await pool.query(`INSERT INTO relawan_lapangan (id_relawan, nama) VALUES ($1, 'uji-jadwal-relawan')`, [idRelawan]);
  const petak = await pool.query(
    `INSERT INTO petak_lahan (lat_min, lat_maks, lng_min, lng_maks) VALUES ($1, $2, 0, 0.01) RETURNING id_petak`,
    [LAT_PENANDA, LAT_PENANDA + 0.01]
  );
  idPetak = petak.rows[0].id_petak;
});

after(async () => {
  await bersihkan();
  await pool.end();
});

test('relawan dengan kurang dari 3 tugas aktif bisa diberi tugas (KF06)', async () => {
  assert.equal(await panggil(), 201);
  assert.equal(await panggil(), 201);
  assert.equal(await panggil(), 201);
});

test('tugas keempat ditolak 409 dan tidak tersimpan (KF06)', async () => {
  assert.equal(await panggil(), 409);
  const { rows } = await pool.query(`SELECT COUNT(*)::int AS jumlah FROM jadwal_pekerjaan WHERE id_relawan = $1`, [idRelawan]);
  assert.equal(rows[0].jumlah, 3);
});

test('tugas yang dibatalkan tidak dihitung tugas aktif (Q-013)', async () => {
  await pool.query(
    `UPDATE jadwal_pekerjaan SET status = 'dibatalkan' WHERE id_jadwal = (SELECT MIN(id_jadwal) FROM jadwal_pekerjaan WHERE id_relawan = $1)`,
    [idRelawan]
  );
  assert.equal(await panggil(), 201);
});
