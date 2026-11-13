import jwt from 'jsonwebtoken';
import { cariByUsername, cekPassword } from '../models/Pengguna.js';

async function verifikasiKredensial(username, password) {
  const pengguna = await cariByUsername(username);
  if (!pengguna) return null;
  const cocok = await cekPassword(password, pengguna.passwordHash);
  return cocok ? pengguna : null;
}

export function buatSesi(pengguna) {
  return jwt.sign({ idPengguna: pengguna.idPengguna, peran: pengguna.peran }, process.env.JWT_SECRET, {expiresIn: '7d'});
}

export async function login(req, res) {
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
    return res.status(400).json({ pesan: 'Username dan password wajib diisi' });
  }
  try {
    const pengguna = await verifikasiKredensial(username, password);
    if (!pengguna) {
      return res.status(401).json({ pesan: 'Username atau password salah.' });
    }
    res.json({
      token: buatSesi(pengguna),
      user: { idPengguna: pengguna.idPengguna, username: pengguna.username, peran: pengguna.peran }
    });
  } catch (err) {
    console.error('Gagal login:', err.message);
    res.status(500).json({ pesan: 'Terjadi kesalahan di server' });
  }
}
