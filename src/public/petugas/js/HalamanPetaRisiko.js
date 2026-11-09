// C01 HalamanPetaRisiko (I-02).
import { periksaSesi, ambilPeran, ambilToken, keluar } from '/relawan/js/AutentikasiController.js';

const $ = (id) => document.getElementById(id);
const el = {
  halaman: $('halaman'),
  ringkasan: $('ringkasan'),
  peringatanCache: $('peringatan-cache'),
  peringatanCacheIsi: $('peringatan-cache-isi'),
  peta: $('peta'),
  bagianNotifikasi: $('bagian-notifikasi'),
  judulNotifikasi: $('judul-notifikasi'),
  daftarNotifikasi: $('daftar-notifikasi'),
  panelRingkasan: $('panel-ringkasan'),
  bagianRingkasanWilayah: $('bagian-ringkasan-wilayah'),
  judulRingkasan: $('judul-ringkasan'),
  jumlahTinggi: $('jumlah-tinggi'),
  jumlahSedang: $('jumlah-sedang'),
  jumlahRendah: $('jumlah-rendah'),
  daftarTertinggi: $('daftar-tertinggi'),
  panelDetailPetak: $('panel-detail-petak'),
  tombolSemuaPetak: $('tombol-semua-petak'),
  detailSkor: $('detail-skor'),
  detailNama: $('detail-nama'),
  detailTingkat: $('detail-tingkat'),
  detailTengah: $('detail-tengah'),
  detailWaktu: $('detail-waktu'),
  tombolSusunJadwal: $('tombol-susun-jadwal'),
  tombolKeluar: $('tombol-keluar')
};

const WARNA_PETAK = {
  tinggi: '#c2410c',
  sedang: '#f5b800',
  rendah: '#1f6f3a'
};

const ZONA = 'Asia/Jakarta';
const fmtTanggal = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: ZONA });
const fmtJam = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: ZONA });
const fmtAngka = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 4, maximumFractionDigits: 4 });

let petaLeaflet = null;
let layerPersegi = new Map();
let daftarPetak = [];
let daftarNotifikasiAktif = [];
let idPetakTerpilih = null;

function formatWaktu(iso) {
  if (!iso) return 'belum pernah';
  const w = new Date(iso);
  return `${fmtTanggal.format(w)}, ${fmtJam.format(w).replace(':', '.')}`;
}

function formatTitikTengah(batas) {
  const lat = (batas.latMin + batas.latMaks) / 2;
  const lng = (batas.lngMin + batas.lngMaks) / 2;
  const ns = lat < 0 ? 'LS' : 'LU';
  const ew = lng < 0 ? 'BB' : 'BT';
  return `${fmtAngka.format(Math.abs(lat))}° ${ns}, ${fmtAngka.format(Math.abs(lng))}° ${ew}`;
}

async function minta(url, opsi = {}) {
  const res = await fetch(url, {
    ...opsi,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ambilToken()}`, ...opsi.headers }
  });
  if (res.status === 401) {
    keluar();
    location.href = '/petugas/login.html';
    throw new Error('Sesi berakhir');
  }
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

function perbaruiGayaPersegi() {
  for (const [id, rect] of layerPersegi.entries()) {
    const dipilih = id === idPetakTerpilih;
    rect.setStyle({
      color: dipilih ? '#111111' : '#ffffff',
      weight: dipilih ? 3 : 1,
      fillOpacity: dipilih ? 0.85 : 0.72
    });
    if (dipilih) rect.bringToFront();
  }
}

function pilihPetak(petak) {
  idPetakTerpilih = petak.idPetak;
  perbaruiGayaPersegi();

  const skorBulat = Math.round(petak.skorRisiko);
  el.detailSkor.textContent = skorBulat;
  el.detailSkor.className = `lencana ${petak.tingkatRisiko}`;
  el.detailNama.textContent = `Petak ${petak.idPetak}`;
  el.detailTingkat.textContent = `Risiko ${petak.tingkatRisiko}, skor ${skorBulat}`;
  el.detailTengah.textContent = formatTitikTengah(petak.batasWilayah);
  el.detailWaktu.textContent = formatWaktu(petak.waktuUpdateTerakhir);
  el.tombolSusunJadwal.href = `/petugas/jadwal.html?idPetak=${petak.idPetak}`;

  el.bagianNotifikasi.hidden = true;
  el.panelRingkasan.hidden = true;
  el.panelDetailPetak.hidden = false;
}

function tutupDetailPetak() {
  idPetakTerpilih = null;
  perbaruiGayaPersegi();
  el.panelDetailPetak.hidden = true;
  el.panelRingkasan.hidden = false;
  aturVisibilitasNotifikasi();
}

function aturVisibilitasNotifikasi() {
  const adaNotif = daftarNotifikasiAktif.length > 0;
  el.bagianNotifikasi.hidden = !adaNotif || idPetakTerpilih !== null;
  el.bagianRingkasanWilayah.hidden = adaNotif;
}

// Operasi C01: tampilkanPeta(daftarPetak)
export function tampilkanPeta(petakData) {
  daftarPetak = petakData;
  el.halaman.dataset.keadaan = 'siap';

  if (!petaLeaflet && globalThis.L) {
    petaLeaflet = L.map(el.peta).setView([-0.516, 101.43], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap, NASA FIRMS, Open-Meteo'
    }).addTo(petaLeaflet);
    L.control.scale({ imperial: false }).addTo(petaLeaflet);
  }

  for (const rect of layerPersegi.values()) rect.remove();
  layerPersegi.clear();

  const hitungan = { tinggi: 0, sedang: 0, rendah: 0 };

  for (const petak of daftarPetak) {
    hitungan[petak.tingkatRisiko] = (hitungan[petak.tingkatRisiko] ?? 0) + 1;

    if (petaLeaflet && globalThis.L) {
      const b = petak.batasWilayah;
      const rect = L.rectangle(
        [
          [b.latMin, b.lngMin],
          [b.latMaks, b.lngMaks]
        ],
        {
          color: '#ffffff',
          weight: 1,
          fillColor: WARNA_PETAK[petak.tingkatRisiko] ?? WARNA_PETAK.rendah,
          fillOpacity: 0.72
        }
      ).addTo(petaLeaflet);

      rect.bindTooltip(`Petak ${petak.idPetak}, skor ${Math.round(petak.skorRisiko)}`);
      rect.on('click', () => pilihPetak(petak));
      layerPersegi.set(petak.idPetak, rect);
    }
  }

  el.judulRingkasan.textContent = `Ringkasan wilayah (${daftarPetak.length} petak)`;
  el.jumlahTinggi.textContent = `${hitungan.tinggi} petak`;
  el.jumlahSedang.textContent = `${hitungan.sedang} petak`;
  el.jumlahRendah.textContent = `${hitungan.rendah} petak`;

  const limaTertinggi = [...daftarPetak]
    .sort((a, b) => b.skorRisiko - a.skorRisiko)
    .slice(0, 5);

  el.daftarTertinggi.replaceChildren(
    ...limaTertinggi.map((p) => {
      const li = document.createElement('li');
      const tombol = document.createElement('button');
      tombol.type = 'button';
      tombol.className = 'baris-antrean baris-petak';

      const kiri = document.createElement('div');
      kiri.className = 'baris-petak-kiri';

      const lencana = document.createElement('span');
      lencana.className = `lencana lencana-kecil ${p.tingkatRisiko}`;
      lencana.textContent = Math.round(p.skorRisiko);

      const teks = document.createElement('span');
      const judul = document.createElement('strong');
      judul.textContent = `Petak ${p.idPetak}`;
      const sub = document.createElement('span');
      sub.className = 'teks-sub';
      sub.textContent = `Risiko ${p.tingkatRisiko}`;
      teks.append(judul, sub);

      kiri.append(lencana, teks);
      tombol.append(kiri);
      tombol.addEventListener('click', () => pilihPetak(p));
      li.append(tombol);
      return li;
    })
  );
}

// Operasi C01: tampilkanAtribusi(waktuUpdate)
export function tampilkanAtribusi(waktuUpdate) {
  el.ringkasan.textContent = `Diperbarui ${formatWaktu(waktuUpdate)}. Wilayah percontohan ${daftarPetak.length} petak 1 km.`;
}

// Operasi C01: tampilkanKeteranganCache(waktuUpdate)
export function tampilkanKeteranganCache(waktuUpdate) {
  const waktuTeks = formatWaktu(waktuUpdate);
  el.ringkasan.textContent = `Hasil perhitungan terakhir ${waktuTeks}`;
  el.peringatanCacheIsi.textContent = `Pembaruan data terakhir belum berhasil. Peta memakai hasil ${waktuTeks}.`;
  el.peringatanCache.hidden = false;
}

// Operasi C01: tampilkanNotifikasi(daftarNotifikasi)
export function tampilkanNotifikasi(notifikasi = []) {
  daftarNotifikasiAktif = [...notifikasi];
  el.judulNotifikasi.textContent = `Notifikasi (${daftarNotifikasiAktif.length} baru)`;

  el.daftarNotifikasi.replaceChildren(
    ...daftarNotifikasiAktif.map((n) => {
      const kartu = document.createElement('article');
      kartu.className = 'kartu kartu-notifikasi';

      const isi = document.createElement('p');
      isi.textContent = n.isiPesan;

      const waktu = document.createElement('p');
      waktu.className = 'teks-catatan';
      waktu.textContent = formatWaktu(n.waktuDibuat);

      const tombol = document.createElement('button');
      tombol.type = 'button';
      tombol.className = 'tombol-utama';
      tombol.textContent = 'Susun ulang jadwal';
      tombol.addEventListener('click', async () => {
        await minta(`/api/notifikasi/${n.idNotifikasi}/baca`, { method: 'POST' }).catch(() => {});
        daftarNotifikasiAktif = daftarNotifikasiAktif.filter((item) => item.idNotifikasi !== n.idNotifikasi);
        tampilkanNotifikasi(daftarNotifikasiAktif);
        location.href = '/petugas/jadwal.html';
      });

      kartu.append(isi, waktu, tombol);
      return kartu;
    })
  );

  aturVisibilitasNotifikasi();
}

async function muatPeta() {
  try {
    const { status, data } = await minta('/api/peta');
    if (status !== 200) return;

    tampilkanPeta(data.daftarPetak);
    tampilkanAtribusi(data.waktuUpdate);
    if (data.isUsang) {
      tampilkanKeteranganCache(data.waktuUpdate);
    } else {
      el.peringatanCache.hidden = true;
    }
    tampilkanNotifikasi(data.daftarNotifikasi);
  } catch {
    el.ringkasan.textContent = 'Peta belum bisa ditampilkan. Periksa koneksi laptop lalu muat ulang.';
  }
}

el.tombolSemuaPetak?.addEventListener('click', tutupDetailPetak);
el.tombolKeluar?.addEventListener('click', () => {
  keluar();
  location.href = '/petugas/login.html';
});

if (!periksaSesi() || ambilPeran() !== 'petugas') {
  location.replace('/petugas/login.html');
} else {
  muatPeta();
}