import { login, periksaSesi, ambilPeran, arahkanSesuaiPeran } from './AutentikasiController.js';

const halaman = document.getElementById('halaman');
const form = document.getElementById('form-login');
const kolomUsername = document.getElementById('username');
const kolomPassword = document.getElementById('password');
const tombolMata = document.getElementById('tombol-mata');
const tombolMasuk = document.getElementById('tombol-masuk');
const petunjukKosong = document.getElementById('petunjuk-kosong');
const pesanGagal = document.getElementById('pesan-gagal');
const pesanLuring = document.getElementById('pesan-luring');

let sedangMengirim = false;
let gagal = false;

function perbaruiTampilan() {
  const kosong = !kolomUsername.value || !kolomPassword.value;
  const luring = !navigator.onLine;
  let keadaan = 'isi';
  if (luring) keadaan = 'luring';
  else if (sedangMengirim) keadaan = 'memeriksa';
  else if (gagal) keadaan = 'gagal';
  halaman.dataset.keadaan = keadaan;
  pesanLuring.hidden = !luring;
  pesanGagal.hidden = keadaan !== 'gagal';
  petunjukKosong.hidden = !kosong || keadaan !== 'isi';
  tombolMata.hidden = !kolomPassword.value;
  tombolMasuk.disabled = kosong || sedangMengirim || luring;
  tombolMasuk.textContent = sedangMengirim ? 'Memeriksa akun…' : 'Masuk';
}

function tampilkanPesanGagal(pesan) {
  pesanGagal.querySelector('span').textContent = pesan;
  gagal = true;
  perbaruiTampilan();
}

function tampilkanPesanPerluKoneksi() {
  gagal = false;
  perbaruiTampilan();
}

function tampilkanFormLogin() {
  perbaruiTampilan();
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (tombolMasuk.disabled) return;
  sedangMengirim = true;
  gagal = false;
  perbaruiTampilan();

  try {
    const { status, data } = await login(kolomUsername.value, kolomPassword.value);
    if (status === 200) {
      arahkanSesuaiPeran(data.user.peran);
      return;
    }
    sedangMengirim = false;
    kolomPassword.value = '';
    tampilkanPesanGagal(status === 401 ? 'Username atau password salah.' : data.pesan);
  } catch {
    sedangMengirim = false;
    tampilkanPesanPerluKoneksi();
  }
});

kolomUsername.addEventListener('input', perbaruiTampilan);
kolomPassword.addEventListener('input', perbaruiTampilan);

tombolMata.addEventListener('click', () => {
  const tampil = kolomPassword.type === 'password';
  kolomPassword.type = tampil ? 'text' : 'password';
  tombolMata.querySelector('.coret').toggleAttribute('hidden', !tampil);
  tombolMata.setAttribute('aria-label', tampil ? 'Sembunyikan password' : 'Tampilkan password');
});

window.addEventListener('online', tampilkanFormLogin);
window.addEventListener('offline', tampilkanPesanPerluKoneksi);

if (periksaSesi()) {
  arahkanSesuaiPeran(ambilPeran());
} else {
  tampilkanFormLogin();
}
