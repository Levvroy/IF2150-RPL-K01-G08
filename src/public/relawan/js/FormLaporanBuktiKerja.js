import * as PenyimpananLokal from './PenyimpananLokal.js';
import { periksaSesi, ambilIdPengguna, keluar } from './AutentikasiController.js';
import { mulaiLaporan, kompresFoto, kirimLaporan, sinkronOtomatis, adaLaporanTertunda } from './UploadLaporanController.js';

// Layar I-06 (laporan.html?jadwal=<idJadwal>)
const JENIS = {
  'patroli': 'Patroli pencegahan',
  'pembasahan sekat kanal': 'Pembasahan sekat kanal',
  'pengecekan titik panas': 'Pengecekan titik panas'
};
const IKON_CENTANG = '<svg class="ikon hijau" width="30" height="30" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>';
const IKON_JAM = '<svg class="ikon" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>';

const el = (id) => document.getElementById(id);
let tugas = null;
let laporan = null; // {idLaporan, idJadwal, foto, koordinatUnggah, waktuUnggah}

function jam(waktu) {
  return `${String(waktu.getHours()).padStart(2, '0')}.${String(waktu.getMinutes()).padStart(2, '0')}`;
}

function formatKoordinat({ lat, lng }) {
  const angka = (n) => Math.abs(n).toFixed(4).replace('.', ',');
  return `${angka(lat)}° ${lat < 0 ? 'LS' : 'LU'}, ${angka(lng)}° ${lng < 0 ? 'BB' : 'BT'}`;
}

function bukaLayar(nama) {
  for (const layar of document.querySelectorAll('[data-layar]')) {
    layar.hidden = layar.dataset.layar !== nama;
  }
  window.scrollTo(0, 0);
}

function perbaruiTombolKirim() {
  const lengkap = laporan.foto && laporan.koordinatUnggah;
  el('tombol-kirim').disabled = !lengkap;
  el('info-foto').textContent = lengkap
    ? `Foto dikompres menjadi ${Math.round(laporan.foto.size / 1024)} KB. ID laporan ${laporan.idLaporan.slice(0, 8)}.`
    : 'Tombol kirim aktif setelah lokasi dan foto terisi.';
}

// operasi C14
export function tampilkanForm(uuid, koordinat) {
  el('judul-tugas').textContent = `${JENIS[tugas.jenisPekerjaan]} di Petak ${tugas.idPetak}`;
  el('lokasi-memuat').hidden = true;
  el('lokasi-mati').hidden = true;
  el('lokasi-ada').hidden = false;
  el('teks-koordinat').textContent = formatKoordinat(koordinat);
  el('teks-waktu-lokasi').textContent = `Diambil otomatis pukul ${jam(new Date())}`;
  laporan.idLaporan = uuid;
  laporan.koordinatUnggah = koordinat;
  perbaruiTombolKirim();
  bukaLayar('form');
}

export function ambilFoto() {
  const input = el('input-foto');
  input.value = '';
  return new Promise((resolve) => {
    input.onchange = () => resolve(input.files[0] ?? null);
    input.oncancel = () => resolve(null);
    input.click();
  });
}

export function ambilKoordinatGPS() {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (posisi) => resolve({ lat: posisi.coords.latitude, lng: posisi.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

export function tampilkanPeringatanGPS() {
  el('judul-tugas').textContent = `${JENIS[tugas.jenisPekerjaan]} di Petak ${tugas.idPetak}`;
  el('lokasi-memuat').hidden = true;
  el('lokasi-ada').hidden = true;
  el('lokasi-mati').hidden = false;
  laporan.koordinatUnggah = null;
  perbaruiTombolKirim();
  bukaLayar('form');
}

function tampilkanRingkasan(data) {
  el('ringkasan-foto').src = URL.createObjectURL(data.foto);
  el('ringkasan-petak').textContent = `Petak ${tugas.idPetak}`;
  el('ringkasan-jenis').textContent = JENIS[tugas.jenisPekerjaan];
  el('ringkasan-koordinat').textContent = formatKoordinat(data.koordinatUnggah);
  el('ringkasan-dibuat').textContent = `Dibuat ${jam(new Date(data.waktuUnggah))}, ${Math.round(data.foto.size / 1024)} KB`;
}

function tampilkanHasil({ judul, ikon = '', sub = '', kelasPesan = '', pesanJudul = '', pesanIsi = '' }) {
  el('hasil-judul').className = ikon ? 'teks-judul judul-ikon' : 'teks-judul';
  el('hasil-judul').innerHTML = ikon;
  el('hasil-judul').append(judul);
  el('hasil-sub').textContent = sub;
  el('hasil-pesan').hidden = !pesanJudul;
  el('hasil-pesan').className = `kartu ${kelasPesan}`;
  el('hasil-pesan-judul').textContent = pesanJudul;
  el('hasil-pesan-isi').textContent = pesanIsi;
  tampilkanRingkasan(laporan);
  bukaLayar('hasil');
}

export function tampilkanPesanTerkirim(otomatis = false) {
  const statusTugas = 'Status tugas sekarang Menunggu verifikasi.';
  tampilkanHasil({
    judul: otomatis ? 'Terkirim otomatis' : 'Terkirim',
    ikon: IKON_CENTANG,
    sub: otomatis
      ? `Sinyal kembali pukul ${jam(new Date())}, laporan yang tersimpan di perangkat langsung terkirim. ${statusTugas}`
      : `${statusTugas} Hasil verifikasi petugas akan muncul di notifikasi.`
  });
}

export function tampilkanStatusMenungguDikirim() {
  tampilkanHasil({
    judul: 'Tersimpan',
    sub: 'Laporan belum terkirim karena perangkat luring.',
    kelasPesan: 'tunggu',
    pesanJudul: 'Menunggu dikirim',
    pesanIsi: 'Terkirim otomatis saat sinyal kembali.'
  });
  el('hasil-pesan-judul').insertAdjacentHTML('afterbegin', IKON_JAM);
}

export function tampilkanPesanPenyimpananPenuh() {
  el('pesan-penuh').hidden = false;
  el('tombol-kirim').disabled = false;
  el('tombol-kirim').textContent = 'Coba kirim lagi';
  bukaLayar('form');
}

export function tampilkanPesanDitolak(pesan) {
  tampilkanHasil({
    judul: 'Tidak terkirim',
    sub: 'Server menolak laporan ini, jadi laporan tidak disimpan untuk dikirim ulang.',
    kelasPesan: 'ditolak',
    pesanJudul: pesan,
    pesanIsi: `Laporan untuk Petak ${tugas.idPetak} tidak perlu dikirim ulang. Periksa status tugas di daftar tugas.`
  });
}

// alur halaman
async function cobaAmbilLokasi() {
  el('lokasi-memuat').hidden = false;
  el('lokasi-mati').hidden = true;
  const koordinat = await ambilKoordinatGPS();
  if (koordinat) tampilkanForm(laporan.idLaporan, koordinat);
  else tampilkanPeringatanGPS();
}

async function prosesFoto() {
  const berkas = await ambilFoto();
  if (!berkas) return;
  el('info-foto').textContent = 'Mengompres foto…';
  const foto = await kompresFoto(berkas).catch(() => null);
  if (!foto) {
    el('info-foto').textContent = 'Foto tidak bisa dikompres sampai 500 KB. Coba ambil ulang foto.';
    return;
  }
  laporan.foto = foto;
  el('pratinjau-foto').src = URL.createObjectURL(foto);
  el('pratinjau-foto').hidden = false;
  el('foto-kosong').hidden = true;
  el('tombol-ulang-foto').hidden = false;
  perbaruiTombolKirim();
}

async function kirim() {
  el('tombol-kirim').disabled = true;
  el('tombol-kirim').textContent = 'Mengirim…';
  el('pesan-penuh').hidden = true;
  laporan.waktuUnggah ??= new Date();
  await kirimLaporan(laporan, { tampilkanPesanTerkirim, tampilkanPesanDitolak, tampilkanStatusMenungguDikirim, tampilkanPesanPenyimpananPenuh });
}

async function sinkronDiHalaman() {
  const hasil = await sinkronOtomatis();
  if (!laporan?.idLaporan) return;
  if (hasil.terkirim.some((l) => l.idLaporan === laporan.idLaporan)) tampilkanPesanTerkirim(true);
  const ditolak = hasil.ditolak.find((d) => d.laporan.idLaporan === laporan.idLaporan);
  if (ditolak) tampilkanPesanDitolak(ditolak.pesan);
}

async function mulai() {
  if (!periksaSesi()) {
    keluar();
    location.replace('/relawan/login.html');
    return;
  }

  const idJadwal = Number(new URLSearchParams(location.search).get('jadwal'));
  const salinan = await PenyimpananLokal.ambil('salinanTugas', `relawan-${ambilIdPengguna()}`).catch(() => null);
  tugas = salinan?.daftarTugas.find((t) => t.idJadwal === idJadwal && t.status === 'ditugaskan') ?? null;
  if (!tugas) {
    bukaLayar('tidak-ada');
    return;
  }

  const tertunda = await adaLaporanTertunda(idJadwal).catch(() => null);
  if (tertunda) {
    laporan = tertunda;
    tampilkanStatusMenungguDikirim();
  } else {
    laporan = { ...mulaiLaporan(idJadwal), foto: null, koordinatUnggah: null, waktuUnggah: null };
    bukaLayar('form');
    await cobaAmbilLokasi();
  }

  window.addEventListener('online', sinkronDiHalaman);
  await sinkronDiHalaman();
}

el('tombol-coba-lokasi').addEventListener('click', cobaAmbilLokasi);
el('tombol-ambil-foto').addEventListener('click', prosesFoto);
el('tombol-ulang-foto').addEventListener('click', prosesFoto);
el('tombol-kirim').addEventListener('click', kirim);

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/relawan/sw.js');
}

mulai();
