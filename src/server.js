import express from 'express';
import pool from './db.js';
import { login } from './controllers/AutentikasiController.js';
import { cekLogin, cekPeran } from './middleware/auth.js';
import { ambilAntrean, ambilDetailLaporan, verifikasiLaporan, tolakLaporan } from './controllers/VerifikasiLaporanController.js';
import { ambilTugasRelawan, batalkanTugasTidakAman, tandaiNotifikasiDibaca } from './controllers/DaftarTugasController.js';

const app = express();

app.use(express.json());
app.use(express.static('public'));
app.get('/', (req, res) => res.redirect('/petugas/login.html'));
app.post('/api/login', login);

// UC03: hanya petugas (KNF05). /antrean dipasang sebelum /:id agar tidak tertangkap sebagai id
const hanyaPetugas = [cekLogin, cekPeran('petugas')];
app.get('/api/laporan/antrean', hanyaPetugas, ambilAntrean);
app.get('/api/laporan/:id', hanyaPetugas, ambilDetailLaporan);
app.post('/api/laporan/:id/setujui', hanyaPetugas, verifikasiLaporan);
app.post('/api/laporan/:id/tolak', hanyaPetugas, tolakLaporan);

// UC04: hanya relawan. idRelawan diambil dari token sesi, bukan dari klien
const hanyaRelawan = [cekLogin, cekPeran('relawan')];
app.get('/api/tugas', hanyaRelawan, ambilTugasRelawan);
app.post('/api/tugas/:id/batal', hanyaRelawan, batalkanTugasTidakAman);
app.post('/api/notifikasi/:id/baca', cekLogin, tandaiNotifikasiDibaca);

const port = process.env.PORT || 3000;

try {
  await pool.query('SELECT 1');
} catch (err) {
  console.error('Gagal terhubung ke database. Periksa DATABASE_URL di .env:', err.message);
  process.exit(1);
}

app.listen(port, () => {
  console.log(`SIGAP berjalan di http://localhost:${port}`);
});
