// Butuh Postgres dari docker compose
// Issue #29: id_titik_panas diisi otomatis oleh Q-008, bukan dari form I-03
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../db.js';
import { buatJadwal } from '../../controllers/JadwalController.js';

const LAT_PETAK_ADA = -87.889;
const LAT_PETAK_KOSONG = -87.869;
let idRelawan;
let idPetakAda;
let idPetakKosong;
let idTitikLama;
let idTitikBaru;

async function bersihkan() {
  const idUji = `SELECT id_pengguna FROM pengguna WHERE username = 'uji-jadwaltp-relawan'`;
  await pool.query(`DELETE FROM notifikasi WHERE id_pengguna IN (${idUji})`);
  await pool.query(`DELETE FROM jadwal_pekerjaan WHERE id_relawan IN (${idUji})`);
  await pool.query(`DELETE FROM titik_panas WHERE latitude BETWEEN -87.89 AND -87.85`);
  await pool.query(`DELETE FROM petak_lahan WHERE lat_min IN ($1, $2)`, [LAT_PETAK_ADA, LAT_PETAK_KOSONG]);
  await pool.query(`DELETE FROM relawan_lapangan WHERE id_relawan IN (${idUji})`);
  await pool.query(`DELETE FROM pengguna WHERE username = 'uji-jadwaltp-relawan'`);
}

async function buatPetak(lat) {
  const { rows } = await pool.query(
    `INSERT INTO petak_lahan (lat_min, lat_maks, lng_min, lng_maks) VALUES ($1, $2, 0, 0.01) RETURNING id_petak`,
    [lat, lat + 0.01]
  );
  return rows[0].id_petak;
}

async function buatTitik(lat, jamLalu) {
  const { rows } = await pool.query(
    `INSERT INTO titik_panas (latitude, longitude, waktu_deteksi)
     VALUES ($1, 0.005, NOW() - make_interval(hours => $2)) RETURNING id_titik_panas`,
    [lat, jamLalu]
  );
  return rows[0].id_titik_panas;
}

async function simpanJadwal(idPetak, jenisPekerjaan) {
  const res = { kode: 200, data: null, status(k) { this.kode = k; return this; }, json(d) { this.data = d; return this; } };
  await buatJadwal({ body: { idRelawan, idPetak, jenisPekerjaan, tanggal: '2026-11-21' } }, res);
  return res;
}

async function idTitikTersimpan(idJadwal) {
  const { rows } = await pool.query(`SELECT id_titik_panas FROM jadwal_pekerjaan WHERE id_jadwal = $1`, [idJadwal]);
  return rows[0].id_titik_panas;
}

before(async () => {
  await bersihkan();
  const { rows } = await pool.query(
    `INSERT INTO pengguna (username, password_hash, peran) VALUES ('uji-jadwaltp-relawan', 'tidak-dipakai', 'relawan') RETURNING id_pengguna`
  );
  idRelawan = rows[0].id_pengguna;
  await pool.query(`INSERT INTO relawan_lapangan (id_relawan, nama) VALUES ($1, 'uji-jadwaltp-relawan')`, [idRelawan]);
  idPetakAda = await buatPetak(LAT_PETAK_ADA);
  idPetakKosong = await buatPetak(LAT_PETAK_KOSONG);
  idTitikLama = await buatTitik(LAT_PETAK_ADA + 0.002, 10);
  idTitikBaru = await buatTitik(LAT_PETAK_ADA + 0.004, 2);
});

after(async () => {
  await bersihkan();
  await pool.end();
});

test('pengecekan titik panas menyimpan titik terbaru di petak itu (Q-008)', async () => {
  const res = await simpanJadwal(idPetakAda, 'pengecekan titik panas');
  assert.equal(res.kode, 201);
  assert.equal(res.data.idTitikPanas, idTitikBaru);
  assert.notEqual(res.data.idTitikPanas, idTitikLama);
  assert.equal(await idTitikTersimpan(res.data.idJadwal), idTitikBaru);
});

test('pengecekan di petak tanpa titik panas tetap tersimpan, kolomnya NULL', async () => {
  const res = await simpanJadwal(idPetakKosong, 'pengecekan titik panas');
  assert.equal(res.kode, 201);
  assert.equal(await idTitikTersimpan(res.data.idJadwal), null);
});

test('patroli tidak diberi titik panas walaupun petaknya punya titik', async () => {
  const res = await simpanJadwal(idPetakAda, 'patroli');
  assert.equal(res.kode, 201);
  assert.equal(await idTitikTersimpan(res.data.idJadwal), null);
});
