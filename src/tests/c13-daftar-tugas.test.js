// Unit test C13 DaftarTugasController (bagian server yang tidak perlu database)
import test from 'node:test';
import assert from 'node:assert/strict';
import { urutkanBerdasarkanSkorRisiko, batalkanTugasTidakAman } from '../controllers/DaftarTugasController.js';
import { resPalsu } from './helpers/fixture.js';

test('C13-UT01 tugas diurutkan dari skor risiko tertinggi', () => {
  const hasil = urutkanBerdasarkanSkorRisiko([{ id: 1, skorRisiko: 12 }, { id: 2, skorRisiko: 78 }, { id: 3, skorRisiko: 46 }]);
  assert.deepEqual(hasil.map((t) => t.id), [2, 3, 1]);
});

test('C13-UT02 skor yang sama tidak mengubah urutan', () => {
  const hasil = urutkanBerdasarkanSkorRisiko([{ id: 1, skorRisiko: 50 }, { id: 2, skorRisiko: 50 }]);
  assert.deepEqual(hasil.map((t) => t.id), [1, 2]);
});

test('C13-UT03 daftar kosong tetap kosong', () => {
  assert.deepEqual(urutkanBerdasarkanSkorRisiko([]), []);
});

async function batal(id, alasan) {
  const res = resPalsu();
  await batalkanTugasTidakAman({ pengguna: { idPengguna: 7 }, params: { id }, body: { alasan } }, res);
  return res;
}

test('C13-UT04 batal tanpa alasan ditolak 400', async () => {
  assert.equal((await batal('1', '')).kode, 400);
  assert.equal((await batal('1', '   ')).kode, 400);
});

test('C13-UT05 alasan lebih dari 300 karakter ditolak 400', async () => {
  assert.equal((await batal('1', 'a'.repeat(301))).kode, 400);
});

test('C13-UT06 id tugas tidak valid ditolak 409', async () => {
  assert.equal((await batal('abc', 'asap tebal')).kode, 409);
});
