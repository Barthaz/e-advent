<?php
require_once __DIR__ . '/layout.php';

function guideStart(string $title, string $intro): void {
    pageStart($title); // Same public header, partner logos and funding strip as the calendar.
    ?>
    <main id="main" tabindex="-1" class="guide-scene"><article class="guide-sheet">
    <header class="guide-heading"><a class="guide-back" href="/"><span aria-hidden="true">←</span> Wróć do kalendarza</a>
    <img src="/assets/decor/sprig-title.webp" alt="" width="120" height="40">
    <p class="eyebrow">E-kalendarz adwentowy · ŚOA</p><h1><?= e($title) ?></h1><p><?= e($intro) ?></p></header>
    <div class="guide-copy">
    <?php
}

function guideContact(bool $privacy): void {
    global $config;
    $email = $config['contact_email'] ?: 'osrodek@soa-katowice.pl';
    ?>
    <section class="guide-contact" id="kontakt"><h2><?= $privacy ? 'Kontakt w sprawie danych' : 'Kontakt z Ośrodkiem' ?></h2>
    <address>Śląski Ośrodek Adopcyjny w Katowicach<br>ul. Graniczna 29, 40-017 Katowice</address>
    <ul><li>E-mail: <a href="mailto:<?= e($email) ?>"><?= e($email) ?></a></li>
    <li>Centrala: <a href="tel:+48798913328">798 913 328</a></li>
    <?php if ($privacy): ?><li>Inspektor ochrony danych: <a href="mailto:iod@soa-katowice.pl">iod@soa-katowice.pl</a></li><?php endif; ?></ul>
    <a href="https://soa-katowice.pl/katowice/">Dane kontaktowe na stronie ŚOA</a></section>
    <?php
}
function guideEnd(): void { ?>
    </div></article></main>
    <?php pageEnd();
}
