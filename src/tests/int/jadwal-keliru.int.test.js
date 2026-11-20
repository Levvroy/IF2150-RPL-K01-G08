// Tes integrasi UC02 dan UC06: server.js dijalankan beneran lalu diakses lewat HTTP,
// hasilnya dicek langsung ke database. Tidak pakai mock.
// Urutan TC berpengaruh: TC17 -> TC18 dan TC20 -> TC23 memakai data dari TC sebelumnya,
// jadi jalankan file ini utuh, bukan per TC lewat --test-name-pattern.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../db.js';
import { jalankanServer, hentikanServer } from '../helpers/server.js';
import { bersihkan, buatPengguna, buatPetak, buatJadwal, PASSWORD } from '../helpers/fixture.js';

const URL = 'http://localhost:3103';
let server, petugas, relawan, relawanLain, petak, idTitik, tokenPetugas, tokenRelawan, tokenRelawanLain;

async function token(username) {
  const res = await fetch(URL + '/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: PASSWORD })
  });
  return (await res.json()).token;
}

function kirim(metode, jalur, tokenSesi, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (tokenSesi) headers.Authorization = 'Bearer ' + tokenSesi;
  return fetch(URL + jalur, { method: metode, headers, body: JSON.stringify(body) });
}

function jadwalBaru(ubah = {}) {
  return { idRelawan: relawan.id, idPetak: petak, jenisPekerjaan: 'patroli', tanggal: '2026-11-21', ...ubah };
}

async function jumlahJadwal(idRelawan) {
  const { rows } = await pool.query(`SELECT COUNT(*)::int AS jumlah FROM jadwal_pekerjaan WHERE id_relawan = $1 AND status = 'ditugaskan'`, [idRelawan]);
  return rows[0].jumlah;
}

async function barisTitik() {
  const { rows } = await pool.query('SELECT status_validitas, keterangan, waktu_tandai_keliru FROM titik_panas WHERE id_titik_panas = $1', [idTitik]);
  return rows[0];
}

async function hapusTitikUji() {
  await pool.query('DELETE FROM jadwal_pekerjaan WHERE id_titik_panas IN (SELECT id_titik_panas FROM titik_panas WHERE latitude < -80)');
  await pool.query('DELETE FROM titik_panas WHERE latitude < -80');
}

before(async () => {
  await hapusTitikUji();
  await bersihkan();
  petugas = await buatPengguna('int-jadwal-petugas', 'petugas');
  relawan = await buatPengguna('int-jadwal-relawan', 'relawan');
  relawanLain = await buatPengguna('int-jadwal-relawan2', 'relawan');
  petak = await buatPetak(70, 'tinggi');
  const { rows } = await pool.query(`INSERT INTO titik_panas (latitude, longitude, waktu_deteksi) VALUES (-87.995, 101.405, NOW() - INTERVAL '1 hour') RETURNING id_titik_panas`);
  idTitik = rows[0].id_titik_panas;
  server = await jalankanServer(3103);
  tokenPetugas = await token(petugas.username);
  tokenRelawan = await token(relawan.username);
  tokenRelawanLain = await token(relawanLain.username);
});

after(async () => {
  await hentikanServer(server);
  await hapusTitikUji();
  await bersihkan();
  await pool.end();
});

test('INT-TC16 formulir jadwal memuat relawan dan petak yang ada di database (UC02, KF05)', async () => {
  const res = await kirim('GET', '/api/jadwal/form', tokenPetugas);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.daftarRelawan.some((r) => r.idRelawan === relawan.id));
  assert.ok(data.daftarPetak.some((p) => p.idPetak === petak));
});

test('INT-TC17 jadwal dari petugas tersimpan di database, muncul di daftar tugas relawan beserta notifikasinya (KF07)', async () => {
  const res = await kirim('POST', '/api/jadwal', tokenPetugas, jadwalBaru());
  assert.equal(res.status, 201);
  const { idJadwal } = await res.json();
  const { rows } = await pool.query('SELECT id_relawan, status FROM jadwal_pekerjaan WHERE id_jadwal = $1', [idJadwal]);
  assert.deepEqual(rows[0], { id_relawan: relawan.id, status: 'ditugaskan' });

  const tugas = await (await kirim('GET', '/api/tugas', tokenRelawan)).json();
  assert.ok(tugas.daftarTugas.some((t) => t.idJadwal === idJadwal));
  assert.ok(tugas.daftarNotifikasi.some((n) => n.isiPesan.includes(`#${idJadwal}`)));
});

test('INT-TC18 jadwal ke-4 untuk relawan yang sama ditolak 409 dan database tetap 3 tugas aktif (KF06)', async () => {
  while (await jumlahJadwal(relawan.id) < 3) {
    assert.equal((await kirim('POST', '/api/jadwal', tokenPetugas, jadwalBaru())).status, 201);
  }
  const res = await kirim('POST', '/api/jadwal', tokenPetugas, jadwalBaru());
  assert.equal(res.status, 409);
  assert.equal(await jumlahJadwal(relawan.id), 3);
});

test('INT-TC19 relawan (403), tanpa login (401), dan data yang ditolak database (400) tidak menambah jadwal', async () => {
  const sebelum = await jumlahJadwal(relawanLain.id);
  assert.equal((await kirim('POST', '/api/jadwal', tokenRelawan, jadwalBaru({ idRelawan: relawanLain.id }))).status, 403);
  assert.equal((await kirim('POST', '/api/jadwal', null, jadwalBaru({ idRelawan: relawanLain.id }))).status, 401);
  assert.equal((await kirim('POST', '/api/jadwal', tokenPetugas, jadwalBaru({ idRelawan: relawanLain.id, jenisPekerjaan: 'menanam pohon' }))).status, 400);
  assert.equal(await jumlahJadwal(relawanLain.id), sebelum);
});

test('INT-TC20 jadwal pengecekan titik panas tersimpan dengan id titik panas di petak, terbaca di daftar tugas relawan (Q-008)', async () => {
  const res = await kirim('POST', '/api/jadwal', tokenPetugas, jadwalBaru({ idRelawan: relawanLain.id, jenisPekerjaan: 'pengecekan titik panas' }));
  assert.equal(res.status, 201);
  const { idJadwal } = await res.json();
  const { rows } = await pool.query('SELECT id_titik_panas FROM jadwal_pekerjaan WHERE id_jadwal = $1', [idJadwal]);
  assert.equal(rows[0].id_titik_panas, idTitik);

  const tugas = await (await kirim('GET', '/api/tugas', tokenRelawanLain)).json();
  assert.equal(tugas.daftarTugas.find((t) => t.idJadwal === idJadwal).idTitikPanas, idTitik);
});

test('INT-TC21 relawan tanpa tugas 403, petugas 403, titik tidak ada 404, keterangan kosong 400, database tidak berubah (UC06)', async () => {
  assert.equal((await kirim('PATCH', `/api/titik-panas/${idTitik}/keliru`, tokenRelawan, { keterangan: 'Asap sampah' })).status, 403);
  assert.equal((await kirim('PATCH', '/api/titik-panas/2147483000/keliru', tokenRelawanLain, { keterangan: 'Asap sampah' })).status, 404);
  assert.equal((await kirim('PATCH', `/api/titik-panas/${idTitik}/keliru`, tokenRelawanLain, { keterangan: '   ' })).status, 400);
  assert.equal((await kirim('PATCH', `/api/titik-panas/${idTitik}/keliru`, tokenPetugas, { keterangan: 'Asap sampah' })).status, 403);
  const titik = await barisTitik();
  assert.equal(titik.status_validitas, 'valid');
  assert.equal(titik.waktu_tandai_keliru, null);
});

test('INT-TC22 relawan pemilik tugas menandai titik keliru: status, keterangan, dan waktu tersimpan di database (UC06, KF15)', async () => {
  const res = await kirim('PATCH', `/api/titik-panas/${idTitik}/keliru`, tokenRelawanLain, { keterangan: '  Asap dari pembakaran sampah warga  ' });
  assert.equal(res.status, 200);
  const titik = await barisTitik();
  assert.equal(titik.status_validitas, 'keliru');
  assert.equal(titik.keterangan, 'Asap dari pembakaran sampah warga');
  assert.ok(Date.now() - titik.waktu_tandai_keliru.getTime() < 60 * 1000);
});

test('INT-TC23 titik yang sudah ditandai dalam 24 jam terakhir tidak bisa ditandai lagi (409), keterangan lama tetap', async () => {
  const res = await kirim('PATCH', `/api/titik-panas/${idTitik}/keliru`, tokenRelawanLain, { keterangan: 'Keterangan kedua' });
  assert.equal(res.status, 409);
  assert.equal((await barisTitik()).keterangan, 'Asap dari pembakaran sampah warga');
});
