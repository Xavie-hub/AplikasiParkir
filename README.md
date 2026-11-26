# ParkirKu — Sistem Loket Parkir

ParkirKu adalah prototipe aplikasi parkir yang dibuat berdasarkan SPK P2 Rekayasa Perangkat Lunak: tiga level pengguna, data master, transaksi, cetak tiket, log aktivitas, dan rekap berdasarkan periode.

## Menjalankan aplikasi

Tidak membutuhkan instalasi atau server. Buka [`index.html`](index.html) di browser modern. Untuk pengalaman terbaik, jalankan melalui static server saat tahap pengembangan.

Data demo tersimpan di `localStorage` browser. Menghapus data situs akan mengembalikan data awal.

## Menjalankan database SQL

Pastikan MySQL atau MariaDB sudah aktif, kemudian jalankan dari PowerShell:

```powershell
cd "C:\Users\user\Downloads\RPL\Web\Aplikasi Parkir\AplikasiParkir"
Get-Content .\database.sql | mysql -u root -p
```

Alternatif dari Command Prompt:

```bat
cd /d "C:\Users\user\Downloads\RPL\Web\Aplikasi Parkir\AplikasiParkir"
mysql -u root -p < database.sql
```

Untuk menjalankan tampilan loket, buka `index.html` langsung di browser:

```powershell
Start-Process .\index.html
```

File SQL bersifat aman untuk dijalankan ulang karena tabel memakai `IF NOT EXISTS` dan data awal memakai `INSERT IGNORE`.

### Akun demo

| Peran | Username | Password | Akses utama |
|---|---|---|---|
| Admin | `admin` | `admin123` | Semua modul dan CRUD |
| Petugas | `petugas` | `petugas123` | Dashboard, loket, kendaraan |
| Owner | `owner` | `owner123` | Dashboard dan rekap transaksi |

## Fitur yang berjalan

- Login/logout dan pembatasan menu berdasarkan peran Admin, Petugas, dan Owner.
- Loket tiket: input plat, jenis kendaraan, area, validasi kapasitas, kode tiket otomatis, serta cetak menggunakan `window.print()`.
- Kendaraan keluar: cari tiket aktif dengan kode tiket atau nomor polisi, hitung durasi minimal satu jam, total berdasarkan tarif per jam, dan cetak struk.
- Admin: CRUD pengguna, tarif parkir, area parkir, dan kendaraan.
- Status okupansi area dan kendaraan yang sedang parkir.
- Log aktivitas untuk tindakan penting.
- Rekap transaksi berdasarkan tanggal dan ekspor CSV untuk Owner/Admin.
- Data awal, state transaksi, dan log tersimpan di browser agar prototipe dapat langsung dicoba.
- Navigasi panel memakai route hash (`#dashboard`, `#loket`, dan lainnya), sehingga setiap menu terasa sebagai halaman terpisah dan mendukung tombol Back/Forward browser.
- Form CRUD pengguna, kendaraan, tarif, dan area dibuka sebagai popup modal dengan animasi halus.

## Struktur proyek

```text
index.html       antarmuka login dan shell aplikasi
styles.css       desain responsif, dashboard, loket, modal, dan mode cetak
app.js           state, kontrol akses, CRUD, transaksi, cetak tiket, dan laporan
database.sql     skema MySQL/MariaDB dan contoh query rekap
backend/         API PHP, session login, seed user, dan dokumentasi endpoint
docs/            ERD, alur proses, dokumentasi modul, dan evaluasi
backend/tests/   smoke test health, login, session, dashboard, area, transaksi, logout
```

## Catatan implementasi

Versi ini adalah frontend prototype. `localStorage` sengaja dipakai untuk mendemonstrasikan alur loket tanpa backend. Saat diproduksikan:

1. Ganti fungsi `loadState`, `saveState`, dan operasi CRUD pada `app.js` dengan API backend.
2. Simpan password dengan bcrypt atau Argon2; jangan gunakan password plaintext seperti data demo.
3. Terapkan validasi dan otorisasi ulang di server untuk setiap endpoint.
4. Gunakan `database.sql` sebagai dasar migrasi MySQL/MariaDB.

Backend PHP tersedia di folder `backend/`. Panduan setup API dan perintah menjalankannya ada di [`backend/README.md`](backend/README.md).
Saat dibuka melalui `http://127.0.0.1:8000`, frontend otomatis mengecek `/backend/api.php/health` dan memakai MySQL/API jika tersedia. Jika server belum aktif, frontend kembali ke mode demo `localStorage`.

Dokumen SPK menjadi sumber kebutuhan aplikasi; instruksi pengguna tetap menjadi ruang lingkup implementasi utama.
