<?php
$analyticsAvailable = $config['analytics_enabled'] && $config['analytics_approved'] && $config['stats_source'] === 'mysql';
?>
<section class="privacy-panel" id="privacy-panel" data-privacy data-version="<?= e($config['consent_version']) ?>:privacy-v2:<?= $analyticsAvailable ? 'analytics' : 'local' ?>" data-analytics="<?= $analyticsAvailable ? 'true' : 'false' ?>" aria-labelledby="privacy-title" hidden>
<div class="privacy-intro"><img src="/assets/decor/sprig-small.webp" alt="" width="76" height="32"><div><h2 id="privacy-title" tabindex="-1">Cookies i prywatność</h2><p>Możemy zapamiętywać otwarte okienka na tym urządzeniu. <?php if ($analyticsAvailable): ?>Za Twoją zgodą wysyłamy też do serwera kalendarza informacje o odsłonach i otwarciach okienek, aby tworzyć zbiorcze statystyki.<?php else: ?>Statystyki są obecnie wyłączone — nie wysyłamy zdarzeń analitycznych.<?php endif; ?> Kalendarz działa również bez opcjonalnych zgód.</p></div></div>
<div class="privacy-actions"><button class="button privacy-choice" type="button" id="privacy-reject">Tylko niezbędne</button><button class="button privacy-choice" type="button" id="privacy-accept"><?= $analyticsAvailable ? 'Akceptuję opcjonalne' : 'Zapamiętuj okienka' ?></button><button class="text-button" type="button" id="privacy-customize" aria-expanded="false" aria-controls="privacy-options">Dostosuj ustawienia</button></div>
<div id="privacy-options" class="privacy-options" hidden>
<div class="privacy-option"><div><h3>Niezbędne</h3><p>Zapis wyboru prywatności w pamięci przeglądarki na 180 dni. Plik cookie sesji służy logowaniu organizatora, a przy włączonej analityce również potwierdzeniu zgody.</p></div><span class="privacy-required">Zawsze aktywne</span></div>
<label class="privacy-option" for="privacy-history"><span><strong>Zapamiętywanie okienek</strong><span class="option-description">Numery odkrytych dni zapisujemy lokalnie (localStorage). Nie wysyłamy tej listy na serwer. Po wyłączeniu usuwamy zapis; w bieżącej karcie otwarcia nadal będą widoczne.</span></span><input type="checkbox" id="privacy-history"></label>
<label class="privacy-option" for="privacy-analytics"><span><strong>Statystyki kalendarza</strong><span class="option-description">Po zgodzie zliczamy odsłony oraz otwarcia, także ponowne. Nie przesyłamy odpowiedzi na zadania i nie liczymy unikalnych osób.<?= $analyticsAvailable ? '' : ' Ta funkcja jest obecnie wyłączona.' ?></span></span><input type="checkbox" id="privacy-analytics" <?= $analyticsAvailable ? '' : 'disabled' ?>></label>
<button class="button" type="button" id="privacy-save">Zapisz mój wybór</button>
</div>
<div class="privacy-bottom"><p>Cookies i pamięć przeglądarki (localStorage). Wybór zmienisz w stopce strony.</p><a href="/polityka-prywatnosci.php">Polityka prywatności</a></div><p id="privacy-feedback" class="privacy-feedback" role="status"></p>
</section>
<script type="module" src="/assets/js/privacy.js"></script>
<script type="module" src="/assets/js/analytics.js"></script>
