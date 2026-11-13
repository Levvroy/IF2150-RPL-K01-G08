import pool from '../db.js';
import * as LaporanBuktiKerja from '../models/LaporanBuktiKerja.js';
import * as JadwalPekerjaan from '../models/JadwalPekerjaan.js';
import * as PetakLahan from '../models/PetakLahan.js';
import * as Notifikasi from '../models/Notifikasi.js';

// C10. Semua endpoint dipasang di belakang cekLogin + cekPeran('petugas') (KNF05)

export const BATAS_JARAK_METER = 200;
export const PANJANG_MAKS_ALASAN = 300;
// Kolom id_laporan bertipe UUID. Postgres melempar galat 22P02 untuk teks yang bukan UUID,
// sehingga tanpa pemeriksaan ini id asal-asalan dibalas 500, padahal seharusnya 404.
export const POLA_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PESAN_TIDAK_DITEMUKAN = 'Laporan tidak ditemukan';
const PESAN_SUDAH_DIPROSES = 'Laporan sudah diproses';
const PESAN_GALAT_SERVER = 'Terjadi kesalahan di server';

// Algo-005: jarak (meter) dari koordinat unggahan ke titik terdekat pada batas petak, 0 jika di dalam
export function hitungJarak(koordinatUnggah, batasWilayah) {
  const R = 6371000;
  const latTerdekat = Math.min(Math.max(koordinatUnggah.lat, batasWilayah.latMin), batasWilayah.latMaks);
  const lngTerdekat = Math.min(Math.max(koordinatUnggah.lng, batasWilayah.lngMin), batasWilayah.lngMaks);

  if (latTerdekat === koordinatUnggah.lat && lngTerdekat === koordinatUnggah.lng) return 0;

  const radian = (derajat) => (derajat * Math.PI) / 180;
  const lat1 = radian(koordinatUnggah.lat);
  const lat2 = radian(latTerdekat);
  const selisihLat = radian(latTerdekat - koordinatUnggah.lat);
  const selisihLng = radian(lngTerdekat - koordinatUnggah.lng);

  const a = Math.sin(selisihLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(selisihLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Mengembalikan alasan yang sudah dirapikan, atau null jika tidak valid
export function validasiAlasan(alasan) {
  if (typeof alasan !== 'string') return null;
  const rapi = alasan.trim();
  if (!rapi || rapi.length > PANJANG_MAKS_ALASAN) return null;
  return rapi;
}

function idValid(idLaporan) {
  return POLA_UUID.test(idLaporan);
}

// Menjalankan `kerja(client)` dalam satu transaksi. Jika kerja mengembalikan false, transaksi
// di-ROLLBACK (Algo-006: BATALKAN TRANSAKSI); selain itu di-COMMIT. Client selalu dikembalikan ke pool.
// ROLLBACK di blok catch dibungkus .catch karena ROLLBACK sendiri bisa gagal (misalnya koneksi putus);
// tanpa itu galat ROLLBACK menimpa galat asli yang sebenarnya perlu dicatat.
export async function dalamTransaksi(kerja) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const berhasil = await kerja(client);
    await client.query(berhasil ? 'COMMIT' : 'ROLLBACK');
    return berhasil;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

// Notifikasi dikirim setelah COMMIT (Algo-006). Keputusan sudah tersimpan, jadi kegagalan
// notifikasi hanya dicatat dan tidak membatalkan respons 200.
async function kirimNotifikasi(idRelawan, isiPesan) {
  try {
    await Notifikasi.buat(idRelawan, isiPesan);
  } catch (err) {
    console.error('Gagal membuat notifikasi verifikasi:', err.message);
  }
}

// GET /api/laporan/antrean (KF08)
export async function ambilAntrean(req, res) {
  try {
    const daftarLaporan = await LaporanBuktiKerja.ambilMenungguVerifikasi();
    res.set('Cache-Control', 'no-store');
    res.json({ jumlah: daftarLaporan.length, daftarLaporan });
  } catch (err) {
    console.error('Gagal mengambil antrean laporan:', err.message);
    res.status(500).json({ pesan: PESAN_GALAT_SERVER });
  }
}

// GET /api/laporan/:id (KF08, KF09, KNF06). Foto hanya dikirim lewat endpoint terautentikasi ini
export async function ambilDetailLaporan(req, res) {
  try {
    const idLaporan = req.params.id;
    if (!idValid(idLaporan)) return res.status(404).json({ pesan: PESAN_TIDAK_DITEMUKAN });

    const laporan = await LaporanBuktiKerja.ambilById(idLaporan);
    if (!laporan) return res.status(404).json({ pesan: PESAN_TIDAK_DITEMUKAN });

    const petak = await PetakLahan.ambilById(laporan.idPetak);
    const jarak = petak ? hitungJarak(laporan.koordinatUnggah, petak.batasWilayah) : null;
    const { foto, ...dataLaporan } = laporan;

    res.set('Cache-Control', 'no-store');
    res.json({
      // Foto selalu JPEG karena dikompres lewat canvas.toBlob() pada kompresFoto() (C15)
      laporan: { ...dataLaporan, foto: `data:image/jpeg;base64,${foto.toString('base64')}`, ukuranFoto: foto.length },
      petak,
      jarak,
      batasJarak: BATAS_JARAK_METER,
      melebihiBatas: jarak !== null && jarak > BATAS_JARAK_METER
    });
  } catch (err) {
    console.error('Gagal mengambil detail laporan:', err.message);
    res.status(500).json({ pesan: PESAN_GALAT_SERVER });
  }
}

// POST /api/laporan/:id/setujui (KF10, KF24, Algo-006)
export async function verifikasiLaporan(req, res) {
  try {
    const idLaporan = req.params.id;
    const idPetugas = req.pengguna.idPengguna;
    if (!idValid(idLaporan)) return res.status(404).json({ pesan: PESAN_TIDAK_DITEMUKAN });

    const laporan = await LaporanBuktiKerja.ambilById(idLaporan);
    if (!laporan) return res.status(404).json({ pesan: PESAN_TIDAK_DITEMUKAN });
    if (laporan.status !== 'menunggu verifikasi') return res.status(409).json({ pesan: PESAN_SUDAH_DIPROSES });

    const berhasil = await dalamTransaksi(async (client) => {
      const disetujui = await LaporanBuktiKerja.setujui(idLaporan, idPetugas, client);
      return disetujui && JadwalPekerjaan.perbaruiStatus(laporan.idJadwal, 'selesai', 'menunggu verifikasi', null, client);
    });
    if (!berhasil) return res.status(409).json({ pesan: PESAN_SUDAH_DIPROSES });

    const isiPesan = `Laporan untuk tugas #${laporan.idJadwal} disetujui petugas posko. Tugas dinyatakan selesai.`;
    await kirimNotifikasi(laporan.idRelawan, isiPesan);
    res.json({ pesan: 'Laporan disetujui', idLaporan, idJadwal: laporan.idJadwal, statusTugas: 'selesai' });
  } catch (err) {
    console.error('Gagal menyetujui laporan:', err.message);
    res.status(500).json({ pesan: PESAN_GALAT_SERVER });
  }
}

// POST /api/laporan/:id/tolak (KF24, UC03 skenario alternatif 2)
export async function tolakLaporan(req, res) {
  try {
    const idLaporan = req.params.id;
    const alasan = validasiAlasan(req.body?.alasan);
    if (!alasan) {
      return res.status(400).json({ pesan: `Alasan penolakan wajib diisi, paling banyak ${PANJANG_MAKS_ALASAN} karakter` });
    }
    if (!idValid(idLaporan)) return res.status(404).json({ pesan: PESAN_TIDAK_DITEMUKAN });

    const laporan = await LaporanBuktiKerja.ambilById(idLaporan);
    if (!laporan) return res.status(404).json({ pesan: PESAN_TIDAK_DITEMUKAN });
    if (laporan.status !== 'menunggu verifikasi') return res.status(409).json({ pesan: PESAN_SUDAH_DIPROSES });

    const berhasil = await dalamTransaksi(async (client) => {
      const ditolak = await LaporanBuktiKerja.tolak(idLaporan, alasan, client);
      return ditolak && JadwalPekerjaan.perbaruiStatus(laporan.idJadwal, 'ditugaskan', 'menunggu verifikasi', null, client);
    });
    if (!berhasil) return res.status(409).json({ pesan: PESAN_SUDAH_DIPROSES });

    const isiPesan = `Laporan untuk tugas #${laporan.idJadwal} ditolak petugas posko. Alasan: ${alasan.replace(/[.!?]+$/, '')}. Silakan unggah ulang bukti kerja.`;
    await kirimNotifikasi(laporan.idRelawan, isiPesan);
    res.json({ pesan: 'Laporan ditolak', idLaporan, idJadwal: laporan.idJadwal, statusTugas: 'ditugaskan' });
  } catch (err) {
    console.error('Gagal menolak laporan:', err.message);
    res.status(500).json({ pesan: PESAN_GALAT_SERVER });
  }
}
