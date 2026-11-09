import pool from '../db.js';

// Algo-013 and Q-020
export async function ambilAktifByPetak(idPetak) {
  const daftarWargaAktif = [];
  const { rows: hasilQuery } = await pool.query(
    `SELECT id_warga, nomor_hp, status_persetujuan, waktu_dicabut
     FROM warga WHERE id_petak = $1 AND status_persetujuan = 'aktif'`,
    [idPetak]
  );

  for (const baris of hasilQuery) {
    if (baris.status_persetujuan === 'aktif') {
      const wargaBaru = {
        idWarga: baris.id_warga,
        nomorHP: baris.nomor_hp,
        statusPersetujuan: baris.status_persetujuan,
      };
      daftarWargaAktif.push(wargaBaru);
    }
  }
  return daftarWargaAktif;
}

// Q-021
export async function cariByNomor(nomorHp) {
  const { rows } = await pool.query(
    `SELECT id_warga, nomor_hp, status_persetujuan, waktu_dicabut
     FROM warga WHERE nomor_hp = $1 LIMIT 1`,
    [nomorHp]
  );

  if (rows[0]) {
    return {
      idWarga: rows[0].id_warga,
      nomorHP: rows[0].nomor_hp,
      statusPersetujuan: rows[0].status_persetujuan,
      waktuDicabut: rows[0].waktu_dicabut,
    };
  } else {
    return null;
  }
}

// Q-022
export async function cabutPersetujuan(idWarga) {
  await pool.query(
    `UPDATE warga SET status_persetujuan = 'dicabut', waktu_dicabut = NOW()
     WHERE id_warga = $1 AND status_persetujuan = 'aktif'`,
    [idWarga]
  );
}
 
// Q-023 (KNF12)
export async function hapusDicabutLama(batasHari) {
  const { rowCount } = await pool.query(
    `DELETE FROM warga
     WHERE status_persetujuan = 'dicabut'
     AND waktu_dicabut < NOW() - ($1 * INTERVAL '1 day')
     RETURNING id_warga`,
    [batasHari]
  );
  return rowCount;
}

