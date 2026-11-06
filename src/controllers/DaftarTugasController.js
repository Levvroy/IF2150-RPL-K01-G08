import * as JadwalPekerjaan from '../models/JadwalPekerjaan.js';
import * as PetakLahan from '../models/PetakLahan.js';
import * as Notifikasi from '../models/Notifikasi.js';
import { ambilByPeran } from '../models/Pengguna.js';
import { validasiAlasan } from './VerifikasiLaporanController.js';

const PESAN_GALAT_SERVER = 'Terjadi kesalahan di server';

export function urutkanBerdasarkanSkorRisiko(daftarTugas) {
  return [...daftarTugas].sort((a, b) => b.skorRisiko - a.skorRisiko);
}

async function kirimNotifikasiPetugas(isiPesan) {
  try {
    const daftarPetugas = await ambilByPeran('petugas');
    for (const petugas of daftarPetugas) {
      await Notifikasi.buat(petugas.idPengguna, isiPesan);
    }
  } catch (err) {
    console.error('Gagal membuat notifikasi pembatalan:', err.message);
  }
}

function idValid(id) {
  return Number.isInteger(id) && id > 0;
}

// GET /api/tugas
export async function ambilTugasRelawan(req, res) {
  const idRelawan = req.pengguna.idPengguna;
  try {
    const daftarTugas = await JadwalPekerjaan.ambilAktifByRelawan(idRelawan);
    for (const tugas of daftarTugas) {
      const petak = await PetakLahan.ambilById(tugas.idPetak);
      tugas.skorRisiko = petak.skorRisiko;
      tugas.tingkatRisiko = petak.tingkatRisiko;
      tugas.batasWilayah = petak.batasWilayah;
    }
    const daftarNotifikasi = await Notifikasi.ambilBelumDibaca(idRelawan);
    res.json({ daftarTugas: urutkanBerdasarkanSkorRisiko(daftarTugas), daftarNotifikasi });
  } catch (err) {
    console.error('Gagal mengambil daftar tugas:', err.message);
    res.status(500).json({ pesan: PESAN_GALAT_SERVER });
  }
}

// POST /api/tugas/:id/batal
export async function batalkanTugasTidakAman(req, res) {
  const idRelawan = req.pengguna.idPengguna;
  const idJadwal = Number(req.params.id);
  const alasan = validasiAlasan(req.body?.alasan);
  if (!alasan) {
    return res.status(400).json({ pesan: 'Alasan pembatalan wajib diisi' });
  }
  if (!idValid(idJadwal)) {
    return res.status(409).json({ pesan: 'Tugas tidak dapat dibatalkan' });
  }

  try {
    const berhasil = await JadwalPekerjaan.batalkan(idJadwal, alasan, idRelawan);
    if (!berhasil) {
      return res.status(409).json({ pesan: 'Tugas tidak dapat dibatalkan' });
    }
  } catch (err) {
    console.error('Gagal membatalkan tugas:', err.message);
    return res.status(500).json({ pesan: PESAN_GALAT_SERVER });
  }

  await kirimNotifikasiPetugas(`Tugas #${idJadwal} dibatalkan relawan karena kondisi tidak aman. Alasan: ${alasan}`);
  res.json({ pesan: 'Tugas dibatalkan' });
}

// POST /api/notifikasi/:id/baca
export async function tandaiNotifikasiDibaca(req, res) {
  const idNotifikasi = Number(req.params.id);
  if (!idValid(idNotifikasi)) {
    return res.status(400).json({ pesan: 'Notifikasi tidak valid' });
  }
  try {
    await Notifikasi.tandaiDibaca(idNotifikasi, req.pengguna.idPengguna);
    res.json({ pesan: 'Notifikasi ditandai dibaca' });
  } catch (err) {
    console.error('Gagal menandai notifikasi:', err.message);
    res.status(500).json({ pesan: PESAN_GALAT_SERVER });
  }
}
