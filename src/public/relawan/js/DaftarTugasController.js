import * as Halaman from './HalamanDaftarTugas.js';
import * as PenyimpananLokal from './PenyimpananLokal.js';
import { periksaSesi, ambilToken, ambilIdPengguna, keluar } from './AutentikasiController.js';

const PESAN_LURING_BATAL = 'Pembatalan butuh koneksi internet. Alasan tetap tersimpan, kirim lagi setelah ada sinyal.';

function keLogin() {
  keluar();
  location.replace('/relawan/login.html');
}

function kunciSalinan() {
  return `relawan-${ambilIdPengguna()}`;
}

function minta(alamat, opsi = {}) {
  return fetch(alamat, {
    ...opsi,
    headers: { ...opsi.headers, Authorization: `Bearer ${ambilToken()}` }
  });
}

async function simpanSalinanLokal(daftarTugas) {
  await PenyimpananLokal.simpan('salinanTugas', kunciSalinan(), { daftarTugas, waktuSinkron: new Date() });
}

async function ambilSalinanLokal() {
  return (await PenyimpananLokal.ambil('salinanTugas', kunciSalinan())) ?? null;
}

function tampilkanTugas(daftarTugas) {
  if (daftarTugas.length === 0) Halaman.tampilkanBelumAdaTugas();
  else Halaman.tampilkanDaftarTugas(daftarTugas);
}

async function tampilkanDariSalinanLokal() {
  let salinan = null;
  try {
    salinan = await ambilSalinanLokal();
  } catch (err) {
    console.error('Gagal membaca salinan lokal:', err);
  }
  tampilkanTugas(salinan ? salinan.daftarTugas : []);
  Halaman.tampilkanPenandaLuring(salinan ? salinan.waktuSinkron : null);
}

// Algo-007
export async function muatDaftarTugas() {
  if (!periksaSesi()) {
    keLogin();
    return;
  }

  let respons;
  try {
    respons = await minta('/api/tugas');
  } catch {
    await tampilkanDariSalinanLokal();
    return;
  }

  if (respons.status === 401) {
    keLogin();
    return;
  }

  if (!respons.ok) {
    await tampilkanDariSalinanLokal();
    return;
  }

  const hasil = await respons.json();
  try {
    await simpanSalinanLokal(hasil.daftarTugas);
  } catch (err) {
    console.error('Gagal menyimpan salinan lokal:', err);
  }
  tampilkanTugas(hasil.daftarTugas);
  Halaman.tampilkanWaktuSinkron(new Date());
  Halaman.tampilkanNotifikasi(hasil.daftarNotifikasi);
}

// Algo-008 bagian klien
export async function batalkanTugasTidakAman(tugas, alasan) {
  let respons;
  try {
    respons = await minta(`/api/tugas/${tugas.idJadwal}/batal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alasan })
    });
  } catch {
    Halaman.tampilkanPesanGagal(PESAN_LURING_BATAL);
    return;
  }

  if (respons.status === 401) {
    keLogin();
    return;
  }
  const data = await respons.json().catch(() => ({ pesan: 'Terjadi kesalahan di server' }));
  if (!respons.ok) {
    Halaman.tampilkanPesanGagal(data.pesan);
    return;
  }

  Halaman.tampilkanDetailTugas({ ...tugas, status: 'dibatalkan', alasanPembatalan: alasan.trim(), waktuDibatalkan: new Date() });
  await muatDaftarTugas();
}

export async function tandaiNotifikasiDibaca(idNotifikasi) {
  try {
    const respons = await minta(`/api/notifikasi/${idNotifikasi}/baca`, { method: 'POST' });
    if (respons.status === 401) keLogin();
  } catch {
    // Luring: biarkan tetap belum dibaca, akan muncul lagi saat sinkron berikutnya
  }
}

Halaman.pasangPenangan({
  batalkan: batalkanTugasTidakAman,
  bacaNotifikasi: tandaiNotifikasiDibaca
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/relawan/sw.js');
}

muatDaftarTugas();
