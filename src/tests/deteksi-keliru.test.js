import test from 'node:test';
import assert from 'node:assert/strict';
import { validasiKeterangan } from '../controllers/DeteksiKeliruController.js';
import { cekPeran } from '../middleware/auth.js';

test('validasiKeterangan menolak keterangan kosong atau spasi saja (UC06 alternatif 1)', () => {
  assert.equal(validasiKeterangan(undefined), false);
  assert.equal(validasiKeterangan(null), false);
  assert.equal(validasiKeterangan(123), false);
  assert.equal(validasiKeterangan(''), false);
  assert.equal(validasiKeterangan('   \n '), false);
});

test('validasiKeterangan menerima 1 sampai 200 karakter setelah trim', () => {
  assert.equal(validasiKeterangan('a'), true);
  assert.equal(validasiKeterangan('  Asap dari pembakaran sampah  '), true);
  assert.equal(validasiKeterangan('a'.repeat(200)), true);
  assert.equal(validasiKeterangan('a'.repeat(201)), false);
  assert.equal(validasiKeterangan(`  ${'a'.repeat(200)}  `), true);
});

test('cekPeran menolak petugas memanggil endpoint tandai keliru (C17 hanya relawan)', () => {
  const res = { kode: 200, status(k) { this.kode = k; return this; }, json() { return this; } };
  let lanjut = false;
  cekPeran('relawan')({ pengguna: { peran: 'petugas' } }, res, () => { lanjut = true; });
  assert.equal(res.kode, 403);
  assert.equal(lanjut, false);
});
