import * as DialogTandaiKeliru from './DialogTandaiKeliru.js';

const JENIS = {
  'patroli': 'Patroli pencegahan',
  'pembasahan sekat kanal': 'Pembasahan sekat kanal',
  'pengecekan titik panas': 'Pengecekan titik panas'
};
const STATUS = {
  'ditugaskan': 'Ditugaskan',
  'menunggu verifikasi': 'Menunggu verifikasi',
  'dibatalkan': 'Dibatalkan'
};
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const IKON_JAM = '<svg class="ikon" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>';
const IKON_PANAH = '<svg class="ikon panah" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>';

const el = (id) => document.getElementById(id);
const penangan = {};
let tugasTerbuka = null;

export function pasangPenangan(daftar) {
  Object.assign(penangan, daftar);
}

// format
function jam(waktu) {
  return `${String(waktu.getHours()).padStart(2, '0')}.${String(waktu.getMinutes()).padStart(2, '0')}`;
}

function formatWaktu(waktu) {
  const w = new Date(waktu);
  const hariIni = new Date();
  const kemarin = new Date(hariIni.getFullYear(), hariIni.getMonth(), hariIni.getDate() - 1);
  if (w.toDateString() === hariIni.toDateString()) return `Hari ini, ${jam(w)}`;
  if (w.toDateString() === kemarin.toDateString()) return `Kemarin, ${jam(w)}`;
  return `${w.getDate()} ${BULAN[w.getMonth()]}, ${jam(w)}`;
}

function formatTanggal(teks) {
  const [t, b, h] = teks.split('-').map(Number);
  const tanggal = new Date(t, b - 1, h);
  return `${HARI[tanggal.getDay()]}, ${h} ${BULAN[b - 1]} ${t}`;
}

function formatTitikTengah({ latMin, latMaks, lngMin, lngMaks }) {
  const lat = (latMin + latMaks) / 2;
  const lng = (lngMin + lngMaks) / 2;
  const angka = (n) => Math.abs(n).toFixed(4).replace('.', ',');
  return `${angka(lat)}° ${lat < 0 ? 'LS' : 'LU'}, ${angka(lng)}° ${lng < 0 ? 'BB' : 'BT'}`;
}

function lencana(tugas, kelasTambahan = '') {
  const span = document.createElement('span');
  span.className = `lencana ${tugas.tingkatRisiko} ${kelasTambahan}`;
  span.textContent = Math.round(tugas.skorRisiko);
  return span;
}

// navigasi antarlayar
function bukaLayar(nama) {
  for (const layar of document.querySelectorAll('[data-layar]')) {
    layar.hidden = layar.dataset.layar !== nama;
  }
  el('tab-bar').hidden = nama === 'detail';
  for (const tab of document.querySelectorAll('.tab')) {
    tab.setAttribute('aria-selected', String(tab.dataset.ke === nama));
  }
  window.scrollTo(0, 0);
}

// operasi C12
export function tampilkanDaftarTugas(daftarTugas) {
  const daftar = el('daftar-tugas');
  daftar.replaceChildren();
  for (const tugas of daftarTugas) {
    const tombol = document.createElement('button');
    tombol.type = 'button';
    tombol.className = 'baris-tugas';
    tombol.append(lencana(tugas));

    const isi = document.createElement('span');
    isi.className = 'isi';
    const judul = document.createElement('strong');
    judul.textContent = JENIS[tugas.jenisPekerjaan];
    const petak = document.createElement('span');
    petak.textContent = `Petak ${tugas.idPetak}, risiko ${tugas.tingkatRisiko}`;
    const status = document.createElement('span');
    if (tugas.status === 'menunggu verifikasi') {
      status.className = 'status-tunggu';
      status.innerHTML = IKON_JAM;
    }
    status.append(STATUS[tugas.status]);
    isi.append(judul, petak, status);

    tombol.append(isi);
    tombol.insertAdjacentHTML('beforeend', IKON_PANAH);
    tombol.addEventListener('click', () => tampilkanDetailTugas(tugas));

    const li = document.createElement('li');
    li.append(tombol);
    daftar.append(li);
  }
  el('jumlah-tugas').textContent = `${daftarTugas.length} tugas aktif, risiko tertinggi paling atas`;
  el('isi-daftar').hidden = false;
  el('belum-ada-tugas').hidden = true;
  el('pesan-luring').hidden = true;
}

export function tampilkanBelumAdaTugas() {
  el('isi-daftar').hidden = true;
  el('belum-ada-tugas').hidden = false;
  el('pesan-luring').hidden = true;
}

export function tampilkanWaktuSinkron(waktuSinkron) {
  el('waktu-sinkron').textContent = waktuSinkron
    ? `Tersinkron ${formatWaktu(waktuSinkron)}`
    : 'Daftar tugas belum pernah tersinkron';
}

export function tampilkanPenandaLuring(waktuSinkron) {
  tampilkanWaktuSinkron(waktuSinkron);
  el('pesan-luring').hidden = false;
}

export function tampilkanDetailTugas(tugas) {
  tugasTerbuka = tugas;
  const dibatalkan = tugas.status === 'dibatalkan';

  el('detail-lencana').replaceChildren(lencana(tugas, 'besar'));
  el('detail-jenis').textContent = JENIS[tugas.jenisPekerjaan];
  el('detail-risiko').textContent = `Risiko ${tugas.tingkatRisiko}, skor ${Math.round(tugas.skorRisiko)}`;
  el('detail-petak').textContent = tugas.idPetak;
  el('detail-tanggal').textContent = formatTanggal(tugas.tanggal);
  el('detail-status').textContent = STATUS[tugas.status];
  el('detail-titik').textContent = formatTitikTengah(tugas.batasWilayah);

  el('kartu-dibatalkan').hidden = !dibatalkan;
  if (dibatalkan) {
    el('dibatalkan-alasan').textContent = `Alasan: ${tugas.alasanPembatalan}`;
    el('dibatalkan-waktu').textContent = formatWaktu(tugas.waktuDibatalkan);
  }

  el('tombol-buat-laporan').hidden = tugas.status !== 'ditugaskan';
  el('tombol-batalkan').hidden = tugas.status !== 'ditugaskan';
  el('tombol-kembali-daftar').hidden = !dibatalkan;
  tampilkanTombolTandaiKeliru(tugas, dibatalkan);

  tutupFormPembatalan();
  DialogTandaiKeliru.tutupForm();
  bukaLayar('detail');
}

// I05-16 hanya untuk tugas pengecekan titik panas yang punya idTitikPanas (KF14, UC06)
function tampilkanTombolTandaiKeliru(tugas, dibatalkan) {
  const tombol = el('tombol-tandai-keliru');
  tombol.hidden = dibatalkan || tugas.jenisPekerjaan !== 'pengecekan titik panas' || !tugas.idTitikPanas;
  tombol.disabled = false;
  tombol.textContent = 'Tandai keliru';
  el('kartu-keliru').hidden = true;
}

export function tampilkanFormPembatalan() {
  el('pesan-gagal-batal').hidden = true;
  el('lembar-batal').hidden = false;
  el('alasan').focus();
  perbaruiTombolKirim();
}

export function tampilkanPesanGagal(pesan) {
  el('pesan-gagal-batal').querySelector('span').textContent = pesan;
  el('pesan-gagal-batal').hidden = false;
  el('tombol-kirim-batal').disabled = false;
  el('tombol-kirim-batal').textContent = 'Kirim pembatalan';
}

export function tampilkanNotifikasi(daftarNotifikasi) {
  const daftar = el('daftar-notifikasi');
  daftar.replaceChildren();
  for (const notif of daftarNotifikasi) {
    const tombol = document.createElement('button');
    tombol.type = 'button';
    tombol.className = 'baris-notif baru';
    tombol.innerHTML = `<span class="isi"><span class="tanda-baru">Baru</span><strong></strong><span class="teks-catatan"></span></span>${IKON_PANAH}`;
    tombol.querySelector('strong').textContent = notif.isiPesan;
    tombol.querySelector('.teks-catatan').textContent = formatWaktu(notif.waktuDibuat);
    tombol.addEventListener('click', () => {
      if (!tombol.classList.contains('baru')) return;
      tombol.classList.remove('baru');
      perbaruiLencanaNotifikasi(document.querySelectorAll('.baris-notif.baru').length);
      penangan.bacaNotifikasi?.(notif.idNotifikasi);
    });
    const li = document.createElement('li');
    li.append(tombol);
    daftar.append(li);
  }
  el('notif-kosong').hidden = daftarNotifikasi.length > 0;
  perbaruiLencanaNotifikasi(daftarNotifikasi.length);
}

function perbaruiLencanaNotifikasi(jumlah) {
  el('lencana-notif').textContent = jumlah;
  el('lencana-notif').hidden = jumlah === 0;
  el('jumlah-belum-dibaca').textContent = `${jumlah} belum dibaca`;
}

// form pembatalan
function tutupFormPembatalan() {
  el('lembar-batal').hidden = true;
  el('alasan').value = '';
  el('tombol-kirim-batal').textContent = 'Kirim pembatalan';
}

function perbaruiTombolKirim() {
  el('tombol-kirim-batal').disabled = el('alasan').value.trim() === '';
}

export function tampilkanHasilSinkron({ terkirim, ditolak }) {
  const kalimat = [];
  if (terkirim.length > 0) kalimat.push(`${terkirim.length} laporan tertunda sudah terkirim.`);
  for (const { laporan, pesan } of ditolak) kalimat.push(`Laporan tugas #${laporan.idJadwal} ditolak server: ${pesan}.`);
  el('pesan-sinkron').textContent = kalimat.join(' ');
  el('pesan-sinkron').hidden = kalimat.length === 0;
}

el('tombol-buat-laporan').addEventListener('click', () => {
  location.href = `/relawan/laporan.html?jadwal=${tugasTerbuka.idJadwal}`;
});
el('tombol-batalkan').addEventListener('click', tampilkanFormPembatalan);
el('tombol-tandai-keliru').addEventListener('click', () => DialogTandaiKeliru.tampilkanForm(tugasTerbuka));
el('tombol-tutup-batal').addEventListener('click', tutupFormPembatalan);
el('latar-lembar').addEventListener('click', tutupFormPembatalan);
el('alasan').addEventListener('input', perbaruiTombolKirim);
el('form-batal').addEventListener('submit', (e) => {
  e.preventDefault();
  const tombol = el('tombol-kirim-batal');
  if (tombol.disabled) return;
  tombol.disabled = true;
  tombol.textContent = 'Mengirim…';
  el('pesan-gagal-batal').hidden = true;
  penangan.batalkan?.(tugasTerbuka, el('alasan').value);
});

el('tombol-kembali').addEventListener('click', () => bukaLayar('daftar'));
el('tombol-kembali-daftar').addEventListener('click', () => bukaLayar('daftar'));
for (const tab of document.querySelectorAll('.tab')) {
  tab.addEventListener('click', () => bukaLayar(tab.dataset.ke));
}
