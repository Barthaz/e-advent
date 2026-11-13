<?php
require __DIR__ . '/../../private/bootstrap.php';
require __DIR__ . '/../../private/auth.php';
require __DIR__ . '/../../private/views/layout.php';
$error = ''; csrf();
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    requirePost();
    if (!verifyCsrf($_POST['csrf'] ?? null)) { http_response_code(403); $error = 'Sesja formularza wygasła. Spróbuj ponownie.'; }
    elseif (!rateLimit('login', 8, 900)) { http_response_code(429); $error = 'Zbyt wiele prób. Spróbuj ponownie za 15 minut.'; }
    elseif ($config['admin_password_hash'] && is_string($_POST['password'] ?? null) && strlen($_POST['password']) <= 256 && password_verify($_POST['password'], $config['admin_password_hash'])) {
        session_regenerate_id(true); $_SESSION['admin'] = true; $_SESSION['last_activity'] = time(); $_SESSION['csrf'] = bin2hex(random_bytes(32));
        header('Location: /statystyki/', true, 303); exit;
    } else { http_response_code(401); $error = 'Nieprawidłowe hasło lub dostęp nie został jeszcze skonfigurowany.'; }
}
pageStart('Dostęp do statystyk', 'document'); ?>
<main id="main" class="login-wrap"><section class="paper-panel login-panel"><img class="title-sprig" src="/assets/decor/sprig-title.webp" alt="Gałązka świąteczna" width="150" height="52"><p class="eyebrow">Panel organizatora</p><h1>Chwile w liczbach</h1><p>Zaloguj się, aby zobaczyć zbiorcze statystyki kalendarza i pobrać raport.</p>
<?php if ($error): ?><p class="error" role="alert"><?= e($error) ?></p><?php endif; ?>
<form method="post"><input type="hidden" name="csrf" value="<?= e(csrf()) ?>"><label for="password">Hasło dostępu</label><input id="password" name="password" type="password" autocomplete="current-password" required maxlength="256"><button class="button" type="submit">Przejdź do statystyk <span aria-hidden="true">→</span></button></form><p class="muted">Dostęp wyłącznie dla upoważnionych osób.</p></section></main>
<?php pageEnd(); ?>
