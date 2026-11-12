# Wiadomości od Mikołaja — uruchomienie prywatnego R2

## Co jest przygotowane

Zakup → potwierdzenie płatności Stripe → wiadomość w panelu → e-mail do personalizacji (jeśli dane nie zostały podane przed zakupem) → przypisanie MP3 → odsłuch administratora → e-mail z prywatnym linkiem → strona e-Advent z wielokrotnym odsłuchem i pobraniem MP3.

Ceny brutto z katalogu współdzielonego przez frontend i API: wiadomość 24 zł; dodatek do listu 19 zł; list 29 zł; opcjonalny papierowy certyfikat 9 zł. Pakiet 48 zł lub 57 zł z certyfikatem, plus dostawa. API ustala ceny samodzielnie i dopuszcza najwyżej jeden tańszy dodatek na każdy list. Certyfikat można dobrać na stronie listu albo w koszyku.

Nagranie nie ma publicznego URL. Klient otrzymuje `/od-mikolaja/<losowy-token>`, a API wystawia krótkotrwałe podpisane adresy własnego endpointu audio. Każde pobranie sprawdza wersję tokenu, status wiadomości, opłacenie zamówienia i termin dostępu. API odczytuje R2 i obsługuje `Range` oraz pobranie MP3. Nie trzeba ustawiać CORS na R2; przeglądarka nie łączy się z R2 bezpośrednio.

## List, certyfikat i wiadomość dla rodzeństwa

Na stronie papierowego listu klient wybiera od 1 do 9 egzemplarzy. Może dobrać imienne certyfikaty, po jednym na list, oraz zaznaczyć dodatek głosowy. To pole dodaje do koszyka jedno nagranie. API sprawdza cenę i liczbę dodatków przy zakupie. Część papierowa trafia do realizacji zamówień z dostawą, a wiadomość głosowa po płatności trafia do „Wiadomości od Mikołaja” w panelu.

W samodzielnym kreatorze, edycji z koszyka lub formularzu z linku po zakupie wybierz **Dla rodzeństwa**. Podaj 2–9 imion, np. `Zosia, Kuba, Franek`, a poniżej formy powitania w tej samej kolejności, np. `Zosiu, Kubo, Franku`. Wspólnie opisz sukcesy i powody do dumy. W jednym polu możesz też wymienić osobne osiągnięcia każdego dziecka. Praca nad nowymi umiejętnościami, marzenia i wzmianka o bliskich są opcjonalne.

Rodzina otrzymuje jedno nagranie, jeden prywatny link i jeden plik MP3. Cena za nagranie jest taka sama jak dla jednego dziecka. Imiona wpisane na certyfikatach dotyczą wydruku. Imiona do nagrania i ich wymowę rodzic podaje w personalizacji. API szyfruje odpowiedzi i scenariusz w bazie. R2 przechowuje dźwięk.

## Test na tym komputerze

Polecenia uruchamiaj w katalogu głównym repozytorium po `npm install`. Profil Santa uruchamia sklep i panel na osobnych portach. W obu wariantach klient korzysta z tego samego API co administrator. Adresy to [sklep](http://localhost:5183/wiadomosc-od-mikolaja) i [panel](http://localhost:5184/santa-messages).

### Lokalny backend z testową bazą i Stripe

1. W `apps/e-advent-api/.env` wpisz dane prywatnego bucketu do `R2_ACCOUNT_ID`, `R2_BUCKET_NAME`, `R2_ACCESS_KEY_ID` i `R2_SECRET_ACCESS_KEY`. Dla bucketu w jurysdykcji UE ustaw też `R2_JURISDICTION=eu`. Ustaw `SANTA_AUDIO_STORAGE=r2`. W tym samym pliku potrzebne są dane testowej bazy oraz klucze testowego konta Stripe.
2. Przy pierwszej konfiguracji bazy wykonaj `npm run migrate:santa-messages -w e-advent-api -- --test`. Polecenie zakłada brakujące tabele Santa w istniejącej testowej bazie sklepu.
3. Sprawdź połączenie z bucketem poleceniem `npm run check:santa -w e-advent-api -- --r2-only`. Powinny pojawić się potwierdzenia zapisu, odczytu i usunięcia pliku.
4. Uruchom `npm run dev:santa -- --local-api`. Profil wybiera bazę testową, klucze Stripe test, lokalny adres w linkach i włącza oba warianty produktu. API słucha na `127.0.0.1:3103`. Dane R2 są potrzebne od etapu wgrywania nagrania. Po edycji pliku `.env` uruchom proces ponownie.
5. Do próby płatności uruchom zalogowany do **testowego** konta Stripe CLI poleceniem `stripe listen --events payment_intent.succeeded --forward-to http://localhost:5183/api/stripe/webhook`. Wpisz sekret podpisu podany przez CLI do `STRIPE_TEST_WEBHOOK_SECRET` API i uruchom ponownie profil. Korzystaj z testowej skrzynki przy zakupie. W trybie lokalnym wiadomości Santa z linkami trafiają domyślnie do `apps/e-advent-api/storage/dev-mail/`; ustawienie `SANTA_DEV_MAIL_OUTBOX=false` przełącza je na skonfigurowany SMTP. Pozostałe e-maile sklepu korzystają z ustawień poczty zamówień.
6. W sklepie wybierz „Stwórz wiadomość”, uzupełnij przykładowe dane, przejdź przez koszyk i opłać zamówienie w Stripe test. Jeśli dane były podane w kreatorze, wiadomość od razu trafia do realizacji; w przeciwnym razie uzupełnij je przez link z e-maila. W panelu zaloguj się kontem administratora testowej bazy, wybierz zamówienie, wgraj MP3 lub przypisz istniejący obiekt R2. Odsłuchaj i kliknij „Wyślij klientowi”. Otwórz otrzymany link i sprawdź odsłuch oraz pobranie.

### Lokalny sklep i panel z API na Vercelu

1. Na projekcie API w Vercelu uzupełnij środowisko **Preview** dla gałęzi **test**. Ustaw `TESTING_MODE=true`, dane tej samej testowej bazy, Stripe test, SMTP, zmienne R2 z sekcji 1 poniżej i flagi Santa z sekcji 2. Ustaw `FRONTEND_URL=http://localhost:5183` i `PANEL_URL=http://localhost:5184`, aby linki otwierały ten sklep na komputerze testera. Przy wspólnej testowej bazie lokalne i zdalne API muszą używać identycznych kluczy Santa (także JWT, jeśli z niego wyprowadzono klucze). Wdróż kod API zawierający obsługę R2 i wykonaj redeploy po zmianie zmiennych.
2. Podany adres gałęzi jest chroniony przez Vercel Authentication. W projekcie API, w **Settings → Deployment Protection → Protection Bypass for Automation**, wygeneruj sekret. Wklej go na swoim komputerze do `SANTA_VERCEL_AUTOMATION_SECRET` w `apps/e-advent-api/.env`. Lokalne proxy przekazuje go w nagłówku wyłącznie do skonfigurowanego adresu Preview. [Dokumentacja Vercela](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation)
3. Zakończ poprzedni profil (Ctrl+C w terminalu, w którym działa). Uruchom `npm run dev:santa`. Polecenie sprawdzi dostęp do konfiguracji produktu oraz tryb testowy API pod adresem `https://apie-advent-test.vercel.app`, a następnie uruchomi te same lokalne adresy sklepu i panelu. Klucz `STRIPE_TEST_PUBLISHABLE_KEY` na komputerze musi należeć do konta Stripe używanego przez Preview. Dane R2 w lokalnym pliku służą lokalnemu API i sprawdzianowi R2. Zdalny backend korzysta z własnych zmiennych Vercela.
4. Podczas testu webhook można przekazać tym samym poleceniem Stripe CLI przez lokalny sklep. W tym wariancie sekret podpisu z CLI należy ustawić na testowym **Preview**. Pozostaw proces CLI i lokalne proxy uruchomione podczas płatności. E-maile z Preview są wysyłane przez jego SMTP.

## 1. Bucket i dane dostępu

1. Zaloguj się do **Cloudflare Dashboard → R2 Object Storage → Overview**. Otwórz swój prywatny bucket lub utwórz go przez **Create bucket**. Skopiuj jego dokładną nazwę do `R2_BUCKET_NAME`. W ustawieniach bucketu pozostaw wyłączone **Public Development URL (r2.dev)** i publiczną domenę.
2. Na stronie **R2 → Overview** skopiuj **Account ID** do `R2_ACCOUNT_ID`. To 32 znaki szesnastkowe. Możesz je też odczytać z początku nazwy hosta w adresie S3 API endpoint bucketu.
3. Przy **API Tokens** wybierz **Manage**, następnie **Create Account API token**. Wybierz **Object Read & Write** i ogranicz dostęp do konkretnego bucketu. Po utworzeniu skopiuj **Access Key ID** do `R2_ACCESS_KEY_ID` i **Secret Access Key** do `R2_SECRET_ACCESS_KEY`. Sekret jest widoczny przy tworzeniu. [Instrukcja Cloudflare](https://developers.cloudflare.com/r2/api/tokens/)
4. Do testu z lokalnym API wklej wartości do istniejących pól w **`apps/e-advent-api/.env`**. Dla zwykłego bucketu pozostaw `R2_JURISDICTION` puste. Ustaw `eu` tylko wtedy, gdy endpoint bucketu zawiera `.eu.r2.cloudflarestorage.com`. [Jurysdykcje R2](https://developers.cloudflare.com/r2/reference/data-location/)

```dotenv
SANTA_AUDIO_STORAGE=r2
R2_ACCOUNT_ID=
R2_BUCKET_NAME=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_JURISDICTION=
```

5. Z katalogu głównego projektu wykonaj `npm run check:santa -w e-advent-api -- --r2-only`. Sukces oznacza zapis próbnego MP3, odczyt identycznej zawartości i usunięcie pliku. Po zmianie zmiennych uruchom ponownie lokalne API. W panelu możesz wgrać MP3 z komputera albo podać klucz istniejącego obiektu, np. `gotowe/test-rodzenstwo.mp3`.
6. Jeśli sklep i panel mają korzystać z API testowego na Vercelu, otwórz **projekt API → Settings → Environment Variables**. Dodaj tam te same ustawienia dla **Preview** i gałęzi **test**, po czym wykonaj redeploy. Dane dostępowe przechowuje wyłącznie backend. Frontend i panel korzystają z niego również przy odsłuchu. Działanie pełnego zamówienia sprawdź zgodnie z sekcją „Test na tym komputerze”.

Przed pierwszym zamówieniem ustaw trwałe `SANTA_TOKEN_SECRET` i `SANTA_DATA_KEY` (minimum 32 losowe znaki każdy). Bez nich aplikacja korzysta z istniejącego JWT_SECRET. **Nie zmieniaj kluczy po przyjęciu zamówień bez migracji**: zmiana klucza szyfrowania uniemożliwi odczyt danych, a sekretu tokenów unieważni linki. Zachowaj bezpieczną kopię kluczy razem z planem kopii zapasowych bazy.

## 2. API, baza, płatności i e-mail

W `apps/e-advent-api/.env` lub zmiennych środowiska wdrożenia:

```dotenv
SANTA_FULFILLMENT_ENABLED=true
SANTA_ADMIN_REVIEW_REQUIRED=true
SANTA_TTS_AUTOMATION_ENABLED=false
SANTA_AUDIO_RETENTION_DAYS=365
SANTA_SIGNED_URL_TTL_SECONDS=900
SANTA_DEV_MAIL_OUTBOX=false
FRONTEND_URL=https://e-advent.pl
```

Włącz flagi sprzedaży dopiero po konfiguracji i próbnym zamówieniu. Wyłączenie sprzedaży nie wyłącza realizacji już opłaconych wiadomości. Dla lokalnego programowania bez R2 można użyć `SANTA_AUDIO_STORAGE=local` oraz `SANTA_DEV_MAIL_OUTBOX=true`; lokalny magazyn jest blokowany w produkcji. Nie ma automatycznego przejścia do publicznego Blob ani lokalnego dysku po awarii R2.

Uzupełnij istniejące zmienne MySQL, Stripe/webhook, SMTP i `CRON_SECRET` zgodnie z `.env.example`. Uruchom istniejące migracje bazowe projektu oraz migrację Santa na właściwej bazie:

```powershell
npm run migrate:santa-messages --workspace=apps/e-advent-api -- --test
# Na produkcji: to samo polecenie z --prod zamiast --test.
npm run check:santa --workspace=apps/e-advent-api
npm run check:santa --workspace=apps/e-advent-api -- --r2
```

Pierwszy sprawdzian tylko ocenia zmienne bez pokazywania ich wartości; nie sprawdza połączenia MySQL/SMTP. `--r2` dodatkowo zapisuje losowy testowy MP3 pod `santa-messages/healthcheck/`, odczytuje, porównuje i usuwa **wyłącznie ten plik**. Przy błędzie usuwania sprawdź ten prefiks. Do sprawdzenia wyłącznie połączenia z bucketem służy parametr `--r2-only`.

Obecny cron `/api/v1/cron/daily-windows` zawiera odzyskiwanie zamówień Santa, ponawianie e-maili i retencję, ale działa raz dziennie. Dla obsługi produkcyjnej ustaw dodatkowo wywołanie **co 5 minut** `GET /api/v1/cron/santa-messages` z nagłówkiem `Authorization: Bearer <CRON_SECRET>` w swoim schedulerze. Endpoint akceptuje także POST. Nie umieszczaj sekretu w publicznym URL. Plan Vercel musi obsługiwać potrzebną częstotliwość; można użyć zewnętrznego schedulera. Bez częstszego crona ponowienie po awarii może czekać do następnego dnia. Po pięciu nieudanych próbach e-maila sprawdź historię i ponów z panelu.

## 3. Ręczna realizacja w panelu

1. Otwórz **Wiadomości od Mikołaja** i wybierz opłacone zamówienie. Jeśli klient nie podał danych w kreatorze, poczekaj na personalizację przez link z e-maila. Treść widzi tylko administrator.
2. Przygotuj MP3 (maks. 4 MB, docelowo około 2 minut). API dopuszcza techniczną tolerancję 15 sekund.
3. Wgraj plik do prywatnego R2, np. `gotowe/zamowienie-123.mp3`.
4. W panelu wklej **klucz obiektu**, nie URL, do pola „Nagranie z prywatnego R2” i kliknij „Przypisz plik z R2”. API sprawdzi plik i zapisze własną kopię pod `santa-messages/<id>/<losowa-nazwa>.mp3`. Kopia zapewnia niezmienność przypisanej wiadomości; późniejsza podmiana pliku źródłowego nie zmieni nagrania klienta.
5. Odsłuchaj plik w panelu. W razie błędu przypisz poprawiony plik przed wysyłką.
6. Kliknij „Wyślij klientowi”. Status `DELIVERED` jest ustawiany dopiero po zaakceptowaniu e-maila przez serwer SMTP. Historia pokazuje błędy i ponowienia; zgoda SMTP nie gwarantuje trafienia do skrzynki odbiorczej zamiast spamu.

Alternatywnie „Wgraj MP3” przesyła plik z komputera do tego samego prywatnego R2. Bez kompletnej konfiguracji API zwróci błąd zamiast zapisać plik publicznie.

„Nowy link” unieważnia stary token **i wcześniej wydane adresy audio**, a następnie wysyła nowy link. Plik po dostarczeniu nie jest podmieniany przez formularz realizacji. Okres dostępu liczy się od pierwszego dostarczenia i nie wydłuża się przy ponownym wysłaniu linku.

API usuwa własne kopie po 365 dniach i ponawia nieudane usunięcia w cronie. Pliki źródłowe w `gotowe/` pozostają własnością operatora — usuń je po przypisaniu albo ustaw osobną politykę retencji dla tego prefiksu. Nie ustawiaj krótszego automatycznego lifecycle dla `santa-messages/`, bo skróciłby obiecany dostęp. Zaplanuj też retencję kopii zapasowych.

## 4. Próba przed włączeniem sprzedaży

W środowisku testowym ze Stripe test mode sprawdź po jednym zamówieniu: wiadomość 24 zł, list + wiadomość 48 zł, pakiet z certyfikatem 57 zł (+ dostawa). Osobna zgoda na wcześniejsze dostarczenie treści cyfrowej powinna być wymagana; API zapisuje jej tekst, wersję i czas serwera w `orders.metadata`, a potwierdzenie jest wysyłane e-mailem. Zamówienie z kodem 100% przechodzi przez tę samą zgodę.

Przejdź personalizację, przypisz testowy MP3, odsłuchaj w panelu, wyślij na własny testowy adres, otwórz prywatny link na komputerze i telefonie. Sprawdź przewijanie, pauzę, zakończenie, powtórkę, pobranie MP3 i ponowne otwarcie linku. Po unieważnieniu linku stara strona i jej adres audio mają przestać działać. Sprawdź także autentyczne dostarczenie SMTP i wywołanie webhooka Stripe.

Automatyczne testy `santaR2`, `santaAudioDelivery`, `santaMessages`, `orderMailer`, `Checkout` i `CartPage` sprawdzają logikę bez prawdziwej płatności i bez wysyłania e-maili klientom. Nie zastępują próby rzeczywistego bucketu/SMTP/Stripe po uzupełnieniu kluczy.

## Źródła i treści formalne

Zaktualizowano regulamin, dostawę i zwroty oraz politykę prywatności pod kątem nagrań, prywatnego R2, cen i zgody na treść cyfrową. Przed publikacją uzupełnij pełny adres przedsiębiorcy/adres zwrotów (obecnie podano wyłącznie Rokietnicę) oraz potwierdź rzeczywistego dostawcę syntezy mowy i zawarte z nim warunki przetwarzania danych. Tych danych nie można wywnioskować z repozytorium.

- [Cloudflare — AWS SDK v3](https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/)
- [Cloudflare — publiczne buckety i r2.dev](https://developers.cloudflare.com/r2/buckets/public-buckets/)
- [UOKiK — wyjątki od prawa odstąpienia, w tym treści cyfrowe](https://prawakonsumenta.uokik.gov.pl/prawo-odstapienia-od-umowy/wylaczenia-prawa-do-odstapienia/)
