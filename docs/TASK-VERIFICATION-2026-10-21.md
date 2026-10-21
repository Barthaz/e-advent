# Weryfikacja zadań — 21.10.2026

## Wynik

Nie należy jeszcze oznaczać całego modułu jako gotowego produkcyjnie. Renderowanie i eksport działają w opisanych testach, ale część materiałów kreatywnych jest nieukończona. Test na fizycznym Androidzie pozostaje do wykonania.

Katalog zawiera 180 unikalnych zadań: 108 standardowych i 72 specjalne, obsługiwane przez 14 silników. Wszystkie specjalne mają konfigurację treści i znajdują się w puli kreatora. Kalendarz nadal wybiera 24 dni.

59 dodatków ma PDF w WWW. Zgodnie z aktualnymi flagami `canPrintMobile`, aplikacja mobilna udostępnia przycisk PDF dla 19 z nich. Pozostałe 40 wydruków jest dostępne przez WWW; 13 dodatków nie ma PDF. To obecna konfiguracja produktu, a nie wynik testu udostępniania na telefonie.

## Poprawione podczas weryfikacji

- Generator katalogu odrzucał zadania o numerach 25–30 w każdym zestawie. Przywrócono 36 zadań, w tym 8 specjalnych. Przebudowano pliki katalogu i przykładów.
- WWW i aplikacja mobilna zachowują ostatnią odpowiedź przy przełączaniu okienek: oczekujący zapis trafia do pierwotnego dnia. Zapis jest kolejkowany; spóźniony odczyt nie nadpisuje nowej edycji. Zmiany wykonane w jednym renderze są scalane.
- Mobile zachowuje odpowiedź serwera dotyczącą blokady czasowej, pozwala zapieczętować treść i pokazuje termin jej otwarcia. Oba klienty czekają na potwierdzenie serwera, zanim wyświetlą lokalną kopię prywatnego zadania. Błąd połączenia jest widoczny.
- Przyciski PDF blokują eksport podczas przygotowywania, przed wczytaniem zadania i przed terminem odpieczętowania. Nieudane pieczętowanie nie udaje sukcesu.
- Puste zapisane tablice nie usuwają domyślnych pozycji checklist i bingo. Analogiczna poprawka dotyczy budowania danych PDF.
- Przepisy pokazują składniki w obu klientach. WWW odtwarza zapisany stan „Przepis wykonany”; aplikacja mobilna ma odpowiadającą mu akcję.
- Reguły ukończenia formularzy są zgodne między API a wspólnym kodem klientów: puste odpowiedzi nie wystarczają; obsługiwane są także formularze z wieloma kartami.
- Mobilny plik PDF ma nazwę zawierającą identyfikator kalendarza, dzień i czas, aby kolejne eksporty nie nadpisywały plików innych kalendarzy.
- PDF rezerwuje miejsce na stopkę na każdej stronie. Zaznaczenia checklist są rysowane jako kształty, bez zależności od brakującego glifu czcionki. Plansza bingo pozostaje razem. Usunięto dwukrotne drukowanie instrukcji DIY.

## Wykonane sprawdzenia

- `npm run test:frontend`: 317 testów, wszystkie przeszły. W tej liczbie są 217 testów katalogu/konfiguracji/renderowania wszystkich 72 dodatków na WWW i w komponentach mobilnych oraz testy zapisu i prywatności.
- `npm run test:api`: 282 testy, wszystkie przeszły. Obejmują m.in. odmowę eksportu przed datą otwarcia, niezmienność zapieczętowanej treści i odmowę dostępu przy błędzie odczytu blokady. Testy używają atrap bazy i usług zewnętrznych.
- `npm run test:app`: 4 testy sesji dostępu, wszystkie przeszły.
- Build produkcyjny WWW, ESLint WWW i TypeScript aplikacji mobilnej przeszły. Build WWW nadal zgłasza ostrzeżenie o rozmiarze głównego pakietu.
- Expo wyeksportowało pakiet Android/Hermes. Jest to weryfikacja pakietu JS i zasobów, nie budowa APK ani uruchomienie na urządzeniu.
- Prawdziwy renderer wygenerował 118 PDF-ów: 59 zadań w wariantach COLOR i INK_SAVER. Każdy plik został otwarty przez parser PDF, każda strona sprawdzona pod kątem odczytu tekstu; utworzono obrazy stron wariantu COLOR do oględzin. Nie stwierdzono błędów generowania plików. Oględziny wykazały opisane niżej braki treści — poprawny eksport nie oznacza kompletności materiału.
- W przeglądarce sprawdzono podgląd przepisu `set-5-task-4`: składniki, oznaczanie wykonania, zachowanie stanu po odświeżeniu oraz akcję eksportu. To tryb podglądu z lokalnym zapisem, nie test synchronizacji z rzeczywistym kontem.

Testy komponentów mobilnych używają adaptera elementów React Native do DOM. Sprawdzają kod React i treść, ale nie mierzą układu natywnego, działania klawiatury, galerii ani systemowego arkusza udostępniania.

## Pozostałe braki

### Materiały kreatywne do wydruku

Wszystkie 11 zadań z silnikiem DOCUMENT wymagają dokończenia materiału graficznego, a nie tylko renderera:

- `set-1-task-9`, `set-4-task-5`: papierowa wioska — zamiast wykrojów domków jest tekst zastępczy.
- `set-4-task-13`: papierowy renifer — brak wykroju i oznaczeń składania.
- `set-4-task-2`: papier prezentowy — kilka znaków tekstowych zamiast arkusza wzoru.
- `set-4-task-6`, `set-4-task-7`: masa solna i stemple — są instrukcje, brakuje obrysów do odrysowania.
- `set-4-task-10`, `set-4-task-11`: koperta i zakładki — brak odpowiednich szablonów do wycięcia.
- `set-4-task-16`: origami — brak diagramów zgięć.
- `set-4-task-21`, `set-4-task-25`: łańcuch wspomnień i girlanda — brak pasków i flag do wycięcia.

Także `set-2-task-18`, `set-3-task-9`, `set-4-task-3` (etykiety) i `set-4-task-28` (kupony) mają obecnie powtarzany tekst, zamiast pełnych arkuszy osobnych kart z liniami cięcia. `set-4-task-20` ma małą tabelę zamiast czterech dużych kadrów komiksu.

Nie zastępowano tych materiałów przypadkowymi ilustracjami. Potrzebne jest wykonanie użytkowych szablonów wektorowych zgodnie z opisami w `docs/special-windows/README.md`, następnie próbny wydruk w skali 100%.

### Treść i interakcje kulinarne

- `set-5-task-8`: przepis na ślimaczki jest skrótowy — brak ilości i temperatury, a specyfikacja opisuje gotowe ciasto francuskie, podczas gdy pakiet wymienia drożdże.
- `set-5-task-27`: „Rodzinny przepis” ma zastępcze składniki i statyczny silnik RECIPE. Brakuje formularza wpisania własnego przepisu.
- Opis zadania `set-5-task-4` i dołączona karta proponują różne wersje trufli. Warto ujednolicić tekst zadania z recepturą.

### Urządzenie, baza i praca bez sieci

Nie było dostępnego `adb` ani SDK w standardowej lokalizacji. Pozostają testy na Androidzie: zapis i odtworzenie postępu po ubiciu aplikacji, powrót z tła, galeria i uprawnienia zdjęć, pobranie PDF, anulowanie oraz zakończenie udostępniania. Należy też sprawdzić synchronizację WWW ↔ telefon na wydzielonym kalendarzu testowym i prawdziwą zmianę stanu kapsuły po terminie otwarcia.

Obecny cache zabezpiecza typową lokalną edycję, ale nie jest pełnym mechanizmem synchronizacji offline: nie ma trwałej kolejki ponawiania zapisów po zamknięciu procesu ani rozwiązywania konfliktów między urządzeniami. Nie należy obiecywać pełnego działania offline na podstawie tych testów.

## Powtarzanie weryfikacji PDF

Z katalogu głównego:

```powershell
node apps/e-advent-api/scripts/verify-special-windows.js --render
```

Skrypt używa syntetycznych danych i lokalnych grafik. Nie zapisuje do bazy, nie wysyła wiadomości ani nie uruchamia płatności. Artefakty trafiają do ignorowanego katalogu `.cache/task-verification/`: `results.json`, PDF-y, obrazy stron. Pole `placeholder` oznacza wykryty dosłowny tekst zastępczy; nie wykrywa wszystkich braków projektu graficznego. Kod wyjścia dotyczy integralności katalogu i błędów eksportu, a nie akceptacji produktu.

Logi testów i buildów znajdują się w `.cache/local-dev/tasks-*.log`. Zrzut ręcznie sprawdzonego przepisu: `.cache/task-verification/recipe-browser.png`.
