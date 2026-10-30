import express from 'express';
import pool from './db.js';

const app = express();

app.use(express.json());
app.use(express.static('public'));
app.get('/', (req, res) => res.redirect('/petugas/'));

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
