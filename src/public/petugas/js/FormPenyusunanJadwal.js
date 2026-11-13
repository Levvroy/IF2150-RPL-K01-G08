// C05 FormPenyusunanJadwal (I-03)
import { periksaSesi, ambilPeran, ambilToken, keluar } from '/relawan/js/AutentikasiController.js';

const PESAN_SERVER_MATI = 'Jadwal belum tersimpan karena server tidak dapat dihubungi. Isian tidak hilang, coba simpan lagi.';
const LABEL_JENIS = {
  'patroli': 'Patroli pencegahan',
  'pembasahan sekat kanal': 'Pembasahan sekat kanal',
  'pengecekan titik panas': 'Pengecekan titik panas'
};
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const $ = (id) => document.getElementById(id);
let rekomendasiTerakhir = [];

function formatWaktu(waktu) {
  const w = new Date(waktu);
  const jam = `${String(w.getHours()).padStart(2, '0')}.${String(w.getMinutes()).padStart(2, '0')}`;
  return `${w.getDate()} ${BULAN[w.getMonth()]}, ${jam}`;
}

function formatTanggalTugas(teks) {
  const [t, b, h] = teks.split('-').map(Number);
  const tanggal = new Date(t, b - 1, h);
  return `${HARI[tanggal.getDay()]}, ${h} ${BULAN[b - 1]} ${t}`;
}

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

// operasi C05
async function tampilkanForm(petakAwal) {
  let hasil;
  try {
    hasil = await minta('/api/jadwal/form');
  } catch {
    $('ringkasan').textContent = 'Formulir belum bisa dimuat karena server tidak dapat dihubungi. Muat ulang halaman.';
    return;
  }
  if (hasil.status !== 200) {
    $('ringkasan').textContent = 'Formulir belum bisa dimuat. Muat ulang halaman.';
    return;
  }

  const { daftarRelawan, rekomendasi, daftarPetak } = hasil.data;
  tampilkanDaftarRelawanAktif(daftarRelawan);
  isiPilihanPetak(daftarPetak);
  if (petakAwal) {
    $('pilih-petak').value = petakAwal;
  }
  tampilkanRekomendasi(rekomendasi);

  let waktuUpdate = null;
  for (const p of daftarPetak) {
    if (p.waktuUpdateTerakhir && (!waktuUpdate || p.waktuUpdateTerakhir > waktuUpdate)) {
      waktuUpdate = p.waktuUpdateTerakhir;
    }
  }
  $('ringkasan').textContent = waktuUpdate
    ? `${daftarRelawan.length} relawan aktif. Rekomendasi petak diperbarui ${formatWaktu(waktuUpdate)}.`
    : `${daftarRelawan.length} relawan aktif.`;
}

function tampilkanDaftarRelawanAktif(daftarRelawan) {
  const pilihan = $('pilih-relawan');
  const terpilih = pilihan.value;
  pilihan.replaceChildren(new Option('Pilih relawan', ''));
  for (const r of daftarRelawan) pilihan.append(new Option(r.nama, r.idRelawan));
  pilihan.value = terpilih;
}

function isiPilihanPetak(daftarPetak) {
  const pilihan = $('pilih-petak');
  const terpilih = pilihan.value;
  pilihan.replaceChildren(new Option('Pilih petak', ''));
  for (const p of daftarPetak) pilihan.append(new Option(`Petak ${p.idPetak}, skor ${Math.round(p.skorRisiko)}`, p.idPetak));
  pilihan.value = terpilih;
}

function tampilkanRekomendasi(daftarPetak) {
  rekomendasiTerakhir = daftarPetak;
  const petakTerpilih = $('pilih-petak').value;
  $('rekomendasi-kosong').hidden = daftarPetak.length > 0;
  $('daftar-rekomendasi').hidden = daftarPetak.length === 0;
  $('daftar-rekomendasi').replaceChildren(...daftarPetak.map((p) => {
    const lencana = document.createElement('span');
    lencana.className = `lencana lencana-kecil ${p.tingkatRisiko}`;
    lencana.textContent = Math.round(p.skorRisiko);

    const teks = document.createElement('span');
    const judul = document.createElement('strong');
    judul.textContent = `Petak ${p.idPetak}`;
    const tingkat = document.createElement('span');
    tingkat.className = 'teks-sub';
    tingkat.textContent = `Risiko ${p.tingkatRisiko}`;
    teks.append(judul, tingkat);

    const tombol = document.createElement('button');
    tombol.type = 'button';
    tombol.className = 'tombol-teks';
    if (String(p.idPetak) === petakTerpilih) {
      tombol.textContent = '✓ Dipilih';
      tombol.disabled = true;
    } else {
      tombol.textContent = 'Pilih';
      tombol.addEventListener('click', () => {
        $('pilih-petak').value = p.idPetak;
        tampilkanRekomendasi(rekomendasiTerakhir);
      });
    }

    const li = document.createElement('li');
    li.className = 'baris-rekomendasi';
    li.append(lencana, teks, tombol);
    return li;
  }));
}

function tampilkanPesanKapasitasPenuh() {
  const pilihan = $('pilih-relawan');
  const nama = pilihan.selectedOptions[0].textContent;
  pilihan.classList.add('penuh');
  $('pesan-kapasitas').querySelector('span').textContent =
    `${nama} sudah punya 3 tugas aktif. Pilih relawan lain atau tunggu sampai salah satu tugasnya selesai.`;
  $('pesan-kapasitas').hidden = false;
}

function tampilkanPesanBerhasil(jadwal, nama, jenis, idPetak, tanggal) {
  $('berhasil-judul').textContent = `Jadwal #${jadwal.idJadwal} tersimpan`;
  $('berhasil-isi').textContent =
    `${nama} sudah menerima notifikasi tugas ${LABEL_JENIS[jenis]} di Petak ${idPetak}, ${formatTanggalTugas(tanggal)}.`;
  $('pesan-berhasil').hidden = false;
}

function tampilkanPesanGagal(pesan) {
  $('pesan-gagal').querySelector('span').textContent = pesan;
  $('pesan-gagal').hidden = false;
}

function sembunyikanPesan() {
  $('pesan-berhasil').hidden = true;
  $('pesan-gagal').hidden = true;
  $('pesan-kapasitas').hidden = true;
  $('pilih-relawan').classList.remove('penuh');
}

async function simpanJadwal(e) {
  e.preventDefault();
  const tombol = $('tombol-simpan');
  if (tombol.disabled) return;

  const dataJadwal = {
    idRelawan: Number($('pilih-relawan').value) || null,
    idPetak: Number($('pilih-petak').value) || null,
    jenisPekerjaan: document.querySelector('input[name="jenis"]:checked')?.value ?? '',
    tanggal: $('pilih-tanggal').value
  };
  const nama = $('pilih-relawan').selectedOptions[0].textContent;

  sembunyikanPesan();
  tombol.disabled = true;
  tombol.textContent = 'Menyimpan…';

  let hasil;
  try {
    hasil = await minta('/api/jadwal', { method: 'POST', body: JSON.stringify(dataJadwal) });
  } catch {
    hasil = null;
  }
  tombol.disabled = false;
  tombol.textContent = 'Simpan jadwal';

  if (!hasil) return tampilkanPesanGagal(PESAN_SERVER_MATI);
  if (hasil.status === 409) return tampilkanPesanKapasitasPenuh();
  if (hasil.status === 400) return tampilkanPesanGagal(hasil.data.pesan ?? PESAN_SERVER_MATI);
  if (hasil.status !== 201) return tampilkanPesanGagal(PESAN_SERVER_MATI);

  tampilkanPesanBerhasil(hasil.data, nama, dataJadwal.jenisPekerjaan, dataJadwal.idPetak, dataJadwal.tanggal);
  $('form-jadwal').reset();
  await tampilkanForm();
}

$('form-jadwal').addEventListener('submit', simpanJadwal);
$('form-jadwal').addEventListener('input', () => {
  $('pesan-gagal').hidden = true;
});
$('pilih-relawan').addEventListener('change', () => {
  $('pesan-kapasitas').hidden = true;
  $('pilih-relawan').classList.remove('penuh');
});
$('pilih-petak').addEventListener('change', () => tampilkanRekomendasi(rekomendasiTerakhir));
$('tombol-keluar').addEventListener('click', () => {
  keluar();
  location.href = '/petugas/login.html';
});

if (!periksaSesi() || ambilPeran() !== 'petugas') {
  location.replace('/petugas/login.html');
} else {
  // I02-24
  tampilkanForm(new URLSearchParams(location.search).get('idPetak'));
}
