DROP TABLE IF EXISTS notifikasi, peringatan_sms, warga, laporan_bukti_kerja, jadwal_pekerjaan, relawan_lapangan, pengguna, titik_panas, petak_lahan CASCADE;

CREATE TABLE pengguna (
  id_pengguna   SERIAL PRIMARY KEY,
  username      VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  peran         VARCHAR(10) NOT NULL CHECK (peran IN ('petugas', 'relawan'))
);

CREATE TABLE relawan_lapangan (
  id_relawan   INTEGER PRIMARY KEY REFERENCES pengguna(id_pengguna),
  nama         VARCHAR(100) NOT NULL,
  kontak       VARCHAR(20),
  status_aktif BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE petak_lahan (
  id_petak              SERIAL PRIMARY KEY,
  lat_min               DOUBLE PRECISION NOT NULL,
  lat_maks              DOUBLE PRECISION NOT NULL,
  lng_min               DOUBLE PRECISION NOT NULL,
  lng_maks              DOUBLE PRECISION NOT NULL,
  skor_risiko           DOUBLE PRECISION NOT NULL DEFAULT 0,
  tingkat_risiko        VARCHAR(10) NOT NULL DEFAULT 'rendah' CHECK (tingkat_risiko IN ('rendah', 'sedang', 'tinggi')),
  waktu_update_terakhir TIMESTAMPTZ
);

CREATE TABLE titik_panas (
  id_titik_panas      SERIAL PRIMARY KEY,
  latitude            DOUBLE PRECISION NOT NULL,
  longitude           DOUBLE PRECISION NOT NULL,
  waktu_deteksi       TIMESTAMPTZ NOT NULL,
  status_validitas    VARCHAR(10) NOT NULL DEFAULT 'valid' CHECK (status_validitas IN ('valid', 'keliru')),
  keterangan          TEXT,
  waktu_tandai_keliru TIMESTAMPTZ,
  UNIQUE (latitude, longitude, waktu_deteksi)
);

CREATE TABLE jadwal_pekerjaan (
  id_jadwal         SERIAL PRIMARY KEY,
  id_relawan        INTEGER NOT NULL REFERENCES relawan_lapangan(id_relawan),
  id_petak          INTEGER NOT NULL REFERENCES petak_lahan(id_petak),
  id_titik_panas    INTEGER REFERENCES titik_panas(id_titik_panas),
  jenis_pekerjaan   VARCHAR(30) NOT NULL CHECK (jenis_pekerjaan IN ('patroli', 'pembasahan sekat kanal', 'pengecekan titik panas')),
  tanggal           DATE NOT NULL,
  status            VARCHAR(20) NOT NULL DEFAULT 'ditugaskan' CHECK (status IN ('ditugaskan', 'menunggu verifikasi', 'selesai', 'dibatalkan')),
  alasan_pembatalan TEXT
);

CREATE TABLE laporan_bukti_kerja (
  id_laporan            UUID PRIMARY KEY,
  id_jadwal             INTEGER NOT NULL REFERENCES jadwal_pekerjaan(id_jadwal),
  foto                  BYTEA NOT NULL,
  lat_unggah            DOUBLE PRECISION NOT NULL,
  lng_unggah            DOUBLE PRECISION NOT NULL,
  waktu_unggah          TIMESTAMPTZ NOT NULL,
  status                VARCHAR(20) NOT NULL DEFAULT 'menunggu verifikasi' CHECK (status IN ('menunggu verifikasi', 'terverifikasi', 'ditolak')),
  alasan_penolakan      TEXT,
  id_petugas_verifikasi INTEGER REFERENCES pengguna(id_pengguna),
  waktu_verifikasi      TIMESTAMPTZ
);

CREATE TABLE warga (
  id_warga           SERIAL PRIMARY KEY,
  id_petak           INTEGER NOT NULL REFERENCES petak_lahan(id_petak),
  nomor_hp           VARCHAR(20) NOT NULL UNIQUE,
  status_persetujuan VARCHAR(10) NOT NULL DEFAULT 'aktif' CHECK (status_persetujuan IN ('aktif', 'dicabut')),
  waktu_dicabut      TIMESTAMPTZ
);

CREATE TABLE peringatan_sms (
  id_peringatan SERIAL PRIMARY KEY,
  id_warga      INTEGER NOT NULL,
  id_petak      INTEGER NOT NULL REFERENCES petak_lahan(id_petak),
  isi_pesan     TEXT NOT NULL,
  waktu_kirim   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status        VARCHAR(10) NOT NULL CHECK (status IN ('terkirim', 'gagal'))
);

CREATE TABLE notifikasi (
  id_notifikasi SERIAL PRIMARY KEY,
  id_pengguna   INTEGER NOT NULL REFERENCES pengguna(id_pengguna),
  isi_pesan     TEXT NOT NULL,
  waktu_dibuat  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sudah_dibaca  BOOLEAN NOT NULL DEFAULT FALSE
);
