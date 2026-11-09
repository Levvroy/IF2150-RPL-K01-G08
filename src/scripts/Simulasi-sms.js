import { cekAmbangRisiko } from '../controllers/PeringatanSMSController.js';
 
await cekAmbangRisiko([{ idPetak: 214, tingkatRisiko: 'tinggi' }]);
console.log('selesai');
process.exit(0);

// Skrip uji manual UC07: memicu pengiriman SMS untuk satu petak tanpa menunggu cron.
//
// CARA PAKAI (jalankan dari folder src)
//   Skrip : node --env-file=.env scripts/Simulasi-sms.js     (terminal shell)
//   Server: node --env-file=.env server.js                  (terminal lain, biarkan jalan)
//   Halaman: http://localhost:3000/simulasi-SMS/
//   SQL   : docker compose exec db psql -U sigap -d sigap
//
// DATA UJI (dari npm run seed): petak 214 punya warga 081300000001 dan 081300000002.
//
// LANGKAH UJI
// 0. Persiapan: npm run seed (mereset semua data). Pastikan NOMOR_TIDAK_AKTIF di .env kosong.
//    Restart server setelah mengubah .env.
//
// 1. SMS terkirim
//    Jalankan skrip, lalu refresh halaman.
//    Harapan: 2 pesan tampil, untuk ...0001 dan ...0002.
//    SQL: SELECT status, COUNT(*) FROM peringatan_sms GROUP BY status;
//    Harapan: terkirim = 2.
//
// 2. Batas 24 jam
//    Jalankan skrip lagi.
//    Harapan: tidak ada baris baru (hitungan di langkah 1 tetap sama).
//
// 3. Lewat 24 jam
//    SQL: UPDATE peringatan_sms SET waktu_kirim = NOW() - INTERVAL '25 hours';
//    Jalankan skrip lagi.
//    Harapan: pesan baru muncul untuk ...0001 dan ...0002 (terkirim = 4).
//
// 4. Balasan selain STOP
//    Di halaman, ketik "halo" pada kolom ...0002, lalu kirim.
//    SQL: SELECT nomor_hp, status_persetujuan FROM warga WHERE id_petak = 214;
//    Harapan: kedua nomor tetap 'aktif'.
//
// 5. Balasan STOP
//    Di halaman, ketik "stop" (huruf apa pun) pada kolom ...0001, lalu kirim.
//    SQL: SELECT nomor_hp, status_persetujuan FROM warga WHERE id_petak = 214;
//    Harapan: ...0001 menjadi 'dicabut', ...0002 tetap 'aktif'.
//
// 6. Warga yang sudah STOP tidak dikirimi lagi
//    SQL: UPDATE peringatan_sms SET waktu_kirim = NOW() - INTERVAL '25 hours';
//    Jalankan skrip lagi.
//    SQL: SELECT w.nomor_hp, p.status, p.waktu_kirim
//         FROM peringatan_sms p JOIN warga w ON w.id_warga = p.id_warga
//         ORDER BY p.waktu_kirim;
//    Harapan: ...0001 tidak punya baris baru, ...0002 punya baris baru.
//    Catatan: pesan lama ...0001 tetap tampil di halaman karena halaman menampilkan riwayat.
//
// 7. Kegagalan gateway (UC07 alternatif 1)
//    Isi .env: NOMOR_TIDAK_AKTIF=081300000002, lalu restart server.
//    SQL: UPDATE peringatan_sms SET waktu_kirim = NOW() - INTERVAL '25 hours';
//    Jalankan skrip lagi.
//    Harapan: ...0002 tercatat status 'gagal' dan tidak tampil di halaman.
//    Setelah selesai, kosongkan lagi NOMOR_TIDAK_AKTIF.
// CATATAN
//  - Skrip tetap mencetak "selesai" walau tidak ada penerima. Kalau halaman kosong,
//    cek apakah id petak di bawah punya warga: SELECT id_petak, nomor_hp FROM warga;
//  - Balasan di halaman (gelembung hitam) hilang saat refresh, tapi status di tabel warga tetap.
