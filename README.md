# 🕌 Masjidku

Aplikasi tata kelola keuangan masjid dengan admin panel — multi perangkat & real-time.

## Fitur
- **Admin Panel** (login PIN) untuk mengatur nama masjid, alamat, dan marbot
- **Pengumuman Imam & Khotib** yang bertugas setiap Jumat, ditampilkan otomatis di beranda
- **Pencatatan infaq & shodaqoh khusus hari Jumat** dengan rekap per bulan
- **Pencatatan pengeluaran** (perlengkapan, honor marbot, listrik & air, dll) dengan kategori
- **Laporan PDF** — unduh laporan keuangan lengkap (pendapatan, pengeluaran, saldo) dalam satu klik
- **QR donasi** — admin upload QRIS/QR code, tampil di beranda untuk di-scan jamaah
- **Multi perangkat & real-time** — data tersimpan di server, tersinkron otomatis tiap 5 detik

## Cara Pakai
1. Buka aplikasi di perangkat mana pun
2. Tab **Admin** → masukkan PIN (default: `0021`, bisa diganti di pengaturan)
3. Isi profil masjid (nama, alamat, marbot) dan upload QR donasi
4. Tiap Jumat: catat Imam/Khotib di tab **Jadwal**, pendapatan infaq/shodaqoh dan pengeluaran di tab **Keuangan**
5. Unduh **Laporan PDF** kapan saja dari tab Keuangan
6. Jamaah bisa melihat pengumuman, QR donasi & laporan dari perangkat masing-masing tanpa login

## Teknologi
- Frontend: HTML + CSS + JavaScript (tanpa framework) + jsPDF
- Backend: Base44 (database + REST API)
- Hosting: GitHub Pages

---
Dibuat dengan 🤲 oleh [Darmawan Winata](https://github.com/darmawan-ina99)
