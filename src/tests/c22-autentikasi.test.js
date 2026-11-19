// Unit test C22 AutentikasiController (bagian server yang tidak perlu database)
import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { buatSesi, login } from '../controllers/AutentikasiController.js';
import { cekLogin, cekPeran } from '../middleware/auth.js';
import { resPalsu } from './helpers/fixture.js';

process.env.JWT_SECRET = 'rahasia-uji';

test('C22-UT01 login dengan username dan password kosong ditolak 400', async () => {
  const res = resPalsu();
  await login({ body: { username: '', password: '' } }, res);
  assert.equal(res.kode, 400);
});

test('C22-UT02 login tanpa body ditolak 400', async () => {
  const res = resPalsu();
  await login({}, res);
  assert.equal(res.kode, 400);
});

test('C22-UT03 buatSesi menghasilkan token berisi id dan peran', () => {
  const token = buatSesi({ idPengguna: 3, peran: 'relawan' });
  const isi = jwt.verify(token, 'rahasia-uji');
  assert.equal(isi.idPengguna, 3);
  assert.equal(isi.peran, 'relawan');
});

test('C22-UT04 token berlaku tepat 7 hari', () => {
  const isi = jwt.verify(buatSesi({ idPengguna: 1, peran: 'petugas' }), 'rahasia-uji');
  assert.equal(isi.exp - isi.iat, 7 * 24 * 60 * 60);
});

test('C22-UT05 token tidak bisa dibaca pakai secret lain', () => {
  const token = buatSesi({ idPengguna: 1, peran: 'petugas' });
  assert.throws(() => jwt.verify(token, 'secret-lain'));
});

// Di server, pengecekan token dilakukan middleware cekLogin.
function cek(header) {
  const res = resPalsu();
  const req = { headers: { authorization: header } };
  let lolos = false;
  cekLogin(req, res, () => { lolos = true; });
  return { res, lolos };
}

test('C22-UT06 middleware cekLogin: token valid boleh lewat', () => {
  const { lolos } = cek('Bearer ' + buatSesi({ idPengguna: 5, peran: 'relawan' }));
  assert.equal(lolos, true);
});

test('C22-UT07 middleware cekLogin: tanpa token ditolak 401', () => {
  const { res, lolos } = cek(undefined);
  assert.equal(lolos, false);
  assert.equal(res.kode, 401);
});

test('C22-UT08 middleware cekLogin: token yang baru lewat 1 detik dari batas ditolak 401', () => {
  const token = jwt.sign({ idPengguna: 5, exp: Math.floor(Date.now() / 1000) - 1 }, 'rahasia-uji');
  const { res } = cek('Bearer ' + token);
  assert.equal(res.kode, 401);
});

test('C22-UT09 relawan tidak boleh akses halaman petugas (403)', () => {
  const res = resPalsu();
  cekPeran('petugas')({ pengguna: { peran: 'relawan' } }, res, () => {});
  assert.equal(res.kode, 403);
});
