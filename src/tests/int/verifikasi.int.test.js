// Tes integrasi UC03 verifikasi laporan: server.js dijalankan beneran, relawan mengunggah
// lewat /api/laporan (C15), petugas memutuskan lewat /api/laporan/:id/... (C10), lalu hasilnya
// dicek langsung ke database dan dari sisi relawan. Tidak pakai mock.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pool from '../../db.js';
import { jalankanServer } from '../helpers/server.js';
import { bersihkan, buatPengguna, buatPetak, buatJadwal, PASSWORD } from '../helpers/fixture.js';
import { DALAM_PETAK, utaraPetak } from '../helpers/laporan.js';

const URL = 'http://localhost:3101';
let server, relawan, petugas, petak, tokenRelawan, tokenPetugas;

async function login(username) {
  const res = await fetch(URL + '/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: PASSWORD })
  });
  return (await res.json()).token;
}

function kirimLaporan(idJadwal, uuid, foto, koordinat = DALAM_PETAK) {
  const form = new FormData();
  form.append('idLaporan', uuid);
  form.append('idJadwal', idJadwal);
  form.append('lat', String(koordinat.lat));
  form.append('lng', String(koordinat.lng));
  form.append('waktuUnggah', new Date().toISOString());
  form.append('foto', new Blob([foto]), 'foto.jpg');
  return fetch(URL + '/api/laporan', { method: 'POST', headers: { Authorization: 'Bearer ' + tokenRelawan }, body: form });
}

function petugasMinta(jalur, { method = 'GET', body, token = tokenPetugas } = {}) {
  const headers = token ? { Authorization: 'Bearer ' + token } : {};
  if (body) headers['Content-Type'] = 'application/json';
  return fetch(URL + jalur, { method, headers, body: body && JSON.stringify(body) });
}

// Relawan membuat tugas lalu mengunggah laporan lewat HTTP
async function unggah(koordinat) {
  const idJadwal = await buatJadwal(relawan.id, petak);
  const idLaporan = randomUUID();
  const foto = new Uint8Array(1024).fill(9);
  const res = await kirimLaporan(idJadwal, idLaporan, foto, koordinat);
  assert.equal(res.status, 201);
  return { idJadwal, idLaporan, foto };
}

async function dbLaporan(idLaporan) {
  const { rows } = await pool.query('SELECT status, alasan_penolakan, id_petugas_verifikasi, waktu_verifikasi FROM laporan_bukti_kerja WHERE id_laporan = $1', [idLaporan]);
  return rows[0];
}

async function dbStatusJadwal(idJadwal) {
  const { rows } = await pool.query('SELECT status FROM jadwal_pekerjaan WHERE id_jadwal = $1', [idJadwal]);
  return rows[0].status;
}

before(async () => {
  await bersihkan();
  relawan = await buatPengguna('relawan', 'relawan');
  petugas = await buatPengguna('petugas', 'petugas');
  petak = await buatPetak(70, 'tinggi');
  server = await jalankanServer(3101);
  tokenRelawan = await login(relawan.username);
  tokenPetugas = await login(petugas.username);
});

after(async () => {
  server.kill();
  await bersihkan();
  await pool.end();
});

test('INT-TC09 laporan yang diunggah relawan muncul di antrean petugas', async () => {
  const { idLaporan, idJadwal } = await unggah();
  const res = await petugasMinta('/api/laporan/antrean');
  const data = await res.json();
  const baris = data.daftarLaporan.find((l) => l.idLaporan === idLaporan);

  assert.equal(res.status, 200);
  assert.equal(baris.idJadwal, idJadwal);
  assert.equal(baris.namaRelawan, relawan.username);
});

test('INT-TC10 detail laporan berisi foto yang sama dengan unggahan dan jarak dari batas petak di database', async () => {
  const { idLaporan, foto } = await unggah(utaraPetak(250));
  const res = await petugasMinta('/api/laporan/' + idLaporan);
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(res.headers.get('cache-control'), 'no-store');
  assert.equal(data.laporan.foto, 'data:image/jpeg;base64,' + Buffer.from(foto).toString('base64'));
  assert.equal(data.jarak, 250);
  assert.equal(data.melebihiBatas, true);
});

test('INT-TC11 setujui: laporan dan tugas berubah di database, relawan menerima notifikasi', async () => {
  const { idLaporan, idJadwal } = await unggah();
  const res = await petugasMinta(`/api/laporan/${idLaporan}/setujui`, { method: 'POST' });
  const baris = await dbLaporan(idLaporan);

  assert.equal(res.status, 200);
  assert.equal(baris.status, 'terverifikasi');
  assert.equal(baris.id_petugas_verifikasi, petugas.id);
  assert.equal(await dbStatusJadwal(idJadwal), 'selesai');

  const tugas = await (await fetch(URL + '/api/tugas', { headers: { Authorization: 'Bearer ' + tokenRelawan } })).json();
  assert.equal(tugas.daftarTugas.some((t) => t.idJadwal === idJadwal), false);
  assert.ok(tugas.daftarNotifikasi.some((n) => n.isiPesan.includes(`tugas #${idJadwal} disetujui`)));
});

test('INT-TC12 tolak: alasan tersimpan, tugas kembali aktif, relawan bisa mengunggah ulang', async () => {
  const { idLaporan, idJadwal } = await unggah();
  const res = await petugasMinta(`/api/laporan/${idLaporan}/tolak`, { method: 'POST', body: { alasan: 'uji-setup foto buram' } });
  const baris = await dbLaporan(idLaporan);

  assert.equal(res.status, 200);
  assert.equal(baris.status, 'ditolak');
  assert.equal(baris.alasan_penolakan, 'uji-setup foto buram');
  assert.equal(await dbStatusJadwal(idJadwal), 'ditugaskan');

  const tugas = await (await fetch(URL + '/api/tugas', { headers: { Authorization: 'Bearer ' + tokenRelawan } })).json();
  assert.ok(tugas.daftarNotifikasi.some((n) => n.isiPesan.includes('Alasan: uji-setup foto buram')));
  const ulang = await kirimLaporan(idJadwal, randomUUID(), new Uint8Array(512));
  assert.equal(ulang.status, 201);
  assert.equal(await dbStatusJadwal(idJadwal), 'menunggu verifikasi');
});

test('INT-TC13 relawan (403) dan tanpa login (401) tidak bisa memakai endpoint verifikasi, database tidak berubah', async () => {
  const { idLaporan } = await unggah();
  const daftar = [
    ['/api/laporan/antrean', 'GET'],
    ['/api/laporan/' + idLaporan, 'GET'],
    [`/api/laporan/${idLaporan}/setujui`, 'POST'],
    [`/api/laporan/${idLaporan}/tolak`, 'POST']
  ];
  for (const [jalur, method] of daftar) {
    const body = method === 'POST' ? { alasan: 'uji-setup' } : undefined;
    assert.equal((await petugasMinta(jalur, { method, token: tokenRelawan, body })).status, 403, jalur);
    assert.equal((await petugasMinta(jalur, { method, token: null, body })).status, 401, jalur);
  }
  assert.equal((await dbLaporan(idLaporan)).status, 'menunggu verifikasi');
});

test('INT-TC14 laporan yang sudah disetujui tidak bisa disetujui atau ditolak lagi (409, KF10)', async () => {
  const { idLaporan } = await unggah();
  await petugasMinta(`/api/laporan/${idLaporan}/setujui`, { method: 'POST' });
  const sebelum = await dbLaporan(idLaporan);

  assert.equal((await petugasMinta(`/api/laporan/${idLaporan}/setujui`, { method: 'POST' })).status, 409);
  assert.equal((await petugasMinta(`/api/laporan/${idLaporan}/tolak`, { method: 'POST', body: { alasan: 'uji-setup' } })).status, 409);
  assert.deepEqual(await dbLaporan(idLaporan), sebelum);
});

test('INT-TC15 tolak tanpa alasan dibalas 400 dan id asal-asalan dibalas 404, database tidak berubah', async () => {
  const { idLaporan, idJadwal } = await unggah();
  assert.equal((await petugasMinta(`/api/laporan/${idLaporan}/tolak`, { method: 'POST', body: { alasan: '   ' } })).status, 400);
  assert.equal((await petugasMinta('/api/laporan/bukan-uuid')).status, 404);
  assert.equal((await petugasMinta(`/api/laporan/${randomUUID()}/setujui`, { method: 'POST' })).status, 404);
  assert.equal((await dbLaporan(idLaporan)).status, 'menunggu verifikasi');
  assert.equal(await dbStatusJadwal(idJadwal), 'menunggu verifikasi');
});
