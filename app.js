// ===== MASJIDKU CONFIG =====
const API_URL = 'https://api.base44.app/api/apps/6a55fcc9d4e788c46bb90341/functions/masjidApi';
const POLL_MS = 5000;

// ===== STATE =====
let isAdmin = false;
let adminPin = null;
let profil = { nama: 'Masjidku', alamat: '', marbot: '', qr_donasi: '' };
let jadwal = [];
let infaq = [];
let pengeluaran = [];
let rekap = null;

// ===== UTIL =====
const rupiah = n => 'Rp ' + (Number(n) || 0).toLocaleString('id-ID');
const $ = id => document.getElementById(id);

const NAMA_BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const NAMA_HARI = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];

function formatTanggal(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return NAMA_HARI[d.getDay()] + ', ' + d.getDate() + ' ' + NAMA_BULAN[d.getMonth()] + ' ' + d.getFullYear();
}
function tanggalPendek(iso) {
  if (!iso) return { tgl: '-', bln: '' };
  const d = new Date(iso + 'T00:00:00');
  return { tgl: d.getDate(), bln: NAMA_BULAN[d.getMonth()].substring(0, 3) };
}
function jumatTerdekat() {
  const d = new Date();
  const hari = d.getDay();
  const tambah = (5 - hari + 7) % 7;
  d.setDate(d.getDate() + tambah);
  return d.toISOString().slice(0, 10);
}
function isoHariIni() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// ===== API =====
async function api(action, payload = {}) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload })
  });
  return res.json();
}

function toast(pesan) {
  const t = $('toast');
  t.textContent = pesan;
  t.classList.remove('hidden');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add('hidden'), 2600);
}

// ===== LOAD DATA =====
async function loadData() {
  try {
    const [p, j, i, g, r] = await Promise.all([
      api('get_profil'), api('get_jadwal'), api('get_infaq'),
      api('get_pengeluaran'), api('rekap')
    ]);
    if (p.ok) profil = p.profil;
    if (j.ok) jadwal = j.jadwal || [];
    if (i.ok) infaq = i.infaq || [];
    if (g.ok) pengeluaran = g.pengeluaran || [];
    if (r.ok) rekap = r.rekap;
    renderAll();
  } catch (e) { console.error('loadData error', e); }
}

function renderAll() {
  renderHeader();
  renderJumatIni();
  renderRingkasan();
  renderJadwal();
  renderInfaq();
  renderPengeluaran();
  renderRekap();
  renderAdmin();
}

// ===== RENDER =====
function renderHeader() {
  $('header-nama').textContent = profil.nama || 'Masjidku';
  $('header-alamat').textContent = profil.alamat || 'Tata Kelola Keuangan & Jadwal Jumat';
  $('info-nama').textContent = profil.nama || '—';
  $('info-marbot').textContent = profil.marbot || '—';
  $('info-alamat').textContent = profil.alamat || '—';
  const adaQR = !!profil.qr_donasi;
  $('kartu-qr').classList.toggle('hidden', !adaQR);
  if (adaQR) $('qr-img').src = profil.qr_donasi;
}

function renderJumatIni() {
  const hariIni = isoHariIni();
  const upcoming = jadwal.filter(j => j.tanggal >= hariIni).sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  const aktif = upcoming[0];
  const el = $('jumat-ini');
  if (!aktif) {
    el.innerHTML = '<p class="empty">Belum ada jadwal. Admin dapat menambahkannya di tab Jadwal.</p>';
    return;
  }
  el.innerHTML = `
    <div class="jumat-headline">
      <div class="tgl">✨ ${formatTanggal(aktif.tanggal)}</div>
      <div class="pasangan">
        <span class="peran">🕌 Imam: ${esc(aktif.imam)}</span><br/>
        <span class="peran">📖 Khotib: ${esc(aktif.khotib)}</span>
      </div>
      ${aktif.pengumuman ? `<div class="umum">📢 ${esc(aktif.pengumuman)}</div>` : ''}
    </div>`;
}

function renderRingkasan() {
  if (!rekap) return;
  $('info-infaq').textContent = rupiah(rekap.total_infaq);
  $('info-shodaqoh').textContent = rupiah(rekap.total_shodaqoh);
  $('info-pengeluaran').textContent = '-' + rupiah(rekap.total_pengeluaran);
  const saldo = $('info-saldo');
  saldo.textContent = rupiah(rekap.saldo);
  saldo.classList.toggle('red', rekap.saldo < 0);
  const parts = [];
  if (rekap.jumlah_jumat > 0) parts.push(rekap.jumlah_jumat + ' Jumat tercatat');
  if (rekap.jumlah_pengeluaran > 0) parts.push(rekap.jumlah_pengeluaran + ' pengeluaran');
  $('info-jumlah-jumat').textContent = parts.length ? parts.join(' · ') : 'Belum ada catatan';
}

function renderJadwal() {
  const el = $('list-jadwal');
  if (!jadwal.length) { el.innerHTML = '<p class="empty">Belum ada jadwal.</p>'; return; }
  const hariIni = isoHariIni();
  el.innerHTML = jadwal.map(j => {
    const c = tanggalPendek(j.tanggal);
    const baru = j.tanggal >= hariIni;
    return `
      <div class="list-item" style="${baru ? '' : 'opacity:.55'}">
        <div class="date-chip"><span class="d">${c.tgl}</span>${c.bln}</div>
        <div class="isi">
          <div class="judul">${formatTanggal(j.tanggal)}</div>
          <div class="detail">🕌 Imam: ${esc(j.imam)} &nbsp;·&nbsp; 📖 Khotib: ${esc(j.khotib)}</div>
          ${j.pengumuman ? `<div class="detail">📢 ${esc(j.pengumuman)}</div>` : ''}
        </div>
        ${isAdmin ? `<button class="btn-hapus" onclick="hapusJadwal('${j.id}')" title="Hapus">🗑️</button>` : ''}
      </div>`;
  }).join('');
}

function renderInfaq() {
  const el = $('list-infaq');
  if (!infaq.length) { el.innerHTML = '<p class="empty">Belum ada catatan pendapatan Jumat.</p>'; return; }
  el.innerHTML = infaq.map(r => {
    const c = tanggalPendek(r.tanggal);
    return `
      <div class="list-item">
        <div class="date-chip"><span class="d">${c.tgl}</span>${c.bln}</div>
        <div class="isi">
          <div class="judul">${formatTanggal(r.tanggal)}</div>
          <div class="detail">Infaq: ${rupiah(r.infaq)} · Shodaqoh: ${rupiah(r.shodaqoh)}</div>
          ${r.catatan ? `<div class="detail">📝 ${esc(r.catatan)}</div>` : ''}
        </div>
        <div class="nominal">${rupiah((Number(r.infaq) || 0) + (Number(r.shodaqoh) || 0))}
          <span class="sub">total</span>
        </div>
        ${isAdmin ? `<button class="btn-hapus" onclick="hapusInfaq('${r.id}')" title="Hapus">🗑️</button>` : ''}
      </div>`;
  }).join('');
}

function renderPengeluaran() {
  const el = $('list-pengeluaran');
  if (!pengeluaran.length) { el.innerHTML = '<p class="empty">Belum ada catatan pengeluaran.</p>'; return; }
  el.innerHTML = pengeluaran.map(r => {
    const c = tanggalPendek(r.tanggal);
    return `
      <div class="list-item">
        <div class="date-chip"><span class="d">${c.tgl}</span>${c.bln}</div>
        <div class="isi">
          <div class="judul">${esc(r.kategori)}</div>
          <div class="detail">${formatTanggal(r.tanggal)}</div>
          ${r.keterangan ? `<div class="detail">📝 ${esc(r.keterangan)}</div>` : ''}
        </div>
        <div class="nominal red">${'-' + rupiah(r.nominal)}</div>
        ${isAdmin ? `<button class="btn-hapus" onclick="hapusPengeluaran('${r.id}')" title="Hapus">🗑️</button>` : ''}
      </div>`;
  }).join('');
}

function renderRekap() {
  const el = $('rekap-bulanan');
  if (!rekap || !rekap.per_bulan || Object.keys(rekap.per_bulan).length === 0) {
    el.innerHTML = '<p class="empty">Belum ada data rekap.</p>'; return;
  }
  const bulan = Object.keys(rekap.per_bulan).sort().reverse();
  const max = Math.max(...bulan.map(b => {
    const d = rekap.per_bulan[b];
    return d.infaq + d.shodaqoh + d.pengeluaran;
  }), 1);
  el.innerHTML = bulan.map(b => {
    const d = rekap.per_bulan[b];
    const masuk = d.infaq + d.shodaqoh;
    const [th, bl] = b.split('-');
    const namaBulan = NAMA_BULAN[parseInt(bl, 10) - 1] + ' ' + th;
    const saldoBulan = masuk - d.pengeluaran;
    return `
      <div class="bar-row">
        <div class="bar-label"><span>${namaBulan}</span><span>${rupiah(saldoBulan)}</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${(masuk / max * 100).toFixed(1)}%"></div></div>
        <div class="bar-track expense-track"><div class="bar-fill expense-fill" style="width:${(d.pengeluaran / max * 100).toFixed(1)}%"></div></div>
        <div class="bar-split">
          <span>Infaq <b>${rupiah(d.infaq)}</b></span>
          <span>Shodaqoh <b>${rupiah(d.shodaqoh)}</b></span>
          <span>Pengeluaran <b class="red-text">${rupiah(d.pengeluaran)}</b></span>
        </div>
      </div>`;
  }).join('');
}

function renderAdmin() {
  $('card-login').classList.toggle('hidden', isAdmin);
  $('admin-panel').classList.toggle('hidden', !isAdmin);
  document.querySelectorAll('.admin-form').forEach(f => f.classList.toggle('hidden', !isAdmin));
  if (isAdmin) {
    $('set-nama').value = profil.nama || '';
    $('set-alamat').value = profil.alamat || '';
    $('set-marbot').value = profil.marbot || '';
    if (profil.qr_donasi) {
      $('qr-preview-wrap').classList.remove('hidden');
      $('qr-preview').src = profil.qr_donasi;
    } else {
      $('qr-preview-wrap').classList.add('hidden');
    }
  }
}

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

// ===== AKSI ADMIN =====
async function loginAdmin() {
  const pin = $('pin-input').value.trim();
  if (!pin) return;
  const res = await api('login', { pin });
  if (res.ok) {
    isAdmin = true;
    adminPin = pin;
    $('login-error').classList.add('hidden');
    $('pin-input').value = '';
    toast('✅ Berhasil masuk sebagai Admin');
    renderAll();
  } else {
    $('login-error').classList.remove('hidden');
  }
}

function logoutAdmin() {
  isAdmin = false;
  adminPin = null;
  toast('👋 Keluar dari mode Admin');
  renderAll();
}

async function simpanProfil() {
  const data = {
    pin: adminPin,
    nama: $('set-nama').value.trim(),
    alamat: $('set-alamat').value.trim(),
    marbot: $('set-marbot').value.trim()
  };
  const pinBaru = $('set-pin-baru').value.trim();
  if (pinBaru) data.pin_baru = pinBaru;
  const res = await api('save_profil', data);
  if (res.ok) {
    if (pinBaru) { adminPin = pinBaru; $('set-pin-baru').value = ''; }
    toast('✅ ' + res.pesan);
    await loadData();
  } else toast('❌ ' + (res.pesan || 'Gagal menyimpan'));
}

async function simpanJadwal() {
  const data = {
    pin: adminPin,
    tanggal: $('jdwl-tanggal').value,
    imam: $('jdwl-imam').value.trim(),
    khotib: $('jdwl-khotib').value.trim(),
    pengumuman: $('jdwl-pengumuman').value.trim()
  };
  if (!data.tanggal || !data.imam || !data.khotib) { toast('⚠️ Tanggal, Imam, dan Khotib wajib diisi'); return; }
  const res = await api('add_jadwal', data);
  if (res.ok) {
    $('jdwl-imam').value = '';
    $('jdwl-khotib').value = '';
    $('jdwl-pengumuman').value = '';
    toast('✅ ' + res.pesan);
    await loadData();
  } else toast('❌ ' + (res.pesan || 'Gagal menyimpan'));
}

async function hapusJadwal(id) {
  const res = await api('delete_jadwal', { pin: adminPin, id });
  if (res.ok) { toast('🗑️ ' + res.pesan); await loadData(); }
  else toast('❌ ' + (res.pesan || 'Gagal menghapus'));
}

async function simpanInfaq() {
  const data = {
    pin: adminPin,
    tanggal: $('infaq-tanggal').value,
    infaq: $('infaq-nominal').value,
    shodaqoh: $('shodaqoh-nominal').value,
    catatan: $('infaq-catatan').value.trim()
  };
  if (!data.tanggal) { toast('⚠️ Tanggal wajib diisi'); return; }
  const res = await api('add_infaq', data);
  if (res.ok) {
    $('infaq-nominal').value = '';
    $('shodaqoh-nominal').value = '';
    $('infaq-catatan').value = '';
    toast('✅ ' + res.pesan);
    await loadData();
  } else toast('❌ ' + (res.pesan || 'Gagal menyimpan'));
}

async function hapusInfaq(id) {
  const res = await api('delete_infaq', { pin: adminPin, id });
  if (res.ok) { toast('🗑️ ' + res.pesan); await loadData(); }
  else toast('❌ ' + (res.pesan || 'Gagal menghapus'));
}

async function simpanPengeluaran() {
  const data = {
    pin: adminPin,
    tanggal: $('peng-tanggal').value,
    kategori: $('peng-kategori').value,
    keterangan: $('peng-keterangan').value.trim(),
    nominal: $('peng-nominal').value
  };
  if (!data.tanggal || !data.nominal) { toast('⚠️ Tanggal dan nominal wajib diisi'); return; }
  const res = await api('add_pengeluaran', data);
  if (res.ok) {
    $('peng-keterangan').value = '';
    $('peng-nominal').value = '';
    toast('✅ ' + res.pesan);
    await loadData();
  } else toast('❌ ' + (res.pesan || 'Gagal menyimpan'));
}

async function hapusPengeluaran(id) {
  const res = await api('delete_pengeluaran', { pin: adminPin, id });
  if (res.ok) { toast('🗑️ ' + res.pesan); await loadData(); }
  else toast('❌ ' + (res.pesan || 'Gagal menghapus'));
}

// ===== QR DONASI =====
let qrDataUrl = null;

$('qr-file').addEventListener('change', function () {
  const file = this.files && this.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      // Resize maks 500px, simpan sebagai PNG biar QR tetap tajam
      const max = 500;
      let w = img.width, h = img.height;
      if (w > max || h > max) {
        const ratio = Math.min(max / w, max / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      qrDataUrl = canvas.toDataURL('image/png');
      $('qr-preview-wrap').classList.remove('hidden');
      $('qr-preview').src = qrDataUrl;
      toast('📷 QR siap disimpan');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
});

async function simpanQR() {
  const qr = qrDataUrl || profil.qr_donasi;
  if (!qr) { toast('⚠️ Pilih gambar QR dulu'); return; }
  const res = await api('set_qr_donasi', { pin: adminPin, qr_donasi: qr });
  if (res.ok) { toast('✅ ' + res.pesan); qrDataUrl = null; await loadData(); }
  else toast('❌ ' + (res.pesan || 'Gagal menyimpan QR'));
}

async function hapusQR() {
  const res = await api('set_qr_donasi', { pin: adminPin, qr_donasi: '' });
  if (res.ok) {
    toast('🗑️ ' + res.pesan);
    qrDataUrl = null;
    $('qr-file').value = '';
    $('qr-preview-wrap').classList.add('hidden');
    await loadData();
  } else toast('❌ ' + (res.pesan || 'Gagal menghapus'));
}

// ===== PDF LAPORAN =====
async function unduhPDF() {
  toast('⏳ Menyiapkan PDF...');
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  let y = 15;
  const garis = () => { doc.setDrawColor(180); doc.line(14, y, 196, y); y += 6; };

  // Header
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
  doc.text(String(profil.nama || 'Masjidku'), 14, y); y += 7;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(100);
  if (profil.alamat) { doc.text(String(profil.alamat), 14, y); y += 5; }
  doc.text('Laporan Keuangan Masjid — Infaq, Shodaqoh Jumat & Pengeluaran', 14, y); y += 5;
  doc.text('Dicetak: ' + new Date().toLocaleString('id-ID'), 14, y); y += 4;
  doc.setTextColor(0);
  garis();

  // Section: Pendapatan
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  doc.text('A. Pendapatan Infaq & Shodaqoh Jumat', 14, y); y += 6;
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text('Tanggal', 16, y); doc.text('Infaq', 80, y, { align: 'right' });
  doc.text('Shodaqoh', 130, y, { align: 'right' }); doc.text('Total', 182, y, { align: 'right' });
  y += 4; garis();
  if (!infaq.length) { doc.text('(belum ada catatan)', 16, y); y += 6; }
  for (const r of infaq) {
    if (y > 275) { doc.addPage(); y = 15; }
    doc.text(String(r.tanggal), 16, y);
    doc.text(rupiah(r.infaq), 80, y, { align: 'right' });
    doc.text(rupiah(r.shodaqoh), 130, y, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(rupiah((Number(r.infaq) || 0) + (Number(r.shodaqoh) || 0)), 182, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    y += 5;
  }
  if (infaq.length) { garis(); }

  y += 4;
  if (y > 260) { doc.addPage(); y = 15; }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  doc.text('B. Pengeluaran', 14, y); y += 6;
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text('Tanggal', 16, y); doc.text('Kategori', 40, y);
  doc.text('Keterangan', 80, y); doc.text('Nominal', 182, y, { align: 'right' });
  y += 4; garis();
  if (!pengeluaran.length) { doc.text('(belum ada catatan)', 16, y); y += 6; }
  for (const r of pengeluaran) {
    if (y > 275) { doc.addPage(); y = 15; }
    doc.text(String(r.tanggal), 16, y);
    doc.text(String(r.kategori || '-').substring(0, 18), 40, y);
    doc.text(String(r.keterangan || '-').substring(0, 38), 80, y);
    doc.text(rupiah(r.nominal), 182, y, { align: 'right' });
    y += 5;
  }
  if (pengeluaran.length) { garis(); }

  // Ringkasan
  y += 4;
  if (y > 240) { doc.addPage(); y = 15; }
  if (rekap) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text('C. Ringkasan', 14, y); y += 6;
    doc.setFontSize(10);
    const rows = [
      ['Total Infaq', rekap.total_infaq],
      ['Total Shodaqoh', rekap.total_shodaqoh],
      ['Total Pendapatan', rekap.total_pendapatan],
      ['Total Pengeluaran', rekap.total_pengeluaran],
      ['Saldo Kas Masjid', rekap.saldo]
    ];
    for (const [label, val] of rows) {
      if (y > 275) { doc.addPage(); y = 15; }
      const bold = label === 'Saldo Kas Masjid' || label === 'Total Pendapatan';
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.text(label, 16, y);
      doc.text(rupiah(val), 182, y, { align: 'right' });
      y += 5.5;
    }
  }

  // Footer di tiap halaman
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(130);
    doc.text('Dibuat otomatis oleh Masjidku — ' + (profil.nama || 'Masjidku'), 14, 288);
    doc.text('Halaman ' + p + '/' + total, 182, 288, { align: 'right' });
    doc.setTextColor(0);
  }

  const namaFile = 'Laporan_Keuangan_' + (profil.nama || 'Masjidku').replace(/\s+/g, '_') + '_' + isoHariIni() + '.pdf';
  doc.save(namaFile);
  toast('📄 PDF berhasil diunduh');
}

// ===== TABS =====
function showTab(nama, btn) {
  document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
  $('tab-' + nama).classList.add('active');
  btn.classList.add('active');
  btn.setAttribute('aria-selected', 'true');
  $('jdwl-tanggal').value = jumatTerdekat();
  $('infaq-tanggal').value = jumatTerdekat();
  $('peng-tanggal').value = isoHariIni();
}

// ===== INIT =====
window.onload = async () => {
  $('jdwl-tanggal').value = jumatTerdekat();
  $('infaq-tanggal').value = jumatTerdekat();
  $('peng-tanggal').value = isoHariIni();
  await loadData();
  $('loading-screen').classList.add('hidden');
  // Real-time: sinkron tiap 5 detik
  setInterval(async () => {
    if (document.hidden) return;
    await loadData();
  }, POLL_MS);
};
