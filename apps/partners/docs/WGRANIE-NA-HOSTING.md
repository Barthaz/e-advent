# Wgranie kalendarza ŚOA na hosting

Domena: **https://soa-katowice.e-advent.pl**. To samodzielna aplikacja PHP. Hosting nie potrzebuje Node.js, npm ani plików aplikacji sklepu.

## 1. Ustaw adres i katalog strony

Jeżeli subdomena już istnieje, nie twórz jej ponownie. Wybierz ją w panelu i sprawdź pole „Katalog główny”. Przykładowy układ poniżej używa nazwy KATALOG_KAMPANII dla katalogu **bezpośrednio nad** public. Zastąp ją ścieżką z własnego konta.

- Ustaw katalog główny strony (document root) na KATALOG_KAMPANII/public. To przypisanie katalogu na serwerze, **nie** przekierowanie adresu na /public. Adres strony ma kończyć się na .pl/.
- Cały KATALOG_KAMPANII umieść poza katalogami publicznymi pozostałych domen, również strony głównej e-advent.pl. Inaczej prywatne pliki mogłyby być osiągalne pod innym adresem.
- W SeoHost: [tworzenie subdomeny w DirectAdmin](https://seohost.pl/pomoc/tworzenie-subdomeny-direct-admin); do wskazania katalogu służy [Dodatkowe funkcje → Customize Webroot](https://seohost.pl/pomoc/zmiana-katalogu-domeny). Jeżeli masz dostęp tylko do wnętrza public, poproś hosting o dostęp SFTP do katalogu nadrzędnego albo o wgranie katalogów prywatnych.
- Skieruj rekord DNS subdomeny na hosting i włącz certyfikat TLS obejmujący dokładnie soa-katowice.e-advent.pl. Wybierz PHP 8.2 lub nowsze z PDO MySQL i sesjami, obsługę reguł .htaccess/mod_rewrite. Wyłącz pełnostronicowy cache dla PHP, API i panelu. Grafiki mogą być buforowane.

## 2. Rozpakuj i wgraj pliki

Rozpakuj ZIP **na komputerze**. Przez SFTP lub menedżer plików wgraj katalogi w poniższym układzie. Jeśli public już istnieje, otwórz go po obu stronach i skopiuj jego **zawartość**, łącznie z ukrytym plikiem .htaccess. Jeśli jest to aktualizacja działającej strony, zachowaj kopię dotychczasowych plików, konfiguracji i bazy.

    KATALOG_KAMPANII/
    ├── public/                  ← tylko ten katalog udostępnia domena
    │   ├── .htaccess
    │   ├── index.php
    │   ├── dzien.php, polityka-prywatnosci.php, deklaracja-dostepnosci.php
    │   ├── robots.txt
    │   ├── api/
    │   ├── assets/
    │   └── statystyki/
    ├── private/                 ← obok public; konfiguracja, zadania i widoki
    │   └── storage/             ← pozostaw, również gdy pusty
    ├── database/schema.sql      ← plik do jednorazowego importu
    └── scripts/                 ← skrypty uruchamiane w terminalu

Włącz w kliencie SFTP widoczność plików ukrytych. Po wgraniu sprawdź, czy istnieje public/.htaccess oraz public/index.php — nie public/public/index.php. ZIP i instrukcję możesz zostawić na komputerze. Przy aktualizacjach zachowaj serwerowe private/config.local.php oraz private/storage/.

## 3. Utwórz bazę i ustaw konfigurację

1. W panelu hostingu utwórz **oddzielną bazę MySQL i jej użytkownika**. Zapisz dokładne nazwy wraz z prefiksem konta oraz nazwę hosta DB.
2. W phpMyAdmin wybierz nową bazę → Import → wybierz database/schema.sql z paczki. Po imporcie powinny istnieć tabele soa_daily_stats oraz soa_window_stats. Przy aktualizacji istniejącej instalacji nie importuj ich ponownie. Użytkownik aplikacji potrzebuje SELECT, INSERT i UPDATE do tych tabel.
3. Na serwerze skopiuj private/config.example.php jako **private/config.local.php**. W kopii podaj db.dsn (z rzeczywistym hostem i nazwą bazy), db.user i db.password. Zachowaj environment = production, base_url = https://soa-katowice.e-advent.pl, preview_now = null oraz stats_source = mysql. Nie wgrywaj konfiguracji lokalnego demo.
4. Sprawdź contact_email (w przykładzie: oficjalny adres Ośrodka) i wpisz zatwierdzony funding_text. Domyślnie analytics_enabled oraz analytics_approved są false; w tej konfiguracji działa zapamiętywanie okienek po wyborze użytkownika, ale aplikacja nie mierzy odsłon ani otwarć.
5. **Przed publikacją:** w private/tasks.php zastąp 24 przykładowe zadania tekstami od ŚOA. Zatwierdź z organizatorem stronę prywatności dla rzeczywistego hostingu (w szczególności administratora, podstawy przetwarzania, odbiorców, retencję logów i kopii). Strona dostępności zawiera instrukcję obsługi i kontakt; formalną deklarację tej subdomeny oprzyj na jej własnej ocenie i rzeczywistych datach publikacji oraz przeglądu. Dopiero po faktycznym odbiorze ustaw w konfiguracji odpowiednie flagi content_approved, branding_approved i legal_approved na true. Braki celowo wstrzymują publiczny start.
6. Nadaj procesowi PHP odczyt plików, a zapis w private/storage/ i systemowym katalogu sesji. Dla konfiguracji użyj uprawnień 600 lub 640 zależnie od użytkownika PHP; nie nadawaj 777.

## 4. Ustaw hasło i sprawdź instalację

W terminalu SSH z Bash przejdź do KATALOG_KAMPANII (tego, który zawiera public i private). Poniższe polecenia pobierają hasło bez wyświetlania go na ekranie. Wybierz unikalne hasło o długości co najmniej 16 znaków. Skrypt zapisze jego hash i utworzy klucz bezpieczeństwa w prywatnej konfiguracji, jeśli jest pusty.

    read -rs -p 'Nowe hasło panelu: ' SOA_PANEL_PASSWORD
    echo
    printf '%s\n' "$SOA_PANEL_PASSWORD" | php scripts/set-password.php
    unset SOA_PANEL_PASSWORD
    php scripts/preflight.php

Jeżeli hosting ma osobne wersje PHP CLI, użyj tej samej wersji PHP co strona. Jeśli nie masz terminala SSH, poproś hosting o wykonanie skryptów przez CLI w katalogu kampanii. Nie przenoś ich do public. Kontynuuj, gdy preflight pokazuje same [OK], również dla połączenia i schematu bazy.

## 5. Sprawdź domenę po wgraniu

- HTTP powinno przejść na HTTPS. Pod / powinna pojawić się strona bez paska demo. Przed 1 grudnia 2026 r. wszystkie okienka są prawidłowo zamknięte.
- /prywatnosc i /dostepnosc otwierają dokumenty. Wejście na /polityka-prywatnosci.php powinno zmienić adres na /prywatnosc. /dzien/1 udostępnia treść dopiero od 1 grudnia w trakcie kampanii; wcześniej odpowiedź 404 jest prawidłowa.
- W oknie prywatnym sprawdź „Akceptuję wszystkie”, a następnie „Ustawienia prywatności” w stopce. Można wyłączyć historię niezależnie od statystyk.
- /statystyki/ bez zalogowania przenosi do /statystyki/logowanie. Zaloguj się, otwórz raport i pobierz CSV. Przy wyłączonej analityce brak zdarzeń w raporcie jest oczekiwany.
- /private/tasks.php, /private/config.local.php i /database/schema.sql mają być niedostępne (404 lub 403).

Gdy działa tylko strona główna, a /prywatnosc zwraca 404, sprawdź obecność .htaccess i obsługę reguł przez hosting. Błąd 500 bezpośrednio po wgraniu: sprawdź log serwera i obsługę dyrektyw .htaccess. „Chwilowa przerwa” (503): zacznij od preflight i logu PHP. Pętla HTTPS za proxy: poproś hosting o przekazanie prawidłowego stanu HTTPS do Apache/PHP.
