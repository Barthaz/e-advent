<?php
declare(strict_types=1);
function startSession(): void {
    global $config;
    if (session_status() === PHP_SESSION_ACTIVE) return;
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    session_name('soa_session');
    session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => $config['environment'] === 'production', 'httponly' => true, 'samesite' => 'Strict']);
    session_start();
}
function csrf(): string {
    startSession();
    return $_SESSION['csrf'] ??= bin2hex(random_bytes(32));
}
function verifyCsrf(mixed $value): bool { return is_string($value) && hash_equals(csrf(), $value); }
function requireAdmin(): void {
    global $config;
    startSession();
    if (empty($_SESSION['admin']) || time() - ($_SESSION['last_activity'] ?? 0) > $config['session_timeout']) {
        unset($_SESSION['admin']); header('Location: /statystyki/login.php', true, 303); exit;
    }
    $_SESSION['last_activity'] = time();
}
// A private, locked store works without MySQL. Never trust forwarded IP headers here.
function rateLimit(string $scope, int $limit, int $seconds): bool {
    global $config;
    $file = fopen(__DIR__ . '/storage/limits.json', 'c+');
    if (!$file || !flock($file, LOCK_EX)) throw new RuntimeException('Rate limit store unavailable');
    $records = json_decode(stream_get_contents($file) ?: '{}', true) ?: [];
    $now = time();
    $records = array_filter($records, fn($v) => ($v['expires'] ?? 0) > $now);
    $key = hash_hmac('sha256', $scope . '|' . ($_SERVER['REMOTE_ADDR'] ?? 'cli'), $config['security_key']);
    if (!isset($records[$key]) && count($records) >= 2000) { flock($file, LOCK_UN); fclose($file); return false; }
    $record = $records[$key] ?? ['count' => 0, 'expires' => $now + $seconds];
    $allowed = $record['count'] < $limit;
    $record['count']++;
    $records[$key] = $record;
    rewind($file); ftruncate($file, 0); fwrite($file, json_encode($records, JSON_THROW_ON_ERROR));
    fflush($file); flock($file, LOCK_UN); fclose($file);
    return $allowed;
}
