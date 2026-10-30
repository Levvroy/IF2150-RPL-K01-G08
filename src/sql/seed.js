import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcrypt';
import pool from '../db.js';

const LAT_UTARA = -0.471;
const LNG_BARAT = 101.371;
const UKURAN_PETAK = 0.009;
const JUMLAH_KOLOM = 13;
const ID_AWAL = 154;
const KOLOM_PER_BARIS = [[3, 9], [2, 10], [1, 11], [0, 12], [0, 12], [1, 12], [1, 11], [2, 11], [3, 10], [4, 8]];

const SKOR_AWAL = {
  214: 78, 215: 71, 209: 66,
  221: 52, 196: 48, 187: 46, 188: 45, 200: 44, 202: 43, 203: 42,
  213: 41, 216: 40, 226: 38, 227: 37, 228: 36, 255: 35,
  233: 12
};

const PASSWORD_UJI = 'sigap12345';
const PETUGAS = ['petugas.posko'];
const RELAWAN = [
  { username: 'arga.simanjuntak', nama: 'Arga Simanjuntak', kontak: '081200000001' },
  { username: 'jonathan.lewie', nama: 'Jonathan Lewie', kontak: '081200000002' },
  { username: 'rafi.abrar', nama: 'Rafi Abrar', kontak: '081200000003' },
  { username: 'rafiif.ansyadya', nama: 'Rafiif Ansyadya', kontak: '081200000004' },
  { username: 'reinhard.tandra', nama: 'Reinhard Tandra', kontak: '081200000005' }
];
const WARGA = [
  { idPetak: 214, nomorHp: '081300000001' },
  { idPetak: 214, nomorHp: '081300000002' },
  { idPetak: 215, nomorHp: '081300000003' },
  { idPetak: 233, nomorHp: '081300000004' }
];
const JADWAL = [
  { relawan: 'arga.simanjuntak', idPetak: 187, jenis: 'patroli', tanggal: '2026-10-25',
    laporan: { waktu: '2026-10-25T17:20:00+07:00' } },
  { relawan: 'reinhard.tandra', idPetak: 209, jenis: 'pembasahan sekat kanal', tanggal: '2026-10-26',
    laporan: { waktu: '2026-10-26T09:30:00+07:00' } },
  { relawan: 'rafiif.ansyadya', idPetak: 221, jenis: 'patroli', tanggal: '2026-10-26',
    laporan: { waktu: '2026-10-26T11:05:00+07:00' } },
  { relawan: 'arga.simanjuntak', idPetak: 214, jenis: 'pengecekan titik panas', tanggal: '2026-10-26',
    laporan: { waktu: '2026-10-26T14:42:00+07:00', lat: -0.5124, lng: 101.4471 } },
  { relawan: 'arga.simanjuntak', idPetak: 233, jenis: 'patroli', tanggal: '2026-10-27' }
];

export function batasPetak(idPetak) {
  const urutan = idPetak - ID_AWAL;
  const baris = Math.floor(urutan / JUMLAH_KOLOM);
  const kolom = urutan % JUMLAH_KOLOM;
  const latMaks = LAT_UTARA - baris * UKURAN_PETAK;
  const lngMin = LNG_BARAT + kolom * UKURAN_PETAK;
  return { latMin: latMaks - UKURAN_PETAK, latMaks, lngMin, lngMaks: lngMin + UKURAN_PETAK };
}

export function tingkatDariSkor(skor) {
  if (skor >= 60) return 'tinggi';
  if (skor >= 30) return 'sedang';
  return 'rendah';
}

export function geserWaktuKeSekarang(daftarWaktu, sekarang = new Date()) {
  const terbaru = Math.max(...daftarWaktu.map((w) => w.getTime()));
  const selisih = sekarang.getTime() - 60 * 60 * 1000 - terbaru;
  return daftarWaktu.map((w) => new Date(w.getTime() + selisih));
}

// Format CSV mengikuti ekspor FIRMS harusnya
function bacaCsvFirms(isi) {
  const baris = isi.trim().split('\n').slice(1);
  return baris.map((b) => {
    const [lat, lng, tanggal, jam] = b.split(',');
    const waktu = new Date(`${tanggal}T${jam.slice(0, 2)}:${jam.slice(2)}:00Z`);
    return { latitude: Number(lat), longitude: Number(lng), waktu };
  });
}

async function seed() {
  const schema = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
  await pool.query(schema);

  const hash = await bcrypt.hash(PASSWORD_UJI, 10);
  const idPengguna = {};

  for (const username of PETUGAS) {
    await pool.query(
      "INSERT INTO pengguna (username, password_hash, peran) VALUES ($1, $2, 'petugas')",
      [username, hash]
    );
  }

  for (const r of RELAWAN) {
    const hasil = await pool.query(
      "INSERT INTO pengguna (username, password_hash, peran) VALUES ($1, $2, 'relawan') RETURNING id_pengguna",
      [r.username, hash]
    );
    idPengguna[r.username] = hasil.rows[0].id_pengguna;
    await pool.query(
      'INSERT INTO relawan_lapangan (id_relawan, nama, kontak) VALUES ($1, $2, $3)',
      [hasil.rows[0].id_pengguna, r.nama, r.kontak]
    );
  }

  let jumlahPetak = 0;
  for (let baris = 0; baris < KOLOM_PER_BARIS.length; baris++) {
    const [kolomAwal, kolomAkhir] = KOLOM_PER_BARIS[baris];
    for (let kolom = kolomAwal; kolom <= kolomAkhir; kolom++) {
      const id = ID_AWAL + baris * JUMLAH_KOLOM + kolom;
      const b = batasPetak(id);
      const skor = SKOR_AWAL[id] ?? 10;
      await pool.query(
        `INSERT INTO petak_lahan (id_petak, lat_min, lat_maks, lng_min, lng_maks, skor_risiko, tingkat_risiko, waktu_update_terakhir) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [id, b.latMin, b.latMaks, b.lngMin, b.lngMaks, skor, tingkatDariSkor(skor)]
      );
      jumlahPetak++;
    }
  }

  for (const w of WARGA) {
    await pool.query('INSERT INTO warga (id_petak, nomor_hp) VALUES ($1, $2)', [w.idPetak, w.nomorHp]);
  }

  const csv = await readFile(new URL('./data/titik_panas_contoh.csv', import.meta.url), 'utf8');
  const titik = bacaCsvFirms(csv);
  const waktuBaru = geserWaktuKeSekarang(titik.map((t) => t.waktu));
  let jumlahTitik = 0;
  for (let k = 0; k < titik.length; k++) {
    const hasil = await pool.query(
      `INSERT INTO titik_panas (latitude, longitude, waktu_deteksi, status_validitas) VALUES ($1, $2, $3, 'valid') ON CONFLICT (latitude, longitude, waktu_deteksi) DO NOTHING`,
      [titik[k].latitude, titik[k].longitude, waktuBaru[k]]
    );
    jumlahTitik += hasil.rowCount;
  }

  const foto = await readFile(new URL('./data/foto-contoh.jpg', import.meta.url));
  for (const j of JADWAL) {
    const status = j.laporan ? 'menunggu verifikasi' : 'ditugaskan';
    const hasil = await pool.query(
      `INSERT INTO jadwal_pekerjaan (id_relawan, id_petak, jenis_pekerjaan, tanggal, status, id_titik_panas)
       VALUES ($1, $2, $3::text, $4, $5,
         CASE WHEN $3::text = 'pengecekan titik panas' THEN (
           SELECT t.id_titik_panas FROM titik_panas t, petak_lahan p
           WHERE p.id_petak = $2
             AND t.latitude >= p.lat_min AND t.latitude < p.lat_maks
             AND t.longitude >= p.lng_min AND t.longitude < p.lng_maks
           ORDER BY t.waktu_deteksi DESC LIMIT 1)
         END)
       RETURNING id_jadwal`,
      [idPengguna[j.relawan], j.idPetak, j.jenis, j.tanggal, status]
    );
    const idJadwal = hasil.rows[0].id_jadwal;

    await pool.query(
      'INSERT INTO notifikasi (id_pengguna, isi_pesan) VALUES ($1, $2)',
      [idPengguna[j.relawan], `Tugas baru #${idJadwal} sudah ditugaskan kepada Anda`]
    );

    if (j.laporan) {
      const b = batasPetak(j.idPetak);
      const lat = j.laporan.lat ?? (b.latMin + b.latMaks) / 2;
      const lng = j.laporan.lng ?? (b.lngMin + b.lngMaks) / 2;
      await pool.query(
        `INSERT INTO laporan_bukti_kerja (id_laporan, id_jadwal, foto, lat_unggah, lng_unggah, waktu_unggah, status) VALUES ($1, $2, $3, $4, $5, $6, 'menunggu verifikasi')`,
        [crypto.randomUUID(), idJadwal, foto, lat, lng, j.laporan.waktu]
      );
    }
  }

  console.log(`Seed selesai: ${PETUGAS.length} petugas, ${RELAWAN.length} relawan, ${jumlahPetak} petak, ` + `${WARGA.length} warga, ${jumlahTitik} titik panas, ${JADWAL.length} jadwal.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await seed();
  } catch (err) {
    console.error('Seed gagal:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
