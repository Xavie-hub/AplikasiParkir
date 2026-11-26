-- ParkirKu - skema database relasional
-- Target: MySQL 8.x / MariaDB 10.6+
-- Frontend prototype menggunakan localStorage. File ini menjadi dasar migrasi ke backend.

CREATE DATABASE IF NOT EXISTS parkirku CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE parkirku;

CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(160) NULL,
    username VARCHAR(60) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'petugas', 'owner') NOT NULL,
    status ENUM('aktif', 'nonaktif') NOT NULL DEFAULT 'aktif',
    last_login_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS parking_areas (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    capacity SMALLINT UNSIGNED NOT NULL,
    status ENUM('aktif', 'nonaktif') NOT NULL DEFAULT 'aktif',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_area_capacity CHECK (capacity > 0)
);

CREATE TABLE IF NOT EXISTS parking_rates (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    vehicle_type ENUM('motor', 'mobil', 'truk') NOT NULL,
    rate_per_hour DECIMAL(12, 0) UNSIGNED NOT NULL,
    status ENUM('aktif', 'nonaktif') NOT NULL DEFAULT 'aktif',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_rate_amount CHECK (rate_per_hour >= 0)
);

CREATE TABLE IF NOT EXISTS vehicles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    plate_number VARCHAR(20) NOT NULL UNIQUE,
    owner_name VARCHAR(120) NOT NULL,
    phone VARCHAR(25) NULL,
    vehicle_type ENUM('motor', 'mobil', 'truk') NOT NULL,
    vehicle_brand VARCHAR(80) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS parking_transactions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ticket_code VARCHAR(32) NOT NULL UNIQUE,
    vehicle_id BIGINT UNSIGNED NULL,
    plate_number VARCHAR(20) NOT NULL,
    vehicle_type ENUM('motor', 'mobil', 'truk') NOT NULL,
    vehicle_brand VARCHAR(80) NULL,
    area_id BIGINT UNSIGNED NOT NULL,
    rate_per_hour DECIMAL(12, 0) UNSIGNED NOT NULL,
    entry_at DATETIME NOT NULL,
    exit_at DATETIME NULL,
    duration_hours SMALLINT UNSIGNED NULL,
    total_amount DECIMAL(12, 0) UNSIGNED NOT NULL DEFAULT 0,
    status ENUM('aktif', 'selesai') NOT NULL DEFAULT 'aktif',
    created_by BIGINT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_transaction_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL,
    CONSTRAINT fk_transaction_area FOREIGN KEY (area_id) REFERENCES parking_areas(id),
    CONSTRAINT fk_transaction_user FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_transaction_period (entry_at, status),
    INDEX idx_transaction_plate (plate_number),
    INDEX idx_transaction_area_status (area_id, status)
);

CREATE TABLE IF NOT EXISTS activity_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NULL,
    action_name VARCHAR(120) NOT NULL,
    detail TEXT NULL,
    module_name VARCHAR(60) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_log_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_log_created_at (created_at)
);

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS vehicle_brand VARCHAR(80) NULL AFTER vehicle_type;
ALTER TABLE parking_transactions ADD COLUMN IF NOT EXISTS vehicle_brand VARCHAR(80) NULL AFTER vehicle_type;

-- Seed awal. Password untuk implementasi backend wajib disimpan memakai bcrypt/Argon2.
-- Nilai berikut hanya placeholder hash untuk contoh struktur data.
INSERT IGNORE INTO users (name, email, username, password_hash, role) VALUES
('Admin Sistem', 'admin@parkirku.test', 'admin', '$2y$10$REPLACE_WITH_BCRYPT_HASH', 'admin'),
('Siti Petugas', 'petugas@parkirku.test', 'petugas', '$2y$10$REPLACE_WITH_BCRYPT_HASH', 'petugas'),
('Budi Owner', 'owner@parkirku.test', 'owner', '$2y$10$REPLACE_WITH_BCRYPT_HASH', 'owner');

INSERT IGNORE INTO parking_areas (name, code, capacity) VALUES
('Area Motor Utama', 'A-01', 80),
('Area Mobil Gedung', 'B-01', 50),
('Area VIP', 'C-01', 20);

INSERT IGNORE INTO parking_rates (name, vehicle_type, rate_per_hour) VALUES
('Tarif Motor Reguler', 'motor', 3000),
('Tarif Mobil Reguler', 'mobil', 5000),
('Tarif Truk / Bus', 'truk', 8000);

-- Rekap transaksi yang dipakai oleh Owner:
-- SELECT DATE(entry_at) AS tanggal, COUNT(*) AS jumlah_transaksi,
--        SUM(total_amount) AS pendapatan
-- FROM parking_transactions
-- WHERE entry_at >= :from_date AND entry_at < DATE_ADD(:to_date, INTERVAL 1 DAY)
-- GROUP BY DATE(entry_at)
-- ORDER BY tanggal DESC;
