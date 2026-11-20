import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../db.js';
import * as PeringatanSMS from '../../models/PeringatanSMS.js';
import { bersihkan, buatPetak, buatWarga } from '../helpers/fixture.js';

before(async () => {
  await bersihkan();
});

after(async () => {
  await bersihkan();
  await pool.end();
});

async function sisipLog(idWarga, idPetak, status, jamLalu) {
  await pool.query(
    `INSERT INTO peringatan_sms (id_warga, id_petak, isi_pesan, waktu_kirim, status)
     VALUES ($1, $2, 'uji-setup pesan', NOW() - make_interval(hours => $3::int), $4)`,
    [idWarga, idPetak, jamLalu, status]
  );
}

test('C20-UT01 adaDalam24Jam TRUE jika ada SMS terkirim dalam 24 jam', async () => {
  const petak = await buatPetak(80, 'tinggi');
  const warga = await buatWarga(petak, '081200000301');
  await sisipLog(warga, petak, 'terkirim', 1);
  assert.equal(await PeringatanSMS.adaDalam24Jam(petak), true);
});

test('C20-UT01b adaDalam24Jam TRUE untuk SMS terkirim 23 jam lalu (di dalam batas)', async () => {
  const petak = await buatPetak(80, 'tinggi');
  const warga = await buatWarga(petak, '081200000302');
  await sisipLog(warga, petak, 'terkirim', 23);
  assert.equal(await PeringatanSMS.adaDalam24Jam(petak), true);
});

test('C20-UT02 adaDalam24Jam FALSE jika petak belum pernah dikirimi', async () => {
  const petak = await buatPetak(80, 'tinggi');
  assert.equal(await PeringatanSMS.adaDalam24Jam(petak), false);
});

test('C20-UT02b adaDalam24Jam FALSE jika hanya ada SMS berstatus gagal', async () => {
  const petak = await buatPetak(80, 'tinggi');
  const warga = await buatWarga(petak, '081200000311');
  await sisipLog(warga, petak, 'gagal', 1);
  assert.equal(await PeringatanSMS.adaDalam24Jam(petak), false);
});

test('C20-UT02c adaDalam24Jam FALSE jika SMS terkirim sudah lebih dari 24 jam', async () => {
  const petak = await buatPetak(80, 'tinggi');
  const warga = await buatWarga(petak, '081200000312');
  await sisipLog(warga, petak, 'terkirim', 25);
  assert.equal(await PeringatanSMS.adaDalam24Jam(petak), false);
});

test('C20-UT03 catat menyimpan satu baris dengan nilai sesuai masukan', async () => {
  const petak = await buatPetak(80, 'tinggi');
  const warga = await buatWarga(petak, '081200000321');
  await PeringatanSMS.catat(warga, petak, 'uji-setup pesan catat', 'gagal');
  const { rows } = await pool.query(
    'SELECT id_warga, id_petak, isi_pesan, status, waktu_kirim FROM peringatan_sms WHERE id_petak = $1',
    [petak]
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id_warga, warga);
  assert.equal(rows[0].isi_pesan, 'uji-setup pesan catat');
  assert.equal(rows[0].status, 'gagal');
  assert.notEqual(rows[0].waktu_kirim, null);
});

test('C20-UT03b catat dengan status tidak valid ditolak basis data', async () => {
  const petak = await buatPetak(80, 'tinggi');
  const warga = await buatWarga(petak, '081200000322');
  await assert.rejects(() => PeringatanSMS.catat(warga, petak, 'uji-setup pesan', 'salah'));
  const { rows } = await pool.query('SELECT 1 FROM peringatan_sms WHERE id_petak = $1', [petak]);
  assert.equal(rows.length, 0);
});

test('C20-UT04 ambilTerkirimTerbaru hanya memuat SMS terkirim dan menghormati batas', async () => {
  const petak = await buatPetak(80, 'tinggi');
  const wargaOk = await buatWarga(petak, '081200000331');
  const wargaGagal = await buatWarga(petak, '081200000332');
  await sisipLog(wargaOk, petak, 'terkirim', 0);
  await sisipLog(wargaGagal, petak, 'gagal', 0);
  const hasil = await PeringatanSMS.ambilTerkirimTerbaru();
  const milikOk = hasil.find((p) => p.nomorHP === '081200000331');
  assert.ok(milikOk);
  assert.equal(milikOk.isiPesan, 'uji-setup pesan');
  assert.notEqual(milikOk.waktuKirim, null);
  assert.ok(!hasil.some((p) => p.nomorHP === '081200000332'));
  assert.equal((await PeringatanSMS.ambilTerkirimTerbaru(1)).length, 1);
});