import test from 'node:test';
import assert from 'node:assert/strict';
import { validasiKapasitas, buatJadwal } from '../controllers/JadwalController.js';

// db tiruan yang membalas Q-013 dengan jumlah tugas aktif tertentu
const dbDenganTugasAktif = (jumlah) => ({ query: async () => ({ rows: [{ jumlah }] }) });

function resTiruan() {
  return { kode: 200, data: null, status(k) { this.kode = k; return this; }, json(d) { this.data = d; return this; } };
}

test('validasiKapasitas menerima relawan dengan kurang dari 3 tugas aktif (KF06)', async () => {
  assert.equal(await validasiKapasitas(1, dbDenganTugasAktif(0)), true);
  assert.equal(await validasiKapasitas(1, dbDenganTugasAktif(2)), true);
});

test('validasiKapasitas menolak relawan yang sudah punya 3 tugas aktif (KF06)', async () => {
  assert.equal(await validasiKapasitas(1, dbDenganTugasAktif(3)), false);
  assert.equal(await validasiKapasitas(1, dbDenganTugasAktif(4)), false);
});

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
