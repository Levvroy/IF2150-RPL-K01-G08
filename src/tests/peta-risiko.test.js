import test from 'node:test';
import assert from 'node:assert/strict';
import { haversine, isDikecualikan } from '../models/TitikPanas.js';
import {
  hitungSkorRisiko,
  hitungHariKering,
  isDataUsang,
  perbaruiData
} from '../controllers/PetaRisikoController.js';

test('haversine menghasilkan jarak 0 km untuk titik yang sama', () => {
  const k = { lat: -0.5124, lng: 101.4471 };
  assert.equal(haversine(k, k), 0);
});

test('haversine menghitung jarak ~1 km untuk selisih lintang 0.009 derajat', () => {
  const jarak = haversine({ lat: -0.5, lng: 101.4 }, { lat: -0.509, lng: 101.4 });
  assert.ok(jarak > 0.99 && jarak < 1.01);
});

test('isDikecualikan mengecualikan titik keliru < 24 jam tanpa deteksi baru dalam 500 m', () => {
  const sekarang = new Date('2026-11-01T12:00:00Z');
  const titik = {
    idTitikPanas: 10,
    koordinat: { lat: -0.51, lng: 101.44 },
    waktuDeteksi: new Date('2026-11-01T08:00:00Z'),
    statusValiditas: 'keliru',
    waktuTandaiKeliru: new Date('2026-11-01T09:00:00Z')
  };
  assert.equal(isDikecualikan(titik, [titik], sekarang), true);
});

test('isDikecualikan mengembalikan false bila ada deteksi baru <= 500 m setelah ditandai keliru', () => {
  const sekarang = new Date('2026-11-01T12:00:00Z');
  const titikKeliru = {
    idTitikPanas: 10,
    koordinat: { lat: -0.51, lng: 101.44 },
    waktuDeteksi: new Date('2026-11-01T08:00:00Z'),
    statusValiditas: 'keliru',
    waktuTandaiKeliru: new Date('2026-11-01T09:00:00Z')
  };
  const titikBaru = {
    idTitikPanas: 11,
    koordinat: { lat: -0.511, lng: 101.441 },
    waktuDeteksi: new Date('2026-11-01T10:00:00Z'),
    statusValiditas: 'valid'
  };
  assert.equal(isDikecualikan(titikKeliru, [titikKeliru, titikBaru], sekarang), false);
});

test('isDikecualikan mengembalikan false jika ditandai keliru lebih dari 24 jam lalu (Algo-003)', () => {
  const sekarang = new Date('2026-11-02T10:00:01Z');
  const titikKeliru = {
    idTitikPanas: 10,
    koordinat: { lat: -0.51, lng: 101.44 },
    waktuDeteksi: new Date('2026-11-01T08:00:00Z'),
    statusValiditas: 'keliru',
    waktuTandaiKeliru: new Date('2026-11-01T10:00:00Z')
  };
  assert.equal(isDikecualikan(titikKeliru, [titikKeliru], sekarang), false);
});

test('isDikecualikan mengabaikan titik yang terdeteksi sebelum waktu penandaan walaupun jarak < 500 m', () => {
  const sekarang = new Date('2026-11-01T12:00:00Z');
  const titikKeliru = {
    idTitikPanas: 10,
    koordinat: { lat: -0.51, lng: 101.44 },
    waktuDeteksi: new Date('2026-11-01T08:00:00Z'),
    statusValiditas: 'keliru',
    waktuTandaiKeliru: new Date('2026-11-01T09:00:00Z')
  };
  const titikSebelum = {
    idTitikPanas: 12,
    koordinat: { lat: -0.5105, lng: 101.4405 },
    waktuDeteksi: new Date('2026-11-01T08:30:00Z'),
    statusValiditas: 'valid'
  };
  assert.equal(isDikecualikan(titikKeliru, [titikKeliru, titikSebelum], sekarang), true);
});

test('hitungHariKering menghitung hari berturut-turut dari akhir dengan curah hujan < 1 mm', () => {
  assert.equal(hitungHariKering([5, 0.2, 0, 0.5]), 3);
  assert.equal(hitungHariKering([0, 0, 2]), 0);
});

test('hitungSkorRisiko menghitung skor dan tingkat risiko per petak sesuai rumus', () => {
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
  assert.equal(p214.skorRisiko, undefined);
  assert.equal(p233.skor, 10);
  assert.equal(p233.tingkatRisiko, 'rendah');
});

test('isDataUsang bernilai true bila waktuUpdateTerakhir > 3 jam atau kosong (KF04)', () => {
  const sekarang = new Date('2026-11-01T12:00:00Z');
  assert.equal(isDataUsang(new Date('2026-11-01T10:00:00Z'), sekarang), false);
  assert.equal(isDataUsang(new Date('2026-11-01T08:59:59Z'), sekarang), true);
  assert.equal(isDataUsang(null, sekarang), true);
});

test('perbaruiData mengembalikan 401 jika CRON_TOKEN tidak cocok', async () => {
  process.env.CRON_TOKEN = 'token-benar';
  const hasil = await perbaruiData('token-salah');
  assert.equal(hasil.status, 401);
});