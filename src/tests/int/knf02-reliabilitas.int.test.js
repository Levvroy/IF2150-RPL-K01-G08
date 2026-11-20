// Pengujian KNF02 (Reliability): ketika NASA FIRMS atau Open-Meteo gagal diakses atau terputus,
// sistem tetap mempertahankan cache terakhir dan menyajikan peta beserta keterangan waktu pembaruan.
import { test, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../db.js';
import { bersihkan, buatPengguna, PASSWORD } from '../helpers/fixture.js';
import { jalankanServer } from '../helpers/server.js';
import {
  buatServerEksternalDummy,
  potretPetakAsli,
  pulihkanPetakAsli,
  buatPetakUji,
  bersihkanDataUjiPeta
} from '../helpers/peta-risiko.js';

const PORT = 3103;
const URL = `http://localhost:${PORT}`;
const CRON_TOKEN = 'uji-cron-knf02';
const MAP_KEY = 'uji-map-knf02';

let server, dummy, potret, petugas, petakUji, tokenPetugas;

async function login(username) {
  const res = await fetch(URL + '/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: PASSWORD })
  });
  return (await res.json()).token;
}

before(async () => {
  await bersihkan();
  await bersihkanDataUjiPeta(pool);
  potret = await potretPetakAsli(pool);

  petugas = await buatPengguna('knf02-petugas', 'petugas');
  petakUji = await buatPetakUji(pool, { skor: 50, tingkat: 'sedang', waktuUpdate: new Date() });

  dummy = await buatServerEksternalDummy();
  server = await jalankanServer(PORT, {
    CRON_TOKEN,
    MAP_KEY,
    FIRMS_BASE_URL: dummy.url,
    OPEN_METEO_BASE_URL: dummy.url
  });

  tokenPetugas = await login(petugas.username);
});

afterEach(async () => {
  dummy.resetLog();
  dummy.aturFirms({ mode: 'sukses', status: 200, csv: 'latitude,longitude,acq_date,acq_time\n' });
  dummy.aturCuaca({ mode: 'sukses', status: 200, json: { daily: { precipitation_sum: [5, 0, 0, 0] } } });
  await pulihkanPetakAsli(pool, potret);
  petakUji = await buatPetakUji(pool, { skor: 50, tingkat: 'sedang', waktuUpdate: new Date() });
});

after(async () => {
  server?.kill();
  await dummy?.tutup();
  await pulihkanPetakAsli(pool, potret);
  await bersihkan();
  await pool.end();
});

test('KNF02-TC01 Open-Meteo gagal (503 dan koneksi putus) tidak merusak cache dan peta tetap tampil dengan penanda usang', async () => {
  await pool.query('UPDATE petak_lahan SET waktu_update_terakhir = NOW()');
  const empatJamLalu = new Date(Date.now() - 4 * 60 * 60 * 1000);
  await pool.query(
    `UPDATE petak_lahan SET skor_risiko = 50, tingkat_risiko = 'sedang', waktu_update_terakhir = $2 WHERE id_petak = $1`,
    [petakUji, empatJamLalu]
  );

  for (const modeCuaca of [{ mode: 'gagal', status: 503 }, { mode: 'putus' }]) {
    dummy.aturCuaca(modeCuaca);
    const resPerbarui = await fetch(URL + '/api/perbarui', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + CRON_TOKEN }
    });
    assert.equal(resPerbarui.status, 500);

    const resPeta = await fetch(URL + '/api/peta', {
      headers: { Authorization: 'Bearer ' + tokenPetugas }
    });
    assert.equal(resPeta.status, 200);
    const data = await resPeta.json();
    assert.equal(data.isUsang, true);
    assert.ok(Math.abs(new Date(data.waktuUpdate).getTime() - empatJamLalu.getTime()) < 2000);

    const petak = data.daftarPetak.find((p) => p.idPetak === petakUji);
    assert.equal(petak.skorRisiko, 50);
    assert.equal(petak.tingkatRisiko, 'sedang');
  }
});

test('KNF02-TC02 NASA FIRMS gagal (500 dan koneksi putus) tetap menjaga pembaruan dan ketersediaan peta', async () => {
  await pool.query('UPDATE petak_lahan SET waktu_update_terakhir = NOW()');
  await pool.query(
    `INSERT INTO titik_panas (latitude, longitude, waktu_deteksi, status_validitas)
     VALUES (-87.995, 101.405, NOW() - INTERVAL '1 hour', 'valid')`
  );
  dummy.aturCuaca({ mode: 'sukses', json: { daily: { precipitation_sum: [5, 0, 0, 0] } } }); // 2 hari kering -> 20*1 + 5*2 = 30

  for (const modeFirms of [{ mode: 'gagal', status: 500 }, { mode: 'putus' }]) {
    dummy.aturFirms(modeFirms);
    const resPerbarui = await fetch(URL + '/api/perbarui', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + CRON_TOKEN }
    });
    assert.equal(resPerbarui.status, 200);

    const resPeta = await fetch(URL + '/api/peta', {
      headers: { Authorization: 'Bearer ' + tokenPetugas }
    });
    assert.equal(resPeta.status, 200);
    const data = await resPeta.json();
    assert.equal(data.isUsang, false);
    const petak = data.daftarPetak.find((p) => p.idPetak === petakUji);
    assert.equal(petak.skorRisiko, 30);
    assert.equal(petak.tingkatRisiko, 'sedang');
  }
});
