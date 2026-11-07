import * as PenyimpananLokal from './PenyimpananLokal.js';
import { periksaSesi, ambilToken, keluar } from './AutentikasiController.js';

const BATAS_LAPORAN_TERTUNDA = 20;
export const UKURAN_MAKS_FOTO = 500*1024;
const STORE = 'laporanTertunda';

function keLogin() {
  keluar();
  location.replace('/relawan/login.html');
}

function generateUUID() {
  return crypto.randomUUID();
}

function deteksiKoneksi() {
  return navigator.onLine;
}

function hitungLaporanTertunda() {
  return PenyimpananLokal.hitung(STORE);
}

function simpanLokal(laporan) {
  return PenyimpananLokal.simpan(STORE, null, laporan);
}

export function mulaiLaporan(idJadwal) {
  return { idLaporan: generateUUID(), idJadwal };
}

export function daftarPercobaanKompresi() {
  const percobaan = [];
  for (const sisi of [1280, 960]) {
    for (let kualitas = 8; kualitas >= 5; kualitas--) {
      percobaan.push({ sisi, kualitas: kualitas / 10 });
    }
  }
  return percobaan.slice(0, 10);
}

function keBlob(canvas, kualitas) {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', kualitas));
}

export async function kompresFoto(foto) {
  const gambar = await createImageBitmap(foto);
  const canvas = document.createElement('canvas');
  let hasil = null;
  for (const { sisi, kualitas } of daftarPercobaanKompresi()) {
    const skala = Math.min(1, sisi / Math.max(gambar.width, gambar.height));
    canvas.width = Math.round(gambar.width * skala);
    canvas.height = Math.round(gambar.height * skala);
    canvas.getContext('2d').drawImage(gambar, 0, 0, canvas.width, canvas.height);
    hasil = await keBlob(canvas, kualitas);
    if (hasil && hasil.size <= UKURAN_MAKS_FOTO) break;
  }
  gambar.close();
  return hasil && hasil.size <= UKURAN_MAKS_FOTO ? hasil : null;
}

async function kirimKeServer(laporan) {
  const data = new FormData();
  data.append('idLaporan', laporan.idLaporan);
  data.append('idJadwal', laporan.idJadwal);
  data.append('lat', laporan.koordinatUnggah.lat);
  data.append('lng', laporan.koordinatUnggah.lng);
  data.append('waktuUnggah', laporan.waktuUnggah.toISOString());
  data.append('foto', laporan.foto, `${laporan.idLaporan}.jpg`);
  try {
    return await fetch('/api/laporan', {
      method: 'POST',
      headers: { Authorization: `Bearer ${ambilToken()}` },
      body: data
    });
  } catch {
    return null;
  }
}

async function bacaPesan(respons) {
  const data = await respons.json().catch(() => ({}));
  return data.pesan || 'Server menolak laporan ini';
}

function diterima(respons) {
  return respons.status === 200 || respons.status === 201;
}

function ditolakPermanen(respons) {
  return [400, 409, 413].includes(respons.status);
}

export async function kirimLaporan(laporan, tampilan) {
  const respons = deteksiKoneksi() ? await kirimKeServer(laporan) : null;

  if (respons && diterima(respons)) {
    tampilan.tampilkanPesanTerkirim();
    return;
  }
  if (respons && ditolakPermanen(respons)) {
    tampilan.tampilkanPesanDitolak(await bacaPesan(respons));
    return;
  }

  try {
    if ((await hitungLaporanTertunda()) >= BATAS_LAPORAN_TERTUNDA) {
      tampilan.tampilkanPesanPenyimpananPenuh();
      return;
    }
    await simpanLokal(laporan);
    tampilan.tampilkanStatusMenungguDikirim();
  } catch (err) {
    console.error('Gagal menyimpan laporan di perangkat:', err);
    tampilan.tampilkanPesanPenyimpananPenuh();
    return;
  }

  if (respons && respons.status === 401) keLogin();
}

let sedangSinkron = false;

export async function sinkronOtomatis() {
  const hasil = { terkirim: [], ditolak: [] };
  if (sedangSinkron || !deteksiKoneksi() || !periksaSesi()) return hasil;
  sedangSinkron = true;
  try {
    const daftarLaporan = await PenyimpananLokal.ambilSemua(STORE);
    for (const laporan of daftarLaporan) {
      const respons = await kirimKeServer(laporan);
      if (!respons) break;
      if (diterima(respons)) {
        await PenyimpananLokal.hapus(STORE, laporan.idLaporan);
        hasil.terkirim.push(laporan);
      } else if (ditolakPermanen(respons)) {
        await PenyimpananLokal.hapus(STORE, laporan.idLaporan);
        hasil.ditolak.push({ laporan, pesan: await bacaPesan(respons) });
      } else if (respons.status === 401) {
        keLogin();
        break;
      }
    }
  } catch (err) {
    console.error('Sinkronisasi laporan gagal:', err);
  } finally {
    sedangSinkron = false;
  }
  return hasil;
}

export async function adaLaporanTertunda(idJadwal) {
  const semua = await PenyimpananLokal.ambilSemua(STORE);
  return semua.find((l) => l.idJadwal === idJadwal) ?? null;
}
