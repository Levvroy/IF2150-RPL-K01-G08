// C09 HalamanAntreanLaporan (I-04). Seluruh data datang dari VerifikasiLaporanController di server.
import { periksaSesi, ambilPeran, ambilToken, keluar } from '/relawan/js/AutentikasiController.js';

const $ = (id) => document.getElementById(id);
const el = {
  halaman: $('halaman'), ringkasan: $('ringkasan'),
  panelKosong: $('panel-kosong'), panelGagal: $('panel-gagal'), tataLetak: $('tata-letak'),
  judulAntrean: $('judul-antrean'), daftar: $('daftar-antrean'),
  petunjuk: $('detail-petunjuk'), memuat: $('detail-memuat'), detail: $('detail'),
  berhasil: $('detail-berhasil'), berhasilJudul: $('berhasil-judul'), berhasilIsi: $('berhasil-isi'),
  foto: $('detail-foto'), skor: $('detail-skor'), judul: $('detail-judul'), sub: $('detail-sub'),
  koordinat: $('detail-koordinat'), jarak: $('detail-jarak'), tanggal: $('detail-tanggal'), ukuran: $('detail-ukuran'),
  peringatan: $('peringatan-jarak'), peringatanJudul: $('peringatan-judul'),
  pesanGagal: $('pesan-gagal'), tombolMuatUlang: $('tombol-muat-ulang'),
  aksi: $('aksi'), tombolSetujui: $('tombol-setujui'), tombolTolak: $('tombol-tolak'),
  formTolak: $('form-tolak'), alasan: $('alasan'), penghitung: $('penghitung'),
  tombolKirimTolak: $('tombol-kirim-tolak'), tombolBatal: $('tombol-batal'),
  tombolBerikutnya: $('tombol-berikutnya'), tombolCobaLagi: $('tombol-coba-lagi'), tombolKeluar: $('tombol-keluar')
};

const LABEL_JENIS = { patroli: 'patroli pencegahan' };
const ZONA = 'Asia/Jakarta';
const fmtTanggal = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: ZONA });
const fmtJam = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: ZONA });
const fmtTanggalTugas = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const fmtAngka = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 4, maximumFractionDigits: 4 });

let daftarLaporan = [];
let laporanTerbuka = null; // { laporan, petak, jarak, melebihiBatas }
let sedangMengirim = false;

// ---------- format ----------
const labelJenis = (jenis) => LABEL_JENIS[jenis] ?? jenis;
const labelPetak = (idPetak, jenis) => `Petak ${idPetak}, ${labelJenis(jenis)}`;
const formatWaktu = (iso) => {
  const w = new Date(iso);
  return `${fmtTanggal.format(w)}, ${fmtJam.format(w).replace(':', '.')}`;
};
const formatTanggalTugas = (tanggal) => fmtTanggalTugas.format(new Date(`${tanggal}T00:00:00Z`));
function formatKoordinat({ lat, lng }) {
  const ns = lat < 0 ? 'LS' : 'LU';
  const ew = lng < 0 ? 'BB' : 'BT';
  return `${fmtAngka.format(Math.abs(lat))}° ${ns}, ${fmtAngka.format(Math.abs(lng))}° ${ew}`;
}
const formatJarak = (jarak) => jarak === 0 ? '0 m, di dalam petak' : `${jarak.toLocaleString('id-ID')} m dari batas petak`;
const formatUkuran = (byte) => `${Math.max(1, Math.round(byte / 1024)).toLocaleString('id-ID')} KB, dari kamera`;

// ---------- komunikasi server ----------
async function minta(url, opsi = {}) {
  const res = await fetch(url, {
    ...opsi,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ambilToken()}`, ...opsi.headers }
  });
  if (res.status === 401) {
    keluar();
    location.href = '/petugas/login.html';
    throw new Error('Sesi berakhir');
  }
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

// ---------- tampilan antrean ----------
function aturKeadaanHalaman(keadaan) {
  el.halaman.dataset.keadaan = keadaan;
  el.panelKosong.hidden = keadaan !== 'kosong';
  el.panelGagal.hidden = keadaan !== 'gagal';
  el.tataLetak.hidden = keadaan !== 'antrean';
}

function tampilkanAntrean(daftar) {
  daftarLaporan = daftar;
  aturKeadaanHalaman('antrean');
  el.ringkasan.textContent = `${daftar.length} laporan menunggu verifikasi. Pilih laporan untuk melihat foto dan lokasinya.`;
  el.judulAntrean.textContent = `Menunggu verifikasi (${daftar.length})`;
  el.daftar.replaceChildren(...daftar.map((l) => {
    const li = document.createElement('li');
    const tombol = document.createElement('button');
    tombol.type = 'button';
    tombol.className = 'baris-antrean';
    tombol.dataset.id = l.idLaporan;
    tombol.setAttribute('aria-current', String(laporanTerbuka?.laporan.idLaporan === l.idLaporan));
    const teks = document.createElement('span');
    const nama = document.createElement('strong');
    nama.textContent = l.namaRelawan;
    const petak = document.createElement('span');
    petak.className = 'teks-sub';
    petak.textContent = labelPetak(l.idPetak, l.jenisPekerjaan);
    teks.append(nama, petak);
    const waktu = document.createElement('span');
    waktu.className = 'waktu';
    waktu.textContent = formatWaktu(l.waktuUnggah);
    tombol.append(teks, waktu);
    tombol.addEventListener('click', () => bukaLaporan(l.idLaporan));
    li.append(tombol);
    return li;
  }));
}

function tampilkanAntreanKosong() {
  daftarLaporan = [];
  aturKeadaanHalaman('kosong');
  el.ringkasan.textContent = 'Tidak ada laporan yang menunggu verifikasi.';
}

function tampilkanGagalMemuatAntrean() {
  aturKeadaanHalaman('gagal');
  el.ringkasan.textContent = 'Antrean belum bisa ditampilkan.';
}

async function ambilAntrean() {
  try {
    const { status, data } = await minta('/api/laporan/antrean');
    if (status !== 200) return tampilkanGagalMemuatAntrean();
    if (data.daftarLaporan.length === 0) tampilkanAntreanKosong();
    else tampilkanAntrean(data.daftarLaporan);
    return data.daftarLaporan;
  } catch {
    tampilkanGagalMemuatAntrean();
    return null;
  }
}

// ---------- tampilan detail ----------
function aturPanelDetail(panel) {
  el.petunjuk.hidden = panel !== 'petunjuk';
  el.memuat.hidden = panel !== 'memuat';
  el.detail.hidden = panel !== 'detail';
  el.berhasil.hidden = panel !== 'berhasil';
}

function sorotBaris(idLaporan) {
  for (const b of el.daftar.querySelectorAll('.baris-antrean')) {
    b.setAttribute('aria-current', String(b.dataset.id === idLaporan));
  }
}

function sembunyikanPesanGagal() {
  el.pesanGagal.hidden = true;
  el.tombolMuatUlang.hidden = true;
}

function tutupFormTolak() {
  el.formTolak.hidden = true;
  el.aksi.hidden = false;
  el.alasan.value = '';
  perbaruiPenghitung();
}

function tampilkanDetailLaporan({ laporan, petak }, jarak) {
  el.foto.src = laporan.foto;
  el.skor.textContent = petak ? Math.round(petak.skorRisiko) : '-';
  el.skor.className = `lencana ${petak?.tingkatRisiko ?? ''}`;
  el.judul.textContent = labelPetak(laporan.idPetak, laporan.jenisPekerjaan);
  el.sub.textContent = `${laporan.namaRelawan}, diunggah ${formatWaktu(laporan.waktuUnggah)}`;
  el.koordinat.textContent = formatKoordinat(laporan.koordinatUnggah);
  el.jarak.textContent = jarak === null ? 'Petak tidak ditemukan' : formatJarak(jarak);
  el.jarak.classList.toggle('lewat-batas', laporanTerbuka.melebihiBatas);
  el.tanggal.textContent = formatTanggalTugas(laporan.tanggalTugas);
  el.ukuran.textContent = formatUkuran(laporan.ukuranFoto);
  el.peringatan.hidden = true;
  sembunyikanPesanGagal();
  tutupFormTolak();
  aturTombolKeputusan(true);
  aturPanelDetail('detail');
}

// Tidak menonaktifkan tombol setuju/tolak: keputusan tetap di tangan petugas (KF09)
function tampilkanPeringatanJarak(jarak) {
  el.peringatanJudul.textContent = `Lokasi foto ${jarak.toLocaleString('id-ID')} m dari Petak ${laporanTerbuka.laporan.idPetak}`;
  el.peringatan.hidden = false;
}

function aturTombolKeputusan(aktif) {
  el.tombolSetujui.disabled = !aktif;
  el.tombolTolak.disabled = !aktif;
}

function tampilkanPesanGagal(pesan, { muatUlang = false } = {}) {
  el.pesanGagal.querySelector('span').textContent = pesan;
  el.pesanGagal.hidden = false;
  el.tombolMuatUlang.hidden = !muatUlang;
  if (muatUlang) {
    el.aksi.hidden = true;
    el.formTolak.hidden = true;
  }
}

function tampilkanPesanBerhasil(judul, isi) {
  el.berhasilJudul.textContent = judul;
  el.berhasilIsi.textContent = isi;
  el.tombolBerikutnya.hidden = daftarLaporan.length === 0;
  aturPanelDetail('berhasil');
}

async function bukaLaporan(idLaporan) {
  sorotBaris(idLaporan);
  el.memuat.textContent = 'Memuat detail laporan…';
  aturPanelDetail('memuat');
  try {
    const { status, data } = await minta(`/api/laporan/${encodeURIComponent(idLaporan)}`);
    if (status === 404) {
      laporanTerbuka = null;
      await ambilAntrean();
      aturPanelDetail('petunjuk');
      return;
    }
    if (status !== 200) throw new Error(data.pesan);
    laporanTerbuka = data;
    tampilkanDetailLaporan(data, data.jarak);
    if (data.melebihiBatas) tampilkanPeringatanJarak(data.jarak);
  } catch {
    el.memuat.textContent = 'Detail laporan belum bisa dimuat. Periksa koneksi lalu pilih laporan lagi.';
  }
}

// ---------- keputusan ----------
async function kirimKeputusan(aksi, body) {
  if (sedangMengirim || !laporanTerbuka) return;
  sedangMengirim = true;
  aturTombolKeputusan(false);
  el.tombolKirimTolak.disabled = true;
  sembunyikanPesanGagal();

  const { laporan } = laporanTerbuka;
  try {
    const { status, data } = await minta(`/api/laporan/${encodeURIComponent(laporan.idLaporan)}/${aksi}`, {
      method: 'POST',
      body: JSON.stringify(body ?? {})
    });

    if (status === 200) {
      laporanTerbuka = null;
      await ambilAntrean();
      const jenis = labelJenis(laporan.jenisPekerjaan);
      if (aksi === 'setujui') {
        tampilkanPesanBerhasil(
          `Laporan Petak ${laporan.idPetak} disetujui`,
          `Tugas ${jenis} di Petak ${laporan.idPetak} berstatus Selesai dan laporan terkunci. ${laporan.namaRelawan} sudah menerima notifikasi hasil verifikasi.`
        );
      } else {
        tampilkanPesanBerhasil(
          `Laporan Petak ${laporan.idPetak} ditolak`,
          `Tugas ${jenis} di Petak ${laporan.idPetak} kembali berstatus Ditugaskan. Alasan penolakan sudah dikirim ke ${laporan.namaRelawan} agar bukti kerja dapat diunggah ulang.`
        );
      }
    } else if (status === 409 || status === 404) {
      // I04-32: laporan sudah diproses petugas lain, antrean dimuat ulang agar laporan itu hilang
      tampilkanPesanGagal(
        status === 409 ? 'Laporan ini sudah diproses petugas lain. Muat ulang antrean untuk data terbaru.' : 'Laporan tidak ditemukan. Muat ulang antrean untuk data terbaru.',
        { muatUlang: true }
      );
      await ambilAntrean();
    } else if (status === 400) {
      // Isi alasan tidak dihapus
      tampilkanPesanGagal(data.pesan ?? 'Alasan penolakan belum valid.');
      aturTombolKeputusan(true);
    } else {
      tampilkanPesanGagal(data.pesan ?? 'Terjadi kesalahan di server. Coba lagi.');
      aturTombolKeputusan(true);
    }
  } catch {
    tampilkanPesanGagal('Server tidak terjangkau. Periksa koneksi laptop lalu coba lagi. Belum ada keputusan verifikasi yang berubah.');
    aturTombolKeputusan(true);
  } finally {
    sedangMengirim = false;
    perbaruiPenghitung();
  }
}

function perbaruiPenghitung() {
  el.penghitung.textContent = `${el.alasan.value.length}/300. Alasan dikirim ke relawan lewat notifikasi.`;
  el.tombolKirimTolak.disabled = sedangMengirim || el.alasan.value.trim() === '';
}

el.tombolSetujui.addEventListener('click', () => kirimKeputusan('setujui'));
el.tombolTolak.addEventListener('click', () => {
  el.aksi.hidden = true;
  el.formTolak.hidden = false;
  sembunyikanPesanGagal();
  el.alasan.focus();
});
el.tombolBatal.addEventListener('click', () => {
  tutupFormTolak();
  sembunyikanPesanGagal();
});
el.alasan.addEventListener('input', perbaruiPenghitung);
el.formTolak.addEventListener('submit', (e) => {
  e.preventDefault();
  if (el.tombolKirimTolak.disabled) return;
  kirimKeputusan('tolak', { alasan: el.alasan.value });
});
el.tombolMuatUlang.addEventListener('click', async () => {
  laporanTerbuka = null;
  aturPanelDetail('petunjuk');
  await ambilAntrean();
});
el.tombolBerikutnya.addEventListener('click', () => {
  if (daftarLaporan.length > 0) bukaLaporan(daftarLaporan[0].idLaporan);
});
el.tombolCobaLagi.addEventListener('click', ambilAntrean);
el.tombolKeluar.addEventListener('click', () => {
  keluar();
  location.href = '/petugas/login.html';
});

// ---------- mulai ----------
if (!periksaSesi() || ambilPeran() !== 'petugas') {
  location.replace('/petugas/login.html');
} else {
  ambilAntrean();
}
