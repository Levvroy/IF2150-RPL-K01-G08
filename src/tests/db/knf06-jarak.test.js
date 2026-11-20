// KNF06 Accuracy: laporan yang jaraknya lebih dari 200 m dari batas petak harus ditandai.
// Laporan diletakkan pada jarak yang diketahui (dihitung dari selisih lintang), disimpan ke
// database, lalu dibaca lewat ambilDetailLaporan (C10) seperti yang dilihat petugas di I-04.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../db.js';
import { ambilDetailLaporan } from '../../controllers/VerifikasiLaporanController.js';
import { bersihkan, buatPengguna, buatPetak } from '../helpers/fixture.js';
import { buatLaporan, utaraPetak, BATAS_PETAK_UJI, DALAM_PETAK, METER_PER_DERAJAT_LINTANG, resUji } from '../helpers/laporan.js';

let relawan, petugas, petak;

before(async () => {
  await bersihkan();
  relawan = await buatPengguna('relawan', 'relawan');
  petugas = await buatPengguna('petugas', 'petugas');
  petak = await buatPetak(70, 'tinggi');
});

after(async () => {
  await bersihkan();
  await pool.end();
});

function selatanPetak(meter) {
  return { lat: BATAS_PETAK_UJI.latMin - meter / METER_PER_DERAJAT_LINTANG, lng: DALAM_PETAK.lng };
}

const SKENARIO = [
  { arah: 'dalam', meter: 0, koordinat: DALAM_PETAK },
  ...[50, 100, 150, 199, 200, 201, 250, 340, 500].map((meter) => ({ arah: 'utara', meter, koordinat: utaraPetak(meter) })),
  ...[199, 200, 201].map((meter) => ({ arah: 'selatan', meter, koordinat: selatanPetak(meter) }))
];

test('KNF06-TC01 laporan lebih dari 200 m dari batas petak ditandai, 200 m ke bawah tidak', async (t) => {
  t.diagnostic('arah    | jarak sebenarnya | hitungJarak | ditandai | diharapkan | hasil');
  let lulus = 0;
  let galatMaks = 0;
  for (const s of SKENARIO) {
    const { idLaporan } = await buatLaporan(relawan.id, petak, { koordinat: s.koordinat });
    const res = resUji();
    await ambilDetailLaporan({ params: { id: idLaporan }, pengguna: { idPengguna: petugas.id, peran: 'petugas' } }, res);

    const diharapkan = s.meter > 200;
    const cocok = res.isi.jarak === s.meter && res.isi.melebihiBatas === diharapkan;
    if (cocok) lulus++;
    galatMaks = Math.max(galatMaks, Math.abs(res.isi.jarak - s.meter));
    t.diagnostic(`${s.arah.padEnd(7)} | ${String(s.meter).padStart(5)} m          | ${String(res.isi.jarak).padStart(5)} m     | ${String(res.isi.melebihiBatas).padEnd(8)} | ${String(diharapkan).padEnd(10)} | ${cocok ? 'Pass' : 'Fail'}`);
  }
  t.diagnostic(`${lulus}/${SKENARIO.length} skenario sesuai, galat jarak maksimum ${galatMaks} m`);
  assert.equal(lulus, SKENARIO.length);
});
