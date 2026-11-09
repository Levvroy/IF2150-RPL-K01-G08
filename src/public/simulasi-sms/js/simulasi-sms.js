const daftar = document.getElementById('daftar');
const lokal = new Map(); // nomor -> balasan keluar yang sudah dikirim dari halaman ini
 
const jam = (s) => new Date(s).toLocaleString('id-ID', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
 
function el(tag, cls, teks) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (teks !== undefined) e.textContent = teks; // textContent: isi pesan tidak pernah jadi HTML
  return e;
}
 
function render(pesan) {
  daftar.replaceChildren();
  if (!pesan.length) { daftar.append(el('div', 'kosong', 'Belum ada SMS terkirim.')); return; }
  const perNomor = new Map();
  for (const p of pesan) { if (!perNomor.has(p.nomorHP)) perNomor.set(p.nomorHP, []); perNomor.get(p.nomorHP).push(p); }
  for (const [nomor, daftarPesan] of perNomor) {
    const g = el('section', 'grup');
    g.append(el('div', 'nomor', 'Ke ' + nomor));
    for (const p of daftarPesan.slice().reverse()) {
      const b = el('div', 'bubble', p.isiPesan);
      b.append(el('div', 'waktu', jam(p.waktuKirim)));
      g.append(b);
    }
    for (const balasan of lokal.get(nomor) ?? []) {
      const b = el('div', 'bubble out', balasan.teks);
      b.append(el('div', 'waktu', 'Terkirim ' + balasan.jam));
      g.append(b);
    }
    const f = document.createElement('form');
    const input = el('input'); input.placeholder = 'Pesan teks'; input.setAttribute('aria-label', 'Balasan untuk ' + nomor);
    const tombol = el('button', '', '↑'); tombol.disabled = true; tombol.setAttribute('aria-label', 'Kirim');
    input.addEventListener('input', () => { tombol.disabled = !input.value.trim(); });
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const teks = input.value.trim(); if (!teks) return;
      tombol.disabled = true;
      try {
        const r = await fetch('/api/simulasi-sms/balasan', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ nomorHP:nomor, isiBalasan:teks }) });
        if (!r.ok) throw new Error();
        const jamKirim = new Date().toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' });
        lokal.set(nomor, [...(lokal.get(nomor) ?? []), { teks, jam: jamKirim }]);
        render(pesan);
      } catch { tombol.disabled = false; alert('Balasan belum terkirim. Coba lagi.'); }
    });
    f.append(input, tombol); g.append(f); daftar.append(g);
  }
}
 
async function muat() {
  try { const r = await fetch('/api/simulasi-sms/pesan'); if (r.ok) render(await r.json()); } catch {}
}
muat(); setInterval(muat, 10000);
 