// C02 PetaRisikoController (tanpa database): klasifikasi tingkat risiko,
// hari kering, rumus skor, status data usang, dan autentikasi token cron.
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  KONFIG_SKOR,
  tingkatDariSkor,
  isDataUsang,
  hitungHariKering,
  hitungSkorRisiko,
  perbaruiData,
  perbaruiDataHandler
} from '../controllers/PetaRisikoController.js';
import { resPalsu } from './helpers/fixture.js';

const CRON_ASLI = process.env.CRON_TOKEN;

afterEach(() => {
  if (CRON_ASLI === undefined) delete process.env.CRON_TOKEN;
  else process.env.CRON_TOKEN = CRON_ASLI;
});

test('C02-UT01 tingkatDariSkor: mengklasifikasikan nilai normal rendah, sedang, dan tinggi', () => {
  assert.equal(tingkatDariSkor(10), 'rendah');
  assert.equal(tingkatDariSkor(45), 'sedang');
  assert.equal(tingkatDariSkor(75), 'tinggi');
});

test('C02-UT02 tingkatDariSkor: memeriksa nilai batas ambang sedang (30) dan tinggi (60)', () => {
  assert.equal(tingkatDariSkor(0), 'rendah');
  assert.equal(tingkatDariSkor(KONFIG_SKOR.ambangSedang - 0.01), 'rendah');
  assert.equal(tingkatDariSkor(KONFIG_SKOR.ambangSedang), 'sedang');
  assert.equal(tingkatDariSkor(KONFIG_SKOR.ambangTinggi - 0.01), 'sedang');
  assert.equal(tingkatDariSkor(KONFIG_SKOR.ambangTinggi), 'tinggi');
});

test('C02-UT03 hitungHariKering: menghitung hari berturut-turut dari akhir dengan curah hujan < 1 mm', () => {
  assert.equal(hitungHariKering([5, 0.2, 0, 0.5]), 3);
  assert.equal(hitungHariKering([0, 0, 2]), 0);
});

test('C02-UT04 hitungHariKering: nilai batas tepat 1 mm menghentikan hitungan dan array kosong bernilai 0', () => {
  assert.equal(hitungHariKering([0, 1, 0.99]), 1);
  assert.equal(hitungHariKering([0, 0.1, 0.5]), 3);
  assert.equal(hitungHariKering([]), 0);
  assert.equal(hitungHariKering(), 0);
});

test('C02-UT05 hitungSkorRisiko: menghitung skor dan tingkat risiko per petak sesuai rumus pembobotan', () => {
  const daftarPetak = [
    {
      idPetak: 214,
      batasWilayah: { latMin: -0.52, latMaks: -0.51, lngMin: 101.44, lngMaks: 101.45 }
    },
    {
      idPetak: 233,
      batasWilayah: { latMin: -0.52, latMaks: -0.51, lngMin: 101.45, lngMaks: 101.46 }
    }
  ];
  const titikBerlaku = [
    { koordinat: { lat: -0.515, lng: 101.445 } },
    { koordinat: { lat: -0.512, lng: 101.442 } },
    { koordinat: { lat: -0.518, lng: 101.448 } }
  ];
  const cuaca = { curahHujan: 0, hariKering: 2 };

  const hasil = hitungSkorRisiko(titikBerlaku, cuaca, daftarPetak);
  const p214 = hasil.find((p) => p.idPetak === 214);
  const p233 = hasil.find((p) => p.idPetak === 233);

  assert.equal(p214.skor, 70);
  assert.equal(p214.tingkatRisiko, 'tinggi');
  assert.equal(p233.skor, 10);
  assert.equal(p233.tingkatRisiko, 'rendah');
});

test('C02-UT06 hitungSkorRisiko: menerapkan batas setengah terbuka petak dan membatasi skor minimum 0', () => {
  const petak = [
    {
      idPetak: 1,
      batasWilayah: { latMin: -0.52, latMaks: -0.51, lngMin: 101.44, lngMaks: 101.45 }
    }
  ];
  const titik = [
    { koordinat: { lat: -0.52, lng: 101.44 } },   // masuk (tepat di latMin & lngMin)
    { koordinat: { lat: -0.51, lng: 101.445 } },  // keluar (tepat di latMaks)
    { koordinat: { lat: -0.515, lng: 101.45 } }   // keluar (tepat di lngMaks)
  ];
  const hasilMasuk = hitungSkorRisiko(titik, { curahHujan: 5.5, hariKering: 0 }, petak);
  assert.equal(hasilMasuk[0].skor, 14.5);
  assert.equal(hasilMasuk[0].tingkatRisiko, 'rendah');

  const hasilNegatif = hitungSkorRisiko([], { curahHujan: 50, hariKering: 0 }, petak);
  assert.equal(hasilNegatif[0].skor, 0);
});

test('C02-UT07 hitungSkorRisiko: daftar petak atau data cuaca kosong ditangani aman tanpa error', () => {
  assert.deepEqual(hitungSkorRisiko([], undefined, []), []);
  assert.deepEqual(hitungSkorRisiko(), []);
  const hasil = hitungSkorRisiko([], {}, [{
    idPetak: 9,
    batasWilayah: { latMin: -1, latMaks: 0, lngMin: 100, lngMaks: 101 }
  }]);
  assert.equal(hasil[0].skor, 0);
  assert.equal(hasil[0].tingkatRisiko, 'rendah');
});

test('C02-UT08 isDataUsang: bernilai false dalam 3 jam dan true jika lewat 3 jam', () => {
  const sekarang = new Date('2026-11-01T12:00:00Z');
  assert.equal(isDataUsang(new Date('2026-11-01T10:00:00Z'), sekarang), false);
  assert.equal(isDataUsang(new Date('2026-11-01T08:00:00Z'), sekarang), true);
});

test('C02-UT09 isDataUsang: batas tepat 3 jam masih segar (false) dan lewat 1 ms menjadi usang (true)', () => {
  const sekarang = new Date('2026-11-01T12:00:00.000Z');
  assert.equal(isDataUsang(new Date('2026-11-01T09:00:00.000Z'), sekarang), false);
  assert.equal(isDataUsang(new Date('2026-11-01T08:59:59.999Z'), sekarang), true);
});

test('C02-UT10 isDataUsang: nilai kosong atau format tanggal tidak valid bernilai true', () => {
  const sekarang = new Date('2026-11-01T12:00:00Z');
  assert.equal(isDataUsang(null, sekarang), true);
  assert.equal(isDataUsang(undefined, sekarang), true);
  assert.equal(isDataUsang('bukan-tanggal', sekarang), true);
});

test('C02-UT11 perbaruiData: menolak token tidak cocok atau CRON_TOKEN kosong dengan status 401', async () => {
  process.env.CRON_TOKEN = 'token-benar';
  const salah = await perbaruiData('token-salah');
  assert.equal(salah.status, 401);

  delete process.env.CRON_TOKEN;
  const kosong = await perbaruiData('token-benar');
  assert.equal(kosong.status, 401);
});

test('C02-UT12 perbaruiDataHandler: header Authorization kosong atau Bearer salah dibalas 401', async () => {
  process.env.CRON_TOKEN = 'token-benar';

  const resTanpaHeader = resPalsu();
  await perbaruiDataHandler({ headers: {} }, resTanpaHeader);
  assert.equal(resTanpaHeader.kode, 401);

  const resSalah = resPalsu();
  await perbaruiDataHandler({ headers: { authorization: 'Bearer salah' } }, resSalah);
  assert.equal(resSalah.kode, 401);
});
