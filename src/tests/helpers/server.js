import { spawn } from 'node:child_process';

export function jalankanServer(port) {
  const proses = spawn('node', ['server.js'], { env: { ...process.env, PORT: port } });
  return new Promise((resolve, reject) => {
    proses.stdout.on('data', (d) => {
      if (String(d).includes('berjalan')) resolve(proses);
    });
    proses.on('exit', () => reject(new Error('server gagal nyala')));
  });
}
