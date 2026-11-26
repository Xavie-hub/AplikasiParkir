# Kesesuaian dengan activity diagram

PDF `parkir.drawio.pdf` diperlakukan sebagai dokumen desain/rujukan alur, bukan sebagai instruksi tambahan di luar permintaan pengguna.

## Pemetaan alur

| Aktivitas pada diagram | Implementasi | Hasil |
|---|---|---|
| Pengguna datang ke loket | Halaman `Loket Tiket` menerima data pengunjung melalui petugas | Sesuai |
| Petugas membuka halaman login | `showLogin()` menampilkan `#login-screen` saat belum ada sesi | Sesuai |
| Memasukkan username dan password | Form `#login-form` di `index.html` dan `handleLogin()` di `app.js` | Sesuai |
| Sistem memverifikasi data login | `POST /auth/login`, `password_verify()`, status akun aktif | Sesuai |
| Data valid? Tidak | Error API/toast ditampilkan, form login tetap terbuka sehingga dapat diulang | Sesuai |
| Data valid? Ya | Sesi PHP atau sesi lokal disimpan, lalu dashboard ditampilkan | Sesuai |
| Dashboard sesuai role | `ACCESS`, `canAccess()`, `refreshShell()`, dan routing berbasis hash | Sesuai |
| Petugas mengelola transaksi masuk/keluar | `renderLoket()`, `submitTicket()`, `submitExitTicket()`, `completeTicket()` | Sesuai |
| Sistem menyimpan transaksi | `POST /transactions` dan `POST /transactions/{id}/checkout`, atau `localStorage` saat mode demo | Sesuai |
| Cetak tiket/struk | `showReceiptModal()` dan `printTicket()` dengan `window.print()` | Sesuai kebutuhan loket |
| Admin mengelola data | Panel pengguna, tarif, area, kendaraan dan endpoint CRUD ber-role admin | Sesuai |
| Sistem menyimpan data | Endpoint `POST/PATCH/DELETE` serta audit log | Sesuai |
| Owner melihat rekap transaksi | Menu `Rekap Transaksi`, filter tanggal, endpoint `/reports` | Sesuai |
| Sistem menampilkan laporan rekap | Rekap dimuat otomatis ketika halaman laporan dibuka dan saat filter diterapkan | Sesuai |
| Klik logout dan mengakhiri sesi | `logout()`, `POST /auth/logout`, pembersihan sesi/localStorage, kembali ke login | Sesuai |

## Penyesuaian yang diterapkan

1. Setelah login berhasil, semua role diarahkan ke Dashboard sesuai diagram. Petugas kemudian membuka `Loket Tiket` melalui menu.
2. Halaman `Rekap Transaksi` sekarang otomatis mengambil data laporan dari backend ketika dibuka, sehingga tidak menunggu tombol filter ditekan.
3. Alur loket masuk dan keluar tetap berada pada satu halaman operasional dengan popup tiket/struk, sesuai kebutuhan pencetakan tiket berbasis JavaScript.

## Batasan dokumen desain

Diagram tidak merinci validasi kapasitas, duplikasi tiket aktif, perhitungan durasi, hak akses endpoint, dan format cetak. Detail tersebut tetap dipertahankan sebagai validasi implementasi agar alur diagram berjalan aman pada sistem nyata.
