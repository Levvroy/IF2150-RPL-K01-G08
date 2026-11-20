// C15 terimaLaporan dengan database (Algo-011)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pool from '../../db.js';
import { terimaLaporan } from '../../controllers/UploadLaporanController.js';
import { bersihkan, buatPengguna, buatPetak, buatJadwal, resPalsu } from '../helpers/fixture.js';

let relawan, relawanLain, petak;

before(async () => {
  await bersihkan();
  relawan = await buatPengguna('relawan', 'relawan');
  relawanLain = await buatPengguna('relawan2', 'relawan');
  petak = await buatPetak(50, 'sedang');
});

after(async () => {
  await bersihkan();
  await pool.end();
});

async function kirim(idRelawan, idJadwal, uuid = randomUUID()) {
  const res = resPalsu();
  await terimaLaporan({
    pengguna: { idPengguna: idRelawan },
    body: { idLaporan: uuid, idJadwal: String(idJadwal), lat: '-0.5', lng: '101.4', waktuUnggah: '2026-11-18T08:00:00Z' },
    file: { buffer: Buffer.from('foto'), size: 4 }
  }, res);
  return res;
}

async function jumlahLaporan(idJadwal) {
  const { rows } = await pool.query('SELECT COUNT(*) FROM laporan_bukti_kerja WHERE id_jadwal = $1', [idJadwal]);
  return Number(rows[0].count);
}

test('C15-UT01 laporan valid tersimpan (201) dan status tugas jadi menunggu verifikasi', async () => {
  const idJadwal = await buatJadwal(relawan.id, petak);
  assert.equal((await kirim(relawan.id, idJadwal)).kode, 201);
  const { rows } = await pool.query('SELECT status FROM jadwal_pekerjaan WHERE id_jadwal = $1', [idJadwal]);
  assert.equal(rows[0].status, 'menunggu verifikasi');
});

test('C15-UT02 laporan dengan UUID yang sama dikirim ulang dibalas 200, tidak dobel', async () => {
  const idJadwal = await buatJadwal(relawan.id, petak);
  const uuid = randomUUID();
  await kirim(relawan.id, idJadwal, uuid);
  assert.equal((await kirim(relawan.id, idJadwal, uuid)).kode, 200);
  assert.equal(await jumlahLaporan(idJadwal), 1);
});

test('C15-UT03 tiga kiriman UUID sama secara bersamaan tetap tersimpan satu', async () => {
  const idJadwal = await buatJadwal(relawan.id, petak);
  const uuid = randomUUID();
  await Promise.all([kirim(relawan.id, idJadwal, uuid), kirim(relawan.id, idJadwal, uuid), kirim(relawan.id, idJadwal, uuid)]);
  assert.equal(await jumlahLaporan(idJadwal), 1);
});

test('C15-UT04 laporan untuk tugas relawan lain ditolak 409', async () => {
  const idJadwal = await buatJadwal(relawan.id, petak);
  assert.equal((await kirim(relawanLain.id, idJadwal)).kode, 409);
});

test('C15-UT05 laporan untuk tugas yang sudah dibatalkan ditolak 409', async () => {
  const idJadwal = await buatJadwal(relawan.id, petak, 'dibatalkan');
  assert.equal((await kirim(relawan.id, idJadwal)).kode, 409);
});
