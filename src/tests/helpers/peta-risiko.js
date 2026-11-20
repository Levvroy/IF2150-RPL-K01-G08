import http from 'node:http';

export function waktuFirmsBaru(menitLalu = 30) {
  const d = new Date(Date.now() - menitLalu * 60 * 1000);
  const tanggal = d.toISOString().slice(0, 10);
  const jam = String(d.getUTCHours()).padStart(2, '0') + String(d.getUTCMinutes()).padStart(2, '0');
  return { tanggal, jam };
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
  for (const p of potret.petak) {
    await pool.query(
      `UPDATE petak_lahan
       SET skor_risiko = $2, tingkat_risiko = $3, waktu_update_terakhir = $4
       WHERE id_petak = $1`,
      [p.id_petak, p.skor_risiko, p.tingkat_risiko, p.waktu_update_terakhir]
    );
  }
}

// Petak uji ditaruh di lintang -88 agar tidak bertabrakan dengan petak seed di Riau.
export async function buatPetakUji(pool, {
  latMin = -88,
  latMaks = -87.99,
  lngMin = 101.40,
  lngMaks = 101.41,
  skor = 0,
  tingkat = 'rendah',
  waktuUpdate = new Date()
} = {}) {
  // Geser sequence agar id petak uji tidak bentrok dengan id eksplisit dari seed.
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
