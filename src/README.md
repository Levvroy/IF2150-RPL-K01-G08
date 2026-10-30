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
| PWA relawan | http://localhost:3000/relawan/ |
| Simulasi SMS warga | http://localhost:3000/simulasi-sms/ |

Mencoba PWA di ponsel Android tanpa deploy: aktifkan USB debugging, sambungkan ke laptop, buka `chrome://inspect` di Chrome laptop, aktifkan *Port forwarding* `3000 → localhost:3000`, lalu buka `localhost:3000/relawan/` di Chrome ponsel. Membuka lewat IP Wi-Fi (`http://192.168.x.x`) tidak bisa karena Service Worker dan GPS hanya jalan di HTTPS atau `localhost`.

Menjalankan tes:

```bash
npm test
```

## 5. Akun uji

Semua akun memakai password `sigap123`.

| Peran | Username |
| :--- | :--- |
| Petugas posko | `petugas1`, `petugas2` |
| Relawan lapangan | `relawan1`, `relawan2`, `relawan3` |

## 6. Modul dan pembagian anggota

| Modul | Use case | Penanggung jawab |
| :--- | :--- | :--- |
| Fondasi (server, database, seed, autentikasi) | UC08 | *[nama]* |
| Peta risiko | UC01 | *[nama]* |
| Penyusunan jadwal dan tandai keliru | UC02, UC06 | *[nama]* |
| Verifikasi laporan | UC03 | *[nama]* |
| Daftar tugas dan laporan luring | UC04, UC05 | *[nama]* |
| Peringatan SMS dan notifikasi | UC07 | *[nama]* |

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
