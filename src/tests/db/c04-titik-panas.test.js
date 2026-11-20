// C04 TitikPanas dengan database nyata: Q-005, Q-006, Q-007, ambilById, dan Algo-003.
import { test, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../db.js';
import {
  simpanBaru,
  ambilTitikBerlaku,
  ambilById,
  tandaiKeliru
} from '../../models/TitikPanas.js';
import { bersihkanDataUjiPeta } from '../helpers/peta-risiko.js';

before(async () => {
  await bersihkanDataUjiPeta(pool);
});

afterEach(async () => {
  await bersihkanDataUjiPeta(pool);
});

after(async () => {
  await bersihkanDataUjiPeta(pool);
  await pool.end();
});

test('C04-UT08 simpanBaru: menyimpan titik panas baru dan mengembalikan jumlah baris tersimpan (Q-005)', async () => {
  const waktu = new Date(Date.now() - 60 * 60 * 1000);
  const jumlah = await simpanBaru([
    { latitude: -87.995, longitude: 101.405, waktuDeteksi: waktu },
    { latitude: -87.996, longitude: 101.406, waktuDeteksi: waktu }
  ]);
  assert.equal(jumlah, 2);

  const { rows } = await pool.query('SELECT COUNT(*)::int AS jumlah FROM titik_panas WHERE latitude < -80');
  assert.equal(rows[0].jumlah, 2);
});

test('C04-UT09 simpanBaru: kombinasi latitude, longitude, dan waktu_deteksi ganda diabaikan (ON CONFLICT)', async () => {
  const waktu = new Date(Date.now() - 60 * 60 * 1000);
  const titik = [{ latitude: -87.995, longitude: 101.405, waktuDeteksi: waktu }];
  assert.equal(await simpanBaru(titik), 1);
  assert.equal(await simpanBaru(titik), 0);
});

test('C04-UT10 simpanBaru: larik kosong mengembalikan 0 tanpa menambah baris', async () => {
  assert.equal(await simpanBaru([]), 0);
  const { rows } = await pool.query('SELECT COUNT(*)::int AS jumlah FROM titik_panas WHERE latitude < -80');
  assert.equal(rows[0].jumlah, 0);
});

test('C04-UT11 ambilTitikBerlaku: menyertakan titik valid 24 jam terakhir dan menyaring yang lebih dari 24 jam (Q-006)', async () => {
  const baru = await pool.query(
    `INSERT INTO titik_panas (latitude, longitude, waktu_deteksi, status_validitas)
     VALUES (-87.995, 101.405, NOW() - INTERVAL '2 hours', 'valid')
     RETURNING id_titik_panas`
  );
  const lama = await pool.query(
    `INSERT INTO titik_panas (latitude, longitude, waktu_deteksi, status_validitas)
     VALUES (-87.996, 101.406, NOW() - INTERVAL '26 hours', 'valid')
     RETURNING id_titik_panas`
  );

  const hasil = await ambilTitikBerlaku();
  assert.ok(hasil.some((t) => t.idTitikPanas === baru.rows[0].id_titik_panas));
  assert.equal(hasil.some((t) => t.idTitikPanas === lama.rows[0].id_titik_panas), false);
});

test('C04-UT12 ambilTitikBerlaku: mengecualikan titik bertanda keliru dalam 24 jam terakhir (KF15)', async () => {
  const { rows } = await pool.query(
    `INSERT INTO titik_panas (latitude, longitude, waktu_deteksi, status_validitas, keterangan, waktu_tandai_keliru)
     VALUES (-87.995, 101.405, NOW() - INTERVAL '3 hours', 'keliru', 'Asap sampah', NOW() - INTERVAL '1 hour')
     RETURNING id_titik_panas`
  );
  const hasil = await ambilTitikBerlaku();
  assert.equal(hasil.some((t) => t.idTitikPanas === rows[0].id_titik_panas), false);
});

test('C04-UT13 ambilTitikBerlaku: titik keliru kembali berlaku jika ada deteksi baru dalam radius 500 m (Algo-003)', async () => {
  const keliru = await pool.query(
    `INSERT INTO titik_panas (latitude, longitude, waktu_deteksi, status_validitas, keterangan, waktu_tandai_keliru)
     VALUES (-87.995, 101.405, NOW() - INTERVAL '4 hours', 'keliru', 'Asap sampah', NOW() - INTERVAL '2 hours')
     RETURNING id_titik_panas`
  );
  await pool.query(
    `INSERT INTO titik_panas (latitude, longitude, waktu_deteksi, status_validitas)
     VALUES (-87.9955, 101.4055, NOW() - INTERVAL '30 minutes', 'valid')`
  );

  const hasil = await ambilTitikBerlaku();
  assert.ok(hasil.some((t) => t.idTitikPanas === keliru.rows[0].id_titik_panas));
});

test('C04-UT14 ambilById: mengembalikan objek titik panas camelCase lengkap untuk ID yang ada', async () => {
  const { rows } = await pool.query(
    `INSERT INTO titik_panas (latitude, longitude, waktu_deteksi, status_validitas)
     VALUES (-87.995, 101.405, NOW() - INTERVAL '1 hour', 'valid')
     RETURNING id_titik_panas`
  );
  const titik = await ambilById(rows[0].id_titik_panas);
  assert.equal(titik.idTitikPanas, rows[0].id_titik_panas);
  assert.deepEqual(titik.koordinat, { lat: -87.995, lng: 101.405 });
  assert.equal(titik.statusValiditas, 'valid');
});

test('C04-UT15 ambilById: mengembalikan null bila ID titik panas tidak ada', async () => {
  assert.equal(await ambilById(2147483000), null);
});

test('C04-UT16 tandaiKeliru: mengubah status menjadi keliru, menyimpan keterangan dan waktu (Q-007)', async () => {
  const { rows } = await pool.query(
    `INSERT INTO titik_panas (latitude, longitude, waktu_deteksi, status_validitas)
     VALUES (-87.995, 101.405, NOW() - INTERVAL '1 hour', 'valid')
     RETURNING id_titik_panas`
  );
  const id = rows[0].id_titik_panas;

  assert.equal(await tandaiKeliru(id, 'Pembakaran jerami'), true);
  const titik = await ambilById(id);
  assert.equal(titik.statusValiditas, 'keliru');
  assert.equal(titik.keterangan, 'Pembakaran jerami');
  assert.ok(titik.waktuTandaiKeliru instanceof Date);
});

test('C04-UT17 tandaiKeliru: penandaan ulang dalam 24 jam ditolak (false) dan keterangan lama dipertahankan', async () => {
  const { rows } = await pool.query(
    `INSERT INTO titik_panas (latitude, longitude, waktu_deteksi, status_validitas, keterangan, waktu_tandai_keliru)
     VALUES (-87.995, 101.405, NOW() - INTERVAL '3 hours', 'keliru', 'Keterangan awal', NOW() - INTERVAL '2 hours')
     RETURNING id_titik_panas`
  );
  const id = rows[0].id_titik_panas;

  assert.equal(await tandaiKeliru(id, 'Keterangan baru'), false);
  const titik = await ambilById(id);
  assert.equal(titik.keterangan, 'Keterangan awal');
});

test('C04-UT18 tandaiKeliru: setelah lewat 24 jam titik boleh ditandai ulang (true)', async () => {
  const { rows } = await pool.query(
    `INSERT INTO titik_panas (latitude, longitude, waktu_deteksi, status_validitas, keterangan, waktu_tandai_keliru)
     VALUES (-87.995, 101.405, NOW() - INTERVAL '30 hours', 'keliru', 'Keterangan lama', NOW() - INTERVAL '25 hours')
     RETURNING id_titik_panas`
  );
  const id = rows[0].id_titik_panas;

  assert.equal(await tandaiKeliru(id, 'Keterangan diperbarui'), true);
  assert.equal((await ambilById(id)).keterangan, 'Keterangan diperbarui');
});

test('C04-UT19 tandaiKeliru: ID titik panas tidak ditemukan mengembalikan false', async () => {
  assert.equal(await tandaiKeliru(2147483000, 'Tidak ada'), false);
});
