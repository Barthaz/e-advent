<?php
// Local PHP server only; production equivalents are in public/.htaccess.
$path = rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
$root = realpath(__DIR__ . '/../public');
$pages = [
    '/' => '/index.php', '/prywatnosc' => '/polityka-prywatnosci.php',
    '/dostepnosc' => '/deklaracja-dostepnosci.php', '/statystyki/' => '/statystyki/index.php',
    '/statystyki/logowanie' => '/statystyki/login.php', '/statystyki/eksport' => '/statystyki/export.php',
];
$query = $_SERVER['QUERY_STRING'] ?? '';
$redirect = array_search($path, $pages, true);
if ($path === '/statystyki') $redirect = '/statystyki/';
if ($path === '/dzien.php' && preg_match('/^day=([1-9]|1[0-9]|2[0-4])$/D', $query, $match)) {
    $redirect = '/dzien/' . $match[1]; $query = '';
}
if ($redirect !== false) {
    header('Location: ' . $redirect . ($query !== '' ? '?' . $query : ''), true, 308);
    return true;
}
$route = rtrim($path, '/');
if (preg_match('~^/dzien/([1-9]|1[0-9]|2[0-4])/?$~D', $path, $match)) {
    $_GET['day'] = $match[1];
    require $root . '/dzien.php';
    return true;
}
$page = $pages[$path] ?? $pages[$route] ?? null;
if ($page !== null) { require $root . $page; return true; }
$file = realpath($root . $path);
if ($file && str_starts_with($file, $root . DIRECTORY_SEPARATOR) && !str_contains($path, '/.') && is_file($file)) return false;
http_response_code(404);
echo 'Nie znaleziono strony.';
