<?php
require __DIR__ . '/../../private/bootstrap.php';
require __DIR__ . '/../../private/auth.php';
requirePost();
$body = jsonBody();
if (!isset($body['grant']) || !is_bool($body['grant'])) jsonResponse(['error' => 'Nieprawidłowy wybór.'], 400);
if ($body['grant'] && (!$config['analytics_enabled'] || !$config['analytics_approved'] || $config['stats_source'] !== 'mysql')) jsonResponse(['error' => 'Pomiar jest wyłączony.'], 503);
// Refusal must not create a session cookie for a new visitor.
if (!$body['grant'] && empty($_COOKIE['soa_session'])) jsonResponse(['revoked' => true]);
startSession();
if ($body['grant']) {
    if (!rateLimit('consent', 30, 300)) jsonResponse(['error' => 'Spróbuj później.'], 429);
    $_SESSION['analytics_consent'] = $config['consent_version'];
    jsonResponse(['token' => csrf()]);
}
unset($_SESSION['analytics_consent']);
if (empty($_SESSION['admin'])) {
    $_SESSION = [];
    session_destroy();
    setcookie('soa_session', '', ['expires' => time() - 3600, 'path' => '/',
        'secure' => $config['environment'] === 'production', 'httponly' => true, 'samesite' => 'Strict']);
}
jsonResponse(['revoked' => true]);
