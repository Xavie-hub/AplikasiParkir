# Dokumentasi detail setiap modul

## 1. Login dan logout

- Input: username dan password.
- Proses: API mencari akun aktif, memverifikasi hash password, membuat session cookie, mencatat log login.
- Output: data user tanpa password dan panel sesuai role.
- Fungsi/method: `handleLogin`, `apiRequest('/auth/login')`, `login`, `logout`.

## 2. Kendaraan masuk / loket

- Input: nomor polisi, jenis kendaraan, area, dan kendaraan terdaftar opsional.
- Proses: validasi plat aktif, kunci area, cek kapasitas, ambil tarif aktif, buat kode tiket, simpan transaksi.
- Output: tiket aktif dan preview cetak.
- Fungsi/method: `submitTicket`, `transactions_route`, `showReceiptModal`, `printTicket`.

## 3. Kendaraan keluar / checkout

- Input: kode tiket atau nomor polisi.
- Proses: cari transaksi aktif, hitung durasi minimal satu jam, kalikan dengan tarif snapshot, ubah status menjadi selesai.
- Output: total pembayaran, waktu keluar, dan struk.
- Fungsi/method: `submitExitTicket`, `completeTicket`, `transactions_route(.../checkout)`.

## 4. Data pengguna

- Input: nama, email, username, password, role, dan status.
- Proses: Admin melakukan create, read, update, delete dengan validasi username unik dan larangan menghapus akun aktif sendiri.
- Output: daftar pengguna dan audit log.
- Fungsi/method: `submitUser`, `users_route`.

## 5. Tarif parkir

- Input: nama tarif, jenis kendaraan, tarif per jam, status.
- Proses: validasi nominal positif dan simpan master tarif.
- Output: tarif yang digunakan saat tiket masuk.
- Fungsi/method: `submitTariff`, `simple_master_route('tariffs')`.

## 6. Area parkir

- Input: nama, kode, kapasitas, status.
- Proses: validasi kapasitas, hitung okupansi, cegah penghapusan area berisi.
- Output: master area dan slot tersedia.
- Fungsi/method: `submitArea`, `renderOccupancy`, `simple_master_route('areas')`.

## 7. Data kendaraan

- Input: nomor polisi, pemilik, telepon, jenis kendaraan.
- Proses: normalisasi plat dan validasi nomor polisi unik.
- Output: data kendaraan beserta status sedang parkir.
- Fungsi/method: `submitVehicle`, `vehicleTable`, `vehicles_route`.

## 8. Laporan dan log

- Input: tanggal mulai dan tanggal akhir.
- Proses: filter periode, agregasi transaksi selesai, hitung pendapatan, dan ambil audit log sesuai role.
- Output: rekap transaksi, export CSV, dan daftar aktivitas Admin.
- Fungsi/method: `submitReportFilters`, `exportReport`, `reports_route`, `logs_route`.
