import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../db.js';
import * as Warga from '../../models/Warga.js';
import { bersihkan, buatPetak, buatWarga } from '../helpers/fixture.js';

let petakA, petakB, petakKosong;

before(async () => {
  await bersihkan();
  petakA = await buatPetak(80, 'tinggi');
  petakB = await buatPetak(81, 'tinggi');
  petakKosong = await buatPetak(82, 'tinggi');
});

after(async () => {
  await bersihkan();
  await pool.end();
});

async function ambilBaris(idWarga) {
  const { rows } = await pool.query(
    'SELECT status_persetujuan, waktu_dicabut FROM warga WHERE id_warga = $1',
    [idWarga]
  );
  return rows[0];
}

test('C19-UT01 ambilAktifByPetak hanya mengembalikan warga aktif di petak itu', async () => {
  const w1 = await buatWarga(petakA, '081200000201');
  const w2 = await buatWarga(petakA, '081200000202');
  await buatWarga(petakA, '081200000203', 'dicabut', 1); // dicabut, tidak boleh muncul
  await buatWarga(petakB, '081200000204'); // petak lain, tidak boleh muncul
  const hasil = await Warga.ambilAktifByPetak(petakA);
  assert.equal(hasil.length, 2);
  assert.deepEqual(hasil.map((w) => w.idWarga).sort((a, b) => a - b), [w1, w2]);
  assert.ok(hasil.every((w) => typeof w.nomorHP === 'string'));
  assert.ok(hasil.every((w) => w.statusPersetujuan === 'aktif'));
});

test('C19-UT02 ambilAktifByPetak petak tanpa warga aktif mengembalikan larik kosong', async () => {
  assert.deepEqual(await Warga.ambilAktifByPetak(petakKosong), []);
});

test('C19-UT03 cariByNomor nomor tidak terdaftar mengembalikan null', async () => {
  assert.equal(await Warga.cariByNomor('089999999998'), null);
});

test('C19-UT03b cariByNomor nomor terdaftar mengembalikan data warga', async () => {
  const id = await buatWarga(petakKosong, '081200000211');
  const warga = await Warga.cariByNomor('081200000211');
  assert.equal(warga.idWarga, id);
  assert.equal(warga.statusPersetujuan, 'aktif');
});

test('C19-UT04 cabutPersetujuan mengubah status dan mengisi waktu dicabut', async () => {
  const id = await buatWarga(petakKosong, '081200000221');
  const lain = await buatWarga(petakKosong, '081200000222');
  await Warga.cabutPersetujuan(id);
  const baris = await ambilBaris(id);
  assert.equal(baris.status_persetujuan, 'dicabut');
  assert.notEqual(baris.waktu_dicabut, null);
  assert.equal((await ambilBaris(lain)).status_persetujuan, 'aktif');
});

test('C19-UT04b cabutPersetujuan pada warga yang sudah dicabut tidak mengubah waktu dicabut', async () => {
  const id = await buatWarga(petakKosong, '081200000223', 'dicabut', 10);
  const sebelum = await ambilBaris(id);
  await Warga.cabutPersetujuan(id);
  const sesudah = await ambilBaris(id);
  assert.equal(sesudah.status_persetujuan, 'dicabut');
  assert.deepEqual(sesudah.waktu_dicabut, sebelum.waktu_dicabut);
});

test('C19-UT05 hapusDicabutLama menghapus yang dicabut lebih dari batas hari saja', async () => {
  const lama = await buatWarga(petakKosong, '081200000231', 'dicabut', 40);
  const baru = await buatWarga(petakKosong, '081200000232', 'dicabut', 5);
  const aktif = await buatWarga(petakKosong, '081200000233');
  const jumlah = await Warga.hapusDicabutLama(30);
  assert.ok(jumlah >= 1);
  assert.equal(await ambilBaris(lama), undefined);
  assert.notEqual(await ambilBaris(baru), undefined);
  assert.notEqual(await ambilBaris(aktif), undefined);
});

test('C19-UT05b hapusDicabutLama dengan batas lebih besar tidak menghapus warga yang lebih baru dari batas', async () => {
  const id = await buatWarga(petakKosong, '081200000234', 'dicabut', 40);
  await Warga.hapusDicabutLama(365);
  assert.notEqual(await ambilBaris(id), undefined);
});