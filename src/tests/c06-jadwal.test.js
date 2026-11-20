// C06 JadwalController tanpa database: pemeriksaan isian Algo-004 sebelum query dijalankan.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buatJadwal } from '../controllers/JadwalController.js';
import { resPalsu } from './helpers/fixture.js';

const LENGKAP = { idRelawan: 3, idPetak: 214, jenisPekerjaan: 'patroli', tanggal: '2026-11-20' };

async function panggil(body) {
  const res = resPalsu();
  await buatJadwal({ body }, res);
  return res;
}

test('C06-UT01 buatJadwal: tanpa body atau body kosong dibalas 400 tanpa query', async () => {
  for (const body of [undefined, null, {}]) {
    const res = await panggil(body);
    assert.equal(res.kode, 400, JSON.stringify(body));
    assert.equal(res.isi.pesan, 'Semua isian jadwal wajib diisi');
  }
});

test('C06-UT02 buatJadwal: id relawan dan petak harus bilangan bulat positif (0, negatif, pecahan, teks ditolak)', async () => {
  for (const id of [0, -1, 1.5, '3', null]) {
    assert.equal((await panggil({ ...LENGKAP, idRelawan: id })).kode, 400, `idRelawan ${id}`);
    assert.equal((await panggil({ ...LENGKAP, idPetak: id })).kode, 400, `idPetak ${id}`);
  }
});

test('C06-UT03 buatJadwal: jenis pekerjaan dan tanggal kosong atau bukan teks dibalas 400', async () => {
  for (const kurang of [{ jenisPekerjaan: '' }, { jenisPekerjaan: 1 }, { tanggal: '' }, { tanggal: 20261120 }]) {
    assert.equal((await panggil({ ...LENGKAP, ...kurang })).kode, 400, JSON.stringify(kurang));
  }
});
