<h1>
IF2150 REKAYASA PERANGKAT LUNAK
<br>
TUGAS 9
<br>
IMPLEMENTASI PERANGKAT LUNAK
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

# BAGIAN B: Laporan Implementasi

## B.1 Perubahan dari DPPL

Catat semua perbedaan antara perancangan (DPPL) dan implementasi akhir. Jika tidak ada perubahan, tuliskan "Tidak ada perubahan".

Tabel B.1. Perubahan dari DPPL

| No | Bagian DPPL | Rancangan Awal | Implementasi Akhir | Alasan |
| :--- | :--- | :--- | :--- | :--- |
| 1 | C18 `prosesBalasanStop` | `void` | Mengembalikan `boolean` (true jika persetujuan dicabut) | Dipakai halaman simulasi untuk memberi respons |
| 2 | C20 `PeringatanSMS` | `catat` `adaDalam24Jam` | Menambah `ambilTerkirimTerbaru(batas)` | Halaman I-08 perlu menampilkan SMS yang terkirim |
| 3 | `SMSGatewaySimulasi` | Komponen eksternal tiruan | `controllers/SimulasiSMSController.js` + endpoint `/api/simulasi-sms/*` tanpa login | SKPL batasan 4; halaman berperan sebagai ponsel warga, data fiktif |
| 4 | Algo-001 (C02 `perbaruiData`) | `hapusNomorDicabut` tidak dibungkus `try/catch` | Dipanggil lewat `jalankanHapusNomorDicabut` dengan `try/catch`; Kegagalan hanya dicatat di log | Kegagalan dalam membersihkan nomor tidak boleh membuat `perbaruiData` membalas dengan 500 setelah skor semua petak disimpan |
| 5 | Algo-012 (C18 `cekAmbangRisiko`) | Tidak ada `try/catch`; `statusPersetujuan` diperiksa lagi dalam perulangan warga | Setiap petak diproses dalam `try/catch` (kegagalan dicatat, petak berikutnya tetap diproses); pemeriksaan `statusPersetujuan` dalam perulangan tidak diulang | Satu petak bermasalah tidak boleh membatalkan petak lain. Pemeriksaan ulang tidak perlu karena Q-020 (Algo-013) sudah hanya mengambil warga `aktif` |
| 6 | C10 `hitungJarak` | Operasi privat (`-`) | Diekspor dari `VerifikasiLaporanController.js` | Agar Algo-005 bisa diuji langsung di `tests/verifikasi.test.js` tanpa menjalankan server dan database |
| 7 | C10 (validasi `idLaporan`) | Tidak ada pemeriksaan format id | Fungsi `idValid` memeriksa pola UUID; id yang bukan UUID langsung dibalas 404 | Kolom `id_laporan` bertipe UUID, jadi Postgres melempar galat 22P02 untuk id asal-asalan dan server membalas 500, padahal yang tepat 404 |
| 8 | Algo-006 dan C10 `tolakLaporan` | `Notifikasi.buat` dipanggil setelah transaksi selesai tanpa penanganan galat | Dipanggil lewat `kirimNotifikasi` dengan `try/catch`; kegagalannya hanya dicatat di log | Setelah COMMIT keputusan petugas sudah tersimpan. Kalau notifikasi gagal dibuat, petugas tidak boleh menerima 500 untuk laporan yang sebenarnya sudah diproses |
| 9 | C10 `ambilDetailLaporan` | Mengembalikan `Object` berisi laporan dan jarak | Foto dikirim sebagai data URL JPEG (base64) di dalam JSON, ditambah `petak`, `batasJarak`, dan `melebihiBatas` | Halaman bisa langsung memasang foto di `<img>` tanpa endpoint foto terpisah. Foto selalu JPEG karena dikompres `kompresFoto()` (C15) |
| 10 | C09 `HalamanAntreanLaporan` | `tampilkanPesanBerhasil(pesan: String)`; tidak ada operasi untuk antrean yang gagal dimuat | `tampilkanPesanBerhasil(judul, isi)` dan tambahan `tampilkanGagalMemuatAntrean()` | Panel I04-28 terdiri dari judul dan isi. Kondisi antrean gagal dimuat (Gambar 6.4h) ada di rancangan layar, tetapi belum punya operasi di Tabel 5.9.1 |
| 11 | C22 `AutentikasiController` | Satu kelas yang berisi `login`, `periksaSesi`, `arahkanSesuaiPeran`, `verifikasiKredensial`, dan `buatSesi` | Kelas dibagi menjadi dua berkas. Bagian server (`controllers/AutentikasiController.js`) berisi `login`, `verifikasiKredensial`, dan `buatSesi`, sedangkan bagian klien (`public/relawan/js/AutentikasiController.js`) berisi `login`, `periksaSesi`, `arahkanSesuaiPeran`, serta fungsi tambahan `ambilPeran`, `ambilIdPengguna`, `ambilToken`, dan `keluar` | Sesi disimpan sebagai JWT di browser, sehingga pengecekan sesi dan perpindahan halaman lebih tepat dijalankan di sisi klien. Fungsi tambahan kami perlukan karena halaman lain harus bisa membaca isi token dan melakukan logout |
| 12 | C22, pemeriksaan sesi di server | Belum ada di rancangan | Middleware `cekLogin` dan `cekPeran(peran)` pada `middleware/auth.js` | Setiap endpoint wajib menolak token yang tidak sah dengan 401 dan peran yang tidak sesuai dengan 403 (KNF05). Kami membuatnya sebagai middleware agar pengecekan yang sama tidak ditulis ulang di setiap controller |
| 13 | C21 `HalamanLogin` | Halaman login khusus relawan | Modul `HalamanLogin.js` dipakai bersama oleh `petugas/login.html` dan `relawan/login.html`, ditambah fungsi privat `perbaruiTampilan()` | Alur login petugas dan relawan sebenarnya sama, yang membedakan hanya halaman tujuan setelah berhasil masuk dan hal itu sudah diatur oleh `arahkanSesuaiPeran`. Fungsi `perbaruiTampilan` mengatur keadaan isi, memeriksa, gagal, dan luring dari satu tempat dan dipanggil kembali ketika event `online` atau `offline` terjadi |
| 14 | Q-009 (C07 `ambilAktifByRelawan`) | Kolom `tanggal` dibaca langsung | Kolom dibaca dengan `TO_CHAR(tanggal, 'YYYY-MM-DD')` | Driver `pg` mengubah kolom `DATE` menjadi objek `Date` lokal lalu menjadi waktu UTC, akibatnya tanggal tugas mundur satu hari pada zona WIB |
| 15 | C13 `DaftarTugasController` | Satu kelas | Kelas dibagi menjadi bagian server (`controllers/DaftarTugasController.js`) yang berisi `ambilTugasRelawan`, `batalkanTugasTidakAman`, `tandaiNotifikasiDibaca`, dan `urutkanBerdasarkanSkorRisiko`, serta bagian klien (`public/relawan/js/DaftarTugasController.js`) yang berisi `muatDaftarTugas`, `batalkanTugasTidakAman`, `tandaiNotifikasiDibaca`, `simpanSalinanLokal`, dan `ambilSalinanLokal` | Salinan lokal di IndexedDB hanya ada pada perangkat relawan, sementara pengurutan dan pembatalan tugas membutuhkan akses ke basis data |
| 16 | C13 `urutkanBerdasarkanSkorRisiko` | Operasi privat (`-`) | Fungsi diekspor | Supaya fungsi ini dapat diuji secara langsung di `tests/daftar-tugas.test.js` tanpa perlu menyalakan server dan basis data |
| 17 | C13 `muatDaftarTugas` (Algo-007) | Salinan lokal hanya ditampilkan ketika perangkat tidak terhubung | Respons 5xx dari server juga diperlakukan sama seperti luring, jadi salinan lokal tetap muncul | Bagi relawan di lapangan, server yang bermasalah berdampak sama dengan tidak ada sinyal. Menurut kami relawan lebih terbantu melihat daftar tugas terakhir dibandingkan layar galat |
| 18 | C12 `HalamanDaftarTugas` | Tujuh operasi sesuai Tabel 5.12 | Ditambah `tampilkanWaktuSinkron(waktu)`, `tampilkanHasilSinkron({terkirim, ditolak})`, dan `pasangPenangan(daftar)` | Label waktu sinkron tetap perlu tampil saat daring sesuai kriteria I-05b. `tampilkanHasilSinkron` memberi tahu relawan hasil pengiriman laporan yang sempat tertunda, sedangkan `pasangPenangan` menghubungkan tombol pada view dengan controller sehingga view tidak perlu mengimpor controller |
| 19 | C14 `FormLaporanBuktiKerja` (layar I-06) | Layar yang berada di dalam halaman daftar tugas | Halaman tersendiri `relawan/laporan.html?jadwal=<id>`, dengan `mulaiLaporan()` dijalankan ketika halaman dibuka | Berkas `HalamanDaftarTugas.js` sudah hampir mencapai 300 baris. Dengan halaman terpisah, tombol kembali "< Tugas" juga bisa langsung mengarah ke daftar tugas |
| 20 | C14 `tampilkanPesanTerkirim` | Tanpa parameter | Menjadi `tampilkanPesanTerkirim(otomatis = false)` | Layar I06-16, yaitu laporan yang terkirim otomatis setelah koneksi kembali, memakai teks yang berbeda dengan laporan yang langsung terkirim |
| 21 | C15 `UploadLaporanController` | Satu kelas yang memuat operasi klien sekaligus `terimaLaporan` | Kelas dibagi menjadi bagian klien (`public/relawan/js/UploadLaporanController.js`) yang berisi `mulaiLaporan`, `kompresFoto`, `kirimLaporan`, `sinkronOtomatis`, `generateUUID`, `deteksiKoneksi`, `hitungLaporanTertunda`, dan `simpanLokal`, serta bagian server (`controllers/UploadLaporanController.js`) yang berisi `terimaLaporan` beserta fungsi tambahan `terimaFoto` dan `bacaLaporan` | `terimaFoto` membungkus multer agar foto yang lebih besar dari 500 KB dibalas 413, bukan 500 seperti bawaan Express. `bacaLaporan` memisahkan validasi isi multipart supaya bisa diuji tanpa basis data |
| 22 | C15 `kompresFoto` dan `sinkronOtomatis` | `kompresFoto` mengembalikan `Blob`, sedangkan `sinkronOtomatis` bertipe `void` | `kompresFoto` mengembalikan `null` apabila foto masih di atas 500 KB setelah semua percobaan (mulai dari 1280 px dengan kualitas 0,8 hingga 0,5, kemudian diulang pada 960 px), dan `sinkronOtomatis` mengembalikan `{terkirim, ditolak}`. Kami juga menambahkan `adaLaporanTertunda(idJadwal)` dan `daftarPercobaanKompresi()` | Nilai `null` dipakai untuk meminta relawan memotret ulang. Hasil sinkronisasi juga dipakai oleh halaman daftar tugas yang tidak memiliki elemen form. `adaLaporanTertunda` mencegah relawan membuat dua laporan untuk satu tugas ketika luring, sedangkan `daftarPercobaanKompresi` diekspor untuk keperluan pengujian |
| 23 | Algo-011 (C15 `terimaLaporan`) | UUID ganda dideteksi melalui galat PRIMARY KEY | `cekUUIDAda` dipanggil sekali lagi sebelum server membalas 409, dan UUID ganda dibalas 200 | Saat kami menguji dua kiriman dengan UUID yang sama secara bersamaan, kiriman kedua menunggu kunci baris tugas, lalu `UPDATE` miliknya tidak mengenai baris mana pun sehingga hasilnya 409, bukan galat PRIMARY KEY seperti perkiraan di DPPL. Setelah ditambah pemeriksaan ulang, tiga kiriman serentak menghasilkan 201, 200, dan 200 dengan hanya satu baris yang tersimpan. Kami memilih 200 karena pada Algo-009 dan Algo-010 kode 409 berarti laporan ditolak permanen dan akan dihapus oleh klien |
| 24 | Penyimpanan lokal (C13 dan C15) | Tidak dirancang sebagai unit tersendiri | Modul `public/relawan/js/PenyimpananLokal.js` (`simpan`, `ambil`, `ambilSemua`, `hitung`, `hapus`) yang membungkus IndexedDB `sigap` dengan store `salinanTugas` dan `laporanTertunda` | Modul ini dipakai bersama oleh C13 dan C15 agar kode IndexedDB tidak perlu ditulis dua kali |


## B.2 Bukti Penerapan Best Practices

Tabel B.2. Bukti Best Practices

| Praktik | Bukti | Keterangan |
| :--- | :--- | :--- |
| Branching | [https://github.com/Levvroy/IF2150-RPL-K01-G08/branches](https://github.com/Levvroy/IF2150-RPL-K01-G08/branches) | Branch `main` hanya menerima hasil yang sudah siap dikumpulkan, sementara `develop` menjadi tempat integrasi. Setiap use case dikerjakan di branch dengan format `<tipe>/<nama>`, contohnya `chore/fondasi`, `feat/uc08-login`, `feat/uc04-daftar-tugas-relawan`, `feat/uc05-laporan-luring`, `feat/UC03-verifikasi-laporan`, dan `feat/c24-notifikasi`. Laporan ditulis di branch `docs/laporan-m9`, dan seluruh branch fitur digabungkan ke `develop` melalui PR |
| Semantic commit | [https://github.com/Levvroy/IF2150-RPL-K01-G08/commits/develop](https://github.com/Levvroy/IF2150-RPL-K01-G08/commits/develop) | Pesan commit mengikuti format `<tipe>(<scope>): <deskripsi>`, misalnya `feat(uc05): nambahin endpoint POST /api/laporan dengan batas foto 500 KB dan penolakan UUID ganda`, `test(auth): tambah tes cekPassword dan isi token sesi`, dan `fix(seed): samakan akun uji seed.js dengan readme nya`. Tipe yang kami pakai adalah `feat`, `fix`, `test`, `docs`, `style`, dan `chore` |
| Track tasks | [https://github.com/Levvroy/IF2150-RPL-K01-G08/issues?q=is%3Aissue](https://github.com/Levvroy/IF2150-RPL-K01-G08/issues?q=is%3Aissue) | Terdapat 10 issue (#2 sampai #11), yaitu satu issue untuk setiap use case, satu untuk C24 Notifikasi, dan #5 untuk laporan M9. Setiap issue diberi judul berformat `[FEAT]` atau `[DOCS]`, memuat ringkasan dan acceptance criteria, memiliki label tipe (`enhancement`, `documentation`) dan prioritas (`high`, `medium`, `low`), serta punya penanggung jawab. Issue ditutup otomatis oleh PR melalui `Closes #n` |
| Pull request dan review | [#16](https://github.com/Levvroy/IF2150-RPL-K01-G08/pull/16), [#17](https://github.com/Levvroy/IF2150-RPL-K01-G08/pull/17), [#13](https://github.com/Levvroy/IF2150-RPL-K01-G08/pull/13) | Ada 10 PR dan semuanya di-review sebelum di-merge. PR #16 (UC05 oleh Jonathan) di-approve oleh Rafi, Rafiif, dan Reinhard. PR #17 (UC01 oleh Arga) dua kali diminta perubahan oleh Jonathan, pertama karena data cuaca diisi nilai karangan ketika Open-Meteo gagal dan kedua karena Leaflet perlu dipindah ke `vendor/` agar peta tetap tampil tanpa internet, baru kemudian di-approve. PR #13 (UC03 oleh Rafiif) diminta mengembalikan Q-019 sesuai DPPL2 sebelum di-approve |
| Pengujian | [`src/tests/`](https://github.com/Levvroy/IF2150-RPL-K01-G08/tree/develop/src/tests) | Perintah `npm test` menjalankan 34 tes unit dengan `node:test` tanpa basis data, dan seluruhnya lulus. Yang diuji antara lain `cekPassword` dan isi token (UC08), urutan skor risiko dan validasi pembatalan (UC04), validasi laporan, batas 413, dan urutan kompresi foto (UC05), perhitungan jarak dan alasan penolakan (UC03), skor risiko (UC01), serta data seed. Tes yang membutuhkan PostgreSQL berada di `tests/db/` dan dijalankan dengan `npm run test:db` |

### B.2.1 Profiling dan Optimasi

Pilih minimal satu fitur yang diprofil.

| Informasi | Keterangan |
| :--- | :--- |
| Fitur / proses yang diprofil | Fungsi `kompresFoto()` pada C15 untuk UC05 Mengunggah Laporan Bukti Kerja (`src/public/relawan/js/UploadLaporanController.js`). Fungsi ini mengecilkan foto hingga paling besar 500 KB di perangkat relawan sebelum dikirim atau disimpan luring (KNF09). Kami memilih proses ini karena merupakan pekerjaan paling berat di sisi klien, sebab foto harus di-decode lalu di-encode ulang di main thread |
| Alat | Chrome DevTools (tab Performance dengan CPU throttling 4x slowdown) dan pengukuran `performance.now()` melalui Console. Waktu decode (`createImageBitmap`), `drawImage`, dan encode (`canvas.toBlob`) kami ukur secara terpisah. Pengujian dilakukan di laptop dengan 16 thread pada `localhost:3000` |
| Temuan (sebelum) | Untuk foto kamera HP berupa JPEG 1450×2576 berukuran 806 KB, sepuluh kali percobaan membutuhkan 60 sampai 80 ms dengan median 65 ms. Hasilnya 180 KB dan sudah lolos di percobaan pertama (1280 px, kualitas 0,8), dengan rincian decode 30 ms, encode 42 ms, dan `drawImage` kurang dari 1 ms. Kami juga membuat kasus terburuk berupa gambar 12 MP berisi derau acak sebesar 10 MB yang sangat sulit dikompres. Lima kali percobaan membutuhkan 232 sampai 250 ms dengan hasil 395 KB, dan tetap lolos di percobaan pertama (decode 136 ms, encode 95 ms). Dengan CPU diperlambat 4 kali untuk meniru ponsel kelas bawah, gambar PNG 3147 KB membutuhkan 1264 sampai 1348 ms dengan hasil 129 KB. Dugaan awal kami, bottleneck ada pada canvas yang digambar ulang di setiap percobaan kualitas padahal ukurannya tidak berubah |
| Perbaikan | Kami mencoba versi yang hanya menggambar canvas sekali untuk setiap ukuran, lalu cukup meng-encode ulang untuk setiap kualitas. Pada kasus terburuk hasilnya 235 sampai 320 ms, tidak lebih cepat dibanding kode awal. Penyebabnya, semua foto uji sudah lolos di percobaan pertama dan `drawImage` hanya memakan waktu kurang dari 1 ms, sehingga waktu sebenarnya habis untuk decode dan encode yang memang harus dilakukan sekali. Karena itu versi ini tidak kami masukkan ke kode |
| Hasil (sesudah) | Tidak ada perubahan kode karena fitur ini sudah memadai. Di laptop, kompresi selesai kurang dari 0,1 detik untuk foto HP dan sekitar 0,25 detik untuk kasus terburuk 12 MP. Dengan CPU 4 kali lebih lambat, waktunya sekitar 1,3 detik, dan proses ini hanya terjadi sekali untuk setiap foto. Selama proses berlangsung, form menampilkan teks "Mengompres foto…" sehingga relawan tahu aplikasinya sedang bekerja. Apabila nanti diperlukan, kompresi bisa dipindahkan ke Web Worker dengan `OffscreenCanvas` agar main thread tidak terhambat |

## B.3 Kendala dan Catatan Penting

Tuliskan kendala yang ditemui, fitur yang belum sempurna (*known issues*), serta hal yang perlu diketahui asisten saat menjalankan atau menilai aplikasi (misalnya akun uji khusus, urutan menjalankan, atau batasan).

**Modul fondasi, UC04, UC05, dan UC08 (Jonathan Lewie)**

- Semua tes pada `npm test` tidak membutuhkan basis data. Tes yang memakai PostgreSQL ada di `npm run test:db`, dan sebelum menjalankannya perlu `docker compose up -d` lalu `npm run seed`.
- Fitur luring hanya bisa dicoba di halaman relawan (`/relawan/`). Cara paling mudah adalah login sebagai `relawan1`, membuka DevTools, memilih Network lalu Offline, kemudian membuat laporan. Laporan akan berstatus menunggu dikirim dan terkirim sendiri begitu mode Offline dimatikan. Service worker baru aktif setelah halaman dibuka sekali dalam keadaan daring.
- Pengambilan foto dan GPS di `laporan.html` hanya berjalan pada *secure context*. Alamat `localhost` sudah memenuhi syarat ini, tetapi jika halaman dibuka dari ponsel melalui IP LAN, browser akan memblokir kamera dan GPS kecuali memakai HTTPS. Jika izin GPS ditolak, halaman menampilkan peringatan I-06b dan laporan tidak dapat dikirim tanpa koordinat.
- Login pertama kali harus dilakukan saat daring karena token dibuat oleh server. Setelah token tersimpan (berlaku 7 hari), halaman relawan bisa dibuka tanpa koneksi.
- Masalah yang belum selesai adalah notifikasi yang diketuk di halaman daftar tugas baru ditandai sebagai dibaca dan belum membuka detail tugasnya.
- `GET /api/tugas` masih mengambil data petak satu per satu untuk setiap tugas (pola N+1). Dampaknya kecil karena jumlah tugas aktif tiap relawan dibatasi kapasitas, tetapi jika jumlah tugas bertambah, bagian ini sebaiknya diganti dengan satu kueri `JOIN`.
- Kompresi foto berjalan di browser menggunakan canvas. Foto yang masih di atas 500 KB setelah semua percobaan tidak akan dikirim, dan relawan diminta memotret ulang.

## B.4 Kontribusi Anggota

Tabel B.4. Kontribusi Anggota

| NIM | Nama | Modul / Fitur yang Dikerjakan | Persentase Kontribusi |
| :--- | :--- | :--- | :--- |
| 13525022 | Muhammad Rafi Insyan Syiham Abrar | *...* | *...* |
| 13525037 | Muhammad Rafiif Ansyadya | UC03 Memverifikasi Laporan Bukti Kerja: layar I-04 antrean laporan (C09), `VerifikasiLaporanController` (C10), operasi verifikasi pada `LaporanBuktiKerja` (C11, Q-016 sampai Q-019), dan tes `tests/verifikasi.test.js` | 16% |
| 13525076 | Reinhard Mikhael Tandra | *...* | *...* |
| 13525094 | Arga Cyrano Simanjuntak | *...* | *...* |
| 13525136 | Jonathan Lewie | Fondasi proyek (inisialisasi Node.js dan Express, `schema.sql`, `docker-compose.yml`, `seed.js`, `db.js`, middleware `auth.js`, dan README), UC08 Login petugas dan relawan (C21, C22, C23, beserta PWA `manifest.json` dan `sw.js`), UC04 Daftar tugas relawan luring (C12, C13, serta operasi `ambilAktifByRelawan` dan `batalkan` pada C07), UC05 Laporan bukti kerja luring dan sinkron (C14, C15, operasi `simpan` dan `cekUUIDAda` pada C11, dan `PenyimpananLokal.js`), tes `autentikasi`, `daftar-tugas`, `laporan`, dan `seed`, pembuatan issue #2 sampai #11, serta review seluruh PR | 30% |

## B.5 Traceability Kelas Perancangan ke Implementasi

Pemetaan dari **setiap kelas perancangan** pada DPPL (Tabel 4.1) ke wujud implementasinya. Bentuk implementasi bebas (kelas, fungsi, komponen, *route/handler*, *stored procedure*, skrip, dsb.), tetapi tiap kelas perancangan harus muncul pada tabel ini. Jika implementasi berupa kelas dengan nama yang sama, tetap dicantumkan.

Tabel B.5. Traceability Kelas Perancangan ke Implementasi

| ID Kelas | Nama Kelas Perancangan | Bentuk Implementasi | Lokasi (File dan Nama) | Keterangan |
| :--- | :--- | :--- | :--- | :--- |
| *[C01]* | *[Nama kelas pada DPPL]* | *[mis. Kelas / Fungsi / Komponen / Route / Tabel]* | *[mis. `src/models/user.py` - `User`]* | *[Cara atribut dan operasi kelas diwujudkan; "-" jika tidak ada penjelasan tambahan]* |
| C07 | `JadwalPekerjaan` | Fungsi dan Tabel | `src/models/JadwalPekerjaan.js`; tabel `jadwal_pekerjaan` di `src/sql/schema.sql` | Operasi diwujudkan sebagai fungsi `export`, yaitu `simpan` (Q-008), `ambilAktifByRelawan` (Q-009, mengambil tugas berstatus `ditugaskan` dan `menunggu verifikasi`), `perbaruiStatus` (dipakai Algo-006 dan Algo-011 dengan syarat status lama di `WHERE`), dan `batalkan` (Q-011). Pada `batalkan`, syarat pemilik tugas dan status `ditugaskan` diletakkan di `WHERE` sehingga pengecekan dan perubahan terjadi dalam satu perintah. Setiap fungsi menerima parameter `db` opsional agar dapat ikut dalam transaksi. Atribut kelas menjadi kolom `id_jadwal`, `jenis_pekerjaan`, `status`, `tanggal`, dan `alasan_pembatalan`, lalu dipetakan ke objek camelCase oleh `keObjek` |
| C09 | `HalamanAntreanLaporan` | Fungsi dan Halaman | `src/public/petugas/antrean.html`; `src/public/petugas/js/HalamanAntreanLaporan.js` | Operasi menjadi fungsi di modul halaman (`tampilkanAntrean`, `tampilkanDetailLaporan`, `tampilkanPeringatanJarak`, `tampilkanAntreanKosong`, `tampilkanPesanGagal`, `tampilkanPesanBerhasil`). Panggilan ke C10 dilakukan lewat `fetch` di `ambilAntrean`, `bukaLaporan`, dan `kirimKeputusan`. Kelas tidak punya atribut |
| C10 | `VerifikasiLaporanController` | Fungsi dan Route | `src/controllers/VerifikasiLaporanController.js`; route di `src/server.js` | `ambilAntrean` menjadi `GET /api/laporan/antrean`, `ambilDetailLaporan` menjadi `GET /api/laporan/:id`, `verifikasiLaporan` menjadi `POST /api/laporan/:id/setujui`, dan `tolakLaporan` menjadi `POST /api/laporan/:id/tolak`; keempatnya hanya bisa diakses petugas lewat middleware `hanyaPetugas`. `hitungJarak` mewujudkan Algo-005, sedangkan transaksi Algo-006 dijalankan oleh `dalamTransaksi`. Kelas tidak punya atribut |
| C11 | `LaporanBuktiKerja` | Fungsi dan Tabel | `src/models/LaporanBuktiKerja.js`; tabel `laporan_bukti_kerja` di `src/sql/schema.sql` | Operasi menjadi fungsi `export`: `simpan` (Q-014), `cekUUIDAda` (Q-015), `ambilMenungguVerifikasi` (Q-016), `ambilById` (Q-017), `setujui` (Q-018), dan `tolak` (Q-019). `setujui` dan `tolak` mengembalikan `true` hanya jika `rowCount` bernilai 1. Atribut menjadi kolom `id_laporan`, `foto` (BYTEA), `lat_unggah` dan `lng_unggah` (untuk `koordinatUnggah`), `waktu_unggah`, `status`, `alasan_penolakan`, `waktu_verifikasi` |
| C12 | `HalamanDaftarTugas` | Fungsi dan Halaman | `src/public/relawan/index.html`; `src/public/relawan/js/HalamanDaftarTugas.js`; `src/public/relawan/tugas.css` | Operasi diwujudkan sebagai fungsi `export`, yaitu `tampilkanDaftarTugas`, `tampilkanDetailTugas`, `tampilkanPenandaLuring`, `tampilkanBelumAdaTugas`, `tampilkanFormPembatalan`, `tampilkanNotifikasi`, dan `tampilkanPesanGagal`, ditambah `tampilkanWaktuSinkron`, `tampilkanHasilSinkron`, dan `pasangPenangan` (lihat B.1 nomor 18). Perpindahan layar dilakukan oleh `bukaLayar` tanpa memuat ulang halaman, dan tombol "Buat laporan" hanya muncul untuk tugas berstatus `ditugaskan`. Kelas ini tidak memiliki atribut |
| C13 | `DaftarTugasController` | Fungsi dan Route | Bagian klien di `src/public/relawan/js/DaftarTugasController.js`, bagian server di `src/controllers/DaftarTugasController.js`, dan route di `src/server.js` | `ambilTugasRelawan` menjadi `GET /api/tugas`, `batalkanTugasTidakAman` menjadi `POST /api/tugas/:id/batal` (Algo-008, alasan wajib diisi dan semua petugas mendapat notifikasi), dan `tandaiNotifikasiDibaca` menjadi `POST /api/notifikasi/:id/baca`. Dua route pertama hanya bisa diakses relawan melalui `cekLogin` dan `cekPeran('relawan')`. `urutkanBerdasarkanSkorRisiko` mengurutkan tugas dari skor tertinggi. Di sisi klien, `muatDaftarTugas` menjalankan Algo-007 dengan mengambil data dari server, menyimpan salinannya melalui `simpanSalinanLokal`, lalu menampilkan hasil `ambilSalinanLokal` beserta penanda luring jika perangkat luring atau server membalas 5xx. Kelas ini tidak memiliki atribut |
| C14 | `FormLaporanBuktiKerja` | Fungsi dan Halaman | `src/public/relawan/laporan.html`; `src/public/relawan/js/FormLaporanBuktiKerja.js`; `src/public/relawan/laporan.css` | Operasi diwujudkan sebagai fungsi `export`, yaitu `tampilkanForm`, `ambilFoto`, `ambilKoordinatGPS` (memakai Geolocation API), `tampilkanPeringatanGPS` (I-06b), `tampilkanPesanTerkirim(otomatis)`, `tampilkanStatusMenungguDikirim`, `tampilkanPesanPenyimpananPenuh`, dan `tampilkanPesanDitolak`. Empat layar hasil, yaitu tersimpan, terkirim, terkirim otomatis, dan ditolak, ditangani oleh satu fungsi privat `tampilkanHasil`. Kelas ini tidak memiliki atribut |
| C15 | `UploadLaporanController` | Fungsi dan Route | Bagian klien di `src/public/relawan/js/UploadLaporanController.js`, bagian server di `src/controllers/UploadLaporanController.js`, dan route `POST /api/laporan` di `src/server.js` | Di sisi klien, `generateUUID` memakai `crypto.randomUUID()` dan `kompresFoto` memakai canvas (1280 px dengan kualitas 0,8 turun ke 0,5, lalu 960 px, dengan batas 500 KB). `kirimLaporan` menjalankan Algo-009 dan `sinkronOtomatis` menjalankan Algo-010. Respons 201 dan 200 dianggap diterima, sedangkan 400, 409, dan 413 dianggap ditolak permanen, dan keduanya dihapus dari antrean, sementara galat lain dibiarkan untuk dicoba lagi. `simpanLokal` dan `hitungLaporanTertunda` memakai store `laporanTertunda`, dan `deteksiKoneksi` membaca `navigator.onLine`. Di sisi server, `terimaFoto` memakai multer dan membalas 413 untuk foto di atas 500 KB, `bacaLaporan` memvalidasi isi kiriman, dan `terimaLaporan` menjalankan Algo-011 dalam satu transaksi `dalamTransaksi` yang mengubah status tugas lalu menyimpan laporan. Kelas ini tidak memiliki atribut |
| C18 | `PeringatanSMSController` | Fungsi | `src/controllers/PeringatanSMSController.js` | Operasi publik menjadi fungsi `export` (`cekAmbangRisiko`, `prosesBalasanSTOP`, `hapusNomorDicabut`). Operasi privat menjadi fungsi biasa tanpa `export` (`kirimSMS`, `cekPeringatanTerakhir`, `identifikasiWargaTerdampak`). `kirimSMS` memanggil `kirimKeGateway` di `SimulasiSMSController.js`. Kelas tidak punya atribut |
| C19 | `Warga` | Fungsi dan Tabel | `src/models/Warga.js`; tabel `warga` di `src/sql/` | Operasi menjadi fungsi `export` (`ambilAktifByPetak`, `cariByNomor`, `cabutPersetujuan`, `hapusDicabutLama`). Atribut menjadi kolom `id_warga`, `nomor_hp`, `status_persetujuan`, `waktu_dicabut`, `id_petak`, dan hasil query dipetakan ke objek JavaScript |
| C20 | `PeringatanSMS` | Fungsi dan Tabel | `src/models/PeringatanSMS.js`; tabel `peringatan_sms` di `src/sql/` | Operasi menjadi fungsi `export` (`catat`, `adaDalam24Jam`, ditambah `ambilTerkirimTerbaru`). Atribut menjadi kolom `id_peringatan`, `id_warga`, `id_petak`, `isi_pesan`, `waktu_kirim`, `status` |
| C21 | `HalamanLogin` | Fungsi dan Halaman | `src/public/relawan/login.html`, `src/public/petugas/login.html`; `src/public/relawan/js/HalamanLogin.js` | Operasi diwujudkan sebagai fungsi `tampilkanFormLogin`, `tampilkanPesanGagal`, dan `tampilkanPesanPerluKoneksi`. Keadaan halaman (isi, memeriksa, gagal, dan luring) diatur oleh `perbaruiTampilan` melalui atribut `data-keadaan`. Satu modul ini dipakai oleh dua halaman login (lihat B.1 nomor 13). Kelas ini tidak memiliki atribut |
| C22 | `AutentikasiController` | Fungsi, Route, dan Middleware | Bagian server di `src/controllers/AutentikasiController.js` (route `POST /api/login`) dan `src/middleware/auth.js`, bagian klien di `src/public/relawan/js/AutentikasiController.js` | Di server, `login` memeriksa input, memanggil `verifikasiKredensial` (yang memakai `cariByUsername` dan `cekPassword` dari C23), lalu mengirim token hasil `buatSesi`. Token tersebut berupa JWT berisi `idPengguna` dan `peran` yang berlaku 7 hari. Kredensial yang salah dibalas 401 dengan pesan yang sama, baik untuk username maupun password. Di klien, `login` menyimpan token, `periksaSesi` mengecek keberadaan token dan masa berlakunya, dan `arahkanSesuaiPeran` mengarahkan petugas ke `/petugas/` serta relawan ke `/relawan/`. Setiap endpoint dijaga oleh `cekLogin` dan `cekPeran` (lihat B.1 nomor 11 dan 12). Kelas ini tidak memiliki atribut |
| C23 | `Pengguna` | Fungsi dan Tabel | `src/models/Pengguna.js`; tabel `pengguna` di `src/sql/schema.sql` | Operasi diwujudkan sebagai fungsi `export`, yaitu `cariByUsername`, `cekPassword` yang memakai bcrypt, dan `ambilByPeran` yang dipakai untuk mengirim notifikasi ke semua petugas. Atribut kelas menjadi kolom `id_pengguna`, `username`, `password_hash`, dan `peran`. Atribut `passwordHash` yang bersifat protected di DPPL hanya dibaca di dalam proses login dan tidak pernah dikirim ke klien |

Catatan:
- Satu kelas perancangan boleh diwujudkan oleh beberapa file/unit, dan satu file/unit boleh mewujudkan beberapa kelas perancangan. Tuliskan semuanya.
- Kelas perancangan yang **tidak diimplementasikan** atau **digabung/dipecah** tetap dicantumkan, dan alasannya dicatat di Bagian B.1.
