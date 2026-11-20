import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../db.js';
import * as Notifikasi from '../../models/Notifikasi.js';
import { bersihkan, buatPengguna } from '../helpers/fixture.js';

let petugas, petugasLain;

before(async () => {
  await bersihkan();
  petugas = await buatPengguna('petugas-c24', 'petugas');
  petugasLain = await buatPengguna('petugas-c24b', 'petugas');
});

after(async () => {
  await bersihkan();
  await pool.end();
});

test('C24-UT01 buat menyimpan notifikasi baru yang belum dibaca', async () => {
  await Notifikasi.buat(petugas.id, 'uji-setup Tugas baru #12 sudah ditugaskan kepada Anda');
  const { rows } = await pool.query(
    'SELECT isi_pesan, sudah_dibaca, waktu_dibuat FROM notifikasi WHERE id_pengguna = $1',
    [petugas.id]
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].isi_pesan, 'uji-setup Tugas baru #12 sudah ditugaskan kepada Anda');
  assert.equal(rows[0].sudah_dibaca, false);
  assert.notEqual(rows[0].waktu_dibuat, null);
});

test('C24-UT01b buat untuk pengguna yang tidak ada ditolak basis data', async () => {
  await assert.rejects(() => Notifikasi.buat(2147483647, 'uji-setup pesan'));
});

test('C24-UT02 ambilBelumDibaca dipetakan ke camelCase, hanya milik pengguna itu', async () => {
  await Notifikasi.buat(petugas.id, 'uji-setup pesan kedua');
  await Notifikasi.buat(petugasLain.id, 'uji-setup pesan orang lain');
  const hasil = await Notifikasi.ambilBelumDibaca(petugas.id);
  assert.equal(hasil.length, 2);
  assert.deepEqual(Object.keys(hasil[0]).sort(), ['idNotifikasi', 'isiPesan', 'waktuDibuat']);
  assert.equal(hasil[0].isiPesan, 'uji-setup pesan kedua'); // terbaru paling atas
  assert.ok(hasil.every((n) => !n.isiPesan.includes('orang lain')));
});

test('C24-UT02b ambilBelumDibaca pengguna tanpa notifikasi mengembalikan larik kosong', async () => {
  const baru = await buatPengguna('petugas-c24c', 'petugas');
  assert.deepEqual(await Notifikasi.ambilBelumDibaca(baru.id), []);
});

test('C24-UT03 tandaiDibaca mengembalikan TRUE dan notifikasi tidak muncul lagi', async () => {
  const [notif] = await Notifikasi.ambilBelumDibaca(petugas.id);
  assert.equal(await Notifikasi.tandaiDibaca(notif.idNotifikasi, petugas.id), true);
  const sisa = await Notifikasi.ambilBelumDibaca(petugas.id);
  assert.ok(!sisa.some((n) => n.idNotifikasi === notif.idNotifikasi));
});

test('C24-UT04 tandaiDibaca id yang tidak ada mengembalikan FALSE', async () => {
  assert.equal(await Notifikasi.tandaiDibaca(2147483647, petugas.id), false);
});

test('C24-UT04b tandaiDibaca notifikasi milik pengguna lain mengembalikan FALSE', async () => {
  const [notif] = await Notifikasi.ambilBelumDibaca(petugasLain.id);
  assert.equal(await Notifikasi.tandaiDibaca(notif.idNotifikasi, petugas.id), false);
  assert.equal((await Notifikasi.ambilBelumDibaca(petugasLain.id)).length, 1);
});