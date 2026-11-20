// Tes integrasi SMS peringatan: server.js dijalankan beneran, pemicu SMS memakai controller C18 asli,
// halaman simulasi (I-08) diakses lewat HTTP, hasilnya dicek ke database. Tidak pakai mock.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../db.js';
import { jalankanServer } from '../helpers/server.js';
import { cekAmbangRisiko, hapusNomorDicabut } from '../../controllers/PeringatanSMSController.js';
import { bersihkan, buatPengguna, buatPetak, buatJadwal, buatWarga, PASSWORD } from '../helpers/fixture.js';

const URL = 'http://localhost:3104';
const NOMOR_DITOLAK = '081200000402';
process.env.NOMOR_TIDAK_AKTIF = NOMOR_DITOLAK;

let server, relawan, petugas, tokenRelawan;
const tinggi = (idPetak) => ({ idPetak, tingkatRisiko: 'tinggi' });

async function login(username) {
  const res = await fetch(URL + '/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: PASSWORD })
  });
  return (await res.json()).token;
}

function balas(nomorHP, isiBalasan) {
  return fetch(URL + '/api/simulasi-sms/balasan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nomorHP, isiBalasan })
  });
}

async function jumlahLog(idPetak) {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM peringatan_sms WHERE id_petak = $1', [idPetak]);
  return rows[0].n;
}

before(async () => {
  await bersihkan();
  relawan = await buatPengguna('relawan', 'relawan');
  petugas = await buatPengguna('petugas', 'petugas');
  server = await jalankanServer(3104);
  tokenRelawan = await login(relawan.username);
});

after(async () => {
  server.kill();
  await bersihkan();
  await pool.end();
});

test('INT-TC24 SMS yang diterima gateway muncul di halaman simulasi, yang ditolak tidak', async () => {
  const petak = await buatPetak(85, 'tinggi');
  await buatWarga(petak, '081200000401');
  await buatWarga(petak, NOMOR_DITOLAK);
  await cekAmbangRisiko([tinggi(petak)]);

  const { rows } = await pool.query('SELECT status FROM peringatan_sms WHERE id_petak = $1 ORDER BY status', [petak]);
  assert.deepEqual(rows.map((r) => r.status), ['gagal', 'terkirim']);

  const res = await fetch(URL + '/api/simulasi-sms/pesan');
  const data = await res.json();
  const diterima = data.find((p) => p.nomorHP === '081200000401');
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('cache-control'), 'no-store');
  assert.ok(diterima.isiPesan.includes(String(petak)) && diterima.isiPesan.includes('STOP'));
  assert.ok(!data.some((p) => p.nomorHP === NOMOR_DITOLAK));
});

test('INT-TC25 pemicu kedua dalam 24 jam tidak mengirim ulang', async () => {
  const petak = await buatPetak(86, 'tinggi');
  await buatWarga(petak, '081200000411');
  await cekAmbangRisiko([tinggi(petak)]);
  await cekAmbangRisiko([tinggi(petak)]);
  assert.equal(await jumlahLog(petak), 1);
});

test('INT-TC26 balasan STOP lewat halaman simulasi mencabut persetujuan di database dan menghentikan SMS berikutnya', async () => {
  const petak = await buatPetak(87, 'tinggi');
  const warga = await buatWarga(petak, '081200000421');
  const res = await balas('081200000421', ' stop ');

  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { diterima: true, dicabut: true });
  const { rows } = await pool.query('SELECT status_persetujuan, waktu_dicabut FROM warga WHERE id_warga = $1', [warga]);
  assert.equal(rows[0].status_persetujuan, 'dicabut');
  assert.notEqual(rows[0].waktu_dicabut, null);

  await cekAmbangRisiko([tinggi(petak)]);
  assert.equal(await jumlahLog(petak), 0);
});

test('INT-TC27 balasan tidak valid ditolak 400, nomor tidak terdaftar diterima tanpa pencabutan', async () => {
  assert.equal((await balas('', 'STOP')).status, 400);
  assert.equal((await balas('081200000431', '   ')).status, 400);
  const asing = await balas('089999999997', 'STOP');
  assert.equal(asing.status, 200);
  assert.deepEqual(await asing.json(), { diterima: true, dicabut: false });
});

test('INT-TC28 nomor yang dicabut lebih dari 30 hari dihapus dari database', async () => {
  const petak = await buatPetak(10, 'rendah');
  const warga = await buatWarga(petak, '081200000441');
  await balas('081200000441', 'STOP');
  await pool.query(`UPDATE warga SET waktu_dicabut = NOW() - INTERVAL '31 days' WHERE id_warga = $1`, [warga]);
  await hapusNomorDicabut();
  const { rows } = await pool.query('SELECT 1 FROM warga WHERE id_warga = $1', [warga]);
  assert.equal(rows.length, 0);
});

test('INT-TC29 pembatalan tugas oleh relawan membuat notifikasi untuk petugas di database', async () => {
  const petak = await buatPetak(60, 'sedang');
  const idJadwal = await buatJadwal(relawan.id, petak);
  const res = await fetch(`${URL}/api/tugas/${idJadwal}/batal`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + tokenRelawan, 'Content-Type': 'application/json' },
    body: JSON.stringify({ alasan: 'uji-setup asap tebal' })
  });
  assert.equal(res.status, 200);
  const { rows } = await pool.query('SELECT sudah_dibaca FROM notifikasi WHERE id_pengguna = $1', [petugas.id]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].sudah_dibaca, false);
});