// Tes UC06 terhadap database sungguhan (butuh Postgres dari docker-compose menyala dan tabel sudah dibuat).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../db.js';
import { tandaiKeliru } from '../../controllers/DeteksiKeliruController.js';

const LAT_PENANDA = -88.456; // penanda data uji, supaya sisa tes yang gagal bisa dibersihkan
let idPemilik;
let idRelawanLain;
let idTitik;

async function bersihkan() {
  await pool.query(`DELETE FROM jadwal_pekerjaan WHERE id_relawan IN (SELECT id_pengguna FROM pengguna WHERE username LIKE 'uji-keliru-%')`);
  await pool.query(`DELETE FROM titik_panas WHERE latitude = $1`, [LAT_PENANDA]);
  await pool.query(`DELETE FROM petak_lahan WHERE lat_min = $1`, [LAT_PENANDA]);
  await pool.query(`DELETE FROM relawan_lapangan WHERE id_relawan IN (SELECT id_pengguna FROM pengguna WHERE username LIKE 'uji-keliru-%')`);
  await pool.query(`DELETE FROM pengguna WHERE username LIKE 'uji-keliru-%'`);
}

async function buatRelawan(username) {
  const { rows } = await pool.query(
    `INSERT INTO pengguna (username, password_hash, peran) VALUES ($1, 'tidak-dipakai', 'relawan') RETURNING id_pengguna`,
    [username]
  );
  await pool.query(`INSERT INTO relawan_lapangan (id_relawan, nama) VALUES ($1, $2)`, [rows[0].id_pengguna, username]);
  return rows[0].id_pengguna;
}

async function panggil(idTitikPanas, idRelawan, keterangan = 'Asap dari pembakaran sampah') {
  const res = { kode: 200, data: null, status(k) { this.kode = k; return this; }, json(d) { this.data = d; return this; } };
  await tandaiKeliru({ params: { id: String(idTitikPanas) }, body: { keterangan }, pengguna: { idPengguna: idRelawan } }, res);
  return res.kode;
}

before(async () => {
  await bersihkan();
  idPemilik = await buatRelawan('uji-keliru-pemilik');
  idRelawanLain = await buatRelawan('uji-keliru-lain');

  const petak = await pool.query(
    `INSERT INTO petak_lahan (lat_min, lat_maks, lng_min, lng_maks) VALUES ($1, $2, 0, 0.01) RETURNING id_petak`,
    [LAT_PENANDA, LAT_PENANDA + 0.01]
  );
  const titik = await pool.query(
    `INSERT INTO titik_panas (latitude, longitude, waktu_deteksi) VALUES ($1, 0.005, NOW()) RETURNING id_titik_panas`,
    [LAT_PENANDA]
  );
  idTitik = titik.rows[0].id_titik_panas;
  await pool.query(
    `INSERT INTO jadwal_pekerjaan (id_relawan, id_petak, id_titik_panas, jenis_pekerjaan, tanggal)
     VALUES ($1, $2, $3, 'pengecekan titik panas', CURRENT_DATE)`,
    [idPemilik, petak.rows[0].id_petak, idTitik]
  );
});

after(async () => {
  await bersihkan();
  await pool.end();
});

test('titik panas yang tidak ada dibalas 404', async () => {
  assert.equal(await panggil(999999999, idPemilik), 404);
});

test('relawan lain tidak bisa menandai titik panas dari tugas orang lain (403)', async () => {
  assert.equal(await panggil(idTitik, idRelawanLain), 403);
});

test('pemilik tugas berhasil menandai keliru (200)', async () => {
  assert.equal(await panggil(idTitik, idPemilik), 200);
  const { rows } = await pool.query(`SELECT status_validitas, keterangan FROM titik_panas WHERE id_titik_panas = $1`, [idTitik]);
  assert.equal(rows[0].status_validitas, 'keliru');
  assert.equal(rows[0].keterangan, 'Asap dari pembakaran sampah');
});

test('menandai ulang dalam 24 jam dibalas 409 dan waktu penandaan tidak berubah (KF15)', async () => {
  const sebelum = await pool.query(`SELECT waktu_tandai_keliru FROM titik_panas WHERE id_titik_panas = $1`, [idTitik]);
  assert.equal(await panggil(idTitik, idPemilik, 'Tanda ulang'), 409);
  const sesudah = await pool.query(`SELECT waktu_tandai_keliru, keterangan FROM titik_panas WHERE id_titik_panas = $1`, [idTitik]);
  assert.deepEqual(sesudah.rows[0].waktu_tandai_keliru, sebelum.rows[0].waktu_tandai_keliru);
  assert.equal(sesudah.rows[0].keterangan, 'Asap dari pembakaran sampah');
});

test('setelah lewat 24 jam titik boleh ditandai lagi', async () => {
  await pool.query(`UPDATE titik_panas SET waktu_tandai_keliru = NOW() - INTERVAL '25 hours' WHERE id_titik_panas = $1`, [idTitik]);
  assert.equal(await panggil(idTitik, idPemilik, 'Masih asap sampah'), 200);
});
