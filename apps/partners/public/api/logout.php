<?php
require __DIR__ . '/../../private/bootstrap.php';
require __DIR__ . '/../../private/auth.php';
requirePost(); requireAdmin();
if (!verifyCsrf($_POST['csrf'] ?? null)) { http_response_code(403); exit('Nieprawidłowy token.'); }
$_SESSION = []; session_destroy();
setcookie(session_name(), '', ['expires' => time()-3600, 'path' => '/', 'secure' => $config['environment'] === 'production', 'httponly' => true, 'samesite' => 'Strict']);
header('Location: /statystyki/login.php', true, 303);
