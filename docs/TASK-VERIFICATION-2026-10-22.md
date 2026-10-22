# Weryfikacja zadań — 22.10.2026

## Zakres i wynik

Kontynuacja raportu z 21.10.2026, na bazie HEAD `2c29a5e` i bieżących zmian roboczych. Przed edycją katalog roboczy nie miał zmian śledzonych; zawierał dwa nieśledzone skrypty diagnostyki Stripe. Przeczytano je, lecz nie uruchamiano.

Katalog ma nadal 180 zadań (108 standardowych, 72 specjalne). Na prośbę właściciela pominięto weryfikację dwóch zadań z domkiem: `set-1-task-9` i `set-4-task-5`. Docelowy projekt zostanie dostarczony przez właściciela. Istniejącego w HEAD prototypu wykroju nie rozwijano ani nie zatwierdzano jako projektu docelowego.

W pozostałych 70 dodatkach sprawdzono katalog i konfigurację. Wszystkie 57 udostępniających PDF wygenerowały oba warianty: 114 poprawnych plików. Każdą stronę odczytano parserem; sprawdzono obecność tekstu, a arkuszom kreatywnym dodatkowo zmierzono rozmiar A4. Wygenerowano obrazy stron COLOR do oględzin. Obejrzano wszystkie rodzaje arkuszy kreatywnych oraz poprawione karty zdjęć i rodzinnego przepisu. Nie jest to potwierdzenie praktycznego wycinania, składania ani testu telefonu.

## Przegląd ostatnich commitów

- `73cf0f8`: zastąpienie `uuid` wbudowanym `randomUUID`, rozbudowa migracji InPost, adresów, statusów przesyłek, pobierania etykiet i panelu. Nowy kod wymaga kolumn z aktualnego `migrate-inpost.js`; nie uruchamiano migracji na żadnej bazie podczas tej rundy.
- `fd37b5f`, `c6006fb`: klienci i konfiguracja hostingu wskazują wdrożone API; panel obsługuje oddzielny origin, a testowa subdomena ma bramkę IP. Nie traktowano przeglądarki localhost jako odizolowanego środowiska serwerowego.
- `a51f8cb`, `a99dc02`: checkout przekazuje adres płatnika do Stripe oraz przekierowuje już opłaconą lub przetwarzaną sesję na stronę wyniku. Przeszły lokalne testy checkoutu i strony sukcesu.
- `7bfcb2c`, `102c413`: obsługa proxy Vercel i zachowanie surowego body webhooka. Testy prawdziwego podpisu Stripe na lokalnym Express przechodzą, w tym odrzucenie zmienionego payloadu. Nie wykonywano nowej dostawy webhooka do wdrożenia Vercel.
- `2c29a5e`: automatyczne przygotowanie przesyłki po opłaceniu i uzupełnianie braków przez cron. Zachowano rozdzielenie technicznego UUID zamówienia i czytelnego numeru dla klienta.

Poprawiono ujawnione podczas przeglądu problemy: usunięto logowanie fragmentu sekretu webhooka, naprawiono uszkodzone polskie znaki w komunikacie o za dużych zdjęciach i logach CORS. Równoczesne pobrania etykiety otrzymały blokadę `shipment-email:<UUID>` obejmującą sprawdzenie wcześniejszej wysyłki, wysłanie i zapis wyniku. Test dwóch równoległych pobrań potwierdza pojedynczy mail w tej sytuacji. Nie oznacza to gwarancji dokładnie jednej wysyłki przy awarii procesu między przyjęciem wiadomości przez SMTP a zapisem w bazie.

Skrypty `probe-stripe-webhook.js` i `retry-pending-webhooks.js` pozostawiono bez zmian. Mogą wykonywać żądania do zdalnych usług i ponawiać zdarzenia płatności; pierwszy także wypisuje fragment sekretu. Nie są używane przez opisane testy.

## Poprawione zadania i PDF

- Arkusze kreatywne miały zerową wysokość strony, ponieważ wszystkie elementy były pozycjonowane absolutnie przy wyłączonym dzieleniu strony. Ustalono minimalną fizyczną wysokość strony; regresję pokrywają testy prawdziwego renderera i parsera.
- Etykiety, kupony i komiks zachowują wszystkie pola. Układ mierzy tekst rzeczywistą czcionką, łamie wiersze i w razie potrzeby zmniejsza rozmiar do czytelnego minimum. Jeśli tekst nadal się nie mieści, eksport zwraca błąd 400 z prośbą o skrócenie treści. Zapisana odpowiedź nie jest obcinana.
- Rejestr, API i WWW korzystają ze wspólnej listy arkuszy kreatywnych. Metadane tych arkuszy wskazują A4 zamiast niezgodnego A5. Dotyczy to materiałów do zadań; kalendarz jako produkt pozostaje wyłącznie A3.
- Instrukcje renifera odpowiadają figurce z podpórkami, a origami — płaskiej choince. Poprawiono obrys po pierwszym bocznym zgięciu. Usunięto nieużywane dawne gałęzie renderera z tekstami zastępczymi.
- Karta „Wtedy i dziś” mieści zdjęcia na jednej poziomej stronie A5. Poprzednia wysokość ramek powodowała pustą stronę kontynuacji. Test używa rzeczywistych PNG w obu wariantach PDF.
- „Rodzinny przepis” jest formularzem na WWW i mobile: nazwa potrawy, porcje, składniki, przygotowanie i historia. Zachowano dotychczasowe nazwy pól historii. PDF drukuje zapisane odpowiedzi zamiast zastępczych składników. Etykiety pól mają rezerwację miejsca na odpowiedź przy podziale stron.
- Uzupełniono trufle z herbatników i ślimaczki z gotowego ciasta francuskiego zgodnie z treścią zadań: ilości, kolejność, chłodzenie lub temperatura i czas pieczenia. Zweryfikowano spójność treści i eksport, nie przeprowadzano prób kulinarnych.
- W obu klientach podłączono pomijane dodatkowe formularze: ocenianie pierników obok zdjęcia oraz personalizację etykiety jadalnego prezentu obok przepisu. Korzystają z tego samego zapisu postępu co główna część zadania.

## Wykonane kontrole

- API: 287 testów Jest oraz 4 testy prawdziwego PDF, wszystkie przeszły. `npm run test:api` uruchamia teraz także tę drugą grupę.
- WWW: 321 testów, w tym renderowanie wszystkich 72 dodatków w komponentach WWW i mobile oraz odtwarzanie nowych formularzy; wszystkie przeszły.
- Mobile: 4 testy sesji i TypeScript przeszły.
- Panel: 6 testów i build produkcyjny przeszły.
- Build produkcyjny WWW, ESLint WWW i `git diff --check` przeszły. WWW i panel nadal ostrzegają o wielkości głównego pakietu.
- Pełny eksport z pominięciem domków: 114/114, bez braków konfiguracji i bez błędów eksportu. 19 zadań nadal ma zgodnie z konfiguracją dostępny PDF na mobile; nie zmieniano tych uprawnień produktu.

Wszystkie testy używały lokalnych danych lub atrap usług. Nie wysyłano maili, nie tworzono przesyłek ani nie ponawiano płatności w usługach zewnętrznych.

## Powtórzenie i artefakty

Z katalogu głównego:

```powershell
npm run test:api
npm run test:frontend
npm run test:app
npm run test:panel
node apps/e-advent-api/scripts/verify-special-windows.js --skip-village --render
```

Samo sprawdzenie arkuszy kreatywnych: dopisz `--craft-only`. Skrypt jawnie zapisuje pominięte identyfikatory w polu `summary.deferred`.

Wyniki pełnego eksportu: `.cache/task-verification/results.json`; PDF-y i obrazy stron w tym samym katalogu. Logi testów, kompilacji i lintowania: `.cache/local-dev/tasks-*-current.log`. To pliki lokalne, ignorowane przez Git.

## Co nadal wymaga sprawdzenia

- Podłączenie projektu domku po jego dodaniu do źródeł, a następnie sprawdzenie obu powiązanych zadań.
- Próbny wydruk w skali 100% i praktyczne złożenie wykrojów. Oględziny wektorów nie zastępują próby papierowej.
- Fizyczny Android: wybór zdjęcia i uprawnienia, pobranie i systemowe udostępnianie PDF, powrót z tła, restart aplikacji oraz synchronizacja WWW ↔ telefon na wydzielonym kalendarzu testowym. W tej rundzie nie uruchamiano urządzenia ani nowego eksportu Expo/Hermes.
- Sprawdzenie terminu otwarcia kapsuły z rzeczywistą bazą i zegarem. Nadal nie ma pełnej trwałej kolejki synchronizacji offline.
- Kontrola wdrożenia po migracji i rzeczywistego cyklu Stripe/InPost w sandboxie. Testy lokalne nie potwierdzają konfiguracji sekretów, crona, sieci ani schematu zdalnej bazy.
