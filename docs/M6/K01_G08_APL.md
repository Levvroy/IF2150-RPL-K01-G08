<h1>
IF2150 REKAYASA PERANGKAT LUNAK
<br>
TUGAS 6
<br>
ARSITEKTUR PERANGKAT LUNAK (APL)
</h1>
<br>

## *SIGAP*

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

<br>
<br>

# BAB 1: Style/Pattern Arsitektur Acuan

Pada bagian ini, *architectural style* atau *pattern* yang menjadi acuan untuk pengembangan aplikasi SIGAP adalah kombinasi dari **Client-Server** dan **MVC (Model-View-Controller)**. 

1. **Client-Server**: Memisahkan sistem menjadi dua bagian utama, yaitu antarmuka pengguna di sisi klien dan pusat pemrosesan serta pengelolaan data di sisi server.
2. **MVC (Model-View-Controller)**: Memisahkan struktur kode aplikasi ke dalam tiga peran utama:
   * **Model**: Merepresentasikan struktur data, aturan bisnis, dan logika penyimpanan persisten (misalnya komponen `PetakLahan`, `TitikPanas`, `Warga`, dan `LaporanBuktiKerja`).
   * **View**: Menangani antarmuka visual (UI) yang berinteraksi langsung dengan pengguna (misalnya komponen `HalamanPetaRisiko`, `HalamanDaftarTugas`, dan `FormLaporanBuktiKerja`).
   * **Controller**: Menerima *input* dari *View*, memproses logika bisnis, dan memanipulasi *Model* (misalnya komponen `PetaRisikoController`, `JadwalController`, dan `PeringatanSMSController`).

**Alasan Pemilihan Pattern**
Pemilihan arsitektur ini didasarkan pada karakteristik pengguna, lingkungan operasi, serta Kebutuhan Fungsional (KF) dan Kebutuhan Non-Fungsional (KNF) pada dokumen SKPL:
* **Lingkungan Pengguna (Client-Server):** SIGAP digunakan oleh dua jenis pengguna dengan perangkat yang sangat berbeda, yaitu Petugas Posko (menggunakan peramban web desktop dengan koneksi stabil) dan Relawan Lapangan (menggunakan ponsel Android kelas menengah ke bawah di area minim sinyal). Pemrosesan berat seperti penarikan data satelit NASA FIRMS (KF02) dan pengiriman SMS peringatan (KF16) harus difokuskan di sisi *Server* agar tidak membebani perangkat *Client*.
* **Performa dan Pemisahan Tugas (MVC):** Sistem membutuhkan antarmuka peta interaktif yang dinamis dengan waktu muat maksimal 5 detik (KNF01). Pemisahan *View* dan *Controller* memungkinkan modul antarmuka (seperti peta Leaflet) bekerja secara independen dari logika *backend*. Selain itu, pola ini memudahkan implementasi fitur luring (*offline*) relawan (KF12, KF13); *Controller* dapat diarahkan untuk menyimpan data sementara ke dalam *Model* lokal di perangkat sebelum disinkronkan ke server pusat.

<p align="center">
<img alt="Arsitektur MVC pada SIGAP" src="./assets/diagram/arsitektur-mvc-sigap.png" width="80%">
</p>
<p align="center">
<i>Gambar 1. Arsitektur MVC pada P/L SIGAP</i>
</p>

<p align="center">
<img alt="Arsitektur Client-Server pada SIGAP" src="./assets/diagram/arsitektur-CS-sigap.png" width="80%">
</p>
<p align="center">
<i>Gambar 2. Arsitektur Client-Server pada P/L SIGAP</i>
</p>

Tabel 1.1. Lingkungan Operasi Perangkat Lunak

| Komponen | Spesifikasi |
| :--- | :--- |
| Server | Node.js versi LTS (22 atau lebih baru) dengan framework Express, dijalankan pada layanan cloud gratis. |
| Client Petugas | Peramban web modern versi terbaru (Chrome, Edge, atau Firefox) pada komputer atau laptop. |
| Client Relawan | Ponsel Android kelas menengah ke bawah dengan Chrome versi terbaru, GPS dan kamera aktif, dijalankan sebagai PWA. |
| DBMS | PostgreSQL 16 untuk data server. IndexedDB pada peramban relawan untuk laporan luring. |
| Peta | Leaflet dengan tile OpenStreetMap. |
| Penjadwal | Layanan cron eksternal gratis yang memanggil endpoint pembaruan setiap 3 jam. |
| OS | Lintas platform (Windows, Linux, macOS, Android) melalui peramban. |
| Jaringan | HTTPS untuk seluruh akses. |

---
**Kaitan Teknologi dengan Style/Pattern**
Lingkungan operasi pada Tabel 1.1 mendukung implementasi pola *Client-Server* dan *MVC* secara terintegrasi. Node.js dengan framework Express bertindak sebagai lapis *Controller* di sisi *Server* yang memproses logika bisnis dan berkomunikasi dengan PostgreSQL 16 yang mewadahi lapis *Model* persisten. Di sisi *Client*, peramban web modern dan PWA Android bertindak sebagai lapis *View* yang merender antarmuka ke pengguna. Penggunaan IndexedDB pada klien relawan memungkinkan sebagian lapis *Model* untuk beroperasi secara lokal, sehingga *Controller* tetap dapat menyimpan data bukti kerja (KF12) saat perangkat tidak terhubung ke internet.

# BAB 2: Identifikasi Komponen / Modul / Subsistem

Pada bagian ini, lakukan identifikasi terhadap komponen, modul, atau subsistem yang menyusun aplikasi berdasarkan *pattern* arsitektur yang telah ditetapkan sebelumnya. Setiap komponen memiliki tanggung jawab tertentu dalam mendukung fungsionalitas sistem.

Setiap komponen memiliki tanggung jawab tertentu dalam mendukung fungsionalitas sistem secara keseluruhan. Komponen dapat dikelompokkan berdasarkan lapisan arsitektur (misalnya *Model*, *View*, dan *Controller* pada pattern MVC), atau berdasarkan fungsi atau peran komponen di dalam sistem (misalnya modul autentikasi, manajemen data, dan integrasi eksternal).

Tabel 2.1. Identifikasi Komponen/Modul/Subsistem

| Nama Komponen/Modul/Subsistem | Jenis                 | Penjelasan                                                                                                           |
| :---------------------------- | :-------------------- | :------------------------------------------------------------------------------------------------------------------- |
| *HalamanPetaRisiko*                 | *View*                | *Menampilkan antarmuka peta risiko yang akan dilihat oleh petugas posko.*     |
| *FormPenyusunanJadwal*               | *View*                | *Menampilkan antarmuka agar petugas posko dapat menyusun jadwal, rekomendasi petak, dan memilih relawan.*                                                       |
| *HalamanAntreanLaporan*                | *View*                | *Menampilkan antarmuka untuk daftar antrean dan juga detail laporan bukti kerja untuk diverifikasi oleh petugas posko.*                                      |
| *HalamanDaftarTugas*          | *View*                | *Menampilkan antarmuka untuk daftar dan detail tugas relawan.*                                         |
| *FormLaporanBuktiKerja*           | *View*          | *Menampilkan antarmuka untuk mengisi laporan bukti kerja (foto dan koordinat).*                                             |
| *DialogTandaiKeliru*         | *View*          | *Menampilkan antarmuka untuk menandakan suatu titik panas sebagai deteksi keliru..*                                          |
| *HalamanLogin*        | *View*          | *Menampilkan antarmuka untuk masuk ke sistem.*                |
| *PetaRisikoController*           | *Controller*          | *Menerima input data titik panas dan curah hujan, menghitung skor risiko dari data yang diterima, menangani fallback ke cache, dan memicu pengecekan ambang peringatan.*                                                              |
| *JadwalController*                      | *Controller*               | *Menyusun rekomendasi untuk petak yang harus ditugaskan, memvalidasi kapasitas tiap relawan, membuat jadwal, dan mengirim notifikasi penugasan kepada relawan.*                        |
| *VerifikasiLaporanController*                   | *Controller*               | *Menghitung jarak koordinat laporan dengan petak tugas, memproses persetujuan atau penolakan laporan, mengunci laporan, dan memperbarui status dari tugas.*       |
| *DaftarTugasController*                     | *Controller*               | *Mengambil dan mengurutkan tugas-tugas relawan, menyimpan salinan tugas secara lokal di perangkat, dan memproses pembatalan tugas.*          |
| *UploadLaporanController*                   | *Controller*               | *Membuat UUID, mengompres foto untuk laporan, mendeteksi koneksi perangkat relawan, menyimpan laporan di perangkat secara lokal ketika tidak ada koneksi, dan menyinkronkannya saat koneksi sudah tersedia.*                                |
| *DeteksiKeliruController*                    | *Controller*           | *Memvalidasi keterangan dari laporan kekeliruan titik panas dan mengubah status titik panas menjadi keliru.*                                                      |
| *PeringatanSMSController*       | *Controller* | *Mengecek petak yang naik ke tingkat tinggi,  mengirim SMS (simulasi) kepada warga saat tingkat risiko sudah tinggi, mencegah pengiriman ulang SMS dalam waktu 24 jam, memproses balasan STOP dari warga, dan menghapus nomor yang persetujuannya dicabut.* |
| *AutentikasiController*                    | *Controller*    | *Memverifikasi kredensial pengguna, membuat dan memeriksa sesi, serta mengarahkan pengguna sesuai perannya.*   |
| *PetakLahan*                         | *Model*                 | *Merepresentasikan batas wilayah, skor risiko, tingkat risiko, dan waktu pembaruan terakhir suatu petak lahan.* |
| *TitikPanas*                         | *Model*                 | *Merepresentasikan data titik panas yang diambil dari FIRMS beserta status validitas dan keterangan penandaan titik yang keliru.* |
| *JadwalPekerjaan*                         | *Model*                 | *Merepresentasikan detail-detail untuk satu tugas pencegahan seperti jenis pekerjaan, status, tanggal, dan alasan pembatalan.* |
| *RelawanLapangan*                         | *Model*                 | *Merepresentasikan data-data relawan seperti identitas, kontak, dan status keaktifan.* |
| *LaporanBuktiKerja*                         | *Model*                 | *Merepresentasikan UUID laporan, foto, koordinat unggahan, jarak ke petak tugas, status verifikasi, dan waktu verifikasi.* |
| *Warga*                         | *Model*                 | *Merepresentasikan nomor HP penerima SMS, status persetujuan, dan waktu pencabutan persetujuan.* |
| *PeringatanSMS*                         | *Model*                 | *Merepresentasikan log pengiriman SMS, isi pesan, waktu kirim, dan status.* |
| *Pengguna*                         | *Model*                 | *Merepresentasikan akun pengguna yaitu username, hash password, dan peran.* |
| *Notifikasi*                         | *Model*                 | *Merepresentasikan notifikasi dalam aplikasi yaitu isi pesan, waktu dibuat, dan status sudah dibaca.* |
| *API_NasaFirms*                         | *Integrasi Eksternal*                 | *Komponen eksternal yang digunakan untuk mengambil data titik panas dari layanan NASA FIRMS Area API.* |
| *API_OpenMeteo*                         | *Integrasi Eksternal*                 | *Komponen eksternal yang digunakan untuk mengambil data batas koordinat wilayah dan data curah hujan harian dari layanan Open-Meteo Forecast API* |
| *GatewaySMS_Simulasi*                         | *Integrasi Eksternal*                 | *Komponen eksternal yang digunakan untuk menerima permintaan pengiriman SMS ketika skor risiko sudah tinggi* |
| *API_OpenStreetMap*                         | *Integrasi Eksternal*                 | *Komponen eksternal yang digunakan untuk menampilkan peta dasar pada antarmuka pengguna* |
| *LayananCronEksternal*                         | *Integrasi Eksternal*                 | *Komponen eksternal yang digunakan untuk secara otomatis setiap 3 jam melakukan pembaruan data sistem* |
| *DatabaseServer*                         | *Penyimpanan Data*                 | *Komponen penyimpanan data yang menggunakan PostgreSQL 16 untuk data server pusat* |
| *PenyimpananLokal*                         | *Penyimpanan Data*                 | *Komponen penyimpanan data secara lokal yang menggunakan IndexedDB pada peramban lawan untuk menyimpan laporan luring* |

Ketentuan pengisian Tabel 2.1:
1. Kolom **Jenis** mengikuti pengelompokan pada *style/pattern* di BAB 1. Untuk MVC, jenisnya adalah *Model*, *View*, dan *Controller*. Jenis lain boleh ditambahkan, misalnya *Pendukung* untuk komponen bantu yang dipakai bersama, atau *Integrasi Eksternal* untuk penghubung ke sistem di luar P/L yang disebutkan pada subbab 2.2 dokumen SKPL. Kolom ini juga boleh diisi dengan *Subsistem*, *Modul*, atau *Komponen* apabila komponen dikelompokkan berdasarkan fungsinya. Tuliskan subsistem terlebih dahulu, lalu komponen penyusunnya di baris-baris berikutnya.
2. Komponen **tidak sama dengan** kelas. Satu komponen boleh mewadahi beberapa kelas dari diagram kelas pada dokumen SKPL. Pastikan seluruh kelas tercakup oleh setidaknya satu komponen.
3. Pastikan seluruh use case pada dokumen SKPL dapat dijalankan oleh komponen-komponen yang didaftarkan di tabel ini. Jangan menambahkan komponen untuk fitur yang tidak ada di SKPL.

<sub><b><i>Catatan</i></b>: <i>Nama komponen pada Tabel 2.1 harus dipakai sama persis pada gambar di BAB 1 dan setiap view di BAB 3. Jika saat membuat view ternyata dibutuhkan komponen baru, tambahkan komponen tersebut ke Tabel 2.1 terlebih dahulu.</i></sub>

---

# BAB 3: Model Arsitektur Perangkat Lunak

Arsitektur SIGAP digambarkan dengan dua *view* dari model 4+1 (Kruchten, 1995) yang menggambarkan keseluruhan sistem dari sudut pandang berbeda. Keduanya sejalan dengan dua *style* pada BAB 1:

| View | Sudut pandang | *Style* yang dicerminkan | Alasan dipilih |
| :--- | :--- | :--- | :--- |
| 3.1 *Logical View* | Pembagian tanggung jawab komponen dan hubungan antarkomponen | MVC | Menunjukkan bahwa setiap fungsi SKPL dilayani komponen yang jelas dan bagaimana *View*, *Controller*, *Model*, serta sistem eksternal saling terhubung. |
| 3.2 *Physical View* | Penempatan komponen pada perangkat dan jaringan | Client-Server | Pembagian klien petugas, klien relawan, server aplikasi, dan basis data adalah inti kebutuhan lingkungan operasi (Tabel 1.1), termasuk bagian logika yang berjalan di perangkat relawan. |

*Process View* dan *Development View* tidak dibuat karena kedua *view* di atas sudah memuat seluruh komponen Tabel 2.1. Alur dinamis tiap fitur sudah dijelaskan pada skenario *use case* di SKPL BAB 4.

## 3.1 Logical View

*Logical View* digambarkan dalam bentuk *block diagram*. Seluruh 31 komponen pada Tabel 2.1 dikelompokkan sesuai pola MVC: *View* di kiri, *Controller* di tengah, dan *Model* di kanan, dengan `DatabaseServer` dan `PenyimpananLokal` sebagai penyimpanan data. Sistem eksternal digambarkan dengan garis putus-putus.

<p align="center">
<img alt="Logical View SIGAP" src="./assets/diagram/logical-view-sigap.png" width="100%">
</p>
<p align="center">
<i>Gambar 3. Logical View SIGAP</i>
</p>

Setiap garis diberi label sebagai berikut:

| Hubungan | Label pada diagram | Keterangan |
| :--- | :--- | :--- |
| *View* ke *Controller* | "memanggil" | Setiap *View* meneruskan aksi pengguna ke tepat satu *Controller*. |
| *Controller* ke *Model* | "akses: ..." | Panah menuju kelompok *Model*. Nama *Model* yang dibaca atau diubah ditulis pada label, misalnya `JadwalController` mengakses `JadwalPekerjaan`, `RelawanLapangan`, `PetakLahan`, dan `Notifikasi`. |
| *Controller* ke *Controller* | "memicu cek ambang" | `PetaRisikoController` memicu `PeringatanSMSController` setelah skor dihitung. |
| Antar-*Model* | nama relasi dan multiplisitas | Asosiasi dan agregasi sesuai relasi antar-*entity* pada SKPL subbab 5.3, misalnya agregasi `PetakLahan` ke `TitikPanas` (1 ke 0..*). |
| *Model* ke `DatabaseServer` | "simpan / baca (query SQL)" | Seluruh data *Model* disimpan terpusat. |
| *Controller* ke `PenyimpananLokal` | "simpan laporan luring ↔ sinkron" dan "salinan tugas (luring)" | Hanya untuk fitur luring relawan. |
| Sistem eksternal | "memicu tiap 3 jam (HTTPS + token rahasia)", "ambil titik panas", "ambil curah hujan", "muat tile peta", "kirim SMS (simulasi)", "balasan STOP" | Hubungan antara *Controller* atau *View* dan sistem di luar P/L. |

Pada diagram, `PetaRisikoController` dipicu oleh `CronEksternal` dan bukan oleh *View*, dan `PeringatanSMSController` tidak memiliki *View* karena warga tidak membuka antarmuka apa pun (SKPL AK03). `HalamanPetaRisiko` juga menampilkan notifikasi untuk petugas, misalnya pembatalan tugas oleh relawan (KF21).

## 3.2 Physical View

*Physical View* digambarkan dalam bentuk *deployment diagram* yang memetakan komponen Tabel 2.1 ke perangkat dan lingkungan eksekusi pada Tabel 1.1.

<p align="center">
<img alt="Physical View SIGAP" src="./assets/diagram/physical-view-sigap.png" width="100%">
</p>
<p align="center">
<i>Gambar 4. Physical View SIGAP</i>
</p>

| Node | Lingkungan eksekusi | Komponen |
| :--- | :--- | :--- |
| Laptop petugas posko | Peramban web modern (Chrome, Edge, atau Firefox) dengan Leaflet | `HalamanLogin`, `HalamanPetaRisiko`, `FormPenyusunanJadwal`, `HalamanAntreanLaporan` |
| Ponsel Android relawan | Chrome Android sebagai PWA dengan *Service Worker* | `HalamanLogin`, `HalamanDaftarTugas`, `FormLaporanBuktiKerja`, `DialogTandaiKeliru`, `PenyimpananLokal`, serta bagian klien dari `AutentikasiController`, `DaftarTugasController`, dan `UploadLaporanController` |
| Server aplikasi (layanan cloud gratis) | Node.js LTS 22 + Express | Delapan *Controller* dan sembilan *Model* (bagian server dari tiga *Controller* di atas ikut berada di sini) |
| Server basis data | PostgreSQL 16 | `DatabaseServer` |
| Sistem eksternal (garis putus-putus) | Di luar P/L | `CronEksternal`, `NasaFirmsAPI`, `OpenMeteoAPI`, `SMSGatewaySimulasi`, `OpenStreetMapTile` |

Seluruh jalur komunikasi antara klien dan server memakai HTTPS. Peramban petugas memuat tile peta langsung dari `OpenStreetMapTile`, sedangkan seluruh pemanggilan API eksternal lainnya dilakukan oleh server.

**Keputusan rancangan yang mengikuti dari view ini**

1. **Satu aplikasi server (monolit modular).** Seluruh *Controller* dan *Model* berada dalam satu proses Express yang juga menyajikan berkas antarmuka kedua klien. Dengan demikian cukup satu layanan yang dideploy, dan tidak ada komunikasi antarlayanan yang perlu dikelola oleh tim.
2. ***Controller* yang terbagi klien dan server.** Logika luring (UUID, kompresi foto, penyimpanan lokal, pemeriksaan sesi) berjalan di PWA, sedangkan penerimaan data, penolakan UUID ganda, dan pengelolaan sesi berjalan di server. Pemisahan ini mengikuti KF12, KF13, KF20, dan KNF03.
3. **Endpoint pembaruan dilindungi token rahasia.** Endpoint yang dipanggil `CronEksternal` bersifat publik sehingga harus memeriksa token rahasia. Token dan MAP_KEY NASA FIRMS disimpan sebagai *environment variable* di server, tidak di repositori, karena repositori proyek bersifat publik (SKPL batasan 13).
4. **Kendala layanan gratis.** Layanan hosting gratis dapat menidurkan server ketika tidak ada trafik, sehingga permintaan pertama bisa lebih lambat daripada batas 5 detik pada KNF01. Sebelum sesi pengujian dan demo, server perlu dipanaskan lebih dulu dengan membuka aplikasi atau memanggil endpoint kesehatan.
5. **Penanda prototipe.** Karena SMS disimulasikan dan demo memakai data titik panas historis (SKPL batasan 4 dan 10), antarmuka menampilkan penanda "Prototipe: data historis dan SMS disimulasikan" agar tidak disalahartikan sebagai peringatan sungguhan.

---

# Referensi

- Sommerville, I. (2016). *Software Engineering* (10th ed.). Pearson. Chapter 6: *Architectural Design*: [https://software-engineering-book.com/slides/](https://software-engineering-book.com/slides/)
- Kruchten, P. (1995). The 4+1 View Model of Architecture. *IEEE Software*, 12(6), 42–50.
- Kelompok G-08 K-01. *Spesifikasi Kebutuhan Perangkat Lunak (SKPL) SIGAP*, Tugas 5, IF2150 Rekayasa Perangkat Lunak, 2026.
- Diagram arsitektur: [https://www.drawio.com/](https://www.drawio.com/)

