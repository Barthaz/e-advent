<?php
if (PHP_SAPI !== 'cli') exit;
fwrite(STDERR, "Podaj nowe hasło (minimum 16 znaków) na stdin. Nie przekazuj go w argumentach polecenia.\n");
$password = trim(fgets(STDIN) ?: '');
if (strlen($password) < 16) { fwrite(STDERR, "Hasło jest zbyt krótkie.\n"); exit(1); }
$file = __DIR__ . '/../private/config.local.php';
$config = is_file($file) ? require $file : [];
$config['admin_password_hash'] = password_hash($password, PASSWORD_DEFAULT);
$config['security_key'] ??= bin2hex(random_bytes(32));
file_put_contents($file, "<?php\nreturn " . var_export($config, true) . ";\n"); chmod($file, 0600);
echo "Hasło ustawione.\n";
