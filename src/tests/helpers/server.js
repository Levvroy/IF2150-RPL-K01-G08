import { spawn } from 'node:child_process';

// Pembagian port tes INT (satu file satu port):
// 3100 setup.int | 3101 verifikasi.int | 3102 knf05-akses.int | 3103 jadwal-keliru.int
// 3104 sms.int | 3105 knf10-sms.int | 3106 knf12-nomor.int
// Anggota berikutnya mulai dari 3107.

export function jalankanServer(port) {
  const proses = spawn('node', ['server.js'], { env: { ...process.env, PORT: port } });
  return new Promise((resolve, reject) => {
    proses.stdout.on('data', (d) => {
      if (String(d).includes('berjalan')) resolve(proses);
    });
    proses.on('exit', () => reject(new Error('server gagal nyala')));
  });
}

export function hentikanServer(proses) {
  return new Promise((resolve) => {
    proses.once('exit', resolve);
    proses.kill();
  });
}
