import { spawn, execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(SCRIPT_DIR, '..');
const ROOT = path.resolve(SRC, '..');
const BUKTI = path.join(ROOT, 'docs/M10/assets/bukti');
const CHROME_PROFILE = path.join(os.tmpdir(), `sigap-m10-knf-${process.pid}`);
const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;
const CDP_PORT = 9223;

function cariChrome() {
  const kandidat = [
    process.env.CHROME_BIN,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser'
  ].filter(Boolean);
  const ditemukan = kandidat.find((p) => existsSync(p));
  if (!ditemukan) {
    throw new Error('Google Chrome/Chromium tidak ditemukan; atur env CHROME_BIN bila perlu.');
  }
  return ditemukan;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function jalankanSeed() {
  execFileSync('node', ['--env-file=.env', 'sql/seed.js'], { cwd: SRC, stdio: 'pipe' });
}

function jalankanServer() {
  const proses = spawn('node', ['--env-file=.env', 'server.js'], {
    cwd: SRC,
    env: { ...process.env, PORT: String(PORT) }
  });
  return new Promise((resolve, reject) => {
    let errLog = '';
    proses.stderr.on('data', (d) => { errLog += String(d); });
    proses.stdout.on('data', (d) => {
      if (String(d).includes('berjalan')) resolve(proses);
    });
    proses.on('exit', (code) => reject(new Error(`Server keluar (${code}): ${errLog}`)));
  });
}

async function jalankanChrome() {
  const chromeBin = cariChrome();
  await rm(CHROME_PROFILE, { recursive: true, force: true });
  const proses = spawn(chromeBin, [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${CHROME_PROFILE}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=412,892',
    'about:blank'
  ], { stdio: 'ignore' });

  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
      const pages = await res.json();
      const page = pages.find((p) => p.type === 'page');
      if (page?.webSocketDebuggerUrl) {
        return { proses, wsUrl: page.webSocketDebuggerUrl };
      }
    } catch {}
    await sleep(150);
  }
  proses.kill();
  throw new Error('Gagal terhubung ke CDP Chrome');
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve);
      this.ws.addEventListener('error', reject);
    });
    this.ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(String(ev.data));
      if (msg.id) {
        const p = this.pending.get(msg.id);
        if (p) {
          this.pending.delete(msg.id);
          if (msg.error) p.reject(new Error(`${msg.error.code}: ${msg.error.message}`));
          else p.resolve(msg.result);
        }
      } else if (msg.method) {
        const list = this.listeners.get(msg.method);
        if (list) {
          for (const fn of [...list]) fn(msg.params);
        }
      }
    });
  }

  async init() {
    await this.ready;
    await this.send('Page.enable');
    await this.send('Runtime.enable');
    await this.send('DOM.enable');
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  once(method, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      const set = this.listeners.get(method) || new Set();
      const timer = setTimeout(() => {
        set.delete(handler);
        reject(new Error(`Timeout menunggu event CDP: ${method}`));
      }, timeoutMs);
      const handler = (params) => {
        clearTimeout(timer);
        set.delete(handler);
        resolve(params);
      };
      set.add(handler);
      this.listeners.set(method, set);
    });
  }

  async eval(expr) {
    const res = await this.send('Runtime.evaluate', {
      expression: expr,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true
    });
    if (res.exceptionDetails) {
      throw new Error(`Eval error: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result?.value;
  }

  async waitFor(fnExpr, timeout = 15000) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const ok = await this.eval(`Boolean((${fnExpr})())`).catch(() => false);
      if (ok) return;
      await sleep(50);
    }
    throw new Error(`Timeout menunggu kondisi: ${fnExpr}`);
  }

  async navigate(url) {
    const loaded = this.once('Page.loadEventFired');
    await this.send('Page.navigate', { url });
    await loaded;
  }

  async screenshot(filePath) {
    const { data } = await this.send('Page.captureScreenshot', { format: 'png' });
    await writeFile(filePath, Buffer.from(data, 'base64'));
  }

  close() {
    this.ws.close();
  }
}

function hitungKontrasRgbStr(fgStr, bgStr) {
  const parse = (s) => s.match(/\d+/g).slice(0, 3).map(Number);
  const luminansi = ([r, g, b]) => {
    const f = (c) => {
      const u = c / 255;
      return u <= 0.03928 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const l1 = luminansi(parse(fgStr));
  const l2 = luminansi(parse(bgStr));
  return Math.round(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) * 100) / 100;
}

await mkdir(BUKTI, { recursive: true });
jalankanSeed();

const server = await jalankanServer();
let chromeProc = null;
let cdp = null;

try {
  // =========================================================================
  // 1. KNF07 Availability - Probe lokal 30x + justifikasi & batasan Render Free
  // =========================================================================
  const loginRes = await fetch(`${BASE_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'petugas1', password: 'sigap12345' })
  });
  if (!loginRes.ok) {
    throw new Error(`Login probe KNF07 gagal: ${loginRes.status}`);
  }
  const { token } = await loginRes.json();

  const daftarProbe = [
    { jalur: '/petugas/', butuhAuth: false },
    { jalur: '/api/peta', butuhAuth: true },
    { jalur: '/petugas/jadwal.html', butuhAuth: false },
    { jalur: '/api/jadwal/form', butuhAuth: true }
  ];
  const hasilProbe = [];
  for (let i = 0; i < 30; i++) {
    const target = daftarProbe[i % daftarProbe.length];
    const t0 = performance.now();
    const res = await fetch(BASE_URL + target.jalur, {
      headers: target.butuhAuth ? { Authorization: 'Bearer ' + token } : {}
    });
    await res.arrayBuffer();
    const ms = Math.round((performance.now() - t0) * 10) / 10;
    hasilProbe.push({ no: i + 1, jalur: target.jalur, status: res.status, ms });
  }

  const suksesProbe = hasilProbe.filter((p) => p.status === 200).length;
  const rataProbe = Math.round((hasilProbe.reduce((s, p) => s + p.ms, 0) / hasilProbe.length) * 10) / 10;
  const maksProbe = Math.max(...hasilProbe.map((p) => p.ms));

  const laporanKNF07 = [
    'KNF07-TC01 Availability platform peta dan penugasan selama sesi pengujian',
    `Waktu        : ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`,
    'Metode       : Skrip otomatis src/scripts/ukur-knf.js (30 permintaan HTTP terhadap server lokal http://localhost:3000)',
    'Target       : Platform peta dan penugasan dapat diakses tanpa gangguan selama sesi pengujian dan demo tugas besar',
    '',
    '1. Batasan Lingkungan dan Justifikasi',
    '   - Sesuai SKPL Tabel 3.2, KNF07 menuntut ketersediaan penuh selama sesi pengujian dan demo tugas besar.',
    '   - Pengukuran berikut dijalankan terhadap server lokal selama sesi pengujian M10.',
    '   - Ketersediaan penuh saat demo produksi di Render belum dapat diukur karena sesi demo tugas besar belum berlangsung',
    '     dan layanan hosting memakai Render paket Free (server tidur setelah 15 menit tanpa permintaan dengan cold start ~1 menit).',
    '   - Mitigasi yang disiapkan untuk demo:',
    '     (a) Memanaskan URL produksi sebelum sesi pengujian/demo dimulai.',
    '     (b) Memisahkan basis data PostgreSQL ke Neon agar data tetap persisten.',
    '     (c) Menyimpan aset Leaflet dan font Inter secara lokal di src/public/vendor/ agar tidak bergantung CDN.',
    '',
    '2. Hasil Aktual pada Lingkungan Lokal (30 permintaan ke endpoint peta & penugasan)',
    '   - Endpoint        : /petugas/, /api/peta, /petugas/jadwal.html, /api/jadwal/form',
    `   - Sukses HTTP 200 : ${suksesProbe}/30 (${Math.round((suksesProbe / 30) * 100)}%)`,
    `   - Galat 4xx/5xx   : ${30 - suksesProbe}`,
    `   - Rata-rata waktu : ${rataProbe} ms`,
    `   - Maksimum waktu  : ${maksProbe} ms`,
    '',
    `Kesimpulan   : ${suksesProbe === 30 ? 'Teruji pada lingkungan lokal selama sesi pengujian (30/30 HTTP 200); ketersediaan saat demo produksi di Render belum terukur (disertai justifikasi dan mitigasi)' : 'Fail pada lingkungan lokal'}`
  ].join('\n');
  await writeFile(path.join(BUKTI, 'hasil-tes-knf07-justifikasi.txt'), laporanKNF07 + '\n');
  console.log(`KNF07 selesai: ${suksesProbe}/30 HTTP 200 (rata-rata ${rataProbe} ms, maks ${maksProbe} ms)`);

  // =========================================================================
  // 2. KNF08 Ergonomy (Chrome CDP, mobile 412x892 dp, DPR 2) pada I-06 Form Laporan
  // =========================================================================
  const chrome = await jalankanChrome();
  chromeProc = chrome.proses;
  cdp = new CDPClient(chrome.wsUrl);
  await cdp.init();

  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 412,
    height: 892,
    deviceScaleFactor: 2,
    mobile: true
  });
  await cdp.send('Browser.grantPermissions', {
    origin: BASE_URL,
    permissions: ['geolocation']
  });
  await cdp.send('Emulation.setGeolocationOverride', {
    latitude: -0.515,
    longitude: 101.445,
    accuracy: 10
  });

  await cdp.navigate(`${BASE_URL}/relawan/login.html`);
  await cdp.waitFor(`() => document.querySelector('#username') && document.querySelector('#password')`);
  await cdp.eval(`(() => {
    const u = document.getElementById('username');
    const p = document.getElementById('password');
    u.value = 'relawan1';
    u.dispatchEvent(new Event('input', { bubbles: true }));
    p.value = 'sigap12345';
    p.dispatchEvent(new Event('input', { bubbles: true }));
    document.getElementById('tombol-masuk').click();
  })()`);
  await cdp.waitFor(`() => location.pathname === '/relawan/' && document.querySelectorAll('#daftar-tugas .baris-tugas').length >= 1`);

  await cdp.eval(`(() => {
    const tombol = [...document.querySelectorAll('#daftar-tugas .baris-tugas')]
      .find((b) => b.textContent.includes('Petak 233'));
    if (!tombol) throw new Error('Tugas Petak 233 tidak ditemukan');
    tombol.click();
  })()`);
  await cdp.waitFor(`() => !document.getElementById('tombol-buat-laporan').hidden`);
  await cdp.eval(`document.getElementById('tombol-buat-laporan').click()`);
  await cdp.waitFor(`() => location.pathname === '/relawan/laporan.html' && !document.querySelector('[data-layar="form"]').hidden && !document.getElementById('lokasi-ada').hidden`);
  await sleep(200);

  const urlFormLaporan = await cdp.eval('location.href');
  const ukurAwal = await cdp.eval(`(() => {
    const rAmbil = document.getElementById('tombol-ambil-foto').getBoundingClientRect();
    const csDisabled = getComputedStyle(document.getElementById('tombol-kirim'));
    return {
      ambilFoto: { w: Math.round(rAmbil.width), h: Math.round(rAmbil.height) },
      kirimDisabled: { color: csDisabled.color, bg: csDisabled.backgroundColor }
    };
  })()`);

  // Unggah foto contoh via file chooser / input file nyata agar alur kompresi & pratinjau berjalan utuh
  await cdp.send('Page.setInterceptFileChooserDialog', { enabled: true });
  const btnPos = await cdp.eval(`(() => {
    const r = document.getElementById('tombol-ambil-foto').getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  })()`);
  const chooserPromise = cdp.once('Page.fileChooserIntercepted', 5000).catch(() => null);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: btnPos.x, y: btnPos.y, button: 'left', clickCount: 1 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: btnPos.x, y: btnPos.y, button: 'left', clickCount: 1 });
  const chooser = await chooserPromise;
  const fotoFile = path.join(SRC, 'sql/data/foto-contoh.jpg');
  if (chooser?.backendNodeId) {
    await cdp.send('DOM.setFileInputFiles', { backendNodeId: chooser.backendNodeId, files: [fotoFile] });
  } else {
    const doc = await cdp.send('DOM.getDocument', { depth: -1 });
    const { nodeId: inputFotoNode } = await cdp.send('DOM.querySelector', {
      nodeId: doc.root.nodeId,
      selector: '#input-foto'
    });
    await cdp.send('DOM.setFileInputFiles', { nodeId: inputFotoNode, files: [fotoFile] });
  }
  await cdp.send('Page.setInterceptFileChooserDialog', { enabled: false });
  await cdp.waitFor(`() => !document.getElementById('pratinjau-foto').hidden && !document.getElementById('tombol-kirim').disabled`);
  await sleep(250);

  await cdp.screenshot(path.join(BUKTI, 'knf08-tc01a-form-laporan-mobile.png'));

  const ukurErgonomi = await cdp.eval(`(() => {
    function parseRgb(str) {
      const m = str.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)(?:,\\s*([\\d.]+))?\\)/);
      if (!m) return { r: 0, g: 0, b: 0, a: 1 };
      return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]), a: m[4] === undefined ? 1 : Number(m[4]) };
    }
    function efektifBg(el) {
      let cur = el;
      while (cur) {
        const bg = parseRgb(getComputedStyle(cur).backgroundColor);
        if (bg.a > 0.1) return bg;
        cur = cur.parentElement;
      }
      return { r: 255, g: 255, b: 255, a: 1 };
    }
    function lum({ r, g, b }) {
      const f = (c) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    }
    function kontras(fg, bg) {
      const l1 = lum(fg), l2 = lum(bg);
      return Math.round(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) * 100) / 100;
    }
    function cekKontras(label, el) {
      const cs = getComputedStyle(el);
      const fg = parseRgb(cs.color);
      const bg = efektifBg(el);
      return { label, ratio: kontras(fg, bg) };
    }

    const vh = window.innerHeight;
    const batas40 = Math.round(vh * 0.6 * 10) / 10;
    const rect = (sel) => {
      const r = document.querySelector(sel).getBoundingClientRect();
      return {
        x: Math.round(r.left),
        y: Math.round(r.top),
        w: Math.round(r.width),
        h: Math.round(r.height),
        bottom: Math.round(r.bottom)
      };
    };

    const targetSentuh = [
      { nama: 'Tombol kembali (< Tugas)', ...rect('.tombol-teks') },
      { nama: 'Tombol ambil ulang foto', ...rect('#tombol-ulang-foto') },
      { nama: 'Tombol kirim laporan', ...rect('#tombol-kirim') }
    ];

    const kontrasDaftar = [
      cekKontras('Judul halaman (h1.teks-judul)', document.querySelector('.teks-judul')),
      cekKontras('Subjudul tugas (#judul-tugas)', document.getElementById('judul-tugas')),
      cekKontras('Label keterangan (.keterangan)', document.querySelector('.keterangan')),
      cekKontras('Koordinat GPS (#teks-koordinat)', document.getElementById('teks-koordinat')),
      cekKontras('Info catatan (#info-foto)', document.getElementById('info-foto')),
      cekKontras('Tombol kirim aktif (#tombol-kirim)', document.getElementById('tombol-kirim')),
      cekKontras('Tombol ambil ulang foto (#tombol-ulang-foto)', document.getElementById('tombol-ulang-foto')),
      cekKontras('Pesan penyimpanan penuh (#pesan-penuh)', document.getElementById('pesan-penuh'))
    ];

    return { vh, batas40, targetSentuh, kontrasDaftar };
  })()`);

  const rasioDisabled = hitungKontrasRgbStr(ukurAwal.kirimDisabled.color, ukurAwal.kirimDisabled.bg);
  const kirimRect = ukurErgonomi.targetSentuh.find((t) => t.nama === 'Tombol kirim laporan');
  const dalam40Bawah = kirimRect.y >= ukurErgonomi.batas40 && kirimRect.bottom <= ukurErgonomi.vh;
  const semuaSentuhOk =
    ukurAwal.ambilFoto.w >= 48 &&
    ukurAwal.ambilFoto.h >= 48 &&
    ukurErgonomi.targetSentuh.every((t) => t.w >= 48 && t.h >= 48);
  const semuaKontrasOk =
    rasioDisabled >= 4.5 &&
    ukurErgonomi.kontrasDaftar.every((k) => k.ratio >= 4.5);

  const hasilKNF08 = [
    'KNF08-TC01 Ergonomy antarmuka pengisian laporan relawan (I-06)',
    `Waktu        : ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`,
    'Metode       : Skrip otomatis src/scripts/ukur-knf.js (Google Chrome CDP, emulasi mobile 412 x 892 dp, DPR 2)',
    `Halaman      : ${urlFormLaporan}`,
    '',
    '1. Posisi tombol aksi utama di 40% bagian bawah layar (operasi satu tangan)',
    `   - Tinggi viewport      : ${ukurErgonomi.vh} dp`,
    `   - Batas atas zona 40%  : y >= ${ukurErgonomi.batas40} dp (60% dari atas)`,
    `   - Posisi #tombol-kirim : y = ${kirimRect.y} dp s.d. ${kirimRect.bottom} dp`,
    `   - Hasil                : ${dalam40Bawah ? 'Pass' : 'Fail'}`,
    '',
    '2. Ukuran target sentuh (target >= 48 x 48 dp)',
    `   - Tombol ambil foto (awal) : ${ukurAwal.ambilFoto.w} x ${ukurAwal.ambilFoto.h} dp (${ukurAwal.ambilFoto.w >= 48 && ukurAwal.ambilFoto.h >= 48 ? 'Pass' : 'Fail'})`,
    ...ukurErgonomi.targetSentuh.map(
      (t) => `   - ${t.nama.padEnd(25)}: ${t.w} x ${t.h} dp (${t.w >= 48 && t.h >= 48 ? 'Pass' : 'Fail'})`
    ),
    '',
    '3. Kontras teks terhadap latar (target WCAG AA >= 4,5 : 1)',
    ...ukurErgonomi.kontrasDaftar.map(
      (k) => `   - ${k.label.padEnd(43)}: ${k.ratio}:1 (${k.ratio >= 4.5 ? 'Pass' : 'Fail'})`
    ),
    `   - Tombol kirim nonaktif (#tombol-kirim:dis) : ${rasioDisabled}:1 (${rasioDisabled >= 4.5 ? 'Pass' : 'Fail'})`,
    '',
    `Kesimpulan   : ${dalam40Bawah && semuaSentuhOk && semuaKontrasOk ? 'Pass' : 'Fail'}`
  ].join('\n');
  await writeFile(path.join(BUKTI, 'hasil-tes-knf08-ergonomi.txt'), hasilKNF08 + '\n');

  await cdp.eval(`(() => {
    const batas = ${ukurErgonomi.batas40};
    const zona = document.createElement('div');
    zona.style.cssText = 'position:fixed;left:0;right:0;top:' + batas + 'px;bottom:0;border-top:2px dashed #0969da;background:rgba(9,105,218,0.08);pointer-events:none;z-index:9999;';
    const tag = document.createElement('div');
    tag.textContent = 'Zona 40% bawah (y >= ' + batas + ' dp) | #tombol-kirim: ${kirimRect.w}x${kirimRect.h} dp, y=${kirimRect.y}..${kirimRect.bottom} dp';
    tag.style.cssText = 'position:absolute;top:4px;left:8px;right:8px;font:600 11px/1.35 system-ui,sans-serif;color:#0550ae;background:rgba(255,255,255,0.92);padding:4px 8px;border-radius:6px;border:1px solid #0969da;';
    zona.append(tag);
    document.body.append(zona);
  })()`);
  await sleep(150);
  await cdp.screenshot(path.join(BUKTI, 'knf08-tc01b-pengukuran-ergonomi.png'));
  console.log(`KNF08 selesai: ${dalam40Bawah && semuaSentuhOk && semuaKontrasOk ? 'Pass' : 'Fail'}`);
} finally {
  cdp?.close();
  chromeProc?.kill();
  server?.kill();
  await rm(CHROME_PROFILE, { recursive: true, force: true }).catch(() => {});
  try {
    jalankanSeed();
  } catch {}
}
