import * as RelawanLapangan from '../models/RelawanLapangan.js';
import * as PetakLahan from '../models/PetakLahan.js';
import * as JadwalPekerjaan from '../models/JadwalPekerjaan.js';
import * as Notifikasi from '../models/Notifikasi.js';

const BATAS_TUGAS_AKTIF = 3; // KF06
const BATAS_REKOMENDASI = 5; // KF17
// Kode galat PostgreSQL saat data ditolak: foreign key, CHECK, teks terlalu panjang,
// format tanggal salah, dan tanggal di luar rentang (Algo-004)
const GALAT_DATA_TIDAK_VALID = ['23503', '23514', '22001', '22007', '22008'];
const PESAN_GALAT_SERVER = 'Terjadi kesalahan di server';

function buatRekomendasi() {
  return PetakLahan.ambilRekomendasi(BATAS_REKOMENDASI);
}

// TRUE jika relawan masih punya kurang dari 3 tugas aktif
export async function validasiKapasitas(idRelawan, db) {
  const jumlah = await RelawanLapangan.hitungTugasAktif(idRelawan, db);
  return jumlah < BATAS_TUGAS_AKTIF;
}

// Jadwal sudah tersimpan, jadi kegagalan notifikasi cukup dicatat agar petugas tidak menyimpan ulang (KF07)
async function kirimNotifikasiTugas(idRelawan, idJadwal) {
  try {
    await Notifikasi.buat(idRelawan, `Tugas baru #${idJadwal} sudah ditugaskan kepada Anda`);
  } catch (err) {
    console.error('Gagal membuat notifikasi tugas:', err.message);
  }
}

function idValid(id) {
  return Number.isInteger(id) && id > 0;
}

function isianLengkap(dataJadwal) {
  const { idRelawan, idPetak, jenisPekerjaan, tanggal } = dataJadwal;
  return idValid(idRelawan) && idValid(idPetak)
    && typeof jenisPekerjaan === 'string' && jenisPekerjaan !== ''
    && typeof tanggal === 'string' && tanggal !== '';
}

// GET /api/jadwal/form (KF05, KF17)
export async function bukaFormJadwal(req, res) {
  try {
    const daftarRelawan = await RelawanLapangan.ambilRelawanAktif();
    const rekomendasi = await buatRekomendasi();
    const daftarPetak = await PetakLahan.ambilSemua();
    res.json({ daftarRelawan, rekomendasi, daftarPetak });
  } catch (err) {
    console.error('Gagal memuat formulir jadwal:', err.message);
    res.status(500).json({ pesan: PESAN_GALAT_SERVER });
  }
}

// POST /api/jadwal (Algo-004)
export async function buatJadwal(req, res) {
  const dataJadwal = req.body ?? {};
  if (!isianLengkap(dataJadwal)) {
    return res.status(400).json({ pesan: 'Semua isian jadwal wajib diisi' });
  }

  try {
    if (!(await validasiKapasitas(dataJadwal.idRelawan))) {
      return res.status(409).json({ pesan: 'Relawan sudah memiliki 3 tugas aktif' });
    }
    const jadwal = await JadwalPekerjaan.simpan(dataJadwal);
    await kirimNotifikasiTugas(dataJadwal.idRelawan, jadwal.idJadwal);
    res.status(201).json(jadwal);
  } catch (err) {
    if (GALAT_DATA_TIDAK_VALID.includes(err.code)) {
      return res.status(400).json({ pesan: 'Data jadwal tidak valid' });
    }
    console.error('Gagal menyimpan jadwal:', err.message);
    res.status(500).json({ pesan: PESAN_GALAT_SERVER });
  }
}
