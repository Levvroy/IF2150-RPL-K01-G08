// C02 PetaRisikoController dengan database nyata (Algo-001, Algo-002, KF02, KF04, KF16).
import { test, before, after, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../db.js';
import { perbaruiData, perbaruiDataHandler, ambilDataPeta } from '../../controllers/PetaRisikoController.js';
import * as Notifikasi from '../../models/Notifikasi.js';
import { buatPengguna, resPalsu, bersihkan } from '../helpers/fixture.js';
import {
  potretPetakAsli,
  pulihkanPetakAsli,
  buatPetakUji,
  bersihkanDataUjiPeta,
  waktuFirmsBaru
} from '../helpers/peta-risiko.js';

const CRON_ASLI = process.env.CRON_TOKEN;
const MAP_KEY_ASLI = process.env.MAP_KEY;

let potret, petugas, petakUji;

function aturFetch({ firmsStatus = 200, firmsBody = null, firmsError = null, cuacaStatus = 200, cuacaJson = null, cuacaError = null } = {}) {
  const { tanggal, jam } = waktuFirmsBaru();
  const csvDefault =
    `latitude,longitude,acq_date,acq_time\n` +
    `-87.995,101.405,${tanggal},${jam}\n`;
  const jsonDefault = { daily: { precipitation_sum: [5, 0, 0, 0, 0] } };

  mock.method(globalThis, 'fetch', async (url) => {
    const teksUrl = String(url);
    if (teksUrl.includes('firms') || teksUrl.includes('/api/area/csv/')) {
      if (firmsError) throw firmsError;
      return {
        ok: firmsStatus >= 200 && firmsStatus < 300,
        status: firmsStatus,
        text: async () => (firmsBody !== null ? firmsBody : csvDefault)
      };
    }
    if (cuacaError) throw cuacaError;
    return {
      ok: cuacaStatus >= 200 && cuacaStatus < 300,
      status: cuacaStatus,
      json: async () => (cuacaJson !== null ? cuacaJson : jsonDefault)
    };
  });
}

before(async () => {
  await bersihkan();
  await bersihkanDataUjiPeta(pool);
  potret = await potretPetakAsli(pool);
  petugas = await buatPengguna('c02-petugas', 'petugas');
  petakUji = await buatPetakUji(pool, { skor: 0, tingkat: 'rendah', waktuUpdate: new Date() });
});

afterEach(async () => {
  mock.restoreAll();
  if (CRON_ASLI === undefined) delete process.env.CRON_TOKEN;
  else process.env.CRON_TOKEN = CRON_ASLI;
  if (MAP_KEY_ASLI === undefined) delete process.env.MAP_KEY;
  else process.env.MAP_KEY = MAP_KEY_ASLI;
  await pulihkanPetakAsli(pool, potret);
  petakUji = await buatPetakUji(pool, { skor: 0, tingkat: 'rendah', waktuUpdate: new Date() });
});

after(async () => {
  mock.restoreAll();
  await pulihkanPetakAsli(pool, potret);
  await bersihkan();
  await pool.end();
});

test('C02-UT13 perbaruiData: mengambil FIRMS dan Open-Meteo lalu memperbarui skor di database (Algo-001)', async () => {
  process.env.CRON_TOKEN = 'cron-c02';
  process.env.MAP_KEY = 'map-c02';
  const { tanggal, jam } = waktuFirmsBaru();
  // 2 titik di petakUji + 3 hari kering (15 + 40 = 55 -> sedang)
  const csv =
    `latitude,longitude,acq_date,acq_time\n` +
    `-87.995,101.405,${tanggal},${jam}\n` +
    `-87.994,101.406,${tanggal},${jam}\n`;
  aturFetch({ firmsBody: csv, cuacaJson: { daily: { precipitation_sum: [4, 0, 0, 0, 0] } } });

  const hasil = await perbaruiData('cron-c02');
  assert.equal(hasil.status, 200);
  assert.ok(hasil.jumlahPetak >= 1);
  assert.ok(hasil.jumlahTitik >= 2);

  const { rows } = await pool.query(
    'SELECT skor_risiko, tingkat_risiko FROM petak_lahan WHERE id_petak = $1',
    [petakUji]
  );
  assert.equal(rows[0].skor_risiko, 55);
  assert.equal(rows[0].tingkat_risiko, 'sedang');
});

test('C02-UT14 perbaruiData: petak naik ke tingkat tinggi memicu SMS ke warga aktif di petak (KF16)', async () => {
  process.env.CRON_TOKEN = 'cron-c02';
  process.env.MAP_KEY = 'map-c02';
  await pool.query(
    `INSERT INTO warga (id_petak, nomor_hp, status_persetujuan) VALUES ($1, '089900000001', 'aktif')`,
    [petakUji]
  );
  const { tanggal, jam } = waktuFirmsBaru();
  // 3 titik + 3 hari kering = 75 -> tinggi
  const csv =
    `latitude,longitude,acq_date,acq_time\n` +
    `-87.995,101.405,${tanggal},${jam}\n` +
    `-87.994,101.406,${tanggal},${jam}\n` +
    `-87.993,101.407,${tanggal},${jam}\n`;
  aturFetch({ firmsBody: csv, cuacaJson: { daily: { precipitation_sum: [5, 0, 0, 0, 0] } } });

  const hasil = await perbaruiData('cron-c02');
  assert.equal(hasil.status, 200);

  const { rows } = await pool.query(
    'SELECT status, isi_pesan FROM peringatan_sms WHERE id_petak = $1',
    [petakUji]
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, 'terkirim');
  assert.ok(rows[0].isi_pesan.includes(String(petakUji)));
});

test('C02-UT15 perbaruiData: MAP_KEY kosong, FIRMS gagal HTTP, CSV kosong, atau putus jaringan tetap 200', async () => {
  process.env.CRON_TOKEN = 'cron-c02';

  // 1. MAP_KEY kosong
  delete process.env.MAP_KEY;
  aturFetch({ cuacaJson: { daily: { precipitation_sum: [2, 0, 0] } } });
  assert.equal((await perbaruiData('cron-c02')).status, 200);

  // 2. FIRMS HTTP 500
  process.env.MAP_KEY = 'map-c02';
  aturFetch({ firmsStatus: 500, cuacaJson: { daily: { precipitation_sum: [2, 0, 0] } } });
  assert.equal((await perbaruiData('cron-c02')).status, 200);

  // 3. FIRMS hanya header
  aturFetch({ firmsBody: 'latitude,longitude,acq_date,acq_time', cuacaJson: { daily: { precipitation_sum: [2, 0, 0] } } });
  assert.equal((await perbaruiData('cron-c02')).status, 200);

  // 4. FIRMS melempar galat jaringan
  aturFetch({ firmsError: new Error('network down'), cuacaJson: { daily: { precipitation_sum: [2, 0, 0] } } });
  assert.equal((await perbaruiData('cron-c02')).status, 200);
});

test('C02-UT16 perbaruiData: menyaring baris CSV cacat, jam pendek, dan precipitation_sum kosong dengan aman', async () => {
  process.env.CRON_TOKEN = 'cron-c02';
  process.env.MAP_KEY = 'map-c02';
  const tanggal = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const csv =
    `latitude,longitude,acq_date,acq_time\n` +
    `-87.995,101.405,${tanggal},5\n` +
    `bukan,angka,${tanggal},0100\n` +
    `-87.996,101.406,tanggal-salah,0100\n\n`;
  aturFetch({ firmsBody: csv, cuacaJson: { daily: { precipitation_sum: [10] } } });

  const hasil = await perbaruiData('cron-c02');
  assert.equal(hasil.status, 200);
  const { rows } = await pool.query('SELECT COUNT(*)::int AS jumlah FROM titik_panas WHERE latitude < -80');
  assert.equal(rows[0].jumlah, 1);
});

test('C02-UT17 perbaruiData: Open-Meteo gagal mengembalikan 500 dan tidak mengubah cache petak', async () => {
  process.env.CRON_TOKEN = 'cron-c02';
  process.env.MAP_KEY = 'map-c02';
  mock.method(console, 'error', () => {});
  await pool.query('UPDATE petak_lahan SET skor_risiko = 42, tingkat_risiko = $2 WHERE id_petak = $1', [petakUji, 'sedang']);

  aturFetch({ cuacaStatus: 503 });
  const hasil = await perbaruiData('cron-c02');
  assert.equal(hasil.status, 500);
  assert.equal(hasil.pesan, 'Pembaruan skor gagal, menggunakan data cache terakhir');

  const { rows } = await pool.query('SELECT skor_risiko, tingkat_risiko FROM petak_lahan WHERE id_petak = $1', [petakUji]);
  assert.deepEqual(rows[0], { skor_risiko: 42, tingkat_risiko: 'sedang' });
});

test('C02-UT18 perbaruiData: galat saat hapusNomorDicabut hanya dicatat di log dan pembaruan tetap 200', async () => {
  process.env.CRON_TOKEN = 'cron-c02';
  delete process.env.MAP_KEY;
  aturFetch({ cuacaJson: { daily: { precipitation_sum: [5, 0, 0] } } });

  const asli = pool.query.bind(pool);
  mock.method(pool, 'query', (sql, ...sisa) => {
    if (String(sql).includes('DELETE FROM warga')) return Promise.reject(new Error('galat hapus warga'));
    return asli(sql, ...sisa);
  });
  let tercatat = false;
  mock.method(console, 'error', (pesan) => {
    if (String(pesan).includes('Gagal menghapus nomor')) tercatat = true;
  });

  const hasil = await perbaruiData('cron-c02');
  assert.equal(hasil.status, 200);
  assert.equal(tercatat, true);
});

test('C02-UT19 perbaruiDataHandler: token Bearer valid membalas 200 beserta ringkasan JSON', async () => {
  process.env.CRON_TOKEN = 'cron-c02';
  delete process.env.MAP_KEY;
  aturFetch({ cuacaJson: { daily: { precipitation_sum: [3, 0, 0] } } });

  const res = resPalsu();
  await perbaruiDataHandler({ headers: { authorization: 'Bearer cron-c02' } }, res);
  assert.equal(res.kode, 200);
  assert.equal(res.isi.pesan, 'Pembaruan skor berhasil');
});

test('C02-UT20 ambilDataPeta: mengembalikan petak, notifikasi belum dibaca, dan isUsang false saat data segar', async () => {
  await pool.query('UPDATE petak_lahan SET waktu_update_terakhir = NOW()');
  await Notifikasi.buat(petugas.id, 'uji-setup pembatalan petak');

  const res = resPalsu();
  await ambilDataPeta({ pengguna: { idPengguna: petugas.id } }, res);
  assert.equal(res.kode, 200);
  assert.equal(res.isi.isUsang, false);
  assert.ok(res.isi.daftarPetak.some((p) => p.idPetak === petakUji));
  assert.equal(res.isi.daftarNotifikasi.length, 1);
});

test('C02-UT21 ambilDataPeta: satu petak lebih dari 3 jam membuat isUsang true dan waktuUpdate paling lama (KF04)', async () => {
  await pool.query('UPDATE petak_lahan SET waktu_update_terakhir = NOW()');
  const empatJamLalu = new Date(Date.now() - 4 * 60 * 60 * 1000);
  await pool.query('UPDATE petak_lahan SET waktu_update_terakhir = $2 WHERE id_petak = $1', [petakUji, empatJamLalu]);

  const res = resPalsu();
  await ambilDataPeta({ pengguna: { idPengguna: petugas.id } }, res);
  assert.equal(res.kode, 200);
  assert.equal(res.isi.isUsang, true);
  assert.ok(Math.abs(new Date(res.isi.waktuUpdate).getTime() - empatJamLalu.getTime()) < 2000);
});

test('C02-UT22 ambilDataPeta: satu petak bernilai NULL menghasilkan waktuUpdate null dan isUsang true', async () => {
  await pool.query('UPDATE petak_lahan SET waktu_update_terakhir = NOW()');
  await pool.query('UPDATE petak_lahan SET waktu_update_terakhir = NULL WHERE id_petak = $1', [petakUji]);

  const res = resPalsu();
  await ambilDataPeta({ pengguna: { idPengguna: petugas.id } }, res);
  assert.equal(res.kode, 200);
  assert.equal(res.isi.waktuUpdate, null);
  assert.equal(res.isi.isUsang, true);
});

test('C02-UT23 ambilDataPeta: mengembalikan 404 bila tabel petak_lahan kosong', async () => {
  const asli = pool.query.bind(pool);
  mock.method(pool, 'query', (sql, ...sisa) => {
    if (String(sql).includes('FROM petak_lahan')) return Promise.resolve({ rows: [] });
    return asli(sql, ...sisa);
  });

  const res = resPalsu();
  await ambilDataPeta({ pengguna: { idPengguna: petugas.id } }, res);
  assert.equal(res.kode, 404);
  assert.equal(res.isi.pesan, 'Data petak belum dikonfigurasi');
});

test('C02-UT24 ambilDataPeta: mengembalikan 500 bila terjadi galat basis data', async () => {
  mock.method(pool, 'query', () => Promise.reject(new Error('koneksi putus')));
  mock.method(console, 'error', () => {});

  const res = resPalsu();
  await ambilDataPeta({ pengguna: { idPengguna: petugas.id } }, res);
  assert.equal(res.kode, 500);
  assert.equal(res.isi.pesan, 'Terjadi kesalahan di server');
});
