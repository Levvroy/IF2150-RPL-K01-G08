import pool from '../db.js';
import * as LaporanBuktiKerja from '../models/LaporanBuktiKerja.js';
import * as JadwalPekerjaan from '../models/JadwalPekerjaan.js';
import * as PetakLahan from '../models/PetakLahan.js';
import * as Notifikasi from '../models/Notifikasi.js';

// C10. Semua endpoint dipasang di belakang cekLogin + cekPeran('petugas') (KNF05)

export const BATAS_JARAK_METER = 200;
export const PANJANG_MAKS_ALASAN = 300;
const POLA_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PESAN_TIDAK_DITEMUKAN = 'Laporan tidak ditemukan';
const PESAN_SUDAH_DIPROSES = 'Laporan sudah diproses';
const PESAN_GALAT_SERVER = 'Terjadi kesalahan di server';

class LaporanSudahDiproses extends Error {}

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

function jenisGambar(buffer) {
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return 'image/png';
  if (buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  return 'image/jpeg';
}

function idValid(idLaporan) {
  return typeof idLaporan === 'string' && POLA_UUID.test(idLaporan);
}

// Menjalankan `kerja(client)` dalam satu transaksi BEGIN/COMMIT. Jika kerja melempar galat,
// transaksi di-ROLLBACK lalu galatnya diteruskan. Client selalu dikembalikan ke pool.
async function dalamTransaksi(kerja) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const hasil = await kerja(client);
    await client.query('COMMIT');
    return hasil;
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

// Pola Algo-006 dipakai bersama oleh setujui dan tolak
async function putuskanLaporan(req, res, { ubahLaporan, statusTugasBaru, isiPesan, pesanBerhasil }) {
  const { id: idLaporan } = req.params;
  if (!idValid(idLaporan)) return res.status(404).json({ pesan: PESAN_TIDAK_DITEMUKAN });

  const laporan = await LaporanBuktiKerja.ambilById(idLaporan);
  if (!laporan) return res.status(404).json({ pesan: PESAN_TIDAK_DITEMUKAN });
  if (laporan.status !== 'menunggu verifikasi') return res.status(409).json({ pesan: PESAN_SUDAH_DIPROSES });

  try {
    await dalamTransaksi(async (client) => {
      const laporanBerubah = await ubahLaporan(client);
      const tugasBerubah = laporanBerubah &&
        await JadwalPekerjaan.perbaruiStatus(laporan.idJadwal, statusTugasBaru, 'menunggu verifikasi', null, client);
      if (!tugasBerubah) throw new LaporanSudahDiproses();
    });
  } catch (err) {
    if (err instanceof LaporanSudahDiproses) return res.status(409).json({ pesan: PESAN_SUDAH_DIPROSES });
    throw err;
  }

  await kirimNotifikasi(laporan.idRelawan, isiPesan(laporan));
  res.json({ pesan: pesanBerhasil, idLaporan, idJadwal: laporan.idJadwal, statusTugas: statusTugasBaru });
}

function tanganiGalat(nama, handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      console.error(`Gagal ${nama}:`, err.message);
      if (!res.headersSent) res.status(500).json({ pesan: PESAN_GALAT_SERVER });
    }
  };
}

// GET /api/laporan/antrean (KF08)
export const ambilAntrean = tanganiGalat('mengambil antrean laporan', async (req, res) => {
  const daftarLaporan = await LaporanBuktiKerja.ambilMenungguVerifikasi();
  res.set('Cache-Control', 'no-store');
  res.json({ jumlah: daftarLaporan.length, daftarLaporan });
});

// GET /api/laporan/:id (KF08, KF09, KNF06). Foto hanya dikirim lewat endpoint terautentikasi ini
export const ambilDetailLaporan = tanganiGalat('mengambil detail laporan', async (req, res) => {
  const { id: idLaporan } = req.params;
  if (!idValid(idLaporan)) return res.status(404).json({ pesan: PESAN_TIDAK_DITEMUKAN });

  const laporan = await LaporanBuktiKerja.ambilById(idLaporan);
  if (!laporan) return res.status(404).json({ pesan: PESAN_TIDAK_DITEMUKAN });

  const petak = await PetakLahan.ambilById(laporan.idPetak);
  const jarak = petak ? hitungJarak(laporan.koordinatUnggah, petak.batasWilayah) : null;
  const { foto, ...dataLaporan } = laporan;

  res.set('Cache-Control', 'no-store');
  res.json({
    laporan: {
      ...dataLaporan,
      foto: `data:${jenisGambar(foto)};base64,${foto.toString('base64')}`,
      ukuranFoto: foto.length
    },
    petak,
    jarak,
    batasJarak: BATAS_JARAK_METER,
    melebihiBatas: jarak !== null && jarak > BATAS_JARAK_METER
  });
});

// POST /api/laporan/:id/setujui (KF10, KF24, Algo-006)
export const verifikasiLaporan = tanganiGalat('menyetujui laporan', async (req, res) => {
  const idPetugas = req.pengguna.idPengguna;
  await putuskanLaporan(req, res, {
    ubahLaporan: (client) => LaporanBuktiKerja.setujui(req.params.id, idPetugas, client),
    statusTugasBaru: 'selesai',
    isiPesan: (l) => `Laporan untuk tugas #${l.idJadwal} disetujui petugas posko. Tugas dinyatakan selesai.`,
    pesanBerhasil: 'Laporan disetujui'
  });
});

// POST /api/laporan/:id/tolak (KF24, UC03 skenario alternatif 2)
export const tolakLaporan = tanganiGalat('menolak laporan', async (req, res) => {
  const alasan = validasiAlasan(req.body?.alasan);
  if (!alasan) {
    return res.status(400).json({ pesan: `Alasan penolakan wajib diisi, paling banyak ${PANJANG_MAKS_ALASAN} karakter` });
  }
  const idPetugas = req.pengguna.idPengguna;
  await putuskanLaporan(req, res, {
    ubahLaporan: (client) => LaporanBuktiKerja.tolak(req.params.id, alasan, idPetugas, client),
    statusTugasBaru: 'ditugaskan',
    isiPesan: (l) => `Laporan untuk tugas #${l.idJadwal} ditolak petugas posko. Alasan: ${alasan.replace(/[.!?]+$/, '')}. Silakan unggah ulang bukti kerja.`,
    pesanBerhasil: 'Laporan ditolak'
  });
});
