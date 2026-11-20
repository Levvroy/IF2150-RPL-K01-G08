// C04 TitikPanas (tanpa database): perhitungan jarak haversine dan aturan pengecualian 24 jam / 500 m (Algo-003).
import test from 'node:test';
import assert from 'node:assert/strict';
import { haversine, isDikecualikan } from '../models/TitikPanas.js';

test('C04-UT01 haversine: jarak dua koordinat identik adalah 0 km', () => {
  const k = { lat: -0.5124, lng: 101.4471 };
  assert.equal(haversine(k, k), 0);
});

test('C04-UT02 haversine: selisih lintang 0.009 derajat menghasilkan jarak sekitar 1 km', () => {
  const jarak = haversine({ lat: -0.5, lng: 101.4 }, { lat: -0.509, lng: 101.4 });
  assert.ok(jarak > 0.99 && jarak < 1.01);
});

test('C04-UT03 isDikecualikan: titik keliru kurang dari 24 jam tanpa deteksi baru dalam 500 m dikecualikan (Algo-003)', () => {
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

test('C04-UT04 isDikecualikan: titik berstatus valid atau tanpa waktuTandaiKeliru tidak dikecualikan', () => {
  const sekarang = new Date('2026-11-01T12:00:00Z');
  assert.equal(isDikecualikan({
    idTitikPanas: 1,
    koordinat: { lat: -0.51, lng: 101.44 },
    statusValiditas: 'valid',
    waktuTandaiKeliru: new Date('2026-11-01T09:00:00Z')
  }, [], sekarang), false);

  assert.equal(isDikecualikan({
    idTitikPanas: 2,
    koordinat: { lat: -0.51, lng: 101.44 },
    statusValiditas: 'keliru',
    waktuTandaiKeliru: null
  }, [], sekarang), false);
});

test('C04-UT05 isDikecualikan: memeriksa batas tepat 24 jam (true) dan 24 jam 1 detik (false)', () => {
  const titik = {
    idTitikPanas: 10,
    koordinat: { lat: -0.51, lng: 101.44 },
    waktuDeteksi: new Date('2026-11-01T08:00:00Z'),
    statusValiditas: 'keliru',
    waktuTandaiKeliru: new Date('2026-11-01T10:00:00Z')
  };
  assert.equal(isDikecualikan(titik, [titik], new Date('2026-11-02T10:00:00Z')), true);
  assert.equal(isDikecualikan(titik, [titik], new Date('2026-11-02T10:00:01Z')), false);
});

test('C04-UT06 isDikecualikan: batas radius 500 m membatalkan pengecualian jika <= 500 m dan tetap mengecualikan jika > 500 m', () => {
  const sekarang = new Date('2026-11-01T12:00:00Z');
  const titikKeliru = {
    idTitikPanas: 10,
    koordinat: { lat: -0.51, lng: 101.44 },
    waktuDeteksi: new Date('2026-11-01T08:00:00Z'),
    statusValiditas: 'keliru',
    waktuTandaiKeliru: new Date('2026-11-01T09:00:00Z')
  };
  const titikDekat = {
    idTitikPanas: 11,
    koordinat: { lat: -0.511, lng: 101.441 }, // ~157 m
    waktuDeteksi: new Date('2026-11-01T10:00:00Z'),
    statusValiditas: 'valid'
  };
  const titikJauh = {
    idTitikPanas: 12,
    koordinat: { lat: -0.52, lng: 101.44 }, // ~1,11 km (> 500 m)
    waktuDeteksi: new Date('2026-11-01T10:00:00Z'),
    statusValiditas: 'valid'
  };

  assert.equal(isDikecualikan(titikKeliru, [titikKeliru, titikDekat], sekarang), false);
  assert.equal(isDikecualikan(titikKeliru, [titikKeliru, titikJauh], sekarang), true);
});

test('C04-UT07 isDikecualikan: mengabaikan deteksi sebelum atau tepat pada waktuTandaiKeliru meski berjarak < 500 m', () => {
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
  const titikBersamaan = {
    idTitikPanas: 13,
    koordinat: { lat: -0.5105, lng: 101.4405 },
    waktuDeteksi: new Date('2026-11-01T09:00:00Z'),
    statusValiditas: 'valid'
  };
  assert.equal(isDikecualikan(titikKeliru, [titikKeliru, titikSebelum, titikBersamaan], sekarang), true);
});
