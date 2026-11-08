import * as TitikPanas from '../models/TitikPanas.js';

const PANJANG_MAKS_KETERANGAN = 200;

// TRUE jika keterangan berisi 1 sampai 200 karakter setelah spasi di tepi dibuang.
// Keterangan berisi spasi saja dianggap kosong (UC06 alternatif 1)
export function validasiKeterangan(keterangan) {
  if (typeof keterangan !== 'string') return false;
  const rapi = keterangan.trim();
  return rapi.length >= 1 && rapi.length <= PANJANG_MAKS_KETERANGAN;
}

// PATCH /api/titik-panas/:id/keliru (KF14, KF15). Peran relawan dicek di server.js
export async function tandaiKeliru(req, res) {
  const keterangan = req.body?.keterangan;
  if (!validasiKeterangan(keterangan)) {
    return res.status(400).json({ pesan: 'Keterangan wajib diisi, maksimal 200 karakter' });
  }

  const idTitikPanas = Number(req.params.id);
  if (!Number.isInteger(idTitikPanas) || idTitikPanas <= 0) {
    return res.status(404).json({ pesan: 'Titik panas tidak ditemukan' });
  }

  try {
    const berhasil = await TitikPanas.tandaiKeliru(idTitikPanas, keterangan.trim());
    if (!berhasil) {
      return res.status(404).json({ pesan: 'Titik panas tidak ditemukan' });
    }
    res.json({ pesan: 'Titik panas ditandai keliru' });
  } catch (err) {
    console.error('Gagal menandai titik panas keliru:', err.message);
    res.status(500).json({ pesan: 'Terjadi kesalahan di server' });
  }
}
