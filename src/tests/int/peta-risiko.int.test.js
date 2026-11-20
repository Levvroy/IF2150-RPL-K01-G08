// Tes integrasi UC01 & pembaruan skor (C02 -> C03/C04/C18 -> DB, FIRMS dummy, Open-Meteo dummy):
// server.js dijalankan beneran dan berinteraksi lewat HTTP dengan dummy server eksternal serta PostgreSQL nyata. Tidak pakai mock.
import { test, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../db.js';
import * as Notifikasi from '../../models/Notifikasi.js';
import { bersihkan, buatPengguna, PASSWORD } from '../helpers/fixture.js';
import {
  jalankanServerDenganEnv,
  buatServerEksternalDummy,
  potretPetakAsli,
  pulihkanPetakAsli,
  buatPetakUji,
  bersihkanDataUjiPeta
} from '../helpers/peta-risiko.js';

const PORT = 3102;
const URL = `http://localhost:${PORT}`;
const CRON_TOKEN = 'uji-cron-int-peta';
const MAP_KEY = 'uji-map-key';

let server, dummy, potret, petugas, relawan, petakUji, tokenPetugas, tokenRelawan;

function waktuFirmsBaru(menitLalu = 30) {
  const d = new Date(Date.now() - menitLalu * 60 * 1000);
  const tanggal = d.toISOString().slice(0, 10);
  const jam = String(d.getUTCHours()).padStart(2, '0') + String(d.getUTCMinutes()).padStart(2, '0');
  return { tanggal, jam };
}

async function login(username) {
  const res = await fetch(URL + '/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: PASSWORD })
  });
  return (await res.json()).token;
}

async function picuPerbarui(token = CRON_TOKEN) {
  const headers = token ? { Authorization: 'Bearer ' + token } : {};
  return fetch(URL + '/api/perbarui', { method: 'POST', headers });
}

before(async () => {
  await bersihkan();
  await bersihkanDataUjiPeta(pool);
  potret = await potretPetakAsli(pool);

  petugas = await buatPengguna('int-peta-petugas', 'petugas');
  relawan = await buatPengguna('int-peta-relawan', 'relawan');
  petakUji = await buatPetakUji(pool, { skor: 0, tingkat: 'rendah', waktuUpdate: new Date() });

  dummy = await buatServerEksternalDummy();
  server = await jalankanServerDenganEnv(PORT, {
    CRON_TOKEN,
    MAP_KEY,
    FIRMS_BASE_URL: dummy.url,
    OPEN_METEO_BASE_URL: dummy.url
  });

  tokenPetugas = await login(petugas.username);
  tokenRelawan = await login(relawan.username);
});

afterEach(async () => {
  dummy.resetLog();
  dummy.aturFirms({ mode: 'sukses', status: 200, csv: 'latitude,longitude,acq_date,acq_time\n' });
  dummy.aturCuaca({ mode: 'sukses', status: 200, json: { daily: { precipitation_sum: [5, 0, 0, 0] } } });
  await pulihkanPetakAsli(pool, potret);
  await pool.query('DELETE FROM notifikasi WHERE id_pengguna = $1', [petugas.id]);
  petakUji = await buatPetakUji(pool, { skor: 0, tingkat: 'rendah', waktuUpdate: new Date() });
});

after(async () => {
  server?.kill();
  await dummy?.tutup();
  await pulihkanPetakAsli(pool, potret);
  await bersihkan();
  await pool.end();
});

test('INT-TC30 POST /api/perbarui dengan FIRMS dan Open-Meteo dummy sukses menyimpan titik tanpa duplikat, memperbarui skor, dan mencatat SMS', async () => {
  await pool.query(
    `INSERT INTO warga (id_petak, nomor_hp, status_persetujuan) VALUES ($1, '089900000030', 'aktif')`,
    [petakUji]
  );
  const { tanggal, jam } = waktuFirmsBaru();
  const csv =
    `latitude,longitude,acq_date,acq_time\n` +
    `-87.995,101.405,${tanggal},${jam}\n` +
    `-87.994,101.406,${tanggal},${jam}\n` +
    `-87.993,101.407,${tanggal},${jam}\n`;
  dummy.aturFirms({ mode: 'sukses', csv });
  dummy.aturCuaca({ mode: 'sukses', json: { daily: { precipitation_sum: [5, 0, 0, 0, 0] } } }); // 3 hari kering

  const res1 = await picuPerbarui();
  assert.equal(res1.status, 200);

  const log = dummy.log();
  assert.equal(log.permintaanFirms.length, 1);
  assert.ok(log.permintaanFirms[0].includes(MAP_KEY));
  assert.ok(log.permintaanFirms[0].includes('101.371,-0.561,101.488,-0.471'));
  assert.equal(log.permintaanCuaca.length, 1);
  assert.ok(log.permintaanCuaca[0].includes('latitude=-0.516&longitude=101.43'));

  // Panggil ulang dengan CSV sama: titik panas tidak terduplikat di database
  const res2 = await picuPerbarui();
  assert.equal(res2.status, 200);

  const { rows: titik } = await pool.query('SELECT COUNT(*)::int AS jumlah FROM titik_panas WHERE latitude < -80');
  assert.equal(titik[0].jumlah, 3);

  const { rows: petak } = await pool.query(
    'SELECT skor_risiko, tingkat_risiko FROM petak_lahan WHERE id_petak = $1',
    [petakUji]
  );
  assert.deepEqual(petak[0], { skor_risiko: 75, tingkat_risiko: 'tinggi' });

  const { rows: sms } = await pool.query(
    'SELECT status, isi_pesan FROM peringatan_sms WHERE id_petak = $1',
    [petakUji]
  );
  assert.equal(sms.length, 1);
  assert.equal(sms[0].status, 'terkirim');
});

test('INT-TC31 POST /api/perbarui saat Open-Meteo dummy gagal (503) membalas 500 dan mempertahankan cache petak lama (KF04)', async () => {
  const waktuCache = new Date(Date.now() - 2 * 60 * 60 * 1000);
  await pool.query(
    `UPDATE petak_lahan SET skor_risiko = 45, tingkat_risiko = 'sedang', waktu_update_terakhir = $2 WHERE id_petak = $1`,
    [petakUji, waktuCache]
  );
  dummy.aturCuaca({ mode: 'gagal', status: 503 });

  const res = await picuPerbarui();
  assert.equal(res.status, 500);
  const body = await res.json();
  assert.equal(body.pesan, 'Pembaruan skor gagal, menggunakan data cache terakhir');

  const { rows } = await pool.query(
    'SELECT skor_risiko, tingkat_risiko, waktu_update_terakhir FROM petak_lahan WHERE id_petak = $1',
    [petakUji]
  );
  assert.equal(rows[0].skor_risiko, 45);
  assert.equal(rows[0].tingkat_risiko, 'sedang');
  assert.ok(Math.abs(rows[0].waktu_update_terakhir.getTime() - waktuCache.getTime()) < 1000);
});

test('INT-TC32 POST /api/perbarui saat FIRMS dummy gagal (500) tetapi Open-Meteo sukses tetap memperbarui skor dari titik berlaku di DB', async () => {
  await pool.query(
    `INSERT INTO titik_panas (latitude, longitude, waktu_deteksi, status_validitas)
     VALUES (-87.995, 101.405, NOW() - INTERVAL '1 hour', 'valid')`
  );
  dummy.aturFirms({ mode: 'gagal', status: 500 });
  dummy.aturCuaca({ mode: 'sukses', json: { daily: { precipitation_sum: [5, 0, 0, 0, 0] } } }); // 3 hari kering -> 20*1 + 5*3 = 35

  const res = await picuPerbarui();
  assert.equal(res.status, 200);

  const { rows } = await pool.query(
    'SELECT skor_risiko, tingkat_risiko FROM petak_lahan WHERE id_petak = $1',
    [petakUji]
  );
  assert.deepEqual(rows[0], { skor_risiko: 35, tingkat_risiko: 'sedang' });
});

test('INT-TC33 POST /api/perbarui tanpa token atau token salah ditolak 401 tanpa memanggil API eksternal', async () => {
  await pool.query(
    `UPDATE petak_lahan SET skor_risiko = 18, tingkat_risiko = 'rendah' WHERE id_petak = $1`,
    [petakUji]
  );

  assert.equal((await picuPerbarui(null)).status, 401);
  assert.equal((await picuPerbarui('token-ngawur')).status, 401);

  const log = dummy.log();
  assert.equal(log.permintaanFirms.length, 0);
  assert.equal(log.permintaanCuaca.length, 0);

  const { rows } = await pool.query('SELECT skor_risiko FROM petak_lahan WHERE id_petak = $1', [petakUji]);
  assert.equal(rows[0].skor_risiko, 18);
});

test('INT-TC34 GET /api/peta untuk petugas memuat data petak & notifikasi dari DB; relawan (403) dan tanpa login (401) ditolak', async () => {
  await pool.query('UPDATE petak_lahan SET waktu_update_terakhir = NOW()');
  await Notifikasi.buat(petugas.id, 'uji-setup batal tugas #99');

  assert.equal((await fetch(URL + '/api/peta')).status, 401);
  assert.equal(
    (await fetch(URL + '/api/peta', { headers: { Authorization: 'Bearer ' + tokenRelawan } })).status,
    403
  );

  const res = await fetch(URL + '/api/peta', { headers: { Authorization: 'Bearer ' + tokenPetugas } });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.isUsang, false);
  assert.ok(data.daftarPetak.some((p) => p.idPetak === petakUji));
  assert.ok(data.daftarNotifikasi.some((n) => n.isiPesan.includes('uji-setup batal tugas #99')));
});

test('INT-TC35 GET /api/peta saat data usang (> 3 jam) tetap membalas 200 dengan isUsang true dan data cache utuh (KF04)', async () => {
  await pool.query('UPDATE petak_lahan SET waktu_update_terakhir = NOW()');
  const empatJamLalu = new Date(Date.now() - 4 * 60 * 60 * 1000);
  await pool.query(
    `UPDATE petak_lahan SET skor_risiko = 68, tingkat_risiko = 'tinggi', waktu_update_terakhir = $2 WHERE id_petak = $1`,
    [petakUji, empatJamLalu]
  );

  const res = await fetch(URL + '/api/peta', { headers: { Authorization: 'Bearer ' + tokenPetugas } });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.isUsang, true);
  assert.ok(Math.abs(new Date(data.waktuUpdate).getTime() - empatJamLalu.getTime()) < 2000);

  const petak = data.daftarPetak.find((p) => p.idPetak === petakUji);
  assert.equal(petak.skorRisiko, 68);
  assert.equal(petak.tingkatRisiko, 'tinggi');
});
