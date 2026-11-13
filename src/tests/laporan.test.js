import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { bacaLaporan, terimaFoto, terimaLaporan, BATAS_UKURAN_FOTO } from '../controllers/UploadLaporanController.js';
import { daftarPercobaanKompresi, UKURAN_MAKS_FOTO } from '../public/relawan/js/UploadLaporanController.js';

const UUID = '7f3c9a2e-1b4d-4c8e-9a6f-2d5e8b1c0a37';
const FOTO = { buffer: Buffer.from('jpeg'), size: 4 };

function body(ubah = {}) {
  return { idLaporan: UUID, idJadwal: '12', lat: '-0.5124', lng: '101.4471', waktuUnggah: '2026-10-26T07:42:00.000Z', ...ubah };
}

test('bacaLaporan mengubah isi multipart menjadi objek laporan', () => {
  const laporan = bacaLaporan(body({ idLaporan: UUID.toUpperCase() }), FOTO);
  assert.equal(laporan.idLaporan, UUID);
  assert.equal(laporan.idJadwal, 12);
  assert.deepEqual(laporan.koordinatUnggah, { lat: -0.5124, lng: 101.4471 });
  assert.equal(laporan.waktuUnggah.toISOString(), '2026-10-26T07:42:00.000Z');
  assert.equal(laporan.foto, FOTO.buffer);
});

test('bacaLaporan mengembalikan null jika ada data kosong atau tidak valid (Algo-011)', () => {
  const salah = [
    { idLaporan: undefined }, { idLaporan: 'bukan-uuid' }, { idJadwal: '' }, { idJadwal: '0' }, { idJadwal: '1.5' },
    { lat: '' }, { lng: 'abc' }, { lat: '91' }, { lng: '-181' }, { waktuUnggah: '' }, { waktuUnggah: 'kemarin' }
  ];
  for (const ubah of salah) assert.equal(bacaLaporan(body(ubah), FOTO), null, JSON.stringify(ubah));
  assert.equal(bacaLaporan(body(), undefined), null, 'tanpa foto');
  assert.equal(bacaLaporan(body(), { buffer: Buffer.alloc(0), size: 0 }), null, 'foto kosong');
  assert.equal(bacaLaporan(undefined, FOTO), null, 'tanpa body');
});

test('terimaLaporan membalas 400 untuk data tidak lengkap tanpa menyentuh database', async () => {
  const res = { kode: 0, isi: null, status(k) { this.kode = k; return this; }, json(i) { this.isi = i; return this; } };
  await terimaLaporan({ pengguna: { idPengguna: 3 }, body: body({ lat: '' }), file: FOTO }, res);
  assert.equal(res.kode, 400);
  assert.equal(res.isi.pesan, 'Data laporan tidak lengkap');
});

test('terimaFoto menolak foto lebih dari 500 KB dengan 413 (KNF09)', async (t) => {
  const app = express();
  app.post('/unggah', terimaFoto, (req, res) => res.json({ ukuran: req.file.size }));
  const server = app.listen(0);
  t.after(() => server.close());
  const alamat = `http://localhost:${server.address().port}/unggah`;

  const kirim = (ukuran) => {
    const data = new FormData();
    data.append('foto', new Blob([Buffer.alloc(ukuran)], { type: 'image/jpeg' }), 'foto.jpg');
    return fetch(alamat, { method: 'POST', body: data });
  };

  const pas = await kirim(BATAS_UKURAN_FOTO);
  assert.equal(pas.status, 200);
  assert.equal((await pas.json()).ukuran, BATAS_UKURAN_FOTO);

  const lebih = await kirim(BATAS_UKURAN_FOTO + 1);
  assert.equal(lebih.status, 413);
  assert.equal((await lebih.json()).pesan, 'Foto melebihi 500 KB');
});

test('batas ukuran foto di klien dan server sama', () => {
  assert.equal(UKURAN_MAKS_FOTO, BATAS_UKURAN_FOTO);
});

test('daftarPercobaanKompresi mengikuti urutan C15 kompresFoto dan berhenti', () => {
  const percobaan = daftarPercobaanKompresi();
  assert.deepEqual(percobaan.map((p) => `${p.sisi}@${p.kualitas}`), [
    '1280@0.8', '1280@0.7', '1280@0.6', '1280@0.5',
    '960@0.8', '960@0.7', '960@0.6', '960@0.5'
  ]);
  assert.ok(percobaan.length <= 10);
});
