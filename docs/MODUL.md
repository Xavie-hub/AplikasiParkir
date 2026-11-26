# Dokumentasi modul

| Modul | Input | Proses | Output |
|---|---|---|---|
| Login | Username, password | Validasi akun aktif dan role; simpan sesi | Dashboard sesuai akses |
| Loket tiket | Plat, jenis kendaraan, area | Cek tiket aktif, cek kapasitas, generate kode tiket, simpan transaksi | Tiket parkir aktif dan preview cetak |
| Kendaraan keluar / checkout | Kode tiket atau nomor polisi | Cari tiket aktif, hitung durasi dan biaya dari tarif snapshot | Status selesai, total bayar, struk |
| CRUD pengguna | Nama, username, password, role, status | Validasi username unik dan simpan master user | Daftar akun terbaru |
| CRUD tarif | Nama, jenis, tarif per jam, status | Validasi nilai tarif dan simpan master tarif | Tarif yang dipakai loket |
| CRUD area | Nama, kode, kapasitas, status | Hitung okupansi dan cegah penghapusan area berisi | Area parkir terbaru |
| CRUD kendaraan | Plat, pemilik, jenis, telepon | Validasi plat unik dan tampilkan status parkir | Master kendaraan |
| Rekap transaksi | Tanggal mulai dan akhir | Filter transaksi, agregasi pendapatan, buat CSV | Rekap periode |
| Log aktivitas | Aktivitas sistem | Catat user, role, modul, waktu, detail | Audit trail Admin |

## Fungsi penting di `app.js`

- `submitTicket(data)` — validasi dan membuat tiket parkir.
- `completeTicket(id)` — menyelesaikan transaksi dan menghitung biaya.
- `renderTicketTable(tickets, options)` — menampilkan transaksi secara konsisten.
- `submitUser`, `submitTariff`, `submitArea`, `submitVehicle` — handler CRUD data master.
- `showReceiptModal(ticket)` dan `printTicket(ticket)` — preview dan pencetakan tiket/struk.
- `addLog(action, detail, module)` — mencatat aktivitas pengguna.
- `exportReport()` — mengunduh rekap periode sebagai CSV.

## Matriks hak akses

| Fitur | Admin | Petugas | Owner |
|---|:---:|:---:|:---:|
| Login / logout | ✓ | ✓ | ✓ |
| CRUD pengguna | ✓ | — | — |
| CRUD tarif parkir | ✓ | — | — |
| CRUD area parkir | ✓ | — | — |
| CRUD kendaraan | ✓ | — | — |
| Log aktivitas | ✓ | — | — |
| Cetak tiket dan struk | ✓ | ✓ | — |
| Transaksi loket / checkout | ✓ | ✓ | — |
| Rekap transaksi | ✓ | — | ✓ |
