const NAMA_DB = 'sigap';
const VERSI_DB = 1;

function buka() {
  return new Promise((resolve, reject) => {
    const permintaan = indexedDB.open(NAMA_DB, VERSI_DB);
    permintaan.onupgradeneeded = () => {
      const db = permintaan.result;
      db.createObjectStore('salinanTugas');
      db.createObjectStore('laporanTertunda', { keyPath: 'idLaporan' });
    };
    permintaan.onsuccess = () => resolve(permintaan.result);
    permintaan.onerror = () => reject(permintaan.error);
  });
}

async function jalankan(namaStore, mode, aksi) {
  const db = await buka();
  return new Promise((resolve, reject) => {
    const transaksi = db.transaction(namaStore, mode);
    const permintaan = aksi(transaksi.objectStore(namaStore));
    transaksi.oncomplete = () => {
      db.close();
      resolve(permintaan.result);
    };
    transaksi.onerror = () => {
      db.close();
      reject(transaksi.error);
    };
  });
}

export function simpan(namaStore, kunci, nilai) {
  return jalankan(namaStore, 'readwrite', (store) => (kunci === null ? store.put(nilai) : store.put(nilai, kunci)));
}

export function ambil(namaStore, kunci) {
  return jalankan(namaStore, 'readonly', (store) => store.get(kunci));
}

export function ambilSemua(namaStore) {
  return jalankan(namaStore, 'readonly', (store) => store.getAll());
}

export function hitung(namaStore) {
  return jalankan(namaStore, 'readonly', (store) => store.count());
}

export function hapus(namaStore, kunci) {
  return jalankan(namaStore, 'readwrite', (store) => store.delete(kunci));
}
