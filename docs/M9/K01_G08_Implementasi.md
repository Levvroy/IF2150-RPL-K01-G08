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

## B.2 Bukti Penerapan Best Practices

Tabel B.2. Bukti Best Practices

| Praktik | Bukti | Keterangan |
| :--- | :--- | :--- |
| Branching |  |  |
| Semantic commit |  |  |
| Track tasks |  |  |
| Pull request dan review |  |  |
| Pengujian |  |  |

### B.2.1 Profiling dan Optimasi

| Informasi | Keterangan |
| :--- | :--- |
| Fitur / proses yang diprofil |  |
| Alat |  |
| Temuan (sebelum) |  |
| Perbaikan |  |
| Hasil (sesudah) |  |

## B.3 Kendala dan Catatan Penting

## B.4 Kontribusi Anggota

Tabel B.4. Kontribusi Anggota

| NIM | Nama | Modul / Fitur yang Dikerjakan | Persentase Kontribusi |
| :--- | :--- | :--- | :--- |
| 13525022 | Muhammad Rafi Insyan Syiham Abrar |  |  |
| 13525037 | Muhammad Rafiif Ansyadya | UC03 Memverifikasi Laporan Bukti Kerja: layar I-04 antrean laporan (C09), `VerifikasiLaporanController` (C10), operasi verifikasi pada `LaporanBuktiKerja` (C11, Q-016 sampai Q-019), dan tes `tests/verifikasi.test.js` | 16% |
| 13525076 | Reinhard Mikhael Tandra |  |  |
| 13525094 | Arga Cyrano Simanjuntak |  |  |
| 13525136 | Jonathan Lewie |  |  |

## B.5 Traceability Kelas Perancangan ke Implementasi

Tabel B.5. Traceability Kelas Perancangan ke Implementasi

| ID Kelas | Nama Kelas Perancangan | Bentuk Implementasi | Lokasi (File dan Nama) | Keterangan |
| :--- | :--- | :--- | :--- | :--- |
| C09 | `HalamanAntreanLaporan` | Fungsi dan Halaman | `src/public/petugas/antrean.html`; `src/public/petugas/js/HalamanAntreanLaporan.js` | Operasi menjadi fungsi di modul halaman (`tampilkanAntrean`, `tampilkanDetailLaporan`, `tampilkanPeringatanJarak`, `tampilkanAntreanKosong`, `tampilkanPesanGagal`, `tampilkanPesanBerhasil`). Panggilan ke C10 dilakukan lewat `fetch` di `ambilAntrean`, `bukaLaporan`, dan `kirimKeputusan`. Kelas tidak punya atribut |
| C10 | `VerifikasiLaporanController` | Fungsi dan Route | `src/controllers/VerifikasiLaporanController.js`; route di `src/server.js` | `ambilAntrean` menjadi `GET /api/laporan/antrean`, `ambilDetailLaporan` menjadi `GET /api/laporan/:id`, `verifikasiLaporan` menjadi `POST /api/laporan/:id/setujui`, dan `tolakLaporan` menjadi `POST /api/laporan/:id/tolak`; keempatnya hanya bisa diakses petugas lewat middleware `hanyaPetugas`. `hitungJarak` mewujudkan Algo-005, sedangkan transaksi Algo-006 dijalankan oleh `dalamTransaksi`. Kelas tidak punya atribut |
| C11 | `LaporanBuktiKerja` | Fungsi dan Tabel | `src/models/LaporanBuktiKerja.js`; tabel `laporan_bukti_kerja` di `src/sql/schema.sql` | Operasi menjadi fungsi `export`: `simpan` (Q-014), `cekUUIDAda` (Q-015), `ambilMenungguVerifikasi` (Q-016), `ambilById` (Q-017), `setujui` (Q-018), dan `tolak` (Q-019). `setujui` dan `tolak` mengembalikan `true` hanya jika `rowCount` bernilai 1. Atribut menjadi kolom `id_laporan`, `foto` (BYTEA), `lat_unggah` dan `lng_unggah` (untuk `koordinatUnggah`), `waktu_unggah`, `status`, `alasan_penolakan`, `waktu_verifikasi` |
| C18 | `PeringatanSMSController` | Fungsi | `src/controllers/PeringatanSMSController.js` | Operasi publik menjadi fungsi `export` (`cekAmbangRisiko`, `prosesBalasanSTOP`, `hapusNomorDicabut`). Operasi privat menjadi fungsi biasa tanpa `export` (`kirimSMS`, `cekPeringatanTerakhir`, `identifikasiWargaTerdampak`). `kirimSMS` memanggil `kirimKeGateway` di `SimulasiSMSController.js`. Kelas tidak punya atribut |
| C19 | `Warga` | Fungsi dan Tabel | `src/models/Warga.js`; tabel `warga` di `src/sql/` | Operasi menjadi fungsi `export` (`ambilAktifByPetak`, `cariByNomor`, `cabutPersetujuan`, `hapusDicabutLama`). Atribut menjadi kolom `id_warga`, `nomor_hp`, `status_persetujuan`, `waktu_dicabut`, `id_petak`, dan hasil query dipetakan ke objek JavaScript |
| C20 | `PeringatanSMS` | Fungsi dan Tabel | `src/models/PeringatanSMS.js`; tabel `peringatan_sms` di `src/sql/` | Operasi menjadi fungsi `export` (`catat`, `adaDalam24Jam`, ditambah `ambilTerkirimTerbaru`). Atribut menjadi kolom `id_peringatan`, `id_warga`, `id_petak`, `isi_pesan`, `waktu_kirim`, `status` |

