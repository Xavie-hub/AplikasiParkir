# Analisis kebutuhan dan desain program

## Aktor

| Aktor | Kebutuhan |
|---|---|
| Admin | Mengelola user, tarif, area, kendaraan, melihat log, melakukan transaksi, dan melihat laporan. |
| Petugas | Login, mencatat kendaraan masuk, mencetak tiket, mencari tiket aktif, dan memproses kendaraan keluar. |
| Owner | Login, melihat ringkasan operasional, dan membaca rekap transaksi berdasarkan periode. |
| Pengunjung | Tidak login; dilayani petugas melalui loket masuk dan loket keluar. |

## Desain alur data

```text
Login -> Session PHP -> Role authorization -> Panel sesuai role
                                      |
                                      v
                 Kendaraan masuk -> parking_transactions (aktif)
                                      |
                                      v
       Kode tiket / plat -> Checkout -> duration + total -> selesai -> struk
```

## Keputusan desain

1. `parking_transactions` menyimpan snapshot `plate_number`, `vehicle_type`, dan `rate_per_hour` agar riwayat tidak berubah ketika master diedit.
2. Area dikunci saat membuat tiket masuk agar kapasitas tidak terlampaui ketika ada request bersamaan.
3. Password hanya disimpan sebagai hash melalui `password_hash`; frontend tidak menerima `password_hash`.
4. Semua query input pengguna menggunakan PDO prepared statement.
5. Frontend mencoba API terlebih dahulu. Fallback `localStorage` hanya dipakai untuk demonstrasi ketika server belum aktif.

## Arsitektur modul

```text
index.html / app.js
        |
        | fetch + session cookie
        v
backend/api.php -> config.php -> PDO MySQL
        |
        +-> users, parking_areas, parking_rates, vehicles
        +-> parking_transactions
        +-> activity_logs
```

## Non-functional requirement

- Validasi role dilakukan ulang pada backend.
- List transaksi dibatasi maksimal 200 data pada endpoint operasional.
- Index disediakan untuk periode transaksi, plat kendaraan, area, dan waktu log.
- Error API dikembalikan sebagai JSON agar dapat ditangani konsisten oleh frontend.
