import pool from '../db.js';
import { perbaruiData } from '../controllers/PetaRisikoController.js';

try {
  const hasil = await perbaruiData(process.env.CRON_TOKEN);
  if (hasil.status !== 200) {
    console.error(`Pembaruan gagal (${hasil.status}): ${hasil.pesan}`);
    process.exitCode = 1;
  } else {
    console.log(`${hasil.pesan}: ${hasil.jumlahPetak} petak, ${hasil.jumlahTitik} titik berlaku.`);
  }
} catch (err) {
  console.error('Pembaruan gagal:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}