<?php
require __DIR__ . '/../private/bootstrap.php';
require __DIR__ . '/../private/views/layout.php';
$state = campaignState(appNow());
pageStart('E-kalendarz adwentowy');
?>
<main id="main" tabindex="-1" data-calendar data-phase="<?= e($state['phase']) ?>" data-available="<?= $state['available'] ?>">
<section class="winter-section" aria-labelledby="calendar-heading">
<div class="hero"><img class="title-sprig" src="/assets/decor/sprig-title.webp" alt="" width="180" height="62">
<h1 id="calendar-heading">E-kalendarz adwentowy</h1><img class="gold-rule" src="/assets/decor/flourish.svg" alt="" width="270" height="20">
<p class="project-ribbon">Projekt „Skoordynowane wsparcie pre i post adopcyjne”</p>
<p class="hero-description">Codzienne zadania, które pomagają zadbać o uważność, relaks<br class="desktop-break"> i troskę o siebie — w spokojnym, grudniowym rytmie.</p></div>
<div class="calendar-wrap" id="kalendarz"><div class="calendar-toolbar"><div class="calendar-availability"><img src="/assets/decor/step-calendar.svg" alt="" width="30" height="30"><p id="calendar-status" role="status"><?php
echo match($state['phase']) { 'upcoming' => 'Zaczynamy 1 grudnia', 'ended' => 'Dziękujemy za wspólny grudzień. Kalendarz zakończył działanie.', default => $state['available'] === 1 ? 'Dostępne okienko: 1' : 'Dostępne okienka: 1–' . $state['available'] };
?></p></div><div class="calendar-progress"><div class="progress-heading"><label for="calendar-progress">Odkryte okienka</label><span id="progress-label"><strong id="progress-count">0</strong> / 24</span></div><progress id="calendar-progress" max="24" value="0">0 z 24</progress></div></div>
<div class="calendar-grid" <?= $state['phase'] === 'ended' ? 'hidden' : '' ?>>
<?php for ($day = 1; $day <= 24; $day++): $available = $day <= $state['available']; ?>
<button type="button" class="calendar-tile <?= $day === 24 ? 'final-tile' : '' ?>" data-day="<?= $day ?>" aria-disabled="<?= $available ? 'false' : 'true' ?>" aria-label="Dzień <?= $day ?>, <?= $available ? 'dostępne, nieotwarte' : 'dostępny od ' . $day . ' grudnia' ?>">
<span class="tile-number"><?= $day ?></span><span class="tile-title" aria-hidden="true"></span>
<span class="tile-check" aria-hidden="true">✓</span></button>
<?php endfor; ?></div>
<noscript><p>JavaScript jest wyłączony. Dostępne zadania możesz przeczytać poniżej.</p><?php for ($d=1; $d<=$state['available']; $d++): ?><a class="button secondary" href="/dzien.php?day=<?= $d ?>"><?= $d ?> grudnia</a> <?php endfor; ?></noscript>
<p class="calendar-note">Każdego dnia otwiera się jedna nowa chwila. Do wcześniejszych możesz wracać aż do 26 grudnia.</p>
</div>
<div class="info-grid"><section class="paper-panel how-it-works"><h2>Jak to działa?</h2><ol class="steps"><li><img src="/assets/decor/step-calendar.svg" alt="" width="38" height="38"><div><strong>1. Otwórz okienko</strong><p>Poznaj dzisiejszą lub wcześniejszą propozycję.</p></div></li><li><img src="/assets/decor/step-pause.svg" alt="" width="38" height="38"><div><strong>2. Zrób coś dla siebie</strong><p>Poświęć sobie kilka minut. W swoim tempie.</p></div></li><li><img src="/assets/decor/step-return.svg" alt="" width="38" height="38"><div><strong>3. Wróć jutro</strong><p>Odkryj kolejne zadanie na nowy dzień.</p></div></li></ol></section>
<section class="paper-panel" id="o-projekcie"><h2>O projekcie</h2><p>E-kalendarz to część projektu „Skoordynowane wsparcie pre i post adopcyjne”, realizowanego przez Śląski Ośrodek Adopcyjny w Katowicach.</p><p>Codzienna troska o siebie i odrobina spokoju w okresie świątecznym.</p><a class="button" href="https://soa-katowice.pl/projekt/">Dowiedz się więcej <span aria-hidden="true">›</span></a></section></div>
</section>
<section class="storage-note" aria-label="Historia otwarć"><details><summary>O zapamiętywaniu otwartych okienek</summary><p>Po wyrażeniu zgody historia otwarć zostaje zapisana tylko w tej przeglądarce. Bez zgody okienka pamiętamy do zamknięcia lub odświeżenia strony. Wszystkie dostępne zadania nadal możesz otworzyć. Wybór zmienisz w ustawieniach prywatności w stopce.</p><button class="text-button" id="reset-progress" type="button">Wyczyść lokalną historię otwarć</button></details><p id="storage-status" role="status"></p></section>
</main>
<dialog id="task-dialog" aria-labelledby="task-title" aria-describedby="task-body"><div class="dialog-inner"><button type="button" class="dialog-close" aria-label="Zamknij zadanie">×</button><img class="title-sprig" src="/assets/decor/sprig-title.webp" alt="" width="140" height="48"><p class="eyebrow" id="task-date"></p><h2 id="task-title"></h2><p class="duration" id="task-duration"></p><p id="task-body"></p><p class="gentle-note">To chwila dla Ciebie. Możesz z niej skorzystać tak, jak potrzebujesz.</p><div class="task-funding"><strong>Śląski Ośrodek Adopcyjny w Katowicach</strong><p><?= e($config['funding_text'] ?: 'Projekt „Skoordynowane wsparcie pre i post adopcyjne”') ?></p></div><button class="button dialog-done" type="button">Wróć do kalendarza</button></div></dialog>
<script type="module" src="/assets/js/calendar.js"></script>
<?php pageEnd(); ?>
