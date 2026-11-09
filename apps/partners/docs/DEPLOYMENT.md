# Wdrożenie soa-katowice.e-advent.pl

Instrukcja kopiowania plików z ZIP do istniejącego katalogu public: [Wgranie na hosting](WGRANIE-NA-HOSTING.md).

## Przed odbiorem od ŚOA

- Oficjalne logo Ośrodka i oficjalny pasek finansowania, wariant mobilny, zgoda na dyskretny podpis e-Advent.
- Komplet 24 zaakceptowanych ćwiczeń, opis projektu i dokładny tekst finansowania.
- Akceptacja dostępności wcześniejszych dni do 26.12 i ekranu zakończenia od 27.12.
- Zatwierdzenie definicji raportu: odsłony i otwarcia, nie osoby ani wykonanie zadania. Jeśli wymagane unikalne przeglądarki, potrzebne jest osobne wdrożenie modelu B.
- Kontakt administratora/IOD, dane do deklaracji dostępności, polityka prywatności i okresy retencji.
- Osoba akceptująca, termin odbioru, kontakt awaryjny i uzgodnione godziny reakcji.

## SeoHost

1. Utwórz subdomenę, DNS i certyfikat TLS. Ustaw document root na katalog `.../soa/public`, nigdy na `.../soa` ani katalog monorepo.
2. Wybierz aktualną wersję PHP 8.2+ z `pdo_mysql`, sesjami, JSON i poprawnym czasem serwera. Nie włączaj cache HTML/PHP, API ani raportów w LiteSpeed/proxy.
3. Uruchom `npm run build:partners` lokalnie. Wgraj zawartość `dist/soa` do katalogu kampanii. `private`, `database`, `docs` i `scripts` muszą być poza document root.
4. Utwórz osobną bazę MySQL i zaimportuj `database/schema.sql` kontem wdrożeniowym. Konto aplikacji potrzebuje SELECT/INSERT/UPDATE na tych dwóch tabelach, bez DDL/DROP.
5. Skopiuj `private/config.example.php` do `private/config.local.php`. Ustaw DSN i dane DB, `base_url`, `environment=production`, `preview_now=null`, klucz bezpieczeństwa i hash hasła. Narzędzie `php scripts/set-password.php` czyta hasło z wejścia standardowego.
6. Uzupełnij finalne zadania i sprawdź dostarczone logo ŚOA oraz baner finansowania w obu układach ekranu. Dopiero po rzeczywistej akceptacji ustaw flagi treści, brandingu i dokumentów.
7. Nadaj PHP prawo zapisu tylko w prywatnym `storage/` i katalogu sesji hostingu; nie stosuj 777. Sekrety: 600/640 zależnie od konfiguracji użytkowników.
8. `php scripts/preflight.php` musi zakończyć się bez pozycji BRAK. Sprawdź HTTPS, nagłówki, sesję i endpointy na docelowej domenie. `.htaccess` zakłada bezpośrednie HTTPS; przy terminacji TLS przez proxy skonfiguruj zaufany proxy na hostingu, nie ufaj dowolnemu nagłówkowi klienta.
9. Ustal sposób przekazania hasła upoważnionym osobom. Nie wysyłaj publicznie `demo-access.txt` ani `config.local.php`.
10. Uruchom pomiar dopiero po akceptacji analityki. Wariant bez pomiaru udostępnia ćwiczenia normalnie; raport rzeczywisty pozostanie pusty.

## Odbiór techniczny

- Daty graniczne: przed 1 XII, północ 1 XII, 10 XII, 24 XII, koniec 26 XII, początek 27 XII. Symulację zmieniać wyłącznie prywatną konfiguracją stagingu.
- DevTools/source i `/api/calendar.php`: brak przyszłych treści. Bezpośredni `/dzien/24` przed czasem nie zwraca tekstu.
- `/private/tasks.php`, `/private/config.local.php`, `/database/schema.sql` niedostępne z sieci; PHP wykonywany, nie pobierany jako kod źródłowy.
- Brak logowania uczestników. LocalStorage usunięty/zablokowany nie blokuje ćwiczeń. Powrót po północy odświeża dostępność.
- Raport i CSV wymagają aktywnej sesji, wylogowanie ją kończy. Po 30 minutach bezczynności ponowne logowanie. Limit prób działa również po zmianie sesji.
- Na MySQL: zgoda, cofnięcie, brak zgody, ponowne otwarcie, granice dat, przerwa DB, równoległy zapis. Dwa agregaty muszą być spójne. Liczba zdarzeń obejmuje powtórzenia.
- RWD 320/360/390/768/1024/1440, 200% zoom, klawiatura, czytnik ekranu, kontrast i oficjalne logotypy. Automatyczny test nie zastępuje pełnego audytu.
- Wydruk/PDF i CSV z filtrem dat; demonstracyjne raporty muszą zachować oznaczenie DEMO.
- Test obciążenia stopniowo na uzgodnionym środowisku, bez nieuzgodnionego obciążania produkcji.

## Utrzymanie i zakończenie

Monitoruj stronę główną, `/api/calendar.php`, ważność TLS i błędy PHP. Nie loguj haseł, pełnych payloadów ani sesji. Przy awarii statystyk kalendarz nie wymaga DB; panel pokazuje błąd bez fikcyjnych zastępczych wyników.

Przed zmianami zachowuj poprzedni pakiet, prywatną konfigurację i backup DB poza katalogiem publicznym. Sprawdź odtworzenie na stagingu; rollback kodu nie oznacza cofania bazy. Uzgodnij harmonogram backupów oraz usuwania kopii.

Limiter w `private/storage/limits.json` przechowuje wyłącznie czasowe HMAC adresów; wygasłe wpisy usuwane są przy kolejnych żądaniach. Ustal usunięcie pliku po kampanii oraz retencję logów i sesji. Nie kasuj danych raportu automatycznie 26 XII. Przygotuj raport za 1–26 XII, uzyskaj odbiór, a potem usuń lub zwróć dane zgodnie z instrukcją ŚOA.

Po 27 XII strona dziękuje za udział, a zadania nie są już udostępniane. Panel raportów pozostaje za hasłem. Nie ma przekierowania do sklepu.
