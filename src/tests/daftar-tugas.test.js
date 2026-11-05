import test from 'node:test';
import assert from 'node:assert/strict';
import { urutkanBerdasarkanSkorRisiko, batalkanTugasTidakAman } from '../controllers/DaftarTugasController.js';

test('urutkanBerdasarkanSkorRisiko: skor tertinggi paling atas', () => {
  const daftar = [
    { idJadwal: 1, skorRisiko: 12 },
    { idJadwal: 2, skorRisiko: 78 },
    { idJadwal: 3, skorRisiko: 46 }
  ];
  const hasil = urutkanBerdasarkanSkorRisiko(daftar);
  assert.deepEqual(hasil.map((t) => t.idJadwal), [2, 3, 1]);
  assert.deepEqual(daftar.map((t) => t.idJadwal), [1, 2, 3], 'daftar asli tidak diubah');
});

test('urutkanBerdasarkanSkorRisiko: daftar kosong tetap kosong', () => {
  assert.deepEqual(urutkanBerdasarkanSkorRisiko([]), []);
});

function panggil(handler, req) {
  const res = {
    kode: 200, isi: undefined,
    status(k) { this.kode = k; return this; },
    json(isi) { this.isi = isi; return this; }
  };
  return Promise.resolve(handler({ pengguna: { idPengguna: 3, peran: 'relawan' }, ...req }, res)).then(() => res);
}

test('batalkanTugasTidakAman: alasan kosong atau hanya spasi dibalas 400', async () => {
  for (const alasan of [undefined, '', '   ', 123]) {
    const res = await panggil(batalkanTugasTidakAman, { params: { id: '5' }, body: { alasan } });
    assert.equal(res.kode, 400);
    assert.equal(res.isi.pesan, 'Alasan pembatalan wajib diisi');
  }
});

test('batalkanTugasTidakAman: id bukan bilangan bulat positif dibalas 409 tanpa kueri', async () => {
  for (const id of ['abc', '0', '-1', '2.5']) {
    const res = await panggil(batalkanTugasTidakAman, { params: { id }, body: { alasan: 'asap pekat' } });
    assert.equal(res.kode, 409);
  }
});
