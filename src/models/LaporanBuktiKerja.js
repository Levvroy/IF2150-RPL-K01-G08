import pool from '../db.js';

// Setiap operasi menerima `db` opsional: isi dengan client pg dari pool.connect()
// agar operasi ikut dalam transaksi yang sama (Algo-006, Algo-011).

// Kolom DATE dibaca pg sebagai Date tengah malam zona waktu server. Diubah ke 'YYYY-MM-DD'
// agar tanggal tidak bergeser saat dikirim sebagai JSON (UTC).
function keTanggalISO(tanggal) {
  if (!(tanggal instanceof Date)) return tanggal;
  const dua = (n) => String(n).padStart(2, '0');
  return `${tanggal.getFullYear()}-${dua(tanggal.getMonth() + 1)}-${dua(tanggal.getDate())}`;
}

function keObjek(baris) {
  return {
    idLaporan: baris.id_laporan,
    idJadwal: baris.id_jadwal,
    koordinatUnggah: { lat: baris.lat_unggah, lng: baris.lng_unggah },
    waktuUnggah: baris.waktu_unggah,
    status: baris.status,
    alasanPenolakan: baris.alasan_penolakan,
    idPetugasVerifikasi: baris.id_petugas_verifikasi,
    waktuVerifikasi: baris.waktu_verifikasi
  };
}

// Q-014
export async function simpan(laporan, db = pool) {
  await db.query(
    `INSERT INTO laporan_bukti_kerja (id_laporan, id_jadwal, foto, lat_unggah, lng_unggah, waktu_unggah, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'menunggu verifikasi')`,
    [laporan.idLaporan, laporan.idJadwal, laporan.foto, laporan.koordinatUnggah.lat, laporan.koordinatUnggah.lng, laporan.waktuUnggah]
  );
}

// Q-015
export async function cekUUIDAda(uuid, db = pool) {
  const hasil = await db.query('SELECT 1 FROM laporan_bukti_kerja WHERE id_laporan = $1', [uuid]);
  return hasil.rowCount > 0;
}

// Q-016: foto tidak diambil agar antrean ringan (KF08)
export async function ambilMenungguVerifikasi(db = pool) {
  const hasil = await db.query(
    `SELECT l.id_laporan, l.waktu_unggah,
            j.id_jadwal, j.id_petak, j.jenis_pekerjaan,
            r.nama AS nama_relawan
     FROM laporan_bukti_kerja l
     JOIN jadwal_pekerjaan j ON j.id_jadwal = l.id_jadwal
     JOIN relawan_lapangan r ON r.id_relawan = j.id_relawan
     WHERE l.status = 'menunggu verifikasi'
     ORDER BY l.waktu_unggah ASC`
  );
  return hasil.rows.map((b) => ({
    idLaporan: b.id_laporan,
    idJadwal: b.id_jadwal,
    idPetak: b.id_petak,
    jenisPekerjaan: b.jenis_pekerjaan,
    namaRelawan: b.nama_relawan,
    waktuUnggah: b.waktu_unggah
  }));
}

// Q-017: foto ikut diambil untuk halaman detail petugas
export async function ambilById(idLaporan, db = pool) {
  const hasil = await db.query(
    `SELECT l.*, j.id_petak, j.id_relawan, j.jenis_pekerjaan, j.tanggal,
            r.nama AS nama_relawan
     FROM laporan_bukti_kerja l
     JOIN jadwal_pekerjaan j ON j.id_jadwal = l.id_jadwal
     JOIN relawan_lapangan r ON r.id_relawan = j.id_relawan
     WHERE l.id_laporan = $1`,
    [idLaporan]
  );
  if (hasil.rows.length === 0) return null;
  const b = hasil.rows[0];
  return {
    ...keObjek(b),
    foto: b.foto,
    idPetak: b.id_petak,
    idRelawan: b.id_relawan,
    jenisPekerjaan: b.jenis_pekerjaan,
    tanggalTugas: keTanggalISO(b.tanggal),
    namaRelawan: b.nama_relawan
  };
}

// Q-018: WHERE status mencegah laporan diputuskan dua kali (KF10)
export async function setujui(idLaporan, idPetugas, db = pool) {
  const hasil = await db.query(
    `UPDATE laporan_bukti_kerja
     SET status = 'terverifikasi', id_petugas_verifikasi = $2, waktu_verifikasi = NOW()
     WHERE id_laporan = $1 AND status = 'menunggu verifikasi'`,
    [idLaporan, idPetugas]
  );
  return hasil.rowCount > 0;
}

// Q-019
export async function tolak(idLaporan, alasan, db = pool) {
  const hasil = await db.query(
    `UPDATE laporan_bukti_kerja
     SET status = 'ditolak', alasan_penolakan = $2, waktu_verifikasi = NOW()
     WHERE id_laporan = $1 AND status = 'menunggu verifikasi'`,
    [idLaporan, alasan]
  );
  return hasil.rowCount > 0;
}
