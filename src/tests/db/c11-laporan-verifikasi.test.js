// C11 LaporanBuktiKerja, operasi verifikasi (Q-016 sampai Q-019) dengan database nyata.
// Operasi simpan dan cekUUIDAda (Q-014, Q-015) sudah diuji lewat C15.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pool from '../../db.js';
import * as LaporanBuktiKerja from '../../models/LaporanBuktiKerja.js';
import { bersihkan, buatPengguna, buatPetak } from '../helpers/fixture.js';
import { buatLaporan, DALAM_PETAK } from '../helpers/laporan.js';

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

async function idAntrean() {
  return (await LaporanBuktiKerja.ambilMenungguVerifikasi()).map((l) => l.idLaporan);
}

test('C11-UT01 ambilMenungguVerifikasi: laporan menunggu tampil dengan data tugas dan nama relawan, tanpa foto', async () => {
  const laporan = await buatLaporan(relawan.id, petak);
  const baris = (await LaporanBuktiKerja.ambilMenungguVerifikasi()).find((l) => l.idLaporan === laporan.idLaporan);

  assert.deepEqual(Object.keys(baris).sort(), ['idJadwal', 'idLaporan', 'idPetak', 'jenisPekerjaan', 'namaRelawan', 'waktuUnggah']);
  assert.equal(baris.idJadwal, laporan.idJadwal);
  assert.equal(baris.idPetak, petak);
  assert.equal(baris.namaRelawan, relawan.username);
});

test('C11-UT02 ambilMenungguVerifikasi: laporan terverifikasi dan ditolak tidak ikut', async () => {
  const disetujui = await buatLaporan(relawan.id, petak);
  const ditolak = await buatLaporan(relawan.id, petak);
  await LaporanBuktiKerja.setujui(disetujui.idLaporan, petugas.id);
  await LaporanBuktiKerja.tolak(ditolak.idLaporan, 'uji-setup');

  const id = await idAntrean();
  assert.equal(id.includes(disetujui.idLaporan), false);
  assert.equal(id.includes(ditolak.idLaporan), false);
});

test('C11-UT03 ambilById: mengembalikan laporan lengkap beserta foto, koordinat, dan tanggal tugas', async () => {
  const laporan = await buatLaporan(relawan.id, petak);
  const hasil = await LaporanBuktiKerja.ambilById(laporan.idLaporan);

  assert.equal(hasil.idLaporan, laporan.idLaporan);
  assert.equal(hasil.status, 'menunggu verifikasi');
  assert.deepEqual(hasil.koordinatUnggah, DALAM_PETAK);
  assert.ok(Buffer.isBuffer(hasil.foto));
  assert.ok(hasil.foto.equals(laporan.foto));
  assert.equal(hasil.idRelawan, relawan.id);
  assert.equal(hasil.tanggalTugas, '2026-11-20');
});

test('C11-UT04 ambilById: UUID yang tidak ada mengembalikan null', async () => {
  assert.equal(await LaporanBuktiKerja.ambilById(randomUUID()), null);
});

test('C11-UT05 setujui: laporan menunggu menjadi terverifikasi dan petugasnya tercatat', async () => {
  const laporan = await buatLaporan(relawan.id, petak);
  assert.equal(await LaporanBuktiKerja.setujui(laporan.idLaporan, petugas.id), true);

  const hasil = await LaporanBuktiKerja.ambilById(laporan.idLaporan);
  assert.equal(hasil.status, 'terverifikasi');
  assert.equal(hasil.idPetugasVerifikasi, petugas.id);
  assert.ok(hasil.waktuVerifikasi instanceof Date);
});

test('C11-UT06 setujui: laporan yang sudah diputuskan mengembalikan false dan tidak berubah (KF10)', async () => {
  const laporan = await buatLaporan(relawan.id, petak);
  await LaporanBuktiKerja.tolak(laporan.idLaporan, 'uji-setup');

  assert.equal(await LaporanBuktiKerja.setujui(laporan.idLaporan, petugas.id), false);
  assert.equal(await LaporanBuktiKerja.setujui(randomUUID(), petugas.id), false);
  assert.equal((await LaporanBuktiKerja.ambilById(laporan.idLaporan)).status, 'ditolak');
});

test('C11-UT07 tolak: laporan menunggu menjadi ditolak dan alasannya tersimpan', async () => {
  const laporan = await buatLaporan(relawan.id, petak);
  assert.equal(await LaporanBuktiKerja.tolak(laporan.idLaporan, 'uji-setup foto buram'), true);

  const hasil = await LaporanBuktiKerja.ambilById(laporan.idLaporan);
  assert.equal(hasil.status, 'ditolak');
  assert.equal(hasil.alasanPenolakan, 'uji-setup foto buram');
  assert.ok(hasil.waktuVerifikasi instanceof Date);
});

test('C11-UT08 tolak: laporan yang sudah terverifikasi mengembalikan false dan tetap terverifikasi (KF10)', async () => {
  const laporan = await buatLaporan(relawan.id, petak);
  await LaporanBuktiKerja.setujui(laporan.idLaporan, petugas.id);

  assert.equal(await LaporanBuktiKerja.tolak(laporan.idLaporan, 'uji-setup'), false);
  const hasil = await LaporanBuktiKerja.ambilById(laporan.idLaporan);
  assert.equal(hasil.status, 'terverifikasi');
  assert.equal(hasil.alasanPenolakan, null);
});
