# Dostawa InPost w e-Advent

## Zakres

Weryfikacja punktów korzysta z aktualnego API Points: `https://api.inpost.pl/v1` na produkcji oraz `https://sandbox-api-gateway-pl.easypack24.net/v1` w sandboxie. [Dokumentacja API Points](https://dokumentacja-inpost.atlassian.net/wiki/spaces/PL/pages/18153493/Points+Parcel+Locker+ParcelPoint).

Sklep obsługuje dostawę fizycznych produktów w Polsce: Paczkomat (Geowidget v5) albo kurier InPost. Adres kurierski ma osobne pola ulicy, budynku i mieszkania. Telefon jest normalizowany do dziewięciu cyfr. Serwer sprawdza dostępność Paczkomatu i pobiera jego adres z InPost, zamiast ufać opisowi z przeglądarki.

Nowe zamówienia fizyczne wymagają konfiguracji InPost. Bez niej płatność za takie zamówienie jest zablokowana. Produkty cyfrowe nadal działają bez InPost. Starsze, już zapisane zamówienia zachowują przewoźnika, kwoty i identyfikatory; nie są automatycznie przekształcane w nowe przesyłki.

`orders.id` to UUID używane w powiązaniach i Stripe. `orders.order_number` pozostaje prostym numerem klienta (np. `000123`). Referencja przesyłki zawiera oba: `EA-000123-<UUID>`. Identyfikator ShipX jest jeszcze osobnym polem. Jeden rekord `order_inpost_shipments` należy do jednego zamówienia. Dane dostawy zapisane w `orders.metadata.inpostDelivery` obejmują odbiorcę, punkt/adres, usługę, opakowanie, cenę i konto/środowisko. Obejmują je również kontrola integralności płatności i webhook Stripe.

## Konta i dostępy

1. **Testy:** zarejestruj osobne konto w [testowym Managerze Paczek](https://sandbox-manager.paczkomaty.pl/). Uzupełnij dane nadawcy i dane do faktury w Moje konto → Dane. W Moje konto → API wygeneruj dostęp ShipX. Zapisz token i ID organizacji. Wygeneruj aktualny token z listy „API InPost (API ShipX oraz API Points)”, aby działała także serwerowa weryfikacja punktów. Uzupełnij testowe saldo w sekcji płatności. Środowisko testowe nie nadaje rzeczywistych paczek.
2. **Produkcja:** utwórz konto w [Managerze Paczek](https://manager.paczkomaty.pl/), uzupełnij dane i wygeneruj osobny dostęp ShipX. Ustal z InPost usługi dostępne na Twoim koncie, rozliczenie i cennik. `inpost_courier_standard` wymaga aktywnej usługi kurierskiej; dla prepaid przewidziane jest `inpost_courier_c2c`. Nie kopiuj identyfikatora ani tokenu sandboxa na produkcję. Pomoc: [instrukcja konfiguracji API ShipX](https://inpost.pl/sites/default/files/2022-03/instrukcja-konfiguracji-api-shipx.pdf), [FAQ InPost](https://dokumentacja-inpost.atlassian.net/wiki/spaces/PL/pages/52428808/FAQ).
3. W tym samym środowisku wygeneruj **oddzielny publiczny token Geowidget**: Moje konto → API → Geowidget. Produkcyjny token ogranicz do domen sklepu. Dla sandboxa na localhost nie wpisuj domeny. Jest to token mapy, a nie tajny token ShipX. [Dokumentacja Geowidget](https://dokumentacja-inpost.atlassian.net/wiki/spaces/PL/pages/50069505/Geowidget+v5).

Nadawca przesyłek pochodzi z domyślnych danych organizacji w Managerze Paczek. Sprawdź tam adres, telefon i e-mail **przed pierwszym testem**. Odbiór paczek przez kuriera zamawia się w Managerze lub zgodnie z umową; pobranie etykiety w panelu nie zamawia odbioru.

## Zmienne środowiskowe — tylko API

Wpisz do `apps/e-advent-api/.env` lokalnie lub do sekretów środowiska hostingu API:

```dotenv
INPOST_ENV=sandbox
INPOST_API_TOKEN=<tajny token ShipX>
INPOST_ORGANIZATION_ID=<ID organizacji>
INPOST_GEOWIDGET_TOKEN=<publiczny token Geowidget>
INPOST_COURIER_SERVICE=inpost_courier_c2c
INPOST_API_RATE_TAX=gross
INPOST_WEBHOOK_SECRET=<64 losowe znaki hex>
INPOST_PACKAGES_JSON=<jednowierszowy JSON opakowań opisany poniżej>
```

`INPOST_API_RATE_TAX` określa interpretację `offer.rate`: `net` oznacza doliczenie 23% VAT na potrzeby podglądu kosztu w panelu, `gross` kwotę już brutto. Ustal to przez porównanie oferty z rozliczeniem swojego konta. **Nie zakładaj, że powyższe `gross` jest właściwe dla każdego konta.** Nie wpływa to na ceny brutto skonfigurowane dla klienta.

`INPOST_ENV` dopuszcza wyłącznie `sandbox` albo `production`; adresy serwerów są ustalone w kodzie. Testowe zamówienia konfiguruj razem z `TESTING_MODE=true`, testową bazą i kluczami Stripe. Produkcja: `TESTING_MODE=false`, produkcyjna baza i klucze Stripe live. Integracja blokuje oczywiste mieszanie Stripe test z InPost production oraz Stripe live z sandboxem. Zapisane przesyłki są dodatkowo przypisane do konkretnej organizacji i środowiska.

Frontend pobiera wyłącznie publiczny token mapy i środowisko z `/api/v1/shipping/config`. **Nie dodawaj tokenu ShipX do zmiennych `VITE_*` ani `EXPO_PUBLIC_*`.** Panel komunikuje się przez API z autoryzacją administratora. Po zmianie env zrestartuj/wdróż API; zmiana publicznego tokenu nie wymaga przebudowy frontendu.

## Ceny i gabaryty

Cena dla klienta pochodzi z `INPOST_PACKAGES_JSON` (brutto, z dopłatami). Ta sama stawka obowiązuje każde zamówienie, które mieści się w opakowaniu: obecnie 16,99 zł Paczkomat i 19,99 zł kurier. Powyżej `FREE_SHIPPING_THRESHOLD` (100 zł produktów) dostawa jest gratis — klient nie płaci stawki z cennika, ale paczkę nadal nadajemy InPost. Aktualizuj ceny, gdy InPost zmieni warunki. Nie ma automatycznej synchronizacji cennika z umową: API InPost może zwracać `rate: null` lub wartości domyślne dla kont rozliczanych umownie, również przy kalkulacji ceny. [Ograniczenie opisane przez InPost](https://dokumentacja-inpost.atlassian.net/wiki/spaces/PL/pages/18153505).

Przykład **wyłącznie do sandboxa** — poniższe wymiary, pojemności i ceny są fikcyjnym przykładem formatu, nie pomiarami produktów ani ofertą InPost:

```dotenv
INPOST_PACKAGES_JSON='[{"code":"test-flat","length":450,"width":330,"height":50,"weight":1,"capacity":{"scratch-a3":2,"santa-letter":4,"santa-certificate":20},"prices":{"parcel_inpost":16.99,"courier_inpost":19.99}},{"code":"test-box","length":600,"width":350,"height":150,"weight":3,"capacity":{"scratch-a3":8,"santa-letter":10,"santa-certificate":40},"prices":{"parcel_inpost":16.99,"courier_inpost":19.99}}]'
```

W panelu zmiennych hostingu wklej sam JSON, bez zewnętrznych apostrofów. Dla produkcji zastąp cały przykład danymi ustalonymi po spakowaniu i zważeniu produktów:

- `code`: unikalna nazwa opakowania, litery/cyfry/`_`/`-`.
- `length`, `width`, `height`: zewnętrzne wymiary **zapakowanej** paczki w mm; `weight`: bezpieczna maksymalna masa pełnego opakowania w kg.
- `capacity`: sprawdzona pojemność dla każdego SKU. Dla koszyka mieszanego liczymy sumę `liczba sztuk / pojemność danego SKU`; musi być ≤ 1. Przykład: 1 szt. przy pojemności 2 i 2 szt. przy pojemności 4 wypełniają opakowanie. Certyfikaty też zajmują miejsce. Zmierz i zweryfikuj również mieszane koszyki; algorytm nie symuluje przestrzennego pakowania.
- `prices`: końcowa cena brutto PLN osobno dla `parcel_inpost` i `courier_inpost`. Brak ceny wyłącza dany sposób dostawy dla opakowania. Przy koszyku od 100 zł klient płaci 0 zł, ale opakowanie i usługa zostają wybrane jak zwykle.

Serwer wybiera najtańsze pasujące opakowanie. Gabaryt A/B/C wyznacza na podstawie wymiarów; C2C dopuszcza też D, kurier standard wymiary własne. Implementacja ogranicza paczkę do 25 kg i standardowych wymiarów (bez palet i niestandardów). Obecnie **jedno zamówienie = jedna paczka**; koszyk niemieszczący się w żadnym skonfigurowanym opakowaniu jest blokowany przed płatnością. Dodaj odpowiednio wycenione większe opakowanie, jeśli chcesz przyjmować większe koszyki. [Gabaryty usług ShipX](https://dokumentacja-inpost.atlassian.net/wiki/spaces/PL/pages/18153507/Shipment+sizes+and+services), [wymiary paczek kurierskich](https://inpost.pl/pomoc-rodzaje-i-wymiary-paczek-kurierskich).

Wybrana cena i opakowanie są zapisywane przy zamówieniu. Zmiana konfiguracji nie zmienia ceny już opłaconego zamówienia. Stara wycena na otwartej stronie wymaga odświeżenia przed utworzeniem płatności. W panelu osobno widać cenę zapłaconą przez klienta i aktualny koszt oferty InPost. Gdy InPost nie poda kosztu, zakup jest opisany jako rozliczany według umowy. Różnica jest kosztem/przychodem sklepu; nie obciążamy ponownie klienta.

## Migracja i wdrożenie

Najpierw wykonaj kopię bazy. Z katalogu `apps/e-advent-api` uruchom na bazie testowej:

```powershell
node scripts/migrate-checkout.js --test
node scripts/migrate-inpost.js --test
```

Pierwszy skrypt pochodzi z poprzedniego etapu płatności i można go powtórzyć. Drugi tworzy `order_inpost_shipments`. Wymagane są jawne `MYSQL_TEST_HOST`, `MYSQL_TEST_DATABASE`, `MYSQL_TEST_USER`, `MYSQL_TEST_PASSWORD` (i opcjonalnie port). Na produkcji użyj tych samych skryptów z `--prod` i danymi `MYSQL_*`. Migracja nie zmienia numeracji, UUID, adresów ani cen istniejących zamówień. Nie wykonano jej automatycznie podczas prac nad kodem.

Wdróż razem API, frontend i panel; konfiguracja API i migracja muszą być gotowe przed udostępnieniem fizycznych zamówień. Serwer hostingu musi mieć dostęp HTTPS do właściwego ShipX. Jeśli stosujesz CSP, dopuść zasoby i połączenia Geowidget odpowiedniego środowiska.

## Panel i odporność na powtórzenia

1. Otwórz opłacone zamówienie. Sprawdź zapisany odbiorca/punkt, opakowanie i oznaczenie TEST.
2. Webhook Stripe po udanej płatności sam tworzy przesyłkę ShipX. Gdy InPost zwróci identyfikator i ofertę, od razu kupuje etykietę. Jeśli oferty nie ma jeszcze w odpowiedzi, zakup dokończy webhook InPost (`offers_prepared`) albo cron. Nieudany automat zostawia przyciski **Przygotuj przesyłkę** / **Kup etykietę** do ręcznego ponowienia.
3. **Odśwież status** pobiera wynik asynchronicznego przetwarzania. **Odśwież oferty** odtwarza wygasłe oferty przed ręcznym zakupem.
4. Ręczny **Kup etykietę za … zł brutto** (lub według umowy) zostaje na wypadek, gdy automat się nie udał. Zmieniona oferta wymaga ponownego sprawdzenia ceny. Zakup jest asynchroniczny; po timeout nie kupujemy drugi raz w ciemno.
5. Po potwierdzeniu zakupu etykieta PDF A6 jest od razu do pobrania w panelu (wielokrotnie, bez kolejnego zakupu). Jest dostępna tylko dla administratora. [Warunki pobierania etykiet](https://dokumentacja-inpost.atlassian.net/wiki/spaces/PL/pages/18153509). Udany zakup ustawia zamówienie na „W realizacji” i wysyła klientowi jednorazowy mail „Paczka przygotowana” z numerem i linkiem do śledzenia (typ `shipment_prepared`). Pobranie PDF ponawia mail tylko wtedy, gdy wcześniejsza wysyłka się nie udała.
6. Spakuj zgodnie z zapisanym profilem, naklej etykietę i przekaż paczkę InPost. Sam zakup etykiety nie oznacza wysłania paczki. Po pierwszym skanie InPost zamówienie samo przechodzi na „Wysłane” (`shipped_at`), a po odbiorze na „Dostarczone” (`delivered_at`). Sklep nie wysyła wtedy maili — klienta powiadamia InPost.

Status przesyłki odświeża się: webhookiem InPost, przy otwarciu zamówienia w panelu, przy wejściu na listę zamówień (najwyżej co 5 min, także przyciskiem „Synchronizuj InPost”), w dziennym cronie oraz przez `POST /api/v1/cron/inpost-status` z nagłówkiem `Authorization: Bearer <CRON_SECRET>` (zalecane co 30–60 min na produkcji).

W `orders` zapisujemy: `inpost_shipment_id`, `inpost_status`, `label_created_at`, `shipped_at`, `delivered_at` oraz rozbity adres kurierski `shipping_building_number`, `shipping_apartment_number`, `shipping_country`. Pełna odpowiedź ShipX zostaje w `order_inpost_shipments.remote`.

Próby utworzenia i zakupu zapisujemy przed wywołaniem ShipX oraz serializujemy blokadą bazodanową. Po timeout lub awarii zapisu nie ponawiamy automatycznie operacji mogącej naliczyć opłatę. Najpierw odśwież status i sprawdź Manager Paczek. Jeśli odpowiedź tworzenia zaginęła, możesz wpisać ID znalezionej przesyłki w panelu; serwer sprawdzi referencję, odbiorcę, usługę, punkt/adres i paczkę. Wyraźne odrzucenie tworzenia (np. niepoprawne dane nadawcy) pozwala poprawić konfigurację i ponowić przygotowanie. Niejasny wynik bez ID wymaga sprawdzenia przez obsługę; nie usuwaj rekordu próby, dopóki brak przesyłki nie zostanie potwierdzony. Niejasny wynik zakupu rozstrzygnij w Managerze na istniejącej przesyłce — aplikacja nie wykonuje drugiego zakupu w ciemno.

Dane odbiorcy w nowym zamówieniu InPost są niezmienne w zwykłej edycji panelu. Korekta przed zapłatą następuje w koszyku, z anulowaniem poprzedniego PaymentIntent. Korekty po zapłacie oraz zwroty/anulowania przewoźnika wymagają obsługi indywidualnej; ten etap nie automatyzuje zwrotów ani przesyłek wielopaczkowych.

## Webhook InPost

Wygeneruj własny sekret (np. `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) i wpisz go w `INPOST_WEBHOOK_SECRET`. W Moje konto → API → Ustawienia organizacji dodaj adres:

```text
https://<host-api>/api/v1/inpost/webhook?token=<INPOST_WEBHOOK_SECRET>
```

Adres wymaga publicznego HTTPS. To sekret Twojej integracji, nie token ShipX. Ukryj parametr `token` w logach hostingu/proxy; aplikacja loguje samą ścieżkę bez query. [Konfiguracja webhooków InPost](https://dokumentacja-inpost.atlassian.net/wiki/spaces/PL/pages/18153630).

Obsługiwane zdarzenia: `offers_prepared`, `shipment_confirmed`, `shipment_status_changed`. Webhook sprawdza sekret i organizację, następnie pobiera faktyczny stan zapisanej przesyłki z ShipX. Nie przepisuje statusu, numeru śledzenia ani ceny z treści zdarzenia. Gdy po odświeżeniu czeka niewykupiona oferta, kupuje etykietę (ten sam lock i flaga `buy_attempted` co w panelu — po niejasnym wyniku nie ma drugiej próby). Opóźniony webhook odczytuje aktualny stan. Pobranie statusu uaktualnia numer śledzenia oraz wysłanie/doręczenie zamówienia; potwierdzenie etykiety nie oznacza wysyłki. Bez webhooka zostaje cron i ręczne odświeżanie w panelu. Sandbox nie odtwarza całej rzeczywistej drogi paczki.

## Próba odbiorcza na Twoim koncie

- Zrób testowe zamówienie do Paczkomatu oraz osobne kurierem. Sprawdź opakowanie, cenę, telefon, adres i powiązanie numeru klienta z UUID w Stripe, bazie i referencji ShipX.
- Zapłać Stripe test. Po webhooku płatniczym zamówienie ma być opłacone, a przesyłka InPost utworzona. Jeśli InPost od razu zwróci ofertę, etykieta ma być kupiona, mail „Paczka przygotowana” wysłany, a PDF dostępny w panelu bez ręcznego „Kup”.
- Pobierz PDF dwa razy, odśwież panel. Drugie pobranie nie wysyła maila ponownie. W Managerze ma istnieć jedna przesyłka na zamówienie, z właściwym odbiorcą. Jeśli automat się nie uda, dokończ ręcznie z panelu.
- Zmień Paczkomat/adres przed płatnością: poprzedni formularz płatności znika i stary PaymentIntent jest anulowany. Sprawdź koszyk z certyfikatem oraz koszyk przekraczający pojemność.
- Porównaj kwotę oferty w panelu z Managerem/rozliczeniem, dobierz `INPOST_API_RATE_TAX`, właściwe ceny brutto i rzeczywiste profile opakowań.
- Dopiero po udanym sandboxie skonfiguruj produkcyjne dane i wykonaj kontrolne realne zamówienie. Zakup produkcyjnej etykiety może obciążyć konto.

Testy automatyczne zastępują MySQL, Stripe, SMTP i InPost atrapami. Potwierdzają logikę, autoryzację i ponawianie operacji; nie zastępują powyższej próby z Twoją organizacją, domyślnym nadawcą, aktywnymi usługami i prawdziwym Geowidget.

## Weryfikacja implementacji — 19.10.2026

- API: 271 testów, wszystkie zaliczone (29 zestawów). Obejmują nowe trasy, autoryzację etykiet, webhook, wycenę, odbiorcę/punkt, zapis przez model Payment oraz odtwarzanie po awarii sieci/bazy.
- Frontend: 84 testy, wszystkie zaliczone (8 zestawów), w tym zmiana punktu/adresu unieważniająca poprzedni formularz Stripe i blokada płatności przy braku wyceny.
- Panel: 6 istniejących testów zaliczonych. Nowy panel InPost sprawdzony przez kompilację TypeScript i lint; zachowanie jego endpointów testowane w API.
- Build frontendu i panelu oraz lint obu aplikacji zakończone bez błędów. Bundlery nadal ostrzegają o dużych paczkach JavaScript.
- Nie wykonano migracji na rzeczywistej bazie, zakupu etykiety na koncie InPost ani próby prawdziwego widgetu z tokenem użytkownika. Do tego potrzebne są dane konta i konfiguracja opakowań/cennika.
