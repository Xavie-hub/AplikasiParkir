# Backend ParkirKu

Backend ini menggunakan PHP 8.1+ dengan PDO MySQL dan session cookie. API dipisahkan dari frontend agar login dan transaksi dapat dipakai dari browser maupun aplikasi lain.

> Catatan: antarmuka prototype yang sudah ada masih dapat berjalan dengan `localStorage`. Backend ini menyediakan service API yang siap dihubungkan ke UI melalui `fetch`, sehingga data produksi tidak lagi bergantung pada browser.

## Setup cepat

1. Pastikan MySQL/MariaDB aktif.
2. Jalankan schema dari folder proyek:

```powershell
Get-Content ..\database.sql | mysql -u root -p
```

3. Salin konfigurasi dan sesuaikan password database:

```powershell
Copy-Item .env.example .env
```

4. Buat user demo dengan hash password PHP:

```powershell
php .\seed.php
```

5. Jalankan server dari root folder proyek:

```powershell
cd ..
php -S 127.0.0.1:8000
```

Buka `http://127.0.0.1:8000`. API tersedia di `http://127.0.0.1:8000/backend/api.php`.

Jika PHP tidak tersedia di PATH dan menggunakan XAMPP:

```powershell
& "C:\xampp\php\php.exe" .\seed.php
cd ..
& "C:\xampp\php\php.exe" -S 127.0.0.1:8000
```

## Endpoint utama

Semua response JSON berbentuk `{ "success": true, "data": ... }`. Endpoint yang membutuhkan login memakai session cookie dari endpoint login.

| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| POST | `/backend/api.php/auth/login` | Publik | Login username dan password |
| GET | `/backend/api.php/health` | Publik | Mengecek API dan koneksi database |
| GET | `/backend/api.php/auth/me` | Login | Membaca session aktif |
| POST | `/backend/api.php/auth/logout` | Login | Mengakhiri session |
| GET/POST/PATCH/DELETE | `/backend/api.php/users` | Admin | CRUD pengguna |
| GET/POST/PATCH/DELETE | `/backend/api.php/tariffs` | Admin | CRUD tarif parkir |
| GET/POST/PATCH/DELETE | `/backend/api.php/areas` | Admin | CRUD area parkir |
| GET/POST/PATCH/DELETE | `/backend/api.php/vehicles` | Admin/Petugas | Data kendaraan |
| GET/POST | `/backend/api.php/transactions` | Admin/Petugas | Tiket masuk dan daftar transaksi |
| POST | `/backend/api.php/transactions/{id}/checkout` | Admin/Petugas | Kendaraan keluar dan hitung biaya |
| GET | `/backend/api.php/dashboard` | Semua role | Statistik ringkasan |
| GET | `/backend/api.php/reports?from=YYYY-MM-DD&to=YYYY-MM-DD` | Admin/Owner | Rekap periode |
| GET | `/backend/api.php/logs` | Admin | Audit trail |

## Contoh request

Login:

```powershell
curl.exe -c cookies.txt -H "Content-Type: application/json" -d '{"username":"petugas","password":"petugas123"}' http://127.0.0.1:8000/backend/api.php/auth/login
```

Cek koneksi backend:

```powershell
curl.exe http://127.0.0.1:8000/backend/api.php/health
```

Tiket kendaraan masuk:

```powershell
curl.exe -b cookies.txt -H "Content-Type: application/json" -d '{"plate_number":"B 1234 ABC","vehicle_type":"mobil","area_id":2}' http://127.0.0.1:8000/backend/api.php/transactions
```

Checkout kendaraan keluar:

```powershell
curl.exe -b cookies.txt -X POST http://127.0.0.1:8000/backend/api.php/transactions/1/checkout
```

## Keamanan

- Password dibuat dengan `password_hash(..., PASSWORD_DEFAULT)` dan diverifikasi dengan `password_verify`.
- Password tidak pernah dikirim kembali dalam response.
- Session memakai `HttpOnly` dan `SameSite=Lax`.
- Validasi role dilakukan di setiap endpoint, bukan hanya di antarmuka.
- Query database memakai prepared statement.
- Seed user dijalankan melalui PHP agar hash password tidak berupa placeholder SQL.
