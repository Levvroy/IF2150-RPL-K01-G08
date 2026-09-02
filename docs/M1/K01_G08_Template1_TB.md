<h1>
IF2150 REKAYASA PERANGKAT LUNAK
<br>
TUGAS 1
<br>
TOPIC BRAINSTORMING
</h1>
<br>

## *SIGAP*

### Untuk: *[Amanda Aurellia Salsabilla]*

Dipersiapkan oleh:
| Informasi | Keterangan |
| --- | --- |
| Kelas | K-01 |
| Kelompok | G-08  |

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

# BAB 1: Analisis Permasalahan

## 1.1 Latar Belakang Masalah
Tuliskan deskripsi permasalahan yang kalian pilih secara naratif dan spesifik. Tambahkan keterkaitan permasalahan tersebut dengan Tujuan Pembangunan Berkelanjutan (SDGs) yang telah disepakati. Dukung argumen kalian dengan data yang kredibel, serta jelaskan urgensi mengapa masalah ini perlu dan layak untuk segera diselesaikan.

## 1.2 Analisis Kondisi Saat Ini
Lakukan analisis terhadap proses yang berjalan saat ini di dunia nyata, baik itu sistem lama ataupun solusi yang sudah ada. Soroti kesenjangan atau celah dari kondisi tersebut yang nantinya akan diselesaikan oleh perangkat lunak kalian.

---

# BAB 2: Analisis Solusi

## 2.1 Deskripsi Perangkat Lunak
Solusi yang kami usulkan adalah SIGAP, sistem informasi berbasis peta untuk pencegahan kebakaran lahan gambut. Sistem ini terdiri atas situs web (progressive web app) untuk relawan lapangan yang dapat bekerja secara luring dan menyinkronkan data saat koneksi tersedia, serta notifikasi SMS berjenjang untuk warga setempat. 

Sistem menggabungkan data titik panas satelit dan data cuaca menjadi satu skor risiko untuk setiap petak lahan yang ditampilkan pada peta berwarna. Dari skor tersebut, sistem menghasilkan dua keluaran. Output pertama bersifat pencegahan, yaitu usulan pekerjaan seperti perbaikan atau patroli terjadwal yang disusun sesuai anggaran dan jumlah regu yang tersedia. Output kedua bersifat notifikasi darurat, yaitu peringatan berjenjang kepada warga dan penugasan pengecekan titik panas kepada relawan yang bertugas. 

Relawan menggunakan situs web untuk menerima tugas dan mengunggah foto beserta koordinat sebagai bukti, lalu data tersebut dikirimkan ke database. Umpan balik ini dipakai sistem untuk mengoreksi deteksi yang keliru dan ditandai sebagai false information. Nilai unik SIGAP dibandingkan sistem yang sudah ada adalah orientasinya pada pencegahan, yaitu menghasilkan tindakan sebelum api muncul.

## 2.2 Asumsi dan Batasan

Pada tahap perencanaan SIGAP, kami menemukan beberapa hal yang dapat dikategorikan sebagai asumsi yang digunakan sebagai landasan dari pengerjaan perangkat lunak ini yaitu:

1. Relawan lapangan terbiasa mengoperasikan web standar dan membaca peta digital.
2. Warga terbiasa menerima informasi melalui SMS.
3. Relawan mengunggah foto bukti yang benar-benar diambil di lokasi dan pada waktu penugasan.
4. Data titik panas satelit tersedia melalui API publik dengan jeda waktu yang dapat diterima.
5. Data cuaca dan peta lahan gambut tersedia dalam format yang dapat diolah sistem.
6. Media penyimpanan mencukupi untuk menampung foto bukti dan riwayat data risiko.
7. Sistem dapat berjalan pada satu server tunggal dengan beban wajar selama pengujian.

Adapun batasan yang ada pada perangkat lunak ini mencakup beberapa kategori yaitu regulasi, sumber daya, dan juga ruang lingkup yang akan berlaku pada perangkat lunak ini.

### Regulasi

1. Sistem hanya menyediakan informasi dan pendukung keputusan, tidak menyimpulkan pelanggaran hukum maupun menetapkan pihak yang bersalah atas suatu kebakaran.

### Sumber Daya

1. Tidak tersedia anggaran untuk pengadaan sensor lapangan maupun layanan data berbayar.
2. Penggunaan server atau infrastruktur deployment gratis dengan kapasitas terbatas.
3. Keterbatasan jumlah anggota dan pengalaman tim.

### Ruang Lingkup

1. Sistem hanya diterapkan pada satu wilayah percontohan, bukan skala nasional.
2. Sistem tidak mengendalikan perangkat fisik apa pun dan tidak menggantikan prosedur penanganan darurat yang berlaku.
3. Komunikasi antarpengguna dibatasi pada teks dan unggahan foto.

---

# BAB 3: Spesifikasi Kebutuhan dan Proses Bisnis

## 3.1 Identifikasi Aktor
Buatlah daftar seluruh aktor (pengguna) yang akan berinteraksi langsung dengan sistem solusi yang kalian kembangkan. Berikan penjelasan singkat mengenai peran dan karakteristik dari masing-masing aktor tersebut.

| Aktor | Deskripsi |
| :--- | :--- |
| *Kasir* | *Pengguna ini bertindak sebagai pihak yang bertanggung jawab untuk memproses transaksi harian dan melayani pembayaran pelanggan. Karakteristik dari pengguna ini adalah mengutamakan kecepatan dan keakuratan saat bertransaksi.* |
| ... | ... |


## 3.2 Kebutuhan Pengguna Awal
Definisikan apa yang ingin dicapai oleh pengguna saat menggunakan sistem ini dalam format *User Story* (Sebagai [Aktor], saya ingin [Aktivitas/Kebutuhan], sehingga [Tujuan/Nilai]). Pastikan kalian berfokus pada "apa yang ingin dilakukan pengguna".

| ID | Aktor | Kebutuhan / Aktivitas | Tujuan / Nilai |
| :--- | :--- | :--- | :--- |
| US-01 | *Kasir* |  *Memindai barcode barang* | *Proses pembayaran berjalan cepat dan akurat* |
| US-02 | *[Nama Aktor]* | *[Kebutuhan pengguna]* | *[Tujuan yang dicapai pengguna]* |
| ... | ... | ... | ... |

## 3.3 Deskripsi Aktivitas
Buatlah daftar seluruh aktivitas yang terdapat dalam sistem solusi, lengkap dengan ID dan penjelasan. Telusuri hubungan aktivitas tersebut dengan *user story* yang sudah dituliskan sebelumnya. Bisa dibuat dalam bentuk tabel.
| ID | Aktivitas | Penjelasan | ID User Story |
| :--- | :--- | :--- | :--- |
| A01 | *Melakukan Pemesanan* | *Pelanggan memulai proses dengan memesan produk.* | *US-01* |
| A02 | *Memproses Pesanan* | *Sistem memproses dan menyiapkan detail sesuai dengan pesanan.* | *US-02*|
| ... | ... | ... | ... |

## 3.4 Model Proses Bisnis
Buatlah *Activity Diagram* atau *Swimlane Diagram* yang menunjukkan alur kerja proses bisnis dari sistem solusi. Diagram ini harus memvisualisasikan bagaimana alur operasional di dunia nyata berjalan lebih efisien dengan adanya interaksi antara aktor (yang didefinisikan pada poin 3.1) dan sistem perangkat lunak. Perhatikan notasi yang digunakan dalam pembuatannya.
<br>

<p align="center">
<img alt="Contoh Activity Diagram" src="./assets/diagram/diagram-act-1.avif" width="70%">
</p>
<p align="center">
<i>Gambar 1. Contoh Activity Diagram</i>
</p>

<br>

# Referensi
- Diagram UML: https://www.drawio.com/, https://staruml.io/
