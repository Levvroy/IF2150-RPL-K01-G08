// Data uji laporan bukti kerja untuk C10, C11, dan KNF06.
// Petak dari buatPetak() berbatas lat -88 s.d. -87.99 dan lng 101.40 s.d. 101.41.
import { randomUUID } from 'node:crypto';
import * as LaporanBuktiKerja from '../../models/LaporanBuktiKerja.js';
import { buatJadwal, resPalsu } from './fixture.js';

export const BATAS_PETAK_UJI = { latMin: -88, latMaks: -87.99, lngMin: 101.4, lngMaks: 101.41 };
export const DALAM_PETAK = { lat: -87.995, lng: 101.405 };

// Satu derajat lintang = R * pi / 180 meter pada rumus haversine (R = 6371000 m)
export const METER_PER_DERAJAT_LINTANG = (6371000 * Math.PI) / 180;

// Koordinat `meter` di utara batas petak uji, tepat di garis bujur tengah petak
export function utaraPetak(meter) {
  return { lat: BATAS_PETAK_UJI.latMaks + meter / METER_PER_DERAJAT_LINTANG, lng: DALAM_PETAK.lng };
}

export function fotoUji(ukuran = 64) {
  return Buffer.alloc(ukuran, 7);
}

// Membuat jadwal berstatus 'menunggu verifikasi' beserta satu laporannya
export async function buatLaporan(idRelawan, idPetak, { koordinat = DALAM_PETAK, waktuUnggah = new Date(), foto = fotoUji() } = {}) {
  const idJadwal = await buatJadwal(idRelawan, idPetak, 'menunggu verifikasi');
  const idLaporan = randomUUID();
  await LaporanBuktiKerja.simpan({ idLaporan, idJadwal, foto, koordinatUnggah: koordinat, waktuUnggah });
  return { idLaporan, idJadwal, foto };
}

// resPalsu ditambah set() karena C10 memasang header Cache-Control
export function resUji() {
  return { ...resPalsu(), set() { return this; } };
}
