// C03 PetakLahan dengan database nyata: Q-001, Q-002, Q-003, dan Q-004.
import { test, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../db.js';
import {
  ambilSemua,
  ambilById,
  ambilRekomendasi,
  perbaruiSkor
} from '../../models/PetakLahan.js';
import { bersihkan, buatPengguna, buatJadwal } from '../helpers/fixture.js';
import { buatPetakUji, bersihkanDataUjiPeta } from '../helpers/peta-risiko.js';

let relawan;

before(async () => {
  await bersihkan();
  await bersihkanDataUjiPeta(pool);
  relawan = await buatPengguna('c03-relawan', 'relawan');
});

afterEach(async () => {
  await bersihkanDataUjiPeta(pool);
});

after(async () => {
  await bersihkanDataUjiPeta(pool);
  await bersihkan();
  await pool.end();
});

test('C03-UT01 ambilSemua: mengembalikan daftar petak terurut id_petak beserta batasWilayah (Q-001)', async () => {
  const idA = await buatPetakUji(pool, { skor: 10, tingkat: 'rendah' });
  const idB = await buatPetakUji(pool, { latMin: -87.99, latMaks: -87.98, skor: 40, tingkat: 'sedang' });

  const daftar = await ambilSemua();
  const posA = daftar.findIndex((p) => p.idPetak === idA);
  const posB = daftar.findIndex((p) => p.idPetak === idB);

  assert.ok(posA >= 0 && posB > posA);
  assert.deepEqual(daftar[posA].batasWilayah, {
    latMin: -88,
    latMaks: -87.99,
    lngMin: 101.4,
    lngMaks: 101.41
  });
});

test('C03-UT02 ambilById: mengembalikan detail satu petak yang ada di database (Q-002)', async () => {
  const id = await buatPetakUji(pool, { skor: 65, tingkat: 'tinggi' });
  const petak = await ambilById(id);
  assert.equal(petak.idPetak, id);
  assert.equal(petak.skorRisiko, 65);
  assert.equal(petak.tingkatRisiko, 'tinggi');
});

test('C03-UT03 ambilById: mengembalikan null jika idPetak tidak ditemukan', async () => {
  assert.equal(await ambilById(2147483000), null);
});

test('C03-UT04 ambilRekomendasi: mengurutkan skor tertinggi dan mengecualikan petak dengan tugas aktif (Q-003, KF17)', async () => {
  const pDitugaskan = await buatPetakUji(pool, { skor: 999, tingkat: 'tinggi' });
  const pMenunggu = await buatPetakUji(pool, { skor: 998, tingkat: 'tinggi' });
  const pSelesai = await buatPetakUji(pool, { skor: 997, tingkat: 'tinggi' });
  const pBatal = await buatPetakUji(pool, { skor: 996, tingkat: 'tinggi' });
  const pKosong = await buatPetakUji(pool, { skor: 995, tingkat: 'tinggi' });

  await buatJadwal(relawan.id, pDitugaskan, 'ditugaskan');
  await buatJadwal(relawan.id, pMenunggu, 'menunggu verifikasi');
  await buatJadwal(relawan.id, pSelesai, 'selesai');
  await buatJadwal(relawan.id, pBatal, 'dibatalkan');

  const rekomendasi = await ambilRekomendasi();
  const ids = rekomendasi.map((p) => p.idPetak);

  assert.equal(ids.includes(pDitugaskan), false);
  assert.equal(ids.includes(pMenunggu), false);
  assert.deepEqual(ids.slice(0, 3), [pSelesai, pBatal, pKosong]);
});

test('C03-UT05 ambilRekomendasi: menghormati batas jumlah rekomendasi yang diminta', async () => {
  await buatPetakUji(pool, { skor: 999, tingkat: 'tinggi' });
  await buatPetakUji(pool, { skor: 998, tingkat: 'tinggi' });
  await buatPetakUji(pool, { skor: 997, tingkat: 'tinggi' });

  assert.equal((await ambilRekomendasi(2)).length, 2);
  assert.equal((await ambilRekomendasi(0)).length, 0);
});

test('C03-UT06 perbaruiSkor: memperbarui skor_risiko, tingkat_risiko, dan waktu_update_terakhir (Q-004)', async () => {
  const waktuLama = new Date(Date.now() - 5 * 60 * 60 * 1000);
  const id = await buatPetakUji(pool, { skor: 5, tingkat: 'rendah', waktuUpdate: waktuLama });

  await perbaruiSkor(id, 72.5, 'tinggi');
  const petak = await ambilById(id);

  assert.equal(petak.skorRisiko, 72.5);
  assert.equal(petak.tingkatRisiko, 'tinggi');
  assert.ok(petak.waktuUpdateTerakhir.getTime() > waktuLama.getTime());
});

test('C03-UT07 perbaruiSkor: idPetak yang tidak ada tidak menimbulkan error dan tidak mengubah petak lain', async () => {
  const id = await buatPetakUji(pool, { skor: 15, tingkat: 'rendah' });
  await perbaruiSkor(2147483000, 99, 'tinggi');
  const petak = await ambilById(id);
  assert.equal(petak.skorRisiko, 15);
  assert.equal(petak.tingkatRisiko, 'rendah');
});
