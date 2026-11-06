// Verifikasi tanda tangan token tetap di server (middleware/auth.js)
const KUNCI_TOKEN = 'sigap_token';

export async function login(username, password) {
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json().catch(() => ({ pesan: 'Terjadi kesalahan di server' }));
  if (res.ok) localStorage.setItem(KUNCI_TOKEN, data.token);
  return { status: res.status, data };
}

function bacaIsiToken(token) {
  const bagian = token.split('.')[1];
  const base64 = bagian.replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(base64));
}

export function periksaSesi() {
  const token = localStorage.getItem(KUNCI_TOKEN);
  if (!token) return false;
  try {
    return bacaIsiToken(token).exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function ambilPeran() {
  return bacaIsiToken(localStorage.getItem(KUNCI_TOKEN)).peran;
}

export function ambilIdPengguna() {
  return bacaIsiToken(localStorage.getItem(KUNCI_TOKEN)).idPengguna;
}

export function ambilToken() {
  return localStorage.getItem(KUNCI_TOKEN);
}

export function keluar() {
  localStorage.removeItem(KUNCI_TOKEN);
}

export function arahkanSesuaiPeran(peran) {
  location.href = peran === 'petugas' ? '/petugas/' : '/relawan/';
}
