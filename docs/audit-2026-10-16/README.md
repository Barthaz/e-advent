# Audyt e-advent — 16 października 2026

**Wniosek:** projekt ma sensowny podział na aplikacje i istotną część funkcjonalności już zaimplementowaną, ale obecny checkout nie jest gotowy do bezpiecznego wydania. Sklep nie przechodzi kompilacji, Android nie przechodzi pakowania Metro, a w API są potwierdzone problemy tożsamości, płatności i eksportów. Warto rozwijać istniejący projekt po etapie stabilizacji; nie ma podstaw do przepisywania całości.

## Zakres i ograniczenia

Analiza dokumentacji, konfiguracji, głównych przepływów aplikacji, modelu danych, płatności, uprawnień, zapisu postępu i eksportów. Zindeksowano 304 śledzone pliki źródłowe JS/TS, ale nie jest to deklaracja przeglądu każdej linii ani dowód braku wszystkich błędów. Środowisko: Windows, Node 24.16.0, npm 11.13.0, zależności już obecne na dysku. Nie wykonywano czystego `npm ci`.

Sprawdzano bieżący katalog roboczy, w tym zastane niezacommitowane zmiany zdrapek. Nie zmieniono kodu aplikacji, istniejących testów ani zależności. Dodano wyłącznie materiały tego audytu. Generatory treści uruchomione przez `build:packages` nie pozostawiły różnic w śledzonych JSON-ach. Build panelu i smoke eksportu utworzyły pliki wynikowe w ignorowanych katalogach.

Nie wykonywano migracji ani zapisów w rzeczywistej bazie, zakupów, wysyłek e-mail, wdrożenia lub natywnego builda APK/AAB. Próby API używają atrap MySQL, Stripe i SMTP; próby SSRF przechwytują `fetch`, bez łączenia z adresami wewnętrznymi. Nie przeprowadzono pełnego E2E w przeglądarce ani na urządzeniu. Dostępność produkcji, konfiguracja hostingu, backupy, faktyczny schemat MySQL i doręczalność poczty pozostają niezweryfikowane.

## Mapa projektu

- **Sklep:** React, Vite, TypeScript, Tailwind; katalog produktów, kreatory kalendarzy, koszyk, checkout Stripe, strony potwierdzeń, dostęp do kalendarzy, interaktywne dodatki i tracker Mikołaja.
- **API:** Express, MySQL, Stripe, JWT admina, poczta, uploady, współpraca, zadania grupowe, pomysły prezentowe, codzienne wiadomości, PDF/PNG i postęp okienek specjalnych.
- **Panel:** React, Redux Toolkit/RTK Query; logowanie, zamówienia, realizacja i wysyłka, kalendarze, eksport zdrapek, katalog zadań oraz podgląd i uruchamianie e-maili.
- **Android:** Expo/React Native; dostęp przez e-mail i kod, kalendarz, współpraca, zadania, prezenty, lokalne funkcje świąteczne, muzyka i dodatki specjalne.
- **Pakiety:** `types`, `products`, `assets`, `design-tokens`, `special-core`, `render-schema`, `content`. README i przekazane AGENTS.md wymieniają tylko pierwsze trzy.
- **Produkty:** kalendarz interaktywny, zdrapki A4/A3, list do Mikołaja i certyfikat jako dodatek. Logika koszyka obejmuje wysyłkę i rozbicie brutto/netto/VAT.
- **Treści:** katalog 180 zadań, rejestr 72 okienek specjalnych. Kreator korzysta z 144 zadań; 64 spośród 72 specjalnych mają mapowanie w jego indeksie.

Przepływ zakupu: kreator → zapis kalendarza `pending` z UUID i edit tokenem → rozliczenie koszyka po stronie API → Stripe PaymentIntent → webhook → aktywacja kalendarza/realizacja zamówienia → e-mail. Współpraca wykorzystuje kod kalendarza do ustalenia tożsamości e-mailowej, a następnie szuka grupy według e-maila. Ten ostatni krok jest źródłem F01.

## Wyniki uruchomionych sprawdzeń

- **`npm test`: FAIL.** API: 9 zestawów przechodzi, 7 nie uruchamia się; 84 wykonane testy przechodzą. Przyczyną zatrzymania jest import ESM `@react-pdf/renderer` przez `ScratchPdfService.js` w Jest. Ponieważ skrypt główny używa `&&`, pozostałe workspaces nie są uruchamiane po tym błędzie — sprawdzono je oddzielnie.
- **Izolowane testy bezpieczeństwa API: 55/55 PASS w 7 zestawach.** Tymczasowa konfiguracja diagnostyczna zastępuje wyłącznie moduł eksportera zdrapek pustą atrapą. Wynik pokazuje, że dotychczasowe asercje przechodzą po usunięciu przeszkody ładowania; nie oznacza, że standardowe `npm test` działa ani że eksport został przetestowany przez te zestawy.
- **`npm run test:frontend`: 70 PASS, 3 FAIL, razem 73.** Trzy stare asercje pełnej równości obiektów totals nie uwzględniają nowych pól VAT. To nie jest dowód niepoprawnego naliczania kwot.
- **`npm run build:frontend`: FAIL, 8 diagnostyk TypeScript.** Brak pól VAT w pustych totals, niespójne `ShippingAddress`, brak `catalogTaskId` w lokalnych typach zadań, nieużywany argument `progress`.
- **Lint sklepu: 17 błędów i 5 ostrzeżeń.** Głównie nieużywane elementy, organizacja eksportów Fast Refresh i zależności hooków; nie wszystkie są błędami działania produktu.
- **`npm run test:panel`: 6/6 PASS. `npm run build:panel`: PASS.** Ostrzeżenie o głównym JS 529,01 kB i logo 1296,58 kB. Lint: 0 błędów, 1 ostrzeżenie hooka.
- **`npm run test:app`: 4/4 PASS.** Zakres ograniczony do pomocnika sesji, bez ekranów i integracji.
- **TypeScript mobile: FAIL, 16 diagnostyk.** `Text.defaultProps`, `StyleSheet.absoluteFillObject`, `pointerEvents` na `Image` i typ opcji image pickera nie odpowiadają obecnym typom zależności.
- **Eksport Metro Android: FAIL.** `@e-advent/assets/background.png` nie rozwiązuje się. `exports` w pakiecie wskazuje ścieżki wychodzące poza pakiet przez `../..`. Test wykonywano offline z fikcyjnymi adresami publicznymi API/sklepu.
- **`npm run build:packages`: PASS.** Generuje indeks kreatora i rejestr specjalnych okienek; większość pozostałych skryptów tylko wypisuje komunikat. Dodatkowe `tsc --noEmit` dla design-tokens, special-core, render-schema i content przechodzą.
- **`smoke:scratch-export`: PASS w Node 24.** PDF A4: 47 465 047 B, PDF A3: 47 330 845 B, PNG A4 600 DPI: 12 546 072 B. Sprawdzono sygnatury plików i wizualnie PNG z krótkimi testowymi zadaniami. Nie jest to pełna akceptacja druku ani długich tekstów.
- **10 dodatkowych prób API: potwierdza opisane poniżej słabości.** `CONFIRMED` w wynikach oznacza odtworzenie nieprawidłowego zachowania, a nie zaliczenie testów akceptacyjnych.
- **Próba logiki hooka:** potwierdza zastąpienie pobranego postępu pustym stanem, opisane w F08. React i API zastąpiono atrapami; nie jest to test ekranu w przeglądarce.
- **`npm audit --omit=dev`: 55 wpisów dotyczących podatnych pakietów/łańcuchów zależności: 2 critical, 37 high, 16 moderate.** Zapytanie wykonano po zgodzie użytkownika. To nie jest 55 udowodnionych podatności dostępnych przez aplikację; audyt obejmuje także narzędzia Expo/RN zadeklarowane w `dependencies`.

## Problemy do naprawienia

Priorytety: **P0** — pilne zabezpieczenie dostępu; **P1** — przed kolejnym wydaniem; **P2** — porządkowanie i domknięcie produktu. Próby A01–A10 znajdują się w `probes.cjs`.

### F01 · P0 · Kod kalendarza pozwala podszyć się pod niezweryfikowany e-mail

`POST /calendars` przyjmuje dowolny e-mail. `createFree` aktywuje taki kalendarz, zwraca access code w odpowiedzi i może wysłać go na inny e-mail przekazany w tym żądaniu. `authCalendarAccess` uznaje parę e-mail + kod dowolnego aktywnego kalendarza za tożsamość danego e-maila. `Collaboration` wyszukuje członkostwo według e-maila, niezależnie od kalendarza.

**Skutek:** można wytworzyć poświadczenie dla adresu innej osoby bez dostępu do jej skrzynki, a następnie korzystać z jej uprawnień współpracy. A01 potwierdza wydanie kodu i przyjęcie przez middleware tożsamości `victim@example.invalid`; dostęp do grupy wynika z odczytanej logiki modelu, bez prób na rzeczywistych grupach.

**Naprawa:** oddzielić posiadacza linku/kalendarza od zweryfikowanego konta użytkownika; wymagać weryfikacji e-maila przed dostępem do danych grupowych, wiązać grupy ze stabilnym identyfikatorem konta. Samo ukrycie kodu w odpowiedzi nie naprawia całego modelu uprawnień.

Źródła: [createFree](C:/workspace/projects/e-advent/apps/e-advent-api/routes/calendars.js:94), [middleware](C:/workspace/projects/e-advent/apps/e-advent-api/middleware/authCalendarAccess.js:38), [członkostwo](C:/workspace/projects/e-advent/apps/e-advent-api/models/Collaboration.js:30).

### F02 · P1 · Publiczny generator PDF pobiera dowolne adresy obrazów

`POST /special/preview/pdf` jest publiczny. Wariant `then-now-v1` przekazuje `payload.photos.*.url` do `fetch` w rendererze. Nie ma ograniczenia hostów, blokady adresów prywatnych, kontroli przekierowań, limitu pobranej odpowiedzi ani timeoutu tego pobierania. Osobny resolver zdrapek również akceptuje dowolne HTTP/HTTPS; tam jest timeout 30 sekund, ale brak ograniczenia hosta i rozmiaru.

**Dowód:** A10 przeprowadza anonimowe żądanie przez rzeczywiste route, DocumentRegistry i logikę pobierania obrazów; atrapa `fetch` otrzymuje adres loopback. A09 potwierdza resolver zdrapek. Nie skanowano sieci ani nie sprawdzano dostępu do danych infrastruktury. Faktyczny zasięg SSRF zależy od sieci wdrożenia.

**Naprawa:** przyjmować identyfikatory własnych uploadów zamiast dowolnych URL, ograniczyć zdalne źródła, rozmiary i czas pobierania oraz liczbę renderów. Publiczny preview powinien korzystać z kontrolowanych danych demonstracyjnych.

Źródła: [preview](C:/workspace/projects/e-advent/apps/e-advent-api/routes/specialPreview.js:19), [fetch obrazu](C:/workspace/projects/e-advent/apps/e-advent-api/services/special/PdfRenderService.js:520), [zdrapki](C:/workspace/projects/e-advent/apps/e-advent-api/services/scratch/scratchAssets.js:112).

### F03 · P1 · Webhook płatności nie jest odporny na powtórzenia i awarie

Każdy `payment_intent.succeeded` ponownie generuje kod kalendarza i wysyła wiadomości. Brakuje rejestru obsłużonych zdarzeń oraz atomowej obsługi stanu. Błędy w gałęzi sukcesu są przechwytywane i kończą się HTTP 200, co potwierdza odbiór mimo nieukończonej realizacji. Dodatkowo status zamówienia zostaje ustawiony na `succeeded` przed sprawdzeniem kwoty, a wyliczenie kwoty używa bieżącego katalogu zamiast niezmiennego snapshotu ceny zakupu.

**Skutek:** powtórzenie zdarzenia unieważnia poprzedni kod; awaria może zostawić opłacone zamówienie bez dostępu. Zmiana cen między rozpoczęciem zakupu a webhookiem może zatrzymać aktywację. A04 potwierdza zmianę kodu i powtórną wysyłkę, A05 — odpowiedź 200 przy awarii DB.

**Naprawa:** idempotencja po event/PaymentIntent, transakcja lub trwała kolejka, zachowanie istniejącego kodu, powtórzenia tylko nieukończonych etapów, walidacja kwoty i waluty przed przejściem stanu. Wysyłka poczty powinna mieć niezależny trwały stan i ponowienia.

Źródła: [aktywacja](C:/workspace/projects/e-advent/apps/e-advent-api/routes/stripe.js:553), [obsługa awarii](C:/workspace/projects/e-advent/apps/e-advent-api/routes/stripe.js:581), [mailer](C:/workspace/projects/e-advent/apps/e-advent-api/services/orderMailer.js:159).

### F04 · P1 · Można otrzymać dane do płatności bez zapisanego zamówienia

Po błędzie `Payment.createPayment/updatePayment` route loguje problem i nadal może zwrócić `clientSecret`. A06 potwierdza HTTP 200 przy odrzuconym INSERT i braku zamówienia. Model zapisuje zamówienie i jego pozycje osobnymi zapytaniami; `replaceOrderItems` robi DELETE przed INSERT bez transakcji. Może więc pozostać także częściowo zapisane zamówienie.

**Naprawa:** nie dopuszczać do rozpoczęcia płatności bez kompletnego trwałego zapisu; zapewnić atomowy snapshot pozycji, klucz idempotencji i ścieżkę uzgadniania stanu Stripe/DB po awarii.

Źródła: [zignorowanie błędu zapisu](C:/workspace/projects/e-advent/apps/e-advent-api/routes/stripe.js:334), [pozycje zamówienia](C:/workspace/projects/e-advent/apps/e-advent-api/models/Payment.js:431).

### F05 · P1 · Checkout nie potwierdza prawa do projektu i nie izoluje koszyków

`resolveCheckoutItems` sprawdza istnienie i status kalendarza, lecz nie edit token. Route odnajduje i aktualizuje istniejącą płatność po dowolnym wspólnym calendarId. Dla zamówień bez kalendarza dobiera niedawną płatność tylko po e-mailu i kwocie, bez identyfikatora sesji/koszyka.

**Skutek:** znając UUID pending można rozpocząć lub zmienić powiązany checkout. Dwa różne koszyki z tym samym e-mailem i kwotą mogą współdzielić i nadpisywać jedno zamówienie. A03 potwierdza zaakceptowanie projektu bez dowodu edycji; kolizja dwóch koszyków wynika z warunku ponownego użycia płatności i wymaga testu integracyjnego z DB.

**Naprawa:** token uprawnień dla każdej projektowanej pozycji; własny identyfikator sesji zakupu; bezpieczny klucz ponowienia operacji zamiast heurystyki e-mail + kwota.

Źródła: [rozliczanie koszyka](C:/workspace/projects/e-advent/apps/e-advent-api/services/orderCheckout.js:63), [ponowne użycie płatności](C:/workspace/projects/e-advent/apps/e-advent-api/routes/stripe.js:127).

### F06 · P1 · Sklep i Android nie przechodzą procesu wydania

Sklep ma 8 błędów TypeScript, Android 16, a rzeczywisty eksport Androida kończy się błędem wspólnego assetu. Web omija problem assetów aliasami Vite, Metro nie ma równoważnego działającego mapowania.

**Naprawa:** ujednolicić typy adresu, zadań i totals; poprawić zgodność z obecnym React Native; ustalić poprawny sposób eksportowania lub rozwiązywania wspólnych grafik. Dopiero potem wykonać natywny build i test urządzenia.

Źródła: [totals](C:/workspace/projects/e-advent/apps/e-advent-frontend/src/context/CartContext.tsx:53), [eksporty assetów](C:/workspace/projects/e-advent/packages/assets/package.json:13), [mobile](C:/workspace/projects/e-advent/apps/e-advent-app/App.tsx:29), [log Metro](C:/workspace/projects/e-advent/docs/audit-2026-10-16/android-export.log).

### F07 · P1 · Zależności zawierają aktualne zgłoszenia bezpieczeństwa

Audyt npm wskazał 55 wpisów, w tym `proxy-addr@2.0.7` w drzewie Express (critical), `shell-quote@1.10.0` w narzędziach mobilnych (critical), `multer@2.2.0` i `nodemailer@6.10.1` (high). Szczegóły i odsyłacze do advisory zapisano w `npm-audit.json`.

To ocena zależności, nie dowód wykorzystania podatności w tym produkcie. Szczególnie `shell-quote` jest w narzędziach CLI/devtools, a warunki podatności `proxy-addr` należy zestawić z konfiguracją proxy. Priorytetem jest ocena dostępnych z sieci parserów i uploadów API. Nie uruchamiać mechanicznie `npm audit fix --force`: raport proponuje m.in. cofnięcie Expo do 44.0.6, co nie jest sensownym planem migracji tego projektu.

Źródło: [surowy wynik npm audit](C:/workspace/projects/e-advent/docs/audit-2026-10-16/npm-audit.json).

### F08 · P1 · Postęp pobrany z serwera jest zastępowany pustym stanem

W webowym `useSpecialProgress` następuje `setProgress(remote.progress)`, po czym osobny `if (remote.dateGate) ... else if (!local)` ustawia `NOT_STARTED`. Dla zwykłego dodatku bez dateGate i bez lokalnej kopii pobrany postęp zostaje więc od razu utracony w stanie UI. Kolejny zapis użytkownika może nadpisać dane na serwerze.

**Dowód:** `progress-probe.cjs` wykonuje rzeczywistą logikę przetranspilowanego hooka z atrapami; dla zdalnego `IN_PROGRESS` otrzymuje `NOT_STARTED`. To typowy przypadek otwarcia na nowym urządzeniu/przeglądarce.

**Naprawa:** inicjalizować pusty postęp wyłącznie wtedy, gdy nie ma ani zdalnego, ani lokalnego; niezależnie ustawiać dateGate. Następnie określić konflikt lokalny/zdalny i kolejność asynchronicznych zapisów na obu platformach.

Źródło: [hook](C:/workspace/projects/e-advent/apps/e-advent-frontend/src/special-windows/useSpecialProgress.ts:54).

### F09 · P1 · PDF ujawnia treść przed terminem dateGate

Odczyt JSON potrafi ukryć zapieczętowane pola, ale endpoint eksportu pobiera bezpośrednio pełny postęp i wysyła go do renderera bez `getSealedContent`/kontroli terminu. A08 potwierdza przekazanie treści oznaczonej jako zamknięta do 2099 roku do renderera.

**Naprawa:** wspólna kontrola dostępu do treści dla JSON, PDF i każdej przyszłej reprezentacji. Nie traktować blokady UI jako zabezpieczenia.

Źródło: [eksport](C:/workspace/projects/e-advent/apps/e-advent-api/routes/specialWindows.js:332).

### F10 · P1 · Konfiguracja natywnego Androida nie jest gotowa do wydania

Zapisany w repo Gradle ma `versionName "1.0.4"`, `versionCode 1` oraz `release` podpisywany `signingConfigs.debug`; Expo deklaruje 2.0.0. Manifest zawiera `RECORD_AUDIO`, mimo że dokumentacja wyklucza mikrofon i kod aplikacji nie wykazuje funkcji nagrywania.

**Naprawa:** ustalić źródło wersji, podpis produkcyjny i sposób generowania native projektu, usunąć zbędne uprawnienia także z konfiguracji pluginów. EAS może wstrzykiwać własne poświadczenia — nie zweryfikowano żadnego wydanego APK ani konfiguracji konta EAS. Powyższy wniosek dotyczy plików w repo.

Źródła: [Gradle](C:/workspace/projects/e-advent/apps/e-advent-app/android/app/build.gradle:90), [manifest](C:/workspace/projects/e-advent/apps/e-advent-app/android/app/src/main/AndroidManifest.xml:5), [Expo](C:/workspace/projects/e-advent/apps/e-advent-app/app.json:5).

### F11 · P2 · Daty i status kalendarza nie są wymuszane przy otwarciu dnia

`PUT /calendars/:id/open/:day` sprawdza tylko zakres numeru i istnienie kalendarza, a model ustawia `opened`. A02 otwiera dzień 24 kalendarza pending. GET zwraca teksty zamkniętych zadań, choć usuwa ich premium metadata. Web ma także parametr `debugmode=true` umożliwiający obejście ograniczeń UI.

**Kontekst:** kod świadomie traktuje UUID linku jako token dostępu. Sam brak hasła do linku nie jest automatycznie błędem; trzeba jednak jasno ustalić uprawnienia odbiorcy linku, ochronę danych osobowych, możliwość jego unieważnienia i ograniczenia dat. Kod dostępu jest obecnie również sposobem odzyskania linku. Dokumentacja bezpieczeństwa opisuje starszy, inny model.

**Naprawa:** jeżeli kalendarz ma faktycznie wymuszać odliczanie, sprawdzać zakup i datę po stronie API oraz nie ujawniać zamkniętej treści; tryb podglądu wydzielić i kontrolować osobno.

Źródła: [otwieranie](C:/workspace/projects/e-advent/apps/e-advent-api/routes/calendars.js:373), [sanitizer](C:/workspace/projects/e-advent/apps/e-advent-api/services/special/taskSanitizer.js:13), [debug UI](C:/workspace/projects/e-advent/apps/e-advent-frontend/src/pages/CalendarView.tsx:49).

### F12 · P2 · Sukces zakupu jest ustalany także z URL/localStorage

`Success.verifyPayment` uznaje `redirect_status=succeeded` lub zgodność lokalnego PaymentIntent ID za potwierdzenie. Mimo odczytu płatności z API, wynik `stripeStatus` nie stanowi warunku tej decyzji. Następnie wysyłane jest zdarzenie purchase i czyszczony koszyk.

**Skutek:** można wyświetlić fałszywe potwierdzenie i zaburzyć analitykę; samo to nie zmienia statusu płatności w backendzie. Asynchroniczne metody płatności mogą być przedstawione zbyt wcześnie jako ukończone.

**Naprawa:** status `processing`/`pending`/`succeeded` z serwera, oczekiwanie na wynik i czyszczenie koszyka dopiero po potwierdzeniu.

Źródło: [Success](C:/workspace/projects/e-advent/apps/e-advent-frontend/src/pages/Success.tsx:151).

### F13 · P2 · Offline na starcie usuwa sesję mobilną

Bootstrap wywołuje `login`, a jego catch dla każdego błędu — również sieciowego — czyści zapisany e-mail, kod i ID. Chwilowy brak internetu powoduje wylogowanie i konieczność ponownego wpisania kodu. Mobile autosave nie posiada trwałej kolejki wysyłki ani uzgadniania wersji.

**Naprawa:** rozróżnić odrzucenie poświadczeń od awarii sieci; utrzymać sesję/cache offline, zapisy kolejkować i rozwiązywać konflikty według określonej polityki.

Źródło: [ProfileContext](C:/workspace/projects/e-advent/apps/e-advent-app/contexts/ProfileContext.tsx:84).

### F14 · P2 · Dokumentacja 72 dodatków wyprzedza implementację

Generator kreatora ucina każdą kategorię do `order <= 24`; przez to 36 zadań, w tym 8 specjalnych, nie trafia do zwykłego indeksu kreatora. Istnieją w katalogu/rejestrze i mogą być oglądane innymi ścieżkami; nie należy określać ich jako całkowicie nieobecne.

DocumentRegistry dla `paper-village-v1` i `paper-reindeer-v1` dodaje tekst `[Szablon do wycięcia — obrys na arkuszu]`, bez rzeczywistego wektorowego wykrojnika w tej gałęzi. Część innych DIY opiera się na tekście i symbolach. Istnienie descriptorów nie dowodzi ukończenia 72 pełnych produktów.

Dokumentacja zakazuje uploadu zdjęć w v1, a WWW/mobile mają upload do API i publicznego Blob. Należy zdecydować, które wymagania są aktualne, oraz przejść checklistę każdego engine'u i dokumentu. Nie usuwać tych funkcji tylko dlatego, że dokument specyfikacji jest starszy.

Źródła: [generator](C:/workspace/projects/e-advent/packages/content/scripts/build-creator-catalog.mjs:36), [DIY PDF](C:/workspace/projects/e-advent/apps/e-advent-api/services/special/DocumentRegistry.js:602), [upload](C:/workspace/projects/e-advent/apps/e-advent-api/routes/specialWindows.js:256).

### F15 · P2 · Rozmiary eksportów i zasobów wymagają budżetu

Pojedyncze testowe PDF-y zdrapki mają około 47 MB. Generowanie PNG 600 DPI wymaga dużych buforów pamięci. Działa lokalnie, ale równoległe rendery i limity środowiska docelowego nie zostały sprawdzone. Logo w buildzie panelu ma około 1,3 MB, a aplikacja ładuje duży wspólny bundle.

**Naprawa:** ustalić docelową rozdzielczość druku, zoptymalizować obrazy osadzane w PDF, rozdzielić miniatury/UI od plików do druku, ograniczyć współbieżność renderów i przetestować hosting. Nie obniżać jakości druku bez porównania wydruku.

### F16 · P2 · Brak spójnej walidacji i operacyjnych zabezpieczeń

- Walidatory create/update sprawdzają `body('email')` i `body('tasks')`, podczas gdy rzeczywiste dane są w `body.calendar.*`. Brakuje jednolitego schematu i limitów zagnieżdżonych treści/liczby pozycji.
- Login e-mail + access code nie ma dedykowanego rate limitu; kody powstają przez `Math.random`. Istnieją limity admin login/promo/upload, ale nie obejmują całej powierzchni API.
- Logger zapisuje URL/query/body i podglądy odpowiedzi. Nie redaguje konsekwentnie access code, edit tokenu, e-maila i danych adresowych. Parametry query auth są dopuszczone przez middleware.
- `TESTING_MODE=true` może użyć zwykłych credentiali MySQL jako fallback, jeśli brakuje testowych. Nazwa trybu nie gwarantuje izolacji od produkcji.
- Główna migracja nie tworzy tabel postępu/dateGate/email_sends; wymagane są osobne skrypty, bez wspólnego runnera i jawnej wersji schematu. Nie sprawdzano faktycznego schematu istniejącej DB.
- W repo brak `.github`/workflow CI. Nie znaleziono E2E zakupu ani testu natywnego Androida. Istniejące testy API mockują persystencję, więc nie łapią problemów transakcyjności, migracji i realnych zapytań SQL.

## Co warto zachować

- Podział monorepo na cztery aplikacje i wspólne pakiety jest adekwatny do produktu.
- Cenę checkoutu ustala serwer na podstawie SKU z kalendarza/katalogu, wymusza PLN i sprawdza wymaganą wysyłkę. Stare problemy bezpośredniej podmiany ceny/statusu zostały częściowo skutecznie zamknięte.
- UUID i kryptograficzny edit token są generowane na serwerze; edycja pending wymaga tokenu, a edycja opłaconego kalendarza jest blokowana.
- Admin korzysta z bcrypt, weryfikacji JWT i middleware uprawnień; testy sprawdzają odrzucanie nieprawidłowych poświadczeń.
- SQL w przejrzanych ścieżkach jest parametryzowany, a aktualizowane kolumny wybierane z listy dozwolonej.
- Jest wspólny katalog produktów, helper totals, rejestr treści, log e-maili, testy sanitizerów i logiki okienek oraz rzeczywisty działający lokalnie renderer zdrapek.
- Panel kompiluje się i jego istniejące testy przechodzą. To dobry punkt wyjścia do dalszej pracy.

## Elementy zbędne i miejsca do uproszczenia

**Kandydaci do usunięcia po krótkim sprawdzeniu referencji:** `public/vite.svg`, `src/assets/react.svg`, `src/assets/vite.svg`, śledzone pliki `*.alignbak`, szablonowe README Vite. Wyszukiwanie nie znalazło klienta Socket.IO w aplikacjach: serwerowe `join-room`, czat, `custom-event` i przyjmowanie `payment-status` od klienta wyglądają na pozostałość szablonu. Usunąć lub opisać realnego zewnętrznego odbiorcę; obecny Socket.IO nie aktualizuje statusu płatności w DB.

**Duplikacja wymagająca scalenia:** ręcznie utrzymywane `catalog.js` i `catalog.cjs`; deklaracje typów adresu/zadań w wielu miejscach; analogiczne hooki postępu; logika dokumentów w `packages/render-schema` i oddzielnym API DocumentRegistry; tokeny stylów w kilku aplikacjach. Pakiety design-tokens/render-schema/content mają ograniczone wykorzystanie runtime — nie są jeszcze jednym źródłem całego design systemu. Nie usuwać `special-core`, który jest faktycznie używany.

**Organizacja repo:** główny lockfile plus cztery app-specific lockfiles utrudniają ustalenie kanonicznej instalacji. Trzeba zdecydować, czy aplikacje mają wspierać samodzielne instalowanie poza workspace. Aliasów `/api/*` nie usuwać bez sprawdzenia używanych wersji Androida. Generowane JSON-y są pochodnymi danych, więc ich podobieństwo nie oznacza automatycznie zbędnej duplikacji; potrzebują jasno opisanej komendy odtwarzania.

**Złożoność:** Checkout ma 1526 linii, EngineRouter Android 1476, EngineRouter WWW 1250, klient API WWW 1013. Podział na mniejsze moduły ma sens po zabezpieczeniu zachowania testami. Sama liczba linii nie jest błędem, ale utrudnia weryfikację wielu wariantów zakupu i engine'ów.

## Dokumentacja: co traktować jako aktualne

README root opisuje monorepo, ale pomija cztery pakiety. README WWW i panelu są szablonami. README mobile ma nieaktualny opis wersji/wymagań. `STRIPE_PAYMENTS.md` pokazuje starszy kontrakt. Checklisty security nadal wskazują już poprawione luki i stare ceny. `security-fixes-notes.md` mówi o wymaganiu kodu przy open-day, choć obecny kod/testy celowo przyjmują model dostępu linkiem. Specyfikacja special-windows jest obszerną wizją produktu, a nie dowodem ukończenia wszystkich punktów.

Proponowane dokumenty bazowe: aktualny README z siedmioma pakietami, instrukcja bezpiecznego środowiska lokalnego i migracji, kontrakt API, opis tożsamości/linków, schemat stanów zamówienia, checklista wydania Androida i lista dodatków ze stanem implementacji. Historyczne audyty warto zachować i oznaczyć jako archiwalne.

## Kolejność dalszej pracy

1. **Zabezpieczenie:** F01, F02, F09; model konta i uprawnień, ograniczenie publicznych renderów, wspólna dateGate. Dodać regresyjne testy oczekiwanego bezpiecznego zachowania.
2. **Płatności:** F03–F05; idempotencja, trwałość zamówienia, snapshot cen, izolacja koszyka, ponowienia poczty. Przetestować awarię DB, duplikat webhooka, dwie karty i wielopozycyjny zakup.
3. **Zielony proces wydania:** F06, naprawa konfiguracji Jest i starych asercji VAT, aktualizacje zależności po ocenie F07, poprawny podpis/wersja Androida. CI uruchamiające niezależnie testy, typecheck i buildy.
4. **Trwałość danych użytkownika:** F08, F13; nowa przeglądarka, tryb offline, zamknięcie aplikacji w trakcie zapisu, równoległe urządzenia.
5. **Domknięcie produktu:** F11–F15, akceptacja wszystkich planowanych dodatków, PDF i rozmiarów, porządkowanie duplikacji oraz dokumentacji.
6. **Staging E2E:** MySQL testowy + Stripe test + skrzynka testowa, bezpośrednie URL panelu po buildzie, prawdziwy Android. Dopiero wynik tych prób pozwoli ocenić działanie całego systemu.

## Materiały odtwarzalne

- [probes.cjs](C:/workspace/projects/e-advent/docs/audit-2026-10-16/probes.cjs) i [wyniki](C:/workspace/projects/e-advent/docs/audit-2026-10-16/probes-results.json): 10 prób charakteryzujących usterki, bez prawdziwych usług. Wykorzystują lokalne połączenie HTTP loopback.
- [progress-probe.cjs](C:/workspace/projects/e-advent/docs/audit-2026-10-16/progress-probe.cjs): izolowana próba logiki hooka.
- [jest-isolated.cjs](C:/workspace/projects/e-advent/docs/audit-2026-10-16/jest-isolated.cjs): diagnostyczna izolacja eksportera dla istniejących security tests, nie produkcyjna poprawka.
- [npm-audit.json](C:/workspace/projects/e-advent/docs/audit-2026-10-16/npm-audit.json): wynik audytu zależności z daty przeglądu. Nie zawiera credentiali środowiska.

Przykładowe uruchomienia z root monorepo:

```powershell
node docs/audit-2026-10-16/probes.cjs
node docs/audit-2026-10-16/progress-probe.cjs
npm exec -w e-advent-api -- jest --config C:/workspace/projects/e-advent/docs/audit-2026-10-16/jest-isolated.cjs --runInBand tests/security --silent
```

Po naprawach próby charakteryzujące dotychczasowe błędy mogą celowo przestać przechodzić. Wtedy należy zastąpić je regresyjnymi testami poprawnego zachowania, zamiast utrzymywać podatność dla zielonego wyniku.
