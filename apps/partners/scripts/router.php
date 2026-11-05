<?php
// Local PHP server only; Apache uses public/.htaccess on SeoHost.
$path = rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
$root = realpath(__DIR__ . '/../public');
$file = realpath($root . $path);
if ($file && str_starts_with($file, $root . DIRECTORY_SEPARATOR) && !str_contains($path, '/.') && is_file($file)) return false;
if ($path === '/' || $path === '/statystyki' || $path === '/statystyki/') {
    require $root . ($path === '/' ? '/index.php' : '/statystyki/index.php');
    return true;
}
http_response_code(404);
echo 'Nie znaleziono strony.';
