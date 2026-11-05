<?php
if (PHP_SAPI !== 'cli') exit;
$target = __DIR__ . '/../private/config.local.php';
if (is_file($target)) { fwrite(STDERR, "config.local.php już istnieje — konfiguracja nie została nadpisana.\n"); exit(1); }
$password = bin2hex(random_bytes(12));
$config = ['environment'=>'development', 'base_url'=>'http://127.0.0.1:5180', 'preview_now'=>'2026-12-10 12:00:00', 'stats_source'=>'mock', 'admin_password_hash'=>password_hash($password, PASSWORD_DEFAULT), 'security_key'=>bin2hex(random_bytes(32))];
file_put_contents($target, "<?php\nreturn " . var_export($config, true) . ";\n");
file_put_contents(__DIR__ . '/../private/storage/demo-access.txt', "Lokalny panel: http://127.0.0.1:5180/statystyki/\nHasło: " . $password . "\nTylko demo; zmień przed wdrożeniem.\n");
chmod($target, 0600);
echo "Gotowe: podgląd 10 grudnia, fikcyjne statystyki. Hasło zapisano w private/storage/demo-access.txt (ignorowany przez Git i paczkowanie).\n";
