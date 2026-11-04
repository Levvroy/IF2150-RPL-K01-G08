import test from 'node:test';
import assert from 'node:assert/strict';
import { hitungJarak, validasiAlasan, BATAS_JARAK_METER } from '../controllers/VerifikasiLaporanController.js';
import { cekPeran } from '../middleware/auth.js';
import { batasPetak } from '../sql/seed.js';

const PETAK_187 = batasPetak(187);

test('hitungJarak bernilai 0 jika koordinat di dalam petak (Algo-005)', () => {
  const tengah = { lat: (PETAK_187.latMin + PETAK_187.latMaks) / 2, lng: (PETAK_187.lngMin + PETAK_187.lngMaks) / 2 };
  assert.equal(hitungJarak(tengah, PETAK_187), 0);
  assert.equal(hitungJarak({ lat: PETAK_187.latMin, lng: PETAK_187.lngMin }, PETAK_187), 0);
});

test('hitungJarak mengukur ke titik terdekat pada batas petak dengan haversine', () => {
  // 0,001° bujur di dekat khatulistiwa sekitar 111 m
  const timur = { lat: (PETAK_187.latMin + PETAK_187.latMaks) / 2, lng: PETAK_187.lngMaks + 0.001 };
  const jarak = hitungJarak(timur, PETAK_187);
  assert.ok(jarak >= 110 && jarak <= 112, `jarak ${jarak}`);

  // Pojok: diagonal ke titik sudut, bukan ke sisi
  const pojok = { lat: PETAK_187.latMaks + 0.002, lng: PETAK_187.lngMaks + 0.002 };
  const diagonal = hitungJarak(pojok, PETAK_187);
  assert.ok(diagonal > 300 && diagonal < 320, `diagonal ${diagonal}`);
  assert.equal(Number.isInteger(diagonal), true);
});

test('laporan seed Petak 187 berada sekitar 340 m di luar petak (I-04b)', () => {
  const jarak = hitungJarak({ lat: -0.4935, lng: 101.44605 }, PETAK_187);
  assert.ok(jarak > BATAS_JARAK_METER);
  assert.ok(Math.abs(jarak - 340) <= 5, `jarak ${jarak}`);
});

test('validasiAlasan mewajibkan alasan 1 sampai 300 karakter setelah trim', () => {
  assert.equal(validasiAlasan(undefined), null);
  assert.equal(validasiAlasan(123), null);
  assert.equal(validasiAlasan(''), null);
  assert.equal(validasiAlasan('   \n '), null);
  assert.equal(validasiAlasan('a'.repeat(301)), null);
  assert.equal(validasiAlasan('a'.repeat(300)), 'a'.repeat(300));
  assert.equal(validasiAlasan('  Foto buram  '), 'Foto buram');
});

test('cekPeran menolak relawan mengakses endpoint petugas (KNF05)', () => {
  const res = { kode: 200, status(k) { this.kode = k; return this; }, json() { return this; } };
  let lanjut = false;
  cekPeran('petugas')({ pengguna: { peran: 'relawan' } }, res, () => { lanjut = true; });
  assert.equal(res.kode, 403);
  assert.equal(lanjut, false);
});
