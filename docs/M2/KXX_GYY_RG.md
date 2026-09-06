<h1>
IF2150 REKAYASA PERANGKAT LUNAK
<br>
TUGAS 2
<br>
REQUIREMENT GATHERING
</h1>
<br>

## *Nama Perangkat Lunak*

### Untuk: *[Nama Asisten]*

Dipersiapkan oleh:

| Informasi | Keterangan |
| --- | --- |
| Kelas | *\[Kelas\]* |
| Kelompok | *\[Nomor Kelompok\]* |

| NIM | Nama |
| --- | --- |
| *\[NIM 1\]* | *\[Nama Anggota 1\]* |
| *\[NIM 2\]* | *\[Nama Anggota 2\]* |
| *\[NIM 3\]* | *\[Nama Anggota 3\]* |
| *\[NIM 4\]* | *\[Nama Anggota 4\]* |
| *\[NIM 5\]* | *\[Nama Anggota 5\]* |

---

## Daftar Perubahan

| Revisi | Deskripsi |
| :--- | :--- |
| *A* | *Deskripsikan perubahan yang dilakukan dari dokumen sebelumnya pada dokumen ini. Jika tidak terdapat perubahan, harap kosongkan tabel.* |
| *B* | |
| *C* | |
| ... | |

<br>
<br>

# BAB 1: Deskripsi Umum

## 1.1 Deskripsi Umum Sistem

Abstraksikan sistem solusi menurut sudut pandang pengguna yang telah ditentukan. Jelaskan secara ringkas mengenai apa saja ekspektasi pengguna terhadap sistem yang akan dikembangkan, alur kerja sistem yang diinginkan, serta harapan dari penerapan solusi dalam bentuk narasi.

> *Sistem adalah kesatuan utuh antara perangkat lunak, pengguna, perangkat keras, dan proses bisnis (urutan langkah logis yang dilakukan di dunia nyata untuk menyelesaikan suatu pekerjaan atau mencapai tujuan tertentu).*

## 1.2 Deskripsi Pengguna Perangkat Lunak

Buatlah daftar seluruh aktor (pengguna) yang akan berinteraksi langsung dengan sistem solusi yang kalian kembangkan. Berikan penjelasan singkat mengenai peran dan karakteristik dari masing-masing aktor tersebut.

| Aktor | Deskripsi |
| :--- | :--- |
| *Kasir* | *Pengguna ini bertindak sebagai pihak yang bertanggung jawab untuk memproses transaksi harian dan melayani pembayaran pelanggan. Karakteristik dari pengguna ini adalah mengutamakan kecepatan dan keakuratan saat bertransaksi.* |
| ... | ... |

---

# BAB 2: Deskripsi Kebutuhan Perangkat Lunak

## 2.1 Kebutuhan Pengguna Awal

Definisikan apa yang ingin dicapai oleh pengguna saat menggunakan sistem ini dalam format *User Story* (Sebagai [Aktor], saya ingin [Aktivitas/Kebutuhan], sehingga [Tujuan/Nilai]). Pastikan kalian berfokus pada "apa yang ingin dilakukan pengguna".

| ID | Aktor | Kebutuhan / Aktivitas | Tujuan / Nilai |
| :--- | :--- | :--- | :--- |
| US-01 | *Kasir* | *Memindai barcode barang* | *Proses pembayaran berjalan cepat dan akurat* |
| US-02 | *[Nama Aktor]* | *[Kebutuhan pengguna]* | *[Tujuan yang dicapai pengguna]* |
| ... | ... | ... | ... |

## 2.2 Deskripsi Aktivitas

Buatlah daftar seluruh aktivitas yang terdapat dalam sistem solusi, lengkap dengan ID dan penjelasan. Telusuri hubungan aktivitas tersebut dengan *user story* yang sudah dituliskan sebelumnya. Bisa dibuat dalam bentuk tabel.

| ID | Aktivitas | Penjelasan | ID User Story |
| :--- | :--- | :--- | :--- |
| A01 | *Melakukan Pembayaran* | *Pelanggan melakukan pembayaran secara digital.* | *US-01* |
| A02 | *Menerima Pembayaran* | *Toko menerima pembayaran secara real-time.* | *US-02* |
| ... | ... | ... | ... |

## 2.3 Pemetaan Kebutuhan

Perhatikan kembali semua aktivitas yang telah didefinisikan pada tabel deskripsi aktivitas atau *activity diagram*. Jabarkan kebutuhan sistem yang akan dibuat dengan mengacu pada aktivitas-aktivitas tersebut. Setiap aktivitas (ID Aktivitas) dapat memiliki satu atau lebih kebutuhan yang berbeda. Pastikan untuk mengidentifikasi dan mengisi semua jenis kebutuhan yang relevan untuk setiap aktivitas, yaitu:

- **User Requirement**, yaitu kebutuhan dari sudut pandang pengguna (apa yang dapat dilakukan pengguna).
- **Business Requirement**, yaitu aturan, kebijakan, atau standar bisnis yang harus dipenuhi oleh sistem.
- **System Requirement**, yaitu kebutuhan yang menjelaskan apa yang harus dilakukan sistem dan bagaimana sistem harus bekerja dari segi performa, keamanan, keandalan, dsb.

Lengkapi juga dengan penjelasannya dan apakah keperluan tersebut perlu didukung oleh perangkat lunak atau tidak. Jenis kebutuhan tidak terbatas hanya dari tiga jenis di atas, dapat ditambahkan yang lain juga bila diperlukan, misalnya kebutuhan regulasi (*Legal*).

| ID Kebutuhan | ID Aktivitas | Jenis Kebutuhan | Deskripsi Kebutuhan | P/L |
| :--- | :--- | :--- | :--- | :--- |
| *R01* | *A01* | *User* | *Pengguna dapat memilih metode pembayaran dan melakukan pembayaran secara digital.* | *Ya* |
| *R02* | *A01* | *Business* | *Transaksi digital sesuai dengan ketentuan UU ITE yang berlaku.* | *Tidak* |
| *R03* | *A01* | *System* | *Sistem harus mengintegrasikan API Payment Gateway dengan prinsip ACID (Atomicity, Consistency, Isolation, Durability), jika terjadi kegagalan jaringan saat saldo terpotong, sistem harus secara otomatis membatalkan transaksi atau meneruskan dana (reliable).* | *Ya* |
| *R04* | *A01* | *System* | *Kata sandi (password) atau PIN pengguna saat otorisasi pembayaran harus di-hash menggunakan algoritma SHA-256 dan tidak disimpan dalam bentuk plain-text.* | *Ya* |
| *R05* | *A02* | *Business* | *Toko harus memiliki rekening bank aktif dan valid untuk menerima pencairan dana dari sistem.* | *Tidak* |
| ... | ... | ... | ... | ... |

## 2.4 Kebutuhan Fungsional (KF)

Untuk setiap kebutuhan yang telah diidentifikasi sebagai "didukung oleh perangkat lunak", buatlah daftar kebutuhan fungsional P/L, lengkap dengan ID Kebutuhan Fungsional (KF) dan penjelasannya. Hubungkan ID Kebutuhan Fungsional dengan ID Pemetaan Kebutuhan dari sistem.

| ID KF | ID Kebutuhan | Penjelasan |
| :--- | :--- | :--- |
| *KF01* | *R01* | *Perangkat lunak dapat menampilkan pilihan antarmuka metode pembayaran (transfer bank, e-wallet, kartu kredit) setelah pengguna melakukan checkout.* |
| *KF02* | *R01* | *Perangkat lunak dapat mengirimkan permintaan otorisasi transaksi ke API Payment Gateway beserta nominal tagihan dan ID Pesanan.* |
| ... | ... | ... |

## 2.5 Kebutuhan Non-Fungsional (KNF)

Uraikan dengan ringkas Kebutuhan Non-Fungsional dalam tabel sebagai berikut. Isilah kolom kebutuhan dengan kalimat yang jelas, spesifik, dan terukur (kelak dapat diuji untuk dipenuhi). Kolom ID KNF adalah nomor Kebutuhan Non-Fungsional yang harus ditelusuri pada saat pengujian. Hubungkan ID Kebutuhan Non-Fungsional dengan ID Pemetaan Kebutuhan Umum dari sistem.

| ID KNF | ID Kebutuhan | Parameter | Deskripsi Kebutuhan |
| :--- | :--- | :--- | :--- |
| *KNF01* | *R03* | *Reliability* | *Proses transaksi pembayaran harus memenuhi prinsip ACID untuk mencegah terjadinya data tersangkut (lost update) apabila terjadi kegagalan jaringan di tengah proses.* |
| *KNF02* | *R04* | *Security* | *Sistem harus mengenkripsi PIN atau password pengguna menggunakan algoritma SHA-256 sebelum data dikirimkan ke server, serta tidak menyimpannya dalam bentuk plain-text di database.* |
| ... | ... | ... | ... |

Silakan pilih yang relevan. Tidak perlu semua parameter menjadi kebutuhan non-fungsional. Berikut merupakan penjelasan dari setiap parameter. **Parameter dari Kebutuhan Non-Fungsional tidak terbatas hanya di bawah ini** karena hanya merupakan panduan sehingga dapat ditambah KNF yang lain, misalnya *constraint* dari sistem.

| Parameter | Penjelasan |
| :--- | :--- |
| *Availability* | Ketersediaan aplikasi, misalnya harus terus-menerus beroperasi 7 hari per minggu, 24 jam per hari tanpa gagal. |
| *Reliability* | Keandalan, misalnya tidak pernah boleh gagal (atau kegagalan yang ditolerir adalah …%) sehingga harus dipikirkan *fault tolerant architecture*. Biasanya hanya perlu untuk *critical application* yang jika gagal akan berakibat fatal. |
| *Ergonomy* | Kenyamanan pakai bagi pengguna. |
| *Portability* | Kemudahan untuk dibawa dan dioperasikan ke mesin/sistem operasi/*platform* yang lain. |
| *Memory* | Jika perhitungan kapasitas memori internal kritis (misalnya untuk P/L yang harus dijadikan *chips* dan ukurannya harus kecil). |
| *Response time* | Batasan waktu yang harus dipenuhi. Sangat penting untuk aplikasi *real time*. Contoh: "Aplikasi harus mampu menampilkan hasil dalam 4 detik", atau "ATM harus menarik kembali kartu yang tidak diambil dalam waktu 3 menit". |
| *Safety* | Yang menyangkut keselamatan manusia, misalnya untuk P/L yang dipakai pada sistem kontrol di pabrik. |
| *Security* | Aspek keamanan yang harus dipenuhi. |

<br>

# Referensi
- Diagram UML: https://www.drawio.com/, https://staruml.io/
