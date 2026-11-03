import bcrypt from 'bcrypt';
import pool from '../db.js';

export async function cariByUsername(username) {
  const hasil = await pool.query('SELECT id_pengguna, username, password_hash, peran FROM pengguna WHERE username = $1', [username]);
  if (hasil.rows.length === 0) return null;
  const baris = hasil.rows[0];
  return {
    idPengguna: baris.id_pengguna,
    username: baris.username,
    passwordHash: baris.password_hash,
    peran: baris.peran
  };
}

export async function cekPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

export async function ambilByPeran(peran) {
  const hasil = await pool.query('SELECT id_pengguna, username, peran FROM pengguna WHERE peran = $1', [peran]);
  return hasil.rows.map((baris) => ({ idPengguna: baris.id_pengguna, username: baris.username, peran: baris.peran }));
}
