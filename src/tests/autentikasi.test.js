import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { cekPassword } from '../models/Pengguna.js';
import { buatSesi } from '../controllers/AutentikasiController.js';

process.env.JWT_SECRET = 'rahasia-uji';

test('cekPassword menerima password benar dan menolak yang salah (KNF11)', async () => {
  const hash = await bcrypt.hash('sigap12345', 10);
  assert.equal(await cekPassword('sigap12345', hash), true);
  assert.equal(await cekPassword('salah', hash), false);
});

test('token sesi berisi idPengguna dan peran, berlaku 7 hari (KNF11)', () => {
  const token = buatSesi({ idPengguna: 3, username: 'relawan1', peran: 'relawan' });
  const isi = jwt.verify(token, process.env.JWT_SECRET);
  assert.equal(isi.idPengguna, 3);
  assert.equal(isi.peran, 'relawan');
  assert.equal(isi.exp - isi.iat, 7 * 24 * 60 * 60);
  assert.equal(isi.username, undefined);
});
