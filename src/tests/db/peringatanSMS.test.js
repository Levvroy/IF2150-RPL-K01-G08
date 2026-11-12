// Tes UC07 terhadap database sungguhan (butuh Postgres dari docker-compose menyala dan tabel sudah dibuat).
import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../db.js';
import { cekAmbangRisiko, prosesBalasanSTOP } from '../../controllers/PeringatanSMSController.js';
 
const NOMOR_1 = '089900000001';
const NOMOR_2 = '089900000002';
const NOMOR_TIDAK_AKTIF = '089900000099';
const LAT_PENANDA = -89.123; // penanda petak uji, supaya sisa tes yang gagal bisa dibersihkan
const PETAK_TINGGI = () => [{ idPetak: idPetak, tingkatRisiko: 'tinggi' }];

let idPetak;
let envLama;
 
async function bersihkan() {
  await pool.query(`DELETE FROM peringatan_sms WHERE id_warga IN (SELECT id_warga FROM warga WHERE nomor_hp LIKE '08990000%')`);
  await pool.query(`DELETE FROM warga WHERE nomor_hp LIKE '08990000%'`);
  await pool.query(`DELETE FROM petak_lahan WHERE lat_min = $1`, [LAT_PENANDA]);
}
 
async function hitungLog(nomorHP, status) {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS jumlah
     FROM peringatan_sms p JOIN warga w ON w.id_warga = p.id_warga
     WHERE w.nomor_hp = $1 AND p.status = $2`,
    [nomorHP, status]
  );
  return rows[0].jumlah;
}
 
async function hitungLogPetak() {
  const { rows } = await pool.query(`SELECT COUNT(*)::int AS jumlah FROM peringatan_sms WHERE id_petak = $1`, [idPetak]);
  return rows[0].jumlah;
}
 
async function geserLogMundur(jam) {
  await pool.query(
    `UPDATE peringatan_sms SET waktu_kirim = NOW() - ($2 * INTERVAL '1 hour') WHERE id_petak = $1`,
    [idPetak, jam]
  );
}
 
async function statusWarga(nomorHP) {
  const { rows } = await pool.query(`SELECT status_persetujuan FROM warga WHERE nomor_hp = $1`, [nomorHP]);
  return rows[0].status_persetujuan;
}
 
before(async () => {
  envLama = process.env.NOMOR_TIDAK_AKTIF;
  process.env.NOMOR_TIDAK_AKTIF = NOMOR_TIDAK_AKTIF;
 
  await bersihkan();
  const petak = await pool.query(
    `INSERT INTO petak_lahan (lat_min, lat_maks, lng_min, lng_maks, skor_risiko, tingkat_risiko)
     VALUES ($1, $2, 0, 0.01, 0, 'rendah') RETURNING id_petak`,
    [LAT_PENANDA, LAT_PENANDA + 0.01]
  );
  idPetak = petak.rows[0].id_petak;
 
  for (const nomor of [NOMOR_1, NOMOR_2, NOMOR_TIDAK_AKTIF]) {
    await pool.query(
      `INSERT INTO warga (nomor_hp, status_persetujuan, id_petak) VALUES ($1, 'aktif', $2)`,
      [nomor, idPetak]
    );
  }
});
 
beforeEach(async () => {
  await pool.query(`DELETE FROM peringatan_sms WHERE id_petak = $1`, [idPetak]);
  await pool.query(`UPDATE warga SET status_persetujuan = 'aktif', waktu_dicabut = NULL WHERE id_petak = $1`, [idPetak]);
});
 
after(async () => {
  await bersihkan();
  if (envLama === undefined) {
    delete process.env.NOMOR_TIDAK_AKTIF;
  } else {
    process.env.NOMOR_TIDAK_AKTIF = envLama;
  }
  await pool.end();
});
 
test('petak tinggi: warga aktif menerima SMS, nomor tidak aktif tercatat gagal', async () => {
  await cekAmbangRisiko(PETAK_TINGGI());
 
  assert.equal(await hitungLog(NOMOR_1, 'terkirim'), 1);
  assert.equal(await hitungLog(NOMOR_2, 'terkirim'), 1);
  assert.equal(await hitungLog(NOMOR_TIDAK_AKTIF, 'gagal'), 1);
});
 
test('batas 24 jam: panggilan kedua dalam 24 jam tidak mengirim lagi', async () => {
  await cekAmbangRisiko(PETAK_TINGGI());
  await geserLogMundur(23);
  await cekAmbangRisiko(PETAK_TINGGI());
 
  assert.equal(await hitungLogPetak(), 3);
});
 
test('batas 24 jam: setelah lewat 24 jam boleh mengirim lagi', async () => {
  await cekAmbangRisiko(PETAK_TINGGI());
  await geserLogMundur(25);
  await cekAmbangRisiko(PETAK_TINGGI());
 
  assert.equal(await hitungLogPetak(), 6);
});
 
test('petak berisiko sedang tidak dikirimi SMS', async () => {
  await cekAmbangRisiko([{ idPetak: idPetak, tingkatRisiko: 'sedang' }]);
 
  assert.equal(await hitungLogPetak(), 0);
});
 
test('balasan STOP (huruf apa pun) mencabut persetujuan', async () => {
  const dicabut = await prosesBalasanSTOP(NOMOR_1, ' stop ');
 
  assert.equal(dicabut, true);
  assert.equal(await statusWarga(NOMOR_1), 'dicabut');
  assert.equal(await statusWarga(NOMOR_2), 'aktif');
});
 
test('balasan selain STOP dan nomor tak dikenal diabaikan', async () => {
  assert.equal(await prosesBalasanSTOP(NOMOR_1, 'halo'), false);
  assert.equal(await prosesBalasanSTOP('089900000555', 'STOP'), false);
  assert.equal(await statusWarga(NOMOR_1), 'aktif');
});
 
test('warga yang sudah STOP tidak dikirimi SMS lagi', async () => {
  await cekAmbangRisiko(PETAK_TINGGI());
  await prosesBalasanSTOP(NOMOR_1, 'STOP');
  await geserLogMundur(25);
  await cekAmbangRisiko(PETAK_TINGGI());
 
  assert.equal(await hitungLog(NOMOR_1, 'terkirim'), 1);
  assert.equal(await hitungLog(NOMOR_2, 'terkirim'), 2);
});