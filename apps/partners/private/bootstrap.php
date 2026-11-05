<?php
declare(strict_types=1);
$config = require __DIR__ . '/config.php';
date_default_timezone_set('Europe/Warsaw');
ini_set('display_errors', '0');
ini_set('log_errors', '1');
set_exception_handler(function (Throwable $error): void {
    error_log('[soa] ' . get_class($error) . ': ' . $error->getMessage());
    http_response_code(503);
    header('Content-Type: text/html; charset=utf-8');
    echo '<!doctype html><html lang="pl"><meta charset="utf-8"><title>Chwilowa przerwa</title><h1>Chwilowa przerwa</h1><p>Spróbuj ponownie za chwilę. Twoja lokalna historia pozostaje w przeglądarce.</p></html>';
});
header('Cache-Control: no-store, private');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');
header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'");
header('Permissions-Policy: camera=(), microphone=(), geolocation=()');
header('X-Robots-Tag: noindex, nofollow');
if ($config['environment'] === 'production') {
    if (empty($_SERVER['HTTPS']) || $_SERVER['HTTPS'] === 'off') {
        http_response_code(400); exit('Połączenie HTTPS jest wymagane.');
    }
    header('Strict-Transport-Security: max-age=31536000');
    if (!$config['content_approved'] || !$config['branding_approved'] || !$config['legal_approved']
        || $config['stats_source'] !== 'mysql' || $config['preview_now'] !== null
        || !$config['admin_password_hash'] || strlen($config['security_key']) < 32
        || !is_file(__DIR__ . '/../public/assets/branding/soa-logo.svg')
        || !is_file(__DIR__ . '/../public/assets/branding/fe-sl-official-strip.svg')) {
        throw new RuntimeException('Production readiness checks failed.');
    }
}
require_once __DIR__ . '/calendar.php';

function e(mixed $value): string { return htmlspecialchars((string)$value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
function appNow(): DateTimeImmutable {
    global $config;
    return new DateTimeImmutable($config['environment'] !== 'production' && $config['preview_now'] ? $config['preview_now'] : 'now', new DateTimeZone('Europe/Warsaw'));
}
function jsonResponse(array $data, int $status = 200): never {
    http_response_code($status); header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR); exit;
}
function requirePost(): void {
    global $config;
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') { header('Allow: POST'); jsonResponse(['error' => 'Niedozwolona metoda.'], 405); }
    if (($_SERVER['HTTP_ORIGIN'] ?? '') !== rtrim($config['base_url'], '/')) jsonResponse(['error' => 'Nieprawidłowe pochodzenie żądania.'], 403);
}
function jsonBody(): array {
    $body = file_get_contents('php://input', false, null, 0, 1025);
    if (strlen($body) > 1024) jsonResponse(['error' => 'Za duże żądanie.'], 413);
    if (strtolower(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0]) !== 'application/json') jsonResponse(['error' => 'Wymagany JSON.'], 415);
    try { $data = json_decode($body, true, 8, JSON_THROW_ON_ERROR); }
    catch (JsonException $e) { jsonResponse(['error' => 'Nieprawidłowy JSON.'], 400); }
    if (!is_array($data) || array_is_list($data)) jsonResponse(['error' => 'Nieprawidłowy obiekt.'], 400);
    return $data;
}
