# Weryfikacja lokalna — 04.11.2026

Środowisko: PHP 8.4.27, lokalny serwer PHP, dane demonstracyjne, data kampanii ustawiona po stronie serwera na 10.12.2026. Bez połączenia z MySQL.

## Wykonane

- Walidacja składni wszystkich plików PHP i skryptów JS.
- 50 asercji PHP: granice kampanii, północ Warszawa/UTC, brak przyszłych treści, 24 zadania, zakresy dat, zgodność sum i filtrowanie raportu.
- 2 testy historii przeglądarki: nieprawidłowy/zablokowany storage oraz walidacja numerów i duplikatów.
- 4 testy HTTP: udostępnianie zadań, brak cache, niedostępność przyszłego dnia, ignorowanie daty w URL, ochrona raportów i prywatnych plików, odrzucanie nieprawidłowych wywołań analityki, logowanie, filtrowany raport, CSV i wylogowanie.
- Przeglądarka: otwarcie dnia 10 bez otwierania poprzednich dni, modal, Escape, zapis i odtworzenie oznaczenia po odświeżeniu, panel i wylogowanie.
- Widoki 320/360/390/480/768/1024/1440 px: brak poziomego przepełnienia strony i zawartości kafelków. Widoki desktopowy i mobilny oraz formularz logowania i panel zostały obejrzane w przeglądarce.
- Konsola panelu: brak błędów i ostrzeżeń podczas sprawdzenia.
- Dekoracje WebP pomniejszone do rozmiarów używanych przez interfejs; wszystkie zasoby lokalne.
- Nowe obrazy okienek: przycięte przezroczyste marginesy i warianty WebP 640×400 px, razem 78 198 bajtów. Sprawdzone przełączenie close → open oraz odtworzenie obrazu i tytułu po odświeżeniu.

## Pozostaje na środowisku docelowym

- Działające MySQL: import schematu, uprawnienia, transakcje, równoległe wywołania i odporność na awarię bazy.
- Analityka po akceptacji: zgoda/cofnięcie, rate limit i zachowanie liczników w scenariuszach sieciowych.
- DNS/TLS, wykonanie PHP, reguły Apache/LiteSpeed, sesje Secure, cache i fizyczna separacja private/public na SeoHost.
- Pełny audyt dostępności (w tym czytnik ekranu, 200% zoom i finalne logotypy), wszystkie szerokości z briefu, akceptacja wizualna ŚOA.
- Wydruk/eksport PDF z docelowej przeglądarki oraz kontrolowane testy obciążenia hostingu.
- Akceptacja finalnych tekstów i oznaczeń, dokumentów prywatności, retencji, odbioru i procedury awarii.

Te testy nie stanowią deklaracji pełnej zgodności WCAG ani potwierdzenia wydajności hostingu.
