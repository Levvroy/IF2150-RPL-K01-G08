// C06 JadwalController dengan database nyata: formulir (KF05, KF17), kapasitas 3 tugas aktif (KF06),
// penyimpanan dan notifikasi tugas (KF07), serta galat database pada Algo-004.
import { test, before, after, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../db.js';
import { bukaFormJadwal, buatJadwal } from '../../controllers/JadwalController.js';
import { bersihkan, buatPengguna, buatPetak, buatJadwal as isiJadwal, resPalsu } from '../helpers/fixture.js';

let relawan, relawanNonaktif, petak;

before(async () => {
  await bersihkan();
  relawan = await buatPengguna('c06-relawan', 'relawan');
  relawanNonaktif = await buatPengguna('c06-nonaktif', 'relawan');
  await pool.query('UPDATE relawan_lapangan SET status_aktif = FALSE WHERE id_relawan = $1', [relawanNonaktif.id]);
  petak = await buatPetak(70, 'tinggi');
});

afterEach(async () => {
  mock.restoreAll();
  await pool.query('DELETE FROM notifikasi WHERE id_pengguna = $1', [relawan.id]);
  await pool.query('DELETE FROM jadwal_pekerjaan WHERE id_relawan = $1', [relawan.id]);
});

after(async () => {
  await bersihkan();
  await pool.end();
});

function dataJadwal(ubah = {}) {
  return { idRelawan: relawan.id, idPetak: petak, jenisPekerjaan: 'patroli', tanggal: '2026-11-21', ...ubah };
}

async function panggil(fungsi, body) {
  const res = resPalsu();
  await fungsi({ body }, res);
  return res;
}

async function jumlahJadwal() {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS jumlah FROM jadwal_pekerjaan WHERE id_relawan = $1', [relawan.id]);
  return rows[0].jumlah;
}

// Membuat pool.query gagal hanya untuk SQL yang memuat `potongan`, sisanya tetap ke database
function gagalkanQuery(potongan, galat = new Error('galat uji')) {
  const asli = pool.query.bind(pool);
  mock.method(pool, 'query', (sql, ...sisa) => {
    if (String(sql).includes(potongan)) return Promise.reject(galat);
    return asli(sql, ...sisa);
  });
  mock.method(console, 'error', () => {});
}

test('C06-UT04 bukaFormJadwal: relawan aktif, rekomendasi, dan seluruh petak dikirim ke formulir', async () => {
  const res = await panggil(bukaFormJadwal);
  assert.equal(res.kode, 200);
  assert.ok(res.isi.daftarRelawan.some((r) => r.idRelawan === relawan.id && r.nama === relawan.username));
  assert.ok(res.isi.daftarPetak.some((p) => p.idPetak === petak));
  assert.ok(Array.isArray(res.isi.rekomendasi));
});

test('C06-UT05 bukaFormJadwal: relawan nonaktif tidak muncul dan rekomendasi paling banyak 5 petak (KF17)', async () => {
  const res = await panggil(bukaFormJadwal);
  assert.equal(res.isi.daftarRelawan.some((r) => r.idRelawan === relawanNonaktif.id), false);
  assert.equal(res.isi.rekomendasi.length, Math.min(5, res.isi.daftarPetak.length));
});

test('C06-UT06 bukaFormJadwal: database gagal dibalas 500', async () => {
  gagalkanQuery('FROM relawan_lapangan');
  const res = await panggil(bukaFormJadwal);
  assert.equal(res.kode, 500);
  assert.equal(res.isi.pesan, 'Terjadi kesalahan di server');
});

test('C06-UT07 buatJadwal: jadwal tersimpan berstatus ditugaskan dan relawan mendapat notifikasi (KF07)', async () => {
  const res = await panggil(buatJadwal, dataJadwal());
  assert.equal(res.kode, 201);
  assert.equal(res.isi.status, 'ditugaskan');
  assert.equal(res.isi.tanggal, '2026-11-21');
  assert.equal(res.isi.notifikasiTerkirim, true);
  const { rows } = await pool.query('SELECT isi_pesan FROM notifikasi WHERE id_pengguna = $1', [relawan.id]);
  assert.deepEqual(rows.map((r) => r.isi_pesan), [`Tugas baru #${res.isi.idJadwal} sudah ditugaskan kepada Anda`]);
});

test('C06-UT08 buatJadwal: tugas ke-3 masih diterima, tugas ke-4 ditolak 409 dan tidak tersimpan (KF06)', async () => {
  await isiJadwal(relawan.id, petak);
  await isiJadwal(relawan.id, petak, 'menunggu verifikasi');
  assert.equal((await panggil(buatJadwal, dataJadwal())).kode, 201);
  const keempat = await panggil(buatJadwal, dataJadwal());
  assert.equal(keempat.kode, 409);
  assert.equal(keempat.isi.pesan, 'Relawan sudah memiliki 3 tugas aktif');
  assert.equal(await jumlahJadwal(), 3);
});

test('C06-UT09 buatJadwal: tugas selesai dan dibatalkan tidak dihitung tugas aktif (Q-013)', async () => {
  await isiJadwal(relawan.id, petak);
  await isiJadwal(relawan.id, petak);
  await isiJadwal(relawan.id, petak, 'selesai');
  await isiJadwal(relawan.id, petak, 'dibatalkan');
  assert.equal((await panggil(buatJadwal, dataJadwal())).kode, 201);
});

test('C06-UT10 buatJadwal: relawan atau petak yang tidak ada dibalas 400 "Data jadwal tidak valid" (23503)', async () => {
  const petakFiktif = await panggil(buatJadwal, dataJadwal({ idPetak: 2147483000 }));
  assert.equal(petakFiktif.kode, 400);
  assert.equal(petakFiktif.isi.pesan, 'Data jadwal tidak valid');
  const relawanFiktif = await panggil(buatJadwal, { ...dataJadwal(), idRelawan: 2147483000 });
  assert.equal(relawanFiktif.kode, 400);
  assert.equal(await jumlahJadwal(), 0);
});

test('C06-UT11 buatJadwal: jenis pekerjaan di luar pilihan (23514) dan tanggal tidak valid (22008, 22007) dibalas 400', async () => {
  for (const ubah of [{ jenisPekerjaan: 'menanam pohon' }, { tanggal: '2026-13-40' }, { tanggal: 'besok' }]) {
    const res = await panggil(buatJadwal, dataJadwal(ubah));
    assert.equal(res.kode, 400, JSON.stringify(ubah));
    assert.equal(res.isi.pesan, 'Data jadwal tidak valid');
  }
  assert.equal(await jumlahJadwal(), 0);
});

test('C06-UT12 buatJadwal: galat database lain saat menyimpan dibalas 500', async () => {
  gagalkanQuery('INSERT INTO jadwal_pekerjaan');
  const res = await panggil(buatJadwal, dataJadwal());
  assert.equal(res.kode, 500);
  assert.equal(await jumlahJadwal(), 0);
});

test('C06-UT13 buatJadwal: notifikasi gagal dibuat, jadwal tetap tersimpan dengan notifikasiTerkirim false', async () => {
  gagalkanQuery('INSERT INTO notifikasi');
  const res = await panggil(buatJadwal, dataJadwal());
  assert.equal(res.kode, 201);
  assert.equal(res.isi.notifikasiTerkirim, false);
  assert.equal(await jumlahJadwal(), 1);
});
