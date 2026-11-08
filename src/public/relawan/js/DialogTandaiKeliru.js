// C16 DialogTandaiKeliru (I-07)
const PANJANG_MAKS = 200;

const el = (id) => document.getElementById(id);
const penangan = {};
// idTitikPanas yang sudah berhasil ditandai dari layar ini, supaya tombolnya jadi "Sudah ditandai" (I07-10)
const sudahDitandai = new Set();
let idTitikPanasTerbuka = null;

export function pasangPenangan(daftar) {
  Object.assign(penangan, daftar);
}

export function isSudahDitandai(idTitikPanas) {
  return sudahDitandai.has(idTitikPanas);
}

// operasi C16
export function tampilkanForm(tugas) {
  idTitikPanasTerbuka = tugas.idTitikPanas;
  el('keliru-akibat').textContent =
    `Titik panas di Petak ${tugas.idPetak} tidak dihitung dalam skor risiko Petak ${tugas.idPetak} selama 24 jam, kecuali ada deteksi baru dalam radius 500 m.`;
  el('keterangan-keliru').value = '';
  perbaruiPenghitung();
  sembunyikanPesan();
  aktifkanTombolKirim();
  el('lembar-keliru').hidden = false;
  el('keterangan-keliru').focus();
}

export function tampilkanPeringatanKeteranganKosong() {
  tampilkanPesan('Keterangan wajib diisi. Tulis apa yang terlihat di lokasi.');
}

export function tampilkanPesanBerhasil() {
  sudahDitandai.add(idTitikPanasTerbuka);
  tutupForm();
  el('kartu-keliru').hidden = false;
  const tombol = el('tombol-tandai-keliru');
  tombol.disabled = true;
  tombol.textContent = 'Sudah ditandai';
}

// Dialog tetap terbuka dan isi keterangan tidak dihapus (I07-08)
export function tampilkanPesanGagal(pesan) {
  tampilkanPesan(pesan);
}

export function tutupForm() {
  el('lembar-keliru').hidden = true;
}

// bantuan tampilan
function tampilkanPesan(pesan) {
  el('pesan-keliru').querySelector('span').textContent = pesan;
  el('pesan-keliru').hidden = false;
  aktifkanTombolKirim();
}

function sembunyikanPesan() {
  el('pesan-keliru').hidden = true;
}

function aktifkanTombolKirim() {
  el('tombol-kirim-keliru').disabled = false;
  el('tombol-kirim-keliru').textContent = 'Kirim penandaan';
}

function perbaruiPenghitung() {
  el('penghitung-keliru').textContent = `${el('keterangan-keliru').value.length}/${PANJANG_MAKS}`;
}

el('keterangan-keliru').addEventListener('input', perbaruiPenghitung);
el('tombol-tutup-keliru').addEventListener('click', tutupForm);
el('latar-keliru').addEventListener('click', tutupForm);
el('form-keliru').addEventListener('submit', (e) => {
  e.preventDefault();
  const tombol = el('tombol-kirim-keliru');
  if (tombol.disabled) return;

  const keterangan = el('keterangan-keliru').value;
  if (keterangan.trim() === '') {
    tampilkanPeringatanKeteranganKosong();
    return;
  }
  sembunyikanPesan();
  tombol.disabled = true;
  tombol.textContent = 'Mengirim…';
  penangan.kirim?.(idTitikPanasTerbuka, keterangan);
});
