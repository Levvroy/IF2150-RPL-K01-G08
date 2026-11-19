// C15 bagian klien: kirim laporan saat daring/luring dan sinkron otomatis.
import 'fake-indexeddb/auto';
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const token = 'h.' + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url') + '.t';
globalThis.localStorage = { getItem: () => token, setItem() {}, removeItem() {} };
globalThis.location = { replace() {} };
let online = true;
Object.defineProperty(globalThis, 'navigator', { value: { get onLine() { return online; } } });

let balasan = [];
globalThis.fetch = async () => {
  const kode = balasan.shift();
  if (!kode) throw new TypeError('Failed to fetch');
  return new Response('{}', { status: kode });
};

const C15 = await import('../public/relawan/js/UploadLaporanController.js');
const Lokal = await import('../public/relawan/js/PenyimpananLokal.js');

function laporanBaru(idJadwal) {
  return {
    ...C15.mulaiLaporan(idJadwal),
    koordinatUnggah: { lat: -0.51, lng: 101.44 },
    waktuUnggah: new Date(),
    foto: new Blob(['foto'])
  };
}

let pesan;
const tampilan = {
  tampilkanPesanTerkirim: () => pesan.push('terkirim'),
  tampilkanPesanDitolak: () => pesan.push('ditolak'),
  tampilkanPesanPenyimpananPenuh: () => pesan.push('penuh'),
  tampilkanStatusMenungguDikirim: () => pesan.push('menunggu')
};

beforeEach(async () => {
  online = true;
  balasan = [];
  pesan = [];
  for (const l of await Lokal.ambilSemua('laporanTertunda')) await Lokal.hapus('laporanTertunda', l.idLaporan);
});

test('C15-UT06 mulaiLaporan membuat UUID baru setiap kali dipanggil', () => {
  assert.notEqual(C15.mulaiLaporan(1).idLaporan, C15.mulaiLaporan(1).idLaporan);
});

test('C15-UT07 daring dan server menerima, laporan tidak disimpan di HP', async () => {
  balasan = [201];
  await C15.kirimLaporan(laporanBaru(1), tampilan);
  assert.deepEqual(pesan, ['terkirim']);
  assert.equal(await Lokal.hitung('laporanTertunda'), 0);
});

test('C15-UT08 luring, laporan disimpan di HP dan menunggu dikirim', async () => {
  online = false;
  await C15.kirimLaporan(laporanBaru(1), tampilan);
  assert.deepEqual(pesan, ['menunggu']);
  assert.equal(await Lokal.hitung('laporanTertunda'), 1);
});

test('C15-UT09 laporan ditolak server (409) tidak disimpan di HP', async () => {
  balasan = [409];
  await C15.kirimLaporan(laporanBaru(1), tampilan);
  assert.deepEqual(pesan, ['ditolak']);
  assert.equal(await Lokal.hitung('laporanTertunda'), 0);
});

test('C15-UT10 laporan ke-20 masih bisa disimpan, ke-21 ditolak karena penuh', async () => {
  online = false;
  for (let i = 0; i < 19; i++) await Lokal.simpan('laporanTertunda', null, laporanBaru(i));
  await C15.kirimLaporan(laporanBaru(20), tampilan);
  await C15.kirimLaporan(laporanBaru(21), tampilan);
  assert.deepEqual(pesan, ['menunggu', 'penuh']);
  assert.equal(await Lokal.hitung('laporanTertunda'), 20);
});

test('C15-UT11 sinkron otomatis mengirim semua laporan tertunda lalu menghapusnya dari HP', async () => {
  await Lokal.simpan('laporanTertunda', null, laporanBaru(1));
  await Lokal.simpan('laporanTertunda', null, laporanBaru(2));
  balasan = [201, 201];
  const hasil = await C15.sinkronOtomatis();
  assert.equal(hasil.terkirim.length, 2);
  assert.equal(await Lokal.hitung('laporanTertunda'), 0);
});

test('C15-UT12 koneksi putus di tengah sinkron, laporan yang belum terkirim tetap ada', async () => {
  for (let i = 0; i < 3; i++) await Lokal.simpan('laporanTertunda', null, laporanBaru(i));
  balasan = [201, null];
  await C15.sinkronOtomatis();
  assert.equal(await Lokal.hitung('laporanTertunda'), 2);
});

test('C15-UT13 saat luring sinkron tidak mengirim apa-apa', async () => {
  await Lokal.simpan('laporanTertunda', null, laporanBaru(1));
  online = false;
  const hasil = await C15.sinkronOtomatis();
  assert.equal(hasil.terkirim.length, 0);
  assert.equal(await Lokal.hitung('laporanTertunda'), 1);
});
