# e-Advent × Śląski Ośrodek Adopcyjny — specyfikacja wdrożenia 2026

> **Status:** dokument wykonawczy / projekt do implementacji, nie gotowa aplikacja.  
> **Wersja:** 1.0 · **Data:** 4 listopada 2026 r.  
> **Projekt:** „Skoordynowane wsparcie pre i post adopcyjne”  
> **Zamawiający:** Śląski Ośrodek Adopcyjny w Katowicach (dalej: ŚOA)  
> **Wykonawca:** e-Advent  
> **Docelowa subdomena (propozycja):** `https://soa.e-advent.pl`  
> **Termin gotowego, zaakceptowanego widoku:** 24.11.2026 r.  
> **Czas działania kalendarza:** 01–26.12.2026 r. włącznie (nowe zadania od 1 do 24 grudnia).  
> **Skala:** około 1000 odwiedzających; brak kont uczestników.  
> **Uzgodniona oferta:** 1490,00 zł netto + 342,70 zł VAT 23% = **1832,70 zł brutto** (informacja biznesowa; ostatecznie obowiązuje zaakceptowane zamówienie/umowa).

## 0. Jak korzystać z tego dokumentu

To **jeden dokument opisujący cały projekt**: założenia, UX/UI, zasoby graficzne, frontend, PHP, analitykę, MySQL, prywatność, bezpieczeństwo, dostępność, wdrożenie, testy i odbiór. Fragmenty kodu są **wzorcami implementacyjnymi**, a nie kompletnymi gotowymi plikami produkcyjnymi. W szczególności warstwa analityczna wymaga zatwierdzenia modelu prawnego i dopracowania ochrony przed nadużyciami.

**Priorytety wdrożenia:**

- **P0 (konieczne):** dostępność 24 okienek według daty serwera, brak wcześniejszego ujawnienia treści, niezależny postęp w przeglądarce, poprawne logotypy, responsywność i dostępność cyfrowa, bezpieczny hosting, raport zgodny z uzgodnioną metodologią.
- **P1 (bardzo ważne):** zabezpieczony panel statystyk, podstawowy monitoring, backup, automatyczne odblokowanie po północy, dokumentacja i formalny odbiór.
- **P2 (opcjonalne):** eksport CSV/PDF jednym kliknięciem, animacja śniegu, rozbudowane filtry i wykresy, dedykowane grafiki do każdej treści.

### Decyzje do zatwierdzenia przed rozpoczęciem prac

| ID | Decyzja / pytanie | Rekomendacja / status |
|---|---|---|
| D-01 | Czy wszystkie wcześniejsze dni mają pozostać dostępne? | **Tak** — do bieżącego dnia, także przy pierwszej wizycie; potwierdzić pisemnie z ŚOA. |
| D-02 | Co dokładnie znaczy „faktyczna liczba uczestników”? | Bez loginu **niemożliwa do ustalenia dokładnie**; uzgodnić „szacowana liczba unikalnych przeglądarek / identyfikatorów z ważną zgodą”. **Blokada odbiorowa, dopóki nieuzgodnione.** |
| D-03 | Model statystyk i zasady prywatności? | Patrz rozdz. 9–10; uzgodnić z administratorem/IOD ŚOA, dokumentować podstawę prawną i sposób spełnienia PKE. |
| D-04 | Dokładne pliki logo ŚOA i znaków UE? | Materiały oficjalne od ŚOA lub pobrane z oficjalnych źródeł; **akceptacja przez ŚOA**. |
| D-05 | Kto redaguje 24 zadania? | ŚOA; otrzymać komplet w ustalonym, prostym formacie. |
| D-06 | Odbiór i terminy poprawek? | Ustalić datę przesłania materiałów, 1–2 rundy korekt, osobę akceptującą. |
| D-07 | Reakcja na awarie? | Uzgodnić konkretne okna kontaktu, czas reakcji, kanał alarmowy; **nie obiecywać bezwarunkowej natychmiastowej naprawy**. |
| D-08 | Dostępność cyfrowa i deklaracja dostępności? | Projektować pod WCAG AA, uzgodnić właściciela i publikację deklaracji z ŚOA. |
| D-09 | Dostęp do `/statystyki`? | Tylko hasło dla upoważnionych pracowników; brak publicznego dostępu i indeksacji. |
| D-10 | Co po 26.12? | Uzgodniona strona zakończenia lub wyłączenie; raport i usuwanie/zwrot danych według ustaleń. |

---

## 1. Cel, zakres i kryteria sukcesu

### 1.1 Cel projektu

Stworzyć dedykowany, spokojny w odbiorze **e-kalendarz adwentowy** dla ŚOA w Katowicach z zadaniami dotyczącymi uważności (mindfulness), relaksacji, dbania o siebie i rezyliencji. Podstrona ma wizualnie eksponować ŚOA i finansowanie projektu, a e-Advent przedstawiać dyskretnie jako wykonawcę technicznego.

### 1.2 W zakresie (MVP)

1. Subdomena `soa.e-advent.pl` z HTTPS na SeoHost.
2. Podstrona publiczna `/` z odpowiednim zestawem znaków finansowania, logo ŚOA, opisem projektu i kalendarzem 24 dni.
3. Codzienne odblokowywanie **jednego nowego okienka od 1 do 24.12.2026** o `00:00:00` czasu `Europe/Warsaw`.
4. Otwarcie dowolnego wcześniejszego dnia do dnia bieżącego; **bez konieczności otwierania wszystkich poprzednich dni w kolejności**.
5. Oddzielny, zapamiętywany lokalnie wizualny stan otwarcia dla każdej przeglądarki (localStorage); brak rejestracji/logowania uczestników.
6. Zadania wysyłane do klienta tylko po odblokowaniu na serwerze; brak przyszłych tekstów w HTML/JS/JSON.
7. Zbiorcze statystyki i raport po uzgodnieniu metodologii pomiaru.
8. Chroniony hasłem panel statystyk (`/statystyki`), mobilny i desktopowy.
9. Utrzymywanie usługi do 26.12.2026 włącznie; ścieżka zgłaszania problemów.
10. Testy funkcjonalne, responsywne, wydajnościowe, bezpieczeństwa i dostępności oraz protokół odbioru.

### 1.3 Poza zakresem

- Konto użytkownika, profil, indywidualny kod, synchronizacja historii między urządzeniami.
- Zbieranie imion, nazwisk, e-maili i danych wrażliwych o uczestnikach.
- Dowód „wykonania” zadania (mierzymy odkrycie, nie wykonanie ćwiczenia).
- Integracja z istniejącym API e-Advent na Vercel, Stripe, InPost, aplikacją Android.
- Newsletter, reklamy, piksele marketingowe, remarketing i przetwarzanie danych kampanii do własnego marketingu e-Advent.
- Nieograniczony wolumen ruchu lub gwarantowane 100% dostępności bez parametrów SLA.

### 1.4 Warunki akceptacji biznesowej

- Uczestnik wchodzi z jednego linku i działa bez logowania.
- W każdym dniu **tylko jedno nowe zadanie** staje się dostępne; wcześniejsze są dostępne wciąż.
- Otwarte okienka pozostają wizualnie otwarte przy powrocie w tej samej przeglądarce, jeżeli dane nie zostały usunięte.
- Zmiana telefonu/tryb prywatny nie przenosi historii, ale nie blokuje dostępnych zadań.
- Ośrodek otrzymuje zgodny z metodologią panel/raport zbiorczy.
- Strona jest czytelna i funkcjonalna mobilnie, klawiaturą i z czytnikiem ekranu.
- ŚOA akceptuje poprawne oznaczenia UE i projekt graficzny.

---

## 2. Materiały, grafiki i identyfikacja wizualna

### 2.1 Referencje projektowe (mockupy)

W zestawie zasobów przewidziano dwa mockupy opracowane na podstawie wcześniejszych uzgodnień:

**Strona główna:**

![Referencyjny wygląd ekranu głównego kalendarza](assets/mockups/home-preview.jpg)

**Statystyki:**

![Referencyjny wygląd strony statystyk](assets/mockups/statistics-preview.jpg)

> **Uwaga:** mockupy są wizualizacją, nie obowiązującą księgą znaków ani dokładną specyfikacją piksel-po-pikselu. Liczby w makiecie statystyk są **fikcyjne**. Makiety graficzne mogły przybliżać wygląd logotypów — wersja wdrożeniowa MUSI używać oficjalnych plików, zatwierdzonych przez ŚOA. Na stronie publicznej **nie umieszczamy panelu statystyk**.

### 2.2 Gotowe pliki w dołączonym pakiecie

| Zasób | Plik (ścieżka względem katalogu projektu) | Zastosowanie |
|---|---|---|
| Zimowe tło | `assets/background/winter-hero.webp` | Główne tło strony; latarenka z lewej, domek z prawej, przestrzeń na treść w środku. |
| Złota śnieżynka | `assets/decor/snowflake-gold.webp` | Narożniki, małe akcenty przy nagłówkach. |
| Krótka gałązka | `assets/decor/sprig-small.webp` | Pod numerami okienek; kilkanaście–kilkadziesiąt pikseli szerokości. |
| Większa girlanda | `assets/decor/sprig-title.webp` | Dekoracja nad tytułem podstrony. |
| Złote iskierki | `assets/decor/sparkles-gold.webp` | Delikatne akcenty przy nagłówkach. |
| Prezent w magencie | `assets/decor/gift-magenta.webp` | Okienko 24, dekoracyjnie. |
| Logo e-Advent (od właściciela) | `assets/branding/e-advent-logo.png` | Dyskretny podpis wykonawcy w stopce. |
| Pełnowymiarowe PNG | `assets/originals/` | Oryginalne pliki dekoracji do ewentualnej ponownej optymalizacji. |
| Mockupy | `assets/mockups/` | Punkt odniesienia dla układu i stylu. |

**Część plików w zestawie ma prawdziwy kanał alfa**, a eksporty WebP zachowują przezroczystość. Tło zimowe jest nieprzezroczyste. Nie zakładać, że grafiki mają oficjalne kolory instytucji.

**Brakujące, obowiązkowe pliki:** `assets/branding/soa-logo.svg` oraz `assets/branding/fe-sl-official-strip.svg` (nazwy robocze). Pozyskać wersje oficjalne od ŚOA, nie wycinać ich z wygenerowanego mockupu.

### 2.3 Proponowana paleta i typografia

| Token | Wartość orientacyjna | Rola |
|---|---|---|
| `--navy` | `#151936` | Nagłówki, pasek ŚOA, stopka. |
| `--magenta` | `#A00751` | Akcent identyfikacji klienta, przyciski, okienko 24. |
| `--green` | `#164D31` | Numery dni, znaczniki dostępności. |
| `--gold` | `#C69A3E` | Cienkie ozdobniki i obramowania. |
| `--ivory` | `#FFF9F0` | Tło kart kalendarza. |
| `--paper` | `#F6F4F3` | Jasne panele i sekcje. |
| `--text` | `#151936` | Tekst o wysokim kontraście. |

- Nagłówki: np. `Georgia, 'Times New Roman', serif` (lub zatwierdzony font lokalny z prawami licencyjnymi).
- Tekst i UI: systemowe `Arial, sans-serif` lub podobny czytelny krój.
- Nie wpisywać ważnych tekstów wewnątrz tła PNG/WebP — mają pozostać tekstem HTML (SEO, RWD, czytniki ekranu).
- Unikać złotego tekstu na kremowym tle — używać złota głównie dekoracyjnie, a tekstu w granacie.

### 2.4 Oznaczenia i finansowanie z UE

W obszarze widocznym na początku strony umieścić **oficjalne zestawienie czterech znaków**: Fundusze Europejskie dla Śląskiego, barwy RP, Unia Europejska z napisem o dofinansowaniu oraz Województwo Śląskie. Kolejność, odstępy, proporcje, czytelność i wariant mobilny zgodnie z oficjalnymi materiałami programu. Wersję pionową na telefonach wykorzystać tylko jako oficjalny układ zatwierdzony przez ŚOA.

- Logo **ŚOA** jest pierwszoplanowe w nagłówku; może powtarzać się w okienkach zgodnie z wymogami klienta.
- W każdym okienku przewidzieć miejsce na logo ŚOA i informację o dofinansowaniu, jeśli zostanie tak zatwierdzone. Nie generować ręcznie niepoprawnych miniatur oficjalnych znaków — sprawdzić minimalną czytelność.
- Logo **e-Advent** ma być małe i osobne, np. „Realizacja techniczna: e-Advent”, poza obowiązkową linią logotypów UE i tylko po zaakceptowaniu przez ŚOA.
- Tekst o projekcie i dokładne brzmienie informacji o finansowaniu pozyskać od klienta.
- Nie używać znaków w sposób sugerujący, że UE sponsoruje e-Advent jako firmę.

Oficjalne wytyczne: https://funduszeue.slaskie.pl/web/guest/w/zasady_promocji_oznakowania  
Strona projektu: https://soa-katowice.pl/projekt/

---

## 3. UX i responsywność

### 3.1 Strona publiczna `/`

Układ w kolejności czytania:

1. **Skip link** „Przejdź do kalendarza”, widoczny po fokusie.
2. **Pasek finansowania** na jasnym tle, oficjalne znaki, czytelne również mobilnie.
3. **Header ŚOA**: logo Ośrodka, nazwa, ewentualnie link „O projekcie”; branding e-Advent dyskretnie.
4. **Hero**: zimowe tło, tytuł „E-kalendarz adwentowy”, nazwa projektu „Skoordynowane wsparcie pre i post adopcyjne”, krótkie wyjaśnienie idei mindfulness.
5. **Kalendarz** 24 okienek (numery 1–24); wizualnie odróżnione zamknięte, dostępne, już otwarte i przyszłe.
6. **„Jak to działa?”** (3 kroki) i **„O projekcie”** z odniesieniem do strony ŚOA, bez statystyk na stronie głównej.
7. **Stopka**: dane projektu, polityka prywatności, deklaracja dostępności (według uzgodnień), dyskretny kredyt e-Advent.

**Ważne:** użytkownik nie musi otwierać okienek w kolejności. Stan `opened` służy **jedynie wizualizacji**, nie steruje kalendarzowym limitem dni.

### 3.2 Karta dnia / otwarte okienko

- Klikalny **`button`**, a nie klikalny `<div>`; tekst dostępny dla czytnika, np. „Dzień 8, dostępne, nieotwarte”.
- Po aktywacji odsłoń zadanie w tej samej karcie albo w dostępnym panelu z nagłówkiem „8 grudnia – ...”.
- Zapisz dzień w localStorage po skutecznym wyświetleniu zadania.
- Pokazuj stan `otwarte` jako zmianę wizualną + opis tekstowy, nie tylko samą barwę.
- Dla niedostępnego dnia: „Dzień 9 — dostępny od 9 grudnia”, bez treści zadania po stronie klienta.
- Brak przymusu wykonania zadania, brak ankiety o samopoczuciu czy danych zdrowotnych.
- Animacje subtelne, z poszanowaniem `prefers-reduced-motion`.

### 3.3 Przykładowe responsywne reguły

| Szerokość | Układ okienek | Główne zachowanie |
|---|---|---|
| `>= 1200px` | 6 kolumn | Szeroki widok, panele informacyjne w 2 kolumnach. |
| `768–1199px` | 4 kolumny | Zwężona kompozycja, mniej dekoracji. |
| `480–767px` | 3 kolumny | Karty czytelne na telefonie, panele jeden pod drugim. |
| `< 480px` | 3 kolumny (gdy pasują) lub 2 | Minimalny cel dotykowy, brak poziomego przewijania; węższy panel mobilny. |

Rekomendowane minimalne obszary aktywacji: ok. `44×44 CSS px` (większe są lepsze); responsywne tytuły przez `clamp()`; dekoracyjne obiekty nie mogą zasłaniać tekstu, w tym przy 200% zoom. Obraz tła powinien mieć pozycjonowanie zależne od rozmiaru ekranu; na telefonie preferuj jaśniejszy overlay i unikaj kadrowania, które psuje czytelność.

```css
:root {
  --navy: #151936; --magenta: #a00751; --green: #164d31;
  --gold: #c69a3e; --ivory: #fff9f0; --paper: #f6f4f3;
}
.hero {
  background-image: linear-gradient(rgba(255,255,255,.30), rgba(255,255,255,.44)),
    url('/assets/background/winter-hero.webp');
  background-size: cover;
  background-position: center;
}
.calendar-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 12px; }
.calendar-tile { min-height: 84px; border-radius: 12px; border: 1px solid var(--gold); }
.calendar-tile:focus-visible { outline: 3px solid var(--navy); outline-offset: 3px; }
@media (max-width: 1199px) { .calendar-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
@media (max-width: 767px) { .calendar-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 360px) { .calendar-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; } }
```

### 3.4 Osobna strona statystyk `/statystyki`

- **Cała strona chroniona uwierzytelnieniem**, nie linkować jej z publicznej nawigacji uczestników.
- Wspólny branding ŚOA, niekoniecznie identycznie ciężkie tło (preferowana lżejsza strona z kartami).
- Karty KPI: odsłony, otwarcia poszczególnych dni, łączna liczba pierwszych otwarć, szacowane unikalne przeglądarki **tylko jeśli zatwierdzona metodologia pozwala je mierzyć**.
- Wykres dzienny 01–26 XII i tabela dni 1–24; filtry dat.
- Krótkie widoczne zastrzeżenia metodologii (czego nie oznaczają liczby).
- „Raport końcowy” jako ekran i/lub bezpieczny eksport pliku PDF/CSV; żadne dane indywidualne nie są potrzebne.
- Na mobile karty KPI jedna pod drugą, wykres możliwy do odczytu i tabela przewijana **w ramach własnego kontenera**; alternatywa tekstowa do wykresu.

---

## 4. Architektura systemu i katalogi

### 4.1 Stos i granice odpowiedzialności

- **PHP 8.x**: serwerowa data, wybór udostępnionych zadań, render HTML/JSON, endpoint(y) statystyczne, logowanie admina, raport.
- **HTML5 + CSS3 + vanilla JS**: wyświetlanie, animacje, interakcje, localStorage.
- **MySQL/MariaDB**: agregaty i opcjonalne pseudonimowe zdarzenia analityczne (po uzgodnieniu z IOD).
- **SeoHost**: subdomena, certyfikat TLS, logi serwera, backup, PHP, baza.
- **Bez Vercela, bez React SPA, bez zewnętrznych bibliotek runtime, bez GA4 na starcie.**

```text
             GET /                  GET /statystyki
       ┌─────────────────────┐      ┌──────────────────────┐
       │ PHP: data + zadania │      │ PHP: sesja admina     │
       │ tylko odblokowane   │      │ SELECT agregatów      │
       └──────────┬──────────┘      └──────────┬───────────┘
                  │                            │
       HTML/CSS/JS do telefonu                MySQL
                  │
         localStorage (postęp)
                  │
      [po zatwierdzeniu prawnie]
       POST /api/track.php ───────────────────► MySQL
```

**UWAGA:** warstwa statystyk może wykonywać małe żądania HTTP. „Bez API” oznacza brak użycia dotychczasowego API/Vercel — nie brak własnego endpointu PHP.

### 4.2 Sugerowany układ plików

```text
soa-e-advent/
├── public/                         # document root subdomeny
│   ├── index.php                   # render kalendarza
│   ├── statystyki/
│   │   ├── index.php               # autoryzacja + dashboard
│   │   └── login.php
│   ├── api/
│   │   ├── track.php               # opcjonalny pomiar
│   │   └── logout.php              # admin
│   ├── assets/
│   │   ├── background/
│   │   ├── decor/
│   │   ├── branding/
│   │   ├── css/app.css
│   │   └── js/calendar.js
│   ├── polityka-prywatnosci.php
│   ├── deklaracja-dostepnosci.php  # po ustaleniu z ŚOA
│   ├── robots.txt
│   └── .htaccess
├── private/                        # FIZYCZNIE POZA document root
│   ├── config.php                  # hasła, klucze, DB credentials
│   ├── tasks.php                   # wszystkie 24 zadania
│   ├── db.php                      # PDO
│   ├── auth.php                    # admin
│   └── analytics.php               # funkcje pomiaru
├── tests/
├── README.md
└── .gitignore
```

> Faktyczny układ katalogów SeoHost może być inny. Ustaw `public/` jako katalog serwowany przez subdomenę lub odtwórz równoważną strukturę i trzymaj `private/` poza katalogiem webowym. Nie wystarczy sam `.htaccess` przy błędnie umieszczonych sekretach.

### 4.3 Format treści zadań

Ośrodek dostarcza 24 teksty. Zamień je na uporządkowaną tablicę PHP pod indeksem dni `1..24`:

```php
<?php // private/tasks.php
return [
    1 => ['title' => 'Chwila dla siebie', 'body' => 'Przykładowa treść od ŚOA.'],
    2 => ['title' => 'Spokojny oddech', 'body' => 'Przykładowa treść od ŚOA.'],
    // ... do dnia 24; wartości produkcyjne dostarczy i zaakceptuje ŚOA
];
```

Teksty **przykładowe** służą tylko testom; nie zastępują autoryzowanych materiałów klienta. Nie interpretować treści mindfulness jako porad medycznych; w razie potrzeby redakcję merytoryczną zatwierdza ŚOA.

---

## 5. Udostępnianie dat i ochrona przed wcześniejszym podglądem

### 5.1 Źródło prawdy

Jedynym źródłem prawdy o dostępności jest **czas serwera w strefie `Europe/Warsaw`**. Nie wolno opierać odblokowania na `new Date()` w telefonie, zapisach localStorage ani zegarze systemowym klienta. Użytkownik może przestawić telefon na 24 grudnia — nie ma to ujawniać przyszłych zadań.

Reguła:

- przed `2026-12-01 00:00` → **0 dostępnych**,
- od 1 do 23 grudnia → wszystkie dni `1..nr dnia miesiąca`,
- od `2026-12-24 00:00` → **1..24 dostępne**,
- do końca `2026-12-26` → strona działa według uzgodnionego zakresu,
- od `2026-12-27 00:00` → zamknięcie lub tryb zakończenia **według uzgodnienia z ŚOA** (nie automatyczna reklama sklepu).

### 5.2 Przykładowy kod

```php
<?php
$tz = new DateTimeZone('Europe/Warsaw');
$now = new DateTimeImmutable('now', $tz);
$start = new DateTimeImmutable('2026-12-01 00:00:00', $tz);
$last = new DateTimeImmutable('2026-12-24 00:00:00', $tz);

if ($now < $start) {
    $availableDay = 0;
} elseif ($now >= $last) {
    $availableDay = 24;
} else {
    $availableDay = (int)$now->format('j');
}

$allTasks = require __DIR__ . '/../private/tasks.php';
// Uwaga: range(1, 0) nie daje pustej tablicy, dlatego wymagany wyjątek dla dnia 0.
$availableTasks = $availableDay === 0
    ? []
    : array_intersect_key($allTasks, array_flip(range(1, $availableDay)));

// To są JEDYNE zadania wysyłane do przeglądarki:
$payload = json_encode($availableTasks, JSON_UNESCAPED_UNICODE
    | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT
    | JSON_THROW_ON_ERROR);
```

Możesz umieścić JSON w `<script type="application/json" id="tasks-data">...</script>` i odczytać `textContent` w JS. Nigdy nie emitować przyszłych zadań w DOM, `data-*`, ukrytym JSON, pliku `.js`, source mapie ani komentarzu HTML.

### 5.3 Cache

- **HTML i API z zadaniami:** na start `Cache-Control: no-store, private`; łatwiej uniknąć błędnego odblokowania oraz błędnego zamrożenia treści przed północą.
- **Statystyki i panel admina:** `Cache-Control: no-store, private` oraz brak buforowania przez reverse proxy / LiteSpeed.
- **CSS/JS/obrazy:** pliki z wersjonowaniem nazwy (`app.20261124.css`, `winter-hero.webp`) mogą mieć długi cache.
- Jeśli w przyszłości włączysz cache HTML: TTL nie może przechodzić przez następne `00:00` czasu Warszawy; wyłącz cache dla sesji administracyjnej. Nie polegać na samym `max-age=86400`.
- Staging ma pozwalać na testowanie konkretnej daty przez **serwerowy, chroniony mechanizm testowy**, niedostępny produkcyjnie (`?date=...` w produkcji jest niedozwolone).

### 5.4 Użytkownik ma kartę otwartą przez północ

Prostsze i wystarczające MVP: po wejściu/odświeżeniu strona dostaje nowe zadanie. Wariant ulepszony: JS odświeża stronę o północy i po powrocie z uśpienia (`visibilitychange`), ale **serwer ponownie autoryzuje dostępność**. Nie ufać lokalnemu zegarowi przy samym odblokowaniu.

---

## 6. localStorage — zapamiętywanie postępu

### 6.1 Co zapisujemy

```json
{
  "version": 1,
  "openedDays": [1, 2, 3, 8],
  "updatedAt": "2026-12-08T18:15:00+01:00"
}
```

Przykładowy klucz: `soa_advent_2026_progress_v1`.

- Zapis nie jest kontem ani logowaniem.
- Brak imienia, e-maila, identyfikatora firmy, tokena autoryzacyjnego.
- **Nie przesyłać postępu lokalnego do bazy** tylko po to, aby odtwarzać jego wygląd; analizę statystyczną prowadzić niezależnie.
- Postęp w `localStorage` jest przypisany do **originu** (protokół + host + port) i profilu przeglądarki; nie synchronizuje się pomiędzy telefonem i laptopem.
- Wyczyszczenie localStorage usuwa **wyłącznie historię wizualną**; wcześniejsze dni pozostają dostępne.
- W trybie incognito albo przy blokadzie storage postęp może być nietrwały — strona ma nadal działać.

### 6.2 Minimalny JS (wzorzec)

```js
const KEY = 'soa_advent_2026_progress_v1';

function readProgress() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || '{}');
    const days = Array.isArray(data.openedDays) ? data.openedDays : [];
    return [...new Set(days.filter(n => Number.isInteger(n) && n >= 1 && n <= 24))];
  } catch {
    return [];
  }
}

function markOpened(day, availableDays) {
  if (!Number.isInteger(day) || day < 1 || day > availableDays) return false;
  const days = readProgress();
  if (days.includes(day)) return false;
  days.push(day);
  days.sort((a, b) => a - b);
  try {
    localStorage.setItem(KEY, JSON.stringify({version: 1, openedDays: days}));
  } catch {
    // Tryb prywatny, brak miejsca, blokada storage; UI nadal wyświetla zadanie.
  }
  return true;
}
```

Przekaż `availableDays` **z HTML generowanego przez PHP**, a nie z zegara użytkownika. Sprawdzaj też, że treść dla `day` rzeczywiście znajduje się w serwerowym `availableTasks`. Gdy trzeba zachować widok po błędzie localStorage w trakcie tej samej wizyty, dołóż kopię w pamięci JS (`Set`).

### 6.3 Działanie w praktyce

| Scenariusz | Oczekiwany efekt |
|---|---|
| Pierwsze wejście 10 XII | Dni 1–10 dostępne; 11–24 zablokowane. |
| Użytkownik otworzył 1, 3, 9 | Te dni oznaczone jako odkryte po kolejnym wejściu. |
| Powrót 11 XII | Dzień 11 nowo dostępny, wcześniejsze stany widoczne. |
| Zmiana telefonu | Lokalna historia nieobecna, ale do dnia 11 wszystko można otworzyć. |
| Wyczyścił localStorage | To samo — brak wizualnej historii, brak blokady dostępu. |
| Zmienił datę telefonu na 24 XII | Serwer nie emituje treści wykraczających poza aktualną datę. |

---

## 7. Projekt bazy MySQL i statystyk

### 7.1 Definicje — nie mieszać wskaźników

- **Odsłona strony (`page_view`)** — otwarcie/ponowne załadowanie strony, nie „osoba”.
- **Zdarzenie otwarcia (`window_open`)** — kliknięcie i odkrycie okienka, nie dowód wykonania zadania.
- **Pierwsze otwarcie w tej przeglądarce** — lokalny JS rozpoznaje po `openedDays` (bez zgody na analitykę nie oznacza wiarygodnej globalnej deduplikacji).
- **Szacowana unikalna przeglądarka** — pseudonimowy identyfikator **wyłącznie po zgodnej z prawem implementacji i odpowiednim wyborze użytkownika**. Nie jest to „faktyczna liczba różnych osób”.
- **Aktywny uczestnik** — nie używać bez precyzyjnej definicji np. „identyfikator ze zdarzeniem w ostatnich 7 dniach”.

**Krytyczne:** zapis 6a zapytania („faktyczna liczba uczestników”) jest niezgodny z brakiem logowania/identyfikacji. Musi zostać pisemnie zastąpiony wyraźnie opisanym wskaźnikiem szacunkowym przed odbiorem.

### 7.2 Dwa warianty pomiaru (wybór po akceptacji ŚOA/IOD)

**Model A — minimalizacja / agregaty bez trwałego identyfikatora analitycznego**

- Backend zwiększa liczniki ogólnych zdarzeń i liczników okienek bez zapisywania trwałego `visitorId` w bazie aplikacji.
- Można policzyć otwarcia, odsłony i zainteresowanie według dni, ale **nie rzetelne unikalne osoby**; zdarzenia mogą się powtarzać.
- Nadal oceniasz przetwarzanie danych technicznych, logi adresów IP, podstawę prawną, obowiązek informacyjny i reguły PKE, w zależności od mechanizmu śledzenia.
- Lepszy wariant, gdy klient zadowoli się agregatami i najniższą ingerencją w prywatność.

**Model B — szacowane unikalne przeglądarki, po spełnieniu wymogów analityki**

- Po prawidłowej, dobrowolnej zgodzie na analityczne przechowywanie/odczyt z urządzenia (lub po innej pozytywnie potwierdzonej kwalifikacji prawnej) generowany jest losowy `visitorId` w osobnym kluczu localStorage, np. `crypto.randomUUID()`.
- PHP zapisuje **HMAC identyfikatora** w bazie, nie surowy UUID; HMAC nadal może być daną osobową/pseudonimem — nie nazywać tego anonimizacją.
- Zdarzenia przypisane do takiego identyfikatora umożliwiają liczenie pierwszych otwarć per okienko i liczbę identyfikatorów; ale zliczanie może być niepełne (odmowa zgody), wielokrotne (wiele urządzeń) i podatne na usunięcie danych.
- Uczestnik bez zgody wciąż korzysta z kalendarza i zapisuje lokalny postęp **wyłącznie do funkcji kalendarza**; nie wysyłamy jego pseudonimowych zdarzeń analitycznych.

**Zasada:** `consent = false` **nie może blokować zabawy**. Żadnych okienek cookies sugerujących, że zgoda na śledzenie jest warunkiem skorzystania z zadań.

### 7.3 Wstępny schemat bazy (do realizacji Modelu A/B)

```sql
CREATE TABLE daily_stats (
    day_date DATE PRIMARY KEY,
    page_views BIGINT UNSIGNED NOT NULL DEFAULT 0,
    window_open_events BIGINT UNSIGNED NOT NULL DEFAULT 0,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE window_stats (
    window_day TINYINT UNSIGNED PRIMARY KEY,
    open_events BIGINT UNSIGNED NOT NULL DEFAULT 0,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- TYLKO dla prawidłowo wdrożonego Modelu B:
CREATE TABLE analytics_consents (
    visitor_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    consent_version VARCHAR(24) NOT NULL,
    consented_at DATETIME NOT NULL,
    last_seen_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE visitor_window_opens (
    visitor_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    window_day TINYINT UNSIGNED NOT NULL,
    first_open_at DATETIME NOT NULL,
    PRIMARY KEY (visitor_hash, window_day),
    INDEX idx_open_day (window_day),
    CONSTRAINT fk_visitor_consent FOREIGN KEY (visitor_hash)
      REFERENCES analytics_consents(visitor_hash) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Doprecyzowanie:** tabela `daily_stats` i `window_stats` powinna mieć **jedną, jednoznaczną metodologię zliczania**. Jeżeli liczysz wyłącznie zdarzenia zgodne z Model B, nazwy wskaźników i dashboard muszą o tym mówić. Jeśli dodatkowo liczysz agregaty bez identyfikacji (Model A), nie dodawaj bezrefleksyjnie tych samych zdarzeń dwa razy. Dopuszczalne jest dodanie pola `source`/oddzielnych liczników dla źródeł, ale tylko po uzgodnieniu.

### 7.4 Endpoint zdarzeń — kontrakt

`POST /api/track.php` z `Content-Type: application/json`; przykładowy payload (dla pomiaru, który jest prawnie dopuszczony):

```json
{
  "event": "window_open",
  "windowDay": 8,
  "visitorId": "a3fd5cc6-4584-4d0c-b401-1e5bedfe9742",
  "consentVersion": "analytics-2026-v1"
}
```

Serwer powinien:

1. Odrzucić inne metody niż POST; ograniczyć maksymalny rozmiar body (np. 1 KB).
2. Zweryfikować `event` według allowlisty, `windowDay` 1–24, datę **według serwera** i obecność odblokowanego zadania.
3. Zweryfikować uprawnienie do pomiaru oraz stan zgody (w Modelu B nie polegać tylko na niesprawdzonym polu klienta).
4. Weryfikować pochodzenie, CSRF/fetch metadata/token i limity częstotliwości — pamiętając, że **CORS i `Origin` nie czynią endpointu odpornym na skrypty wysyłające bezpośrednie żądania HTTP**.
5. W Modelu B haszować identyfikator kluczem serwerowym (`hash_hmac('sha256', $visitorId, $secret)`), stosować `INSERT IGNORE` dla `(visitor_hash, window_day)` i zwiększać liczniki **tylko przy nowym rekordzie**.
6. Prowadzić operację deduplikacji i zwiększenia agregatu w **jednej transakcji** (atomowo, bez rozjazdów przy równoległych kliknięciach).
7. Odpowiadać wyłącznie kodem/statusami typu `204 No Content` albo ustrukturyzowanym błędem, bez danych osób.
8. Nie wpuszczać HTML ani niekontrolowanych stringów; używać PDO z prepared statements.
9. Nie traktować statystyk jako niepodważalnego audytu liczby ludzi — możliwe są boty, brak zgód, duplikaty i manipulacje.

**Odporność:** frontend zadziała również przy chwilowej niedostępności endpointu statystyk — błąd pomiaru nie może blokować odkrycia okienka. Dla krytycznych zapisów można użyć `navigator.sendBeacon`/`fetch({keepalive:true})` po zweryfikowaniu prywatności i ochrony przed duplikatami, bez nadmiernych ponowień.

### 7.5 Raport końcowy

Minimalny zestaw:

- Okres badania; liczba odsłon; liczba zarejestrowanych otwarć; liczby dla dni 1–24.
- Zainteresowanie według dnia kalendarzowego (01–26.12).
- **Definicja unikalności**, jeśli wykorzystana, oraz informacja o zależności od zgody/przeglądarki.
- Co oznacza „otwarcie” i czego **nie** oznacza (nie dowodzi wykonania zadania).
- Ograniczenia: użytkownicy wielu urządzeń, blokery, usunięcie storage, brak sieci, duplikaty, boty, nieudzielone zgody.
- Daty zbierania danych, strefa czasu, data wygenerowania raportu.
- Możliwość eksportu CSV (`UTF-8 BOM` dla Excela, średnik przy polskiej konfiguracji) i wersji PDF (np. arkusz do wydruku z CSS print).

---

## 8. Prywatność, RODO, PKE i dokumentacja

> **Ważne:** to wymagania projektowe, nie opinia prawna i nie automatyczne potwierdzenie zgodności. Ostateczny model pomiaru powinien zostać zatwierdzony przez ŚOA (administrator) oraz jego IOD. Wykonawca może sporządzić dokumentację samodzielnie, bez obowiązku angażowania własnego zewnętrznego IOD przy tym jednym projekcie; obowiązki formalnego IOD ustala się jednak według rzeczywistej działalności.

### 8.1 Role i odpowiedzialność

- Co do zasady **ŚOA** ustala cele i sposoby wykorzystania statystyk projektu i jest administratorem danych w tym zakresie.
- **e-Advent** jest co do zasady procesorem, gdy przetwarza dane na udokumentowane polecenie ŚOA; może być odrębnym administratorem danych przetwarzanych dla własnych celów (np. bezpieczeństwo własnej usługi), co wymaga osobnej analizy.
- **SeoHost** może być dalszym procesorem, jeżeli przetwarza dane na rzecz wykonawcy; sprawdzić warunki umowne, lokalizacje przetwarzania i autoryzację podprocesora.
- Role zależą od rzeczywistych celów i decyzji, a nie wyłącznie nazwy w umowie.

### 8.2 Dokumenty i uzgodnienia

- [ ] Decyzja administratora o modelu statystyk (A albo B), celach, zakresie, podstawie prawnej, czasie retencji.
- [ ] Umowa powierzenia przetwarzania danych (art. 28 RODO), jeśli ma zastosowanie, z opisem podprocesorów, środków ochrony, zasad zwrotu/usunięcia danych, obsługi naruszeń i audytu.
- [ ] Polityka prywatności / klauzula informacyjna dla uczestników: administrator, kontakt IOD, cele, podstawa, odbiorcy, retencja, prawa, statystyki, logi, localStorage.
- [ ] Mechanizm zgody i jej wycofania, jeśli w modelu występuje analityczne korzystanie z lokalnego identyfikatora; wersjonowanie zgody.
- [ ] Dokumentacja niezbędności localStorage do zapamiętania postępu.
- [ ] Uzgodnienie minimalizacji logów hostingu, retencji logów technicznych, dostępu do backupów i incydentów.
- [ ] Nie zbierać danych o zdrowiu psychicznym, samopoczuciu, adopcji konkretnych osób, nazwisk ani danych dzieci.
- [ ] Zakazać eksportu identyfikatorów uczestników do marketingu e-Advent, reklam, GA4/Meta Pixel bez odrębnej analizy, celów i podstaw prawnych.

### 8.3 LocalStorage i przepisy telekomunikacyjne

Art. 399 polskiego **Prawa komunikacji elektronicznej** reguluje zapisywanie/odczytywanie danych w urządzeniu, również poza klasycznymi ciasteczkami. Przewiduje m.in. wyjątek, gdy operacja jest konieczna do dostarczenia usługi żądanej przez użytkownika. Dlatego:

- Postęp lokalny służący wyłącznie oczekiwanej funkcjonalności może kwalifikować się jako **niezbędny** — wymaga to uzasadnienia i odpowiedniego poinformowania.
- Trwałe identyfikatory analityczne to **odrębny cel**, który nie staje się „niezbędny” tylko dlatego, że statystyki zamówił Ośrodek.
- Odmowa analityki nie może usuwać dostępu do dni, zadań i funkcji zapamiętywania postępu.
- Samo wygenerowanie UUID i zapisanie go w `localStorage` nie oznacza anonimizacji — jest to co do zasady pseudonimowa identyfikacja przeglądarki.
- Nie deklarować „strona bez cookies/RODO”, jeśli używa localStorage, sesji admina albo serwerowych logów.

### 8.4 Retencja i prawa użytkownika

- Ustalić termin przechowywania analityki potrzebny do raportu, audytu i zgodności z projektem — **nie zakładać automatycznego kasowania wszystkiego 26 grudnia**, bo raport, backupy i wymogi umowne mogą wymagać innego terminu.
- Po upływie okresu: usunąć lub zwrócić dane zgodnie z instrukcją administratora; zapewnić procedurę usunięcia z backupów w uzgodnionym cyklu.
- Zapewnić obsługę żądań osób, wycofania zgody i żądań Ośrodka; nie obiecywać anonimowych statystyk „możliwych do usunięcia per osoba”, jeśli nie istnieje odpowiedni mechanizm.
- Przy raportach udostępniać wyłącznie zagregowane dane, ograniczyć eksport surowych logów.

Oficjalne źródła:  
- Prawo komunikacji elektronicznej: https://eli.gov.pl/eli/DU/2024/1221/ogl  
- UODO — role administratora i procesora: https://uodo.gov.pl/pl/675/4229  
- PARP — wymagane elementy powierzenia: https://www.parp.gov.pl/component/content/article/82121:weryfikacja-podmiotu-przetwarzajacego-dane-osobowe

---

## 9. Bezpieczeństwo systemu

### 9.1 Reguły obowiązkowe

- Wymusić HTTPS; prawidłowy certyfikat także dla subdomeny; wszystkie zasoby tylko HTTPS.
- Nigdy nie przechowywać `private/tasks.php`, `.env`/sekretów ani plików SQL w publicznym katalogu.
- Publiczne pliki PHP bez przypadkowego wyświetlenia źródła; sprawdzić konfigurację serwera.
- PDO + przygotowane zapytania; osobny użytkownik DB z minimalnymi uprawnieniami, bez `DROP` na koncie aplikacji jeśli możliwe.
- Walidacja i escapowanie treści w kontekście HTML (`htmlspecialchars`), bez niebezpiecznego `innerHTML` dla tekstów od użytkowników lub Ośrodka.
- CSP z lokalnymi zasobami, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, zabezpieczenie przed clickjackingiem (`frame-ancestors 'none'`); przetestować pod kątem kompatybilności.
- Wyłączyć listing katalogów, ukryć komunikaty błędów i stack trace na produkcji, logi trzymać prywatnie.
- Nie indeksować i nie cache'ować panelu administracyjnego oraz eksportów. `robots.txt` **nie jest zabezpieczeniem dostępu**.
- Mechanizmy rate limit loginu i endpointu zdarzeń; nie opierać bezpieczeństwa na CORS.
- Backupy konfiguracji, bazy i treści + test odtworzenia.

### 9.2 Logowanie do statystyk

- Osobne hasło administracyjne — silne, przechowywane z `password_hash()`; weryfikacja przez `password_verify()`.
- `session_start`, po poprawnym logowaniu `session_regenerate_id(true)`, cookie `Secure`, `HttpOnly`, `SameSite=Strict`, ograniczony czas nieaktywności.
- Ograniczenie dostępu do `/statystyki`, raportów i endpointów eksportu **po stronie PHP dla każdego żądania**, nie tylko ukrycie linków w JS.
- CSRF dla działań administracyjnych, bezpieczne wylogowanie, limit błędnych prób, opcjonalne 2FA lub dodatkowe ograniczenia IP, jeśli uzasadnione.
- Nigdy nie wysyłać danych dostępowych i identyfikatorów w parametrach URL.

### 9.3 Zagrożenia i działania

| Ryzyko | Ochrona |
|---|---|
| Przestawienie daty na urządzeniu | PHP + `Europe/Warsaw` + serwer nie emituje przyszłych treści. |
| Zajrzenie do `view-source`/DevTools | W HTML/JS są **tylko odblokowane** zadania. |
| Bezpośrednie wejście w API przyszłego dnia | Walidacja daty i numeru dnia na serwerze dla każdego endpointu. |
| Cache starszego dnia | HTML `no-store` albo precyzyjne wygaszanie przed północą. |
| Fałszywe statystyki | Walidacja eventów, deduplikacja, zabezpieczenia endpointu, ograniczenia częstotliwości. |
| Injection/XSS | PDO, escapowanie HTML, allowlist, CSP. |
| Wykradzenie statystyk | Hasło, sesje, uprawnienia DB, HTTPS, brak publicznych eksportów. |
| Niewydolność serwera | Lekkie zasoby, testy szczytów, monitoring, plan zwiększenia pakietu. |
| Omyłkowe ujawnienie logów/IP | Minimalizacja logów, okresy przechowywania, dostęp do panelu hostingu tylko dla upoważnionych. |

---

## 10. Hosting, wdrożenie, wydajność i awarie

### 10.1 SeoHost — weryfikacja środowiska

Pakiet SH 1 ma według publicznej specyfikacji operatora m.in. **1 vCPU, 2 GB RAM, 10 GB NVMe i NPROC 150**. Nie oznacza to gwarantowanej liczby jednoczesnych użytkowników; sprawdź też rzeczywiste limity konta PHP, DB i liczbę aktywnych procesów. Źródło: https://seohost.pl/specyfikacja-techniczna

**Dla około 1000 osób w całym sezonie lekka strona powinna mieć duże szanse działać sprawnie**, ale musi przejść test szczytowy. 1000 zarejestrowanych/otrzymujących link ≠ 1000 jednoczesnych żądań. Przed publikacją ustal progi obciążenia, po których zwiększysz pakiet hostingu.

### 10.2 DNS i subdomena

1. Utwórz `soa.e-advent.pl` w panelu hostingu lub skonfiguruj DNS wskazujący na SeoHost.
2. Utwórz odrębny document root dla kampanii.
3. Włącz SSL/TLS i wymuszaj HTTPS (bez przekierowań pętlowych).
4. Utrzymuj kod projektu i sekrety oddzielnie od głównego e-Advent.
5. Sprawdź certyfikat dla wersji mobilnej i desktopowej, również po automatycznym odnowieniu.
6. Ustaw poprawne uprawnienia plików, zabezpieczenia panelu, politykę cache.

### 10.3 Optymalizacja

- Obrazy dekoracyjne w zoptymalizowanym WebP, nie renderować w oryginalnych rozmiarach 2000+ px w małych kartach.
- Kompresja Brotli/Gzip, `width/height` na obrazach, lazy-load dekoracji poza pierwszym ekranem.
- **Hero** preload tylko jeśli ma znaczenie dla LCP, `background-size: cover`, lekkie warstwy i dobre kadrowanie mobile.
- Wyłączyć zewnętrzne skrypty reklamowe, ciężkie animacje i zbędne biblioteki.
- PHP renderuje jeden lekki dokument; MySQL dotyczy pomiaru/panelu, nie treści kalendarza.
- W panelu dashboard grupować zapytania SQL; nie generować raportu w pełnym zakresie na każdą publiczną odsłonę.

### 10.4 Plan testów obciążeniowych

**Cel orientacyjny, do potwierdzenia testem:**

- 100, 250 i 500 krótkotrwałych równoczesnych wejść (testować stopniowo; nie wykonywać agresywnych testów bez zgody operatora i poza środowiskiem produkcyjnym).
- Sprawdzić `p95`, `p99`, TTFB, 5xx, błędy PHP, zużycie CPU/RAM, obciążenie MySQL, liczbę procesów i zachowanie endpointu statystyk.
- Dla każdego scenariusza odnotować liczbę żądań, czas trwania, wskaźnik błędów, przybliżoną przepustowość.
- Jeśli pojawią się błędy 503/508 lub wysokie opóźnienia: najpierw zoptymalizować zasoby i SQL, potem zwiększyć plan lub wdrożyć rozwiązanie cache/statyczne.
- Zlecenie nie daje podstaw do gwarantowania obsługi **1000 jednoczesnych żądań** bez pomiarów.

### 10.5 Obsługa incydentów i zgłoszeń

- Ustalić z ŚOA adres e-mail i telefon do zgłaszania awarii oraz godziny dostępności wykonawcy.
- Monitorować HTTP 200 strony głównej, certyfikat i błędy PHP, a także podstawową ścieżkę odblokowania.
- Incydenty klasyfikować: `P1` (strona nie działa / zadania wyciekły), `P2` (statystyki nie działają), `P3` (drobny błąd wizualny).
- Niezwłocznie **rozpocząć działania** przy zgłoszeniu; czas usunięcia zależy od przyczyny. Konkretny SLA wpisuje się do umowy dopiero po uzgodnieniu.
- Plan awaryjny: kopia kodu i bazy, szybki rollback, zachowany raport stanu.

---

## 11. Dostępność cyfrowa — warunek projektu publicznego

Dla serwisu zamówionego przez podmiot publiczny należy przyjąć wymagania polskiej ustawy o dostępności cyfrowej i odpowiadające jej kryteria **WCAG poziomu AA**. Nie wystarczy, że strona działa na telefonie. ŚOA powinien zatwierdzić obowiązki związane z deklaracją dostępności oraz jej treść. Źródła: https://www.gov.pl/web/dostepnosc-cyfrowa/omowienie-wymogow-dostepnosci-cyfrowej-dla-podmiotow-publicznych oraz https://www.gov.pl/web/dostepnosc-cyfrowa/jak-dbac-o-dostepnosc-cyfrowa-w-umowach-i-zamowieniach-publicznych

Checklista:

- [ ] Język dokumentu `lang="pl"`, semantyczne nagłówki H1/H2, poprawna kolejność tabulacji.
- [ ] Wszystkie okienka obsługiwane przez klawiaturę (`Tab`, `Enter`, `Space`), widoczny focus.
- [ ] Opisy przycisków: dzień, stan i dostępność, a nie sam numer/ikona.
- [ ] Informacja o dostępności kolejnego dnia odczytywana przez technologie asystujące; niewidoczne zadania nie mogą być fokusowalne.
- [ ] Poprawny kontrast tekstu, ikon funkcjonalnych i stanów; żadnego przekazu wyłącznie kolorem.
- [ ] Tekst powiększany do 200%, brak utraty funkcji przy małym viewport/zoom; brak poziomego przewijania całej strony.
- [ ] Elementy dekoracyjne `alt=""`/`aria-hidden="true"`; logotyp ŚOA i obowiązkowe znaki mają odpowiednią alternatywę tekstową.
- [ ] Brak automatycznego ruchu rozpraszającego; szanuj `prefers-reduced-motion`.
- [ ] Czytelna informacja o błędach, dostępny formularz logowania admina, etykiety inputów.
- [ ] Wykresy panelu mają tabele i tekstowe podsumowania danych.
- [ ] Weryfikacja czytnikiem ekranu, nawigacją klawiaturą i narzędziami (axe/Lighthouse) + test manualny.
- [ ] Deklaracja dostępności i kanał zgłoszenia barier — zgodnie z ustaleniami ŚOA.

---

## 12. Treści i mikrocopy

Przykładowe komunikaty (do akceptacji ŚOA):

| Sytuacja | Tekst |
|---|---|
| Nagłówek | „E-kalendarz adwentowy” |
| Opis | „Codzienna chwila uważności, relaksu i troski o siebie.” |
| Przed startem | „Pierwsze okienko otworzy się 1 grudnia. Zapraszamy!” |
| Przyszły dzień | „To okienko będzie dostępne od {dzien} grudnia.” |
| Dostępny dzień | „Odkryj zadanie na {dzien} grudnia” |
| Powrót | „Możesz wrócić do wszystkich udostępnionych wcześniej okienek.” |
| Pamięć przeglądarki | „Twój postęp jest zapamiętywany w tej przeglądarce. Po zmianie urządzenia historia otwarć nie przeniesie się, ale wszystkie dotychczas dostępne zadania nadal możesz otworzyć.” |
| Koniec kampanii | „Dziękujemy za wspólne grudniowe chwile. Kalendarz zakończył działanie.” |
| Dostępność | „Jeśli napotkasz barierę dostępności, skontaktuj się z organizatorem.” |

Nie pisać „zadanie ukończone”, gdy mierzymy tylko kliknięcie. Nie pisać „1000 uczestników”, gdy znamy tylko liczbę identyfikatorów.

---

## 13. Testy — lista odbiorowa QA

| ID | Test | Oczekiwany wynik |
|---|---|---|
| T01 | Serwerowa data `2026-11-30 23:59` | 0 zadań; 24 zamknięte. |
| T02 | `2026-12-01 00:00` | Dostępny tylko 1, brak treści 2–24 w source. |
| T03 | `2026-12-10 12:00`, świeża przeglądarka | Można otworzyć dni 1–10 w dowolnej kolejności. |
| T04 | `2026-12-24 00:00` | Wszystkie dni 1–24 dostępne. |
| T05 | Data telefonu przesunięta na 24 XII | Dostęp nadal określa rzeczywisty czas PHP. |
| T06 | Podejrzenie HTML/JS/DevTools przed czasem | Brak tekstów przyszłych zadań, brak w publicznym JSON. |
| T07 | Bezpośredni request o przyszły dzień | Serwer nie ujawnia treści. |
| T08 | Ponowne odwiedziny na tym samym urządzeniu | Wizualna historia prawidłowa. |
| T09 | Inne urządzenie / inna przeglądarka | Brak historii; dotychczasowe zadania wciąż dostępne. |
| T10 | Usunięcie localStorage | Brak historii; brak blokad zadań. |
| T11 | Wyłączony localStorage / prywatny tryb | Kalendarz nadal działa bez błędu krytycznego. |
| T12 | Strona otwarta przez północ | Po odświeżeniu/wybudzeniu nowe zadanie dostępne. |
| T13 | Cache aktywny i odświeżenie o północy | Brak starej lub przedwcześnie ujawnionej treści. |
| T14 | Ponowne kliknięcie tego samego dnia | Brak niezamierzonego podwójnego „pierwszego otwarcia” w wybranej metodologii. |
| T15 | Wysłanie `windowDay=25`, metody GET, zły JSON | Endpoint odrzuca żądanie. |
| T16 | Brak zgody analitycznej | Kalendarz i postęp działają, bez niedozwolonego śledzenia. |
| T17 | Wycofanie zgody (jeśli dotyczy) | Kończy się przyszły pomiar; działa usuwanie/obsługa danych zgodnie z metodologią. |
| T18 | Dostęp `/statystyki` bez loginu | Brak raportu i danych; przekierowanie do logowania/403. |
| T19 | Dostęp do CSV/PDF bez sesji | Brak pliku i informacji statystycznych. |
| T20 | Wariant mobilny 320/360/390/768/1024/1440 px | Czytelność, brak nakładania, responsywny układ. |
| T21 | Nawigacja klawiaturą i czytnik ekranu | Wszystkie zadania/komunikaty dostępne. |
| T22 | Loga UE i ŚOA na telefonie | Zgodny układ, brak mikroskopijnych znaków i zniekształceń. |
| T23 | Symulowany błąd bazy statystyk | Kalendarz działa, błąd bez wycieku danych. |
| T24 | Test obciążenia (kontrolowany) | Poziom błędów/opóźnień w przyjętych granicach. |
| T25 | 27 grudnia | Zachowanie zgodne z uzgodnionym planem wyłączenia. |
| T26 | Raport końcowy | Zgodne definicje, okres i metodologia; bez fikcyjnych liczb. |

**Nie testować daty produkcyjnej poprzez niestrzeżone `?day=24` ani poleganie na zmianie zegara urządzenia.**

---

## 14. Harmonogram i odbiór

| Etap | Zalecana data | Wynik |
|---|---|---|
| Akceptacja oferty i uzgodnienie pomiaru/RODO | do 06.11 (propozycja) | Zgoda na model A/B, kryteria odbioru. |
| Pozyskanie materiałów ŚOA i logotypów | do 09.11 (propozycja) | 24 zadania + pliki oficjalne + wytyczne. |
| Implementacja pierwszej wersji | 10–16.11 | Kalendarz, podstawy RWD i PHP. |
| Statystyki, bezpieczeństwo, dostępność | 17–19.11 | Panel i raport testowy. |
| Weryfikacja projektu przez ŚOA | 20–22.11 | Uwagi i zatwierdzenie grafik. |
| Ostateczne poprawki i testy | 23.11 | Gotowy staging/produkcja. |
| **Odbiór najpóźniej** | **24.11.2026** | Protokół/mail z akceptacją. |
| Kontrola przedstartowa | 30.11 | DNS, SSL, czas serwera, monitoring, backup. |
| Kalendarz działa | 01–26.12 | Utrzymanie, obsługa zgłoszeń. |
| Raport i zakończenie | po 26.12, zgodnie z umową | Raport + dalsze kroki retencji. |

Terminy pośrednie są propozycją organizacyjną. Zmiany treści po akceptacji, opóźnienie logotypów lub dodatkowe wymagania WCAG/analityczne mogą wymagać ponownego uzgodnienia harmonogramu.

### Protokół akceptacji (minimalny)

- [ ] ŚOA zatwierdził oprawę graficzną i wszystkie logotypy.
- [ ] ŚOA zatwierdził komplet 24 zadań i zasady ich dostępności.
- [ ] ŚOA zaakceptował opis statystyk, w tym różnicę między identyfikatorem a osobą.
- [ ] Potwierdzono hosting, datę wyłączenia, kontakt awaryjny i obsługę incydentów.
- [ ] Potwierdzono dokumenty prywatności i dostępności.
- [ ] Przekazano adres subdomeny, sposób dostępu do panelu, instrukcję dystrybucji jednego publicznego linku.
- [ ] Potwierdzono wyniki testów i datę odbioru.

---

## 15. SEO, reputacja, logo e-Advent i wykorzystywanie realizacji

- Ruch na subdomenie **nie gwarantuje automatycznego wzrostu pozycji** głównej domeny e-Advent.pl.
- Na stronie publicznej wystarczy dyskretny, zaakceptowany link w stopce „Realizacja techniczna: e-Advent”; bez reklam, popupów sprzedażowych i profilowania użytkowników.
- Jeżeli to link sponsorowany/wynikający z płatnej relacji, ocenić poprawne oznaczenie `rel="sponsored"` lub `nofollow` zgodnie z zasadami Google.
- Można poprosić ŚOA o **odrębną zgodę** na publikację logo, zrzutów, case study i agregatów w portfolio oraz referencję.
- Nie wykorzystywać danych powstałych w ramach kampanii do własnego marketingu bez odrębnej podstawy i ustaleń.
- Nie sugerować, że UE lub Ośrodek promują czy finansują działalność handlową e-Advent.
- Po 26.12 nie przekierowywać bez zgody ŚOA na sklep ani nie przejmować ruchu kampanii do kampanii reklamowych.

---

## 16. Gotowość produkcyjna — końcowa lista kontrolna

**Technologia:**

- [ ] Subdomena + TLS, PHP z poprawną strefą, aktualny kod w repozytorium.
- [ ] Wszystkie treści 24 dni znajdują się wyłącznie w prywatnym pliku serwerowym.
- [ ] API zadań i HTML nie ujawniają przyszłości; cache sprawdzony.
- [ ] localStorage zapisuje tylko historię wizualną i działa z fallbackiem.
- [ ] Ochrona panelu, eksportów, DB, logów, admina.
- [ ] Wybrana i zatwierdzona metoda pomiaru nie zaniża ani nie zawyża celowo raportu.
- [ ] Monitoring + kopia zapasowa + próba odtworzenia + procedura incydentowa.

**Projekt i formalności:**

- [ ] Logotypy od ŚOA i oficjalne oznaczenia programu, zaakceptowane przez Zamawiającego.
- [ ] Poprawne oznaczenie finansowania widoczne w interfejsie i zgodne z wytycznymi.
- [ ] RWD, dostępność cyfrowa, deklaracja dostępności i sposób kontaktu.
- [ ] Zatwierdzone warunki RODO/PKE i ewentualna umowa powierzenia.
- [ ] Zatwierdzony tekst prywatności, zasady logów, zgód i retencji.
- [ ] Uzgodniony protokół odbioru, termin utrzymania, sposób dostarczenia raportu.

---

## 17. Najważniejsze kompromisy i ryzyka

1. **Nie da się policzyć „faktycznej liczby osób” bez wiarygodnej indywidualnej identyfikacji.** Można policzyć szacowane przeglądarki przy określonych warunkach lub same zbiorcze zdarzenia. Obowiązkowo zmienić tę definicję w akceptowanym zakresie.
2. **localStorage nie zapewnia synchronizacji urządzeń** i nie powinien być przedstawiany jako centralne konto.
3. **PHP na serwerze chroni przed prostym podglądem przyszłych zadań**, ale nie chroni przed wyciekiem z repozytorium, backupów, panelu hostingu lub błędną konfiguracją.
4. **Publiczny endpoint statystyk pozostaje podatny na automatyzację zdarzeń** mimo CORS i walidacji; miary są analityczne, nie dowodowe.
5. **SH 1 może wystarczyć, ale nie ma gwarancji wydajności bez testów**; gotowość pod 1000 użytkowników nie oznacza automatycznie odporności na 1000 jednoczesnych kliknięć.
6. **Zgodność z WCAG i zasady informacji UE są częścią realizacji**, nie opcjonalną dekoracją.
7. **RODO i PKE wymagają rzeczywistej analizy mechanizmu**, a nie zastąpienia cookie identyfikatorem localStorage.
8. **Deadline 24.11 obejmuje akceptację klienta**, więc trzeba na nią zarezerwować czas.

---

## 18. Źródła i materiały referencyjne (sprawdzono 04.11.2026)

- Śląski Ośrodek Adopcyjny, opis projektu: https://soa-katowice.pl/projekt/
- Oficjalna informacja o programie/projekcie: https://funduszeue.slaskie.pl/pl/web/guest/w/skoordynowane_wsparcie_pre_i_post_adopcyjne
- Zasady promocji i oznakowania Funduszy Europejskich dla Śląskiego: https://funduszeue.slaskie.pl/web/guest/w/zasady_promocji_oznakowania
- Ministerstwo Cyfryzacji: wymagania dostępności cyfrowej: https://www.gov.pl/web/dostepnosc-cyfrowa/omowienie-wymogow-dostepnosci-cyfrowej-dla-podmiotow-publicznych
- Dostępność w umowach z wykonawcami: https://www.gov.pl/web/dostepnosc-cyfrowa/jak-dbac-o-dostepnosc-cyfrowa-w-umowach-i-zamowieniach-publicznych
- Prawo komunikacji elektronicznej: https://eli.gov.pl/eli/DU/2024/1221/ogl
- UODO — administrator i procesor: https://uodo.gov.pl/pl/675/4229
- PARP — umowa powierzenia: https://www.parp.gov.pl/component/content/article/82121:weryfikacja-podmiotu-przetwarzajacego-dane-osobowe
- OWASP — CSRF Prevention Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- SeoHost — specyfikacja pakietów: https://seohost.pl/specyfikacja-techniczna

---

## 19. Krótkie podsumowanie dla programisty

**Zbuduj lekką aplikację PHP** na subdomenie ŚOA. PHP decyduje o dostępnych okienkach według `Europe/Warsaw`, wysyła tylko zadania do aktualnego dnia, a frontend pokazuje interaktywny kalendarz i zapisuje historię otwarć lokalnie. Kalendarz nie wymaga konta. Panel `/statystyki` działa oddzielnie i za hasłem; analityka jest minimalna, z metodologią ustaloną z ŚOA/IOD. Grafika i finansowanie UE korzystają z oficjalnych znaków Ośrodka i programu, a e-Advent pozostaje dyskretnym wykonawcą. Wszystko responsywne, dostępne cyfrowo, przetestowane na szczytach ruchu, odebrane do 24.11.2026 i utrzymywane do 26.12.2026 włącznie.
