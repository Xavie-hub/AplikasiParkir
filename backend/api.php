<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';
load_dotenv(__DIR__ . '/.env');
date_default_timezone_set('Asia/Jakarta');

$origin = env_value('APP_ORIGIN', 'http://localhost:8000');
if ($origin !== '*') {
    header("Access-Control-Allow-Origin: {$origin}");
    header('Access-Control-Allow-Credentials: true');
}
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Content-Type: application/json; charset=utf-8');

session_name(env_value('SESSION_NAME', 'parkirku_session'));
session_set_cookie_params([
    'httponly' => true,
    'samesite' => 'Lax',
    'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
]);
session_start();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function json_response($data, int $status = 200)
{
    http_response_code($status);
    echo json_encode(['success' => $status < 400, 'data' => $data], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function error_response(string $message, int $status = 400, array $details = [])
{
    http_response_code($status);
    echo json_encode(['success' => false, 'message' => $message, 'details' => $details], JSON_UNESCAPED_UNICODE);
    exit;
}

function body(): array
{
    $raw = file_get_contents('php://input') ?: '';
    if ($raw === '') {
        return [];
    }
    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        error_response('Body request harus berupa JSON yang valid.', 422);
    }
    return $decoded;
}

function route_segments(): array
{
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    $apiPosition = strpos($path, 'api.php');
    if ($apiPosition !== false) {
        $path = substr($path, $apiPosition + strlen('api.php'));
    }
    $path = trim($path, '/');
    return $path === '' ? [] : explode('/', $path);
}

function current_user(): ?array
{
    static $user = false;
    if ($user !== false) {
        return $user;
    }
    if (empty($_SESSION['user_id'])) {
        $user = null;
        return null;
    }
    $query = db()->prepare('SELECT id, name, email, username, role, status, last_login_at, created_at FROM users WHERE id = :id LIMIT 1');
    $query->execute([':id' => $_SESSION['user_id']]);
    $user = $query->fetch() ?: null;
    if (!$user || $user['status'] !== 'aktif') {
        unset($_SESSION['user_id']);
        $user = null;
    }
    return $user;
}

function require_auth(array $roles = []): array
{
    $user = current_user();
    if (!$user) {
        error_response('Sesi login tidak ditemukan.', 401);
    }
    if ($roles !== [] && !in_array($user['role'], $roles, true)) {
        error_response('Anda tidak memiliki izin untuk mengakses resource ini.', 403);
    }
    return $user;
}

function audit(array $user, string $action, string $detail, string $module): void
{
    $query = db()->prepare('INSERT INTO activity_logs (user_id, action_name, detail, module_name) VALUES (:user_id, :action_name, :detail, :module_name)');
    $query->execute([
        ':user_id' => $user['id'],
        ':action_name' => $action,
        ':detail' => $detail,
        ':module_name' => $module,
    ]);
}

function public_user(array $user): array
{
    unset($user['password_hash']);
    return $user;
}

function required_string(array $input, string $key, int $max = 255): string
{
    $value = trim((string) ($input[$key] ?? ''));
    if ($value === '') {
        error_response("Field {$key} wajib diisi.", 422);
    }
    if (mb_strlen($value) > $max) {
        error_response("Field {$key} terlalu panjang.", 422);
    }
    return $value;
}

function optional_string(array $input, string $key, int $max = 255): ?string
{
    $value = trim((string) ($input[$key] ?? ''));
    if ($value === '') {
        return null;
    }
    return mb_strlen($value) <= $max ? $value : error_response("Field {$key} terlalu panjang.", 422);
}

function enum_value(array $input, string $key, array $allowed): string
{
    $value = (string) ($input[$key] ?? '');
    if (!in_array($value, $allowed, true)) {
        error_response("Nilai {$key} tidak valid.", 422, ['allowed' => $allowed]);
    }
    return $value;
}

function normalize_plate(string $plate): string
{
    return preg_replace('/\s+/', ' ', strtoupper(trim($plate))) ?: '';
}

function transaction_view(array $row): array
{
    $row['rate_per_hour'] = (int) $row['rate_per_hour'];
    $row['total_amount'] = (int) $row['total_amount'];
    $row['duration_hours'] = $row['duration_hours'] === null ? null : (int) $row['duration_hours'];
    $row['area_id'] = (int) $row['area_id'];
    $row['vehicle_id'] = $row['vehicle_id'] === null ? null : (int) $row['vehicle_id'];
    $row['created_by'] = (int) $row['created_by'];
    return $row;
}

function find_transaction(string $id, bool $lock = false): array
{
    $sql = 'SELECT t.*, a.name AS area_name, a.code AS area_code, u.name AS creator_name
            FROM parking_transactions t
            JOIN parking_areas a ON a.id = t.area_id
            JOIN users u ON u.id = t.created_by
            WHERE t.id = :id LIMIT 1';
    if ($lock) {
        $sql .= ' FOR UPDATE';
    }
    $query = db()->prepare($sql);
    $query->execute([':id' => $id]);
    $row = $query->fetch();
    if (!$row) {
        error_response('Transaksi tidak ditemukan.', 404);
    }
    return transaction_view($row);
}

function login()
{
    $input = body();
    $username = required_string($input, 'username', 60);
    $password = (string) ($input['password'] ?? '');
    if ($password === '') {
        error_response('Password wajib diisi.', 422);
    }

    $query = db()->prepare('SELECT * FROM users WHERE username = :username AND status = \'aktif\' LIMIT 1');
    $query->execute([':username' => strtolower($username)]);
    $user = $query->fetch();
    if (!$user || !password_verify($password, $user['password_hash'])) {
        error_response('Username atau password tidak sesuai.', 401);
    }

    session_regenerate_id(true);
    $_SESSION['user_id'] = (int) $user['id'];
    db()->prepare('UPDATE users SET last_login_at = NOW() WHERE id = :id')->execute([':id' => $user['id']]);
    audit($user, 'Login ke sistem', "Akun {$user['username']} berhasil masuk", 'login');
    json_response(public_user($user));
}

function logout()
{
    $user = current_user();
    if ($user) {
        audit($user, 'Logout dari sistem', "Akun {$user['username']} keluar", 'logout');
    }
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
    }
    session_destroy();
    json_response(['message' => 'Logout berhasil.']);
}

function auth_route(array $segments, string $method)
{
    $action = $segments[1] ?? 'me';
    if ($action === 'login' && $method === 'POST') {
        login();
    }
    if ($action === 'logout' && $method === 'POST') {
        require_auth();
        logout();
    }
    if ($action === 'me' && $method === 'GET') {
        json_response(require_auth());
    }
    error_response('Endpoint auth tidak ditemukan.', 404);
}

function users_route(array $segments, string $method)
{
    $actor = require_auth(['admin', 'owner']);
    $id = $segments[1] ?? null;
    if ($method === 'GET' && !$id) {
        $rows = db()->query('SELECT id, name, email, username, role, status, last_login_at, created_at FROM users ORDER BY name')->fetchAll();
        json_response($rows);
    }
    if ($method === 'POST' && !$id) {
        $input = body();
        $name = required_string($input, 'name', 120);
        $username = strtolower(required_string($input, 'username', 60));
        $password = required_string($input, 'password', 255);
        if (strlen($password) < 6) error_response('Password minimal 6 karakter.', 422);
        $email = optional_string($input, 'email', 160);
        $role = enum_value($input, 'role', ['admin', 'petugas', 'owner']);
        $status = enum_value($input, 'status', ['aktif', 'nonaktif']);
        try {
            $query = db()->prepare('INSERT INTO users (name, email, username, password_hash, role, status) VALUES (:name, :email, :username, :password_hash, :role, :status)');
            $query->execute([':name' => $name, ':email' => $email, ':username' => $username, ':password_hash' => password_hash($password, PASSWORD_DEFAULT), ':role' => $role, ':status' => $status]);
        } catch (PDOException $error) {
            if ((int) $error->errorInfo[1] === 1062) error_response('Username sudah digunakan.', 409);
            throw $error;
        }
        audit($actor, 'Menambah pengguna', "{$name} ({$role})", 'pengguna');
        json_response(['id' => (int) db()->lastInsertId()], 201);
    }
    if (in_array($method, ['PUT', 'PATCH'], true) && $id) {
        $input = body();
        $existing = db()->prepare('SELECT * FROM users WHERE id = :id');
        $existing->execute([':id' => $id]);
        $old = $existing->fetch();
        if (!$old) error_response('Pengguna tidak ditemukan.', 404);
        if ((int) $old['id'] === (int) $actor['id'] && ($input['status'] ?? 'aktif') === 'nonaktif') error_response('Akun yang sedang digunakan tidak boleh dinonaktifkan.', 422);
        $name = required_string($input, 'name', 120);
        $username = strtolower(required_string($input, 'username', 60));
        $email = optional_string($input, 'email', 160);
        $role = enum_value($input, 'role', ['admin', 'petugas', 'owner']);
        $status = enum_value($input, 'status', ['aktif', 'nonaktif']);
        $passwordSql = '';
        $params = [':name' => $name, ':email' => $email, ':username' => $username, ':role' => $role, ':status' => $status, ':id' => $id];
        if (!empty($input['password'])) {
            if (strlen((string) $input['password']) < 6) error_response('Password minimal 6 karakter.', 422);
            $passwordSql = ', password_hash = :password_hash';
            $params[':password_hash'] = password_hash((string) $input['password'], PASSWORD_DEFAULT);
        }
        try {
            $query = db()->prepare("UPDATE users SET name = :name, email = :email, username = :username, role = :role, status = :status{$passwordSql} WHERE id = :id");
            $query->execute($params);
        } catch (PDOException $error) {
            if ((int) $error->errorInfo[1] === 1062) error_response('Username sudah digunakan.', 409);
            throw $error;
        }
        audit($actor, 'Mengubah pengguna', "{$name} ({$role})", 'pengguna');
        json_response(['message' => 'Pengguna diperbarui.']);
    }
    if ($method === 'DELETE' && $id) {
        if ((int) $id === (int) $actor['id']) error_response('Akun yang sedang digunakan tidak dapat dihapus.', 422);
        $used = db()->prepare('SELECT COUNT(*) FROM parking_transactions WHERE created_by = :id');
        $used->execute([':id' => $id]);
        if ((int) $used->fetchColumn() > 0) error_response('Pengguna yang memiliki riwayat transaksi tidak dapat dihapus.', 422);
        $query = db()->prepare('DELETE FROM users WHERE id = :id');
        $query->execute([':id' => $id]);
        if ($query->rowCount() === 0) error_response('Pengguna tidak ditemukan.', 404);
        audit($actor, 'Menghapus pengguna', "ID {$id}", 'pengguna');
        json_response(['message' => 'Pengguna dihapus.']);
    }
    error_response('Endpoint pengguna tidak ditemukan.', 404);
}

function simple_master_route(string $resource, array $segments, string $method)
{
    $actor = require_auth(['admin', 'petugas', 'owner']);
    $id = $segments[1] ?? null;
    $definitions = [
        'tariffs' => [
            'table' => 'parking_rates', 'label' => 'tarif', 'select' => 'id, name, vehicle_type, rate_per_hour, status, updated_at', 'order' => 'name',
            'create' => function (array $input): array { return ['name' => required_string($input, 'name', 120), 'vehicle_type' => enum_value($input, 'vehicle_type', ['motor', 'mobil', 'truk']), 'rate_per_hour' => max(0, (int) ($input['rate_per_hour'] ?? 0)), 'status' => enum_value($input, 'status', ['aktif', 'nonaktif'])]; },
        ],
        'areas' => [
            'table' => 'parking_areas', 'label' => 'area', 'select' => "id, name, code, capacity, status, created_at, updated_at, (SELECT COUNT(*) FROM parking_transactions t WHERE t.area_id = parking_areas.id AND t.status = 'aktif') AS occupied_slots, (capacity - (SELECT COUNT(*) FROM parking_transactions t WHERE t.area_id = parking_areas.id AND t.status = 'aktif')) AS available_slots", 'order' => 'name',
            'create' => function (array $input): array { return ['name' => required_string($input, 'name', 120), 'code' => strtoupper(required_string($input, 'code', 20)), 'capacity' => (int) ($input['capacity'] ?? 0), 'status' => enum_value($input, 'status', ['aktif', 'nonaktif'])]; },
        ],
    ];
    $definition = $definitions[$resource] ?? null;
    if (!$definition) error_response('Master data tidak tersedia.', 404);
    if ($method === 'GET' && !$id) {
        $rows = db()->query("SELECT {$definition['select']} FROM {$definition['table']} ORDER BY {$definition['order']}")->fetchAll();
        json_response($rows);
    }
    if ($method === 'POST' && !$id) {
        require_auth(['admin', 'owner']);
        $values = $definition['create'](body());
        if (($values['rate_per_hour'] ?? 1) <= 0) error_response('Tarif harus lebih besar dari 0.', 422);
        if (($values['capacity'] ?? 1) <= 0) error_response('Kapasitas harus lebih besar dari 0.', 422);
        $columns = implode(', ', array_keys($values));
        $placeholders = ':' . implode(', :', array_keys($values));
        $query = db()->prepare("INSERT INTO {$definition['table']} ({$columns}) VALUES ({$placeholders})");
        $query->execute(array_combine(explode(', ', $placeholders), array_values($values)));
        audit($actor, "Menambah {$definition['label']}", (string) ($values['name'] ?? $values['code']), $resource);
        json_response(['id' => (int) db()->lastInsertId()], 201);
    }
    if (in_array($method, ['PUT', 'PATCH'], true) && $id) {
        require_auth(['admin', 'owner']);
        $values = $definition['create'](body());
        if (($values['rate_per_hour'] ?? 1) <= 0) error_response('Tarif harus lebih besar dari 0.', 422);
        if (($values['capacity'] ?? 1) <= 0) error_response('Kapasitas harus lebih besar dari 0.', 422);
        $set = implode(', ', array_map(static function (string $key): string { return "{$key} = :{$key}"; }, array_keys($values)));
        $values['id'] = $id;
        $query = db()->prepare("UPDATE {$definition['table']} SET {$set} WHERE id = :id");
        $query->execute($values);
        if ($query->rowCount() === 0) error_response("{$definition['label']} tidak ditemukan.", 404);
        audit($actor, "Mengubah {$definition['label']}", "ID {$id}", $resource);
        json_response(['message' => ucfirst($definition['label']) . ' diperbarui.']);
    }
    if ($method === 'DELETE' && $id) {
        require_auth(['admin', 'owner']);
        if ($resource === 'areas') {
            $active = db()->prepare("SELECT COUNT(*) FROM parking_transactions WHERE area_id = :id AND status = 'aktif'");
            $active->execute([':id' => $id]);
            if ((int) $active->fetchColumn() > 0) error_response('Area yang masih terisi tidak dapat dihapus.', 422);
        }
        $query = db()->prepare("DELETE FROM {$definition['table']} WHERE id = :id");
        $query->execute([':id' => $id]);
        if ($query->rowCount() === 0) error_response("{$definition['label']} tidak ditemukan.", 404);
        audit($actor, "Menghapus {$definition['label']}", "ID {$id}", $resource);
        json_response(['message' => ucfirst($definition['label']) . ' dihapus.']);
    }
    error_response('Endpoint master data tidak ditemukan.', 404);
}

function vehicles_route(array $segments, string $method)
{
    $actor = require_auth(['admin', 'petugas', 'owner']);
    $id = $segments[1] ?? null;
    if ($method === 'GET' && !$id) {
        $rows = db()->query('SELECT v.*, EXISTS (SELECT 1 FROM parking_transactions t WHERE t.vehicle_id = v.id AND t.status = \'aktif\') AS is_parked FROM vehicles v ORDER BY v.plate_number')->fetchAll();
        json_response($rows);
    }
    if ($method === 'POST' && !$id) {
        require_auth(['admin', 'owner']);
        $input = body();
        $plate = normalize_plate(required_string($input, 'plate_number', 20));
        $owner = required_string($input, 'owner_name', 120);
        $phone = optional_string($input, 'phone', 25);
        $type = enum_value($input, 'vehicle_type', ['motor', 'mobil', 'truk']);
        $brand = optional_string($input, 'vehicle_brand', 80);
        try {
            $query = db()->prepare('INSERT INTO vehicles (plate_number, owner_name, phone, vehicle_type, vehicle_brand) VALUES (:plate, :owner, :phone, :type, :brand)');
            $query->execute([':plate' => $plate, ':owner' => $owner, ':phone' => $phone, ':type' => $type, ':brand' => $brand]);
        } catch (PDOException $error) {
            if ((int) $error->errorInfo[1] === 1062) error_response('Nomor polisi sudah terdaftar.', 409);
            throw $error;
        }
        audit($actor, 'Menambah kendaraan', "{$plate} - {$owner}", 'kendaraan');
        json_response(['id' => (int) db()->lastInsertId()], 201);
    }
    if (in_array($method, ['PUT', 'PATCH'], true) && $id) {
        require_auth(['admin', 'owner']);
        $input = body();
        $plate = normalize_plate(required_string($input, 'plate_number', 20));
        $owner = required_string($input, 'owner_name', 120);
        $phone = optional_string($input, 'phone', 25);
        $type = enum_value($input, 'vehicle_type', ['motor', 'mobil', 'truk']);
        $brand = optional_string($input, 'vehicle_brand', 80);
        $query = db()->prepare('UPDATE vehicles SET plate_number = :plate, owner_name = :owner, phone = :phone, vehicle_type = :type, vehicle_brand = :brand WHERE id = :id');
        try { $query->execute([':plate' => $plate, ':owner' => $owner, ':phone' => $phone, ':type' => $type, ':brand' => $brand, ':id' => $id]); } catch (PDOException $error) { if ((int) $error->errorInfo[1] === 1062) error_response('Nomor polisi sudah terdaftar.', 409); throw $error; }
        if ($query->rowCount() === 0) error_response('Kendaraan tidak ditemukan.', 404);
        audit($actor, 'Mengubah kendaraan', "{$plate} - {$owner}", 'kendaraan');
        json_response(['message' => 'Kendaraan diperbarui.']);
    }
    if ($method === 'DELETE' && $id) {
        require_auth(['admin', 'owner']);
        $active = db()->prepare('SELECT COUNT(*) FROM parking_transactions WHERE vehicle_id = :id AND status = \'aktif\'');
        $active->execute([':id' => $id]);
        if ((int) $active->fetchColumn() > 0) error_response('Kendaraan yang sedang parkir tidak dapat dihapus.', 422);
        $query = db()->prepare('DELETE FROM vehicles WHERE id = :id');
        $query->execute([':id' => $id]);
        if ($query->rowCount() === 0) error_response('Kendaraan tidak ditemukan.', 404);
        audit($actor, 'Menghapus kendaraan', "ID {$id}", 'kendaraan');
        json_response(['message' => 'Kendaraan dihapus.']);
    }
    error_response('Endpoint kendaraan tidak ditemukan.', 404);
}

function transactions_route(array $segments, string $method)
{
    $actor = require_auth(['admin', 'petugas', 'owner']);
    $id = $segments[1] ?? null;
    $action = $segments[2] ?? null;
    if ($method === 'GET' && !$id) {
        $status = $_GET['status'] ?? 'aktif';
        if (!in_array($status, ['aktif', 'selesai', 'all'], true)) error_response('Status transaksi tidak valid.', 422);
        $where = $status === 'all' ? '' : 'WHERE t.status = :status';
        $query = db()->prepare("SELECT t.*, a.name AS area_name, a.code AS area_code, u.name AS creator_name FROM parking_transactions t JOIN parking_areas a ON a.id = t.area_id JOIN users u ON u.id = t.created_by {$where} ORDER BY t.entry_at DESC LIMIT 200");
        if ($status !== 'all') $query->execute([':status' => $status]); else $query->execute();
        json_response(array_map('transaction_view', $query->fetchAll()));
    }
    if ($method === 'GET' && $id && !$action) json_response(find_transaction($id));
    if ($method === 'POST' && !$id) {
        $input = body();
        $plate = normalize_plate(required_string($input, 'plate_number', 20));
        $type = enum_value($input, 'vehicle_type', ['motor', 'mobil', 'truk']);
        $brand = optional_string($input, 'vehicle_brand', 80);
        $areaId = (int) ($input['area_id'] ?? 0);
        $vehicleId = !empty($input['vehicle_id']) ? (int) $input['vehicle_id'] : null;
        $pdo = db();
        $pdo->beginTransaction();
        try {
            $areaQuery = $pdo->prepare('SELECT * FROM parking_areas WHERE id = :id FOR UPDATE');
            $areaQuery->execute([':id' => $areaId]);
            $area = $areaQuery->fetch();
            if (!$area || $area['status'] !== 'aktif') error_response('Area parkir tidak tersedia.', 422);
            $occupied = $pdo->prepare('SELECT COUNT(*) FROM parking_transactions WHERE area_id = :area_id AND status = \'aktif\'');
            $occupied->execute([':area_id' => $areaId]);
            if ((int) $occupied->fetchColumn() >= (int) $area['capacity']) error_response('Area parkir sudah penuh.', 422);
            $duplicate = $pdo->prepare('SELECT id FROM parking_transactions WHERE plate_number = :plate AND status = \'aktif\' LIMIT 1');
            $duplicate->execute([':plate' => $plate]);
            if ($duplicate->fetch()) error_response('Kendaraan masih memiliki tiket aktif.', 409);
            $rateQuery = $pdo->prepare('SELECT rate_per_hour FROM parking_rates WHERE vehicle_type = :type AND status = \'aktif\' ORDER BY id DESC LIMIT 1');
            $rateQuery->execute([':type' => $type]);
            $rate = (int) ($rateQuery->fetchColumn() ?: 0);
            if ($rate <= 0) error_response('Tarif aktif untuk jenis kendaraan ini belum tersedia.', 422);
            if ($vehicleId) {
                $vehicleQuery = $pdo->prepare('SELECT id FROM vehicles WHERE id = :id');
                $vehicleQuery->execute([':id' => $vehicleId]);
                if (!$vehicleQuery->fetch()) error_response('Data kendaraan tidak ditemukan.', 422);
            }
            $dateCode = date('Ymd');
            $numberQuery = $pdo->prepare('SELECT COUNT(*) + 1 FROM parking_transactions WHERE ticket_code LIKE :prefix');
            $numberQuery->execute([':prefix' => "PK-{$dateCode}-%"]);
            $code = sprintf('PK-%s-%04d', $dateCode, (int) $numberQuery->fetchColumn());
            $insert = $pdo->prepare('INSERT INTO parking_transactions (ticket_code, vehicle_id, plate_number, vehicle_type, vehicle_brand, area_id, rate_per_hour, entry_at, status, created_by) VALUES (:code, :vehicle_id, :plate, :type, :brand, :area_id, :rate, NOW(), \'aktif\', :created_by)');
            $insert->execute([':code' => $code, ':vehicle_id' => $vehicleId, ':plate' => $plate, ':type' => $type, ':brand' => $brand, ':area_id' => $areaId, ':rate' => $rate, ':created_by' => $actor['id']]);
            $newId = $pdo->lastInsertId();
            audit($actor, 'Menerbitkan tiket parkir', "{$code} untuk {$plate} di {$area['name']}", 'loket');
            $pdo->commit();
            json_response(find_transaction($newId), 201);
        } catch (Throwable $error) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            throw $error;
        }
    }
    if ($method === 'POST' && $id && $action === 'checkout') {
        $pdo = db();
        $pdo->beginTransaction();
        try {
            $transaction = find_transaction($id, true);
            if ($transaction['status'] !== 'aktif') error_response('Transaksi ini sudah selesai.', 409);
            $duration = max(1, (int) ceil((time() - strtotime($transaction['entry_at'])) / 3600));
            $total = $duration * (int) $transaction['rate_per_hour'];
            $update = $pdo->prepare('UPDATE parking_transactions SET exit_at = NOW(), duration_hours = :duration, total_amount = :total, status = \'selesai\' WHERE id = :id');
            $update->execute([':duration' => $duration, ':total' => $total, ':id' => $id]);
            audit($actor, 'Menyelesaikan transaksi', "{$transaction['ticket_code']} - {$transaction['plate_number']} total {$total}", 'transaksi');
            $pdo->commit();
            json_response(find_transaction($id));
        } catch (Throwable $error) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            throw $error;
        }
    }
    error_response('Endpoint transaksi tidak ditemukan.', 404);
}

function dashboard_route()
{
    require_auth(['admin', 'petugas', 'owner']);
    $pdo = db();
    $active = (int) $pdo->query('SELECT COUNT(*) FROM parking_transactions WHERE status = \'aktif\'')->fetchColumn();
    $today = $pdo->query('SELECT COUNT(*) FROM parking_transactions WHERE DATE(entry_at) = CURDATE()')->fetchColumn();
    $revenue = $pdo->query('SELECT COALESCE(SUM(total_amount), 0) FROM parking_transactions WHERE status = \'selesai\'')->fetchColumn();
    $capacity = $pdo->query('SELECT COALESCE(SUM(capacity), 0) FROM parking_areas WHERE status = \'aktif\'')->fetchColumn();
    json_response(['active_vehicles' => $active, 'today_transactions' => (int) $today, 'revenue' => (int) $revenue, 'capacity' => (int) $capacity, 'available_slots' => max(0, (int) $capacity - $active)]);
}

function health_route()
{
    db()->query('SELECT 1');
    json_response(['service' => 'parkirku-api', 'status' => 'ok', 'time' => date(DATE_ATOM)]);
}

function reports_route()
{
    require_auth(['admin', 'owner']);
    $from = $_GET['from'] ?? date('Y-m-d', strtotime('-6 days'));
    $to = $_GET['to'] ?? date('Y-m-d');
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $from) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $to) || $from > $to) error_response('Periode laporan tidak valid.', 422);
    $query = db()->prepare('SELECT t.*, a.name AS area_name, a.code AS area_code, u.name AS creator_name FROM parking_transactions t JOIN parking_areas a ON a.id = t.area_id JOIN users u ON u.id = t.created_by WHERE t.entry_at >= :from AND t.entry_at < DATE_ADD(:to, INTERVAL 1 DAY) ORDER BY t.entry_at DESC');
    $query->execute([':from' => "{$from} 00:00:00", ':to' => "{$to} 00:00:00"]);
    $rows = array_map('transaction_view', $query->fetchAll());
    $completed = array_filter($rows, static function (array $row): bool { return $row['status'] === 'selesai'; });
    json_response(['from' => $from, 'to' => $to, 'summary' => ['total_transactions' => count($rows), 'completed' => count($completed), 'active' => count($rows) - count($completed), 'revenue' => array_sum(array_column($completed, 'total_amount'))], 'transactions' => $rows]);
}

function logs_route()
{
    require_auth(['admin', 'owner']);
    $limit = min(200, max(1, (int) ($_GET['limit'] ?? 100)));
    $query = db()->prepare('SELECT l.*, u.name AS user_name, u.role FROM activity_logs l LEFT JOIN users u ON u.id = l.user_id ORDER BY l.created_at DESC LIMIT :limit');
    $query->bindValue(':limit', $limit, PDO::PARAM_INT);
    $query->execute();
    json_response($query->fetchAll());
}

try {
    $segments = route_segments();
    $resource = $segments[0] ?? '';
    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    switch ($resource) {
        case 'auth': auth_route($segments, $method); break;
        case 'users': users_route($segments, $method); break;
        case 'tariffs':
        case 'areas': simple_master_route($resource, $segments, $method); break;
        case 'vehicles': vehicles_route($segments, $method); break;
        case 'transactions': transactions_route($segments, $method); break;
        case 'health': health_route(); break;
        case 'dashboard': dashboard_route(); break;
        case 'reports': reports_route(); break;
        case 'logs': logs_route(); break;
        default: error_response('Endpoint tidak ditemukan.', 404);
    }
} catch (PDOException $error) {
    error_log($error->getMessage());
    error_response('Terjadi kesalahan database. Periksa konfigurasi koneksi.', 500);
} catch (Throwable $error) {
    error_log($error->getMessage());
    error_response('Terjadi kesalahan internal pada server.', 500);
}
