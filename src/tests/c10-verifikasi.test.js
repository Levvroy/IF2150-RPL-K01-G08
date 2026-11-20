// C10 VerifikasiLaporanController tanpa database: Algo-005 (hitungJarak), validasi alasan,
// dan penolakan input yang tidak valid sebelum query dijalankan.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hitungJarak,
  validasiAlasan,
  ambilDetailLaporan,
  verifikasiLaporan,
  tolakLaporan,
  BATAS_JARAK_METER,
  PANJANG_MAKS_ALASAN
} from '../controllers/VerifikasiLaporanController.js';
import { batasPetak } from '../sql/seed.js';
import { resPalsu } from './helpers/fixture.js';

const PETAK_187 = batasPetak(187);
const TENGAH_187 = { lat: (PETAK_187.latMin + PETAK_187.latMaks) / 2, lng: (PETAK_187.lngMin + PETAK_187.lngMaks) / 2 };
const PETUGAS = { idPengguna: 1, peran: 'petugas' };

test('C10-UT01 hitungJarak: koordinat di tengah petak jaraknya 0', () => {
  assert.equal(hitungJarak(TENGAH_187, PETAK_187), 0);
});

test('C10-UT02 hitungJarak: koordinat tepat di garis batas dan di sudut petak jaraknya 0', () => {
  assert.equal(hitungJarak({ lat: PETAK_187.latMin, lng: PETAK_187.lngMin }, PETAK_187), 0);
  assert.equal(hitungJarak({ lat: PETAK_187.latMaks, lng: TENGAH_187.lng }, PETAK_187), 0);
  assert.equal(hitungJarak({ lat: TENGAH_187.lat, lng: PETAK_187.lngMaks }, PETAK_187), 0);
});

test('C10-UT03 hitungJarak: 0,001 derajat di timur petak sekitar 111 m (haversine)', () => {
  const jarak = hitungJarak({ lat: TENGAH_187.lat, lng: PETAK_187.lngMaks + 0.001 }, PETAK_187);
  assert.ok(jarak >= 110 && jarak <= 112, `jarak ${jarak}`);
});

test('C10-UT04 hitungJarak: di luar pojok diukur diagonal ke titik sudut, hasilnya bilangan bulat', () => {
  const diagonal = hitungJarak({ lat: PETAK_187.latMaks + 0.002, lng: PETAK_187.lngMaks + 0.002 }, PETAK_187);
  assert.ok(diagonal > 300 && diagonal < 320, `diagonal ${diagonal}`);
  assert.equal(Number.isInteger(diagonal), true);
});

test('C10-UT05 hitungJarak: laporan seed Petak 187 sekitar 340 m di luar petak (I-04b)', () => {
  const jarak = hitungJarak({ lat: -0.4935, lng: 101.44605 }, PETAK_187);
  assert.ok(jarak > BATAS_JARAK_METER);
  assert.ok(Math.abs(jarak - 340) <= 5, `jarak ${jarak}`);
});

test('C10-UT06 hitungJarak: koordinat bukan angka tidak dianggap di dalam petak (bukan 0)', () => {
  const jarak = hitungJarak({ lat: Number('x'), lng: TENGAH_187.lng }, PETAK_187);
  assert.notEqual(jarak, 0);
});

test('C10-UT07 validasiAlasan: alasan dirapikan dari spasi di awal dan akhir', () => {
  assert.equal(validasiAlasan('  Foto buram  '), 'Foto buram');
});

test('C10-UT08 validasiAlasan: 300 karakter diterima, 301 karakter ditolak', () => {
  assert.equal(validasiAlasan('a'.repeat(PANJANG_MAKS_ALASAN)), 'a'.repeat(PANJANG_MAKS_ALASAN));
  assert.equal(validasiAlasan('a'.repeat(PANJANG_MAKS_ALASAN + 1)), null);
  assert.equal(validasiAlasan('  ' + 'a'.repeat(PANJANG_MAKS_ALASAN) + '  '), 'a'.repeat(PANJANG_MAKS_ALASAN));
});

test('C10-UT09 validasiAlasan: kosong, spasi saja, dan bukan teks ditolak', () => {
  for (const alasan of [undefined, null, 123, '', '   \n ']) assert.equal(validasiAlasan(alasan), null);
});

test('C10-UT10 ambilDetailLaporan: id yang bukan UUID dibalas 404 tanpa query', async () => {
  const res = { ...resPalsu(), set() { return this; } };
  await ambilDetailLaporan({ params: { id: '123' }, pengguna: PETUGAS }, res);
  assert.equal(res.kode, 404);
});

test('C10-UT11 verifikasiLaporan: id yang bukan UUID dibalas 404 tanpa query', async () => {
  const res = resPalsu();
  await verifikasiLaporan({ params: { id: 'bukan-uuid' }, pengguna: PETUGAS }, res);
  assert.equal(res.kode, 404);
});

test('C10-UT12 tolakLaporan: alasan kosong atau tanpa body dibalas 400 tanpa query', async () => {
  const id = '00000000-0000-4000-8000-000000000000';
  for (const body of [{ alasan: '  ' }, undefined]) {
    const res = resPalsu();
    await tolakLaporan({ params: { id }, body, pengguna: PETUGAS }, res);
    assert.equal(res.kode, 400);
  }
});

test('C10-UT13 tolakLaporan: alasan valid tetapi id bukan UUID dibalas 404', async () => {
  const res = resPalsu();
  await tolakLaporan({ params: { id: '42' }, body: { alasan: 'Foto buram' }, pengguna: PETUGAS }, res);
  assert.equal(res.kode, 404);
});
