<?php
function fundingStrip(): void {
    if (is_file(__DIR__ . '/../../public/assets/branding/fe-sl-official-strip.svg')) {
        echo '<img class="funding-image" src="/assets/branding/fe-sl-official-strip.svg" alt="Fundusze Europejskie dla Śląskiego, Rzeczpospolita Polska, dofinansowane przez Unię Europejską, Województwo Śląskie">';
    } else {
        echo '<div class="funding-placeholder"><span>Fundusze Europejskie<br>dla Śląskiego</span><span>Rzeczpospolita<br>Polska</span><span>Dofinansowane przez<br>Unię Europejską</span><span>Województwo<br>Śląskie</span><small>Miejsce na oficjalne znaki finansowania — oczekuje na materiały ŚOA</small></div>';
    }
}
function pageStart(string $title, string $section = 'public'): void {
    global $config;
    ?>
<!doctype html>
<html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= e($title) ?> · Śląski Ośrodek Adopcyjny</title>
<meta name="description" content="Codzienna chwila uważności, relaksu i troski o siebie. E-kalendarz projektu Skoordynowane wsparcie pre i post adopcyjne.">
<link rel="stylesheet" href="/assets/css/app.css?v=20261104d">
<link rel="preload" as="image" href="/assets/calendar/open.webp">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
</head><body class="<?= e($section) ?>-page">
<a class="skip-link" href="#main">Przejdź do treści</a>
<?php if ($config['environment'] !== 'production'): ?><div class="demo-banner">Podgląd projektu · przykładowe zadania i statystyki · materiały ŚOA do uzupełnienia</div><?php endif; ?>
<div class="funding-strip"><?php fundingStrip(); ?></div>
<header class="site-header"><div class="header-inner"><a class="brand" href="/">
<?php if (is_file(__DIR__ . '/../../public/assets/branding/soa-logo.svg')): ?><img src="/assets/branding/soa-logo.svg" alt="" width="60" height="60"><?php endif; ?>
<span>Śląski Ośrodek Adopcyjny<small>w Katowicach</small></span></a>
<?php if ($section === 'public'): ?><a class="platform-brand" href="https://e-advent.pl"><span>We współpracy z</span><img src="/assets/branding/e-advent-logo.png" alt="e-Advent" width="94" height="60"></a><?php elseif ($section === 'stats'): ?><form action="/api/logout.php" method="post"><input type="hidden" name="csrf" value="<?= e(csrf()) ?>"><button class="header-link" type="submit">Wyloguj się</button></form><?php else: ?><a class="header-link" href="/">Do kalendarza</a><?php endif; ?>
</div></header>
<?php }
function pageEnd(): void {
    global $config;
    ?>
<footer class="site-footer"><div class="footer-inner"><div><strong>Śląski Ośrodek Adopcyjny w Katowicach</strong><p>Projekt „Skoordynowane wsparcie pre i post adopcyjne”</p><nav aria-label="Informacje"><a href="/polityka-prywatnosci.php">Prywatność</a><a href="/deklaracja-dostepnosci.php">Dostępność</a><button class="footer-privacy" type="button" data-privacy-open hidden>Ustawienia prywatności</button></nav><p id="privacy-footer-status" role="status"></p></div><a class="credit" href="https://e-advent.pl" rel="nofollow">Realizacja techniczna<img src="/assets/branding/e-advent-logo.png" alt="e-Advent" width="94" height="70" loading="lazy"></a></div></footer>
<?php require __DIR__ . '/privacy.php'; ?>
</body></html>
<?php }
