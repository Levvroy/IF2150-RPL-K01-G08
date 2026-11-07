import multer from 'multer';
import * as LaporanBuktiKerja from '../models/LaporanBuktiKerja.js';
import * as JadwalPekerjaan from '../models/JadwalPekerjaan.js';
import { POLA_UUID, dalamTransaksi } from './VerifikasiLaporanController.js';

export const BATAS_UKURAN_FOTO = 500*1024;

const PESAN_TIDAK_LENGKAP = 'Data laporan tidak lengkap';
const PESAN_SUDAH_DITERIMA = 'Laporan sudah pernah diterima';
const PESAN_TUGAS_TIDAK_BISA = 'Tugas tidak dapat menerima laporan';
const PESAN_GALAT_SERVER = 'Terjadi kesalahan di server';

const unggahFoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: BATAS_UKURAN_FOTO, files: 1 }
}).single('foto');

export function terimaFoto(req, res, next) {
  unggahFoto(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ pesan: 'Foto melebihi 500 KB' });
    }
    return res.status(400).json({ pesan: PESAN_TIDAK_LENGKAP });
  });
}

export function bacaLaporan(body, file) {
  if (!body || !file || file.size === 0) return null;
  const idJadwal = Number(body.idJadwal);
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  const waktuUnggah = new Date(body.waktuUnggah);

  if (!POLA_UUID.test(body.idLaporan ?? '')) return null;
  if (!Number.isInteger(idJadwal) || idJadwal <= 0) return null;
  if (body.lat === '' || body.lng === '' || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  if (!body.waktuUnggah || Number.isNaN(waktuUnggah.getTime())) return null;

  return {
    idLaporan: body.idLaporan.toLowerCase(),
    idJadwal,
    foto: file.buffer,
    koordinatUnggah: { lat, lng },
    waktuUnggah
  };
}

// POST /api/laporan (Algo-011, KF13, KNF03)
export async function terimaLaporan(req, res) {
  const idRelawan = req.pengguna.idPengguna;
  const laporan = bacaLaporan(req.body, req.file);
  if (!laporan) return res.status(400).json({ pesan: PESAN_TIDAK_LENGKAP });
  const { idLaporan, idJadwal } = laporan;

  try {
    if (await LaporanBuktiKerja.cekUUIDAda(idLaporan)) {
      return res.status(200).json({ pesan: PESAN_SUDAH_DITERIMA, idLaporan });
    }

    const berhasil = await dalamTransaksi(async (client) => {
      const berubah = await JadwalPekerjaan.perbaruiStatus(idJadwal, 'menunggu verifikasi', 'ditugaskan', idRelawan, client);
      if (!berubah) return false;
      await LaporanBuktiKerja.simpan(laporan, client);
      return true;
    });

    if (!berhasil) {
      if (await LaporanBuktiKerja.cekUUIDAda(idLaporan)) {
        return res.status(200).json({ pesan: PESAN_SUDAH_DITERIMA, idLaporan });
      }
      return res.status(409).json({ pesan: PESAN_TUGAS_TIDAK_BISA });
    }
    res.status(201).json({ pesan: 'Laporan diterima', idLaporan, idJadwal, statusTugas: 'menunggu verifikasi' });
  } catch (err) {
    // 23505 = pelanggaran PRIMARY KEY id_laporan
    if (err.code === '23505') {
      return res.status(200).json({ pesan: PESAN_SUDAH_DITERIMA, idLaporan });
    }
    console.error('Gagal menerima laporan:', err.message);
    res.status(500).json({ pesan: PESAN_GALAT_SERVER });
  }
}
