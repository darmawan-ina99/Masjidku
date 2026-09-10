// ===== MASJIDKU CONFIG =====
const API_URL = 'https://api.base44.app/api/apps/6a55fcc9d4e788c46bb90341/functions/masjidApi';
const POLL_MS = 5000;

// ===== STATE =====
let isAdmin = false;
let adminPin = null;
let profil = { nama: 'Masjidku', alamat: '', marbot: '' };
let jadwal = [];
let infaq = [];
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
  const hari = d.getDay(); // 5 = Jumat
  let tambah = (5 - hari + 7) % 7;
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
    const [p, j, i, r] = await Promise.all([
      api('get_profil'), api('get_jadwal'), api('get_infaq'), api('rekap')
    ]);
    if (p.ok) profil = p.profil;
    if (j.ok) jadwal = j.jadwal || [];
    if (i.ok) infaq = i.infaq || [];
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
}

function renderJumatIni() {
  const hariIni = isoHariIni();
  const upcoming = jadwal.filter(j => j.tanggal >= hariIni).sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  const aktif = upcoming[0];
  const el = $('jumat-ini');
  if (!aktif) {
    el.innerHTML = '<p class="empty">Belum ada jadwal. Admin dapat menambahkannya di tab Jadwal Jumat.</p>';
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
  $('info-total').textContent = rupiah(rekap.total_keseluruhan);
  $('info-jumlah-jumat').textContent = rekap.jumlah_jumat > 0
    ? 'Tercatat dari ' + rekap.jumlah_jumat + ' Jumat'
    : 'Belum ada catatan Jumat';
}

function renderJadwal() {
  const el = $('list-jadwal');
  if (!jadwal.length) { el.innerHTML = '<p class="empty">Belum ada jadwal. Admin dapat menambahkannya di sini.</p>'; return; }
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

function renderRekap() {
  const el = $('rekap-bulanan');
  if (!rekap || !rekap.per_bulan || Object.keys(rekap.per_bulan).length === 0) {
    el.innerHTML = '<p class="empty">Belum ada data rekap.</p>'; return;
  }
  const bulan = Object.keys(rekap.per_bulan).sort().reverse();
  const max = Math.max(...bulan.map(b => rekap.per_bulan[b].infaq + rekap.per_bulan[b].shodaqoh), 1);
  el.innerHTML = bulan.map(b => {
    const d = rekap.per_bulan[b];
    const total = d.infaq + d.shodaqoh;
    const [th, bl] = b.split('-');
    const namaBulan = NAMA_BULAN[parseInt(bl, 10) - 1] + ' ' + th;
    return `
      <div class="bar-row">
        <div class="bar-label"><span>${namaBulan}</span><span>${rupiah(total)}</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${(total / max * 100).toFixed(1)}%"></div></div>
        <div class="bar-split"><span>Infaq <b>${rupiah(d.infaq)}</b></span><span>Shodaqoh <b>${rupiah(d.shodaqoh)}</b></span></div>
      </div>`;
  }).join('');
}

function renderAdmin() {
  $('card-login').classList.toggle('hidden', isAdmin);
  $('card-setting').classList.toggle('hidden', !isAdmin);
  $('form-jadwal-admin').classList.toggle('hidden', !isAdmin);
  $('form-infaq-admin').classList.toggle('hidden', !isAdmin);
  if (isAdmin) {
    $('set-nama').value = profil.nama || '';
    $('set-alamat').value = profil.alamat || '';
    $('set-marbot').value = profil.marbot || '';
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
  } else {
    toast('❌ ' + (res.pesan || 'Gagal menyimpan'));
  }
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

// ===== TABS =====
function showTab(nama, btn) {
  document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
  $('tab-' + nama).classList.add('active');
  btn.classList.add('active');
  btn.setAttribute('aria-selected', 'true');
  $('jdwl-tanggal').value = jumatTerdekat();
  $('infaq-tanggal').value = jumatTerdekat();
}

// ===== INIT =====
window.onload = async () => {
  $('jdwl-tanggal').value = jumatTerdekat();
  $('infaq-tanggal').value = jumatTerdekat();
  await loadData();
  $('loading-screen').classList.add('hidden');
  // Real-time: sinkron tiap 5 detik
  setInterval(async () => {
    if (document.hidden) return;
    await loadData();
  }, POLL_MS);
};
