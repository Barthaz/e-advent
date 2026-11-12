<?php
function fundingStrip(): void {
    ?>
    <picture><source media="(max-width: 600px)" srcset="/assets/branding/funding-strip-small.png" width="552" height="216">
    <img class="funding-image" src="/assets/branding/funding-strip.png" width="1024" height="108" alt="Fundusze Europejskie dla Śląskiego. Rzeczpospolita Polska. Dofinansowane przez Unię Europejską. Województwo Śląskie."></picture>
    <?php
}
function taskSignature(): void { ?>
    <footer class="task-signature">
        <img src="/assets/branding/soa-logo.png" alt="" width="200" height="151">
        <div><span>Z życzeniami bliskości</span><strong>Śląski Ośrodek Adopcyjny w Katowicach</strong></div>
    </footer>
<?php }
function pageStart(string $title, string $section = 'public'): void {
    global $config;
    ?>
<!doctype html>
<html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= e($title) ?> · Śląski Ośrodek Adopcyjny</title>
<meta name="description" content="Codzienna chwila uważności, relaksu i troski o siebie. E-kalendarz projektu Skoordynowane wsparcie pre i post adopcyjne.">
<link rel="stylesheet" href="/assets/css/app.css?v=20261109">
<?php if ($section === 'public'): ?><link rel="stylesheet" href="/assets/css/chalet.css?v=20261108c"><?php endif; ?>
<link rel="preload" as="image" href="/assets/calendar/open.webp">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
</head><body class="<?= e($section) ?>-page">
<a class="skip-link" href="#main">Przejdź do treści</a>
<?php if ($config['environment'] !== 'production'): ?><div class="demo-banner">Podgląd projektu · przykładowe zadania i statystyki</div><?php endif; ?>
<header class="site-header"><div class="header-inner"><a class="brand" href="/">
<img class="brand-mark" src="/assets/branding/soa-logo.png" alt="" width="50" height="42">
<span>Śląski Ośrodek Adopcyjny<small>w Katowicach</small></span></a>
<?php if ($section === 'public'): ?><a class="platform-brand" href="https://e-advent.pl"><span>We współpracy z</span><img src="/assets/branding/e-advent-logo.png" alt="e-Advent" width="94" height="60"></a><?php elseif ($section === 'stats'): ?><form action="/api/logout.php" method="post"><input type="hidden" name="csrf" value="<?= e(csrf()) ?>"><button class="header-link" type="submit">Wyloguj się</button></form><?php else: ?><a class="header-link" href="/">Do kalendarza</a><?php endif; ?>
</div></header>
<?php }
function pageEnd(bool $showFunding = true): void {
    global $config;
    ?>
<?php if ($showFunding): ?><div class="funding-strip"><?php fundingStrip(); ?></div><?php endif; ?>
<footer class="site-footer"><div class="footer-inner"><div><p><strong>Śląski Ośrodek Adopcyjny w Katowicach</strong> - zrealizowano w ramach Projektu „Skoordynowane wsparcie pre i post adopcyjne”</p><nav aria-label="Informacje"><a href="/prywatnosc">Prywatność</a><a href="/dostepnosc">Dostępność</a><button class="footer-privacy" type="button" data-privacy-open hidden>Ustawienia prywatności</button></nav><p id="privacy-footer-status" role="status"></p></div><a class="credit" href="https://e-advent.pl" rel="nofollow">Realizacja techniczna<img src="/assets/branding/e-advent-logo.png" alt="e-Advent" width="94" height="70" loading="lazy"></a></div></footer>
<?php require __DIR__ . '/privacy.php'; ?>
</body></html>
<?php }
