// KNF12 (Security): nomor HP yang persetujuannya dicabut harus dihapus paling lambat 30 hari setelah pencabutan.
// Server dijalankan beneran. Pencabutan lewat halaman simulasi (balasan STOP), penghapusan lewat
// POST /api/perbarui (jalur cron asli, memanggil hapusNomorDicabut), hasilnya dicek langsung ke database.
// Butuh internet (Open-Meteo) dan CRON_TOKEN di .env, karena penghapusan hanya jalan jika pembaruan berhasil.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../db.js';
import { jalankanServer } from '../helpers/server.js';
import { bersihkan, buatPetak, buatWarga } from '../helpers/fixture.js';

const URL = 'http://localhost:3106';
let server, petak;

before(async () => {
  assert.ok(process.env.CRON_TOKEN, 'CRON_TOKEN belum ada di .env');
  await bersihkan();
  petak = await buatPetak(0, 'rendah');
  server = await jalankanServer(3106);
});

after(async () => {
  server.kill();
  await bersihkan();
  await pool.end();
});

async function perbarui() {
  const res = await fetch(URL + '/api/perbarui', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.CRON_TOKEN }
  });
  assert.equal(res.status, 200, 'perbarui gagal: periksa koneksi internet (Open-Meteo) dan CRON_TOKEN');
}

async function ambilWarga(idWarga) {
  const { rows } = await pool.query(
    'SELECT status_persetujuan, waktu_dicabut FROM warga WHERE id_warga = $1',
    [idWarga]
  );
  return rows[0];
}

test('KNF12-TC01 nomor yang dicabut lewat STOP dan sudah 31 hari terhapus dari database', async () => {
  const warga = await buatWarga(petak, '081200000601');

  const stop = await fetch(URL + '/api/simulasi-sms/balasan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nomorHP: '081200000601', isiBalasan: 'STOP' })
  });
  assert.deepEqual(await stop.json(), { diterima: true, dicabut: true });
  const dicabut = await ambilWarga(warga);
  assert.equal(dicabut.status_persetujuan, 'dicabut');
  assert.notEqual(dicabut.waktu_dicabut, null);

  await pool.query(`UPDATE warga SET waktu_dicabut = NOW() - INTERVAL '31 days' WHERE id_warga = $1`, [warga]);
  await perbarui();

  assert.equal(await ambilWarga(warga), undefined);
});

test('KNF12-TC02 nomor dicabut 29 hari lalu dan warga aktif tetap tersimpan', async () => {
  const belumLewat = await buatWarga(petak, '081200000611', 'dicabut', 29);
  const aktif = await buatWarga(petak, '081200000612');

  await perbarui();

  assert.equal((await ambilWarga(belumLewat)).status_persetujuan, 'dicabut');
  assert.equal((await ambilWarga(aktif)).status_persetujuan, 'aktif');
});
