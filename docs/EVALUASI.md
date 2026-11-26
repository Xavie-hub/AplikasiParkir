# Evaluasi singkat

## Fitur yang sudah berjalan

- Tiga level akses dengan menu yang disaring berdasarkan role.
- Loket penerbitan tiket merupakan alur utama dan dapat mencetak tiket melalui dialog print browser.
- Checkout menghitung durasi dan total pembayaran.
- CRUD seluruh data master sesuai kebutuhan SPK.
- Dashboard okupansi, aktivitas transaksi, log aktivitas, rekap tanggal, dan ekspor CSV.
- Tampilan responsif untuk desktop dan layar mobile.
- Backend PHP + MySQL dengan session login, role authorization, prepared statement, API transaksi, laporan, dan audit log.

## Batasan / bug yang belum menjadi target prototipe

- Mode fallback masih menyimpan data di `localStorage` jika backend belum dijalankan.
- Seed backend membuat hash password dengan PHP; mode fallback frontend tetap memakai akun demo lokal.
- Pencetakan masih bergantung pada printer dan dialog print browser.
- Belum ada integrasi palang otomatis, barcode/QR scanner, atau pembayaran elektronik.

## Rencana pengembangan berikutnya

1. Tambahkan QR/barcode pada tiket dan scanner di pintu keluar.
2. Tambahkan pengaturan tarif progresif, shift petugas, dan laporan PDF.
3. Tambahkan pengujian unit otomatis untuk validasi kapasitas, tarif, otorisasi, dan perhitungan durasi.
