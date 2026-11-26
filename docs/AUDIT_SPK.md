# Audit kesesuaian terhadap SPK P2

Dokumen PDF SPK diperlakukan sebagai sumber kebutuhan aplikasi. Instruksi pelaksanaan ujian di PDF tidak menggantikan permintaan pengguna; audit ini hanya memeriksa apakah hasil coding memenuhi kebutuhan teknis yang diminta.

| Kebutuhan SPK | Status | Bukti implementasi |
|---|---|---|
| Login tiga level: Admin, Petugas, Owner | Terpenuhi | `app.js`, `backend/api.php`, `backend/seed.php` |
| Logout untuk semua level | Terpenuhi | `app.js`, endpoint `/auth/logout` |
| CRUD User | Terpenuhi | `users_route()` dan popup form Admin |
| CRUD Tarif Parkir | Terpenuhi | `simple_master_route('tariffs')` dan popup form Admin |
| CRUD Area Parkir | Terpenuhi | `simple_master_route('areas')` dan validasi kapasitas |
| CRUD Kendaraan | Terpenuhi | `vehicles_route()` dan popup form Admin |
| Akses log aktivitas | Terpenuhi | `audit()`, `logs_route()`, panel Log Aktivitas |
| Cetak struk/tiket parkir | Terpenuhi | `showReceiptModal()` dan `printTicket()` memakai `window.print()` |
| Transaksi parkir | Terpenuhi | `/transactions`, tiket masuk, checkout kendaraan keluar |
| Rekap berdasarkan waktu | Terpenuhi | `/reports?from=&to=`, filter tanggal, export CSV |
| Struktur data dan basis data SQL | Terpenuhi | `database.sql`, ERD, PDO prepared statement |
| Analisis kebutuhan | Ditambahkan | `ANALISIS_DAN_DESAIN.md` |
| Desain ERD dan alur program | Terpenuhi | `ERD.md` dan `ALUR.md` |
| Implementasi dan dokumentasi fungsi | Terpenuhi | `MODUL.md`, source code terstruktur |
| Pengujian dan debugging | Ditambahkan | `PENGUJIAN.md`, `backend/tests/smoke-test.ps1` |
| Query efisien dan pembatasan data | Terpenuhi | Index SQL, `LIMIT 200`, prepared statement |
| Kesesuaian activity diagram parkir | Terpenuhi | Pemetaan alur pada `ACTIVITY_DIAGRAM_ALIGNMENT.md`, routing dashboard, transaksi, laporan, dan logout |

## Hasil audit

Tidak ditemukan fitur inti SPK yang kosong. Yang sebelumnya belum terdokumentasi secara formal adalah analisis/desain tahap awal serta bukti pengujian/debugging; keduanya ditambahkan pada perubahan ini.

## Batasan yang tetap dicatat

- Pencetakan tetap bergantung pada dialog printer browser.
- Integrasi palang otomatis, QR scanner, pembayaran digital, dan shift petugas belum termasuk ruang lingkup SPK inti.
- Jika backend tidak dijalankan, frontend memakai fallback `localStorage` untuk demo.
