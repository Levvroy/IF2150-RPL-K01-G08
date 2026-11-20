// C07 JadwalPekerjaan.simpan() dengan database nyata: Q-008, termasuk pemilihan titik panas
// untuk tugas 'pengecekan titik panas'. Petak uji berbatas lat -88 s.d. -87.99 dan lng 101.40 s.d. 101.41.
import { test, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../db.js';
import { simpan } from '../../models/JadwalPekerjaan.js';
import { bersihkan, buatPengguna, buatPetak } from '../helpers/fixture.js';

const JAM = 60 * 60 * 1000;
let relawan, petak;

async function hapusTitikUji() {
  await pool.query('DELETE FROM jadwal_pekerjaan WHERE id_titik_panas IN (SELECT id_titik_panas FROM titik_panas WHERE latitude < -80)');
  await pool.query('DELETE FROM titik_panas WHERE latitude < -80');
}

async function buatTitik(lat, lng, jamLalu) {
  const { rows } = await pool.query(
    'INSERT INTO titik_panas (latitude, longitude, waktu_deteksi) VALUES ($1, $2, $3) RETURNING id_titik_panas',
    [lat, lng, new Date(Date.now() - jamLalu * JAM)]
  );
  return rows[0].id_titik_panas;
}

function dataJadwal(jenisPekerjaan = 'patroli') {
  return { idRelawan: relawan.id, idPetak: petak, jenisPekerjaan, tanggal: '2026-11-21' };
}

before(async () => {
  await hapusTitikUji();
  await bersihkan();
  relawan = await buatPengguna('c07-relawan', 'relawan');
  petak = await buatPetak(70, 'tinggi');
});

afterEach(async () => {
  await pool.query('DELETE FROM jadwal_pekerjaan WHERE id_relawan = $1', [relawan.id]);
  await hapusTitikUji();
});

after(async () => {
  await hapusTitikUji();
  await bersihkan();
  await pool.end();
});

test('C07-UT01 simpan: tugas patroli tersimpan berstatus ditugaskan tanpa titik panas, tanggal tetap YYYY-MM-DD', async () => {
  await buatTitik(-87.995, 101.405, 1);
  const jadwal = await simpan(dataJadwal());
  assert.equal(jadwal.status, 'ditugaskan');
  assert.equal(jadwal.tanggal, '2026-11-21');
  assert.equal(jadwal.idTitikPanas, null);
  const { rows } = await pool.query('SELECT id_relawan, id_petak, jenis_pekerjaan FROM jadwal_pekerjaan WHERE id_jadwal = $1', [jadwal.idJadwal]);
  assert.deepEqual(rows[0], { id_relawan: relawan.id, id_petak: petak, jenis_pekerjaan: 'patroli' });
});

test('C07-UT02 simpan: pengecekan titik panas memakai titik terbaru di dalam petak, titik di luar petak diabaikan', async () => {
  await buatTitik(-87.995, 101.405, 5);
  const terbaru = await buatTitik(-87.996, 101.404, 1);
  await buatTitik(-87.995, 101.42, 0);
  const jadwal = await simpan(dataJadwal('pengecekan titik panas'));
  assert.equal(jadwal.idTitikPanas, terbaru);
});

test('C07-UT03 simpan: titik tepat di lat_min dan lng_min masuk petak, titik tepat di lat_maks tidak (batas setengah terbuka)', async () => {
  const diBatasBawah = await buatTitik(-88, 101.40, 2);
  await buatTitik(-87.99, 101.405, 1);
  const jadwal = await simpan(dataJadwal('pengecekan titik panas'));
  assert.equal(jadwal.idTitikPanas, diBatasBawah);
});

test('C07-UT04 simpan: pengecekan titik panas tanpa titik di petak tetap tersimpan dengan idTitikPanas null', async () => {
  const jadwal = await simpan(dataJadwal('pengecekan titik panas'));
  assert.equal(jadwal.status, 'ditugaskan');
  assert.equal(jadwal.idTitikPanas, null);
});

test('C07-UT05 simpan: petak yang tidak ada ditolak database (23503) dan tidak ada baris tersimpan', async () => {
  await assert.rejects(simpan({ ...dataJadwal(), idPetak: 2147483000 }), { code: '23503' });
  const { rows } = await pool.query('SELECT COUNT(*)::int AS jumlah FROM jadwal_pekerjaan WHERE id_relawan = $1', [relawan.id]);
  assert.equal(rows[0].jumlah, 0);
});
