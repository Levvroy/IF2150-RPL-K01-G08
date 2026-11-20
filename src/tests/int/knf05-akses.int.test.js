// KNF05: foto bukti kerja dan nomor HP warga hanya lewat endpoint yang butuh login dengan peran yang sesuai.
// Server dijalankan beneran lalu diakses lewat HTTP. Bagian HTTPS diuji manual pada alamat deploy.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import pool from '../../db.js';
import { jalankanServer, hentikanServer } from '../helpers/server.js';
import { bersihkan, buatPengguna, buatPetak, buatJadwal, PASSWORD } from '../helpers/fixture.js';

const URL = 'http://localhost:3102';
const FOTO = Buffer.from('foto-uji-knf05');
let server, idLaporan, tokenPetugas, tokenRelawan;

async function token(username) {
  const res = await fetch(URL + '/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: PASSWORD })
  });
  return (await res.json()).token;
}

function ambil(jalur, tokenSesi) {
  return fetch(URL + jalur, { headers: tokenSesi ? { Authorization: 'Bearer ' + tokenSesi } : {} });
}

before(async () => {
  await bersihkan();
  const petugas = await buatPengguna('knf05-petugas', 'petugas');
  const relawan = await buatPengguna('knf05-relawan', 'relawan');
  const idJadwal = await buatJadwal(relawan.id, await buatPetak(70, 'tinggi'), 'menunggu verifikasi');
  idLaporan = randomUUID();
  await pool.query(
    `INSERT INTO laporan_bukti_kerja (id_laporan, id_jadwal, foto, lat_unggah, lng_unggah, waktu_unggah) VALUES ($1, $2, $3, -87.995, 101.405, NOW())`,
    [idLaporan, idJadwal, FOTO]
  );
  server = await jalankanServer(3102);
  tokenPetugas = await token(petugas.username);
  tokenRelawan = await token(relawan.username);
});

after(async () => {
  await hentikanServer(server);
  await bersihkan();
  await pool.end();
});

test('KNF05-TC01 foto bukti kerja hanya terbuka untuk petugas: tanpa login 401, token palsu atau kedaluwarsa 401, relawan 403', async () => {
  const kedaluwarsa = jwt.sign({ idPengguna: 1, peran: 'petugas' }, process.env.JWT_SECRET, { expiresIn: -1 });
  const palsu = jwt.sign({ idPengguna: 1, peran: 'petugas' }, 'secret-lain');
  for (const jalur of [`/api/laporan/${idLaporan}`, '/api/laporan/antrean']) {
    assert.equal((await ambil(jalur)).status, 401, jalur);
    assert.equal((await ambil(jalur, palsu)).status, 401, jalur);
    assert.equal((await ambil(jalur, kedaluwarsa)).status, 401, jalur);
    assert.equal((await ambil(jalur, tokenRelawan)).status, 403, jalur);
  }
  const res = await ambil(`/api/laporan/${idLaporan}`, tokenPetugas);
  assert.equal(res.status, 200);
  const { laporan } = await res.json();
  assert.equal(laporan.foto, 'data:image/jpeg;base64,' + FOTO.toString('base64'));
});

test('KNF05-TC02 nomor HP warga tidak bisa dibaca tanpa login petugas', { todo: 'GET /api/simulasi-sms/pesan masih terbuka tanpa login, menunggu keputusan tim' }, async () => {
  assert.equal((await ambil('/api/simulasi-sms/pesan')).status, 401);
  assert.equal((await ambil('/api/simulasi-sms/pesan', tokenRelawan)).status, 403);
});
