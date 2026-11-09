# ŚOA × e-Advent — kalendarz partnerski 2026

Samodzielna aplikacja w monorepo e-advent dla `https://soa-katowice.e-advent.pl`.
PHP 8.2+ (zalecana aktualna wersja wspierana przez hosting), HTML, CSS i vanilla JavaScript.
Brak Reacta, bundlera, bibliotek frontendowych, integracji z API sklepu i zewnętrznych fontów.

**To nie jest hosting wyłącznie statycznych plików.** Wygląd i skrypty są statyczne, ale PHP chroni przyszłe zadania i raporty. Sama publikacja HTML/JS nie spełni wymagań briefu. SeoHost musi wykonywać PHP, a document root musi wskazywać na `public/`.

## Szybki start

Z katalogu monorepo:

```sh
npm run setup:demo -w e-advent-partners
npm run dev:partners
```

Otwórz `http://127.0.0.1:5180`. Panel: `http://127.0.0.1:5180/statystyki/`.
Jednorazowo wygenerowane hasło znajduje się w `private/storage/demo-access.txt`.
Plik z hasłem, konfiguracja lokalna i runtime nie wchodzą do Git ani do paczki wdrożeniowej.
`setup:demo` nie nadpisuje istniejącej konfiguracji. Demo pokazuje serwerową datę **10.12.2026, 12:00**.
Zmień `preview_now` w `private/config.local.php` na inną datę do testów lub `null` dla rzeczywistego czasu.
Parametry URL ani zegar telefonu nie zmieniają dostępności. Produkcja odrzuca symulowaną datę.

Potrzebny jest PHP w PATH albo `PHP_BIN`. Na tym stanowisku przygotowano ignorowany przez Git interpreter w `.runtime/php/php.exe`; nie jest zależnością wdrożenia i nie należy go kopiować na serwer. Nie trzeba instalować paczek npm dla aplikacji partnerskiej.

## Katalogi

```text
apps/partners/
  public/                    jedyny publiczny katalog domeny
    index.php                kalendarz
    dzien.php                dostępne zadanie bez JavaScript
    statystyki/              logowanie, panel, eksport CSV
    api/                     kalendarz, opcjonalna analityka, wylogowanie
    assets/                  lokalne obrazy, CSS, JS
  private/                   poza document root
    config.php               bezpieczne ustawienia bazowe
    config.example.php       wzór konfiguracji produkcyjnej
    config.local.php          lokalne sekrety (ignorowany)
    tasks.php                24 teksty — obecnie przykładowe
    calendar.php             reguły dat Europe/Warsaw
    statistics.php           adapter mock/MySQL i raporty
    auth.php                 sesje, CSRF, ograniczenie prób
    views/                   współdzielony nagłówek i stopka
    storage/                 prywatne pliki techniczne
  database/schema.sql        agregaty modelu A
  scripts/                   start, testowanie, paczkowanie, preflight
  tests/                     daty, historia, HTTP i uprawnienia
  docs/brief-2026.md          oryginalna specyfikacja od właściciela
  docs/DEPLOYMENT.md          wdrożenie, odbiór i utrzymanie
```

Warstwy są rozdzielone: routing w `public`, logika w `private`, widoki w `private/views`, dane w adapterze `statistics.php`. Nowe kampanie partnerskie powinny otrzymywać osobną konfigurację i document root — nie mieszać ich z sesjami, bazą ani treściami tej kampanii. Obecnie projekt obsługuje wyłącznie ŚOA.

## Co działa

- 24 okienka, odblokowanie według czasu PHP w Warszawie, wszystkie wcześniejsze dni dostępne niezależnie od historii.
- Brak przyszłych tekstów w HTML/JS/API, również przy bezpośrednim wejściu w zadanie.
- Stan przed startem i po zakończeniu 26.12; od 27.12 ekran zakończenia.
- Lokalna historia otwarć, przycisk resetu, działanie przy zablokowanym storage.
- Odświeżanie dostępności co minutę, po wybudzeniu strony i przy każdym otwarciu okienka.
- Modal z natywnym zarządzaniem fokusem i Escape; wariant bez JavaScript.
- Dostarczone grafiki `close.png` / `open.png` jako zoptymalizowane `public/assets/calendar/close.webp` i `open.webp`. Każde okienko zmienia grafikę po otwarciu, także po odświeżeniu; tytuł pobierany jest tylko dla dni dostępnych po stronie serwera.
- Hasło panelu, regeneracja sesji, 30 minut bezczynności, CSRF, ograniczenie prób według adresu sieciowego.
- Statystyki z filtrem 1–26 XII, tabela do wykresu, CSV UTF-8 BOM i druk/PDF przeglądarki.
- Jawne oznaczenie danych fikcyjnych również w CSV i wydruku. Awaria MySQL nie przełącza raportu na mocki.
- Samodzielny adapter PDO i schemat bazy. MySQL nie jest potrzebny do udostępniania zadań.

## Mocki i materiały do zastąpienia

Kalendarz ma formę drewnianego domku z ośnieżonym dachem na tle zimowego lasu. Wszystkie okienka zachowują dotychczasową grafikę otwartą i zamkniętą, z małym znakiem ŚOA; okno wigilijne jest większe.

1. `private/tasks.php`: wszystkie 24 ćwiczenia to przykłady do zastąpienia/akceptacji przez ŚOA. Nie są opracowaniem medycznym.
2. `stats_source = mock`: statystyki generowane deterministycznie, niezwiązane z ruchem. Źródło `mysql` czyta rzeczywiste agregaty.
3. Logo ŚOA i baner finansowania pochodzą z materiałów partnera. Na wąskich ekranach te same znaki finansowania wyświetlają się w dwóch rzędach.
4. Strony prywatności i dostępności opisują kalendarz i podają dane kontaktowe ŚOA. Formalna deklaracja dostępności wymaga oceny i dat dotyczących tej subdomeny.
5. Wzór konfiguracji zawiera ogólny e-mail ŚOA; przed publikacją potrzebny jest zatwierdzony tekst finansowania. Położenie znaków w modalach i wariant mobilny wymagają uzgodnienia.

## Analityka

Domyślnie wyłączona. Przygotowany wariant to **model A z dobrowolnym wyborem użytkownika**: zagregowane odsłony oraz wszystkie zdarzenia otwarcia, w tym ponowne. Nie liczymy unikalnych przeglądarek, osób ani wykonanych ćwiczeń. Nie wdrożono modelu B.

Po zatwierdzeniu metodologii przez ŚOA/IOD, uzupełnieniu dokumentów i podpięciu MySQL można włączyć `analytics_enabled` i `analytics_approved`. Pojawi się dobrowolny wybór pod kalendarzem. Stan zgody jest potwierdzany w sesji PHP; endpoint wymaga same-origin, tokenu CSRF, prawidłowej daty/dnia i limituje ruch. Dane agregowane są zapisywane atomowo w transakcji. Żadna awaria pomiaru nie blokuje ćwiczeń.

Zgoda zapamiętywana jest pod osobnym kluczem wersjonowanym, a cofnięcie zatrzymuje kolejne zdarzenia. Nie da się usunąć z agregatu zdarzeń konkretnej osoby. Logi hostingu, sesje i tymczasowe skróty IP limitera nadal wymagają uzgodnionej retencji. Model i treści informacyjne wymagają akceptacji przed włączeniem pomiaru.

## Sprawdzenie i paczka

```sh
npm run check -w e-advent-partners
npm run test:partners
# przy uruchomionym lokalnym serwerze:
npm run test:http -w e-advent-partners
npm run build:partners
```

Wynik: `apps/partners/dist/soa`. Nie jest to build SPA, lecz komplet plików PHP i zasobów do wysłania na hosting. Paczkowanie celowo pomija konfigurację lokalną, hasła, logi i runtime. `scripts/preflight.php` sprawdza gotowość po skonfigurowaniu środowiska docelowego. Pełny test obciążenia, audyt dostępności, MySQL i konfiguracja Apache/SeoHost pozostają testami wdrożeniowymi.
