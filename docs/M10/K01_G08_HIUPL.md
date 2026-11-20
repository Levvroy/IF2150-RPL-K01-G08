<h1>
IF2150 REKAYASA PERANGKAT LUNAK
<br>
TUGAS 10
<br>
HASIL IMPLEMENTASI DAN UJI PERANGKAT LUNAK (HIUPL)
</h1>
<br>

## *SIGAP*
<p align="center">
<img alt="Logo SIGAP" src="../assets/logo-sigap.png" width="100%">
</p>

### Untuk: *Amanda Aurellia Salsabilla*

Dipersiapkan oleh:
| Informasi | Keterangan |
| --- | --- |
| Kelas | K-01 |
| Kelompok | G-08 |

| NIM | Nama |
|---|---|
| 13525022 | Muhammad Rafi Insyan Syiham Abrar |
| 13525037 | Muhammad Rafiif Ansyadya |
| 13525076 | Reinhard Mikhael Tandra |
| 13525094 | Arga Cyrano Simanjuntak |
| 13525136 | Jonathan Lewie |

---

## Daftar Isi

- [BAB 1: Pendahuluan](#bab-1-pendahuluan)
  - [1.1 Tujuan Penulisan Dokumen](#11-tujuan-penulisan-dokumen)
  - [1.2 Lingkup Masalah](#12-lingkup-masalah)
  - [1.3 Definisi, Istilah, dan Singkatan](#13-definisi-istilah-dan-singkatan)
  - [1.4 Aturan Penomoran](#14-aturan-penomoran)
  - [1.5 Referensi](#15-referensi)
  - [1.6 Deskripsi Umum Dokumen (Ikhtisar)](#16-deskripsi-umum-dokumen-ikhtisar)
- [BAB 2: Deskripsi Umum Perangkat Lunak](#bab-2-deskripsi-umum-perangkat-lunak)
- [BAB 3: Implementasi](#bab-3-implementasi)
  - [3.1 Lingkungan Implementasi](#31-lingkungan-implementasi)
  - [3.2 Implementasi Modul](#32-implementasi-modul)
  - [3.3 Implementasi Antarmuka](#33-implementasi-antarmuka)
  - [3.4 File Lain](#34-file-lain)
- [BAB 4: Hasil Pengujian](#bab-4-hasil-pengujian)
  - [4.1 Strategi dan Kedalaman Pengujian Kelas](#41-strategi-dan-kedalaman-pengujian-kelas)
  - [4.2 Pengujian Unit Kelas](#42-pengujian-unit-kelas)
  - [4.3 Pengujian Integrasi](#43-pengujian-integrasi)
  - [4.4 Pengujian Use Case](#44-pengujian-use-case)
  - [4.5 Pengujian Kebutuhan Non-Fungsional (KNF)](#45-pengujian-kebutuhan-non-fungsional-knf)
  - [4.6 Tangkapan Layar dan Bukti Hasil Pengujian](#46-tangkapan-layar-dan-bukti-hasil-pengujian)
- [BAB 5: Traceability](#bab-5-traceability)

---

## Daftar Perubahan

| Revisi | Deskripsi |
| :--- | :--- |
| A | Versi pertama HIUPL. Melanjutkan dokumen Implementasi (Tugas 9, tag `v9.1`). Perubahan rancangan terhadap DPPL tetap mengacu pada Tabel B.1 dokumen Tugas 9; satu-satunya perubahan kode aplikasi sejak `v9.1` adalah variabel `FIRMS_BASE_URL` dan `OPEN_METEO_BASE_URL` pada `PetaRisikoController.js` agar tes integrasi dapat memakai server tiruan (lihat Subbab 3.1). |

---

# BAB 1: Pendahuluan

## 1.1 Tujuan Penulisan Dokumen
Dokumen ini berisi laporan hasil implementasi dan pengujian perangkat lunak SIGAP yang kami kerjakan pada Tugas 10. Di dalamnya kami mencatat lingkungan implementasi, modul, antarmuka, dan file yang sudah dibuat, kemudian hasil pengujian unit, integrasi, use case, serta kebutuhan non-fungsional lengkap dengan buktinya. Bagian akhir dokumen memuat matriks kerunutan dari kebutuhan ke kode dan test case. Kami menyusun dokumen ini sebagai pegangan tim untuk melihat kebutuhan mana yang sudah terpenuhi dan mana yang masih perlu diperbaiki, sekaligus sebagai bahan bagi asisten dan dosen IF2150 dalam memeriksa kesesuaian antara SKPL, rancangan, dan hasil implementasi.

## 1.2 Lingkup Masalah
SIGAP adalah sistem informasi berbasis peta untuk membantu pencegahan kebakaran lahan gambut di satu wilayah percontohan setingkat kecamatan. Server mengolah data titik panas dari NASA FIRMS dan data curah hujan dari Open-Meteo menjadi skor risiko untuk setiap petak berukuran 1 km x 1 km, dan skor inilah yang dipakai petugas posko ketika menugaskan relawan. Relawan menggunakan PWA untuk melihat tugas serta mengunggah foto bukti kerja (bisa juga saat luring), sementara warga di petak berisiko tinggi menerima SMS peringatan yang pada prototipe ini masih disimulasikan. SIGAP tidak dimaksudkan untuk menggantikan sistem pemerintah seperti SiPongi+, dan sistem eksternal yang terhubung dengannya hanya NASA FIRMS, Open-Meteo, tile OpenStreetMap, penjadwal cron, dan SMS gateway tiruan.

## 1.3 Definisi, Istilah, dan Singkatan

Tabel 1.3. Definisi Istilah dan Singkatan

| Singkatan, Akronim, atau Istilah | Penjelasan |
| :--- | :--- |
| P/L | Perangkat Lunak, yaitu aplikasi yang memberikan perintah kepada komputer untuk menjalankan tugas tertentu. |
| SKPL | Spesifikasi Kebutuhan Perangkat Lunak (Tugas 5). |
| APL | Arsitektur Perangkat Lunak (Tugas 6). |
| DPPL | Deskripsi Perancangan Perangkat Lunak (Tugas 7 dan revisinya pada Tugas 8, DPPL2), berisi rancangan arsitektur, kelas, algoritma, kueri, dan antarmuka P/L. |
| HIUPL | Hasil Implementasi dan Uji Perangkat Lunak, yaitu dokumen ini. |
| KF | Kebutuhan Fungsional. |
| KNF | Kebutuhan Non-Fungsional. |
| UC | Use Case. |
| TC | Test Case, yaitu satu kasus uji untuk skenario tertentu. |
| UT | Unit Test, yaitu test case tingkat kelas/operasi. |
| INT | Integration Test, yaitu test case yang menguji interaksi antarkomponen dengan komponen nyata (server Express, PostgreSQL, server tiruan API eksternal). |
| Boundary | Kasus uji pada nilai batas masukan, misalnya tepat 3 jam, tepat 200 m, tepat 300 karakter, atau laporan ke-20 dan ke-21. |
| Coverage | Persentase baris (*line*) dan cabang (*branch*) kode yang dieksekusi oleh pengujian, diukur dengan c8. |
| `node:test` | *Test runner* bawaan Node.js 22 yang dipakai untuk seluruh tes otomatis SIGAP. |
| c8 | Alat pengukur coverage berbasis coverage V8 bawaan Node.js. |
| `fake-indexeddb` | Implementasi IndexedDB di memori untuk Node.js, dipakai agar kode klien yang memakai IndexedDB bisa diuji tanpa peramban. |
| Server tiruan (*dummy*) | Server HTTP lokal yang dijalankan tes untuk meniru respons NASA FIRMS dan Open-Meteo, termasuk respons gagal (500/503) dan koneksi putus. |
| Luring | Kondisi perangkat tidak terhubung ke internet (*offline*). |
| PWA | *Progressive Web App*, aplikasi web yang dapat dipasang dan tetap berfungsi sebagian saat luring. |
| Seed | Skrip `src/sql/seed.js` yang mengosongkan lalu mengisi ulang basis data dengan data uji fiktif. |
| CDP | *Chrome DevTools Protocol*, protokol untuk mengendalikan Chrome dari skrip, dipakai `scripts/ukur-knf.js`. |

## 1.4 Aturan Penomoran
Pola ID yang kami pakai sama dengan SKPL dan DPPL2. Ada dua pola baru di dokumen ini, yaitu ID pengujian dan ID interaksi antarkomponen.

Tabel 1.4. Aturan Penomoran

| Hal/Bagian | Penomoran | Keterangan |
| :--- | :--- | :--- |
| Kebutuhan Fungsional | KFXX | KF01 sampai KF24, sesuai SKPL |
| Kebutuhan Non-Fungsional | KNFXX | KNF01 sampai KNF12, sesuai SKPL |
| Use Case | UCXX | UC01 sampai UC08, sesuai SKPL |
| Kelas | CXX | C01 sampai C24, sesuai DPPL2 Tabel 4.1 |
| Algoritma | Algo-XXX | Algo-001 sampai Algo-015, sesuai DPPL2 BAB 5 |
| Query | Q-XXX | Sesuai DPPL2 BAB 5 |
| Antarmuka layar | I-XX | I-01 sampai I-08, sesuai DPPL2 BAB 6 |
| Interaksi antarkomponen | IK-XX | Baru di dokumen ini (Tabel 4.3.1). Diberi awalan IK agar tidak bentrok dengan ID layar I-XX |
| Test Case Unit | CXX-UTYY | XX nomor kelas, YY nomor urut. Akhiran huruf (mis. C18-UT10b) menandai tes tambahan pada operasi yang sama. ID ini juga tertulis di nama tes pada keluaran `node:test` |
| Test Case Integrasi | INT-TCYY | YY nomor urut, INT-TC01 sampai INT-TC35 |
| Test Case Use Case | UCXX-TCYY | XX nomor use case, YY nomor urut skenario |
| Test Case KNF | KNFXX-TCYY | XX nomor KNF, YY nomor urut |

## 1.5 Referensi
1. Kelompok G-08 K-01. *Spesifikasi Kebutuhan Perangkat Lunak (SKPL) SIGAP*. Tugas 5, IF2150 Rekayasa Perangkat Lunak, 2026.
2. Kelompok G-08 K-01. *Arsitektur Perangkat Lunak (APL) SIGAP*. Tugas 6, IF2150 Rekayasa Perangkat Lunak, 2026.
3. Kelompok G-08 K-01. *Deskripsi Perancangan Perangkat Lunak (DPPL) SIGAP* dan revisinya (DPPL2). Tugas 7 dan Tugas 8, IF2150 Rekayasa Perangkat Lunak, 2026.
4. Kelompok G-08 K-01. *Implementasi Perangkat Lunak SIGAP*. Tugas 9, IF2150 Rekayasa Perangkat Lunak, 2026.
5. Node.js. *Test runner (`node:test`)* dan *Assert*. https://nodejs.org/docs/latest-v22.x/api/test.html
6. c8. *Native V8 code-coverage*. https://github.com/bcoe/c8
7. fake-indexeddb. https://github.com/dumbmatter/fakeIndexedDB
8. Express. *Express 5 documentation*. https://expressjs.com
9. node-postgres. https://node-postgres.com
10. PostgreSQL. *PostgreSQL 16 Documentation*. https://www.postgresql.org/docs/16/
11. Leaflet. *Leaflet 1.9.4 API reference*. https://leafletjs.com/reference.html
12. Chrome for Developers. *Network features reference (throttling)*, *Simulate mobile devices with device mode*, dan *Chrome DevTools Protocol*. https://developer.chrome.com/docs/devtools
13. W3C. *Web Content Accessibility Guidelines (WCAG) 2.1, Success Criterion 1.4.3 Contrast (Minimum)*. https://www.w3.org/TR/WCAG21/
14. MDN Web Docs. *Service Worker API*, *IndexedDB API*, dan *Geolocation API*. https://developer.mozilla.org/en-US/docs/Web/API

## 1.6 Deskripsi Umum Dokumen (Ikhtisar)
BAB 1 menjelaskan tujuan, lingkup masalah, istilah, aturan penomoran (termasuk ID pengujian), dan referensi. BAB 2 memberikan gambaran umum SIGAP beserta batas sistem dan sistem eksternalnya melalui diagram konteks dan use case diagram, lalu BAB 3 mencatat lingkungan implementasi serta modul, antarmuka, dan file yang sudah dibuat. BAB 4 berisi penentuan kedalaman pengujian tiap kelas dan hasil pengujian unit, integrasi, use case, serta KNF dengan buktinya. Terakhir, BAB 5 memetakan setiap KF dan KNF ke use case, kelas, file implementasi, dan test case.

<br>

---

# BAB 2: Deskripsi Umum Perangkat Lunak

SIGAP berbentuk aplikasi web monolit yang dibangun dengan Node.js dan Express. Ada dua antarmuka utama, yaitu aplikasi web untuk petugas posko di laptop dan PWA untuk relawan lapangan di ponsel Android, dan keduanya terhubung ke satu server aplikasi yang menyimpan data di PostgreSQL 16. Server yang sama juga menyajikan halaman simulasi SMS yang berperan sebagai ponsel warga.

<p align="center">
<img alt="Diagram Konteks SIGAP" src="../M5/assets/diagram/diagram_konteks.png" width="80%">
</p>
<p align="center">
<i>Gambar 2.1. Diagram Konteks SIGAP dan Sistem Eksternal</i>
</p>

Gambar 2.1 menunjukkan batas sistem SIGAP. Bagian yang termasuk P/L adalah server aplikasi, basis data, halaman petugas, PWA relawan, dan halaman simulasi SMS, sedangkan di luar batas tersebut terdapat lima sistem eksternal. Penjadwal cron memanggil `POST /api/perbarui` setiap 3 jam; ketika aplikasi dijalankan secara lokal, perannya kami gantikan dengan `npm run perbarui`. NASA FIRMS Area API dan Open-Meteo Forecast API hanya dipanggil dari sisi server oleh `PetaRisikoController`, sementara tile OpenStreetMap langsung dimuat oleh peramban petugas sebagai peta dasar. Untuk SMS gateway kami tidak memakai layanan sungguhan karena keterbatasan biaya, sehingga perannya digantikan oleh `SimulasiSMSController` dan halaman `/simulasi-sms/` (SKPL batasan 4). Data master seperti akun, relawan, warga, dan petak diisi melalui skrip seed karena SIGAP memang tidak menyediakan halaman pengelolaan data master (SKPL batasan 9).

<p align="center">
<img alt="Use Case Diagram SIGAP" src="../M5/assets/diagram/use_case_diagram.webp" width="80%">
</p>
<p align="center">
<i>Gambar 2.2. Use Case Diagram SIGAP</i>
</p>

Gambar 2.2 memuat tiga aktor dan delapan use case. Petugas Posko dapat memantau peta risiko (UC01), menyusun dan menugaskan jadwal (UC02), serta memverifikasi laporan bukti kerja (UC03). Relawan Lapangan dapat melihat daftar tugas prioritas sekaligus membatalkan tugas yang kondisinya tidak aman (UC04), mengunggah laporan bukti kerja walaupun sedang luring (UC05), dan menandai titik panas yang ternyata keliru (UC06). Warga tidak membuka aplikasi apa pun; mereka hanya menerima SMS peringatan dan bisa membalas STOP untuk berhenti berlangganan (UC07). Baik petugas maupun relawan masuk ke sistem melalui UC08. Perlu kami sampaikan juga bahwa seluruh data warga, relawan, dan titik panas pada prototipe ini merupakan data fiktif atau historis.

<br>

---

# BAB 3: Implementasi

Seluruh kode SIGAP berada di folder `src/`. Karena ditulis dalam JavaScript yang dijalankan langsung oleh Node.js di server dan oleh peramban di klien tanpa proses *build*, SIGAP tidak menghasilkan file *executable* hasil kompilasi; server cukup dijalankan dengan `npm start` (`node --env-file=.env server.js`). Pengujian di dokumen ini kami lakukan pada commit `c9e7a21` tanggal 20 November 2026, yang berisi kode aplikasi tag `v9.1` ditambah tes M10 dan satu perubahan kecil pada `PetaRisikoController.js` (dijelaskan di Subbab 3.1). Perubahan rancangan terhadap DPPL sudah kami catat di Tabel B.1 dokumen Tugas 9, jadi tidak kami ulang di sini.

## 3.1 Lingkungan Implementasi

Lingkungan implementasi masih sama dengan DPPL2 Subbab 2.1. Beberapa perubahan sudah kami catat di Tabel B.1 Tugas 9, yaitu basis data yang dijalankan secara lokal (PostgreSQL native atau Docker Compose), Neon dan Render yang menjadi opsional untuk deploy, serta cron yang diganti `npm run perbarui` saat lokal. Pada M10 kami hanya menambahkan dua variabel lingkungan opsional, `FIRMS_BASE_URL` dan `OPEN_METEO_BASE_URL`, supaya tes integrasi bisa mengarahkan `PetaRisikoController` ke server tiruan. Kalau kedua variabel itu dikosongkan, aplikasi tetap memakai alamat API yang asli.

Tabel 3.1. Lingkungan Implementasi

| Aspek | Keterangan |
| :--- | :--- |
| Hardware | Laptop pribadi masing-masing anggota (Windows dan macOS). Profiling M9 memakai laptop 16 *thread*. Uji KNF04 memakai emulasi perangkat Android pada Chrome DevTools (viewport 412x892, DPR 2,625), bukan ponsel fisik. |
| Operating System | Pengembangan: Windows 11 dan macOS. Hasil tes otomatis terbaru (Subbab 4.6) dijalankan ulang di Linux. Klien relawan: Android (Chrome). |
| Bahasa Pemrograman | JavaScript ES modules (Node.js 22 LTS, diuji dengan v22.23), SQL (PostgreSQL), HTML, dan CSS |
| Framework/Library | Server: Express 5.3.0, `pg` 8.23.1, `bcrypt` 6.0.0, `jsonwebtoken` 9.0.3, `multer` 2.5.0. Klien: JavaScript murni, Leaflet 1.9.4 (salinan lokal di `public/vendor/leaflet/`), font Inter (lokal), Service Worker API, IndexedDB API, Geolocation API |
| DBMS | PostgreSQL 16 (native di port 5432 atau `docker-compose.yml` di port 5433). IndexedDB di peramban relawan |
| Development Tools | Visual Studio Code, Git dan GitHub (branch per fitur, PR, issue), Docker Compose, Google Chrome DevTools, `curl`, `psql` |
| Testing Tools | `node:test` dan `node:assert` (unit dan integrasi), c8 12.0.0 (coverage), `fake-indexeddb` 6.2.8 (IndexedDB pada tes klien), server HTTP tiruan untuk FIRMS dan Open-Meteo (`tests/helpers/peta-risiko.js`), Chrome DevTools Network (throttling 3G) dan Device Mode, skrip `scripts/ukur-knf.js` (Chrome CDP untuk KNF07 dan KNF08) |

## 3.2 Implementasi Modul

Tabel 3.2. Implementasi Modul

| No | ID Kelas | Nama Modul/Kelas | Nama File Fisik | Nama File Executable |
| :--- | :--- | :--- | :--- | :--- |
| 1 | C01 | `HalamanPetaRisiko` | `src/public/petugas/js/HalamanPetaRisiko.js` | - (dimuat peramban dari `petugas/index.html`) |
| 2 | C02 | `PetaRisikoController` | `src/controllers/PetaRisikoController.js`; `src/scripts/perbarui.js` | - (dijalankan `server.js`; `npm run perbarui`) |
| 3 | C03 | `PetakLahan` | `src/models/PetakLahan.js` | - |
| 4 | C04 | `TitikPanas` | `src/models/TitikPanas.js` | - |
| 5 | C05 | `FormPenyusunanJadwal` | `src/public/petugas/js/FormPenyusunanJadwal.js` | - (dimuat dari `petugas/jadwal.html`) |
| 6 | C06 | `JadwalController` | `src/controllers/JadwalController.js` | - |
| 7 | C07 | `JadwalPekerjaan` | `src/models/JadwalPekerjaan.js` | - |
| 8 | C08 | `RelawanLapangan` | `src/models/RelawanLapangan.js` | - |
| 9 | C09 | `HalamanAntreanLaporan` | `src/public/petugas/js/HalamanAntreanLaporan.js` | - (dimuat dari `petugas/antrean.html`) |
| 10 | C10 | `VerifikasiLaporanController` | `src/controllers/VerifikasiLaporanController.js` | - |
| 11 | C11 | `LaporanBuktiKerja` | `src/models/LaporanBuktiKerja.js` | - |
| 12 | C12 | `HalamanDaftarTugas` | `src/public/relawan/js/HalamanDaftarTugas.js` | - (dimuat dari `relawan/index.html`) |
| 13 | C13 | `DaftarTugasController` | Server: `src/controllers/DaftarTugasController.js`. Klien: `src/public/relawan/js/DaftarTugasController.js` | - |
| 14 | C14 | `FormLaporanBuktiKerja` | `src/public/relawan/js/FormLaporanBuktiKerja.js` | - (dimuat dari `relawan/laporan.html`) |
| 15 | C15 | `UploadLaporanController` | Server: `src/controllers/UploadLaporanController.js`. Klien: `src/public/relawan/js/UploadLaporanController.js` | - |
| 16 | C16 | `DialogTandaiKeliru` | `src/public/relawan/js/DialogTandaiKeliru.js` | - |
| 17 | C17 | `DeteksiKeliruController` | Server: `src/controllers/DeteksiKeliruController.js`. Klien: `src/public/relawan/js/DeteksiKeliruController.js` | - |
| 18 | C18 | `PeringatanSMSController` | `src/controllers/PeringatanSMSController.js`; `src/scripts/simulasiSMS.js` (pemicu manual UC07) | - |
| 19 | C19 | `Warga` | `src/models/Warga.js` | - |
| 20 | C20 | `PeringatanSMS` | `src/models/PeringatanSMS.js` | - |
| 21 | C21 | `HalamanLogin` | `src/public/relawan/js/HalamanLogin.js` (dipakai `petugas/login.html` dan `relawan/login.html`) | - |
| 22 | C22 | `AutentikasiController` | Server: `src/controllers/AutentikasiController.js` dan `src/middleware/auth.js`. Klien: `src/public/relawan/js/AutentikasiController.js` | - |
| 23 | C23 | `Pengguna` | `src/models/Pengguna.js` | - |
| 24 | C24 | `Notifikasi` | `src/models/Notifikasi.js` | - |

## 3.3 Implementasi Antarmuka

Tabel 3.3. Implementasi Antarmuka

| No | ID Antarmuka | Nama Antarmuka | Nama File Fisik | Nama File Executable |
| :--- | :--- | :--- | :--- | :--- |
| 1 | I-01 | Halaman Login | `src/public/petugas/login.html`, `src/public/relawan/login.html`, `src/public/relawan/login.css`, `src/public/relawan/js/HalamanLogin.js` | - (dibuka di `/petugas/login.html` dan `/relawan/login.html`) |
| 2 | I-02 | Peta Risiko | `src/public/petugas/index.html`, `src/public/petugas/petugas.css`, `src/public/petugas/js/HalamanPetaRisiko.js` | - (`/petugas/`) |
| 3 | I-03 | Formulir Penyusunan Jadwal | `src/public/petugas/jadwal.html`, `src/public/petugas/js/FormPenyusunanJadwal.js` | - (`/petugas/jadwal.html`) |
| 4 | I-04 | Antrean Laporan Bukti Kerja | `src/public/petugas/antrean.html`, `src/public/petugas/js/HalamanAntreanLaporan.js` | - (`/petugas/antrean.html`) |
| 5 | I-05 | Daftar Tugas Relawan | `src/public/relawan/index.html`, `src/public/relawan/tugas.css`, `src/public/relawan/js/HalamanDaftarTugas.js` | - (`/relawan/`) |
| 6 | I-06 | Form Laporan Bukti Kerja | `src/public/relawan/laporan.html`, `src/public/relawan/laporan.css`, `src/public/relawan/js/FormLaporanBuktiKerja.js` | - (`/relawan/laporan.html?jadwal=<id>`) |
| 7 | I-07 | Dialog Tandai Keliru | `src/public/relawan/index.html` (elemen `#lembar-keliru`), `src/public/relawan/js/DialogTandaiKeliru.js` | - (dibuka dari detail tugas I-05) |
| 8 | I-08 | SMS Peringatan Dini (simulasi) | `src/public/simulasi-sms/index.html`, `src/public/simulasi-sms/simulasi-sms.css`, `src/public/simulasi-sms/js/simulasi-sms.js` | - (`/simulasi-sms/`) |

## 3.4 File Lain

Tabel 3.4. File Lain

| No | Nama File | Keterangan |
| :--- | :--- | :--- |
| 1 | `src/server.js` | Membuat aplikasi Express, memasang route API dan berkas statis, lalu menjalankan server |
| 2 | `src/db.js` | Satu `Pool` koneksi `pg` yang dipakai semua Model |
| 3 | `src/controllers/SimulasiSMSController.js` | Wujud `SMSGatewaySimulasi`: `kirimKeGateway` (menolak nomor di `NOMOR_TIDAK_AKTIF`) dan endpoint `/api/simulasi-sms/*` untuk halaman I-08 |
| 4 | `src/public/relawan/js/PenyimpananLokal.js` | Pembungkus IndexedDB `sigap` (store `salinanTugas` dan `laporanTertunda`) yang dipakai C13 dan C15 |
| 5 | `src/public/relawan/sw.js`, `src/public/relawan/manifest.json` | Service Worker (cache berkas PWA untuk luring) dan manifest PWA relawan |
| 6 | `src/public/sigap.css`, `src/public/gambar/` | Gaya bersama dan gambar (logo, latar login) |
| 7 | `src/public/vendor/leaflet/`, `src/public/vendor/inter/` | Salinan lokal Leaflet 1.9.4 dan font Inter agar tidak bergantung CDN |
| 8 | `src/sql/schema.sql` | Skema tabel, `CHECK` constraint status, dan indeks |
| 9 | `src/sql/seed.js` | Mengisi ulang data uji fiktif: 2 petugas, 5 relawan, 99 petak, 4 warga, 28 titik panas, 5 jadwal |
| 10 | `src/sql/data/titik_panas_contoh.csv`, `src/sql/data/foto-contoh.jpg` | Data titik panas berformat ekspor FIRMS dan foto contoh laporan untuk seed |
| 11 | `src/scripts/perbarui.js` | Pengganti cron saat lokal, memanggil `perbaruiData` dengan `CRON_TOKEN` |
| 12 | `src/scripts/simulasiSMS.js` | Memicu `cekAmbangRisiko` untuk satu petak (uji manual UC07) |
| 13 | `src/scripts/ukur-knf.js` | Skrip pengukuran KNF07 (30 permintaan HTTP) dan KNF08 (posisi tombol, ukuran target sentuh, dan kontras lewat Chrome CDP) |
| 14 | `src/package.json`, `src/package-lock.json` | Dependensi dan skrip `start`, `dev`, `seed`, `perbarui`, `test`, `test:db`, `test:int`, `test:semua`, `coverage` |
| 15 | `src/.env.example` | Daftar variabel lingkungan tanpa nilai (`DATABASE_URL`, `PORT`, `JWT_SECRET`, `CRON_TOKEN`, `MAP_KEY`, `NOMOR_TIDAK_AKTIF`, `FIRMS_BASE_URL`, `OPEN_METEO_BASE_URL`) |
| 16 | `src/docker-compose.yml` | Satu service `postgres:16` di port 5433 untuk yang tidak memasang PostgreSQL native |
| 17 | `src/tests/*.test.js` | Tes unit tanpa basis data (`npm test`, 80 tes) |
| 18 | `src/tests/db/*.test.js` | Tes unit yang memerlukan PostgreSQL (`npm run test:db`, 148 tes) |
| 19 | `src/tests/int/*.int.test.js` | Tes integrasi dan KNF dengan server, basis data, dan server tiruan nyata (`npm run test:int`, 42 tes) |
| 20 | `src/tests/helpers/fixture.js`, `laporan.js`, `peta-risiko.js`, `server.js` | Data uji, pembuat laporan uji, server tiruan FIRMS/Open-Meteo, serta fungsi menyalakan dan menghentikan server untuk tes integrasi |
| 21 | `docs/M10/assets/bukti/` | Keluaran *test runner*, laporan coverage, dan tangkapan layar bukti pengujian |

<br>

---

# BAB 4: Hasil Pengujian

Semua pengujian kami lakukan pada commit `c9e7a21` (kode aplikasi `v9.1`) dengan `node:test` sebagai *test runner*. Tes unit yang tidak membutuhkan basis data dijalankan dengan `npm test`, tes yang membutuhkan PostgreSQL dengan `npm run test:db`, tes integrasi dengan `npm run test:int`, dan apabila ingin menjalankan semuanya sekaligus beserta laporan coverage dapat memakai `npm run coverage`. Sebelum menjalankan `test:db` dan `test:int`, basis data perlu sudah menyala dan diisi lewat `npm run seed`. Untuk pengujian use case dan sebagian KNF (KNF01, KNF04, KNF08), kami melakukannya secara manual atau dengan alat ukur di Chrome, dan buktinya berupa tangkapan layar.

Ringkasan hasil `npm run coverage` terakhir (20/11/2026, bukti `coverage-semua-20112026.txt`):

| Kelompok | Jumlah tes | Pass | Fail | Keterangan |
| :--- | :--- | :--- | :--- | :--- |
| `npm test` (unit tanpa DB) | 80 | 80 | 0 | - |
| `npm run test:db` (unit dengan DB) | 148 | 148 | 0 | - |
| `npm run test:int` (integrasi dan KNF) | 42 | 38 | 3 | Satu tes berstatus `todo` (KNF05-TC02, lihat Subbab 4.5). Tiga tes yang gagal (KNF10-TC01, KNF12-TC01, KNF12-TC02) memanggil `POST /api/perbarui` yang mengakses Open-Meteo asli, sedangkan lingkungan saat tes dijalankan ulang tidak memiliki akses internet ke Open-Meteo. Ketiga tes tersebut lulus ketika dijalankan dengan koneksi internet (bukti `hasil-tes-knf10.txt` dan `hasil-tes-knf12.txt`). |

## 4.1 Strategi dan Kedalaman Pengujian Kelas

Kami menggolongkan kelas sebagai Mendalam apabila kelas tersebut memuat algoritma pada DPPL (Algo-xxx), perhitungan, validasi, aturan status, integrasi eksternal, atau hal yang berkaitan dengan keamanan. Kelas yang hanya meneruskan kueri atau berisi aturan sederhana kami golongkan sebagai Sedang. Sementara itu, kelas *View* yang tugasnya hanya menampilkan data dari *Controller* kami golongkan sebagai Tidak perlu, karena kelas tersebut tetap ikut teruji secara tidak langsung melalui test case use case.

Tabel 4.1.1. Identifikasi Tingkat Pengujian Kelas

| ID Kelas | Nama Kelas | Tingkat | Alasan | Test Case Terkait |
| :--- | :--- | :--- | :--- | :--- |
| C02 | `PetaRisikoController` | Mendalam | Memuat Algo-001 (`perbaruiData`: ambil FIRMS dan Open-Meteo, hitung skor, simpan, picu SMS) dan Algo-002 (`ambilDataPeta`, penanda cache usang KF04), rumus skor KF02, penguraian CSV FIRMS, dan validasi token cron | C02-UT01 s.d. C02-UT24, INT-TC30 s.d. INT-TC35, KNF02-TC01, KNF02-TC02 |
| C04 | `TitikPanas` | Mendalam | Memuat Algo-003 `isDikecualikan` (batas 24 jam dan radius 500 m, KF15), haversine, dan aturan penandaan ulang Q-007 | C04-UT01 s.d. C04-UT19, INT-TC21 s.d. INT-TC23 |
| C06 | `JadwalController` | Mendalam | Memuat Algo-004: validasi isian, validasi kapasitas 3 tugas aktif (KF06), pemetaan kode galat PostgreSQL ke 400, dan notifikasi tugas (KF07) | C06-UT01 s.d. C06-UT13, INT-TC16 s.d. INT-TC20 |
| C10 | `VerifikasiLaporanController` | Mendalam | Memuat Algo-005 `hitungJarak` (haversine ke batas petak, KF09, KNF06) dan Algo-006 transaksi setuju/tolak yang mengunci laporan (KF10, KF24) | C10-UT01 s.d. C10-UT37, INT-TC09 s.d. INT-TC15, KNF06-TC01 |
| C13 | `DaftarTugasController` | Mendalam | Memuat Algo-007 (`muatDaftarTugas` dengan salinan lokal saat luring) dan Algo-008 (pembatalan tugas dengan validasi alasan dan kepemilikan, KF21), serta pengurutan skor risiko (KF11) | C13-UT01 s.d. C13-UT14, INT-TC03 s.d. INT-TC05, INT-TC29 |
| C15 | `UploadLaporanController` | Mendalam | Memuat Algo-009, Algo-010, dan Algo-011: penyimpanan luring maksimal 20 laporan, sinkron otomatis, penolakan UUID ganda (KNF03), batas foto 500 KB (KNF09), dan transaksi perubahan status tugas | C15-UT01 s.d. C15-UT19, INT-TC06 s.d. INT-TC08 |
| C18 | `PeringatanSMSController` | Mendalam | Memuat Algo-012 `cekAmbangRisiko` (batas 24 jam, warga aktif, status gagal gateway), pemrosesan balasan STOP (KF22), dan penghapusan nomor dicabut lebih dari 30 hari (KNF12) | C18-UT01 s.d. C18-UT12c, INT-TC24 s.d. INT-TC28, KNF10-TC01, KNF12-TC01, KNF12-TC02 |
| C19 | `Warga` | Mendalam | Memuat Algo-013 `ambilAktifByPetak` dan aturan pencabutan persetujuan serta batas hari penghapusan | C19-UT01 s.d. C19-UT05b |
| C20 | `PeringatanSMS` | Mendalam | Memuat Algo-014 `adaDalam24Jam` (aturan batas 24 jam, hanya status terkirim yang dihitung) | C20-UT01 s.d. C20-UT04 |
| C22 | `AutentikasiController` | Mendalam | Menangani keamanan: verifikasi kredensial (Algo-015), pesan gagal umum (KF19), token JWT 7 hari (KNF11), middleware `cekLogin` dan `cekPeran` (KNF05), serta pemeriksaan sesi luring di klien (KF20) | C22-UT01 s.d. C22-UT19, INT-TC01, INT-TC02, KNF11-TC01 |
| C03 | `PetakLahan` | Sedang | Kueri CRUD Q-001 sampai Q-004; satu-satunya aturan adalah pengecualian petak bertugas aktif pada rekomendasi (Q-003) | C03-UT01 s.d. C03-UT07, INT-TC34 |
| C07 | `JadwalPekerjaan` | Sedang | Kueri Q-008 sampai Q-011; aturan status ditaruh di klausa `WHERE` (`perbaruiStatus`, `batalkan`) | C07-UT01 s.d. C07-UT07; `perbaruiStatus` dan `batalkan` lewat C10-UT21, C10-UT27, C13-UT09 s.d. C13-UT11, C15-UT01, C15-UT05, INT-TC05 |
| C08 | `RelawanLapangan` | Sedang | Dua kueri (Q-012, Q-013) tanpa logika tambahan | Lewat alur C06-UT04, C06-UT05, C06-UT08, C06-UT09, INT-TC16, INT-TC18 |
| C11 | `LaporanBuktiKerja` | Sedang | Kueri Q-014 sampai Q-019; `setujui` dan `tolak` hanya mengubah laporan berstatus menunggu (penguncian KF10) | C11-UT01 s.d. C11-UT08; `simpan` dan `cekUUIDAda` lewat C15-UT01 s.d. C15-UT03, INT-TC06, INT-TC07 |
| C17 | `DeteksiKeliruController` | Sedang | Controller tipis: validasi keterangan, cek kepemilikan tugas, lalu meneruskan ke `TitikPanas.tandaiKeliru` | C17-UT01 s.d. C17-UT08, INT-TC21 s.d. INT-TC23 |
| C23 | `Pengguna` | Sedang | Kueri `cariByUsername`, `ambilByPeran`, dan `cekPassword` yang hanya memanggil `bcrypt.compare` | Lewat C22-UT10 s.d. C22-UT12, INT-TC01, INT-TC02, KNF11-TC01 |
| C24 | `Notifikasi` | Sedang | Kueri Q-028 sampai Q-030 dan pemetaan ke camelCase | C24-UT01 s.d. C24-UT04b, INT-TC17, INT-TC29 |
| C01 | `HalamanPetaRisiko` | Tidak perlu | Kelas *View*: menggambar petak Leaflet, atribusi, keterangan cache, dan notifikasi dari JSON C02 | UC01-TC01, UC01-TC02, KNF01-TC01 |
| C05 | `FormPenyusunanJadwal` | Tidak perlu | Kelas *View* formulir jadwal dan pesannya | UC02-TC01, UC02-TC02 |
| C09 | `HalamanAntreanLaporan` | Tidak perlu | Kelas *View* antrean, detail, dan peringatan jarak | UC03-TC01 s.d. UC03-TC04 |
| C12 | `HalamanDaftarTugas` | Tidak perlu | Kelas *View* daftar tugas, penanda luring, dan form pembatalan | UC04-TC01 s.d. UC04-TC04, KNF04-TC01 |
| C14 | `FormLaporanBuktiKerja` | Tidak perlu | Kelas *View* formulir laporan; kamera dan GPS memakai API peramban | UC05-TC01 s.d. UC05-TC04, KNF08-TC01 |
| C16 | `DialogTandaiKeliru` | Tidak perlu | Kelas *View* dialog keterangan | UC06-TC01, UC06-TC02 |
| C21 | `HalamanLogin` | Tidak perlu | Kelas *View* form login dan keadaannya | UC08-TC01 s.d. UC08-TC03 |

## 4.2 Pengujian Unit Kelas

Untuk kelas Mendalam, kami menguji operasi public dengan kasus normal, batas, dan negatif dengan target coverage minimal 70% line dan branch. Kelas Sedang cukup diuji dengan setidaknya satu kasus normal dan satu kasus gagal pada operasi public utamanya. Kolom Hasil Pengujian kami isi berdasarkan keluaran `node:test`, dan tulisan "Sesuai" berarti seluruh *assertion* pada tes tersebut terpenuhi.

Cara menjalankan unit test (dari folder `src/`):
```bash
npm test             # unit tanpa basis data
npm run seed         # wajib sebelum tes basis data
npm run test:db      # unit dengan PostgreSQL
npm run coverage     # semua tes beserta laporan coverage c8
```

Lokasi file test: `src/tests/` (tanpa basis data) dan `src/tests/db/` (dengan basis data).

Angka coverage pada subbab ini kami ambil dari hasil `npm run coverage` tanggal 20/11/2026 (`coverage-semua-20112026.txt`) yang diukur dengan c8 (`--include=controllers --include=models --include=middleware --include=public`).

### 4.2.1 Kelas PetaRisikoController

**ID Kelas:** C02
**Nama Kelas:** `PetaRisikoController`
**Tingkat:** Mendalam
**File test:** `tests/c02-peta-risiko.test.js`, `tests/db/c02-peta-risiko.test.js`
**Penanggung jawab:** Arga Cyrano Simanjuntak

Tabel 4.2.1. Hasil Pengujian Unit Kelas C02

| ID Pengujian | Operasi yang Diuji | Jenis Kasus | Prosedur/Masukan | Hasil yang Diharapkan | Hasil Pengujian | Kesimpulan |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| C02-UT01 | `tingkatDariSkor` | Normal | Skor di rentang rendah, sedang, dan tinggi | Masing-masing diklasifikasikan `rendah`, `sedang`, `tinggi` | Klasifikasi sesuai | Pass |
| C02-UT02 | `tingkatDariSkor` | Batas | Skor tepat 30 dan tepat 60 | 30 menjadi `sedang`, 60 menjadi `tinggi` | Sesuai ambang | Pass |
| C02-UT03 | `hitungHariKering` | Normal | Curah hujan harian dengan beberapa hari < 1 mm di akhir | Jumlah hari kering berturut-turut dari akhir | Jumlah sesuai | Pass |
| C02-UT04 | `hitungHariKering` | Batas | Hari dengan curah hujan tepat 1 mm; larik kosong | 1 mm menghentikan hitungan; larik kosong bernilai 0 | Sesuai | Pass |
| C02-UT05 | `hitungSkorRisiko` | Normal | Titik berlaku, data cuaca, dan daftar petak | Skor dan tingkat tiap petak sesuai rumus KF02 | Skor sesuai rumus | Pass |
| C02-UT06 | `hitungSkorRisiko` | Batas | Titik tepat di batas petak; curah hujan besar | Batas setengah terbuka diterapkan; skor tidak di bawah 0 | Sesuai | Pass |
| C02-UT07 | `hitungSkorRisiko` | Negatif | Daftar petak atau data cuaca kosong | Tidak melempar galat | Aman tanpa galat | Pass |
| C02-UT08 | `isDataUsang` | Normal | Waktu pembaruan < 3 jam dan > 3 jam | `false` untuk < 3 jam, `true` untuk > 3 jam | Sesuai | Pass |
| C02-UT09 | `isDataUsang` | Batas | Tepat 3 jam dan 3 jam + 1 ms | Tepat 3 jam `false`, lewat 1 ms `true` | Sesuai | Pass |
| C02-UT10 | `isDataUsang` | Negatif | `null` dan tanggal tidak valid | `true` | Sesuai | Pass |
| C02-UT11 | `perbaruiData` | Negatif | Token salah dan `CRON_TOKEN` kosong | Status 401 | Dibalas 401 | Pass |
| C02-UT12 | `perbaruiDataHandler` | Negatif | Header `Authorization` kosong atau Bearer salah | 401 | Dibalas 401 | Pass |
| C02-UT13 | `perbaruiData` (Algo-001) | Normal | FIRMS dan Open-Meteo tiruan sukses | Titik tersimpan dan skor petak di DB diperbarui | Sesuai | Pass |
| C02-UT14 | `perbaruiData` dan `picuCekAmbang` | Normal | Petak naik ke tingkat tinggi | SMS tercatat untuk warga aktif di petak (KF16) | SMS tercatat | Pass |
| C02-UT15 | `perbaruiData` | Negatif | `MAP_KEY` kosong, FIRMS HTTP gagal, CSV kosong, jaringan putus | Tetap 200 memakai titik di DB (KNF02) | Dibalas 200 | Pass |
| C02-UT16 | `perbaruiData` | Batas | Baris CSV cacat, jam pendek, `precipitation_sum` kosong | Baris cacat disaring tanpa galat | Sesuai | Pass |
| C02-UT17 | `perbaruiData` | Negatif | Open-Meteo gagal | 500 dan skor petak lama tidak berubah (KF04) | Cache utuh | Pass |
| C02-UT18 | `perbaruiData` | Negatif | `hapusNomorDicabut` melempar galat | Galat hanya dicatat; respons tetap 200 | Dibalas 200 | Pass |
| C02-UT19 | `perbaruiDataHandler` | Normal | Token Bearer valid | 200 beserta ringkasan JSON | Dibalas 200 | Pass |
| C02-UT20 | `ambilDataPeta` (Algo-002) | Normal | Data segar | Petak, notifikasi belum dibaca, `isUsang: false` | Sesuai | Pass |
| C02-UT21 | `ambilDataPeta` | Batas | Satu petak lebih dari 3 jam | `isUsang: true`, `waktuUpdate` paling lama | Sesuai | Pass |
| C02-UT22 | `ambilDataPeta` | Batas | Satu petak `waktu_update_terakhir` NULL | `waktuUpdate: null`, `isUsang: true` | Sesuai | Pass |
| C02-UT23 | `ambilDataPeta` | Negatif | Tabel `petak_lahan` kosong | 404 | Dibalas 404 | Pass |
| C02-UT24 | `ambilDataPeta` | Negatif | Galat basis data | 500 | Dibalas 500 | Pass |

Tabel 4.2.1b. Ringkasan Cakupan Kelas C02

| Informasi | Keterangan |
| :--- | :--- |
| Daftar operasi public pada DPPL | `perbaruiData`, `ambilDataPeta`, `tandaiNotifikasiDibaca` |
| Operasi yang diuji | `perbaruiData` (beserta `perbaruiDataHandler`), `ambilDataPeta`, dan fungsi bantu yang diekspor (`tingkatDariSkor`, `hitungHariKering`, `hitungSkorRisiko`, `isDataUsang`). `tandaiNotifikasiDibaca` tidak ada di C02 karena dipindah ke C13 (Tabel B.1 Tugas 9 no. 45) dan diuji di C13-UT12 s.d. C13-UT14 |
| ID Algoritma yang tercakup | Algo-001, Algo-002 |
| Coverage (wajib minimal 70%) | 100% line / 98,64% branch (c8; bukti `coverage-semua-20112026.txt` dan `coverage-c02-c03-c04.txt`) |

### 4.2.2 Kelas PetakLahan

**ID Kelas:** C03
**Nama Kelas:** `PetakLahan`
**Tingkat:** Sedang
**File test:** `tests/db/c03-petak-lahan.test.js`
**Penanggung jawab:** Arga Cyrano Simanjuntak

Tabel 4.2.2. Hasil Pengujian Unit Kelas C03

| ID Pengujian | Operasi yang Diuji | Jenis Kasus | Prosedur/Masukan | Hasil yang Diharapkan | Hasil Pengujian | Kesimpulan |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| C03-UT01 | `ambilSemua` (Q-001) | Normal | DB hasil seed | Semua petak terurut `id_petak` beserta `batasWilayah` | Sesuai | Pass |
| C03-UT02 | `ambilById` (Q-002) | Normal | `idPetak` yang ada | Detail satu petak | Sesuai | Pass |
| C03-UT03 | `ambilById` | Negatif | `idPetak` tidak ada | `null` | `null` | Pass |
| C03-UT04 | `ambilRekomendasi` (Q-003) | Normal | Beberapa petak, sebagian punya tugas aktif | Urut skor tertinggi, petak bertugas aktif dikecualikan (KF17) | Sesuai | Pass |
| C03-UT05 | `ambilRekomendasi` | Batas | `batas` lebih kecil dari jumlah petak | Jumlah hasil sesuai batas | Sesuai | Pass |
| C03-UT06 | `perbaruiSkor` (Q-004) | Normal | Skor dan tingkat baru | Kolom skor, tingkat, dan waktu pembaruan berubah | Sesuai | Pass |
| C03-UT07 | `perbaruiSkor` | Negatif | `idPetak` tidak ada | Tidak ada galat, petak lain tidak berubah | Sesuai | Pass |

Coverage C03: 100% line / 100% branch.

### 4.2.3 Kelas TitikPanas

**ID Kelas:** C04
**Nama Kelas:** `TitikPanas`
**Tingkat:** Mendalam
**File test:** `tests/c04-titik-panas.test.js`, `tests/db/c04-titik-panas.test.js`
**Penanggung jawab:** Arga Cyrano Simanjuntak

Tabel 4.2.3. Hasil Pengujian Unit Kelas C04

| ID Pengujian | Operasi yang Diuji | Jenis Kasus | Prosedur/Masukan | Hasil yang Diharapkan | Hasil Pengujian | Kesimpulan |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| C04-UT01 | `haversine` | Batas | Dua koordinat identik | 0 km | 0 km | Pass |
| C04-UT02 | `haversine` | Normal | Selisih lintang 0,009° | Sekitar 1 km | ≈ 1 km | Pass |
| C04-UT03 | `isDikecualikan` (Algo-003) | Normal | Titik keliru < 24 jam, tanpa deteksi baru dalam 500 m | `true` (dikecualikan) | `true` | Pass |
| C04-UT04 | `isDikecualikan` | Negatif | Titik `valid` atau tanpa `waktuTandaiKeliru` | `false` | `false` | Pass |
| C04-UT05 | `isDikecualikan` | Batas | Tepat 24 jam dan 24 jam 1 detik | 24 jam `true`, 24 jam 1 detik `false` | Sesuai | Pass |
| C04-UT06 | `isDikecualikan` | Batas | Deteksi baru tepat 500 m dan > 500 m | Jarak 500 m atau kurang membatalkan pengecualian, lebih dari 500 m tetap dikecualikan | Sesuai | Pass |
| C04-UT07 | `isDikecualikan` | Batas | Deteksi < 500 m tetapi sebelum/tepat waktu penandaan | Diabaikan (tetap dikecualikan) | Sesuai | Pass |
| C04-UT08 | `simpanBaru` (Q-005) | Normal | Larik titik baru | Jumlah baris tersimpan dikembalikan | Sesuai | Pass |
| C04-UT09 | `simpanBaru` | Negatif | Titik dengan lat, lng, dan waktu yang sama | Duplikat diabaikan (`ON CONFLICT`) | Tidak dobel | Pass |
| C04-UT10 | `simpanBaru` | Batas | Larik kosong | 0, tidak ada baris baru | 0 | Pass |
| C04-UT11 | `ambilTitikBerlaku` (Q-006) | Normal | Titik 24 jam terakhir dan yang lebih lama | Hanya titik 24 jam terakhir | Sesuai | Pass |
| C04-UT12 | `ambilTitikBerlaku` | Normal | Titik bertanda keliru < 24 jam | Titik dikecualikan (KF15) | Sesuai | Pass |
| C04-UT13 | `ambilTitikBerlaku` | Batas | Titik keliru dengan deteksi baru dalam 500 m | Titik kembali berlaku | Sesuai | Pass |
| C04-UT14 | `ambilById` | Normal | ID yang ada | Objek camelCase lengkap | Sesuai | Pass |
| C04-UT15 | `ambilById` | Negatif | ID tidak ada | `null` | `null` | Pass |
| C04-UT16 | `tandaiKeliru` (Q-007) | Normal | ID dan keterangan | Status `keliru`, keterangan dan waktu tersimpan | Sesuai | Pass |
| C04-UT17 | `tandaiKeliru` | Negatif | Tandai ulang dalam 24 jam | `false`, keterangan lama tetap | Sesuai | Pass |
| C04-UT18 | `tandaiKeliru` | Batas | Tandai ulang setelah lewat 24 jam | `true` | `true` | Pass |
| C04-UT19 | `tandaiKeliru` | Negatif | ID tidak ada | `false` | `false` | Pass |

Tabel 4.2.3b. Ringkasan Cakupan Kelas C04

| Informasi | Keterangan |
| :--- | :--- |
| Daftar operasi public pada DPPL | `simpanBaru`, `ambilTitikBerlaku`, `tandaiKeliru` (dan `isDikecualikan` yang privat di DPPL, diekspor untuk pengujian) |
| Operasi yang diuji | `simpanBaru`, `ambilTitikBerlaku`, `tandaiKeliru`, `isDikecualikan`, ditambah `ambilById` dan `haversine` |
| ID Algoritma yang tercakup | Algo-003 |
| Coverage (wajib minimal 70%) | 100% line / 100% branch |

### 4.2.4 Kelas JadwalController

**ID Kelas:** C06
**Nama Kelas:** `JadwalController`
**Tingkat:** Mendalam
**File test:** `tests/c06-jadwal.test.js`, `tests/db/c06-jadwal.test.js`
**Penanggung jawab:** Muhammad Rafi Insyan Syiham Abrar

Tabel 4.2.4. Hasil Pengujian Unit Kelas C06

| ID Pengujian | Operasi yang Diuji | Jenis Kasus | Prosedur/Masukan | Hasil yang Diharapkan | Hasil Pengujian | Kesimpulan |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| C06-UT01 | `buatJadwal` | Negatif | Tanpa body atau body kosong | 400 tanpa menyentuh DB | Dibalas 400 | Pass |
| C06-UT02 | `buatJadwal` | Batas | `idRelawan`/`idPetak` bernilai 0, negatif, pecahan, teks | 400 | Dibalas 400 | Pass |
| C06-UT03 | `buatJadwal` | Negatif | Jenis pekerjaan dan tanggal kosong atau bukan teks | 400 | Dibalas 400 | Pass |
| C06-UT04 | `bukaFormJadwal` | Normal | DB hasil seed | Relawan aktif, rekomendasi, dan seluruh petak dikirim (KF05) | Sesuai | Pass |
| C06-UT05 | `bukaFormJadwal` | Batas | Ada relawan nonaktif dan lebih dari 5 petak kandidat | Relawan nonaktif tidak muncul; rekomendasi maks 5, urut skor (KF17) | Sesuai | Pass |
| C06-UT06 | `bukaFormJadwal` | Negatif | Galat DB | 500 | Dibalas 500 | Pass |
| C06-UT07 | `buatJadwal` (Algo-004) | Normal | Data valid untuk relawan dengan < 3 tugas | Jadwal `ditugaskan` tersimpan, relawan dapat notifikasi (KF07) | Sesuai | Pass |
| C06-UT08 | `buatJadwal` | Batas | Tugas ke-3 lalu tugas ke-4 untuk relawan yang sama | Ke-3 diterima; ke-4 ditolak 409 dan tidak tersimpan (KF06) | Sesuai | Pass |
| C06-UT09 | `buatJadwal` | Batas | Relawan punya tugas `selesai` dan `dibatalkan` | Tidak dihitung tugas aktif (Q-013) | Sesuai | Pass |
| C06-UT10 | `buatJadwal` | Negatif | Relawan atau petak tidak ada (23503) | 400 "Data jadwal tidak valid" | Dibalas 400 | Pass |
| C06-UT11 | `buatJadwal` | Negatif | Jenis di luar pilihan (23514), > 30 karakter (22001), tanggal tidak valid (22008, 22007) | 400 | Dibalas 400 | Pass |
| C06-UT12 | `buatJadwal` | Negatif | Galat DB lain saat menyimpan | 500 | Dibalas 500 | Pass |
| C06-UT13 | `buatJadwal` | Negatif | `Notifikasi.buat` gagal | Jadwal tetap tersimpan, `notifikasiTerkirim: false` | Sesuai | Pass |

Tabel 4.2.4b. Ringkasan Cakupan Kelas C06

| Informasi | Keterangan |
| :--- | :--- |
| Daftar operasi public pada DPPL | `bukaFormJadwal`, `buatJadwal` |
| Operasi yang diuji | `bukaFormJadwal`, `buatJadwal` (operasi privat `buatRekomendasi`, `validasiKapasitas`, `kirimNotifikasiTugas` teruji lewat keduanya) |
| ID Algoritma yang tercakup | Algo-004 |
| Coverage (wajib minimal 70%) | 100% line / 100% branch (bukti `coverage-c06.png`, `coverage-c06-jadwal.txt`) |

### 4.2.5 Kelas JadwalPekerjaan

**ID Kelas:** C07
**Nama Kelas:** `JadwalPekerjaan`
**Tingkat:** Sedang
**File test:** `tests/db/c07-jadwal-simpan.test.js`, `tests/db/jadwal-titik-panas.test.js`
**Penanggung jawab:** Muhammad Rafi Insyan Syiham Abrar (`simpan`), Jonathan Lewie (`ambilAktifByRelawan`, `batalkan`, `perbaruiStatus` lewat C13 dan C15)

Tabel 4.2.5. Hasil Pengujian Unit Kelas C07

| ID Pengujian | Operasi yang Diuji | Jenis Kasus | Prosedur/Masukan | Hasil yang Diharapkan | Hasil Pengujian | Kesimpulan |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| C07-UT01 | `simpan` (Q-008) | Normal | Tugas patroli | Tersimpan `ditugaskan`, tanpa titik panas, tanggal `YYYY-MM-DD` | Sesuai | Pass |
| C07-UT02 | `simpan` | Normal | Pengecekan titik panas di petak bertitik | Memakai titik terbaru di dalam petak, titik di luar diabaikan | Sesuai | Pass |
| C07-UT03 | `simpan` | Batas | Titik tepat di `lat_min`/`lng_min` dan di `lat_maks` | Batas bawah masuk petak, batas atas tidak | Sesuai | Pass |
| C07-UT04 | `simpan` | Batas | Pengecekan di petak tanpa titik | Tersimpan dengan `idTitikPanas` null | Sesuai | Pass |
| C07-UT05 | `simpan` | Negatif | Petak tidak ada | Galat 23503, tidak ada baris tersimpan | Sesuai | Pass |
| C07-UT06 | `simpan` | Normal | Pengecekan di petak dengan beberapa titik (tes `jadwal-titik-panas`) | Titik terbaru di petak itu yang disimpan | Sesuai | Pass |
| C07-UT07 | `simpan` | Negatif | Patroli di petak yang punya titik panas | `id_titik_panas` tetap NULL | Sesuai | Pass |

Coverage C07: 100% line / 100% branch. Operasi `ambilAktifByRelawan`, `perbaruiStatus`, dan `batalkan` teruji lewat C13-UT07 s.d. C13-UT11, C15-UT01, C15-UT05, C10-UT21, C10-UT27, dan INT-TC05.

Catatan: ID C07-UT06 dan C07-UT07 kami berikan di dokumen ini untuk tes `pengecekan titik panas menyimpan titik terbaru di petak itu (Q-008)` dan `patroli tidak diberi titik panas walaupun petaknya punya titik` pada `tests/db/jadwal-titik-panas.test.js`, yang namanya di runner belum berawalan ID. Tes ketiga di file itu (`pengecekan di petak tanpa titik panas tetap tersimpan, kolomnya NULL`) sama cakupannya dengan C07-UT04.

### 4.2.6 Kelas VerifikasiLaporanController

**ID Kelas:** C10
**Nama Kelas:** `VerifikasiLaporanController`
**Tingkat:** Mendalam
**File test:** `tests/c10-verifikasi.test.js`, `tests/db/c10-verifikasi.test.js`
**Penanggung jawab:** Muhammad Rafiif Ansyadya

Tabel 4.2.6. Hasil Pengujian Unit Kelas C10

| ID Pengujian | Operasi yang Diuji | Jenis Kasus | Prosedur/Masukan | Hasil yang Diharapkan | Hasil Pengujian | Kesimpulan |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| C10-UT01 | `hitungJarak` (Algo-005) | Normal | Koordinat di tengah petak | 0 | 0 | Pass |
| C10-UT02 | `hitungJarak` | Batas | Tepat di garis batas dan di sudut petak | 0 | 0 | Pass |
| C10-UT03 | `hitungJarak` | Normal | 0,001° di timur petak | Sekitar 111 m | ≈ 111 m | Pass |
| C10-UT04 | `hitungJarak` | Normal | Di luar pojok petak | Jarak diagonal ke sudut, bilangan bulat | Sesuai | Pass |
| C10-UT05 | `hitungJarak` | Normal | Laporan seed Petak 187 | Sekitar 340 m (I-04b) | ≈ 340 m | Pass |
| C10-UT06 | `hitungJarak` | Negatif | Koordinat bukan angka | Tidak bernilai 0 (tidak dianggap di dalam petak) | Sesuai | Pass |
| C10-UT07 | `validasiAlasan` | Normal | Alasan dengan spasi di awal/akhir | Dirapikan (`trim`) | Sesuai | Pass |
| C10-UT08 | `validasiAlasan` | Batas | 300 dan 301 karakter | 300 diterima, 301 ditolak | Sesuai | Pass |
| C10-UT09 | `validasiAlasan` | Negatif | Kosong, spasi saja, bukan teks | Ditolak | Ditolak | Pass |
| C10-UT10 | `ambilDetailLaporan` | Negatif | ID bukan UUID | 404 tanpa query | Dibalas 404 | Pass |
| C10-UT11 | `verifikasiLaporan` | Negatif | ID bukan UUID | 404 tanpa query | Dibalas 404 | Pass |
| C10-UT12 | `tolakLaporan` | Negatif | Alasan kosong atau tanpa body | 400 tanpa query | Dibalas 400 | Pass |
| C10-UT13 | `tolakLaporan` | Negatif | Alasan valid, ID bukan UUID | 404 | Dibalas 404 | Pass |
| C10-UT14 | `ambilAntrean` | Normal | Beberapa laporan menunggu | Urut dari unggahan terlama, tanpa foto | Sesuai | Pass |
| C10-UT15 | `ambilAntrean` | Batas | Ada laporan disetujui dan ditolak | Tidak masuk antrean | Sesuai | Pass |
| C10-UT16 | `ambilAntrean` | Negatif | Galat DB | 500 | Dibalas 500 | Pass |
| C10-UT17 | `ambilDetailLaporan` | Normal | Laporan di dalam petak | Jarak 0, foto sebagai data URL | Sesuai | Pass |
| C10-UT18 | `ambilDetailLaporan` | Batas | Laporan 200 m dan 201 m dari batas | 200 m tidak ditandai, 201 m ditandai (KNF06) | Sesuai | Pass |
| C10-UT19 | `ambilDetailLaporan` | Negatif | UUID valid yang tidak ada | 404 | Dibalas 404 | Pass |
| C10-UT20 | `ambilDetailLaporan` | Negatif | Galat DB | 500 | Dibalas 500 | Pass |
| C10-UT21 | `verifikasiLaporan` (Algo-006) | Normal | Laporan menunggu | Laporan terverifikasi, tugas `selesai`, relawan dapat notifikasi | Sesuai | Pass |
| C10-UT22 | `verifikasiLaporan` | Negatif | Laporan sudah diputuskan | 409 dan tidak berubah (KF10) | Dibalas 409 | Pass |
| C10-UT23 | `verifikasiLaporan` | Negatif | UUID valid yang tidak ada | 404 | Dibalas 404 | Pass |
| C10-UT24 | `verifikasiLaporan` | Batas | Dua petugas menyetujui bersamaan | Hanya satu yang berhasil | Sesuai | Pass |
| C10-UT25 | `verifikasiLaporan` | Negatif | Notifikasi gagal dibuat | Keputusan tetap tersimpan, 200 | Dibalas 200 | Pass |
| C10-UT26 | `verifikasiLaporan` | Negatif | Galat DB | 500 | Dibalas 500 | Pass |
| C10-UT27 | `tolakLaporan` (Algo-006) | Normal | Alasan valid | Alasan tersimpan, tugas `ditugaskan`, relawan dapat notifikasi (KF24) | Sesuai | Pass |
| C10-UT28 | `tolakLaporan` | Batas | Alasan tepat 300 karakter | Diterima dan tersimpan utuh | Sesuai | Pass |
| C10-UT29 | `tolakLaporan` | Negatif | Laporan sudah disetujui | 409, tetap terverifikasi | Dibalas 409 | Pass |
| C10-UT30 | `tolakLaporan` | Negatif | UUID valid yang tidak ada | 404 | Dibalas 404 | Pass |
| C10-UT31 | `tolakLaporan` | Batas | Dua petugas memutuskan bersamaan | Hanya satu yang berhasil | Sesuai | Pass |
| C10-UT32 | `tolakLaporan` | Negatif | Galat DB | 500 | Dibalas 500 | Pass |
| C10-UT33 | `dalamTransaksi` | Negatif | Fungsi kerja mengembalikan `false` | Semua perubahan di-ROLLBACK | Sesuai | Pass |
| C10-UT34 | `dalamTransaksi` | Negatif | Fungsi kerja melempar galat | ROLLBACK dan galat diteruskan | Sesuai | Pass |
| C10-UT35 | `tolakLaporan` | Batas | Laporan disetujui petugas lain setelah dicek | 409, alasan tidak tersimpan | Sesuai | Pass |
| C10-UT36 | `tolakLaporan` | Batas | Status tugas berubah setelah dicek | ROLLBACK, 409 | Sesuai | Pass |
| C10-UT37 | `verifikasiLaporan` | Batas | Laporan ditolak petugas lain setelah dicek | 409, tugas tidak selesai | Sesuai | Pass |

Tabel 4.2.6b. Ringkasan Cakupan Kelas C10

| Informasi | Keterangan |
| :--- | :--- |
| Daftar operasi public pada DPPL | `ambilAntrean`, `ambilDetailLaporan`, `verifikasiLaporan`, `tolakLaporan` |
| Operasi yang diuji | Keempat operasi public, ditambah `hitungJarak` (diekspor, Tabel B.1 Tugas 9 no. 6), `validasiAlasan`, dan `dalamTransaksi` |
| ID Algoritma yang tercakup | Algo-005, Algo-006 |
| Coverage (wajib minimal 70%) | 100% line / 97,01% branch (bukti `coverage-c10-verifikasi.txt`) |

### 4.2.7 Kelas LaporanBuktiKerja

**ID Kelas:** C11
**Nama Kelas:** `LaporanBuktiKerja`
**Tingkat:** Sedang
**File test:** `tests/db/c11-laporan-verifikasi.test.js`
**Penanggung jawab:** Muhammad Rafiif Ansyadya

Tabel 4.2.7. Hasil Pengujian Unit Kelas C11

| ID Pengujian | Operasi yang Diuji | Jenis Kasus | Prosedur/Masukan | Hasil yang Diharapkan | Hasil Pengujian | Kesimpulan |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| C11-UT01 | `ambilMenungguVerifikasi` (Q-016) | Normal | Laporan menunggu | Tampil dengan data tugas dan nama relawan, tanpa foto | Sesuai | Pass |
| C11-UT02 | `ambilMenungguVerifikasi` | Negatif | Laporan terverifikasi dan ditolak | Tidak ikut | Sesuai | Pass |
| C11-UT03 | `ambilById` (Q-017) | Normal | UUID yang ada | Laporan lengkap dengan foto, koordinat, tanggal tugas | Sesuai | Pass |
| C11-UT04 | `ambilById` | Negatif | UUID tidak ada | `null` | `null` | Pass |
| C11-UT05 | `setujui` (Q-018) | Normal | Laporan menunggu | `terverifikasi`, petugas tercatat | Sesuai | Pass |
| C11-UT06 | `setujui` | Negatif | Laporan sudah diputuskan | `false`, tidak berubah (KF10) | `false` | Pass |
| C11-UT07 | `tolak` (Q-019) | Normal | Laporan menunggu | `ditolak`, alasan tersimpan | Sesuai | Pass |
| C11-UT08 | `tolak` | Negatif | Laporan sudah terverifikasi | `false`, tetap terverifikasi (KF10) | `false` | Pass |

Coverage C11: 100% line / 93,75% branch. Operasi `simpan` dan `cekUUIDAda` teruji lewat C15-UT01 s.d. C15-UT03, INT-TC06, dan INT-TC07.

### 4.2.8 Kelas DaftarTugasController

**ID Kelas:** C13
**Nama Kelas:** `DaftarTugasController`
**Tingkat:** Mendalam
**File test:** `tests/c13-daftar-tugas.test.js`, `tests/db/c13-daftar-tugas.test.js`
**Penanggung jawab:** Jonathan Lewie

Tabel 4.2.8. Hasil Pengujian Unit Kelas C13

| ID Pengujian | Operasi yang Diuji | Jenis Kasus | Prosedur/Masukan | Hasil yang Diharapkan | Hasil Pengujian | Kesimpulan |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| C13-UT01 | `urutkanBerdasarkanSkorRisiko` | Normal | Tiga tugas dengan skor berbeda | Skor tertinggi paling atas (KF11) | Sesuai | Pass |
| C13-UT02 | `urutkanBerdasarkanSkorRisiko` | Batas | Skor sama | Urutan awal dipertahankan | Sesuai | Pass |
| C13-UT03 | `urutkanBerdasarkanSkorRisiko` | Batas | Daftar kosong | Tetap kosong | Sesuai | Pass |
| C13-UT04 | `batalkanTugasTidakAman` (server) | Negatif | Tanpa alasan | 400 | Dibalas 400 | Pass |
| C13-UT05 | `batalkanTugasTidakAman` | Batas | Alasan 301 karakter | 400 | Dibalas 400 | Pass |
| C13-UT06 | `batalkanTugasTidakAman` | Negatif | ID tugas tidak valid | 409 | Dibalas 409 | Pass |
| C13-UT07 | `ambilTugasRelawan` | Normal | Relawan dengan tugas aktif dan selesai | Hanya tugas aktif, skor tertinggi di atas | Sesuai | Pass |
| C13-UT08 | `ambilTugasRelawan` | Batas | Relawan tanpa tugas | Daftar kosong | Sesuai | Pass |
| C13-UT09 | `batalkanTugasTidakAman` | Negatif | Tugas milik relawan lain | 409 | Dibalas 409 | Pass |
| C13-UT10 | `batalkanTugasTidakAman` (Algo-008) | Normal | Tugas sendiri berstatus `ditugaskan`, alasan valid | Status `dibatalkan`, petugas dapat notifikasi (KF21) | Sesuai | Pass |
| C13-UT11 | `batalkanTugasTidakAman` | Negatif | Tugas yang sudah dibatalkan | 409 | Dibalas 409 | Pass |
| C13-UT12 | `tandaiNotifikasiDibaca` | Normal | Notifikasi milik sendiri | Notifikasi tidak muncul lagi | Sesuai | Pass |
| C13-UT13 | `tandaiNotifikasiDibaca` | Negatif | Notifikasi milik orang lain | 404 | Dibalas 404 | Pass |
| C13-UT14 | `tandaiNotifikasiDibaca` | Negatif | ID tidak valid | 400 | Dibalas 400 | Pass |

Tabel 4.2.8b. Ringkasan Cakupan Kelas C13

| Informasi | Keterangan |
| :--- | :--- |
| Daftar operasi public pada DPPL | `muatDaftarTugas`, `ambilTugasRelawan`, `batalkanTugasTidakAman`, `tandaiNotifikasiDibaca` |
| Operasi yang diuji | Bagian server: `ambilTugasRelawan`, `batalkanTugasTidakAman`, `tandaiNotifikasiDibaca`, `urutkanBerdasarkanSkorRisiko`. Bagian klien `muatDaftarTugas` (Algo-007) belum punya unit test; perilakunya baru diuji manual lewat UC04-TC02 dan KNF04-TC01 |
| ID Algoritma yang tercakup | Algo-008 (unit), Algo-007 (manual, UC04-TC02) |
| Coverage (wajib minimal 70%) | Bagian server 87,64% line / 83,33% branch. Bagian klien `public/relawan/js/DaftarTugasController.js` tidak muncul di laporan c8 karena belum diimpor oleh tes mana pun |

Sebagai perbaikan untuk C13, kami berencana menambahkan `tests/c13-daftar-tugas-klien.test.js` dengan pola yang sama seperti `c15-upload-klien.test.js`, yaitu `fake-indexeddb` dan `fetch` tiruan, untuk tiga kasus `muatDaftarTugas`: server 200 (salinan disimpan), luring (salinan ditampilkan dengan penanda luring), dan server 5xx (salinan ditampilkan, Tabel B.1 Tugas 9 no. 17).

### 4.2.9 Kelas UploadLaporanController

**ID Kelas:** C15
**Nama Kelas:** `UploadLaporanController`
**Tingkat:** Mendalam
**File test:** `tests/db/c15-terima-laporan.test.js`, `tests/c15-upload-klien.test.js`, `tests/laporan.test.js`
**Penanggung jawab:** Jonathan Lewie

Tabel 4.2.9. Hasil Pengujian Unit Kelas C15

| ID Pengujian | Operasi yang Diuji | Jenis Kasus | Prosedur/Masukan | Hasil yang Diharapkan | Hasil Pengujian | Kesimpulan |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| C15-UT01 | `terimaLaporan` (Algo-011) | Normal | Laporan valid untuk tugas sendiri | 201, status tugas `menunggu verifikasi` | Dibalas 201 | Pass |
| C15-UT02 | `terimaLaporan` | Negatif | UUID sama dikirim ulang | 200, tidak dobel (KNF03) | Dibalas 200, satu baris | Pass |
| C15-UT03 | `terimaLaporan` | Batas | Tiga kiriman UUID sama serentak | Hanya satu tersimpan | Satu baris | Pass |
| C15-UT04 | `terimaLaporan` | Negatif | Tugas relawan lain | 409 | Dibalas 409 | Pass |
| C15-UT05 | `terimaLaporan` | Negatif | Tugas sudah dibatalkan | 409 | Dibalas 409 | Pass |
| C15-UT06 | `mulaiLaporan` / `generateUUID` | Normal | Dipanggil dua kali | UUID berbeda | Sesuai | Pass |
| C15-UT07 | `kirimLaporan` (Algo-009) | Normal | Daring, server menerima | Laporan tidak disimpan di perangkat | Sesuai | Pass |
| C15-UT08 | `kirimLaporan` | Normal | Luring | Disimpan di IndexedDB, menunggu dikirim (KF12) | Sesuai | Pass |
| C15-UT09 | `kirimLaporan` | Negatif | Server membalas 409 | Tidak disimpan di perangkat | Sesuai | Pass |
| C15-UT10 | `kirimLaporan` / `hitungLaporanTertunda` | Batas | Laporan ke-20 dan ke-21 saat luring | Ke-20 tersimpan, ke-21 ditolak penuh (KNF09) | Sesuai | Pass |
| C15-UT11 | `sinkronOtomatis` (Algo-010) | Normal | Beberapa laporan tertunda, kembali daring | Semua terkirim lalu dihapus dari perangkat (KF13) | Sesuai | Pass |
| C15-UT12 | `sinkronOtomatis` | Negatif | Koneksi putus di tengah sinkron | Laporan yang belum terkirim tetap ada (KNF03) | Sesuai | Pass |
| C15-UT13 | `sinkronOtomatis` | Batas | Dipanggil saat luring | Tidak mengirim apa pun | Sesuai | Pass |
| C15-UT14 | `bacaLaporan` | Normal | Isi multipart lengkap | Menjadi objek laporan | Sesuai | Pass |
| C15-UT15 | `bacaLaporan` | Negatif | Ada data kosong atau tidak valid | `null` | `null` | Pass |
| C15-UT16 | `terimaLaporan` | Negatif | Data tidak lengkap | 400 tanpa menyentuh DB | Dibalas 400 | Pass |
| C15-UT17 | `terimaFoto` | Batas | Foto lebih dari 500 KB | 413 (KNF09) | Dibalas 413 | Pass |
| C15-UT18 | konstanta batas foto | Normal | Bandingkan batas klien dan server | Sama (500 KB) | Sama | Pass |
| C15-UT19 | `daftarPercobaanKompresi` | Normal | Urutan percobaan `kompresFoto` | 1280 px kualitas 0,8 lalu 0,5, lalu 960 px, lalu berhenti | Sesuai | Pass |

Catatan: C15-UT14 s.d. C15-UT19 adalah ID dokumen untuk enam tes di `tests/laporan.test.js` yang namanya di runner belum berawalan ID (urutan sama dengan urutan di file).

Tabel 4.2.9b. Ringkasan Cakupan Kelas C15

| Informasi | Keterangan |
| :--- | :--- |
| Daftar operasi public pada DPPL | `mulaiLaporan`, `kompresFoto`, `kirimLaporan`, `sinkronOtomatis`, `terimaLaporan` |
| Operasi yang diuji | `mulaiLaporan`, `kirimLaporan`, `sinkronOtomatis`, `terimaLaporan` (beserta `terimaFoto` dan `bacaLaporan`). `kompresFoto` memakai canvas peramban sehingga tidak bisa dijalankan di Node; yang diuji adalah urutan percobaannya (C15-UT19), sedangkan hasil kompresi diukur pada profiling M9 (B.2.1) dan UC05-TC01 |
| ID Algoritma yang tercakup | Algo-009, Algo-010, Algo-011 |
| Coverage (wajib minimal 70%) | Server 90,47% line / 94,73% branch. Klien 77,56% line / 87,5% branch. `PenyimpananLokal.js` 92,15% line / 94,11% branch |

### 4.2.10 Kelas DeteksiKeliruController

**ID Kelas:** C17
**Nama Kelas:** `DeteksiKeliruController`
**Tingkat:** Sedang
**File test:** `tests/deteksi-keliru.test.js`, `tests/db/deteksiKeliru.test.js`
**Penanggung jawab:** Muhammad Rafi Insyan Syiham Abrar

Tabel 4.2.10. Hasil Pengujian Unit Kelas C17

| ID Pengujian | Operasi yang Diuji | Jenis Kasus | Prosedur/Masukan | Hasil yang Diharapkan | Hasil Pengujian | Kesimpulan |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| C17-UT01 | `validasiKeterangan` | Negatif | Kosong atau spasi saja | Ditolak (UC06 alternatif 1) | Ditolak | Pass |
| C17-UT02 | `validasiKeterangan` | Batas | 1 dan 200 karakter setelah `trim` | Diterima | Diterima | Pass |
| C17-UT03 | `tandaiKeliru` (route) | Negatif | Petugas memanggil endpoint | Ditolak `cekPeran` (hanya relawan) | Dibalas 403 | Pass |
| C17-UT04 | `tandaiKeliru` | Negatif | Titik panas tidak ada | 404 | Dibalas 404 | Pass |
| C17-UT05 | `tandaiKeliru` | Negatif | Titik dari tugas relawan lain | 403 | Dibalas 403 | Pass |
| C17-UT06 | `tandaiKeliru` | Normal | Pemilik tugas, keterangan valid | 200 | Dibalas 200 | Pass |
| C17-UT07 | `tandaiKeliru` | Batas | Tandai ulang dalam 24 jam | 409, waktu penandaan tidak berubah (KF15) | Dibalas 409 | Pass |
| C17-UT08 | `tandaiKeliru` | Batas | Setelah lewat 24 jam | Boleh ditandai lagi | Dibalas 200 | Pass |

Catatan: C17-UT01 s.d. C17-UT08 adalah ID dokumen untuk tes di `tests/deteksi-keliru.test.js` (UT01 s.d. UT03) dan `tests/db/deteksiKeliru.test.js` (UT04 s.d. UT08) sesuai urutan di file. Coverage C17 (server): 83,72% line / 78,57% branch.

### 4.2.11 Kelas PeringatanSMSController

**ID Kelas:** C18
**Nama Kelas:** `PeringatanSMSController`
**Tingkat:** Mendalam
**File test:** `tests/c18-peringatan-sms.test.js`, `tests/db/c18-peringatan-sms.test.js`
**Penanggung jawab:** Reinhard Mikhael Tandra

Tabel 4.2.11. Hasil Pengujian Unit Kelas C18

| ID Pengujian | Operasi yang Diuji | Jenis Kasus | Prosedur/Masukan | Hasil yang Diharapkan | Hasil Pengujian | Kesimpulan |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| C18-UT01 | `cekAmbangRisiko` (Algo-012) | Normal | Petak tinggi dengan warga aktif | Semua warga aktif dikirimi SMS, dicatat `terkirim` (KF16) | Sesuai | Pass |
| C18-UT02 | `cekAmbangRisiko` | Negatif | Gateway menolak satu nomor | Nomor itu `gagal`, yang lain `terkirim`, tidak dikirim ulang | Sesuai | Pass |
| C18-UT03 | `cekAmbangRisiko` | Batas | Sudah ada SMS terkirim < 24 jam | Tidak mengirim lagi | Sesuai | Pass |
| C18-UT04 | `cekAmbangRisiko` | Batas | Petak tinggi tanpa warga aktif | Tidak ada log, tidak galat | Sesuai | Pass |
| C18-UT05 | `cekAmbangRisiko` | Batas | Daftar petak kosong | Selesai tanpa galat | Sesuai | Pass |
| C18-UT06 | `cekAmbangRisiko` | Negatif | Galat DB pada satu petak | Petak berikutnya tetap diproses | Sesuai | Pass |
| C18-UT07 | `cekAmbangRisiko` | Negatif | Petak bukan tinggi | Dilewati tanpa SMS dan log | Sesuai | Pass |
| C18-UT08 | `prosesBalasanSTOP` | Normal | Balasan `STOP` dari warga aktif | `TRUE`, persetujuan dicabut (KF22) | `TRUE` | Pass |
| C18-UT09 | `prosesBalasanSTOP` | Batas | Balasan `sToP` | Diperlakukan sama dengan STOP | `TRUE` | Pass |
| C18-UT10 | `prosesBalasanSTOP` | Negatif | Balasan selain STOP | `FALSE`, tidak memproses apa pun | `FALSE` | Pass |
| C18-UT10b | `prosesBalasanSTOP` | Negatif | Balasan bukan string | `FALSE` | `FALSE` | Pass |
| C18-UT10c | `prosesBalasanSTOP` | Negatif | Balasan selain STOP (cek DB) | Status warga tidak berubah | Sesuai | Pass |
| C18-UT11 | `prosesBalasanSTOP` | Negatif | STOP dari nomor tidak terdaftar | `FALSE` tanpa galat | `FALSE` | Pass |
| C18-UT11b | `prosesBalasanSTOP` | Batas | STOP dari warga yang sudah dicabut | `FALSE` | `FALSE` | Pass |
| C18-UT12 | `hapusNomorDicabut` | Normal | Warga dicabut > 30 hari dan < 30 hari | Hanya yang > 30 hari terhapus (KNF12) | Sesuai | Pass |
| C18-UT12b | `hapusNomorDicabut` | Batas | Dicabut 31 hari dan 29 hari | 31 hari terhapus, 29 hari tetap | Sesuai | Pass |
| C18-UT12c | `hapusNomorDicabut` | Batas | Tidak ada data melewati batas | Tidak menghapus apa pun, tanpa galat | Sesuai | Pass |

Tabel 4.2.11b. Ringkasan Cakupan Kelas C18

| Informasi | Keterangan |
| :--- | :--- |
| Daftar operasi public pada DPPL | `cekAmbangRisiko`, `prosesBalasanSTOP`, `hapusNomorDicabut` |
| Operasi yang diuji | Ketiganya (operasi privat `cekPeringatanTerakhir`, `identifikasiWargaTerdampak`, `kirimSMS` teruji lewat `cekAmbangRisiko`) |
| ID Algoritma yang tercakup | Algo-012 |
| Coverage (wajib minimal 70%) | 97,53% line / 96,66% branch (bukti `coverage-c18-sms.txt`) |

Catatan: `tests/db/peringatanSMS.test.js` berisi tujuh tes lama tanpa ID dari M9 yang cakupannya sudah tercakup C18-UT01 s.d. C18-UT12. Tes ini tetap dijalankan dan lulus.

### 4.2.12 Kelas Warga

**ID Kelas:** C19
**Nama Kelas:** `Warga`
**Tingkat:** Mendalam
**File test:** `tests/db/c19-warga.test.js`
**Penanggung jawab:** Reinhard Mikhael Tandra

Tabel 4.2.12. Hasil Pengujian Unit Kelas C19

| ID Pengujian | Operasi yang Diuji | Jenis Kasus | Prosedur/Masukan | Hasil yang Diharapkan | Hasil Pengujian | Kesimpulan |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| C19-UT01 | `ambilAktifByPetak` (Algo-013) | Normal | Petak dengan warga aktif dan dicabut | Hanya warga aktif di petak itu | Sesuai | Pass |
| C19-UT02 | `ambilAktifByPetak` | Batas | Petak tanpa warga aktif | Larik kosong | Sesuai | Pass |
| C19-UT03 | `cariByNomor` | Negatif | Nomor tidak terdaftar | `null` | `null` | Pass |
| C19-UT03b | `cariByNomor` | Normal | Nomor terdaftar | Data warga | Sesuai | Pass |
| C19-UT04 | `cabutPersetujuan` | Normal | Warga aktif | Status `dicabut`, `waktu_dicabut` terisi | Sesuai | Pass |
| C19-UT04b | `cabutPersetujuan` | Batas | Warga yang sudah dicabut | `waktu_dicabut` tidak berubah | Sesuai | Pass |
| C19-UT05 | `hapusDicabutLama` | Normal | Batas hari tertentu | Hanya yang melewati batas terhapus | Sesuai | Pass |
| C19-UT05b | `hapusDicabutLama` | Batas | Batas hari lebih besar | Warga yang lebih baru tidak terhapus | Sesuai | Pass |

Tabel 4.2.12b. Ringkasan Cakupan Kelas C19

| Informasi | Keterangan |
| :--- | :--- |
| Daftar operasi public pada DPPL | `ambilAktifByPetak`, `cariByNomor`, `cabutPersetujuan`, `hapusDicabutLama` |
| Operasi yang diuji | Keempatnya |
| ID Algoritma yang tercakup | Algo-013 |
| Coverage (wajib minimal 70%) | 100% line / 100% branch |

### 4.2.13 Kelas PeringatanSMS

**ID Kelas:** C20
**Nama Kelas:** `PeringatanSMS`
**Tingkat:** Mendalam
**File test:** `tests/db/c20-peringatan-sms.test.js`
**Penanggung jawab:** Reinhard Mikhael Tandra

Tabel 4.2.13. Hasil Pengujian Unit Kelas C20

| ID Pengujian | Operasi yang Diuji | Jenis Kasus | Prosedur/Masukan | Hasil yang Diharapkan | Hasil Pengujian | Kesimpulan |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| C20-UT01 | `adaDalam24Jam` (Algo-014) | Normal | Ada SMS terkirim < 24 jam | `TRUE` | `TRUE` | Pass |
| C20-UT01b | `adaDalam24Jam` | Batas | SMS terkirim 23 jam lalu | `TRUE` | `TRUE` | Pass |
| C20-UT02 | `adaDalam24Jam` | Negatif | Petak belum pernah dikirimi | `FALSE` | `FALSE` | Pass |
| C20-UT02b | `adaDalam24Jam` | Negatif | Hanya ada SMS `gagal` | `FALSE` | `FALSE` | Pass |
| C20-UT02c | `adaDalam24Jam` | Batas | SMS terkirim > 24 jam | `FALSE` | `FALSE` | Pass |
| C20-UT03 | `catat` | Normal | Data SMS valid | Satu baris sesuai masukan | Sesuai | Pass |
| C20-UT03b | `catat` | Negatif | Status tidak valid | Ditolak `CHECK` constraint | Ditolak | Pass |
| C20-UT04 | `ambilTerkirimTerbaru` | Normal | Campuran terkirim dan gagal | Hanya terkirim, sesuai batas | Sesuai | Pass |

Tabel 4.2.13b. Ringkasan Cakupan Kelas C20

| Informasi | Keterangan |
| :--- | :--- |
| Daftar operasi public pada DPPL | `catat`, `adaDalam24Jam` |
| Operasi yang diuji | Keduanya, ditambah `ambilTerkirimTerbaru` (Tabel B.1 Tugas 9 no. 2) |
| ID Algoritma yang tercakup | Algo-014 |
| Coverage (wajib minimal 70%) | 100% line / 100% branch |

### 4.2.14 Kelas AutentikasiController

**ID Kelas:** C22
**Nama Kelas:** `AutentikasiController`
**Tingkat:** Mendalam
**File test:** `tests/c22-autentikasi.test.js`, `tests/c22-autentikasi-klien.test.js`, `tests/db/c22-login.test.js`
**Penanggung jawab:** Jonathan Lewie

Tabel 4.2.14. Hasil Pengujian Unit Kelas C22

| ID Pengujian | Operasi yang Diuji | Jenis Kasus | Prosedur/Masukan | Hasil yang Diharapkan | Hasil Pengujian | Kesimpulan |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| C22-UT01 | `login` (server) | Negatif | Username dan password kosong | 400 | Dibalas 400 | Pass |
| C22-UT02 | `login` | Negatif | Tanpa body | 400 | Dibalas 400 | Pass |
| C22-UT03 | `buatSesi` | Normal | Data pengguna | Token berisi `idPengguna` dan `peran` | Sesuai | Pass |
| C22-UT04 | `buatSesi` | Batas | Baca `exp` token | Tepat 7 hari setelah dibuat (KNF11) | 7 hari | Pass |
| C22-UT05 | `buatSesi` | Negatif | Verifikasi dengan secret lain | Gagal dibaca | Ditolak | Pass |
| C22-UT06 | `cekLogin` | Normal | Token valid | Boleh lewat | Lewat | Pass |
| C22-UT07 | `cekLogin` | Negatif | Tanpa token | 401 | Dibalas 401 | Pass |
| C22-UT08 | `cekLogin` | Batas | Token lewat 1 detik dari batas | 401 | Dibalas 401 | Pass |
| C22-UT09 | `cekPeran` | Negatif | Relawan ke endpoint petugas | 403 (KNF05) | Dibalas 403 | Pass |
| C22-UT10 | `login` / `verifikasiKredensial` (Algo-015) | Normal | Akun seed benar | Token diterima | Dibalas 200 | Pass |
| C22-UT11 | `login` | Negatif | Password salah | 401 pesan umum (KF19) | Dibalas 401 | Pass |
| C22-UT12 | `login` | Negatif | Username tidak ada | 401 pesan sama (KF19) | Dibalas 401 | Pass |
| C22-UT13 | `periksaSesi` (klien) | Normal | Token masih berlaku | `true` (KF20) | `true` | Pass |
| C22-UT14 | `periksaSesi` | Batas | Token lewat 1 detik | `false` | `false` | Pass |
| C22-UT15 | `periksaSesi` | Negatif | Setelah `keluar` | `false` | `false` | Pass |
| C22-UT16 | `login` (klien) | Normal | Server membalas 200 | Token tersimpan di perangkat | Sesuai | Pass |
| C22-UT17 | `login` (klien) | Negatif | Server membalas 401 | Tidak ada token tersimpan | Sesuai | Pass |
| C22-UT18 | `login` (klien) | Negatif | Server membalas bukan JSON | Tetap dapat pesan galat | Sesuai | Pass |
| C22-UT19 | `arahkanSesuaiPeran` | Normal | Peran petugas dan relawan | Petugas ke `/petugas/`, relawan ke `/relawan/` (KF18) | Sesuai | Pass |

Tabel 4.2.14b. Ringkasan Cakupan Kelas C22

| Informasi | Keterangan |
| :--- | :--- |
| Daftar operasi public pada DPPL | `login`, `periksaSesi`, `arahkanSesuaiPeran` |
| Operasi yang diuji | Ketiganya, beserta operasi privat `verifikasiKredensial`, `buatSesi`, dan middleware `cekLogin`/`cekPeran` |
| ID Algoritma yang tercakup | Algo-015 |
| Coverage (wajib minimal 70%) | Server 90,9% line / 94,11% branch; `middleware/auth.js` 95,83% line / 90% branch; klien 87,75% line / 92,85% branch |

### 4.2.15 Kelas Notifikasi

**ID Kelas:** C24
**Nama Kelas:** `Notifikasi`
**Tingkat:** Sedang
**File test:** `tests/db/c24-notifikasi.test.js`
**Penanggung jawab:** Reinhard Mikhael Tandra

Tabel 4.2.15. Hasil Pengujian Unit Kelas C24

| ID Pengujian | Operasi yang Diuji | Jenis Kasus | Prosedur/Masukan | Hasil yang Diharapkan | Hasil Pengujian | Kesimpulan |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| C24-UT01 | `buat` | Normal | Pengguna yang ada | Notifikasi baru belum dibaca | Sesuai | Pass |
| C24-UT01b | `buat` | Negatif | Pengguna tidak ada | Ditolak DB | Ditolak | Pass |
| C24-UT02 | `ambilBelumDibaca` | Normal | Notifikasi beberapa pengguna | Hanya milik pengguna itu, camelCase | Sesuai | Pass |
| C24-UT02b | `ambilBelumDibaca` | Batas | Pengguna tanpa notifikasi | Larik kosong | Sesuai | Pass |
| C24-UT03 | `tandaiDibaca` | Normal | Notifikasi milik sendiri | `TRUE`, tidak muncul lagi | `TRUE` | Pass |
| C24-UT04 | `tandaiDibaca` | Negatif | ID tidak ada | `FALSE` | `FALSE` | Pass |
| C24-UT04b | `tandaiDibaca` | Negatif | Notifikasi milik orang lain | `FALSE` | `FALSE` | Pass |

Coverage C24: 100% line / 100% branch.

### 4.2.16 Kelas Sedang tanpa Unit Test Khusus (C08, C23)

C08 `RelawanLapangan` dan C23 `Pengguna` diuji lewat alur kelas pemanggilnya, sesuai ketentuan kelas Sedang yang boleh diuji lewat pengujian integrasi alur.

| ID Kelas | Operasi | Kasus Normal | Kasus Gagal | Coverage |
| :--- | :--- | :--- | :--- | :--- |
| C08 `RelawanLapangan` | `ambilRelawanAktif` (Q-012), `hitungTugasAktif` (Q-013) | C06-UT04, INT-TC16 (relawan aktif tampil) | C06-UT05 (relawan nonaktif tidak tampil), C06-UT08, INT-TC18 (tugas ke-4 ditolak), C06-UT09 (tugas dibatalkan tidak dihitung) | 100% line / 100% branch |
| C23 `Pengguna` | `cariByUsername`, `cekPassword`, `ambilByPeran` | C22-UT10, INT-TC01 (login benar); C13-UT10 (`ambilByPeran` untuk notifikasi semua petugas) | C22-UT11, C22-UT12, INT-TC02 (password salah, username tidak ada); KNF11-TC01 (hash bcrypt) | 100% line / 100% branch |

<br>

## 4.3 Pengujian Integrasi

Pada tes integrasi, server Express benar-benar dinyalakan pada port tersendiri dengan basis data PostgreSQL hasil seed. Tes kemudian memanggil endpoint melalui `fetch` dan membaca ulang isi basis data untuk memastikan datanya benar-benar tersimpan. Untuk NASA FIRMS dan Open-Meteo, tes menyalakan server HTTP tiruan lokal (`tests/helpers/peta-risiko.js`) lalu mengarahkan server ke sana lewat `FIRMS_BASE_URL` dan `OPEN_METEO_BASE_URL`, sehingga kondisi gagal seperti respons 500, 503, atau koneksi putus bisa diulang kapan saja. SMS gateway memakai `SimulasiSMSController`, yang memang merupakan wujud `SMSGatewaySimulasi` pada DPPL. Kami tidak memakai *mock* untuk komponen yang berada di dalam P/L.

Cara menjalankan: `npm run seed` lalu `npm run test:int`. Lokasi file test: `src/tests/int/`.

Karena DPPL2 belum memberikan ID untuk antarmuka antarkomponen, kami memberikan ID IK-XX berdasarkan Tabel 2.3 dan Tabel 2.4.1 DPPL2.

Tabel 4.3.1. Daftar Antarmuka Antarkomponen

| ID Antarmuka | Komponen Asal | Komponen Tujuan | Jenis Batas | Test Case |
| :--- | :--- | :--- | :--- | :--- |
| IK-01 | `HalamanLogin` ke `AutentikasiController` (`POST /api/login`) | `Pengguna` ke `DatabaseServer` | Controller - Model - Basis data | INT-TC01, INT-TC02, KNF11-TC01 |
| IK-02 | `middleware/auth.js` (`cekLogin`, `cekPeran`) | Seluruh route API | Keamanan antarlapisan | INT-TC04, INT-TC13, INT-TC19, INT-TC21, INT-TC34, KNF05-TC01 |
| IK-03 | `HalamanDaftarTugas` ke `DaftarTugasController` (`GET /api/tugas`, `POST /api/tugas/:id/batal`) | `JadwalPekerjaan`, `PetakLahan`, `Notifikasi`, `Pengguna` ke `DatabaseServer` | Controller - Model - Basis data | INT-TC03, INT-TC04, INT-TC05, INT-TC29 |
| IK-04 | `FormLaporanBuktiKerja` ke `UploadLaporanController` (`POST /api/laporan`) | `LaporanBuktiKerja`, `JadwalPekerjaan` ke `DatabaseServer` | Controller - Model - Basis data | INT-TC06, INT-TC07, INT-TC08 |
| IK-05 | `HalamanAntreanLaporan` ke `VerifikasiLaporanController` (`/api/laporan/antrean`, `/:id`, `/:id/setujui`, `/:id/tolak`) | `LaporanBuktiKerja`, `JadwalPekerjaan`, `PetakLahan`, `Notifikasi` ke `DatabaseServer` | Controller - Model - Basis data | INT-TC09 s.d. INT-TC15 |
| IK-06 | `FormPenyusunanJadwal` ke `JadwalController` (`GET /api/jadwal/form`, `POST /api/jadwal`) | `JadwalPekerjaan`, `RelawanLapangan`, `PetakLahan`, `Notifikasi` ke `DatabaseServer` | Controller - Model - Basis data | INT-TC16 s.d. INT-TC20 |
| IK-07 | `DialogTandaiKeliru` ke `DeteksiKeliruController` (`PATCH /api/titik-panas/:id/keliru`) | `TitikPanas`, `JadwalPekerjaan` ke `DatabaseServer` | Controller - Model - Basis data | INT-TC21, INT-TC22, INT-TC23 |
| IK-08 | `PeringatanSMSController` | `SMSGatewaySimulasi` (`SimulasiSMSController`, `/api/simulasi-sms/*`) dan `Warga`, `PeringatanSMS` ke `DatabaseServer` | Aplikasi - Sistem eksternal (simulasi) | INT-TC24 s.d. INT-TC28, KNF05-TC02, KNF12-TC01, KNF12-TC02 |
| IK-09 | `CronEksternal` (`POST /api/perbarui`) lalu `PetaRisikoController` | `NasaFirmsAPI`, `OpenMeteoAPI` (server tiruan) dan `PetakLahan`, `TitikPanas` ke `DatabaseServer` | Aplikasi - Sistem eksternal | INT-TC30 s.d. INT-TC33, KNF02-TC01, KNF02-TC02 |
| IK-10 | `PetaRisikoController.picuCekAmbang` | `PeringatanSMSController.cekAmbangRisiko` | Controller - Controller | INT-TC30, KNF10-TC01 |
| IK-11 | `HalamanPetaRisiko` ke `PetaRisikoController` (`GET /api/peta`) | `PetakLahan`, `Notifikasi` ke `DatabaseServer` | Controller - Model - Basis data | INT-TC34, INT-TC35 |
| IK-12 | Bagian klien `DaftarTugasController` dan `UploadLaporanController` | `PenyimpananLokal` (IndexedDB) | Aplikasi - Penyimpanan perangkat | C15-UT07 s.d. C15-UT13 (dengan `fake-indexeddb`), UC04-TC02, UC05-TC02, KNF04-TC01 (IndexedDB asli di Chrome) |
| IK-13 | `HalamanPetaRisiko` (peramban) | `OpenStreetMapTile` | Aplikasi - Sistem eksternal | UC01-TC01, KNF01-TC01 (diamati manual, tile dimuat langsung oleh peramban) |

Tabel 4.3.2. Hasil Pengujian Integrasi

| ID Pengujian | ID Antarmuka | Skenario | Prosedur/Masukan | Hasil yang Diharapkan | Hasil Pengujian | Kesimpulan |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| INT-TC01 | IK-01 | Normal: login akun yang ada | `POST /api/login` dengan `relawan1`/`sigap12345` | 200, token berisi id dan peran yang sama dengan baris `pengguna` | Sesuai | Pass |
| INT-TC02 | IK-01 | Gagal: password salah | `POST /api/login` password salah | 401 pesan umum | Dibalas 401 | Pass |
| INT-TC03 | IK-03 | Normal: daftar tugas dari DB | `GET /api/tugas` sebagai `relawan1` | Tugas aktif dari DB beserta tingkat risiko petak | Sesuai | Pass |
| INT-TC04 | IK-02, IK-03 | Gagal: peran salah | `GET /api/tugas` dengan token petugas | 403 | Dibalas 403 | Pass |
| INT-TC05 | IK-03 | Normal: pembatalan tugas | `POST /api/tugas/:id/batal` dengan alasan | Status `dibatalkan` dan alasan di DB | Sesuai | Pass |
| INT-TC06 | IK-04 | Normal: unggah laporan | `POST /api/laporan` multipart (foto, koordinat, UUID) | Baris laporan dan foto `BYTEA` di DB, tugas `menunggu verifikasi` | Sesuai | Pass |
| INT-TC07 | IK-04 | Gagal: UUID ganda | Kirim laporan yang sama dua kali | Hanya satu baris tersimpan (KNF03) | Satu baris | Pass |
| INT-TC08 | IK-04 | Gagal: foto > 500 KB | Unggah foto 500 KB + 1 byte | 413, tidak ada baris baru (KNF09) | Dibalas 413 | Pass |
| INT-TC09 | IK-05 | Normal: antrean | Relawan unggah, petugas buka antrean | Laporan muncul di antrean | Sesuai | Pass |
| INT-TC10 | IK-05 | Normal: detail | `GET /api/laporan/:id` | Foto sama dengan unggahan, jarak sesuai DB | Sesuai | Pass |
| INT-TC11 | IK-05 | Normal: setujui | `POST /api/laporan/:id/setujui` | Laporan `terverifikasi`, tugas `selesai`, notifikasi relawan | Sesuai | Pass |
| INT-TC12 | IK-05 | Normal: tolak | `POST /api/laporan/:id/tolak` dengan alasan | Alasan tersimpan, tugas `ditugaskan`, relawan bisa unggah ulang | Sesuai | Pass |
| INT-TC13 | IK-02, IK-05 | Gagal: akses tanpa hak | Token relawan dan tanpa token | 403 dan 401, DB tidak berubah | Sesuai | Pass |
| INT-TC14 | IK-05 | Gagal: laporan terkunci | Setujui/tolak laporan yang sudah disetujui | 409 (KF10) | Dibalas 409 | Pass |
| INT-TC15 | IK-05 | Gagal: input salah | Tolak tanpa alasan; ID asal-asalan | 400 dan 404, DB tidak berubah | Sesuai | Pass |
| INT-TC16 | IK-06 | Normal: buka formulir | `GET /api/jadwal/form` | Relawan dan petak dari DB (KF05) | Sesuai | Pass |
| INT-TC17 | IK-06, IK-03 | Normal: simpan jadwal | `POST /api/jadwal` lalu `GET /api/tugas` relawan | Jadwal di DB, muncul di daftar tugas, notifikasi relawan (KF07) | Sesuai | Pass |
| INT-TC18 | IK-06 | Gagal: kapasitas penuh | Jadwal ke-4 untuk relawan yang sama | 409, tetap 3 tugas aktif (KF06) | Dibalas 409 | Pass |
| INT-TC19 | IK-02, IK-06 | Gagal: akses dan data | Token relawan, tanpa token, data ditolak DB | 403, 401, 400; tidak ada jadwal baru | Sesuai | Pass |
| INT-TC20 | IK-06, IK-03 | Normal: pengecekan titik panas | Simpan jadwal pengecekan | `id_titik_panas` terisi titik di petak, terbaca di daftar tugas (Q-008) | Sesuai | Pass |
| INT-TC21 | IK-02, IK-07 | Gagal: tandai keliru tidak sah | Relawan tanpa tugas, petugas, titik tidak ada, keterangan kosong | 403, 403, 404, 400; DB tidak berubah | Sesuai | Pass |
| INT-TC22 | IK-07 | Normal: tandai keliru | Pemilik tugas mengirim keterangan | Status, keterangan, waktu tersimpan (KF15) | Sesuai | Pass |
| INT-TC23 | IK-07 | Gagal: tandai ulang | Tandai lagi dalam 24 jam | 409, keterangan lama tetap | Dibalas 409 | Pass |
| INT-TC24 | IK-08 | Normal dan gagal gateway | Picu SMS dengan satu nomor di `NOMOR_TIDAK_AKTIF` | Yang diterima tampil di halaman simulasi, yang ditolak tidak | Sesuai | Pass |
| INT-TC25 | IK-08 | Batas: 24 jam | Picu dua kali | Pemicu kedua tidak mengirim ulang | Sesuai | Pass |
| INT-TC26 | IK-08 | Normal: STOP | Balas STOP lewat `/api/simulasi-sms/balasan` | Persetujuan dicabut di DB, SMS berikutnya tidak dikirim (KF22) | Sesuai | Pass |
| INT-TC27 | IK-08 | Gagal: balasan salah | Balasan tidak valid; nomor tidak terdaftar | 400; nomor tak terdaftar diterima tanpa pencabutan | Sesuai | Pass |
| INT-TC28 | IK-08 | Normal: penghapusan | Warga dicabut > 30 hari | Dihapus dari DB (KNF12) | Sesuai | Pass |
| INT-TC29 | IK-03 | Normal: notifikasi pembatalan | Relawan membatalkan tugas | Notifikasi untuk petugas di DB (KF21) | Sesuai | Pass |
| INT-TC30 | IK-09, IK-10 | Normal: pembaruan data | `POST /api/perbarui` dengan FIRMS dan Open-Meteo tiruan sukses | Titik tersimpan tanpa duplikat, skor diperbarui, SMS tercatat | Sesuai | Pass |
| INT-TC31 | IK-09 | Gagal: Open-Meteo 503 | Open-Meteo tiruan membalas 503 | 500, cache petak lama dipertahankan (KF04) | Sesuai | Pass |
| INT-TC32 | IK-09 | Gagal: FIRMS 500 | FIRMS tiruan 500, Open-Meteo sukses | Skor tetap diperbarui dari titik di DB | Sesuai | Pass |
| INT-TC33 | IK-09 | Gagal: token | Tanpa token atau token salah | 401, API eksternal tidak dipanggil | Dibalas 401 | Pass |
| INT-TC34 | IK-02, IK-11 | Normal dan akses | `GET /api/peta` sebagai petugas, relawan, tanpa login | 200 dengan petak dan notifikasi; 403; 401 | Sesuai | Pass |
| INT-TC35 | IK-11 | Batas: data usang | `waktu_update_terakhir` > 3 jam | 200, `isUsang: true`, data cache utuh (KF04) | Sesuai | Pass |

<br>

## 4.4 Pengujian Use Case

Pengujian use case kami lakukan secara manual di Google Chrome pada `http://localhost:3000`, setelah sebelumnya menjalankan `npm run seed` dan `npm run perbarui`. Akun yang dipakai adalah akun uji yang tercantum di README (`petugas1`, `relawan1` sampai `relawan5`, dengan password `sigap12345`). Halaman relawan kami uji menggunakan Device Mode di Chrome, dan kondisi luring kami buat dengan mengubah Network menjadi Offline di DevTools. Tangkapan layar setiap pengujian dapat dilihat di Subbab 4.6.

### 4.4.1 Use Case Memantau Peta Risiko Kebakaran

**ID Use Case:** UC01
**Nama Use Case:** Memantau Peta Risiko Kebakaran

Tabel 4.4.1. Hasil Pengujian Use Case UC01

| ID Pengujian | ID KF | Skenario | Prosedur Pengujian | Masukan | Hasil yang Diharapkan | Hasil Pengujian | Kesimpulan |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| UC01-TC01 | KF01, KF02, KF03, KF23 | Normal | 1. `npm run seed` lalu `npm run perbarui`.<br>2. Login `petugas1`.<br>3. Buka `/petugas/`. | Akun `petugas1` | Peta 99 petak di wilayah percontohan berwarna sesuai tingkat risiko, dengan waktu pembaruan, atribusi NASA FIRMS dan Open-Meteo, dan pernyataan bahwa skor adalah alat bantu keputusan | Peta menampilkan 99 petak berwarna rendah, sedang, tinggi; panel atribusi, waktu pembaruan, dan pernyataan batasan tampil | Pass |
| UC01-TC02 | KF04 | Alternatif 1: pembaruan data gagal | 1. Jalankan pembaruan saat Open-Meteo tidak dapat diakses.<br>2. Mundurkan `waktu_update_terakhir` lebih dari 3 jam.<br>3. Buka ulang `/petugas/`. | Respons pembaruan 500 | Peta tetap tampil dari data terakhir dengan keterangan data belum diperbarui beserta waktu pembaruan terakhir | Pembaruan dibalas 500 tanpa mengubah skor; peta tetap menampilkan 99 petak dengan banner "Data belum diperbarui. Pembaruan data terakhir belum berhasil. Peta memakai hasil 20 Nov, 12.30." | Pass |

### 4.4.2 Use Case Menyusun dan Menugaskan Jadwal Pencegahan

**ID Use Case:** UC02
**Nama Use Case:** Menyusun dan Menugaskan Jadwal Pencegahan

Tabel 4.4.2. Hasil Pengujian Use Case UC02

| ID Pengujian | ID KF | Skenario | Prosedur Pengujian | Masukan | Hasil yang Diharapkan | Hasil Pengujian | Kesimpulan |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| UC02-TC01 | KF05, KF07, KF17 | Normal | 1. Login `petugas1`, buka tab Jadwal.<br>2. Pilih petak rekomendasi, jenis, tanggal, relawan Jonathan Lewie.<br>3. Tekan Simpan jadwal.<br>4. Login `relawan2`, buka daftar tugas dan tab Notifikasi. | Relawan Jonathan Lewie (`relawan2`), petak rekomendasi, jenis patroli | Formulir menampilkan relawan aktif dan maks 5 petak rekomendasi; jadwal tersimpan `ditugaskan`; relawan menerima notifikasi | "Jadwal #n tersimpan", petak keluar dari rekomendasi, tugas muncul di daftar `relawan2` dan notifikasi tugas tampil | Pass |
| UC02-TC02 | KF06 | Alternatif 1: kapasitas penuh | 1. Pilih relawan Arga Simanjuntak (sudah 3 tugas aktif di seed).<br>2. Simpan jadwal.<br>3. Ganti ke relawan lain dan simpan lagi. | Relawan Arga Simanjuntak (`relawan1`) | Penyimpanan ditolak dengan pesan kapasitas penuh; dengan relawan lain jadwal tersimpan | Pesan "Arga Simanjuntak sudah punya 3 tugas aktif. ..." (409) tampil; setelah ganti relawan jadwal tersimpan | Pass |

### 4.4.3 Use Case Memverifikasi Laporan Bukti Kerja

**ID Use Case:** UC03
**Nama Use Case:** Memverifikasi Laporan Bukti Kerja

Tabel 4.4.3. Hasil Pengujian Use Case UC03

| ID Pengujian | ID KF | Skenario | Prosedur Pengujian | Masukan | Hasil yang Diharapkan | Hasil Pengujian | Kesimpulan |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| UC03-TC01 | KF08, KF09, KF10, KF24 | Normal | 1. Login `petugas1`, buka Antrean.<br>2. Pilih laporan Petak 214.<br>3. Tekan Setujui.<br>4. Cek notifikasi `relawan1`. | Laporan seed di dalam Petak 214 | Antrean berisi laporan menunggu; detail memuat foto, koordinat, petak, jarak 0 m; setelah setuju laporan terkunci, tugas selesai, relawan dapat notifikasi | Detail tampil dengan jarak 0 m; laporan disetujui dan hilang dari antrean; notifikasi persetujuan muncul di relawan | Pass |
| UC03-TC02 | KF09 | Alternatif 1: jarak > 200 m | 1. Pilih laporan Petak 187.<br>2. Tinjau peringatan, lalu putuskan. | Laporan seed sekitar 340 m di luar Petak 187 | Detail menampilkan peringatan lokasi di luar radius wajar, keputusan tetap bisa diambil | Peringatan jarak sekitar 340 m tampil; keputusan petugas diproses | Pass |
| UC03-TC03 | KF24 | Alternatif 2: menolak laporan | 1. Pilih laporan, tekan Tolak tanpa alasan.<br>2. Isi alasan, kirim.<br>3. Cek tugas dan notifikasi relawan. | Laporan Petak 221, alasan "Foto buram, petak tidak terlihat" | Tolak tanpa alasan dicegah; dengan alasan laporan `ditolak`, tugas kembali `ditugaskan`, relawan dapat notifikasi dan bisa unggah ulang | Pesan alasan wajib tampil; setelah diisi laporan ditolak, tombol Buat laporan muncul lagi di relawan, notifikasi penolakan tampil | Pass |
| UC03-TC04 | KF08 | Alternatif 3: antrean kosong | Setelah semua laporan diputuskan, buka ulang Antrean | - | Pesan antrean kosong | Pesan antrean laporan kosong tampil | Pass |

### 4.4.4 Use Case Melihat Daftar Tugas Prioritas

**ID Use Case:** UC04
**Nama Use Case:** Melihat Daftar Tugas Prioritas

Tabel 4.4.4. Hasil Pengujian Use Case UC04

| ID Pengujian | ID KF | Skenario | Prosedur Pengujian | Masukan | Hasil yang Diharapkan | Hasil Pengujian | Kesimpulan |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| UC04-TC01 | KF11 | Normal | 1. Login `relawan1`.<br>2. Buka daftar tugas.<br>3. Buka detail tiap tugas. | Akun `relawan1` (3 tugas aktif) | Tugas aktif terurut skor risiko tertinggi, dengan lokasi dan status; detail memuat petak, skor, jenis, tombol batal | Tiga tugas tampil berurutan skor 78, 46, 12; detail tiap tugas sesuai | Pass |
| UC04-TC02 | KF20 | Alternatif 1: luring | 1. Buka daftar tugas sekali saat daring.<br>2. DevTools, lalu ubah Network ke Offline, muat ulang.<br>3. Buka detail tugas. | Mode Offline | Salinan terakhir tampil dengan penanda luring dan waktu sinkron; detail dari salinan | Banner luring dan waktu sinkron tampil; daftar dan detail tetap terbuka dari salinan | Pass |
| UC04-TC03 | KF11 | Alternatif 2: belum ada tugas | Login relawan tanpa tugas aktif | Relawan tanpa tugas | Pesan belum ada penugasan | Pesan belum ada tugas tampil | Pass |
| UC04-TC04 | KF21 | Alternatif 3: membatalkan tugas | 1. Buka detail tugas `ditugaskan`.<br>2. Tekan Batalkan, isi alasan, kirim.<br>3. Cek notifikasi di peta petugas. | Tugas patroli Petak 215, alasan "Asap terlalu pekat dan api mulai membesar di sisi timur petak" | Status `dibatalkan`, alasan tersimpan, petugas dapat notifikasi | Pembatalan berhasil, tugas hilang dari daftar, notifikasi pembatalan tampil di halaman petugas | Pass |

### 4.4.5 Use Case Mengunggah Laporan Bukti Kerja

**ID Use Case:** UC05
**Nama Use Case:** Mengunggah Laporan Bukti Kerja

Tabel 4.4.5. Hasil Pengujian Use Case UC05

| ID Pengujian | ID KF | Skenario | Prosedur Pengujian | Masukan | Hasil yang Diharapkan | Hasil Pengujian | Kesimpulan |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| UC05-TC01 | KF12, KF13 | Normal | 1. Login `relawan1`, buka tugas, tekan Buat laporan.<br>2. Izinkan GPS, ambil foto.<br>3. Kirim laporan.<br>4. Cek antrean petugas. | Foto kamera, koordinat GPS | Foto dikompres, laporan terkirim, muncul di antrean petugas, tugas `menunggu verifikasi` | Pesan laporan terkirim tampil dan laporan muncul di antrean petugas | Pass |
| UC05-TC02 | KF12, KF13 | Alternatif 1: luring | 1. Isi laporan, DevTools, lalu ubah Network ke Offline, kirim.<br>2. Kembali daring.<br>3. Cek antrean petugas. | Mode Offline | Laporan disimpan di IndexedDB berstatus menunggu dikirim; setelah daring terkirim otomatis; tidak ganda | Status menunggu dikirim tampil; setelah daring laporan terkirim otomatis dan muncul satu kali di antrean | Pass |
| UC05-TC03 | KF12 | Alternatif 2: GPS belum aktif | 1. Tolak/matikan izin lokasi, buka form.<br>2. Aktifkan GPS. | Izin lokasi ditolak | Peringatan agar menyalakan GPS; setelah aktif koordinat terisi | Peringatan GPS (I-06b) tampil dan tombol kirim tidak aktif; setelah GPS aktif koordinat terisi | Pass |
| UC05-TC04 | KF12 | Alternatif 3: penyimpanan penuh | Saat luring, kirim laporan ketika sudah ada 20 laporan tertunda | 20 laporan tertunda | Laporan ke-21 ditolak dengan pesan mencari area bersinyal | Pesan penyimpanan penuh tampil, laporan tidak disimpan | Pass |

### 4.4.6 Use Case Menandai Titik Panas sebagai Deteksi Keliru

**ID Use Case:** UC06
**Nama Use Case:** Menandai Titik Panas sebagai Deteksi Keliru

Tabel 4.4.6. Hasil Pengujian Use Case UC06

| ID Pengujian | ID KF | Skenario | Prosedur Pengujian | Masukan | Hasil yang Diharapkan | Hasil Pengujian | Kesimpulan |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| UC06-TC01 | KF14, KF15 | Normal | 1. Login `relawan1`, buka tugas "Pengecekan titik panas" Petak 214.<br>2. Tekan Tandai keliru, isi keterangan, kirim. | Keterangan "Asap dari pembakaran sampah kebun warga, bukan kebakaran lahan gambut." | Form keterangan tampil; titik berstatus `keliru` dan tidak dihitung dalam skor 24 jam | Kartu "Ditandai keliru" tampil dan tombol menjadi "Sudah ditandai"; status `keliru` tersimpan (juga INT-TC22) | Pass |
| UC06-TC02 | KF14 | Alternatif 1: keterangan kosong | 1. Buka dialog Tandai keliru.<br>2. Tekan Kirim tanpa keterangan.<br>3. Mulai mengetik. | Keterangan kosong | Peringatan keterangan belum diisi, hilang saat mulai mengetik | Pesan "Keterangan wajib diisi. Tulis apa yang Anda lihat di lokasi." tampil lalu hilang saat mengetik | Pass |

### 4.4.7 Use Case Menerima Peringatan Dini via SMS

**ID Use Case:** UC07
**Nama Use Case:** Menerima Peringatan Dini via SMS

Karena warga tidak memiliki antarmuka, UC07 kami uji dengan memicu `cekAmbangRisiko` melalui `scripts/simulasiSMS.js` untuk Petak 214 (warga `081300000001` dan `081300000002`). Setelah itu kami memeriksa halaman I-08 serta isi tabel `peringatan_sms` dan `warga`. Pengujian ini dilakukan pada 20/11/2026 dengan pengaturan `NOMOR_TIDAK_AKTIF=081300000002`.

Tabel 4.4.7. Hasil Pengujian Use Case UC07

| ID Pengujian | ID KF | Skenario | Prosedur Pengujian | Masukan | Hasil yang Diharapkan | Hasil Pengujian | Kesimpulan |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| UC07-TC01 | KF16 | Normal | 1. `npm run seed`.<br>2. `node --env-file=.env scripts/simulasiSMS.js` (Petak 214).<br>3. Buka `/simulasi-sms/`, pilih `081300000001`.<br>4. Cek tabel `peringatan_sms`. | Petak 214 tingkat tinggi, warga aktif | SMS berisi tingkat risiko, tindakan yang disarankan, dan cara berhenti berlangganan diterima warga aktif; log `terkirim` | SMS tercatat `terkirim` dan tampil di I-08 dengan isi "PERINGATAN!! Petak Lahan 214 yang dekat dengan anda berisiko tinggi terjadinya karhutla. Balas pesan ini dengan 'STOP' untuk berhenti menerima peringatan". Tingkat risiko dan cara berhenti ada, tetapi **tindakan yang disarankan belum ada** di isi pesan | Fail. Penyebab: teks pesan di `cekAmbangRisiko` (C18) belum memuat tindakan yang disarankan seperti yang diminta KF16. Solusi: tambahkan satu kalimat tindakan pada templat pesan, misalnya "Jangan membakar lahan, siapkan air, dan hubungi posko jika melihat api.", lalu jalankan ulang UC07-TC01 dan C18-UT01 |
| UC07-TC02 | KF16 | Alternatif 1: nomor tidak aktif | Sama dengan UC07-TC01, dengan `NOMOR_TIDAK_AKTIF=081300000002` | Nomor `081300000002` | Gateway mengembalikan gagal, log berstatus `gagal`, pesan tidak tampil di ponsel warga | Baris `081300000002` berstatus `gagal`; daftar pesan I-08 hanya memuat `081300000001` | Pass |
| UC07-TC03 | KF22 | Alternatif 2: berhenti berlangganan | 1. Di percakapan `081300000001`, ketik `stop` dan kirim.<br>2. Cek tabel `warga`.<br>3. Picu SMS lagi setelah 24 jam (INT-TC26). | Balasan `stop` | Status persetujuan `dicabut` dengan waktu pencabutan; nomor tidak dikirimi lagi | `081300000001` menjadi `dicabut` dengan `waktu_dicabut` terisi, `081300000002` tetap `aktif`; INT-TC26 membuktikan SMS berikutnya tidak dikirim ke nomor itu | Pass |

### 4.4.8 Use Case Masuk ke Sistem

**ID Use Case:** UC08
**Nama Use Case:** Masuk ke Sistem

Tabel 4.4.8. Hasil Pengujian Use Case UC08

| ID Pengujian | ID KF | Skenario | Prosedur Pengujian | Masukan | Hasil yang Diharapkan | Hasil Pengujian | Kesimpulan |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| UC08-TC01 | KF18 | Normal | 1. Buka `/petugas/login.html`, isi kredensial, Masuk.<br>2. Buka `/relawan/login.html`, isi kredensial, Masuk. | `petugas1` / `sigap12345`; `relawan1` / `sigap12345` | Petugas diarahkan ke peta risiko, relawan ke daftar tugas | Petugas masuk ke `/petugas/` (peta), relawan masuk ke `/relawan/` (daftar tugas) | Pass |
| UC08-TC02 | KF19 | Alternatif 1: kredensial salah | 1. Isi password salah, Masuk.<br>2. Isi ulang dengan benar. | `relawan1` dengan password salah | Pesan "Username atau password salah" tanpa menyebut bagian yang salah; login ulang berhasil | Pesan umum tampil; login ulang dengan kredensial benar berhasil | Pass |
| UC08-TC03 | KF20 | Alternatif 2: luring | 1. Login `relawan1` saat daring, lalu Offline dan buka ulang `/relawan/`.<br>2. Hapus data situs, buka `/relawan/` saat Offline. | Mode Offline | Dengan sesi: daftar tugas terakhir tampil. Tanpa sesi: halaman login dengan pesan perlu koneksi | Dengan sesi daftar tugas tampil dari salinan; tanpa sesi halaman login menampilkan pesan login memerlukan koneksi internet | Pass |

<br>

## 4.5 Pengujian Kebutuhan Non-Fungsional (KNF)

Tabel 4.5. Hasil Pengujian KNF

| ID Pengujian | ID KNF | Parameter | Target Terukur | Metode dan Alat | Hasil Aktual | Kesimpulan |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| KNF01-TC01 | KNF01 | Response time | Peta beserta 99 petak terwarnai termuat maksimal 5 detik dengan throttling 3G | Chrome DevTools Network, preset 3G bawaan, Disable cache, 5 kali reload `/petugas/`, ambil rata-rata dan maksimum `Load` | Load rata-rata 12,45 s, maksimum 13,63 s (Finish rata-rata 18,01 s); 99 petak terwarnai pada kelima percobaan | Fail. Penyebab dari waterfall: unduhan `leaflet.js` 148 kB (sekitar 7,8 s), font Inter 48,6 kB (sekitar 4 s), `logo-sigap.png` 45,6 kB (sekitar 4,5 s), dan tile OSM berjalan berurutan pada jaringan 3G tanpa kompresi. Solusi (lihat catatan di bawah tabel) |
| KNF02-TC01 | KNF02 | Reliability | Saat Open-Meteo gagal, peta tetap tampil dari hasil terakhir dengan keterangan waktu | `tests/int/knf02-reliabilitas.int.test.js`: Open-Meteo tiruan 503 dan koneksi putus, lalu `GET /api/peta` | Skor di DB tidak berubah, `GET /api/peta` 200 dengan `isUsang: true` dan waktu pembaruan terakhir; banner usang tampil (tangkapan layar) | Pass |
| KNF02-TC02 | KNF02 | Reliability | Saat FIRMS gagal, pembaruan dan peta tetap berjalan | Tes yang sama: FIRMS tiruan 500 dan koneksi putus | Pembaruan tetap 200 memakai titik di DB, peta tetap tersedia | Pass |
| KNF03-TC01 | KNF03 | Reliability | Tidak ada laporan ganda di server saat sinkron terputus atau dikirim ulang | Tes otomatis C15-UT02 (kirim ulang), C15-UT03 (3 kiriman UUID sama serentak), C15-UT12 (koneksi putus di tengah sinkron), INT-TC07 (dua kali kirim lewat HTTP), lalu hitung baris di `laporan_bukti_kerja` | Selalu 1 baris per UUID; kiriman serentak menghasilkan 201, 200, 200; laporan yang belum terkirim tetap di perangkat | Pass |
| KNF04-TC01 | KNF04 | Portability | PWA berjalan di Chrome Android tanpa toko aplikasi, termasuk saat luring | Chrome 157 Device Mode (412x892, DPR 2,625, UA Android 14), DevTools Application (Manifest, Service Worker), 4 pemeriksaan | 4/4 lulus: login dan daftar tugas tampil; `installabilityErrors` kosong; mode pesawat dan muat ulang tetap tampil; ditutup 90 detik lalu dibuka lagi saat luring tetap tampil | Pass, dengan catatan bahwa uji memakai emulasi, bukan ponsel fisik. Rencana: ulangi di ponsel Android anggota lewat port forwarding `chrome://inspect` (README bagian 4) |
| KNF05-TC01 | KNF05 | Security | Foto bukti kerja hanya untuk petugas yang login | `tests/int/knf05-akses.int.test.js`: `GET /api/laporan/:id` tanpa login, token palsu, token kedaluwarsa, token relawan, token petugas | 401, 401, 401, 403, dan 200 untuk petugas | Pass |
| KNF05-TC02 | KNF05 | Security | Nomor HP warga hanya bisa dilihat petugas posko yang login | Tes yang sama: `GET /api/simulasi-sms/pesan` tanpa login | Dibalas 200 beserta nomor HP warga (tes ditandai `todo`) | Fail. Penyebab: endpoint halaman simulasi I-08 sengaja dibuka tanpa login (Tabel B.1 Tugas 9 no. 3), tetapi responsnya ikut membawa nomor HP. Solusi: pasang `cekLogin` dan `cekPeran('petugas')` pada `GET /api/simulasi-sms/pesan` dan buka I-08 setelah login petugas (simulasi dijalankan penguji dari posko), atau kirim nomor yang disamarkan (`0813****0001`) beserta `idWarga` saja. Aspek HTTPS belum diuji karena aplikasi dijalankan di `http://localhost`; diuji saat deploy Render |
| KNF06-TC01 | KNF06 | Accuracy | Laporan > 200 m dari batas petak ditandai, 200 m atau kurang tidak | `tests/db/knf06-jarak.test.js` dan C10-UT18: laporan 200 m dan 201 m dari batas, jarak haversine | 200 m tidak ditandai, 201 m ditandai; laporan seed Petak 187 terukur sekitar 340 m | Pass |
| KNF07-TC01 | KNF07 | Availability | Peta dan penugasan dapat diakses tanpa gangguan selama sesi pengujian | `scripts/ukur-knf.js`: 30 permintaan ke `/petugas/`, `/api/peta`, `/petugas/jadwal.html`, `/api/jadwal/form` | 30/30 HTTP 200, 0 galat, rata-rata 2,3 ms, maksimum 7,1 ms | Pass untuk sesi pengujian lokal. Ketersediaan saat demo di Render belum dapat diukur karena demo belum berlangsung; mitigasi: memanaskan URL sebelum demo, basis data di Neon, aset Leaflet dan font lokal |
| KNF08-TC01 | KNF08 | Ergonomy | Tombol aksi utama di 40% bawah layar, kontras minimal 4,5:1, target sentuh minimal 48x48 dp | `scripts/ukur-knf.js` (Chrome CDP, emulasi 412x892 dp) pada `relawan/laporan.html?jadwal=5` | Tombol kirim di y = 824 s.d. 876 dp (batas zona 535,2 dp); target sentuh terkecil 152x48 dp; kontras terendah 5,79:1 (tombol kirim nonaktif) | Pass |
| KNF09-TC01 | KNF09 | Memory | Maksimal 20 laporan tertunda; foto maksimal 500 KB | C15-UT10 (ke-20 diterima, ke-21 ditolak), C15-UT17 dan INT-TC08 (foto > 500 KB dibalas 413), C15-UT19 (urutan kompresi), profiling M9 | Laporan ke-21 ditolak; foto 500 KB + 1 byte dibalas 413 dan tidak masuk DB; foto HP 806 KB terkompres menjadi 180 KB | Pass |
| KNF10-TC01 | KNF10 | Safety | SMS tercatat maksimal 15 menit setelah perhitungan skor selesai | `tests/int/knf10-sms.int.test.js`: 5 kali `POST /api/perbarui` yang menaikkan petak berpenghuni ke tinggi, ukur selisih waktu hitung ke baris `peringatan_sms` | Rata-rata 333 ms, maksimum 378 ms (batas 900.000 ms) | Pass. Catatan: tes ini memanggil Open-Meteo asli sehingga gagal (500) bila dijalankan tanpa internet, seperti pada run ulang 20/11/2026 |
| KNF11-TC01 | KNF11 | Security | Password tersimpan sebagai hash bcrypt; sesi kedaluwarsa 7 hari | `tests/db/knf11-password.test.js` memeriksa kolom `password_hash` semua akun; C22-UT04 dan C22-UT08 untuk masa token | Semua password berawalan `$2b$10$` dan tidak sama dengan teks aslinya; `exp` token tepat 7 hari, lewat 1 detik ditolak 401 | Pass |
| KNF12-TC01 | KNF12 | Security | Nomor yang dicabut > 30 hari terhapus | `tests/int/knf12-nomor.int.test.js`: STOP, mundurkan `waktu_dicabut` 31 hari, `POST /api/perbarui` | Baris warga terhapus | Pass (catatan internet sama dengan KNF10-TC01) |
| KNF12-TC02 | KNF12 | Security | Nomor dicabut 29 hari dan warga aktif tidak terhapus | Tes yang sama dengan 29 hari | Kedua baris tetap ada | Pass |

Berikut rencana perbaikan untuk KNF01-TC01 yang menurut kami masih bisa dikerjakan oleh kelompok, diurutkan dari yang paling mudah:
1. Mengompres `logo-sigap.png` (45,6 kB) menjadi PNG atau WebP di bawah 10 kB dan menyesuaikan ukurannya dengan ukuran tampil.
2. Memakai font sistem (`system-ui`) pada halaman petugas agar `inter-latin-wght-normal.woff2` tidak perlu diunduh.
3. Mengaktifkan kompresi gzip pada Express menggunakan pustaka `compression`. Karena ini menambah dependensi baru, perlu disepakati kelompok terlebih dahulu dengan alasan KNF01. Setelah gzip, ukuran `leaflet.js` yang semula 148 kB diperkirakan turun menjadi sekitar sepertiganya.
4. Memuat `leaflet.js` dengan atribut `defer` agar teks halaman dan panel ringkasan bisa tampil lebih dulu.
5. Mengukur ulang dengan prosedur yang sama (5 kali, Disable cache, preset 3G). Apabila hasilnya masih di atas 5 detik, kami akan melaporkannya apa adanya, karena target 5 detik pada preset 3G DevTools yang latensinya tinggi memang cukup berat bagi halaman yang harus memuat tile peta dari internet.

<br>

## 4.6 Tangkapan Layar dan Bukti Hasil Pengujian

Seluruh berkas bukti kami simpan di `docs/M10/assets/bukti/`. Berkas `coverage-semua-20112026.txt`, `hasil-tes-uc07-db.txt`, dan tangkapan layar `uc07-*` diambil pada 20/11/2026 ketika dokumen ini disusun, sedangkan berkas lainnya diambil oleh penanggung jawab tiap kelas selama pengerjaan M10.

Tabel 4.6. Bukti Hasil Pengujian

| ID Pengujian | Bukti Hasil Pengujian |
| :--- | :--- |
| Semua UT, INT, dan coverage per file | [`coverage-semua-20112026.txt`](./assets/bukti/coverage-semua-20112026.txt) (keluaran `npm run coverage`: 80 + 148 + 42 tes dan tabel coverage c8) |
| C02-UT01 s.d. C02-UT24, C03-UT01 s.d. C03-UT07, C04-UT01 s.d. C04-UT19 | [`hasil-tes-c02-c03-c04.txt`](./assets/bukti/hasil-tes-c02-c03-c04.txt) |
| C02, C03, C04 (coverage) | [`coverage-c02-c03-c04.txt`](./assets/bukti/coverage-c02-c03-c04.txt) |
| C06-UT01 s.d. C06-UT13 | [`hasil-tes-c06-jadwal.txt`](./assets/bukti/hasil-tes-c06-jadwal.txt)<br><img src="./assets/bukti/unit-c06.png" width="600"> |
| C06 (coverage) | [`coverage-c06-jadwal.txt`](./assets/bukti/coverage-c06-jadwal.txt)<br><img src="./assets/bukti/coverage-c06.png" width="600"> |
| C07-UT01 s.d. C07-UT07 | <img src="./assets/bukti/unit-c07.png" width="600"> |
| C10-UT01 s.d. C10-UT37, C11-UT01 s.d. C11-UT08 | [`hasil-tes-c10-verifikasi.txt`](./assets/bukti/hasil-tes-c10-verifikasi.txt) |
| C10, C11 (coverage) | [`coverage-c10-verifikasi.txt`](./assets/bukti/coverage-c10-verifikasi.txt) |
| C13-UT01 s.d. C13-UT14, C15-UT01 s.d. C15-UT19, C22-UT01 s.d. C22-UT19 | [`hasil-tes-setup.txt`](./assets/bukti/hasil-tes-setup.txt) |
| C13, C15, C22 (coverage) | [`coverage-semua-20112026.txt`](./assets/bukti/coverage-semua-20112026.txt) (baris `DaftarTugasController.js`, `UploadLaporanController.js`, `AutentikasiController.js`, `auth.js`, `PenyimpananLokal.js`) |
| C17-UT01 s.d. C17-UT08 | [`coverage-semua-20112026.txt`](./assets/bukti/coverage-semua-20112026.txt) (tes `validasiKeterangan`, `cekPeran`, dan lima tes `tandai keliru`) |
| C18-UT01 s.d. C18-UT12c, C19-UT01 s.d. C19-UT05b, C20-UT01 s.d. C20-UT04, C24-UT01 s.d. C24-UT04b | [`coverage-c18-sms.txt`](./assets/bukti/coverage-c18-sms.txt) |
| INT-TC01 s.d. INT-TC08 | [`hasil-tes-setup.txt`](./assets/bukti/hasil-tes-setup.txt) |
| INT-TC09 s.d. INT-TC15 | [`hasil-tes-c10-verifikasi.txt`](./assets/bukti/hasil-tes-c10-verifikasi.txt) |
| INT-TC16 s.d. INT-TC23 | [`hasil-tes-c06-jadwal.txt`](./assets/bukti/hasil-tes-c06-jadwal.txt)<br><img src="./assets/bukti/int-jadwal-keliru.png" width="600"> |
| INT-TC24 s.d. INT-TC29 | [`coverage-c18-sms.txt`](./assets/bukti/coverage-c18-sms.txt) |
| INT-TC30 s.d. INT-TC35 | [`hasil-tes-c02-c03-c04.txt`](./assets/bukti/hasil-tes-c02-c03-c04.txt) |
| UC01-TC01 | <img src="./assets/bukti/uc01-tc01a-peta.png" width="600"><br><img src="./assets/bukti/uc01-tc01b-atribusi.png" width="600"> |
| UC01-TC02 | <img src="./assets/bukti/uc01-tc02a-respons-500.png" width="600"><br><img src="./assets/bukti/uc01-tc02b-data-usang.png" width="600"> |
| UC02-TC01 | <img src="./assets/bukti/uc02-tc01a-form.png" width="600"><br><img src="./assets/bukti/uc02-tc01b-simpan.png" width="600"><br><img src="./assets/bukti/uc02-tc01c-tugas-relawan.png" width="300"><br><img src="./assets/bukti/uc02-tc01d-notifikasi-relawan.png" width="300"> |
| UC02-TC02 | <img src="./assets/bukti/uc02-tc02a-kapasitas-penuh.png" width="600"><br><img src="./assets/bukti/uc02-tc02b-relawan-lain.png" width="600"> |
| UC03-TC01 | <img src="./assets/bukti/uc03-tc01a-antrean.png" width="600"><br><img src="./assets/bukti/uc03-tc01b-detail.png" width="600"><br><img src="./assets/bukti/uc03-tc01c-disetujui.png" width="600"><br><img src="./assets/bukti/uc03-tc01d-notifikasi-relawan.png" width="300"> |
| UC03-TC02 | <img src="./assets/bukti/uc03-tc02a-peringatan-200m.png" width="600"><br><img src="./assets/bukti/uc03-tc02b-diproses.png" width="600"> |
| UC03-TC03 | <img src="./assets/bukti/uc03-tc03a-alasan-kosong.png" width="600"><br><img src="./assets/bukti/uc03-tc03b-alasan-terisi.png" width="600"><br><img src="./assets/bukti/uc03-tc03c-ditolak.png" width="600"><br><img src="./assets/bukti/uc03-tc03d-relawan-bisa-unggah-ulang.png" width="300"><br><img src="./assets/bukti/uc03-tc03e-notifikasi-penolakan.png" width="300"> |
| UC03-TC04 | <img src="./assets/bukti/uc03-tc04-antrean-kosong.png" width="600"> |
| UC04-TC01 | <img src="./assets/bukti/uc04-tc01a-daftar-tugas-terurut.png" width="300"><br><img src="./assets/bukti/uc04-tc01b-detail-tugas-skor-78.png" width="300"><br><img src="./assets/bukti/uc04-tc01c-detail-tugas-skor-46.png" width="300"><br><img src="./assets/bukti/uc04-tc01d-detail-tugas-skor-12.png" width="300"> |
| UC04-TC02 | <img src="./assets/bukti/uc04-tc02a-daftar-tugas-luring.png" width="300"><br><img src="./assets/bukti/uc04-tc02b-detail-tugas-luring.png" width="300"> |
| UC04-TC03 | <img src="./assets/bukti/uc04-tc03-belum-ada-tugas.png" width="300"> |
| UC04-TC04 | <img src="./assets/bukti/uc04-tc04a-detail-tugas-dengan-tombol-batal.png" width="300"><br><img src="./assets/bukti/uc04-tc04b-form-pembatalan-terisi.png" width="300"><br><img src="./assets/bukti/uc04-tc04c-pembatalan-berhasil.png" width="300"><br><img src="./assets/bukti/uc04-tc04d-notifikasi-pembatalan-di-petugas.png" width="600"> |
| UC05-TC01 | <img src="./assets/bukti/uc05-tc01a-form-laporan-siap-kirim.png" width="300"><br><img src="./assets/bukti/uc05-tc01b-laporan-terkirim.png" width="300"><br><img src="./assets/bukti/uc05-tc01c-laporan-muncul-di-antrean-petugas.png" width="600"> |
| UC05-TC02 | <img src="./assets/bukti/uc05-tc02a-menunggu-dikirim-saat-luring.png" width="300"><br><img src="./assets/bukti/uc05-tc02b-terkirim-otomatis-setelah-daring.png" width="300"><br><img src="./assets/bukti/uc05-tc02c-laporan-luring-muncul-sekali-di-antrean.png" width="600"> |
| UC05-TC03 | <img src="./assets/bukti/uc05-tc03a-peringatan-gps-belum-aktif.png" width="300"><br><img src="./assets/bukti/uc05-tc03b-koordinat-terisi-setelah-gps-aktif.png" width="300"> |
| UC05-TC04 | <img src="./assets/bukti/uc05-tc04-penyimpanan-lokal-penuh.png" width="300"> |
| UC06-TC01 | <img src="./assets/bukti/uc06-tc01a-detail-tugas-titik-panas.png" width="300"><br><img src="./assets/bukti/uc06-tc01b-form-tandai-keliru-terisi.png" width="300"><br><img src="./assets/bukti/uc06-tc01c-berhasil-ditandai-keliru.png" width="300"> |
| UC06-TC02 | <img src="./assets/bukti/uc06-tc02a-peringatan-keterangan-kosong.png" width="300"> |
| UC07-TC01 | <img src="./assets/bukti/uc07-tc01-sms-peringatan-diterima.png" width="300"><br>[`hasil-tes-uc07-db.txt`](./assets/bukti/hasil-tes-uc07-db.txt) (isi pesan dan status `terkirim`) |
| UC07-TC02 | <img src="./assets/bukti/uc07-tc02-gagal-tidak-tampil.png" width="300"><br>[`hasil-tes-uc07-db.txt`](./assets/bukti/hasil-tes-uc07-db.txt) (status `gagal` untuk `081300000002`) |
| UC07-TC03 | <img src="./assets/bukti/uc07-tc03a-balasan-stop-diketik.png" width="300"><br><img src="./assets/bukti/uc07-tc03b-balasan-stop-terkirim.png" width="300"><br>[`hasil-tes-uc07-db.txt`](./assets/bukti/hasil-tes-uc07-db.txt) (status `dicabut`) |
| UC08-TC01 | <img src="./assets/bukti/uc08-tc01a-login-petugas.png" width="600"><br><img src="./assets/bukti/uc08-tc01b-peta-risiko.png" width="600"><br><img src="./assets/bukti/uc08-tc01c-login-relawan.png" width="300"><br><img src="./assets/bukti/uc08-tc01d-daftar-tugas.png" width="300"> |
| UC08-TC02 | <img src="./assets/bukti/uc08-tc02a-kredensial-salah.png" width="300"><br><img src="./assets/bukti/uc08-tc02b-login-ulang-berhasil.png" width="300"> |
| UC08-TC03 | <img src="./assets/bukti/uc08-tc03a-sesi-ada-luring.png" width="300"><br><img src="./assets/bukti/uc08-tc03b-tanpa-sesi-luring.png" width="300"> |
| KNF01-TC01 | [`hasil-tes-knf01-peta-3g.txt`](./assets/bukti/hasil-tes-knf01-peta-3g.txt)<br><img src="./assets/bukti/knf01-tc01a-peta-3g-termuat.png" width="600"><br><img src="./assets/bukti/knf01-tc01b-devtools-network-3g.png" width="600"> |
| KNF02-TC01, KNF02-TC02 | [`hasil-tes-knf02.txt`](./assets/bukti/hasil-tes-knf02.txt)<br><img src="./assets/bukti/knf02-tc01-peta-cache-usang.png" width="600"> |
| KNF03-TC01 | [`hasil-tes-setup.txt`](./assets/bukti/hasil-tes-setup.txt) (C15-UT02, C15-UT03, C15-UT12, INT-TC07) |
| KNF04-TC01 | [`hasil-tes-knf04-emulasi.txt`](./assets/bukti/hasil-tes-knf04-emulasi.txt)<br><img src="./assets/bukti/knf04-tc01a-emulasi-android-daftar-tugas-daring.png" width="300"><br><img src="./assets/bukti/knf04-tc01b-emulasi-android-mode-pesawat.png" width="300"><br><img src="./assets/bukti/knf04-tc01c-emulasi-android-dibuka-ulang-saat-mode-pesawat.png" width="300"><br><img src="./assets/bukti/knf04-tc01d-devtools-manifest.png" width="600"><br><img src="./assets/bukti/knf04-tc01e-devtools-service-worker.png" width="600"> |
| KNF05-TC01, KNF05-TC02 | [`hasil-tes-knf05.txt`](./assets/bukti/hasil-tes-knf05.txt)<br><img src="./assets/bukti/knf05-tc01-tc02.png" width="600"> |
| KNF06-TC01 | [`coverage-semua-20112026.txt`](./assets/bukti/coverage-semua-20112026.txt) (tes `KNF06-TC01`) dan [`hasil-tes-c10-verifikasi.txt`](./assets/bukti/hasil-tes-c10-verifikasi.txt) (C10-UT18) |
| KNF07-TC01 | [`hasil-tes-knf07-justifikasi.txt`](./assets/bukti/hasil-tes-knf07-justifikasi.txt) |
| KNF08-TC01 | [`hasil-tes-knf08-ergonomi.txt`](./assets/bukti/hasil-tes-knf08-ergonomi.txt)<br><img src="./assets/bukti/knf08-tc01a-form-laporan-mobile.png" width="300"><br><img src="./assets/bukti/knf08-tc01b-pengukuran-ergonomi.png" width="600"> |
| KNF09-TC01 | [`hasil-tes-setup.txt`](./assets/bukti/hasil-tes-setup.txt) (C15-UT10, C15-UT17, INT-TC08) dan Tugas 9 Subbab B.2.1 (profiling `kompresFoto`) |
| KNF10-TC01 | [`hasil-tes-knf10.txt`](./assets/bukti/hasil-tes-knf10.txt) |
| KNF11-TC01 | [`coverage-semua-20112026.txt`](./assets/bukti/coverage-semua-20112026.txt) (tes `KNF11-TC01`, C22-UT04, C22-UT08) |
| KNF12-TC01, KNF12-TC02 | [`hasil-tes-knf12.txt`](./assets/bukti/hasil-tes-knf12.txt) |

<br>

---

# BAB 5: Traceability

Sebuah KF kami anggap terpenuhi apabila seluruh test case yang terkait dengannya berkesimpulan Pass. Seluruh KF01 sampai KF24 sudah diimplementasikan, tetapi KF16 belum dapat dinyatakan terpenuhi karena UC07-TC01 masih Fail (isi SMS belum memuat tindakan yang disarankan).

Tabel 5.1. Matriks Kerunutan KF terhadap Implementasi dan Pengujian

| KF ID | KNF Terkait | Use Case ID | Kelas Terkait | Implementasi File Terkait | Test Case (UC) | Test Case (Unit/Integrasi/KNF) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| KF01 | KNF01, KNF07 | UC01 | C01 - HalamanPetaRisiko<br>C02 - PetaRisikoController<br>C03 - PetakLahan | `src/public/petugas/js/HalamanPetaRisiko.js`<br>`src/controllers/PetaRisikoController.js`<br>`src/models/PetakLahan.js` | UC01-TC01, UC08-TC01 | C02-UT20, C03-UT01, INT-TC34, KNF01-TC01, KNF07-TC01 |
| KF02 | KNF02 | UC01 | C02 - PetaRisikoController<br>C03 - PetakLahan<br>C04 - TitikPanas | `src/controllers/PetaRisikoController.js`<br>`src/scripts/perbarui.js`<br>`src/models/PetakLahan.js`<br>`src/models/TitikPanas.js` | UC01-TC01 | C02-UT01 s.d. C02-UT07, C02-UT13, C02-UT16, C02-UT19, C03-UT06, C04-UT08 s.d. C04-UT11, INT-TC30 |
| KF03 | - | UC01 | C02 - PetaRisikoController<br>C03 - PetakLahan | `src/controllers/PetaRisikoController.js`<br>`src/sql/seed.js` (grid 99 petak) | UC01-TC01 | C02-UT06, C02-UT13, INT-TC30 |
| KF04 | KNF02 | UC01 | C01 - HalamanPetaRisiko<br>C02 - PetaRisikoController | `src/public/petugas/js/HalamanPetaRisiko.js`<br>`src/controllers/PetaRisikoController.js` | UC01-TC02 | C02-UT08 s.d. C02-UT10, C02-UT15, C02-UT17, C02-UT21, C02-UT22, INT-TC31, INT-TC32, INT-TC35, KNF02-TC01, KNF02-TC02 |
| KF05 | - | UC02 | C05 - FormPenyusunanJadwal<br>C06 - JadwalController<br>C08 - RelawanLapangan | `src/public/petugas/js/FormPenyusunanJadwal.js`<br>`src/controllers/JadwalController.js`<br>`src/models/RelawanLapangan.js` | UC02-TC01 | C06-UT04 s.d. C06-UT06, INT-TC16 |
| KF06 | - | UC02 | C06 - JadwalController<br>C08 - RelawanLapangan | `src/controllers/JadwalController.js`<br>`src/models/RelawanLapangan.js` | UC02-TC02 | C06-UT08, C06-UT09, INT-TC18 |
| KF07 | - | UC02 | C06 - JadwalController<br>C07 - JadwalPekerjaan<br>C24 - Notifikasi | `src/controllers/JadwalController.js`<br>`src/models/JadwalPekerjaan.js`<br>`src/models/Notifikasi.js` | UC02-TC01 | C06-UT07, C06-UT13, C07-UT01 s.d. C07-UT07, C24-UT01, INT-TC17, INT-TC20 |
| KF08 | - | UC03 | C09 - HalamanAntreanLaporan<br>C10 - VerifikasiLaporanController<br>C11 - LaporanBuktiKerja | `src/public/petugas/js/HalamanAntreanLaporan.js`<br>`src/controllers/VerifikasiLaporanController.js`<br>`src/models/LaporanBuktiKerja.js` | UC03-TC01, UC03-TC04 | C10-UT14 s.d. C10-UT16, C11-UT01, C11-UT02, INT-TC09 |
| KF09 | KNF06 | UC03 | C09 - HalamanAntreanLaporan<br>C10 - VerifikasiLaporanController | `src/public/petugas/js/HalamanAntreanLaporan.js`<br>`src/controllers/VerifikasiLaporanController.js` | UC03-TC01, UC03-TC02 | C10-UT01 s.d. C10-UT06, C10-UT17 s.d. C10-UT20, INT-TC10, KNF06-TC01 |
| KF10 | KNF05 | UC03 | C10 - VerifikasiLaporanController<br>C11 - LaporanBuktiKerja<br>C15 - UploadLaporanController | `src/controllers/VerifikasiLaporanController.js`<br>`src/models/LaporanBuktiKerja.js`<br>`src/controllers/UploadLaporanController.js` | UC03-TC01 | C10-UT22, C10-UT24, C10-UT29, C10-UT31, C11-UT06, C11-UT08, C15-UT05, INT-TC14 |
| KF11 | - | UC04 | C12 - HalamanDaftarTugas<br>C13 - DaftarTugasController<br>C07 - JadwalPekerjaan | `src/public/relawan/js/HalamanDaftarTugas.js`<br>`src/controllers/DaftarTugasController.js`<br>`src/public/relawan/js/DaftarTugasController.js`<br>`src/models/JadwalPekerjaan.js` | UC04-TC01, UC04-TC03 | C13-UT01 s.d. C13-UT03, C13-UT07, C13-UT08, INT-TC03 |
| KF12 | KNF09 | UC05 | C14 - FormLaporanBuktiKerja<br>C15 - UploadLaporanController | `src/public/relawan/js/FormLaporanBuktiKerja.js`<br>`src/public/relawan/js/UploadLaporanController.js`<br>`src/public/relawan/js/PenyimpananLokal.js` | UC05-TC02, UC05-TC03, UC05-TC04 | C15-UT06 s.d. C15-UT10, KNF09-TC01 |
| KF13 | KNF03 | UC05 | C15 - UploadLaporanController<br>C11 - LaporanBuktiKerja<br>C07 - JadwalPekerjaan | `src/public/relawan/js/UploadLaporanController.js`<br>`src/controllers/UploadLaporanController.js`<br>`src/models/LaporanBuktiKerja.js` | UC05-TC01, UC05-TC02 | C15-UT01 s.d. C15-UT05, C15-UT11 s.d. C15-UT16, INT-TC06, INT-TC07, KNF03-TC01 |
| KF14 | - | UC06 | C16 - DialogTandaiKeliru<br>C17 - DeteksiKeliruController | `src/public/relawan/js/DialogTandaiKeliru.js`<br>`src/controllers/DeteksiKeliruController.js`<br>`src/public/relawan/js/DeteksiKeliruController.js` | UC06-TC01, UC06-TC02 | C17-UT01 s.d. C17-UT03, INT-TC21 |
| KF15 | - | UC06, UC01 | C17 - DeteksiKeliruController<br>C04 - TitikPanas | `src/controllers/DeteksiKeliruController.js`<br>`src/models/TitikPanas.js` | UC06-TC01 | C04-UT03 s.d. C04-UT07, C04-UT12, C04-UT13, C04-UT16 s.d. C04-UT19, C17-UT04 s.d. C17-UT08, INT-TC22, INT-TC23 |
| KF16 | KNF10 | UC07 | C18 - PeringatanSMSController<br>C19 - Warga<br>C20 - PeringatanSMS<br>C02 - PetaRisikoController | `src/controllers/PeringatanSMSController.js`<br>`src/models/Warga.js`<br>`src/models/PeringatanSMS.js`<br>`src/controllers/SimulasiSMSController.js` | UC07-TC01 (Fail), UC07-TC02 | C02-UT14, C18-UT01 s.d. C18-UT07, C19-UT01, C19-UT02, C20-UT01 s.d. C20-UT04, INT-TC24, INT-TC25, INT-TC30, KNF10-TC01. **Belum terpenuhi**: isi SMS belum memuat tindakan yang disarankan (UC07-TC01) |
| KF17 | - | UC02 | C06 - JadwalController<br>C03 - PetakLahan | `src/controllers/JadwalController.js`<br>`src/models/PetakLahan.js` | UC02-TC01 | C03-UT04, C03-UT05, C06-UT05 |
| KF18 | KNF11 | UC08 | C21 - HalamanLogin<br>C22 - AutentikasiController<br>C23 - Pengguna | `src/public/relawan/js/HalamanLogin.js`<br>`src/controllers/AutentikasiController.js`<br>`src/public/relawan/js/AutentikasiController.js`<br>`src/models/Pengguna.js` | UC08-TC01 | C22-UT03, C22-UT10, C22-UT16, C22-UT19, INT-TC01, KNF11-TC01 |
| KF19 | - | UC08 | C21 - HalamanLogin<br>C22 - AutentikasiController | `src/public/relawan/js/HalamanLogin.js`<br>`src/controllers/AutentikasiController.js` | UC08-TC02 | C22-UT01, C22-UT02, C22-UT11, C22-UT12, C22-UT17, C22-UT18, INT-TC02 |
| KF20 | KNF04, KNF11 | UC08, UC04 | C22 - AutentikasiController<br>C13 - DaftarTugasController | `src/public/relawan/js/AutentikasiController.js`<br>`src/public/relawan/js/DaftarTugasController.js`<br>`src/public/relawan/sw.js` | UC08-TC03, UC04-TC02 | C22-UT13 s.d. C22-UT15, KNF04-TC01 |
| KF21 | - | UC04 | C13 - DaftarTugasController<br>C07 - JadwalPekerjaan<br>C24 - Notifikasi | `src/controllers/DaftarTugasController.js`<br>`src/models/JadwalPekerjaan.js`<br>`src/models/Notifikasi.js` | UC04-TC04 | C13-UT04 s.d. C13-UT06, C13-UT09 s.d. C13-UT11, INT-TC05, INT-TC29 |
| KF22 | KNF12 | UC07 | C18 - PeringatanSMSController<br>C19 - Warga | `src/controllers/PeringatanSMSController.js`<br>`src/models/Warga.js`<br>`src/controllers/SimulasiSMSController.js` | UC07-TC03 | C18-UT08 s.d. C18-UT11b, C19-UT03 s.d. C19-UT04b, INT-TC26, INT-TC27 |
| KF23 | - | UC01 | C01 - HalamanPetaRisiko | `src/public/petugas/index.html`<br>`src/public/petugas/js/HalamanPetaRisiko.js` | UC01-TC01 | - |
| KF24 | - | UC03 | C10 - VerifikasiLaporanController<br>C07 - JadwalPekerjaan<br>C24 - Notifikasi | `src/controllers/VerifikasiLaporanController.js`<br>`src/models/JadwalPekerjaan.js`<br>`src/models/Notifikasi.js` | UC03-TC01, UC03-TC03 | C10-UT21, C10-UT25, C10-UT27, C10-UT28, C10-UT33 s.d. C10-UT37, INT-TC11, INT-TC12 |

Tabel 5.2. Matriks Kerunutan KNF terhadap Pengujian

| ID KNF | Parameter | KF/UC Terkait | Test Case | Status |
| :--- | :--- | :--- | :--- | :--- |
| KNF01 | Response time | KF01 / UC01 | KNF01-TC01 | Belum terpenuhi (Fail) |
| KNF02 | Reliability | KF02, KF04 / UC01 | KNF02-TC01, KNF02-TC02 | Terpenuhi |
| KNF03 | Reliability | KF13 / UC05 | KNF03-TC01 | Terpenuhi |
| KNF04 | Portability | KF20 / UC04, UC05, UC08 | KNF04-TC01 | Terpenuhi (emulasi) |
| KNF05 | Security | KF10 / UC03, UC07 | KNF05-TC01, KNF05-TC02 | Belum terpenuhi (KNF05-TC02 Fail) |
| KNF06 | Accuracy | KF09 / UC03 | KNF06-TC01 | Terpenuhi |
| KNF07 | Availability | KF01, KF05 / UC01, UC02 | KNF07-TC01 | Terpenuhi untuk sesi pengujian lokal |
| KNF08 | Ergonomy | KF12 / UC05 | KNF08-TC01 | Terpenuhi |
| KNF09 | Memory | KF12 / UC05 | KNF09-TC01 | Terpenuhi |
| KNF10 | Safety | KF16 / UC07 | KNF10-TC01 | Terpenuhi |
| KNF11 | Security | KF18, KF20 / UC08 | KNF11-TC01 | Terpenuhi |
| KNF12 | Security | KF22 / UC07 | KNF12-TC01, KNF12-TC02 | Terpenuhi |
