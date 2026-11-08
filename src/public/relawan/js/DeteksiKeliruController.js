import * as Dialog from './DialogTandaiKeliru.js';
import { ambilToken, keluar } from './AutentikasiController.js';

const PESAN_LURING = 'Penandaan butuh koneksi internet. Keterangan tetap tersimpan, kirim lagi setelah ada sinyal.';

// Bagian klien C17. Penandaan tidak disimpan di perangkat saat luring,
// karena penyimpanan luring hanya untuk laporan bukti kerja (KF12)
export async function tandaiKeliru(idTitikPanas, keterangan) {
  let respons;
  try {
    respons = await fetch(`/api/titik-panas/${idTitikPanas}/keliru`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ambilToken()}` },
      body: JSON.stringify({ keterangan })
    });
  } catch {
    Dialog.tampilkanPesanGagal(PESAN_LURING);
    return;
  }

  if (respons.status === 401) {
    keluar();
    location.replace('/relawan/login.html');
    return;
  }
  if (respons.status === 400) {
    Dialog.tampilkanPeringatanKeteranganKosong();
    return;
  }
  if (!respons.ok) {
    const data = await respons.json().catch(() => ({ pesan: 'Terjadi kesalahan di server' }));
    Dialog.tampilkanPesanGagal(data.pesan);
    return;
  }
  Dialog.tampilkanPesanBerhasil();
}

Dialog.pasangPenangan({ kirim: tandaiKeliru });
