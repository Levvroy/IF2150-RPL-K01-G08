// C13 DaftarTugasController dengan database
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../db.js';
import { ambilTugasRelawan, batalkanTugasTidakAman, tandaiNotifikasiDibaca } from '../../controllers/DaftarTugasController.js';
import * as Notifikasi from '../../models/Notifikasi.js';
import { bersihkan, buatPengguna, buatPetak, buatJadwal, resPalsu } from '../helpers/fixture.js';

let relawan, relawanLain, petugas, tugasRendah, tugasTinggi, tugasSelesai;

before(async () => {
  await bersihkan();
  relawan = await buatPengguna('relawan', 'relawan');
  relawanLain = await buatPengguna('relawan2', 'relawan');
  petugas = await buatPengguna('petugas', 'petugas');
  const petakRendah = await buatPetak(12, 'rendah');
  const petakTinggi = await buatPetak(78, 'tinggi');
  tugasRendah = await buatJadwal(relawan.id, petakRendah);
  tugasTinggi = await buatJadwal(relawan.id, petakTinggi);
  tugasSelesai = await buatJadwal(relawan.id, petakRendah, 'selesai');
  await Notifikasi.buat(relawan.id, 'uji-setup tugas baru');
});

after(async () => {
  await bersihkan();
  await pool.end();
});

async function ambil(idPengguna) {
  const res = resPalsu();
  await ambilTugasRelawan({ pengguna: { idPengguna } }, res);
  return res;
}

async function batal(idPengguna, idJadwal) {
  const res = resPalsu();
  await batalkanTugasTidakAman({ pengguna: { idPengguna }, params: { id: String(idJadwal) }, body: { alasan: 'uji-setup asap tebal' } }, res);
  return res;
}

test('C13-UT07 daftar tugas hanya berisi tugas aktif, skor tertinggi paling atas', async () => {
  const res = await ambil(relawan.id);
  const id = res.isi.daftarTugas.map((t) => t.idJadwal);
  assert.equal(res.kode, 200);
  assert.equal(id[0], tugasTinggi);
  assert.ok(!id.includes(tugasSelesai));
  assert.equal(res.isi.daftarNotifikasi.length, 1);
});

test('C13-UT08 relawan tanpa tugas dapat daftar kosong', async () => {
  const res = await ambil(relawanLain.id);
  assert.deepEqual(res.isi.daftarTugas, []);
});

test('C13-UT09 tidak bisa membatalkan tugas milik relawan lain (409)', async () => {
  assert.equal((await batal(relawanLain.id, tugasRendah)).kode, 409);
});

test('C13-UT10 batal tugas berhasil dan petugas dapat notifikasi', async () => {
  assert.equal((await batal(relawan.id, tugasRendah)).kode, 200);
  const { rows } = await pool.query('SELECT status FROM jadwal_pekerjaan WHERE id_jadwal = $1', [tugasRendah]);
  assert.equal(rows[0].status, 'dibatalkan');
  const notif = await Notifikasi.ambilBelumDibaca(petugas.id);
  assert.equal(notif.length, 1);
});

test('C13-UT11 tugas yang sudah dibatalkan tidak bisa dibatalkan lagi (409)', async () => {
  assert.equal((await batal(relawan.id, tugasRendah)).kode, 409);
});

test('C13-UT12 tandai notifikasi dibaca, lalu notifikasinya tidak muncul lagi', async () => {
  const [notif] = await Notifikasi.ambilBelumDibaca(relawan.id);
  const res = resPalsu();
  await tandaiNotifikasiDibaca({ pengguna: { idPengguna: relawan.id }, params: { id: String(notif.idNotifikasi) } }, res);
  assert.equal(res.kode, 200);
  assert.equal((await Notifikasi.ambilBelumDibaca(relawan.id)).length, 0);
});

test('C13-UT13 tidak bisa menandai notifikasi milik orang lain (404)', async () => {
  const [notif] = await Notifikasi.ambilBelumDibaca(petugas.id);
  const res = resPalsu();
  await tandaiNotifikasiDibaca({ pengguna: { idPengguna: relawan.id }, params: { id: String(notif.idNotifikasi) } }, res);
  assert.equal(res.kode, 404);
});

test('C13-UT14 id notifikasi tidak valid ditolak 400', async () => {
  const res = resPalsu();
  await tandaiNotifikasiDibaca({ pengguna: { idPengguna: relawan.id }, params: { id: 'x' } }, res);
  assert.equal(res.kode, 400);
});
