// C22 bagian klien. localStorage dibuat versi sederhana karena tes jalan di Node, bukan browser.
import test from 'node:test';
import assert from 'node:assert/strict';

const data = {};
globalThis.localStorage = {
  getItem: (k) => data[k] ?? null,
  setItem: (k, v) => { data[k] = v; },
  removeItem: (k) => { delete data[k]; }
};

globalThis.location = { href: '' };
const { periksaSesi, keluar, login, arahkanSesuaiPeran } = await import('../public/relawan/js/AutentikasiController.js');

function buatToken(exp) {
  const isi = Buffer.from(JSON.stringify({ idPengguna: 3, exp })).toString('base64url');
  return 'header.' + isi + '.ttd';
}
const sekarang = () => Math.floor(Date.now() / 1000);

test('C22-UT13 periksaSesi klien: token masih berlaku hasilnya true', () => {
  localStorage.setItem('sigap_token', buatToken(sekarang() + 3600));
  assert.equal(periksaSesi(), true);
});

test('C22-UT14 periksaSesi klien: token sudah lewat 1 detik hasilnya false', () => {
  localStorage.setItem('sigap_token', buatToken(sekarang() - 1));
  assert.equal(periksaSesi(), false);
});

test('C22-UT15 periksaSesi klien: setelah keluar hasilnya false', () => {
  localStorage.setItem('sigap_token', buatToken(sekarang() + 3600));
  keluar();
  assert.equal(periksaSesi(), false);
});

// login() klien memanggil /api/login, jadi fetch diganti versi palsu yang membalas sesuai kode yang diatur
function balasLogin(kode, isi) {
  globalThis.fetch = async () => new Response(JSON.stringify(isi), { status: kode });
}

test('C22-UT16 login klien berhasil, token disimpan di perangkat', async () => {
  keluar();
  const token = buatToken(sekarang() + 3600);
  balasLogin(200, { token, user: { peran: 'relawan' } });
  const hasil = await login('relawan1', 'rahasia123');
  assert.equal(hasil.status, 200);
  assert.equal(localStorage.getItem('sigap_token'), token);
});

test('C22-UT17 login klien ditolak 401, tidak ada token yang disimpan', async () => {
  keluar();
  balasLogin(401, { pesan: 'Username atau password salah' });
  const hasil = await login('relawan1', 'salah');
  assert.equal(hasil.status, 401);
  assert.equal(localStorage.getItem('sigap_token'), null);
});

test('C22-UT18 login klien saat server membalas bukan JSON tetap dapat pesan error', async () => {
  globalThis.fetch = async () => new Response('Internal Server Error', { status: 500 });
  const hasil = await login('relawan1', 'rahasia123');
  assert.equal(hasil.status, 500);
  assert.equal(hasil.data.pesan, 'Terjadi kesalahan di server');
});

test('C22-UT19 arahkanSesuaiPeran: petugas ke /petugas/, relawan ke /relawan/', () => {
  arahkanSesuaiPeran('petugas');
  assert.equal(location.href, '/petugas/');
  arahkanSesuaiPeran('relawan');
  assert.equal(location.href, '/relawan/');
});
