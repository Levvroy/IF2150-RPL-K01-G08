import http from 'node:http';
import { spawn } from 'node:child_process';

export function jalankanServerDenganEnv(port, envTambahan = {}) {
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

export function buatServerEksternalDummy() {
  let stateFirms = {
    mode: 'sukses',
    status: 200,
    csv: 'latitude,longitude,acq_date,acq_time\n'
  };
  let stateCuaca = {
    mode: 'sukses',
    status: 200,
    json: { daily: { precipitation_sum: [5, 0, 0, 0] } }
  };
  const permintaanFirms = [];
  const permintaanCuaca = [];

  const server = http.createServer((req, res) => {
    if (req.url.startsWith('/api/area/csv/')) {
      permintaanFirms.push(req.url);
      if (stateFirms.mode === 'putus') {
        req.socket.destroy();
        return;
      }
      if (stateFirms.mode === 'gagal') {
        res.writeHead(stateFirms.status || 500, { 'Content-Type': 'text/plain' });
        res.end('FIRMS error');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/csv' });
      res.end(stateFirms.csv);
      return;
    }

    if (req.url.startsWith('/v1/forecast')) {
      permintaanCuaca.push(req.url);
      if (stateCuaca.mode === 'putus') {
        req.socket.destroy();
        return;
      }
      if (stateCuaca.mode === 'gagal') {
        res.writeHead(stateCuaca.status || 503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: true, reason: 'Service unavailable' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(stateCuaca.json));
      return;
    }

    res.writeHead(404);
    res.end();
  });

  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      const url = `http://127.0.0.1:${port}`;
      resolve({
        url,
        aturFirms(opsi) {
          stateFirms = { ...stateFirms, ...opsi };
        },
        aturCuaca(opsi) {
          stateCuaca = { ...stateCuaca, ...opsi };
        },
        log() {
          return {
            permintaanFirms: [...permintaanFirms],
            permintaanCuaca: [...permintaanCuaca]
          };
        },
        resetLog() {
          permintaanFirms.length = 0;
          permintaanCuaca.length = 0;
        },
        tutup() {
          server.closeAllConnections?.();
          return new Promise((done) => server.close(done));
        }
      });
    });
  });
}

export async function potretPetakAsli(pool) {
  const { rows: petak } = await pool.query(
    `SELECT id_petak, skor_risiko, tingkat_risiko, waktu_update_terakhir
     FROM petak_lahan
     WHERE lat_min >= -80
     ORDER BY id_petak`
  );
  const { rows: maksSms } = await pool.query(
    'SELECT COALESCE(MAX(id_peringatan), 0)::int AS maks FROM peringatan_sms'
  );
  const { rows: maksTitik } = await pool.query(
    'SELECT COALESCE(MAX(id_titik_panas), 0)::int AS maks FROM titik_panas'
  );
  return {
    petak,
    maksPeringatan: maksSms[0].maks,
    maksTitikPanas: maksTitik[0].maks
  };
}

export async function bersihkanDataUjiPeta(pool, maksPeringatan = null, maksTitikPanas = null) {
  if (maksPeringatan !== null) {
    await pool.query('DELETE FROM peringatan_sms WHERE id_peringatan > $1', [maksPeringatan]);
  }
  await pool.query(
    `DELETE FROM peringatan_sms
     WHERE id_petak IN (SELECT id_petak FROM petak_lahan WHERE lat_min < -80)`
  );
  await pool.query(
    `DELETE FROM warga
     WHERE nomor_hp LIKE '0899%'
        OR id_petak IN (SELECT id_petak FROM petak_lahan WHERE lat_min < -80)`
  );
  await pool.query(
    `DELETE FROM jadwal_pekerjaan
     WHERE id_petak IN (SELECT id_petak FROM petak_lahan WHERE lat_min < -80)
        OR id_titik_panas IN (SELECT id_titik_panas FROM titik_panas WHERE latitude < -80)`
  );
  if (maksTitikPanas !== null) {
    await pool.query(
      'DELETE FROM jadwal_pekerjaan WHERE id_titik_panas > $1',
      [maksTitikPanas]
    );
    await pool.query(
      'DELETE FROM titik_panas WHERE latitude < -80 OR id_titik_panas > $1',
      [maksTitikPanas]
    );
  } else {
    await pool.query('DELETE FROM titik_panas WHERE latitude < -80');
  }
  await pool.query('DELETE FROM petak_lahan WHERE lat_min < -80');
}

export async function pulihkanPetakAsli(pool, potret) {
  await bersihkanDataUjiPeta(
    pool,
    potret?.maksPeringatan ?? null,
    potret?.maksTitikPanas ?? null
  );
  if (!potret?.petak?.length) return;
  const ids = potret.petak.map((p) => p.id_petak);
  const skors = potret.petak.map((p) => p.skor_risiko);
  const tingkats = potret.petak.map((p) => p.tingkat_risiko);
  const waktus = potret.petak.map((p) => p.waktu_update_terakhir);
  await pool.query(
    `UPDATE petak_lahan AS p
     SET skor_risiko = v.skor_risiko,
         tingkat_risiko = v.tingkat_risiko,
         waktu_update_terakhir = v.waktu_update_terakhir
     FROM (
       SELECT * FROM unnest($1::int[], $2::double precision[], $3::text[], $4::timestamptz[])
         AS t(id_petak, skor_risiko, tingkat_risiko, waktu_update_terakhir)
     ) AS v
     WHERE p.id_petak = v.id_petak`,
    [ids, skors, tingkats, waktus]
  );
}

export async function buatPetakUji(pool, {
  latMin = -88,
  latMaks = -87.99,
  lngMin = 101.40,
  lngMaks = 101.41,
  skor = 0,
  tingkat = 'rendah',
  waktuUpdate = new Date()
} = {}) {
  await pool.query(
    `SELECT setval(
       pg_get_serial_sequence('petak_lahan', 'id_petak'),
       GREATEST((SELECT COALESCE(MAX(id_petak), 0) FROM petak_lahan), 1000)
     )`
  );
  const { rows } = await pool.query(
    `INSERT INTO petak_lahan
       (lat_min, lat_maks, lng_min, lng_maks, skor_risiko, tingkat_risiko, waktu_update_terakhir)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id_petak`,
    [latMin, latMaks, lngMin, lngMaks, skor, tingkat, waktuUpdate]
  );
  return rows[0].id_petak;
}
