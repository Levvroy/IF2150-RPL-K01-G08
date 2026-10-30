import test from 'node:test';
import assert from 'node:assert/strict';
import { geserWaktuKeSekarang, batasPetak } from '../sql/seed.js';

test('titik terbaru digeser menjadi 1 jam sebelum sekarang', () => {
  const sekarang = new Date('2026-11-01T10:00:00Z');
  const hasil = geserWaktuKeSekarang(
    [new Date('2023-09-15T05:45:00Z'), new Date('2023-09-16T18:30:00Z')],
    sekarang
  );
  assert.equal(hasil[1].toISOString(), '2026-11-01T09:00:00.000Z');
});

test('jarak waktu antartitik tidak berubah setelah digeser', () => {
  const awal = [new Date('2023-09-15T05:45:00Z'), new Date('2023-09-16T18:30:00Z')];
  const hasil = geserWaktuKeSekarang(awal);
  assert.equal(hasil[1] - hasil[0], awal[1] - awal[0]);
});

test('koordinat laporan I-04a berada di dalam Petak 214', () => {
  const b = batasPetak(214);
  assert.ok(b.latMin <= -0.5124 && -0.5124 < b.latMaks);
  assert.ok(b.lngMin <= 101.4471 && 101.4471 < b.lngMaks);
});
