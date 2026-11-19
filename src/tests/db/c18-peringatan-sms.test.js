import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../db.js';
import { cekAmbangRisiko, prosesBalasanSTOP, hapusNomorDicabut } from '../../controllers/PeringatanSMSController.js';
import * as PeringatanSMS from '../../models/PeringatanSMS.js';
import { bersihkan, buatPetak, buatWarga } from '../helpers/fixture.js';

const NOMOR_DITOLAK = '081200000022';
process.env.NOMOR_TIDAK_AKTIF = NOMOR_DITOLAK;

const tinggi = (idPetak) => ({ idPetak, tingkatRisiko: 'tinggi' });

before(async () => {
  await bersihkan();
});

after(async () => {
  await bersihkan();
  await pool.end();
});

async function logPetak(idPetak) {
  const { rows } = await pool.query(
    'SELECT id_warga, isi_pesan, status FROM peringatan_sms WHERE id_petak = $1 ORDER BY id_peringatan',
    [idPetak]
  );
  return rows;
}

async function statusWarga(idWarga) {
  const { rows } = await pool.query('SELECT status_persetujuan FROM warga WHERE id_warga = $1', [idWarga]);
  return rows[0]?.status_persetujuan;
}

test('C18-UT01 petak tinggi: semua warga aktif dikirimi SMS dan dicatat terkirim', async () => {
  const petak = await buatPetak(80, 'tinggi');
  await buatWarga(petak, '081200000011');
  await buatWarga(petak, '081200000012');
  await buatWarga(petak, '081200000013', 'dicabut', 1); // tidak boleh dikirimi
  await cekAmbangRisiko([tinggi(petak)]);
  const log = await logPetak(petak);
  assert.equal(log.length, 2);
  assert.ok(log.every((r) => r.status === 'terkirim'));
  assert.ok(log.every((r) => r.isi_pesan.includes(String(petak)) && r.isi_pesan.includes('STOP')));
});

test('C18-UT02 gateway menolak satu warga: dicatat gagal, yang lain terkirim, tanpa kirim ulang', async () => {
  const petak = await buatPetak(81, 'tinggi');
  const wargaOk = await buatWarga(petak, '081200000021');
  const wargaTolak = await buatWarga(petak, NOMOR_DITOLAK);
  await cekAmbangRisiko([tinggi(petak)]);
  const log = await logPetak(petak);
  assert.equal(log.length, 2);
  assert.equal(log.find((r) => r.id_warga === wargaOk).status, 'terkirim');
  assert.equal(log.find((r) => r.id_warga === wargaTolak).status, 'gagal');
});

test('C18-UT03 sudah ada SMS terkirim dalam 24 jam: tidak mengirim lagi', async () => {
  const petak = await buatPetak(82, 'tinggi');
  const warga = await buatWarga(petak, '081200000031');
  await PeringatanSMS.catat(warga, petak, 'uji-setup pesan lama', 'terkirim');
  await cekAmbangRisiko([tinggi(petak)]);
  assert.equal((await logPetak(petak)).length, 1);
});

test('C18-UT04 petak tinggi tanpa warga aktif: tidak ada log dan tidak error', async () => {
  const petak = await buatPetak(83, 'tinggi');
  await assert.doesNotReject(() => cekAmbangRisiko([tinggi(petak)]));
  assert.equal((await logPetak(petak)).length, 0);
});

test('C18-UT06 error basis data pada satu petak tidak menghentikan petak berikutnya', async () => {
  const petak = await buatPetak(84, 'tinggi');
  await buatWarga(petak, '081200000061');
  // idPetak 'abc' membuat query integer gagal di PostgreSQL (error asli, bukan tiruan)
  await assert.doesNotReject(() => cekAmbangRisiko([tinggi('abc'), tinggi(petak)]));
  assert.equal((await logPetak(petak)).length, 1);
});

test('C18-UT07 petak bukan tinggi dilewati tanpa SMS dan tanpa log', async () => {
  const petak = await buatPetak(40, 'sedang');
  await buatWarga(petak, '081200000071');
  await cekAmbangRisiko([{ idPetak: petak, tingkatRisiko: 'sedang' }]);
  assert.equal((await logPetak(petak)).length, 0);
});

test('C18-UT08 balasan STOP mencabut persetujuan (TRUE)', async () => {
  const petak = await buatPetak(10, 'rendah');
  const warga = await buatWarga(petak, '081200000081');
  assert.equal(await prosesBalasanSTOP('081200000081', 'STOP'), true);
  assert.notEqual(await statusWarga(warga), 'aktif');
});

test('C18-UT09 balasan "sToP" huruf campur diperlakukan sama dengan STOP', async () => {
  const petak = await buatPetak(10, 'rendah');
  const warga = await buatWarga(petak, '081200000091');
  assert.equal(await prosesBalasanSTOP('081200000091', ' sToP '), true);
  assert.notEqual(await statusWarga(warga), 'aktif');
});

test('C18-UT10c balasan selain STOP tidak mengubah status warga', async () => {
  const petak = await buatPetak(10, 'rendah');
  const warga = await buatWarga(petak, '081200000101');
  assert.equal(await prosesBalasanSTOP('081200000101', 'halo'), false);
  assert.equal(await statusWarga(warga), 'aktif');
});

test('C18-UT11 STOP dari nomor tidak terdaftar mengembalikan FALSE tanpa galat', async () => {
  assert.equal(await prosesBalasanSTOP('089999999999', 'STOP'), false);
});

test('C18-UT11b STOP dari warga yang sudah dicabut mengembalikan FALSE', async () => {
  const petak = await buatPetak(10, 'rendah');
  await buatWarga(petak, '081200000111', 'dicabut', 1);
  assert.equal(await prosesBalasanSTOP('081200000111', 'STOP'), false);
});

test('C18-UT12 hapusNomorDicabut menghapus yang dicabut lebih dari 30 hari saja', async () => {
  const petak = await buatPetak(10, 'rendah');
  const lama = await buatWarga(petak, '081200000121', 'dicabut', 40);
  const baru = await buatWarga(petak, '081200000122', 'dicabut', 5);
  const aktif = await buatWarga(petak, '081200000123');
  await hapusNomorDicabut();
  assert.equal(await statusWarga(lama), undefined);
  assert.notEqual(await statusWarga(baru), undefined);
  assert.notEqual(await statusWarga(aktif), undefined);
});