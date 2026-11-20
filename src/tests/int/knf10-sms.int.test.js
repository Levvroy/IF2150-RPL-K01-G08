// KNF10 (Safety): saat petak berpenghuni naik ke tingkat tinggi, SMS peringatan (disimulasikan)
// harus tercatat paling lambat 15 menit sejak perhitungan skor selesai.
// Server dijalankan beneran, pembaruan dipicu lewat POST /api/perbarui (jalur cron asli),
// waktu diukur dari database: petak_lahan.waktu_update_terakhir (skor selesai dihitung)
// sampai peringatan_sms.waktu_kirim (SMS tercatat). Butuh internet (Open-Meteo) dan CRON_TOKEN di .env.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../db.js';
import { jalankanServer } from '../helpers/server.js';
import { bersihkan, buatPetak, buatWarga } from '../helpers/fixture.js';

const URL = 'http://localhost:3105';
const PENGULANGAN = 5;
const BATAS_MS = 15 * 60 * 1000;
const JUMLAH_TITIK = 8;
let server, petak;

before(async () => {
  assert.ok(process.env.CRON_TOKEN, 'CRON_TOKEN belum ada di .env');
  await bersihkan();
  petak = await buatPetak(0, 'rendah');
  await buatWarga(petak, '081200000501');
  await buatWarga(petak, '081200000502');
  server = await jalankanServer(3105);
});

after(async () => {
  server.kill();
  await bersihkan();
  await pool.end();
});


async function siapkanUlang() {
  await pool.query('DELETE FROM peringatan_sms WHERE id_petak = $1', [petak]);
  await pool.query('DELETE FROM titik_panas WHERE latitude < -80');
  await pool.query(
    `UPDATE petak_lahan SET skor_risiko = 0, tingkat_risiko = 'rendah', waktu_update_terakhir = NULL WHERE id_petak = $1`,
    [petak]
  );
  for (let j = 1; j <= JUMLAH_TITIK; j++) {
    await pool.query(
      `INSERT INTO titik_panas (latitude, longitude, waktu_deteksi)
       VALUES (-87.995, 101.405, NOW() - make_interval(mins => $1::int))`,
      [j]
    );
  }
}

test('KNF10-TC01 SMS peringatan tercatat paling lambat 15 menit setelah skor petak naik ke tinggi', async () => {
  const selisih = [];
  const responsMs = [];

  for (let i = 1; i <= PENGULANGAN; i++) {
    await siapkanUlang();

    const mulai = Date.now();
    const res = await fetch(URL + '/api/perbarui', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + process.env.CRON_TOKEN }
    });
    responsMs.push(Date.now() - mulai);
    assert.equal(res.status, 200, 'perbarui gagal: periksa koneksi internet (Open-Meteo) dan CRON_TOKEN');

    const { rows } = await pool.query(
      `SELECT p.tingkat_risiko, p.skor_risiko, p.waktu_update_terakhir AS hitung,
              MAX(s.waktu_kirim) AS kirim,
              COUNT(s.id_peringatan)::int AS jumlah,
              COUNT(s.id_peringatan) FILTER (WHERE s.status = 'terkirim')::int AS terkirim
       FROM petak_lahan p LEFT JOIN peringatan_sms s ON s.id_petak = p.id_petak
       WHERE p.id_petak = $1
       GROUP BY p.id_petak`,
      [petak]
    );
    const b = rows[0];
    assert.equal(b.tingkat_risiko, 'tinggi');
    assert.equal(b.jumlah, 2, 'SMS harus tercatat untuk 2 warga aktif');
    assert.equal(b.terkirim, 2);

    const ms = new Date(b.kirim).getTime() - new Date(b.hitung).getTime();
    selisih.push(ms);
    console.log(`Pengulangan ${i}: skor ${b.skor_risiko}, selisih hitung ke SMS tercatat ${ms} ms, respons /api/perbarui ${responsMs[i - 1]} ms`);
  }

  const rata = Math.round(selisih.reduce((a, b) => a + b, 0) / selisih.length);
  const maks = Math.max(...selisih);
  console.log(`RINGKASAN KNF10: ${PENGULANGAN} pengulangan, rata-rata ${rata} ms, maksimum ${maks} ms, batas ${BATAS_MS} ms (15 menit)`);
  assert.ok(maks <= BATAS_MS, `selisih maksimum ${maks} ms melebihi 15 menit`);
});
