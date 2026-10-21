# Stabilizacja e-advent — 17.10.2026

Pierwsza partia napraw po audycie `audit-2026-10-16/README.md`. Zmiany są lokalne; nie wdrażano ich na produkcję, nie uruchamiano migracji ani prawdziwych płatności/wysyłek e-mail. Wcześniejsze zmiany grafik i układu zdrapek zostały zachowane.

## Dostęp i aktywacja

- Darmowa aktywacja wymaga tokena edycji i adresu zgodnego z właścicielem kalendarza. Kod odzyskiwania nie trafia do odpowiedzi API; otrzymuje go skrzynka właściciela.
- Płatny dostęp również wysyłany jest do właściciela kalendarza, nawet gdy zamówienie opłaca osoba z innym adresem.
- Kody generowane są przez `crypto.randomInt`. Odzyskiwanie kalendarza i błędne próby dostępu do współpracy mają limit częstotliwości.
- Tworzenie płatności dla kalendarza wymaga jego tokena edycji. Frontend przechowuje tokeny osobno dla każdego kalendarza, również po dodaniu zdrapki do koszyka.
- Szczegóły płatności i potwierdzenie wymagają klientowego sekretu Stripe. Dodano odpowiedni nagłówek do CORS i obsługę w kliencie.
- Nieaktywny kalendarz nie pozwala otwierać dni ani korzystać z tras dodatków.
- Walidatory tworzenia/edycji sprawdzają właściwy, zagnieżdżony obiekt `calendar`.
- Logowanie HTTP nie zapisuje już treści żądań, odpowiedzi ani parametrów zapytania zawierających potencjalne sekrety.

## Płatności

- Zamówienie i pozycje zapisują się w transakcji. Aktualizacja oczekującego zamówienia blokuje jego wiersz i obejmuje wymianę pozycji. Błąd bazy uniemożliwia zwrócenie sekretu do płatności.
- Zapytania modeli wewnątrz `withTransaction` korzystają z tej samej sesji MySQL dzięki `AsyncLocalStorage`; nie są ponawiane na innym połączeniu po utracie połączenia transakcyjnego.
- Webhook blokuje wiersz zamówienia, sprawdza kwotę, otrzymaną kwotę, walutę, status Stripe i sumę zapisanych pozycji. Korzysta z cen zamówienia, a nie z aktualnego cennika.
- Aktywacja wszystkich kalendarzy i oznaczenie zamówienia jako opłaconego są atomowe. Powtórne zdarzenie nie zmienia kodu dostępu ani statusu realizacji.
- Błąd obsługi webhooka zwraca HTTP 500, umożliwiając ponowienie przez Stripe. Opóźniony `payment_failed` nie cofa zamówienia opłaconego.
- `confirm-payment` nie zapisuje już statusu zamówienia. Frontend weryfikuje płatność przez API i krótko czeka na webhook zamiast ufać `redirect_status` lub localStorage.
- Zrezygnowano z dopasowywania koszyka wyłącznie po e-mailu i kwocie. Ponowne użycie oczekującego zamówienia sprawdza też adres kupującego i przynależność kalendarzy.
- Darmowa aktywacja anuluje oczekujący intent pojedynczego kalendarza. Nie zeruje wartości całego koszyka i nie oznacza nieopłaconego intentu jako opłaconego.
- Ponowienia webhooka pomijają wysyłki zapisane już jako udane. Nie jest to jeszcze pełna kolejka wysyłkowa — ograniczenia opisano poniżej.

## PDF i postęp dodatków

- Obrazy PDF mogą pochodzić z lokalnych uploadów, ograniczonych danych JPG/PNG lub dokładnie wskazanych originów HTTPS.
- Pobieranie z sieci blokuje prywatne adresy IPv4/IPv6 i przypina zweryfikowany wynik DNS do połączenia. Nie podąża za przekierowaniami; obowiązuje limit 10 MB i 10 sekund.
- Obrazy użytkownika są dekodowane i ponownie kodowane przed przekazaniem do biblioteki PDF. Limit rozmiarów to 8192 px na bok i 24 mln pikseli. Sprawdzono PNG, który wcześniej kończył proces błędem biblioteki `png-js`.
- Dodano limit eksportów. Ta sama ochrona źródeł działa w eksporcie zdrapek, bez zmiany lokalnych presetów ani grafik użytkownika.
- Zamknięta kapsuła nie może być eksportowana do PDF ani ponownie zapieczętowana z wcześniejszą datą. Jej zapisany snapshot jest niezmienny; po odsłonięciu odczyt i eksport używają tego snapshotu.
- Odczyt zdalnego postępu nie jest już nadpisywany stanem początkowym, gdy odpowiedź nie zawiera `dateGate`. Błędy sieci są obsługiwane; spóźnione odpowiedzi nie nadpisują nowszego stanu interfejsu.

## Buildy i porządki

- Naprawiono komplet pól VAT dla pustego koszyka, typy adresów dostawy, `catalogTaskId` i nieużywane parametry.
- Funkcje adresowe, stałe metod otwierania oraz hooki kontekstu wydzielono z plików komponentów. Usunięto nieużywany mock `src/api/stripe.ts`.
- Renderer zdrapek jest ładowany dopiero w chronionej trasie eksportu; testy API nie importują już niepotrzebnie jego zależności ESM.
- Android: poprawiono nieaktualne API stylów, props obrazu i enum ImagePicker. Usunięto modyfikowanie `Text.defaultProps`.
- Metro rozwiązuje wspólne grafiki przez jawny alias. Usunięto nieprawidłowe eksporty pakietu assets wychodzące poza jego katalog. Włączono wyszukiwanie zależności zagnieżdżonych oraz zachowano resolver Expo. Ujednolicono literę dysku Windows, aby mapa plików widziała polyfille Expo.
- Błąd sieci podczas logowania Androida nie usuwa zapisanych danych sesji; błędne poświadczenia nadal je unieważniają. To nie jest jeszcze pełny tryb offline.
- Tryb testowy MySQL wymaga jawnych `MYSQL_TEST_DATABASE`, `MYSQL_TEST_USER`, `MYSQL_TEST_PASSWORD`; nie przechodzi na produkcyjne credentiale.
- Wykonano `npm audit fix --ignore-scripts` bez `--force` i aktualizację Nodemailer do `^10.1.2`. Lockfile obejmuje również aktualizacje zależności pośrednich/narzędzi.

## Weryfikacja

- Cały `npm test` przeszedł po aktualizacji zależności; końcowy powtórzony przebieg API po ostatniej ochronie obrazów: **187/187**.
- Frontend: **75/75**, panel: **6/6**, mobilne testy pomocników sesji: **4/4**. Łącznie **272** testy w końcowym zestawie.
- Build produkcyjny strony i panelu: sukces. Pozostały ostrzeżenia o rozmiarach paczek i mieszanych importach dynamicznych/statycznych.
- Lint strony i panelu: bez błędów i ostrzeżeń.
- TypeScript aplikacji mobilnej: sukces.
- Eksport Expo Android wraz z Hermes: sukces, `apps/e-advent-app/dist/audit-android`. Użyto lokalnych adresów testowych i `EXPO_NO_DOTENV=1`; to artefakt kontrolny, nie wydanie produkcyjne.
- Rzeczywisty render PDF ze zdjęciami oraz z problematycznym PNG: sukces. Test serializacji nowej wersji Nodemailer do bufora: sukces, bez SMTP.
- `git diff --check`: sukces.
- Audyt `npm audit --omit=dev`: **55 → 35 zgłoszeń**, **2 → 0 krytycznych**; pozostało 26 high i 9 moderate. To zgłoszenia drzewa zależności, nie liczba potwierdzonych ścieżek ataku. Szczegóły: `audit-2026-10-16/npm-audit-after.json`.

Testy HTTP korzystały z atrap bazy, Stripe i e-maila. Nie zastępują próby na MySQL i testowym koncie Stripe. Eksport JS/Hermes nie potwierdza zbudowania, podpisania i działania APK na urządzeniu.

## Wymagania przed wdrożeniem

1. Wdrożyć frontend razem z API: zmieniły się wymagania tokenów aktywacji, checkoutu i odczytu płatności. Stare otwarte sesje checkoutu mogą wymagać ponownego wejścia na płatność.
2. Uzupełnić `PDF_IMAGE_ORIGINS` dokładnymi originami własnego magazynu Blob/CDN, np. `https://twoj-store.public.blob.vercel-storage.com`. Pusta wartość celowo wyłącza zdalne obrazy. Uploady lokalne i dane inline pozostają dostępne. `.env.example` zawiera nową opcję; nie zmieniano istniejącego `.env`.
3. Zapewnić wszystkie istniejące tabele, zwłaszcza `order_items`, `email_sends`, `special_window_progress` i `date_gate_entries`. Brak tabel nie jest już maskowany jako udana płatność lub eksport bez sprawdzenia blokady. Ta partia nie dodaje migracji schematu.
4. Sprawdzić istniejące kody dostępu. Poprawka zamyka nowe ścieżki ujawnienia, ale **nie unieważnia kodów wydanych wcześniej**. Przed wdrożeniem należy zaplanować ich rotację i bezpieczne ponowne przekazanie właścicielom. W tej sesji nie zmieniano produkcyjnych kodów ani nie wysyłano wiadomości.
5. Przeprowadzić zakup testowy, ponowienie webhooka, awarię bazy/SMTP i darmową aktywację na środowisku staging. Zweryfikować transakcje na rzeczywistym MySQL/InnoDB.

## Pozostały zakres audytu

- Współpraca nadal używa e-maila + kodu kalendarza jako tożsamości. Osobna zweryfikowana tożsamość użytkownika i świadoma akceptacja zaproszeń pozostają kolejnym etapem, podobnie jak rotacja starych poświadczeń.
- Potrzebna jest trwała kolejka e-maili oraz obsługa równoległych wysyłek i awarii między wysłaniem SMTP a zapisem logu. Obecna deduplikacja chroni zwykłe ponowienia, ale nie gwarantuje dokładnie jednej wysyłki w takich sytuacjach.
- Tworzenie intentów Stripe i transakcja MySQL nie stanowią wspólnej transakcji rozproszonej. Pozostaje utwardzenie idempotencji równoległych rozpoczęć checkoutu oraz uzgadnianie osieroconych intentów po awarii.
- Pozostałe zgłoszenia npm dotyczą drzewa Expo/React Native/CLI. Wymagają osobnej aktualizacji zgodnej z SDK; nie stosowano proponowanych przez npm downgrade'ów Expo ani `--force`.
- Nadal trzeba ujednolicić wersję natywną Androida, skonfigurować właściwy podpis release, ograniczyć niepotrzebne uprawnienia i sprawdzić APK na urządzeniu.
- Otwarcie dni ma teraz wymóg aktywnego kalendarza; pełne reguły daty otwierania po stronie serwera i semantyka trybu demonstracyjnego wymagają dokończenia.
- Niedokończone szablony DIY, rozbieżności generatora/katalogu, rozmiary PDF i paczek web oraz pełna synchronizacja/offline nadal wymagają pracy. Ta partia nie jest deklaracją zamknięcia całego audytu.
