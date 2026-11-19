// C10 VerifikasiLaporanController dengan database nyata: antrean, detail + jarak (Algo-005),
// setujui dan tolak dalam satu transaksi (Algo-006), serta penanganan galat.
import { test, before, after, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pool from '../../db.js';
import {
  ambilAntrean,
  ambilDetailLaporan,
  verifikasiLaporan,
  tolakLaporan,
  dalamTransaksi,
  BATAS_JARAK_METER
} from '../../controllers/VerifikasiLaporanController.js';
import * as Notifikasi from '../../models/Notifikasi.js';
import { bersihkan, buatPengguna, buatPetak } from '../helpers/fixture.js';
import { buatLaporan, utaraPetak, resUji } from '../helpers/laporan.js';

let relawan, petugas, petugasLain, petak;

before(async () => {
  await bersihkan();
  relawan = await buatPengguna('relawan', 'relawan');
  petugas = await buatPengguna('petugas', 'petugas');
  petugasLain = await buatPengguna('petugas2', 'petugas');
  petak = await buatPetak(70, 'tinggi');
});

afterEach(() => mock.restoreAll());

after(async () => {
  await bersihkan();
  await pool.end();
});

function req(idLaporan, { body, idPetugas = petugas.id } = {}) {
  return { params: { id: idLaporan }, body, pengguna: { idPengguna: idPetugas, peran: 'petugas' } };
}

async function panggil(fungsi, permintaan) {
  const res = resUji();
  await fungsi(permintaan, res);
  return res;
}

async function barisLaporan(idLaporan) {
  const { rows } = await pool.query('SELECT status, alasan_penolakan, id_petugas_verifikasi, waktu_verifikasi FROM laporan_bukti_kerja WHERE id_laporan = $1', [idLaporan]);
  return rows[0];
}

async function statusJadwal(idJadwal) {
  const { rows } = await pool.query('SELECT status FROM jadwal_pekerjaan WHERE id_jadwal = $1', [idJadwal]);
  return rows[0].status;
}

// Membuat pool.query gagal hanya untuk SQL yang memuat `potongan`, sisanya tetap ke database
function gagalkanQuery(potongan) {
  const asli = pool.query.bind(pool);
  mock.method(pool, 'query', (sql, ...sisa) => {
    if (String(sql).includes(potongan)) return Promise.reject(new Error('galat uji'));
    return asli(sql, ...sisa);
  });
  mock.method(console, 'error', () => {});
}

// Menjalankan `selaan` tepat setelah SQL yang memuat `potongan` selesai, sebelum hasilnya dipakai.
// Dipakai untuk meniru keputusan lain yang masuk di antara pengecekan status dan transaksi.
function selaSetelahQuery(potongan, selaan) {
  const asli = pool.query.bind(pool);
  let sudah = false;
  mock.method(pool, 'query', async (sql, ...sisa) => {
    const hasil = await asli(sql, ...sisa);
    if (!sudah && String(sql).includes(potongan)) {
      sudah = true;
      await selaan(asli);
    }
    return hasil;
  });
}

// ambilAntrean
test('C10-UT14 ambilAntrean: laporan menunggu tampil urut dari unggahan terlama, tanpa foto', async () => {
  const baru = await buatLaporan(relawan.id, petak, { waktuUnggah: new Date('2026-11-18T03:00:00Z') });
  const lama = await buatLaporan(relawan.id, petak, { waktuUnggah: new Date('2026-11-18T01:00:00Z') });
  const res = await panggil(ambilAntrean, req());
  const id = res.isi.daftarLaporan.map((l) => l.idLaporan);

  assert.equal(res.kode, 200);
  assert.equal(res.isi.jumlah, res.isi.daftarLaporan.length);
  assert.ok(id.indexOf(lama.idLaporan) < id.indexOf(baru.idLaporan));
  assert.equal('foto' in res.isi.daftarLaporan[0], false);
});

test('C10-UT15 ambilAntrean: laporan yang sudah disetujui atau ditolak tidak masuk antrean', async () => {
  const disetujui = await buatLaporan(relawan.id, petak);
  const ditolak = await buatLaporan(relawan.id, petak);
  await panggil(verifikasiLaporan, req(disetujui.idLaporan));
  await panggil(tolakLaporan, req(ditolak.idLaporan, { body: { alasan: 'uji-setup foto buram' } }));

  const id = (await panggil(ambilAntrean, req())).isi.daftarLaporan.map((l) => l.idLaporan);
  assert.equal(id.includes(disetujui.idLaporan), false);
  assert.equal(id.includes(ditolak.idLaporan), false);
});

test('C10-UT16 ambilAntrean: database gagal dibalas 500', async () => {
  gagalkanQuery('laporan_bukti_kerja');
  assert.equal((await panggil(ambilAntrean, req())).kode, 500);
});

// ambilDetailLaporan
test('C10-UT17 ambilDetailLaporan: laporan di dalam petak berjarak 0 dan foto dikirim sebagai data URL', async () => {
  const laporan = await buatLaporan(relawan.id, petak);
  const res = await panggil(ambilDetailLaporan, req(laporan.idLaporan));

  assert.equal(res.kode, 200);
  assert.equal(res.isi.jarak, 0);
  assert.equal(res.isi.melebihiBatas, false);
  assert.equal(res.isi.batasJarak, BATAS_JARAK_METER);
  assert.equal(res.isi.petak.idPetak, petak);
  assert.equal(res.isi.laporan.foto, 'data:image/jpeg;base64,' + laporan.foto.toString('base64'));
  assert.equal(res.isi.laporan.ukuranFoto, laporan.foto.length);
});

test('C10-UT18 ambilDetailLaporan: 200 m dari batas petak tidak ditandai, 201 m ditandai', async () => {
  const pas = await buatLaporan(relawan.id, petak, { koordinat: utaraPetak(200) });
  const lewat = await buatLaporan(relawan.id, petak, { koordinat: utaraPetak(201) });
  const resPas = await panggil(ambilDetailLaporan, req(pas.idLaporan));
  const resLewat = await panggil(ambilDetailLaporan, req(lewat.idLaporan));

  assert.deepEqual([resPas.isi.jarak, resPas.isi.melebihiBatas], [200, false]);
  assert.deepEqual([resLewat.isi.jarak, resLewat.isi.melebihiBatas], [201, true]);
});

test('C10-UT19 ambilDetailLaporan: UUID valid yang tidak ada dibalas 404', async () => {
  assert.equal((await panggil(ambilDetailLaporan, req(randomUUID()))).kode, 404);
});

test('C10-UT20 ambilDetailLaporan: database gagal dibalas 500', async () => {
  gagalkanQuery('laporan_bukti_kerja');
  assert.equal((await panggil(ambilDetailLaporan, req(randomUUID()))).kode, 500);
});

// verifikasiLaporan
test('C10-UT21 verifikasiLaporan: laporan dikunci, tugas selesai, relawan dapat notifikasi', async () => {
  const laporan = await buatLaporan(relawan.id, petak);
  const res = await panggil(verifikasiLaporan, req(laporan.idLaporan));
  const baris = await barisLaporan(laporan.idLaporan);

  assert.equal(res.kode, 200);
  assert.equal(res.isi.statusTugas, 'selesai');
  assert.equal(baris.status, 'terverifikasi');
  assert.equal(baris.id_petugas_verifikasi, petugas.id);
  assert.ok(baris.waktu_verifikasi instanceof Date);
  assert.equal(await statusJadwal(laporan.idJadwal), 'selesai');
  const notif = await Notifikasi.ambilBelumDibaca(relawan.id);
  assert.ok(notif.some((n) => n.isiPesan.includes(`tugas #${laporan.idJadwal} disetujui`)));
});

test('C10-UT22 verifikasiLaporan: laporan yang sudah diputuskan dibalas 409 dan tidak berubah (KF10)', async () => {
  const laporan = await buatLaporan(relawan.id, petak);
  await panggil(tolakLaporan, req(laporan.idLaporan, { body: { alasan: 'uji-setup foto buram' } }));
  const res = await panggil(verifikasiLaporan, req(laporan.idLaporan));

  assert.equal(res.kode, 409);
  assert.equal((await barisLaporan(laporan.idLaporan)).status, 'ditolak');
});

test('C10-UT23 verifikasiLaporan: UUID valid yang tidak ada dibalas 404', async () => {
  assert.equal((await panggil(verifikasiLaporan, req(randomUUID()))).kode, 404);
});

test('C10-UT24 verifikasiLaporan: dua petugas menyetujui bersamaan, hanya satu yang berhasil', async () => {
  const laporan = await buatLaporan(relawan.id, petak);
  const hasil = await Promise.all([
    panggil(verifikasiLaporan, req(laporan.idLaporan)),
    panggil(verifikasiLaporan, req(laporan.idLaporan, { idPetugas: petugasLain.id }))
  ]);

  assert.deepEqual(hasil.map((r) => r.kode).sort(), [200, 409]);
  const pemenang = hasil[0].kode === 200 ? petugas.id : petugasLain.id;
  assert.equal((await barisLaporan(laporan.idLaporan)).id_petugas_verifikasi, pemenang);
});

test('C10-UT25 verifikasiLaporan: notifikasi gagal dibuat, keputusan tetap tersimpan dan dibalas 200', async () => {
  const laporan = await buatLaporan(relawan.id, petak);
  gagalkanQuery('INSERT INTO notifikasi');
  const res = await panggil(verifikasiLaporan, req(laporan.idLaporan));

  assert.equal(res.kode, 200);
  assert.equal((await barisLaporan(laporan.idLaporan)).status, 'terverifikasi');
});

test('C10-UT26 verifikasiLaporan: database gagal dibalas 500', async () => {
  gagalkanQuery('laporan_bukti_kerja');
  assert.equal((await panggil(verifikasiLaporan, req(randomUUID()))).kode, 500);
});

// tolakLaporan
test('C10-UT27 tolakLaporan: alasan tersimpan, tugas kembali ditugaskan, relawan dapat notifikasi', async () => {
  const laporan = await buatLaporan(relawan.id, petak);
  const res = await panggil(tolakLaporan, req(laporan.idLaporan, { body: { alasan: '  Foto buram, uji-setup.  ' } }));
  const baris = await barisLaporan(laporan.idLaporan);

  assert.equal(res.kode, 200);
  assert.equal(res.isi.statusTugas, 'ditugaskan');
  assert.equal(baris.status, 'ditolak');
  assert.equal(baris.alasan_penolakan, 'Foto buram, uji-setup.');
  assert.equal(await statusJadwal(laporan.idJadwal), 'ditugaskan');
  const notif = await Notifikasi.ambilBelumDibaca(relawan.id);
  assert.ok(notif.some((n) => n.isiPesan.includes('Alasan: Foto buram, uji-setup. Silakan unggah ulang')));
});

test('C10-UT28 tolakLaporan: alasan tepat 300 karakter diterima dan tersimpan utuh', async () => {
  const laporan = await buatLaporan(relawan.id, petak);
  const alasan = 'a'.repeat(300);
  const res = await panggil(tolakLaporan, req(laporan.idLaporan, { body: { alasan } }));

  assert.equal(res.kode, 200);
  assert.equal((await barisLaporan(laporan.idLaporan)).alasan_penolakan, alasan);
});

test('C10-UT29 tolakLaporan: laporan yang sudah disetujui dibalas 409 dan tetap terverifikasi', async () => {
  const laporan = await buatLaporan(relawan.id, petak);
  await panggil(verifikasiLaporan, req(laporan.idLaporan));
  const res = await panggil(tolakLaporan, req(laporan.idLaporan, { body: { alasan: 'uji-setup terlambat' } }));

  assert.equal(res.kode, 409);
  assert.equal((await barisLaporan(laporan.idLaporan)).status, 'terverifikasi');
});

test('C10-UT30 tolakLaporan: UUID valid yang tidak ada dibalas 404', async () => {
  const res = await panggil(tolakLaporan, req(randomUUID(), { body: { alasan: 'uji-setup' } }));
  assert.equal(res.kode, 404);
});

test('C10-UT31 tolakLaporan: dua petugas memutuskan bersamaan, hanya satu yang berhasil', async () => {
  const laporan = await buatLaporan(relawan.id, petak);
  const hasil = await Promise.all([
    panggil(tolakLaporan, req(laporan.idLaporan, { body: { alasan: 'uji-setup buram' } })),
    panggil(verifikasiLaporan, req(laporan.idLaporan, { idPetugas: petugasLain.id }))
  ]);

  assert.deepEqual(hasil.map((r) => r.kode).sort(), [200, 409]);
});

test('C10-UT32 tolakLaporan: database gagal dibalas 500', async () => {
  gagalkanQuery('laporan_bukti_kerja');
  const res = await panggil(tolakLaporan, req(randomUUID(), { body: { alasan: 'uji-setup' } }));
  assert.equal(res.kode, 500);
});

// dalamTransaksi (Algo-006)
test('C10-UT33 dalamTransaksi: kerja mengembalikan false, semua perubahan di-ROLLBACK', async () => {
  const laporan = await buatLaporan(relawan.id, petak);
  const hasil = await dalamTransaksi(async (client) => {
    await client.query(`UPDATE laporan_bukti_kerja SET status = 'terverifikasi' WHERE id_laporan = $1`, [laporan.idLaporan]);
    return false;
  });

  assert.equal(hasil, false);
  assert.equal((await barisLaporan(laporan.idLaporan)).status, 'menunggu verifikasi');
});

test('C10-UT34 dalamTransaksi: kerja melempar galat, perubahan di-ROLLBACK dan galat diteruskan', async () => {
  const laporan = await buatLaporan(relawan.id, petak);
  await assert.rejects(
    dalamTransaksi(async (client) => {
      await client.query(`UPDATE laporan_bukti_kerja SET status = 'ditolak' WHERE id_laporan = $1`, [laporan.idLaporan]);
      throw new Error('galat di tengah transaksi');
    }),
    /galat di tengah transaksi/
  );

  assert.equal((await barisLaporan(laporan.idLaporan)).status, 'menunggu verifikasi');
  assert.equal(pool.totalCount, pool.idleCount, 'client harus dikembalikan ke pool');
});

// tolakLaporan: keputusan lain masuk di antara pengecekan status dan transaksi
test('C10-UT35 tolakLaporan: laporan disetujui petugas lain setelah dicek, transaksi dibalas 409 dan alasan tidak tersimpan', async () => {
  const laporan = await buatLaporan(relawan.id, petak);
  selaSetelahQuery('nama_relawan', (query) =>
    query(`UPDATE laporan_bukti_kerja SET status = 'terverifikasi', id_petugas_verifikasi = $2, waktu_verifikasi = NOW() WHERE id_laporan = $1`, [laporan.idLaporan, petugasLain.id])
  );
  const res = await panggil(tolakLaporan, req(laporan.idLaporan, { body: { alasan: 'uji-setup terlambat' } }));

  assert.equal(res.kode, 409);
  const baris = await barisLaporan(laporan.idLaporan);
  assert.equal(baris.status, 'terverifikasi');
  assert.equal(baris.alasan_penolakan, null);
  assert.equal(baris.id_petugas_verifikasi, petugasLain.id);
});

test('C10-UT36 tolakLaporan: status tugas sudah berubah setelah dicek, penolakan di-ROLLBACK dan dibalas 409', async () => {
  const laporan = await buatLaporan(relawan.id, petak);
  selaSetelahQuery('nama_relawan', (query) =>
    query(`UPDATE jadwal_pekerjaan SET status = 'ditugaskan' WHERE id_jadwal = $1`, [laporan.idJadwal])
  );
  const res = await panggil(tolakLaporan, req(laporan.idLaporan, { body: { alasan: 'uji-setup terlambat' } }));

  assert.equal(res.kode, 409);
  const baris = await barisLaporan(laporan.idLaporan);
  assert.equal(baris.status, 'menunggu verifikasi');
  assert.equal(baris.alasan_penolakan, null);
});
