<?php
require __DIR__ . '/../private/bootstrap.php';
require __DIR__ . '/../private/views/guide.php';
guideStart('Dostępność kalendarza', 'Możesz odkrywać zadania klawiaturą, czytać je bez animacji i wracać do dostępnych dni w dowolnej kolejności.');
?>
<section><h2>Poruszanie się klawiaturą</h2><p>Na początku strony naciśnij <kbd>Tab</kbd>, aby wyświetlić link „Przejdź do treści”. Kolejne naciśnięcia przechodzą między linkami i przyciskami; <kbd>Shift</kbd> + <kbd>Tab</kbd> przenosi wstecz.</p>
<p>Na dostępnym okienku naciśnij <kbd>Enter</kbd> lub spację, aby przeczytać zadanie. Naciśnij <kbd>Esc</kbd> lub wybierz „Wróć do kalendarza”, aby zamknąć zadanie. Fokus wróci do tego samego okienka.</p></section>
<section><h2>Czytanie zadań</h2><ul>
<li>Czytnik ekranu otrzymuje numer dnia oraz informację, czy okienko jest dostępne i czy zostało już otwarte.</li>
<li>Ustawienie ograniczenia ruchu w systemie wyłącza animację otwierania. Tekst możesz powiększyć w przeglądarce.</li>
<li>Bez JavaScript pod siatką znajdziesz linki do zadań dostępnych w danym dniu. Każdy prowadzi do osobnej strony z tekstem.</li>
</ul></section>
<section><h2>Jak zgłosić problem?</h2>
<p>Jeśli okienko się nie otwiera, nie możesz przeczytać zadania lub coś innego utrudnia Ci korzystanie z kalendarza, <a href="#kontakt">napisz lub zadzwoń do Ośrodka</a>. Opisz, co się dzieje, i podaj adres strony lub numer okienka. Możesz też poprosić o przesłanie treści zadania e-mailem.</p>
<p>Naprawimy zgłoszony problem tak szybko, jak to możliwe, najpóźniej w ciągu <strong>5 dni od otrzymania zgłoszenia</strong>.</p>
<p><a href="https://soa-katowice.pl/deklaracja-dostepnosci/">Informacje o wnioskach i skargach dotyczących dostępności oraz o dostępności siedziby ŚOA</a>.</p></section>
<?php guideContact(false); guideEnd(); ?>
