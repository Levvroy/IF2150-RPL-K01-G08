// Halaman simulasi SMS (I-08): meniru aplikasi pesan di ponsel warga.
// Tanpa parameter  : daftar nomor yang pernah menerima SMS.
// Dengan ?nomor=...: satu percakapan untuk nomor itu.

const tampilan = document.getElementById('tampilan');
const nomorDipilih = new URLSearchParams(window.location.search).get('nomor');

let daftarPesan = [];      // SMS terkirim dari server, yang terbaru di urutan pertama
let balasanTerkirim = [];  // balasan yang sudah dikirim dari halaman ini (hilang jika halaman dimuat ulang)

const NAMA_BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function buatElemen(tag, kelas, teks) {
  const elemen = document.createElement(tag);
  if (kelas) {
    elemen.className = kelas;
  }
  if (teks !== undefined) {
    elemen.textContent = teks;
  }
  return elemen;
}

function dua(angka) {
  if (angka < 10) {
    return '0' + angka;
  }
  return String(angka);
}

function formatJam(tanggal) {
  return dua(tanggal.getHours()) + '.' + dua(tanggal.getMinutes());
}

function formatWaktu(teksWaktu) {
  const tanggal = new Date(teksWaktu);
  const sekarang = new Date();
  if (tanggal.toDateString() === sekarang.toDateString()) {
    return 'Hari ini, ' + formatJam(tanggal);
  }
  return tanggal.getDate() + ' ' + NAMA_BULAN[tanggal.getMonth()] + ', ' + formatJam(tanggal);
}

function buatKepala(adaTombolKembali) {
  const kepala = buatElemen('header', 'kepala');
  if (adaTombolKembali) {
    const kembali = buatElemen('a', 'kembali', '< Pesan');
    kembali.href = './';
    kepala.appendChild(kembali);
  }
  kepala.appendChild(buatElemen('div', 'nama-pengirim', 'SIGAP'));
  kepala.appendChild(buatElemen('div', 'keterangan-pengirim', 'Peringatan dini kebakaran, simulasi'));
  return kepala;
}

function ambilDaftarNomor() {
  const hasil = [];
  for (const pesan of daftarPesan) {
    if (!hasil.includes(pesan.nomorHP)) {
      hasil.push(pesan.nomorHP);
    }
  }
  return hasil;
}

function gambarDaftarNomor() {
  tampilan.replaceChildren();
  tampilan.appendChild(buatKepala(false));
 
  const isi = buatElemen('div', 'isi');
  isi.appendChild(buatElemen('div', 'banner', 'Prototipe: data historis dan SMS disimulasikan.'));
 
  const daftarNomor = ambilDaftarNomor();
  if (daftarNomor.length === 0) {
    isi.appendChild(buatElemen('div', 'kosong', 'Belum ada SMS terkirim.'));
  }
  for (const nomor of daftarNomor) {
    const tautan = buatElemen('a', 'baris-nomor', nomor);
    tautan.href = '?nomor=' + encodeURIComponent(nomor);
    isi.appendChild(tautan);
  }
  tampilan.appendChild(isi);
}

// Mengirim balasan ke server. Bernilai true jika server menerima.
async function kirimBalasan(nomor, teks) {
  try {
    const respons = await fetch('/api/simulasi-sms/balasan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nomorHP: nomor, isiBalasan: teks })
    });
    if (!respons.ok) {
      alert('Balasan belum terkirim. Coba lagi.');
      return false;
    }
    balasanTerkirim.push({ teks: teks, waktu: new Date() });
    return true;
  } catch (err) {
    console.error('Gagal mengirim balasan:', err);
    alert('Balasan belum terkirim. Coba lagi.');
    return false;
  }
}

function buatFormBalasan(nomor) {
  const form = buatElemen('form', 'bar-input');

  const input = buatElemen('input');
  input.type = 'text';
  input.placeholder = 'Pesan teks';
  input.setAttribute('aria-label', 'Balasan untuk ' + nomor);

  const tombol = buatElemen('button', 'tombol-kirim', '↑');
  tombol.type = 'submit';
  tombol.disabled = true;
  tombol.setAttribute('aria-label', 'Kirim');

  // Tombol aktif hanya jika kolom terisi (I08-07)
  input.addEventListener('input', function () {
    tombol.disabled = input.value.trim() === '';
  });

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    const teks = input.value.trim();
    if (teks === '') {
      return;
    }

    tombol.disabled = true;
    const berhasil = await kirimBalasan(nomor, teks);
    if (berhasil) {
      gambar();
    } else {
      tombol.disabled = false;
    }
  });

  form.appendChild(input);
  form.appendChild(tombol);
  return form;
}

function gambarPercakapan(nomor) {
  tampilan.replaceChildren();
  tampilan.appendChild(buatKepala(true));

  const isi = buatElemen('div', 'isi');

  // Server mengirim yang terbaru dulu, percakapan ditampilkan dari yang terlama
  for (let i = daftarPesan.length - 1; i >= 0; i--) {
    const pesan = daftarPesan[i];
    if (pesan.nomorHP !== nomor) {
      continue;
    }
    isi.appendChild(buatElemen('div', 'waktu-tengah', formatWaktu(pesan.waktuKirim)));
    isi.appendChild(buatElemen('div', 'bubble-masuk', pesan.isiPesan));
  }

  for (const balasan of balasanTerkirim) {
    isi.appendChild(buatElemen('div', 'bubble-keluar', balasan.teks));
    isi.appendChild(buatElemen('div', 'status-kirim', 'Terkirim ' + formatJam(balasan.waktu)));
  }

  if (isi.children.length === 0) {
    isi.appendChild(buatElemen('div', 'kosong', 'Belum ada pesan untuk nomor ini.'));
  }

  tampilan.appendChild(isi);
  tampilan.appendChild(buatFormBalasan(nomor));
  isi.scrollTop = isi.scrollHeight;
}

function gambar() {
  if (nomorDipilih === null || nomorDipilih === '') {
    gambarDaftarNomor();
  } else {
    gambarPercakapan(nomorDipilih);
  }
}

function sedangMengetik() {
  const aktif = document.activeElement;
  if (aktif && aktif.tagName === 'INPUT') {
    return true;
  }

  const semuaInput = document.querySelectorAll('input');
  for (const input of semuaInput) {
    if (input.value.trim() !== '') {
      return true;
    }
  }
  return false;
}

async function muat() {
  try {
    const respons = await fetch('/api/simulasi-sms/pesan');
    if (!respons.ok) {
      console.error('Gagal memuat pesan, status ' + respons.status);
      return;
    }

    daftarPesan = await respons.json();
    if (sedangMengetik()) {
      return;
    }
    gambar();
  } catch (err) {
    console.error('Gagal memuat pesan:', err);
  }
}

muat();
setInterval(muat, 10000);