// C22 login yang langsung cek ke tabel pengguna
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../db.js';
import { login } from '../../controllers/AutentikasiController.js';
import { bersihkan, buatPengguna, PASSWORD, resPalsu } from '../helpers/fixture.js';

let relawan;

before(async () => {
  await bersihkan();
  relawan = await buatPengguna('login', 'relawan');
});

after(async () => {
  await bersihkan();
  await pool.end();
});

async function coba(username, password) {
  const res = resPalsu();
  await login({ body: { username, password } }, res);
  return res;
}

test('C22-UT10 login dengan akun benar dapat token', async () => {
  const res = await coba(relawan.username, PASSWORD);
  assert.equal(res.kode, 200);
  assert.ok(res.isi.token);
  assert.equal(res.isi.user.peran, 'relawan');
});

test('C22-UT11 login dengan password salah ditolak 401', async () => {
  const res = await coba(relawan.username, 'salah');
  assert.equal(res.kode, 401);
});

test('C22-UT12 login dengan username yang tidak ada ditolak 401', async () => {
  const res = await coba('uji-setup-ngasal', PASSWORD);
  assert.equal(res.kode, 401);
});
