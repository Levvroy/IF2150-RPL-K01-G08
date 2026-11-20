// Tes integrasi: server.js dijalankan beneran lalu diakses lewat HTTP,
// hasilnya dicek langsung ke database. Tidak pakai mock.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pool from '../../db.js';
import { jalankanServer } from '../helpers/server.js';
import { bersihkan, buatPengguna, buatPetak, buatJadwal, PASSWORD } from '../helpers/fixture.js';

const URL = 'http://localhost:3100';
let server, relawan, petugas, petak, tokenRelawan, tokenPetugas;

async function login(username, password) {
  return fetch(URL + '/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
}

function kirimLaporan(idJadwal, uuid, ukuranFoto, token) {
  const form = new FormData();
  form.append('idLaporan', uuid);
  form.append('idJadwal', idJadwal);
  form.append('lat', '-0.51');
  form.append('lng', '101.44');
  form.append('waktuUnggah', new Date().toISOString());
  form.append('foto', new Blob([new Uint8Array(ukuranFoto)]), 'foto.jpg');
  return fetch(URL + '/api/laporan', { method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: form });
}

async function jumlahLaporan(idJadwal) {
  const { rows } = await pool.query('SELECT COUNT(*) FROM laporan_bukti_kerja WHERE id_jadwal = $1', [idJadwal]);
  return Number(rows[0].count);
}

before(async () => {
  await bersihkan();
  relawan = await buatPengguna('relawan', 'relawan');
  petugas = await buatPengguna('petugas', 'petugas');
  petak = await buatPetak(70, 'tinggi');
  server = await jalankanServer(3100);
  tokenRelawan = (await (await login(relawan.username, PASSWORD)).json()).token;
  tokenPetugas = (await (await login(petugas.username, PASSWORD)).json()).token;
});

after(async () => {
  server.kill();
  await bersihkan();
  await pool.end();
});

test('INT-TC01 login dengan akun yang ada di tabel pengguna berhasil', async () => {
  const res = await login(relawan.username, PASSWORD);
  assert.equal(res.status, 200);
});

test('INT-TC02 login dengan password salah ditolak 401', async () => {
  const res = await login(relawan.username, 'salah');
  assert.equal(res.status, 401);
});

test('INT-TC03 daftar tugas dari database tampil beserta tingkat risiko petaknya', async () => {
  const idJadwal = await buatJadwal(relawan.id, petak);
  const res = await fetch(URL + '/api/tugas', { headers: { Authorization: 'Bearer ' + tokenRelawan } });
  const data = await res.json();
  const tugas = data.daftarTugas.find((t) => t.idJadwal === idJadwal);
  assert.equal(tugas.tingkatRisiko, 'tinggi');
});

test('INT-TC04 petugas tidak bisa membuka daftar tugas relawan (403)', async () => {
  const res = await fetch(URL + '/api/tugas', { headers: { Authorization: 'Bearer ' + tokenPetugas } });
  assert.equal(res.status, 403);
});

test('INT-TC05 pembatalan tugas mengubah status di database', async () => {
  const idJadwal = await buatJadwal(relawan.id, petak);
  const res = await fetch(`${URL}/api/tugas/${idJadwal}/batal`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + tokenRelawan, 'Content-Type': 'application/json' },
    body: JSON.stringify({ alasan: 'uji-setup api mendekat' })
  });
  assert.equal(res.status, 200);
  const { rows } = await pool.query('SELECT status FROM jadwal_pekerjaan WHERE id_jadwal = $1', [idJadwal]);
  assert.equal(rows[0].status, 'dibatalkan');
});

test('INT-TC06 laporan yang diunggah tersimpan di database beserta fotonya', async () => {
  const idJadwal = await buatJadwal(relawan.id, petak);
  const uuid = randomUUID();
  const res = await kirimLaporan(idJadwal, uuid, 2048, tokenRelawan);
  assert.equal(res.status, 201);
  const { rows } = await pool.query('SELECT foto FROM laporan_bukti_kerja WHERE id_laporan = $1', [uuid]);
  assert.equal(rows[0].foto.length, 2048);
});

test('INT-TC07 laporan dengan UUID sama dikirim dua kali hanya tersimpan satu', async () => {
  const idJadwal = await buatJadwal(relawan.id, petak);
  const uuid = randomUUID();
  await kirimLaporan(idJadwal, uuid, 100, tokenRelawan);
  const ulang = await kirimLaporan(idJadwal, uuid, 100, tokenRelawan);
  assert.equal(ulang.status, 200);
  assert.equal(await jumlahLaporan(idJadwal), 1);
});

test('INT-TC08 foto lebih dari 500 KB ditolak 413 dan tidak masuk database', async () => {
  const idJadwal = await buatJadwal(relawan.id, petak);
  const res = await kirimLaporan(idJadwal, randomUUID(), 500 * 1024 + 1, tokenRelawan);
  assert.equal(res.status, 413);
  assert.equal(await jumlahLaporan(idJadwal), 0);
});
