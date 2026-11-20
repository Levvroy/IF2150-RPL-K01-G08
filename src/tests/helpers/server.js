import { spawn } from 'node:child_process';

export function jalankanServer(port, envTambahan = {}) {
  const proses = spawn('node', ['server.js'], {
    env: { ...process.env, PORT: String(port), ...envTambahan }
  });
  return new Promise((resolve, reject) => {
    let stderr = '';
    proses.stderr?.on('data', (d) => {
      stderr += String(d);
    });
    proses.stdout.on('data', (d) => {
      if (String(d).includes('berjalan')) resolve(proses);
    });
    proses.on('exit', (kode) => reject(new Error(`server gagal nyala (${kode}): ${stderr}`)));
  });
}

export function hentikanServer(proses) {
  return new Promise((resolve) => {
    proses.once('exit', resolve);
    proses.kill();
  });
}
