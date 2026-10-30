import jwt from 'jsonwebtoken';

export function cekLogin(req, res, next) {
  const header = req.headers.authorization || '';
  const [jenis, token] = header.split(' ');
  if (jenis !== 'Bearer' || !token) {
    return res.status(401).json({ pesan: 'Belum login' });
  }
  try {
    req.pengguna = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ pesan: 'Sesi tidak valid atau kedaluwarsa' });
  }
}

export function cekPeran(peran) {
  return (req, res, next) => {
    if (req.pengguna.peran !== peran) {
      return res.status(403).json({ pesan: 'Peran tidak diizinkan' });
    }
    next();
  };
}
