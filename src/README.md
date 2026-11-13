# SIGAP

Sistem pencegahan kebakaran lahan gambut (IF2150 Rekayasa Perangkat Lunak, K01 G08 firstTimeRPL). Petugas posko memantau peta risiko per petak 1 km yang dihitung dari titik panas NASA FIRMS dan curah hujan Open-Meteo, lalu menugaskan relawan. Relawan memakai PWA untuk melihat tugas dan mengunggah foto bukti kerja, termasuk saat luring. Warga menerima peringatan SMS yang disimulasikan.

> Prototipe: data historis dan fiktif serta SMS disimulasikan.

## 1. Teknologi

| Bagian | Teknologi | Versi |
| :--- | :--- | :--- |
| Runtime | Node.js | 22 LTS (minimal 22) |
| Server | Express | 5.x |
| Basis data | PostgreSQL | 16 |
| Pustaka server | `pg`, `bcrypt`, `jsonwebtoken`, `multer` | lihat `package.json` |
| Klien | HTML, CSS, JavaScript murni, Leaflet, Service Worker, IndexedDB | tanpa build step |

## 2. Prasyarat

- Node.js 22 LTS: https://nodejs.org
- Salah satu dari:
  - **PostgreSQL 16** terpasang di komputer (installer: https://www.postgresql.org/download/), atau
  - **Docker** dengan Docker Compose (memakai `docker-compose.yml` di folder ini).
- Google Chrome (untuk mencoba PWA relawan dan mode luring).

## 3. Instalasi dan konfigurasi

Semua perintah dijalankan dari folder `src/`.

```bash
cd src
npm install
```

Siapkan basis data, pilih salah satu.

**Pilihan A, PostgreSQL native.** Buat database kosong bernama `sigap`:

```bash
psql -U postgres -c "CREATE DATABASE sigap"
```

**Pilihan B, Docker.** Database `sigap` dibuat otomatis di port 5433:

```bash
docker compose up -d
```

Salin `.env.example` menjadi `.env`, lalu isi:

| Variabel | Isi |
| :--- | :--- |
| `DATABASE_URL` | Pilihan A: `postgres://postgres:PASSWORD_ANDA@localhost:5432/sigap`. Pilihan B: `postgres://sigap:sigap@localhost:5433/sigap` |
| `PORT` | `3000` |
| `JWT_SECRET` | String acak bebas, misalnya hasil `node -e "console.log(crypto.randomUUID())"` |
| `CRON_TOKEN` | String acak bebas |
| `MAP_KEY` | Boleh dikosongkan. Tanpa key, sistem memakai data titik panas historis dari seed |

Isi database dengan data uji. Perintah ini **menghapus dan membuat ulang** semua tabel:

```bash
npm run seed
```

Waktu titik panas historis digeser otomatis supaya terlihat sebagai data 24 jam terakhir.

## 4. Menjalankan

```bash
npm run perbarui   # menghitung skor risiko (pengganti cron 3 jam saat lokal)
npm start          # http://localhost:3000
```

| Halaman | Alamat |
| :--- | :--- |
| Petugas posko | http://localhost:3000/petugas/ |
| Antrean laporan (petugas) | http://localhost:3000/petugas/antrean.html |
| Susun jadwal (petugas) | http://localhost:3000/petugas/jadwal.html |
| PWA relawan | http://localhost:3000/relawan/ |
| Simulasi SMS warga | http://localhost:3000/simulasi-sms/ |

Mencoba PWA di ponsel Android tanpa deploy: aktifkan USB debugging, sambungkan ke laptop, buka `chrome://inspect` di Chrome laptop, aktifkan *Port forwarding* `3000 → localhost:3000`, lalu buka `localhost:3000/relawan/` di Chrome ponsel. Membuka lewat IP Wi-Fi (`http://192.168.x.x`) tidak bisa karena Service Worker dan GPS hanya jalan di HTTPS atau `localhost`.

Menjalankan tes:

```bash
npm test
```

Menjalankan tes database (UC02, UC06, UC07) membutuhkan database sudah menyala dan sudah di-seed:

```bash
npm run test:db
```

Cara menguji UC07:

```
Skrip uji manual UC07: memicu pengiriman SMS untuk satu petak tanpa menunggu cron.

CARA PAKAI (jalankan dari folder src)
  Skrip : node --env-file=.env scripts/simulasiSMS.js     (terminal shell)
  Server: node --env-file=.env server.js                   (terminal lain, biarkan jalan)
  Halaman: http://localhost:3000/simulasi-sms/
  SQL   : docker compose exec db psql -U sigap -d sigap

DATA UJI (dari npm run seed): petak 214 punya warga 081300000001 dan 081300000002.

LANGKAH UJI
0. Persiapan: npm run seed (mereset semua data). Pastikan NOMOR_TIDAK_AKTIF di .env kosong.
   Restart server setelah mengubah .env.

1. SMS terkirim
   Jalankan skrip, lalu refresh halaman.
   Harapan: 2 pesan tampil, untuk ...0001 dan ...0002.
   SQL: SELECT status, COUNT(*) FROM peringatan_sms GROUP BY status;
   Harapan: terkirim = 2.

2. Batas 24 jam
   Jalankan skrip lagi.
   Harapan: tidak ada baris baru (hitungan di langkah 1 tetap sama).

3. Lewat 24 jam
   SQL: UPDATE peringatan_sms SET waktu_kirim = NOW() - INTERVAL '25 hours';
   Jalankan skrip lagi.
   Harapan: pesan baru muncul untuk ...0001 dan ...0002 (terkirim = 4).

4. Balasan selain STOP
   Di halaman, ketik "halo" pada kolom ...0002, lalu kirim.
   SQL: SELECT nomor_hp, status_persetujuan FROM warga WHERE id_petak = 214;
   Harapan: kedua nomor tetap 'aktif'.

5. Balasan STOP
   Di halaman, ketik "stop" (huruf apa pun) pada kolom ...0001, lalu kirim.
   SQL: SELECT nomor_hp, status_persetujuan FROM warga WHERE id_petak = 214;
   Harapan: ...0001 menjadi 'dicabut', ...0002 tetap 'aktif'.

6. Warga yang sudah STOP tidak dikirimi lagi
   SQL: UPDATE peringatan_sms SET waktu_kirim = NOW() - INTERVAL '25 hours';
   Jalankan skrip lagi.
   SQL: SELECT w.nomor_hp, p.status, p.waktu_kirim
        FROM peringatan_sms p JOIN warga w ON w.id_warga = p.id_warga
        ORDER BY p.waktu_kirim;
   Harapan: ...0001 tidak punya baris baru, ...0002 punya baris baru.
   Catatan: pesan lama ...0001 tetap tampil di halaman karena halaman menampilkan riwayat.

7. Kegagalan gateway (UC07 alternatif 1)
   Isi .env: NOMOR_TIDAK_AKTIF=081300000002, lalu restart server.
   SQL: UPDATE peringatan_sms SET waktu_kirim = NOW() - INTERVAL '25 hours';
   Jalankan skrip lagi.
   Harapan: ...0002 tercatat status 'gagal' dan tidak tampil di halaman.
   Setelah selesai, kosongkan lagi NOMOR_TIDAK_AKTIF.
CATATAN
 - Skrip tetap mencetak "selesai" walau tidak ada penerima. Kalau halaman kosong,
   cek apakah id petak di bawah punya warga: SELECT id_petak, nomor_hp FROM warga;
 - Balasan di halaman (gelembung hitam) hilang saat refresh, tapi status di tabel warga tetap.
```

Cara menguji UC02 (login `petugas1`, buka http://localhost:3000/petugas/jadwal.html):

1. Pilih relawan Arga Simanjuntak, isi tanggal, petak, dan jenis pekerjaan, lalu tekan Simpan jadwal. Harapan: nama merah dan pesan "Arga Simanjuntak sudah punya 3 tugas aktif. ..." (409).
2. Ganti relawan ke Jonathan Lewie lalu simpan. Harapan: "Jadwal #n tersimpan", petak itu keluar dari Rekomendasi petak, dan notifikasi tugas muncul di tab Notifikasi `relawan2`.
3. Kosongkan Petak lalu simpan. Harapan: pesan "Semua isian jadwal wajib diisi", lalu pesan hilang begitu salah satu isian diubah.
4. Di halaman peta, klik sebuah petak lalu tekan "Susun jadwal untuk petak ini". Harapan: kolom Petak sudah terisi.

Cara menguji UC06 (login `relawan1`, buka http://localhost:3000/relawan/):

1. Buka tugas "Pengecekan titik panas" Petak 214, lalu tekan Tandai keliru.
2. Tekan Kirim penandaan tanpa keterangan. Harapan: pesan "Keterangan wajib diisi. Tulis apa yang Anda lihat di lokasi." yang hilang begitu mulai mengetik.
3. Isi keterangan lalu kirim. Harapan: kartu "Ditandai keliru" muncul dan tombol berubah menjadi "Sudah ditandai".
4. Muat ulang halaman lalu tandai lagi titik yang sama. Harapan: server membalas 409 dan layar menampilkannya seperti berhasil (KF15, batas 24 jam).
5. Buka tugas patroli. Harapan: tombol Tandai keliru tidak muncul.

## 5. Akun uji

Semua akun memakai password `sigap12345`.

| Peran | Username |
| :--- | :--- |
| Petugas posko | `petugas1`, `petugas2` |
| Relawan lapangan | `relawan1`, `relawan2`, `relawan3`, `relawan4`, `relawan5` |

## 6. Modul dan pembagian anggota

| Modul | Use case | Penanggung jawab |
| :--- | :--- | :--- |
| Fondasi (server, database, seed, autentikasi) | UC08 | Jonathan Lewie |
| Peta risiko | UC01 | Arga Cyrano Simanjuntak |
| Penyusunan jadwal dan tandai keliru | UC02, UC06 | Muhammad Rafi Insyan Syiham Abrar |
| Verifikasi laporan | UC03 | Muhammad Rafiif Ansyadya |
| Daftar tugas dan laporan luring | UC04, UC05 | Jonathan Lewie |
| Peringatan SMS dan notifikasi | UC07 | Reinhard Mikhael Tandra |

## 7. Basis data

Skema lengkap ada di [`sql/schema.sql`](sql/schema.sql).

| Tabel | Atribut |
| :--- | :--- |
| `pengguna` | id_pengguna, username, password_hash, peran |
| `relawan_lapangan` | id_relawan (= id_pengguna), nama, kontak, status_aktif |
| `petak_lahan` | id_petak, lat_min, lat_maks, lng_min, lng_maks, skor_risiko, tingkat_risiko, waktu_update_terakhir |
| `titik_panas` | id_titik_panas, latitude, longitude, waktu_deteksi, status_validitas, keterangan, waktu_tandai_keliru |
| `jadwal_pekerjaan` | id_jadwal, id_relawan, id_petak, id_titik_panas, jenis_pekerjaan, tanggal, status, alasan_pembatalan |
| `laporan_bukti_kerja` | id_laporan (UUID), id_jadwal, foto, lat_unggah, lng_unggah, waktu_unggah, status, alasan_penolakan, id_petugas_verifikasi, waktu_verifikasi |
| `warga` | id_warga, id_petak, nomor_hp, status_persetujuan, waktu_dicabut |
| `peringatan_sms` | id_peringatan, id_warga, id_petak, isi_pesan, waktu_kirim, status |
| `notifikasi` | id_notifikasi, id_pengguna, isi_pesan, waktu_dibuat, sudah_dibaca |

## 8. Sumber data

Titik panas: NASA FIRMS (https://firms.modaps.eosdis.nasa.gov). Curah hujan: Open-Meteo (https://open-meteo.com). Berkas `sql/data/titik_panas_contoh.csv` masih berisi titik contoh fiktif dengan format kolom ekspor FIRMS, dan akan diganti dengan ekspor arsip FIRMS asli untuk wilayah percontohan.
