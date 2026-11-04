// Uji integrasi UC03 terhadap PostgreSQL sungguhan. Dilewati jika DATABASE_URL kosong.
// PERHATIAN: menjalankan seed, sehingga seluruh isi database dihapus dan diisi ulang.
// Jalankan: npm run test:db
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';

const adaDb = Boolean(process.env.DATABASE_URL);

describe('UC03 verifikasi laporan (database)', { skip: !adaDb && 'DATABASE_URL tidak diisi' }, () => {
  let pool, seed, ctrl;
  let idPetugas1, idPetugas2;

  function panggil(handler, { params = {}, body = {}, idPengguna = idPetugas1 } = {}) {
    return new Promise((resolve, reject) => {
      const res = {
        kode: 200, isi: undefined, headersSent: false, header: {},
        status(k) { this.kode = k; return this; },
        set(k, v) { this.header[k] = v; return this; },
        json(isi) { this.isi = isi; this.headersSent = true; resolve(this); return this; }
      };
      handler({ params, body, pengguna: { idPengguna, peran: 'petugas' } }, res).catch(reject);
    });
  }

  async function laporanDiPetak(idPetak) {
    const r = await pool.query(
      `SELECT l.id_laporan, l.id_jadwal, j.id_relawan FROM laporan_bukti_kerja l
       JOIN jadwal_pekerjaan j ON j.id_jadwal = l.id_jadwal WHERE j.id_petak = $1`, [idPetak]);
    return r.rows[0];
  }

  async function status(idLaporan) {
    const r = await pool.query(
      `SELECT l.status AS laporan, l.alasan_penolakan, l.id_petugas_verifikasi, l.waktu_verifikasi, j.status AS tugas
       FROM laporan_bukti_kerja l JOIN jadwal_pekerjaan j ON j.id_jadwal = l.id_jadwal WHERE l.id_laporan = $1`, [idLaporan]);
    return r.rows[0];
  }

  async function notifikasi(idPengguna) {
    const r = await pool.query('SELECT isi_pesan FROM notifikasi WHERE id_pengguna = $1 ORDER BY id_notifikasi', [idPengguna]);
    return r.rows.map((b) => b.isi_pesan);
  }

  before(async () => {
    ({ default: pool } = await import('../db.js'));
    ({ seed } = await import('../sql/seed.js'));
    ctrl = await import('../controllers/VerifikasiLaporanController.js');
    const log = console.log;
    console.log = () => {};
    await seed();
    console.log = log;
    const p = await pool.query("SELECT id_pengguna FROM pengguna WHERE peran = 'petugas' ORDER BY id_pengguna");
    [idPetugas1, idPetugas2] = p.rows.map((b) => b.id_pengguna);
  });

  after(async () => {
    await pool?.end();
  });

  test('GET antrean: laporan menunggu verifikasi, terlama di atas, tanpa foto (KF08)', async () => {
    const res = await panggil(ctrl.ambilAntrean);
    assert.equal(res.kode, 200);
    assert.equal(res.isi.jumlah, 4);
    assert.deepEqual(res.isi.daftarLaporan.map((l) => l.idPetak), [187, 209, 221, 214]);
    assert.equal(res.isi.daftarLaporan[0].namaRelawan, 'Arga Simanjuntak');
    assert.equal(res.isi.daftarLaporan[0].jenisPekerjaan, 'patroli');
    assert.ok(res.isi.daftarLaporan.every((l) => !('foto' in l)));
    assert.equal(res.header['Cache-Control'], 'no-store');
  });

  test('GET detail: foto, petak, dan jarak; peringatan bila > 200 m (KF09, I-04b)', async () => {
    const l187 = await laporanDiPetak(187);
    const luar = await panggil(ctrl.ambilDetailLaporan, { params: { id: l187.id_laporan } });
    assert.equal(luar.kode, 200);
    assert.ok(Math.abs(luar.isi.jarak - 340) <= 5);
    assert.equal(luar.isi.melebihiBatas, true);
    assert.equal(luar.isi.petak.idPetak, 187);
    assert.match(luar.isi.laporan.foto, /^data:image\/jpeg;base64,/);
    assert.ok(luar.isi.laporan.ukuranFoto > 0);
    assert.equal(luar.isi.laporan.tanggalTugas, '2026-10-25');
    assert.equal(luar.isi.laporan.namaRelawan, 'Arga Simanjuntak');

    const l214 = await laporanDiPetak(214);
    const dalam = await panggil(ctrl.ambilDetailLaporan, { params: { id: l214.id_laporan } });
    assert.equal(dalam.isi.jarak, 0);
    assert.equal(dalam.isi.melebihiBatas, false);
  });

  test('GET detail: id tidak dikenal atau bukan UUID dibalas 404', async () => {
    assert.equal((await panggil(ctrl.ambilDetailLaporan, { params: { id: 'bukan-uuid' } })).kode, 404);
    assert.equal((await panggil(ctrl.ambilDetailLaporan, { params: { id: crypto.randomUUID() } })).kode, 404);
    assert.equal((await panggil(ctrl.verifikasiLaporan, { params: { id: crypto.randomUUID() } })).kode, 404);
  });

  test('POST setujui: laporan terverifikasi, tugas selesai, relawan dinotifikasi (Algo-006)', async () => {
    const l = await laporanDiPetak(214);
    const sebelum = (await notifikasi(l.id_relawan)).length;
    const res = await panggil(ctrl.verifikasiLaporan, { params: { id: l.id_laporan } });
    assert.equal(res.kode, 200);
    assert.equal(res.isi.pesan, 'Laporan disetujui');

    const s = await status(l.id_laporan);
    assert.equal(s.laporan, 'terverifikasi');
    assert.equal(s.tugas, 'selesai');
    assert.equal(s.id_petugas_verifikasi, idPetugas1);
    assert.ok(s.waktu_verifikasi);

    const pesan = await notifikasi(l.id_relawan);
    assert.equal(pesan.length, sebelum + 1);
    assert.equal(pesan.at(-1), `Laporan untuk tugas #${l.id_jadwal} disetujui petugas posko. Tugas dinyatakan selesai.`);
  });

  test('laporan yang sudah diproses dibalas 409 tanpa notifikasi tambahan (KF10, I-04f)', async () => {
    const l = await laporanDiPetak(214);
    const sebelum = (await notifikasi(l.id_relawan)).length;
    const lagi = await panggil(ctrl.verifikasiLaporan, { params: { id: l.id_laporan }, idPengguna: idPetugas2 });
    assert.equal(lagi.kode, 409);
    assert.equal(lagi.isi.pesan, 'Laporan sudah diproses');
    const tolak = await panggil(ctrl.tolakLaporan, { params: { id: l.id_laporan }, body: { alasan: 'Foto buram' } });
    assert.equal(tolak.kode, 409);
    assert.equal((await status(l.id_laporan)).laporan, 'terverifikasi');
    assert.equal((await notifikasi(l.id_relawan)).length, sebelum);
  });

  test('POST tolak: alasan kosong, spasi, atau > 300 karakter dibalas 400 tanpa mengubah data', async () => {
    const l = await laporanDiPetak(209);
    for (const body of [{}, { alasan: '' }, { alasan: '    ' }, { alasan: 'x'.repeat(301) }, { alasan: 42 }]) {
      const res = await panggil(ctrl.tolakLaporan, { params: { id: l.id_laporan }, body });
      assert.equal(res.kode, 400, JSON.stringify(body));
    }
    assert.equal((await status(l.id_laporan)).laporan, 'menunggu verifikasi');
  });

  test('POST tolak: laporan ditolak, tugas kembali ditugaskan, alasan dikirim ke relawan', async () => {
    const l = await laporanDiPetak(209);
    const res = await panggil(ctrl.tolakLaporan, {
      params: { id: l.id_laporan },
      body: { alasan: '  Foto diambil di tepi jalan desa. Ambil ulang foto dari dalam petak.  ' }
    });
    assert.equal(res.kode, 200);
    const s = await status(l.id_laporan);
    assert.equal(s.laporan, 'ditolak');
    assert.equal(s.tugas, 'ditugaskan');
    assert.equal(s.alasan_penolakan, 'Foto diambil di tepi jalan desa. Ambil ulang foto dari dalam petak.');
    assert.equal(s.id_petugas_verifikasi, idPetugas1);
    const pesan = (await notifikasi(l.id_relawan)).at(-1);
    assert.match(pesan, new RegExp(`^Laporan untuk tugas #${l.id_jadwal} ditolak`));
    assert.match(pesan, /Alasan: Foto diambil di tepi jalan desa\. Ambil ulang foto dari dalam petak\. Silakan unggah ulang/);
  });

  test('dua petugas menyetujui bersamaan: tepat satu 200 dan satu 409', async () => {
    const l = await laporanDiPetak(221);
    const sebelum = (await notifikasi(l.id_relawan)).length;
    const hasil = await Promise.all([
      panggil(ctrl.verifikasiLaporan, { params: { id: l.id_laporan }, idPengguna: idPetugas1 }),
      panggil(ctrl.tolakLaporan, { params: { id: l.id_laporan }, body: { alasan: 'Kurang jelas' }, idPengguna: idPetugas2 })
    ]);
    assert.deepEqual(hasil.map((r) => r.kode).sort(), [200, 409]);
    assert.equal((await notifikasi(l.id_relawan)).length, sebelum + 1);
  });

  test('ROLLBACK: jika status tugas gagal diubah, persetujuan laporan dibatalkan', async () => {
    const l = await laporanDiPetak(187);
    await pool.query("UPDATE jadwal_pekerjaan SET status = 'dibatalkan' WHERE id_jadwal = $1", [l.id_jadwal]);
    const sebelum = (await notifikasi(l.id_relawan)).length;

    const res = await panggil(ctrl.verifikasiLaporan, { params: { id: l.id_laporan } });
    assert.equal(res.kode, 409);
    const s = await status(l.id_laporan);
    assert.equal(s.laporan, 'menunggu verifikasi');
    assert.equal(s.id_petugas_verifikasi, null);
    assert.equal(s.tugas, 'dibatalkan');
    assert.equal((await notifikasi(l.id_relawan)).length, sebelum);

    await pool.query("UPDATE jadwal_pekerjaan SET status = 'menunggu verifikasi' WHERE id_jadwal = $1", [l.id_jadwal]);
  });

  test('antrean hanya menyisakan laporan yang belum diputuskan', async () => {
    const res = await panggil(ctrl.ambilAntrean);
    assert.deepEqual(res.isi.daftarLaporan.map((l) => l.idPetak), [187]);
  });
});
