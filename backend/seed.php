<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';
load_dotenv(__DIR__ . '/.env');

$pdo = db();
$users = [
    ['Admin Sistem', 'admin@parkirku.test', 'admin', 'admin123', 'admin'],
    ['Siti Petugas', 'petugas@parkirku.test', 'petugas', 'petugas123', 'petugas'],
    ['Budi Owner', 'owner@parkirku.test', 'owner', 'owner123', 'owner'],
];

$sql = "INSERT INTO users (name, email, username, password_hash, role, status)
        VALUES (:name, :email, :username, :password_hash, :role, 'aktif')
        ON DUPLICATE KEY UPDATE name = VALUES(name), email = VALUES(email),
        password_hash = VALUES(password_hash), role = VALUES(role), status = 'aktif'";
$statement = $pdo->prepare($sql);

foreach ($users as [$name, $email, $username, $password, $role]) {
    $statement->execute([
        ':name' => $name,
        ':email' => $email,
        ':username' => $username,
        ':password_hash' => password_hash($password, PASSWORD_DEFAULT),
        ':role' => $role,
    ]);
}

echo "Seed user berhasil.\n";
echo "admin/admin123, petugas/petugas123, owner/owner123\n";
