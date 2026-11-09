<?php
require __DIR__ . '/../private/bootstrap.php';
require __DIR__ . '/../private/views/guide.php';
$analytics = $config['analytics_enabled'] && $config['analytics_approved'] && $config['stats_source'] === 'mysql';
guideStart('Polityka prywatności', 'Kalendarz możesz otwierać bez konta. Ty decydujesz, czy po powrocie na tym urządzeniu zobaczysz wcześniej odkryte okienka.');
?>
<section><h2>Co dzieje się po otwarciu okienka?</h2>
<p>Kalendarz prowadzi Śląski Ośrodek Adopcyjny w Katowicach. Gdy otwierasz dzień, przeglądarka pobiera dostępne zadania z serwera. Nie prosimy o imię, e-mail ani odpowiedzi na ćwiczenia. Bez zgody na zapamiętywanie numer otwartego dnia pozostaje tylko w bieżącej karcie i znika po jej odświeżeniu.</p></section>
<section><h2>Co zapisuje przeglądarka?</h2>
<dl class="guide-definitions">
<dt>Twój wybór prywatności</dt><dd>Zgodę i odmowę zapamiętujemy na 180 dni w lokalnej pamięci przeglądarki (klucz <code>soa_privacy_preferences</code>). Po upływie tego czasu lub zmianie wersji komunikatu poprosimy o ponowny wybór.</dd>
<dt>Historia otwartych dni</dt><dd>Po Twojej zgodzie zapisujemy na urządzeniu listę numerów okienek (<code>soa_advent_2026_progress_v1</code>). Nie wysyłamy tej listy na serwer. Wyłączenie zapamiętywania usuwa zapis. Możesz też wyczyścić go pod kalendarzem albo w ustawieniach przeglądarki.</dd>
<dt>Plik cookie sesji</dt><dd><code>soa_session</code> służy do logowania organizatora oraz, gdy pomiar jest dostępny, do potwierdzenia zgody na statystyki. Jest to plik na czas sesji przeglądarki. Samo czytanie zadań nie wymaga logowania.</dd></dl></section>
<section><h2>Jak zmienić decyzję?</h2><p>„Akceptuję wszystkie” włącza dostępne opcje. W „Dostosuj ustawienia” możesz zapisać tylko historię, wyłączyć ją lub odrzucić wszystkie opcje. Wstępne zaznaczenie historii w formularzu nie uruchamia zapisu. W każdej chwili możesz wrócić do ustawień. Odmowa nie ogranicza dostępu do zadań.</p>
<button class="button secondary" type="button" data-privacy-open hidden>Zmień ustawienia prywatności</button></section>
<section><h2>Statystyki kalendarza</h2>
<?php if ($analytics): ?><p>Pomiar jest dobrowolny. Po zgodzie wysyłamy do serwera rodzaj zdarzenia i, przy otwarciu okienka, numer dnia. Serwer zlicza odsłony i otwarcia, także powtórne. Raport nie pokazuje pojedynczych osób ani wykonania ćwiczenia. Wycofanie zgody zatrzymuje kolejne zdarzenia; wcześniej zsumowanych wyników nie można przypisać do konkretnej osoby.</p>
<?php else: ?><p>Pomiar jest wyłączony. Nie wysyłamy zdarzeń analitycznych dotyczących odsłon ani otwierania okienek. Jeśli pomiar zostanie uruchomiony, przeglądarka poprosi o nowy wybór.</p><?php endif; ?></section>
<section><h2>Obsługa techniczna i Twoje prawa</h2><p>Serwer obsługuje połączenie z Twojego adresu IP. Hosting może rejestrować dane techniczne połączeń, a aplikacja używa czasowego skrótu adresu sieciowego do ograniczenia liczby prób logowania i wybranych żądań. Funkcje te chronią serwis. Dane techniczne mogą być dostępne dla osób utrzymujących serwis i dostawcy hostingu w zakresie potrzebnym do jego obsługi. Kalendarz nie ma reklam ani profili uczestników.</p>
<p>W sprawach danych skontaktuj się z Ośrodkiem lub inspektorem ochrony danych. W zależności od podstawy przetwarzania możesz m.in. poprosić o dostęp do swoich danych, ich sprostowanie, usunięcie lub ograniczenie przetwarzania. Zgodę możesz wycofać na przyszłość. Przysługuje Ci także <a href="https://uodo.gov.pl/pl/504/2247">prawo złożenia skargi do Prezesa UODO</a>.</p></section>
<?php guideContact(true); guideEnd(); ?>
