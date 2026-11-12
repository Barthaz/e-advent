<?php
require __DIR__ . '/../private/bootstrap.php';
require __DIR__ . '/../private/views/layout.php';
$state = campaignState(appNow());
$tasks = availableTasks(require __DIR__ . '/../private/tasks.php', $state);
pageStart('24 dni do bliskości');
?>
<main id="main" tabindex="-1" data-calendar data-phase="<?= e($state['phase']) ?>" data-available="<?= $state['available'] ?>"
      data-refresh-after="<?= $state['refreshAfter'] ?>" data-tasks="<?= e(json_encode((object)$tasks, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR)) ?>">
<section class="winter-section" aria-labelledby="calendar-heading">
<div class="hero">
<p class="season-label"><span aria-hidden="true">✦</span> E-kalendarz adwentowy · 2026 <span aria-hidden="true">✦</span></p>
<h1 id="calendar-heading">24 dni <em>do bliskości</em></h1>
<p class="hero-description">Za każdym okienkiem czeka małe zadanie. Otwórzcie je i znajdźcie<br class="desktop-break"> chwilę na uważność, odpoczynek i troskę o siebie.</p></div>
<div class="calendar-wrap" id="kalendarz">
<img class="chalet-roof" src="/assets/decor/chalet-roof.webp" alt="" width="1450" height="342">
<div class="chalet-wall"><div class="calendar-toolbar"><div class="calendar-availability"><img src="/assets/decor/lantern.svg" alt="" width="42" height="48"><p id="calendar-status" role="status"><?php
echo match($state['phase']) { 'upcoming' => 'Zaczynamy 1 grudnia', 'ended' => 'Dziękujemy za wspólny grudzień. Kalendarz zakończył działanie.', default => $state['available'] === 1 ? 'Dostępne okienko: 1' : 'Dostępne okienka: 1–' . $state['available'] };
?></p></div><div class="calendar-progress"><div class="progress-heading"><label for="calendar-progress">Odkryte okienka</label><span id="progress-label"><strong id="progress-count">0</strong> / 24</span></div><div class="window-meter"><progress id="calendar-progress" max="24" value="0">0 z 24</progress></div></div></div>
<div class="calendar-grid" <?= $state['phase'] === 'ended' ? 'hidden' : '' ?>>
<?php for ($day = 1; $day <= 24; $day++): $available = $day <= $state['available']; ?>
<button type="button" class="calendar-tile <?= $day === 24 ? 'final-tile' : '' ?>" data-day="<?= $day ?>" aria-disabled="<?= $available ? 'false' : 'true' ?>" aria-label="Dzień <?= $day ?>, <?= $available ? 'dostępne, nieotwarte' : 'dostępny od ' . $day . ' grudnia' ?>">
<span class="tile-date"><img class="tile-logo" src="/assets/branding/soa-logo.png" width="200" height="151" alt=""><span class="tile-number"><?= $day ?></span></span><span class="tile-title" aria-hidden="true"></span>
<span class="tile-check" aria-hidden="true">✓</span></button>
<?php endfor; ?></div></div>
<noscript><p>JavaScript jest wyłączony. Dostępne zadania możesz przeczytać poniżej.</p><?php for ($d=1; $d<=$state['available']; $d++): ?><a class="button secondary" href="/dzien/<?= $d ?>"><?= $d ?> grudnia</a> <?php endfor; ?></noscript>
<p class="calendar-note">Każdego dnia otwiera się jedna nowa chwila. Do wcześniejszych możesz wracać aż do 26 grudnia.</p>
</div>
<div class="info-grid"><section class="paper-panel how-it-works"><h2>Jak to działa?</h2><ol class="steps"><li><img src="/assets/decor/step-calendar.svg" alt="" width="38" height="38"><div><strong>1. Otwórz okienko</strong><p>Poznaj dzisiejszą lub wcześniejszą propozycję.</p></div></li><li><img src="/assets/decor/step-pause.svg" alt="" width="38" height="38"><div><strong>2. Zróbcie coś dla siebie i swojej rodziny.</strong><p>Poświęćcie sobie kilka minut. W swoim tempie.</p></div></li><li><img src="/assets/decor/step-return.svg" alt="" width="38" height="38"><div><strong>3. Wróć jutro</strong><p>Odkryj kolejne zadanie na nowy dzień.</p></div></li></ol></section>
<section class="paper-panel" id="o-projekcie"><h2>O projekcie</h2><p>Zapraszamy do zapoznania się ze wsparciem realizowanym w ramach projektu „Skoordynowane wsparcie pre i post adopcyjne”.</p><a class="button" href="https://soa-katowice.pl/projekt/">Dowiedz się więcej <span aria-hidden="true">›</span></a></section></div>
</section>
<section class="storage-note" aria-label="Historia otwarć"><details><summary>O zapamiętywaniu otwartych okienek</summary><p>Po wyrażeniu zgody historia otwarć zostaje zapisana tylko w tej przeglądarce. Bez zgody okienka pamiętamy do zamknięcia lub odświeżenia strony. Wszystkie dostępne zadania nadal możesz otworzyć. Wybór zmienisz w ustawieniach prywatności w stopce.</p><button class="text-button" id="reset-progress" type="button">Wyczyść lokalną historię otwarć</button></details><p id="storage-status" role="status"></p></section>
</main>
<dialog id="task-dialog" aria-labelledby="task-title" aria-describedby="task-body"><div class="dialog-inner"><button type="button" class="dialog-close" aria-label="Zamknij zadanie">×</button><img class="title-sprig" src="/assets/decor/sprig-title.webp" alt="" width="140" height="48"><p class="eyebrow" id="task-date"></p><h2 id="task-title"></h2><p class="duration" id="task-duration"></p><p id="task-body"></p><p class="gentle-note">To chwila dla Ciebie. Możesz z niej skorzystać tak, jak potrzebujesz.</p><button class="button dialog-done" type="button">Wróć do kalendarza</button><?php taskSignature(); ?></div></dialog>
<script type="module" src="/assets/js/calendar.js?v=20261109"></script>
<?php pageEnd(); ?>
