# Rencana pengujian dan debugging

## Smoke test backend

Jalankan setelah MySQL, seed user, dan server PHP aktif:

```powershell
cd "C:\Users\user\Downloads\RPL\Web\Aplikasi Parkir\AplikasiParkir"
php -l .\backend\api.php
php -l .\backend\config.php
php -l .\backend\seed.php
.\backend\tests\smoke-test.ps1
```

Smoke test memeriksa health database, login Petugas, session aktif, dashboard, area, daftar transaksi, dan logout.

## Matriks test fungsional

| ID | Skenario | Hasil yang diharapkan |
|---|---|---|
| T01 | Login dengan akun valid | Session dibuat dan panel sesuai role terbuka |
| T02 | Login dengan password salah | Request ditolak tanpa membuat session |
| T03 | Petugas membuat tiket pada area tersedia | Tiket aktif, kode unik, dan preview cetak muncul |
| T04 | Petugas membuat tiket dengan plat yang masih aktif | Request ditolak |
| T05 | Area penuh | Tiket tidak dibuat |
| T06 | Checkout memakai kode tiket | Durasi, total, status selesai, dan struk muncul |
| T07 | Checkout tiket yang sudah selesai | Request ditolak |
| T08 | Owner membuka laporan periode | Hanya transaksi pada rentang tanggal yang tampil |
| T09 | Petugas membuka CRUD pengguna | Request/menu ditolak oleh role authorization |
| T10 | Admin menghapus area yang masih terisi | Penghapusan ditolak |

## Checklist debugging

- Periksa response `GET /backend/api.php/health` sebelum menguji UI.
- Periksa `.env`, nama database, port, username, dan password MySQL.
- Jalankan `seed.php` setelah import schema agar hash password demo dibuat PHP.
- Periksa tab Network browser untuk status API `401`, `403`, `422`, atau `500`.
- Hapus fallback `localStorage` hanya bila ingin menguji data murni dari database.
