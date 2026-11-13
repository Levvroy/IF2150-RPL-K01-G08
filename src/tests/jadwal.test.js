import test from 'node:test';
import assert from 'node:assert/strict';
import { buatJadwal } from '../controllers/JadwalController.js';

function resTiruan() {
  return { kode: 200, data: null, status(k) { this.kode = k; return this; }, json(d) { this.data = d; return this; } };
}

test('buatJadwal membalas 400 untuk isian kosong tanpa menyentuh database (Algo-004)', async () => {
  const lengkap = { idRelawan: 3, idPetak: 214, jenisPekerjaan: 'patroli', tanggal: '2026-11-10' };
  const kasus = [
    undefined,
    {},
    { ...lengkap, idRelawan: null },
    { ...lengkap, idPetak: 'abc' },
    { ...lengkap, jenisPekerjaan: '' },
    { ...lengkap, tanggal: '' }
  ];
  for (const body of kasus) {
    const res = resTiruan();
    await buatJadwal({ body }, res);
    assert.equal(res.kode, 400, JSON.stringify(body));
    assert.equal(res.data.pesan, 'Semua isian jadwal wajib diisi');
  }
});
