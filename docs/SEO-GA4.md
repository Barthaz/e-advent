# e-Advent.pl — audyt SEO, pomiar GA4 i ręczne wdrożenie

Badanie z 12 listopada 2026 r. obejmuje polski frontend sklepu, publiczną domenę e-advent.pl i lokalną paczkę dla Apache 2.4. Serwis SOA ma osobne wdrożenie.

## Diagnoza produkcji przed wdrożeniem

- Wszystkie 12 adresów wymienionych poniżej zwracało HTTP 200, ten sam tytuł, pusty kontener aplikacji, zero H1 i brak adresu kanonicznego w pobranym HTML. Opisy produktów pojawiały się po wykonaniu JavaScriptu. W treści `noscript` znajdowało się wezwanie do włączenia JavaScriptu, które użytkownik rozpoznał w wynikach wyszukiwania.
- Koszyk i nieistniejący adres również otrzymywały ten sam dokument ze zgodą na indeksowanie. Błędny adres zwracał HTTP 200 (soft 404). Strona nagrania od Mikołaja była pominięta w mapie witryny.
- W kodzie analityki odsłonę mogły wysłać konfiguracja tagu, router, a na ekranie mapy również moduł śledzenia Mikołaja. Tytuł mógł pochodzić z poprzedniego ekranu. Parametry płatności i część identyfikatorów mogły trafić do adresu w GA4.
- Automatyczny mobilny Lighthouse na publicznej stronie głównej dał **100/100 SEO**, **68/100 wydajności**, **30,0 s LCP** i **8804 KiB** transferu. Jednoczesny brak H1 w surowym HTML pokazuje, dlaczego sam wynik kategorii SEO nie wystarcza. Pomiar laboratoryjny dotyczy jednego uruchomienia.
- Sprawdziłem wyszukiwanie nazwy domeny oraz zapytanie ograniczone do domeny. Wyniki dostępne podczas audytu nie pozwalają potwierdzić bieżącego snippetu Google ani pozycji dla konkretnej frazy. Nowa usługa Search Console nie ma jeszcze danych. Nie przypisujemy frazom wymyślonego wolumenu, pozycji ani udziału w ruchu.

## Plan i wykonane zmiany

1. **Treść bez JavaScriptu.** Podczas budowania Vite renderuje te same komponenty React, których używa przeglądarka. Każda publiczna podstrona otrzymuje pełny dokument HTML, własny tytuł i opis, jeden H1, odnośniki, canonical, Open Graph i Twitter Card. JS obsługuje formularze, płatności, okienka i audio. Zdjęcia oraz ikony otrzymały lżejsze warianty, fonty ładują się poza ścieżką blokującą pierwszy ekran, a duże moduły prywatnych ekranów są pobierane na żądanie.
2. **Indeksowanie.** Apache wydaje właściwy dokument pod czystym adresem, przekierowuje historyczne aliasy i wystawia HTTP 404 dla błędnych stron i zasobów. Koszyk, płatności, kreator nagrania, personalizacja, prywatne kalendarze, podglądy oraz odsłuchy mają dyrektywę noindex. Domena testowa ma dodatkowo nagłówek X-Robots-Tag. Mapa zawiera wyłącznie 12 kanonicznych adresów produkcji.
3. **Oferta.** Cztery samodzielnie zamawiane produkty mają dane Product i Offer w początkowym HTML, cenę z katalogu SKU, walutę PLN, obraz i adres zakupu. Certyfikat i nagranie jako dodatek do listu opisano na właściwych kartach. Google dobiera tekst wyniku do zapytania i może użyć fragmentu strony. [Dokumentacja Google dotycząca snippetów](https://developers.google.com/search/docs/appearance/snippet)
4. **Pomiar.** Router odpowiada za page_view po ustawieniu tytułu. Są osobne nazwy ekranów prywatnych. GA4 i Meta uruchamiają się po wyborze pomiaru. Kampanie na publicznych stronach zachowują dozwolone parametry UTM i gclid. E-mail, parametry Stripe, identyfikatory kalendarzy, tokeny odtwarzacza i nazwy wpisane przez klientów są pomijane w ręcznie wysyłanych zdarzeniach.
5. **Kontrola przy kolejnych zmianach.** Build sprawdza unikalność tytułów i opisów, canonical, H1, indeksowalność publicznych adresów, linkowanie, składnię danych strukturalnych i obecność lokalnych obrazów. Błąd przerywa budowanie.

## Frazy i przeznaczenie ekranów

Frazy odzwierciedlają faktyczne produkty i język kupujących. Występują w tytułach, opisach, nagłówkach, treści ofert i odnośnikach. Google nie wykorzystuje znacznika meta keywords do ustalania pozycji. [Obsługiwane metatagi Google](https://developers.google.com/search/docs/crawling-indexing/special-tags)

- **/** — „e-Advent”, „kalendarze adwentowe i prezenty od Mikołaja”. Strona główna prowadzi do czterech ofert i przykładowego odsłuchu.
- **/kalendarze-adwentowe** — „personalizowane kalendarze adwentowe”, „kalendarz online czy zdrapka”. Porównanie wersji fizycznej i cyfrowej.
- **/stworz-kalendarz** — „stwórz kalendarz adwentowy”, „wybierz kalendarz adwentowy”. Punkt wyboru produktu przed konfiguracją.
- **/stworz-kalendarz/interaktywny** — „kalendarz adwentowy online z własnymi zadaniami”, „kreator kalendarza adwentowego”. Zakup prywatnego kalendarza wysyłanego linkiem.
- **/stworz-kalendarz/zdrapka** — „kalendarz adwentowy zdrapka A3”, „kalendarz ze złotymi zdrapkami”. Fizyczny prezent z gotową przygodą albo własnymi zadaniami.
- **/darmowy-kalendarz** — „darmowy kalendarz adwentowy online”, „darmowe zadania adwentowe”. Bezpłatne okienka do otwierania.
- **/list-do-swietego-mikolaja** — „list do Świętego Mikołaja”, „zestaw do napisania listu z kopertą i naklejkami”. Fizyczny zestaw, opcje certyfikatu i nagrania.
- **/wiadomosc-od-mikolaja** — „personalizowana wiadomość głosowa od Mikołaja”, „nagranie MP3 dla dziecka lub rodzeństwa”. Przykład audio, personalizacja, prywatny odsłuch.
- **/sledz-mikolaja** — „gdzie jest Święty Mikołaj”, „trasa Mikołaja na żywo”, „mapa Mikołaja w Wigilię”. Intencja informacyjna.
- **/regulamin**, **/polityka-prywatnosci**, **/dostawa-i-zwroty** — odrębne informacje o zakupach, danych osobowych i dostawie. Mają własne tytuły i są dostępne bez JS.
- **Ekrany zamówień i treści osobiste** — tytuły na potrzeby nawigacji i GA4, noindex oraz wykluczenie z sitemap. Nazwy użytkowników i prywatna treść zamówienia nie są frazami pozycjonowanymi.

## GA4 po stronie sklepu i w panelu Google

- `page_view` mierzy pierwsze wejście po zgodzie oraz zmianę ekranu. Tytuł publiczny odpowiada tytułowi dokumentu. Koszyk, płatność, potwierdzenie, personalizacja i prywatny odtwarzacz mają stałe nazwy. Przejście wstecz między ekranami generuje kolejną odsłonę.
- Lejek obejmuje `view_item`, `add_to_cart`, `view_cart`, `remove_from_cart`, `begin_checkout` i `purchase`. Interaktywny kreator prowadzi bezpośrednio do płatności. Zdarzenia zawierają SKU, nazwę katalogową, cenę, ilość i PLN. Zakup raportujemy po weryfikacji płatności w API. Identyfikator transakcji deduplikuje odświeżenia w sesji, a kwota produktów i dostawa są raportowane osobno.
- Nagranie ma m.in. zdarzenia `santa_product_cta_click`, `santa_creator_start`, `santa_creator_step_complete`, `santa_audio_play`, `santa_audio_progress` oraz `santa_audio_download`. Mapa ma osobne zdarzenie interakcji `santa_tracker_viewed`.
- W GA4 otwórz **Administracja → Strumienie danych → strumień strony → Pomiar zaawansowany → Wyświetlenia strony → Ustawienia zaawansowane**. Wyłącz automatyczne odsłony oparte na zmianach historii przeglądarki. Wyłącz również automatyczne interakcje formularzy i domyślne pobrania, jeżeli obejmują prywatne adresy lub formularze personalizacji. Sprawdź, czy kontener GTM nie wysyła dodatkowego page_view ani purchase. [Pomiar aplikacji SPA](https://developers.google.com/analytics/devguides/collection/ga4/single-page-applications)
- Po ręcznej publikacji testu użyj Tag Assistant, aby włączyć tryb debugowania. W testowym DebugView przejdź po zgodzie przez kartę produktu, koszyk i płatność testową. Oczekuj jednej odsłony na ekran i jednego purchase po odświeżeniu potwierdzenia. Sprawdź grupowanie raportu „Strony i ekrany” po tytule strony oraz właściwość wybraną dla danego hosta. [DebugView](https://support.google.com/analytics/answer/7201382) · [Zdarzenia e-commerce](https://developers.google.com/analytics/devguides/collection/ga4/ecommerce)

## Ręczne wdrożenie na Apache

1. W katalogu głównym repozytorium polecenie `npm run build:test -w e-advent-frontend` buduje **apps/e-advent-frontend/dist-test** z trybem `.env.test`. Wgraj **zawartość** tego katalogu, łącznie z ukrytym `.htaccess`, do katalogu dokumentów **test.e-advent.pl**. Reguła dopuszcza IP **83.23.247.138**. Inne adresy otrzymują 302 do produkcji. Przy zmianie publicznego IP zaktualizuj regułę i plik na hostingu.
2. Po odbiorze testów polecenie `npm run build:frontend` buduje **apps/e-advent-frontend/dist** z trybem `.env.prod`. Wgraj zawartość do katalogu dokumentów **e-advent.pl**. Najpierw prześlij assets, ikony i dokumenty, następnie .htaccess. Zachowaj osobno hostowane pliki, w tym istniejący **/download/e-advent.apk**. Nie wysyłaj plików .env. Jeśli hosting korzysta z cache lub CDN, odśwież HTML i reguły po publikacji.
3. Pakiet zawiera index.html, _pages, app-shell.html, 404.html, sitemap.xml, robots.txt i zasoby. Apache wymaga włączonego mod_rewrite, mod_headers i obsługi .htaccess. Podgląd lokalny produkcji uruchom poleceniem `npm run preview -w e-advent-frontend`. W integracjach używających innego serwera trzeba dopasować reguły do generowanych dokumentów.
4. Sprawdź kartę głosową bez JS, przejdź do kalendarza zdrapki, otwórz koszyk oraz nieistniejący adres. Oczekiwane odpowiedzi to odpowiednio 200 z właściwą treścią, 200 z właściwą treścią, 200 z noindex i 404. Sprawdź 301 z /privacy. Po wyłączeniu JS można przeczytać ofertę, a zamówienie wymaga działającego JS.
5. W produkcyjnej usłudze Search Console zgłoś **https://e-advent.pl/sitemap.xml**. Inspekcją URL sprawdź stronę główną i cztery karty produktów, użyj „Testuj opublikowany URL”, obejrzyj HTML i canonical, a następnie poproś o indeksowanie. Sprawdź oferty również w Rich Results Test. [Search Console](https://search.google.com/search-console) · [Rich Results Test](https://search.google.com/test/rich-results)
6. Gdy pojawią się dane, zapisz punkt odniesienia w raporcie „Skuteczność → Wyniki wyszukiwania”, filtrując kraj Polska, adres strony oraz zapytanie. Porównuj kliknięcia, wyświetlenia, CTR i średnią pozycję w równych okresach, oddzielnie dla fraz marki i produktów. Adwent ma silną sezonowość. Rzeczywistą wydajność urządzeń oceniaj w raporcie Core Web Vitals. [Pomiar wyników w Search Console](https://developers.google.com/search/docs/monitor-debug/search-console-start)

## Wyniki odbioru lokalnej paczki

- Mobilny Lighthouse uzyskał **100/100 SEO na każdym z 12 publicznych adresów**. Dla strony głównej wydajność wyniosła **68/100**, LCP **6,8 s**, transfer **1913 KiB**. Największym elementem było zdjęcie otwierające stronę. Pozostaje rezerwa w czasie jego wyświetlenia na wolnym telefonie. Pomiary lokalne i pomiar hostingu wykonano w innych warunkach sieciowych.
- W Chrome z wyłączonym JS wszystkie 12 stron odpowiedziało 200 i udostępniło właściwe H1 i canonical. Podgląd HTTP zwrócił też właściwy 301, noindex na koszyku i 404 dla brakującej strony, zasobu i bezpośredniego adresu dokumentu wewnętrznego.
- W Chrome po zgodzie na pomiar sprawdzono pierwszą odsłonę z kampanią, pojedyncze view_item, przejście na mapę, powrót i tytuły wszystkich trzech odsłon. Przy przejściu z koszyka na płatność view_cart i begin_checkout wystąpiły po jednym razie, z wartością produktów 29 PLN. Test był odizolowany od zewnętrznych trackerów i Stripe. Potwierdzenie płatności oraz deduplikację purchase sprawdzono w testach automatycznych z testowymi odpowiedziami API.
- **393 testy w 26 plikach przeszły.** Obie paczki zbudowano i sprawdzono w nich tryb Stripe, API, identyfikator GA4, dyrektywy robotów i cztery oferty produktowe.
- Hosting testowy przed publikacją odpowiadał 302 do produkcji. Reguły Apache przygotowano w obu paczkach. Na tej maszynie nie wystartował lokalny silnik Docker z Apache, więc kody HTTP przetestowano na serwerze podglądu. Ostateczna weryfikacja reguły IP, konfiguracji Apache, indeksacji Google, rzeczywistych płatności i odbioru zdarzeń w usłudze GA4 wymaga ręcznej publikacji oraz dostępu do odpowiednich paneli.
