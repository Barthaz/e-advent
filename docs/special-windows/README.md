# e-Advent 2026 — kompletna dokumentacja techniczna okienek specjalnych, interakcji i eksportów

> **Status:** jedyny docelowy dokument wdrożeniowy / source of truth dla zespołu developerskiego i projektowego.  
> **Zakres:** 6 płatnych zestawów, 180 zadań, 72 okienka specjalne, 108 zadań standardowych, WWW + React Native Android + API Node/Express.  
> **Główna zasada:** **interakcje i design powstają w kodzie; dokumenty do pobrania są generowane przez API; ręcznie utrzymywane assety ograniczamy do brandingu i jednego responsywnego zestawu tła w 3 proporcjach.**

---

## 1. Dlaczego zmieniamy architekturę

Architektura musi unikać mnożenia prawie identycznych plików graficznych. Ramka, margines, kolor, font, liczba pól czy układ tabeli nie mogą wymagać przygotowania kolejnego PNG/PDF. Takie różnice są konfiguracją komponentów.

Nowy model eliminuje tę duplikację:

- ramki, panele, pola, tabele, koła, badge, checkboxy, linie, gridy, nagłówki i stopki są **komponentami**;
- typografia, kolory, promienie, spacing i ornamenty są **design tokens / SVG components**;
- dane konkretnego dnia są **konfiguracją/contentem**;
- PDF jest **wynikiem renderowania po stronie API**, a nie ręcznie utrzymywanym assetem;
- preview dokumentu jest generowane z tej samej definicji co PDF albo renderowane komponentem preview — nie przechowujemy `*_preview.png`;
- task-specific asset graficzny powstaje tylko wtedy, gdy naprawdę zawiera unikalną ilustrację, której nie opłaca się opisywać prymitywami/SVG w kodzie.

### Cel liczbowy

Dla v1 ręcznie utrzymujemy **5 fizycznych plików graficznych**: pełne logo PNG, mark PNG oraz ten sam ambient świąteczny przygotowany w 3 proporcjach (`landscape`, `square`, `portrait`). Żadne z 72 okienek specjalnych nie wymaga osobnego gotowego PNG ani statycznego PDF-u.

---

## 2. Zasady nienegocjowalne

1. **Code-first UI.** Każda interakcja działa i wygląda jak pełnoprawna część aplikacji, a nie obrazek z nałożonym formularzem.
2. **API-first documents.** Każdy dokument do pobrania jest generowany na żądanie przez API z zarejestrowanego komponentu dokumentowego.
3. **Brak ręcznie utrzymywanych PDF-ów.** Nie commitujemy finalnych `*.pdf` jako źródła produktu.
4. **Brak template PNG dla formularzy/kart.** Nie używamy PNG jako tła tylko po to, aby mieć ramkę, tytuł, pola albo ornament.
5. **Brak preview PNG w repo.** Preview jest pochodną i może być cache'owane, ale nie jest źródłem prawdy.
6. **Jeden design system.** WWW, mobile i PDF korzystają z tych samych tokenów, theme IDs i definicji layoutu.
7. **Specjalność dnia pozostaje tajemnicą.** Przed otwarciem UI i API nie ujawniają `isSpecial`, engine, contentu ani export configu.
8. **Oryginalne zadanie zawsze pozostaje widoczne.** Dodatek premium je wzbogaca, nie zastępuje.
9. **Darmowy kalendarz nie korzysta z premium special engine'ów.**
10. **Brak audio recordera i mikrofonu.**
11. **Autosave dla interakcji.** Zamknięcie karty/aplikacji nie może kasować rozpoczętej pracy.
12. **Zdjęcia lokalne w v1.** Nie uploadujemy zdjęć użytkownika tylko po to, aby stworzyć ramkę/kolaż.

### 2.1. Zakres liczbowy

| Zestaw | Wszystkie zadania | Specjalne | Standardowe |
|---|---:|---:|---:|
| Świąteczny nastrój i zabawa | 30 | **15** | 15 |
| Porządki i przygotowania | 30 | **10** | 20 |
| Dobre uczynki i życzliwość | 30 | **8** | 22 |
| Kreatywne i artystyczne | 30 | **15** | 15 |
| Kuchenne i kulinarne | 30 | **12** | 18 |
| Refleksja i relaks | 30 | **12** | 18 |
| **Łącznie** | **180** | **72** | **108** |

Darmowa wersja kalendarza nie korzysta z mechanizmu okienek specjalnych.

---

## 3. Co jest kodem, a co assetem

| Element | Implementacja | Asset? |
|---|---|---|
| ramka złota | `Border`, tokeny, SVG/CSS | nie |
| koło, badge, medal | `Circle`, `Badge`, SVG component | nie |
| tabela / planer | `Grid`, `Table`, `Row`, `Cell` | nie |
| checkbox / bingo | komponent UI + dokumentowy | nie |
| etykieta prezentowa | `LabelsSheetDocument` + config | nie |
| kartka A6/A5 | `GreetingCardDocument` + theme | nie |
| karta przepisu | `RecipeDocument` | nie |
| karta wyniku | `ScorecardDocument` | nie |
| formularz refleksji | `CardFormEngine` + `FormCardDocument` | nie |
| papier prezentowy | pattern SVG generowany w kodzie | nie |
| linie cięcia/zgięcia | `CutLine`, `FoldLine` | nie |
| papierowa wioska | `PaperVillageDocument` + wektorowe komponenty domków | nie |
| renifer do wycięcia | `PaperReindeerSvg` w kodzie | nie |
| origami | `OrigamiStep` / wektory w kodzie | nie |
| dekoracyjne gałązki/gwiazdki | komponenty SVG | nie |
| pełne logo e-Advent | PNG z kanałem alpha | **tak** |
| mini-symbol e-Advent | PNG z kanałem alpha | **tak** |
| ambient świąteczny — landscape 16:9 | WebP | **tak** |
| ambient świąteczny — square 1:1 | WebP | **tak** |
| ambient świąteczny — portrait 9:16 | WebP | **tak** |

**Reguła:** jeśli różnica między dwoma „assetami” da się opisać jako „inna ramka / inny tekst / kilka kół / inny układ pól / inny kolor”, to nie są dwa assety. To jeden komponent z innym configiem.

---

## 4. Architektura wysokiego poziomu

```text
                             ┌─────────────────────────────┐
                             │       API / Node.js         │
                             │                             │
                             │ openWindow / progress       │
                             │ content registry            │
                             │ document registry           │
                             │ PDF Render Service          │
                             └──────────────┬──────────────┘
                                            │
                         JSON/config        │        PDF stream
                                            │
             ┌──────────────────────────────┴──────────────────────────────┐
             │                                                             │
             ▼                                                             ▼
┌──────────────────────────┐                                  ┌──────────────────────────┐
│          WWW             │                                  │      React Native        │
│ SpecialWindowShell       │                                  │ SpecialWindowShell       │
│ Engine renderers         │                                  │ Engine renderers         │
│ DocumentPreviewRenderer  │                                  │ DocumentPreviewRenderer  │
└─────────────┬────────────┘                                  └─────────────┬────────────┘
              │                                                             │
              └──────────────── shared packages ─────────────────────────────┘
                    special-core / design-tokens / render-schema
```

### 4.1. Docelowy przepływ renderowania

Nie utrzymujemy source warstwy gotowych template'ów PNG/PDF dla formularzy, kart, plannerów i printables. Źródłem prawdy jest:

```text
components + theme + content + user data
                │
                ├── UI renderer web
                ├── UI renderer RN
                └── API DocumentRenderer -> PDF
```

### 4.2. Co współdzielą WWW i React Native

- typy TypeScript i enumy;
- schema konfiguracji engine'ów;
- walidatory;
- `taskId`, `configId`, `contentKey`, `templateId`;
- completion rules;
- scoring i deterministic randomization;
- progress payload i migracje;
- design tokens;
- content 6 zestawów;
- definicje dokumentów / render schema;
- klient API i kontrakty transportowe;
- resolver `ChristmasAmbientSet`.

### 4.3. Co pozostaje platformowe

- komponenty UI i navigation;
- zapis pliku / system share;
- lokalny render PNG ze zdjęciami;
- wybór i crop zdjęcia;
- print/open PDF;
- local storage/cache;
- background/foreground lifecycle;
- implementacja pomiaru kontenera dla doboru ambientu.


---

## 5. Rekomendowana struktura monorepo

```text
e-advent/
├── apps/
│   ├── api/
│   │   └── src/
│   │       ├── calendar/
│   │       ├── special-windows/
│   │       ├── exports/
│   │       │   ├── ExportController.ts
│   │       │   ├── PdfRenderService.ts
│   │       │   ├── DocumentRegistry.ts
│   │       │   └── cache/
│   │       └── documents/
│   │           ├── shared/
│   │           ├── craft/
│   │           ├── culinary/
│   │           └── reflection/
│   ├── web/
│   │   └── src/special-windows/
│   └── mobile/
│       └── src/special-windows/
│
├── packages/
│   ├── special-core/
│   │   ├── engines/
│   │   ├── schema/
│   │   ├── progress/
│   │   └── completion/
│   ├── design-tokens/
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   ├── spacing.ts
│   │   └── themes.ts
│   ├── render-schema/
│   │   ├── DocumentDefinition.ts
│   │   ├── primitives.ts
│   │   └── layout.ts
│   ├── render-components/
│   │   ├── Ornament.tsx
│   │   ├── GoldFrame.tsx
│   │   ├── PaperVillageSvg.tsx
│   │   ├── PaperReindeerSvg.tsx
│   │   ├── OrigamiTreeSteps.tsx
│   │   └── ...
│   └── content/
│       ├── mood-fun.json
│       ├── preparations.json
│       ├── kindness.json
│       ├── creative.json
│       ├── culinary.json
│       └── reflection.json
│
└── assets/
    ├── brand/
    │   ├── eadvent-logo.png
    │   └── eadvent-mark.png
    └── backgrounds/
        ├── christmas-ambient-landscape.webp
        ├── christmas-ambient-square.webp
        └── christmas-ambient-portrait.webp
```

### Dlaczego content scalony do 6 plików

Wariant z wieloma małymi plikami przewidywał ok. 50 małych `content/*.json`. To nie są assety graficzne, ale również nie ma powodu mnożyć plików, jeśli większość zawiera tylko kilka tablic/promptów. Rekomendacja: **jeden wersjonowany plik contentu na zestaw**, a w nim klucze `contentPackId`.

Przykład:

```json
{
  "version": 1,
  "packs": {
    "christmas-quiz-v1": { "questions": [] },
    "christmas-bingo-v1": { "items": [] },
    "christmas-theatre-v1": { "characters": [], "problems": [], "places": [] }
  }
}
```

API nadal zwraca tylko pack potrzebny po otwarciu danego dnia.

### 5.1. Rejestr kluczy contentu

Poniższe klucze są logicznymi `contentKey`. Fizycznie pozostają w sześciu plikach zestawów.

| Plik | `contentKey` |
|---|---|
| `packages/content/mood-fun.json` | `christmas-alphabet` |
| `packages/content/mood-fun.json` | `christmas-bingo` |
| `packages/content/mood-fun.json` | `christmas-charades` |
| `packages/content/mood-fun.json` | `christmas-prediction` |
| `packages/content/mood-fun.json` | `christmas-quiz` |
| `packages/content/mood-fun.json` | `christmas-theatre` |
| `packages/content/mood-fun.json` | `christmas-trivia` |
| `packages/content/mood-fun.json` | `december-ranking` |
| `packages/content/mood-fun.json` | `gift-detective` |
| `packages/content/mood-fun.json` | `illumination-hunt` |
| `packages/content/mood-fun.json` | `reindeer-challenge` |
| `packages/content/mood-fun.json` | `secret-elf-missions` |
| `packages/content/preparations.json` | `christmas-menu` |
| `packages/content/preparations.json` | `december-planner` |
| `packages/content/preparations.json` | `emergency-box` |
| `packages/content/preparations.json` | `emergency-gift-ideas` |
| `packages/content/preparations.json` | `final-audit` |
| `packages/content/preparations.json` | `gift-planner` |
| `packages/content/preparations.json` | `packing-station` |
| `packages/content/preparations.json` | `pantry-checklist` |
| `packages/content/preparations.json` | `wrapping-inventory` |
| `packages/content/kindness.json` | `family-memory-prompts` |
| `packages/content/kindness.json` | `pay-it-forward` |
| `packages/content/kindness.json` | `personal-wishes-prompts` |
| `packages/content/kindness.json` | `secret-elf-kindness-missions` |
| `packages/content/kindness.json` | `thank-you-card-prompts` |
| `packages/content/kindness.json` | `three-smiles` |
| `packages/content/culinary.json` | `chocolate-tasting` |
| `packages/content/culinary.json` | `christmas-board-builder` |
| `packages/content/culinary.json` | `cookie-duel` |
| `packages/content/culinary.json` | `edible-gift` |
| `packages/content/culinary.json` | `family-recipe` |
| `packages/content/culinary.json` | `gingerbread-test` |
| `packages/content/culinary.json` | `hot-chocolate-builder` |
| `packages/content/culinary.json` | `mocktail-builder` |
| `packages/content/culinary.json` | `recipe-caramelized-nuts` |
| `packages/content/culinary.json` | `recipe-cinnamon-rolls` |
| `packages/content/culinary.json` | `recipe-truffles` |
| `packages/content/culinary.json` | `tea-tasting` |
| `packages/content/reflection.json` | `christmas-intention` |
| `packages/content/reflection.json` | `december-closure` |
| `packages/content/reflection.json` | `five-senses-walk` |
| `packages/content/reflection.json` | `future-self-letter` |
| `packages/content/reflection.json` | `good-people` |
| `packages/content/reflection.json` | `no-notifications-hour` |
| `packages/content/reflection.json` | `our-tradition` |
| `packages/content/reflection.json` | `ten-small-joys` |
| `packages/content/reflection.json` | `three-good-scenes` |
| `packages/content/reflection.json` | `time-capsule` |
| `packages/content/reflection.json` | `year-in-six-words` |

Dodatki oznaczone w matrycy jako `config w pliku zestawu` nie wymagają osobnego content packa — ich niewielka konfiguracja może znajdować się bezpośrednio przy definicji taska w odpowiednim pliku zestawu.

`packages/content/creative.json` może więc nie mieć osobnych dużych `contentKey`; przechowuje konfiguracje kreatywne, parametry dokumentów i warianty bez mnożenia mini-plików.

---

## 6. Model domenowy

```ts
type CalendarWindowState = 'LOCKED' | 'AVAILABLE' | 'OPENED' | 'COMPLETED';

type SpecialEngineType =
  | 'QUIZ'
  | 'CHECKLIST'
  | 'RANDOMIZER_TIMER'
  | 'CARD_FORM'
  | 'DOCUMENT'
  | 'RECIPE'
  | 'SCORECARD'
  | 'IMAGE_CARD'
  | 'SORTABLE_LIST'
  | 'PLANNER'
  | 'MONTH_PLANNER'
  | 'OPTION_CONFIGURATOR'
  | 'TURN_BASED_GAME'
  | 'TEMPLATE_PERSONALIZER';

interface OpenedCalendarWindow {
  taskId: string;
  day: number;
  state: 'OPENED' | 'COMPLETED';
  title: string;
  text: string;
  isSpecial: boolean;
  special?: SpecialWindowDescriptor;
}

interface SpecialWindowDescriptor {
  configId: string;
  engine: SpecialEngineType;
  variant?: string;
  version: number;
  headline: string;
  description?: string;
  contentKey?: string;
  uiPreset?: string;
  document?: DocumentCapability;
  completionRule: CompletionRule;
  capabilities?: {
    canShareImage?: boolean;
    canPrint?: boolean;
    dateGate?: boolean;
  };
  config: Record<string, unknown>;
}

interface DocumentCapability {
  templateId: DocumentTemplateId;
  version: number;
  variants?: Array<'COLOR' | 'INK_SAVER'>;
  defaultPage?: 'A4' | 'A5' | 'A6' | 'A3';
}
```

### Czego nie ma w descriptorze

Nie ma `assets: ["form-card.png", ...]` dla zwykłych layoutów. Klient zna `themeId`, engine i config. Task-specific asset może pojawić się tylko wyjątkowo; v1 zakłada **zero obowiązkowych task-specific assetów**.

---

## 7. Design system — wspólny wygląd zamiast template PNG

### 7.1. Tokeny

```ts
interface EAdventTheme {
  id: 'CLASSIC_GREEN' | 'WARM_CREAM' | 'MIDNIGHT';
  colors: {
    background: string;
    surface: string;
    surfaceAlt: string;
    text: string;
    muted: string;
    gold: string;
    success: string;
    danger: string;
  };
  radii: { sm: number; md: number; lg: number };
  spacing: { xs: number; sm: number; md: number; lg: number; xl: number };
  typography: { heading: string; body: string; accent: string };
  ornamentPreset: 'NONE' | 'CORNERS' | 'STARS' | 'EVERGREEN';
  backgroundSetId?: 'christmas-ambient';
}
```

### 7.2. Prymitywy layoutu

Implementujemy raz:

- `Page`
- `Surface`
- `Stack`
- `Row`
- `Grid`
- `Box`
- `Circle`
- `Text`
- `Heading`
- `Divider`
- `Badge`
- `Table`
- `TableRow`
- `TableCell`
- `Checkbox`
- `ScoreScale`
- `PhotoSlot`
- `Icon`
- `Ornament`
- `GoldFrame`
- `CutLine`
- `FoldLine`
- `GlueArea`
- `CropMark`
- `PageNumber`
- `BrandFooter`

Dzięki temu "ładna złota ramka" jest parametrem `GoldFrame`, a nie kolejnym PNG.

### 7.3. Ornamenty

Świąteczne ornamenty są komponentami SVG, np.:

```text
EvergreenCorner
HollyCluster
GoldStars
Snowflake
Bauble
Gift
Ribbon
ChristmasTree
ReindeerHead
```


Są kodem/wektorem i mogą być używane jednocześnie w UI, preview i dokumentach.

### 7.4. Responsywny `ChristmasAmbientSet` — trzy proporcje tego samego tła

Ambient jest **jednym logicznym assetem**, ale ma trzy fizyczne wersje kompozycyjne. Nie wykonujemy zwykłego cropu z wersji poziomej — każda wersja zachowuje ten sam klimat i zestaw motywów, ale ma kompozycję dostosowaną do proporcji.

| Variant | Plik | Proporcja | Zalecany master | Główne użycie |
|---|---|---:|---:|---|
| `LANDSCAPE` | `assets/backgrounds/christmas-ambient-landscape.webp` | 16:9 | 2400×1350 | desktop WWW, szerokie panele, landscape tablet |
| `SQUARE` | `assets/backgrounds/christmas-ambient-square.webp` | 1:1 | 2160×2160 | kafle, preview, okolice proporcji 1:1, bezpieczny fallback |
| `PORTRAIT` | `assets/backgrounds/christmas-ambient-portrait.webp` | 9:16 | 1350×2400 | telefon, pełnoekranowe speciale, portrait tablet |

Wspólne wymagania wszystkich trzech:
- ten sam ciemnozielono-złoty język wizualny;
- bez tekstu, logo, ramek, pól formularzy i gotowych paneli;
- środek pozostaje spokojny i czytelny;
- bogatsze dekoracje są przy krawędziach;
- dekoracje nie mogą zawierać informacji biznesowej ani znaczenia interakcji;
- przy `cover` utrata 5–10% krawędzi nie może niszczyć kompozycji;
- nie należy umieszczać ważnego ornamentu dokładnie na granicy safe area;
- tło nigdy nie jest jedynym nośnikiem kontrastu dla tekstu — treść ma własny `Surface`/overlay.

Typy:

```ts
type AmbientVariant = 'LANDSCAPE' | 'SQUARE' | 'PORTRAIT';

interface AmbientBackgroundSet {
  id: 'christmas-ambient';
  variants: Record<AmbientVariant, {
    src: string;
    width: number;
    height: number;
    aspectRatio: number;
  }>;
}

export const christmasAmbient: AmbientBackgroundSet = {
  id: 'christmas-ambient',
  variants: {
    LANDSCAPE: {
      src: '/assets/backgrounds/christmas-ambient-landscape.webp',
      width: 2400,
      height: 1350,
      aspectRatio: 16 / 9
    },
    SQUARE: {
      src: '/assets/backgrounds/christmas-ambient-square.webp',
      width: 2160,
      height: 2160,
      aspectRatio: 1
    },
    PORTRAIT: {
      src: '/assets/backgrounds/christmas-ambient-portrait.webp',
      width: 1350,
      height: 2400,
      aspectRatio: 9 / 16
    }
  }
};
```

Wybór wariantu ma wynikać z **proporcji kontenera**, nie z nazwy urządzenia:

```ts
export function resolveAmbientVariant(width: number, height: number): AmbientVariant {
  const ratio = width / height;

  if (ratio >= 1.25) return 'LANDSCAPE';
  if (ratio <= 0.80) return 'PORTRAIT';
  return 'SQUARE';
}
```

Reguły:
- `ratio >= 1.25` → landscape;
- `ratio <= 0.80` → portrait;
- `0.80 < ratio < 1.25` → square;
- przy braku wymiarów podczas SSR użyć `SQUARE` jako bezpiecznego fallbacku;
- po poznaniu wymiarów klient może przełączyć wariant bez resetu stanu speciala;
- wariant nie jest zapisywany w progressie użytkownika.

WWW:
- dla tła całego viewportu można użyć media queries;
- dla komponentu osadzonego w dowolnym panelu preferować `ResizeObserver`/container size;
- `background-size: cover; background-position: center`;
- nad tłem stosować gradient/overlay, jeśli potrzebny jest dodatkowy kontrast;
- preloadować wyłącznie wariant aktualnie potrzebny;
- pozostałych dwóch nie pobierać „na zapas” na urządzeniach mobilnych.

React Native:
- dla fullscreen użyć `useWindowDimensions()`;
- dla osadzonego panelu użyć wymiarów z `onLayout`;
- `ImageBackground`/odpowiedni komponent z `resizeMode="cover"`;
- przejście orientation może zmienić wariant, ale nie może remountować engine'u ani kasować progressu.

Eksporty:
- zwykły PDF **nie używa fotograficznego ambientu** jako pełnego tła; PDF korzysta z tokenów, wektorowych ornamentów i powierzchni oszczędnych w druku;
- lokalny share PNG może używać ambientu, jeśli pasuje do projektu;
- przy share PNG wybieramy wariant na podstawie **docelowego canvasu eksportu**, a nie ekranu urządzenia;
- dla `REF-14` (tapeta 9:16) zawsze używać `PORTRAIT`, jeśli ambient jest częścią finalnej tapety.

### 7.5. Brand PNG

Ręcznie utrzymywane pliki brandu:

```text
assets/brand/eadvent-logo.png
assets/brand/eadvent-mark.png
```

Wymagania:
- przezroczyste tło (alpha);
- bez czarnego/białego prostokąta w bitmapie;
- minimum ok. 1200 px na dłuższym boku; większy master jest mile widziany;
- nie skalować w górę ponad rozmiar źródła przy eksporcie wysokiej jakości;
- w małych rozmiarach preferować `eadvent-mark.png`, nie pełne logo ze sloganem;
- aplikacja może z marku generować osobne platformowe ikony z wymaganym paddingiem i tłem systemowym, ale te pochodne nie są source-of-truth brandu.

---

## 8. Silniki interaktywne

| Engine | Odpowiedzialność |
|---|---|
| `SpecialWindowShell` | reveal, intro, CTA, status autosave, completion |
| `QuizEngine` | pytania, odpowiedzi, wynik, ciekawostki |
| `ChecklistEngine` | checklisty, bingo, audyty, score listy |
| `RandomizerTimerEngine` | losowanie, deck, timer |
| `CardFormEngine` | formularze tekstowe, autosave |
| `DocumentEngine` | preview dokumentu + żądanie PDF z API; brak statycznego source PDF |
| `RecipeCardEngine` | przepis, składniki, kroki, tryb gotowania |
| `ScorecardEngine` | porównania i skale ocen |
| `ImageCardEngine` | zdjęcia lokalne, crop, lokalny PNG |
| `SortableListEngine` | TOP N i sortowanie |
| `PlannerEngine` | listy/tabele CRUD |
| `MonthPlannerEngine` | grudniowy kalendarz |
| `OptionConfiguratorEngine` | wybór opcji i generowanie receptury/listy |
| `TurnBasedGameEngine` | prosta gra lokalna 2+ |
| `TemplatePersonalizerEngine` | personalizacja danych; finalny PDF nadal przez API |
| capabilities | export, share image, DateGate, print |

### Ważne

`DocumentEngine` **nie pobiera gotowego PDF assetu**. Wysyła do API żądanie wygenerowania dokumentu na podstawie `templateId`, danych i konfiguracji.

### 8.1. Wspólny kontrakt engine'u

Każdy engine powinien implementować logicznie ten sam lifecycle:

```ts
interface SpecialEngineAdapter<TConfig, TPayload> {
  engineType: SpecialEngineType;

  validateConfig(config: unknown): TConfig;

  createInitialPayload(config: TConfig): TPayload;

  migratePayload?(
    payload: unknown,
    fromVersion: number,
    toVersion: number
  ): TPayload;

  canComplete(args: {
    config: TConfig;
    payload: TPayload;
  }): {
    value: boolean;
    reason?: string;
  };
}
```

UI Web i RN nie współdzielą komponentów wizualnych 1:1, ale współdzielą:
- schema;
- walidację;
- reguły ukończenia;
- scoring;
- deterministic randomization;
- progress payload;
- content;
- identyfikatory;
- zasady eksportu.

Każdy engine ma:
- `NOT_STARTED -> IN_PROGRESS -> COMPLETED`;
- autosave;
- bezpieczny resume po restarcie;
- fallback do standardowego zadania przy wadliwej konfiguracji;
- error boundary na UI;
- eventy analytics bez prywatnej treści.

---

## 9. DocumentKit — serce generowania PDF

### 9.1. Zasada

Każdy dokument jest kodem:

```ts
interface DocumentDefinition {
  templateId: string;
  version: number;
  page: {
    size: 'A4' | 'A5' | 'A6' | 'A3';
    orientation: 'PORTRAIT' | 'LANDSCAPE';
    marginMm: number;
  };
  themeId: EAdventTheme['id'];
  nodes: DocumentNode[];
}
```

Przykład planera:

```ts
const GiftPlannerDocument = defineDocument((data) => ({
  templateId: 'gift-planner-v1',
  version: 1,
  page: { size: 'A4', orientation: 'PORTRAIT', marginMm: 12 },
  themeId: 'WARM_CREAM',
  nodes: [
    GoldFrame({ insetMm: 5 }),
    Heading({ text: 'Świąteczna lista bez paniki' }),
    Table({
      columns: ['Osoba', 'Pomysł', 'Budżet', 'Kupione', 'Zapakowane'],
      rows: data.people
    }),
    BrandFooter()
  ]
}));
```

Nie istnieje `gift-planner-background.png`.

### 9.2. Dokumenty wspólne

Reużywalne rodziny dokumentów:

- `FormCardDocument`
- `ChecklistDocument`
- `PlannerDocument`
- `MonthPlannerDocument`
- `ScorecardDocument`
- `RecipeDocument`
- `LabelsSheetDocument`
- `GreetingCardDocument`
- `RankingDocument`
- `Photo-less ResultDocument`
- `PromptSheetDocument`

### 9.3. Dokumenty unikalne, ale nadal kodowe

Te przypadki mają własne komponenty, bo różnią się znacząco konstrukcją — **nie oznacza to osobnych graficznych assetów**:

- `PaperVillageDocument`
- `WrappingPatternDocument`
- `SaltDoughGuideDocument`
- `StampGuideDocument`
- `EnvelopeDecorGuideDocument`
- `BookmarksDocument`
- `PaperReindeerDocument`
- `OrigamiGuideDocument`
- `ComicSheetDocument`
- `MemoryChainDocument`
- `GarlandDocument`
- `CouponSheetDocument`

Wektory domków, renifera, choinki origami itd. mogą być komponentami SVG/TSX w `packages/render-components`.

### 9.4. Wymagania dla finalnych PDF

- podstawowym formatem wydruku jest A4; A5/A6/A3 stosować tylko tam, gdzie wynika to z produktu;
- A3 ma sens np. dla większego papieru prezentowego lub arkusza, nie jako domyślne powiększenie wszystkiego;
- tekst, ramki, linie, tabele i linie cięcia/zgięcia pozostają wektorowe;
- raster osadzony w dokumencie powinien mieć efektywną jakość ok. 300 DPI dla docelowego rozmiaru;
- nie zakładamy, że użytkownik ma drukarkę borderless;
- każdy printable ma bezpieczne marginesy domowej drukarki;
- elementy DIY stosują jednoznaczne style `CUT`, `FOLD`, opcjonalnie `GLUE`;
- jeżeli instrukcja zawiera cięcie/zginanie, legenda musi być widoczna na arkuszu;
- `COLOR` jest wariantem domyślnym, ale dokumenty z dużą ilością dekoracji powinny mieć `INK_SAVER`;
- `INK_SAVER` nie może usuwać informacji potrzebnej do wykonania zadania;
- fonty są osadzone i testowane z polskimi znakami;
- wszystkie dynamiczne pola mają max length i kontrolę overflow;
- tekst może się zmniejszać tylko do ustalonego minimum; po przekroczeniu limitu renderer ma walidacyjny błąd zamiast nieczytelnego tekstu;
- nazwa pliku jest przyjazna użytkownikowi, bez UUID;
- finalny PDF nie jest zapisywany w repo jako source asset.

### 9.5. Print safety dla craftów

Dla dokumentów typu `PaperVillageDocument`, `PaperReindeerDocument`, `OrigamiGuideDocument`, `GarlandDocument`:
- testować wydruk w skali 100%;
- w instrukcji jasno zaznaczyć, czy skalowanie `Fit to page` jest dopuszczalne;
- minimalna grubość linii cięcia/zgięcia musi pozostać czytelna na typowej drukarce domowej;
- nie umieszczać kluczowych linii przy samym brzegu strony;
- wersja `INK_SAVER` preferuje kontur i ograniczone wypełnienia.

---

## 10. API — generowanie PDF

### 10.1. Kontrakty API wymagane przez funkcjonalność

Minimalny zestaw logicznych endpointów:

```text
GET  /api/calendar-instances/:instanceId
POST /api/calendar-instances/:instanceId/windows/:day/open

GET  /api/calendar-instances/:instanceId/windows/:day/progress
PUT  /api/calendar-instances/:instanceId/windows/:day/progress

POST /api/calendar-instances/:instanceId/windows/:day/complete

POST /api/calendar-instances/:instanceId/windows/:day/export/pdf
GET  /api/calendar-instances/:instanceId/windows/:day/export/preview?page=1
```

Nazwy routów mogą zostać dopasowane do istniejącego API, ale zachowanie logiczne jest obowiązkowe.

`GET calendar instance`:
- zwraca dni i ich stan;
- dla nieotwartych dni nie ujawnia `isSpecial`, engine, `contentKey`, `document` ani żadnych premium URL;
- nie prefetchuje future premium configu do klienta.

`POST open`:
- sprawdza entitlement;
- sprawdza datę/kolejność;
- jest idempotentny;
- zapisuje `OPENED`;
- dopiero wtedy zwraca `SpecialWindowDescriptor`.

`GET/PUT progress`:
- klucz logiczny: `calendarInstanceId + taskId`;
- walidacja `payloadVersion`;
- limit rozmiaru;
- zdjęcia nigdy jako base64.

`POST complete`:
- oddzielne od zapisu progressu;
- waliduje completion rule tam, gdzie wymaga tego engine;
- może pozwalać na manual completion, jeśli specyfikacja konkretnego taska tak mówi.

### 10.2. Eksport PDF

Rekomendowany kontrakt:

```text
POST /api/calendar-instances/:instanceId/windows/:day/export/pdf
```

Body:

```json
{
  "variant": "COLOR",
  "locale": "pl-PL"
}
```

API **nie przyjmuje dowolnego `templateId` od klienta jako źródła prawdy**. Na podstawie `instanceId + day`:

1. sprawdza entitlement;
2. sprawdza, czy dzień został otwarty;
3. odczytuje server-side `SpecialWindowConfig`;
4. pobiera progress/dane użytkownika;
5. wybiera z `DocumentRegistry` właściwy komponent;
6. waliduje dane;
7. renderuje PDF;
8. zwraca stream/buffer z poprawną nazwą pliku.

### 10.3. Registry

```ts
const DocumentRegistry: Record<DocumentTemplateId, DocumentFactory> = {
  'form-card-v1': FormCardDocument,
  'gift-planner-v1': GiftPlannerDocument,
  'paper-village-v1': PaperVillageDocument,
  'origami-tree-v1': OrigamiGuideDocument,
  // ...
};
```

### 10.4. Renderer

Implementacja może używać jednego serwerowego renderer adaptera, np. komponentowego renderera PDF. Ważne wymagania architektoniczne:

- tekst pozostaje wektorowy;
- linie cięcia/zgięcia są wektorowe;
- fonty są osadzone/licencjonowane po stronie API;
- polskie znaki są testowane;
- nie rasteryzujemy całej strony tylko po to, aby zrobić PDF;
- layout ma testy overflow.

### 10.5. Cache

**Niepersonalizowane** dokumenty (np. papierowa wioska, origami, wzory) mogą być cache'owane po:

```text
templateId + version + themeId + variant + locale
```

To nadal są **wygenerowane pochodne**, a nie ręczne assety źródłowe.

**Personalizowane/prywatne** dokumenty:

- `Cache-Control: private, no-store` albo krótki prywatny cache;
- nie logować body;
- nie zapisywać wygenerowanego PDF bez potrzeby.

### 10.6. Nazwy plików

```text
e-Advent_lista-prezentow.pdf
e-Advent_papierowa-wioska.pdf
e-Advent_rodzinny-przepis.pdf
```

Bez UUID w nazwie pobieranej przez użytkownika.

---

## 11. PDF jako standard pobierania + wyjątki obrazowe

Domyślnie:

```text
Pobierz / Drukuj -> PDF z API
```

Nie generujemy osobnego PNG tylko dlatego, że karta jest ładna.

### Dozwolone wyjątki

PNG jest właściwym finalnym formatem tylko gdy **produkt semantycznie jest obrazem**:

- `ImageCardEngine` — kolaż / ramka ze zdjęciem;
- `REF-14` — tapeta 9:16;
- opcjonalne `Udostępnij jako obraz` dla wyników/rankingów.

Dla zdjęć PNG generujemy **lokalnie**, aby nie wysyłać prywatnych zdjęć do API. Jeżeli użytkownik ma również opcję `Pobierz dokument`, dostaje PDF bez zdjęcia albo świadomie korzysta z osobnego flow uploadu tymczasowego — v1 tego nie wymaga.

---

## 12. Preview dokumentów bez preview assetów

### UI preview

`DocumentPreviewRenderer` interpretuje tę samą definicję layoutu i pokazuje skalowany podgląd w aplikacji.

```text
Document config
     ├── WebPreviewRenderer
     ├── RNPreviewRenderer
     └── API PdfRenderer
```

### Exact PDF preview

Jeśli potrzebny jest dokładny preview wydruku:

```text
GET /api/.../export/preview?page=1
```

API może wygenerować miniaturę WebP z renderu dokumentu i cache'ować ją. **Nie commitujemy jej do repo.**

---

## 13. Docelowy katalog assetów — dokładnie 5 plików source

### 13.1. Obowiązkowe assety

| Plik | Format | Wymagania | Użycie |
|---|---|---|---|
| `assets/brand/eadvent-logo.png` | PNG alpha | pełne logo, poprawny slogan i polskie znaki, transparent | większe nagłówki, ekran about, stopki, dokumenty gdy rozmiar pozwala |
| `assets/brand/eadvent-mark.png` | PNG alpha | uproszczony symbol, bez tekstu, transparent | małe badge, app mark, stopki, kompaktowe miejsca |
| `assets/backgrounds/christmas-ambient-landscape.webp` | WebP 16:9 | ta sama kompozycja marki, spokojny środek | desktop/szerokie kontenery |
| `assets/backgrounds/christmas-ambient-square.webp` | WebP 1:1 | ta sama kompozycja marki, spokojny środek | kwadrat/near-square/fallback |
| `assets/backgrounds/christmas-ambient-portrait.webp` | WebP 9:16 | ta sama kompozycja marki, spokojny środek | telefony/pion |

To jest **5 fizycznych plików**, ale tylko **3 logiczne zasoby**:
1. pełne logo;
2. mark;
3. `christmas-ambient` jako responsive set 3 wariantów.

### 13.2. Co nie jest source assetem

Nie tworzyć jako ręcznie utrzymywanych assetów:
- złotych ramek;
- białych kart/paneli;
- pól formularzy;
- kół, badge'y i medali;
- tabel i plannerów;
- bingo;
- scorecardów;
- etykiet prezentowych;
- kartek A5/A6;
- kuponów;
- kart przepisu;
- kart wspomnień/refleksji;
- tapet różniących się wyłącznie tekstem;
- papieru prezentowego o proceduralnym/powtarzalnym patternie;
- linii cięcia/zgięcia;
- finalnych PDF-ów;
- committed preview PNG/WebP;
- osobnych teł dla quizu, bingo, planera, przepisu itd.

### 13.3. Elementy craft

Unikalne konstrukcje nadal powstają w kodzie, np.:

```text
PaperVillageSvg
PaperReindeerSvg
OrigamiTreeSteps
StampShapes
EnvelopeCornerOrnaments
BookmarkOrnaments
GarlandShapes
ChristmasPatternSet
ComicBubbleShapes
```

Jeżeli projektant dostarczy wektor, można przechować źródłowy SVG w repo projektowym albo przepisać go do komponentu SVG/TSX. **Nie tworzymy z niego gotowego arkusza A4 jako source PDF/PNG.** Arkusz składa `DocumentKit`.

### 13.4. Test „czy dodać asset?”

Asset dodajemy tylko wtedy, gdy:
1. jest elementem brandu i musi wyglądać identycznie wszędzie;
2. jest bogatą teksturą/fotograficznym tłem, którego nie warto odtwarzać kodem;
3. jest naprawdę unikalną ilustracją, której utrzymywanie jako komponentu byłoby niepraktyczne.

Jeżeli różnica brzmi: „inna ramka”, „inny napis”, „inna liczba pól”, „inne kolory”, „inna tabela”, „inne rozmieszczenie elementów” — to jest **config/komponent**, nie nowy asset.

---

## 14. Wspólne serwisy, adaptery i completion rules

Warstwa biznesowa nie wywołuje bezpośrednio API przeglądarki ani natywnych Android API. Wspólne interfejsy są implementowane osobno przez WWW i RN.

```ts
interface FileService {
  saveFile(file: LocalFileRef, suggestedName: string): Promise<void>;
  openFile?(file: LocalFileRef): Promise<void>;
}

interface PdfExportService {
  requestPdf(args: {
    instanceId: string;
    day: number;
    variant?: 'COLOR' | 'INK_SAVER';
    locale?: string;
  }): Promise<LocalFileRef>;
}

interface ShareService {
  shareFile(file: LocalFileRef, message?: string): Promise<void>;
  copyText(text: string): Promise<void>;
}

interface UserMediaService {
  pickImage(): Promise<LocalImageRef | null>;
  cropImage(image: LocalImageRef, ratio: number): Promise<LocalImageRef>;
  resizeImage?(image: LocalImageRef, maxSide: number): Promise<LocalImageRef>;
}

interface ProgressService {
  load(taskId: string): Promise<SpecialWindowProgress | null>;
  save(progress: SpecialWindowProgress): Promise<void>;
  flushPending(): Promise<void>;
}

interface AmbientService {
  resolve(width: number, height: number): AmbientVariant;
  source(variant: AmbientVariant): string | number;
}
```

Nie implementować `AudioRecorderService`.

### 14.1. Completion rules

Każdy engine raportuje:

```ts
interface CompletionState {
  canComplete: boolean;
  reason?: string;
}
```

Minimalne reguły:
- `QuizEngine`: zakończona seria pytań;
- `ChecklistEngine`: zależnie od configu — minimum 1 krok, bingo line, wszystkie wymagane albo manual completion;
- `RandomizerTimerEngine`: wylosowana misja + manual „wykonane” albo zakończona runda;
- `CardFormEngine`: wymagane pola poprawnie zapisane;
- `DocumentEngine`: pobranie PDF **nie musi** być warunkiem ukończenia; aktywność może być wykonana poza aplikacją;
- `RecipeCardEngine`: manual „przepis wykonany”; nie zmuszamy do odhaczenia każdego kroku;
- `ScorecardEngine`: wszystkie wymagane próbki ocenione;
- `ImageCardEngine`: przygotowany wynik lub manual completion; zapis PNG nie musi być obowiązkowy;
- `SortableListEngine`: wymagana liczba pozycji ustawiona;
- `PlannerEngine`: minimum jedna pozycja;
- `MonthPlannerEngine`: minimum jeden wpis/plan zgodnie z configiem;
- `OptionConfiguratorEngine`: konfiguracja osiągnęła poprawny wynik;
- `TurnBasedGameEngine`: zakończona runda lub manual completion;
- `TemplatePersonalizerEngine`: wymagane pola personalizacji poprawne;
- `DateGate`: zapisanie i zamknięcie treści może oznaczać completion, niezależnie od późniejszego reveal.

### 14.2. Timer

Timer zapisuje `startedAt` / `endAt`, nie tylko licznik w pamięci. Po background/resume pozostały czas jest obliczany ponownie z zegara. Nie wymaga background service.

### 14.3. Offline

Po pierwszym poprawnym otwarciu dnia:
- descriptor i potrzebny content mogą być cache'owane;
- interakcja powinna działać offline w maksymalnym zakresie;
- progress trafia do kolejki pending sync;
- generowanie PDF wymaga sieci;
- future special metadata nie jest prefetchowane tylko dla offline.

---

## 15. WWW

### Flow

```text
kalendarz
 -> klik AVAILABLE
 -> openWindow
 -> standardowe zadanie
 -> reveal SPECIAL
 -> uruchom engine
 -> autosave
 -> preview/result
 -> [Pobierz PDF] -> API render
 -> completion
```

### UI

- komponenty mobile-first;
- brak hover-only interaction;
- drag & drop ma przyciski góra/dół;
- sticky CTA na małych ekranach;
- wszystkie formularze są prawdziwymi polami HTML;
- tło ambient jest dekoracją, nie zawiera tekstu ani pól.

---

## 16. React Native Android

- ten sam `special-core`, schema, content i design tokens;
- natywne komponenty UI;
- preview dokumentu przez RN renderer;
- `Pobierz PDF` wywołuje API, zapisuje plik do cache i otwiera systemowy share/save;
- bez szerokiego permission do pamięci;
- zdjęcia pozostają lokalne;
- crop lokalny;
- timer zapisuje `startedAt/endAt`, nie polega na samym `setInterval`;
- po pierwszym otwarciu special może działać offline w zakresie interakcji; generowanie PDF wymaga sieci.

### Gdy użytkownik offline kliknie PDF

Pokazać:

```text
„Do wygenerowania PDF potrzebne jest połączenie z internetem. Twoje dane są zapisane — spróbuj ponownie po połączeniu.”
```

Nie resetować progressu.

---

## 17. Progress i synchronizacja

```ts
interface SpecialWindowProgress {
  taskId: string;
  configId: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  payloadVersion: number;
  payload: Record<string, unknown>;
  startedAt?: string;
  completedAt?: string;
  updatedAt: string;
}
```

Zasady:

- debounce tekstu/checklist 500–1500 ms;
- finish/reveal/lock zapis natychmiast;
- limit payloadu;
- żadnych zdjęć base64 w progress;
- optimistic UI + pending sync;
- migracje `payloadVersion`.

---

## 18. DateGate

Dla `REF-01`, `MF-28`, opcjonalnie `REF-23`:

- `revealAt` zapisane serwerowo;
- czas API jest źródłem prawdy;
- prywatna treść nie wraca przed `revealAt`;
- brak prywatnej treści w analytics/logach;
- PDF prywatny generowany tylko w dozwolonym stanie.

---

## 19. Bezpieczeństwo eksportu

- entitlement sprawdzany serwerowo;
- export tylko dla otwartego dnia;
- klient nie wybiera dowolnej ścieżki assetu;
- klient nie może wskazać dowolnego komponentu z registry;
- sanitizacja tekstu użytkownika;
- limity długości pól;
- prywatne request body nie trafia do logów;
- brak path traversal;
- wersjonowanie `templateId + version`;
- darmowy kalendarz nie może wywołać premium exportu przez zmianę requestu.

---

## 20. Analityka

```text
special_window_revealed { taskId, engine }
special_window_started  { taskId, engine }
special_window_completed { taskId, engine }
special_export_requested { taskId, templateId, format: 'PDF' }
special_export_created   { taskId, templateId, format: 'PDF' }
special_share_opened     { taskId, format: 'PNG' | 'PDF' }
special_error            { taskId, engine, errorCode }
```

Nigdy nie wysyłać do analytics:

- treści listów;
- życzeń;
- imion;
- wspomnień;
- zdjęć;
- odpowiedzi prywatnych.

---

## 21. Accessibility

- pełna klawiatura na WWW;
- screen reader labels;
- brak znaczenia wyłącznie kolorem;
- kontrast na zieleni/złocie;
- `prefers-reduced-motion`;
- timer ma wartość tekstową;
- formularze mają error summary;
- PDF ma logiczną hierarchię tekstu, a nie jedną bitmapę;
- minimalny font eksportu ustalony i testowany dla długich polskich treści.

---

## 22. Error handling

| Sytuacja | Zachowanie |
|---|---|
| brak sieci przy open | retry, bez półotwartego UI |
| autosave fail | pending sync, dane lokalne zostają |
| PDF render fail | retry; completion nadal możliwy jeśli export opcjonalny |
| content invalid | fallback do zwykłej treści zadania |
| template invalid | `special_error`, bez crasha całego kalendarza |
| font/overflow fail | błąd renderera + monitoring; nie zwracać uszkodzonego PDF |
| zdjęcie za duże | local resize/crop |
| DateGate offline | poprosić o połączenie w celu potwierdzenia daty |

---

## 23. Testy

### Unit

- schema każdego special config;
- completion rules;
- scoring;
- deterministic randomization;
- date gate;
- progress migrations;
- `DocumentDefinition` validation;
- layout overflow;
- polskie znaki i font fallback;
- A4/A5/A6/A3 dimensions;
- `COLOR` vs `INK_SAVER`.
- `resolveAmbientVariant` dla granic 0.80 / 1.25;
- brak resetu engine'u przy zmianie wariantu ambientu;

### API integration

- brak metadata special przed open;
- idempotentne open;
- entitlement;
- progress;
- PDF tylko dla właściwego taska;
- klient nie może wymusić innego template;
- prywatne dokumenty bez public cache;
- niepersonalizowane dokumenty cache'ują się po wersji.

### E2E WWW + Android

- minimum jeden przypadek na engine;
- open -> reveal -> interaction -> autosave -> restart -> return -> complete;
- PDF generate/download/share;
- offline error dla PDF bez utraty stanu;
- lokalny image crop + PNG;
- brak badge przed open.

### Visual regression

Nie snapshotujemy PNG assetów. Snapshotujemy:

- UI komponenty;
- `DocumentDefinition`;
- kontrolne renderingi PDF z przykładowymi danymi.

---

## 24. Matryca 72 okienek specjalnych — szybki routing


W kolumnie `Asset task-specific` celowo wszędzie jest **brak**. Unikalny wygląd powstaje przez code template/document component. Globalne logo/tło nie jest powtarzane w każdym wpisie.

### Świąteczny nastrój i zabawa

| ID | Task ID | Okienko | Engine | Dokument / wynik | Content | Asset task-specific |
|---|---|---|---|---|---|---|
| `MF-05` | `set-1-task-5` | Bożonarodzeniowego Quizu | `QuizEngine` | `QuizResultDocument` — PDF + opcjonalny share PNG | `mood-fun/christmas-quiz` | **brak** |
| `MF-06` | `set-1-task-6` | Dorosłego Listu do Mikołaja | `CardFormEngine` | `FormCardDocument` — PDF | `config w pliku zestawu` | **brak** |
| `MF-07` | `set-1-task-7` | Świątecznego Bingo | `ChecklistEngine:bingo` | `BingoDocument` — PDF + opcjonalny share PNG | `mood-fun/christmas-bingo` | **brak** |
| `MF-09` | `set-1-task-9` | Domowej Wioski | `DocumentEngine` | `PaperVillageDocument` — PDF | `config w pliku zestawu` | **brak** |
| `MF-10` | `set-1-task-10` | Świątecznego Teatrzyku | `RandomizerTimerEngine` | `GamePromptDocument` — PDF opcjonalny | `mood-fun/christmas-theatre` | **brak** |
| `MF-11` | `set-1-task-11` | Świątecznej Ciekawostki | `RandomizerTimerEngine:deck` | `FactCardDocument` — PDF + opcjonalny share PNG | `mood-fun/christmas-trivia` | **brak** |
| `MF-15` | `set-1-task-15` | Polowania na Iluminacje | `ChecklistEngine:score` | `ScoreSummaryDocument` — PDF + opcjonalny share PNG | `mood-fun/illumination-hunt` | **brak** |
| `MF-17` | `set-1-task-17` | Fotograficznego Powrotu | `ImageCardEngine` | `—` — PNG lokalnie; PDF niepotrzebny | `config w pliku zestawu` | **brak** |
| `MF-19` | `set-1-task-19` | Świątecznego Alfabetu | `TurnBasedGameEngine` | `GameResultDocument` — PDF opcjonalny | `mood-fun/christmas-alphabet` | **brak** |
| `MF-21` | `set-1-task-21` | Tajnej Misji Elfa | `RandomizerTimerEngine` | `MissionResultDocument` — PDF opcjonalny | `mood-fun/secret-elf-missions` | **brak** |
| `MF-22` | `set-1-task-22` | Świątecznych Kalamburów | `RandomizerTimerEngine` | `GameResultDocument` — PDF opcjonalny | `mood-fun/christmas-charades` | **brak** |
| `MF-23` | `set-1-task-23` | Prezentowego Detektywa | `CardFormEngine+ScorecardEngine` | `DetectiveReportDocument` — PDF | `mood-fun/gift-detective` | **brak** |
| `MF-24` | `set-1-task-24` | Grudniowego Rankingu | `SortableListEngine` | `RankingDocument` — PDF + opcjonalny share PNG | `mood-fun/december-ranking` | **brak** |
| `MF-28` | `set-1-task-28` | Świątecznej Prognozy | `CardFormEngine+DateGateCapability` | `PredictionDocument` — PDF po reveal | `mood-fun/christmas-prediction` | **brak** |
| `MF-29` | `set-1-task-29` | Reniferowego Wyzwania | `RandomizerTimerEngine` | `BadgeResultDocument` — PDF opcjonalny | `mood-fun/reindeer-challenge` | **brak** |

### Porządki i przygotowania

| ID | Task ID | Okienko | Engine | Dokument / wynik | Content | Asset task-specific |
|---|---|---|---|---|---|---|
| `PP-01` | `set-2-task-1` | Świątecznej Stacji Pakowania | `ChecklistEngine+DocumentEngine` | `ChecklistDocument` — PDF | `preparations/packing-station` | **brak** |
| `PP-04` | `set-2-task-4` | Pudełka Awaryjnego | `ChecklistEngine` | `ChecklistDocument` — PDF | `preparations/emergency-box` | **brak** |
| `PP-05` | `set-2-task-5` | Listy Bez Paniki | `PlannerEngine` | `PlannerDocument` — PDF | `preparations/gift-planner` | **brak** |
| `PP-06` | `set-2-task-6` | Świątecznej Spiżarni | `ChecklistEngine` | `ChecklistDocument` — PDF | `preparations/pantry-checklist` | **brak** |
| `PP-09` | `set-2-task-9` | Papierowej Kontroli | `ChecklistEngine` | `InventoryDocument` — PDF opcjonalny | `preparations/wrapping-inventory` | **brak** |
| `PP-18` | `set-2-task-18` | Prezentowych Etykiet | `TemplatePersonalizerEngine+DocumentEngine` | `LabelsSheetDocument` — PDF | `config w pliku zestawu` | **brak** |
| `PP-19` | `set-2-task-19` | Grudniowego Kalendarza | `MonthPlannerEngine` | `MonthPlannerDocument` — PDF | `preparations/december-planner` | **brak** |
| `PP-20` | `set-2-task-20` | Świątecznego Menu | `PlannerEngine` | `PlannerDocument` — PDF | `preparations/christmas-menu` | **brak** |
| `PP-24` | `set-2-task-24` | Awaryjnej Listy Prezentów | `OptionConfiguratorEngine` | `SuggestionListDocument` — PDF opcjonalny | `preparations/emergency-gift-ideas` | **brak** |
| `PP-30` | `set-2-task-30` | Ostatniej Kontroli | `ChecklistEngine:audit` | `AuditDocument` — PDF opcjonalny | `preparations/final-audit` | **brak** |

### Dobre uczynki i życzliwość

| ID | Task ID | Okienko | Engine | Dokument / wynik | Content | Asset task-specific |
|---|---|---|---|---|---|---|
| `KIND-01` | `set-3-task-1` | Tajemniczego Elfa | `RandomizerTimerEngine` | `BadgeResultDocument` — PDF opcjonalny | `kindness/secret-elf-kindness-missions` | **brak** |
| `KIND-02` | `set-3-task-2` | Prawdziwego „Dziękuję” | `CardFormEngine` | `FormCardDocument` — PDF | `kindness/thank-you-card-prompts` | **brak** |
| `KIND-07` | `set-3-task-7` | Ręcznej Kartki | `TemplatePersonalizerEngine+DocumentEngine` | `GreetingCardDocument` — PDF | `config w pliku zestawu` | **brak** |
| `KIND-09` | `set-3-task-9` | Małej Paczuszki | `TemplatePersonalizerEngine` | `LabelsSheetDocument` — PDF | `config w pliku zestawu` | **brak** |
| `KIND-13` | `set-3-task-13` | Łańcucha Dobra | `CardFormEngine` | `FormCardDocument` — PDF opcjonalny | `kindness/pay-it-forward` | **brak** |
| `KIND-19` | `set-3-task-19` | Trzech Uśmiechów | `ChecklistEngine:steps` | `StepsSummaryDocument` — PDF opcjonalny | `kindness/three-smiles` | **brak** |
| `KIND-24` | `set-3-task-24` | Rodzinnych Wspomnień | `RandomizerTimerEngine:prompt-deck+DocumentEngine` | `PromptSheetDocument` — PDF | `kindness/family-memory-prompts` | **brak** |
| `KIND-27` | `set-3-task-27` | Życzeń Bez Kopiowania | `CardFormEngine` | `GreetingCardDocument` — PDF | `kindness/personal-wishes-prompts` | **brak** |

### Kreatywne i artystyczne

| ID | Task ID | Okienko | Engine | Dokument / wynik | Content | Asset task-specific |
|---|---|---|---|---|---|---|
| `CRE-02` | `set-4-task-2` | Własnego Papieru Prezentowego | `DocumentEngine` | `WrappingPatternDocument` — PDF A4/A3 | `config w pliku zestawu` | **brak** |
| `CRE-03` | `set-4-task-3` | Eleganckiej Etykietki | `TemplatePersonalizerEngine+DocumentEngine` | `LabelsSheetDocument` — PDF | `config w pliku zestawu` | **brak** |
| `CRE-04` | `set-4-task-4` | Świątecznej Pocztówki | `TemplatePersonalizerEngine` | `PostcardDocument` — PDF; PNG share opcjonalny | `config w pliku zestawu` | **brak** |
| `CRE-05` | `set-4-task-5` | Papierowej Wioski | `DocumentEngine` | `PaperVillageDocument` — PDF | `config w pliku zestawu` | **brak** |
| `CRE-06` | `set-4-task-6` | Masy Solnej | `DocumentEngine` | `SaltDoughGuideDocument` — PDF | `config w pliku zestawu` | **brak** |
| `CRE-07` | `set-4-task-7` | Świątecznego Stempla | `DocumentEngine` | `StampGuideDocument` — PDF | `config w pliku zestawu` | **brak** |
| `CRE-10` | `set-4-task-10` | Ozdobnej Koperty | `DocumentEngine` | `EnvelopeDecorGuideDocument` — PDF | `config w pliku zestawu` | **brak** |
| `CRE-11` | `set-4-task-11` | Świątecznej Zakładki | `DocumentEngine` | `BookmarksDocument` — PDF | `config w pliku zestawu` | **brak** |
| `CRE-13` | `set-4-task-13` | Papierowego Renifera | `DocumentEngine` | `PaperReindeerDocument` — PDF | `config w pliku zestawu` | **brak** |
| `CRE-16` | `set-4-task-16` | Origami | `DocumentEngine` | `OrigamiGuideDocument` — PDF | `config w pliku zestawu` | **brak** |
| `CRE-17` | `set-4-task-17` | Świątecznej Ramki | `ImageCardEngine` | `—` — PNG lokalnie; PDF niepotrzebny | `config w pliku zestawu` | **brak** |
| `CRE-20` | `set-4-task-20` | Świątecznego Komiksu | `TemplatePersonalizerEngine+DocumentEngine` | `ComicSheetDocument` — PDF | `config w pliku zestawu` | **brak** |
| `CRE-21` | `set-4-task-21` | Łańcucha Wspomnień | `DocumentEngine` | `MemoryChainDocument` — PDF | `config w pliku zestawu` | **brak** |
| `CRE-25` | `set-4-task-25` | Małej Girlandy | `DocumentEngine` | `GarlandDocument` — PDF | `config w pliku zestawu` | **brak** |
| `CRE-28` | `set-4-task-28` | Prezentu z Papieru | `TemplatePersonalizerEngine` | `CouponSheetDocument` — PDF | `config w pliku zestawu` | **brak** |

### Kuchenne i kulinarne

| ID | Task ID | Okienko | Engine | Dokument / wynik | Content | Asset task-specific |
|---|---|---|---|---|---|---|
| `CUL-02` | `set-5-task-2` | Czekoladowej Degustacji | `ScorecardEngine` | `ScorecardDocument` — PDF opcjonalny | `culinary/chocolate-tasting` | **brak** |
| `CUL-04` | `set-5-task-4` | Trufli Bez Pieczenia | `RecipeCardEngine` | `RecipeDocument` — PDF | `culinary/recipe-truffles` | **brak** |
| `CUL-05` | `set-5-task-5` | Piernikowego Testu | `ImageCardEngine+ScorecardEngine` | `—` — PNG lokalnie; PDF opcjonalny bez zdjęcia | `culinary/gingerbread-test` | **brak** |
| `CUL-06` | `set-5-task-6` | Świątecznej Deski | `OptionConfiguratorEngine` | `ConfiguredCardDocument` — PDF opcjonalny | `culinary/christmas-board-builder` | **brak** |
| `CUL-08` | `set-5-task-8` | Cynamonowych Ślimaczków | `RecipeCardEngine` | `RecipeDocument` — PDF | `culinary/recipe-cinnamon-rolls` | **brak** |
| `CUL-09` | `set-5-task-9` | Gorącej Czekolady na Bogato | `OptionConfiguratorEngine+RecipeCardEngine` | `RecipeDocument` — PDF | `culinary/hot-chocolate-builder` | **brak** |
| `CUL-15` | `set-5-task-15` | Karmelizowanych Orzechów | `RecipeCardEngine` | `RecipeDocument` — PDF | `culinary/recipe-caramelized-nuts` | **brak** |
| `CUL-17` | `set-5-task-17` | Świątecznego Koktajlu Bezalkoholowego | `OptionConfiguratorEngine` | `ConfiguredRecipeDocument` — PDF | `culinary/mocktail-builder` | **brak** |
| `CUL-20` | `set-5-task-20` | Małej Degustacji Herbat | `ScorecardEngine` | `ScorecardDocument` — PDF opcjonalny | `culinary/tea-tasting` | **brak** |
| `CUL-22` | `set-5-task-22` | Jadalnego Prezentu | `RecipeCardEngine+TemplatePersonalizerEngine` | `RecipeGiftLabelDocument` — PDF | `culinary/edible-gift` | **brak** |
| `CUL-24` | `set-5-task-24` | Ciasteczkowego Pojedynku | `ScorecardEngine` | `ScorecardDocument` — PDF opcjonalny | `culinary/cookie-duel` | **brak** |
| `CUL-27` | `set-5-task-27` | Kuchennej Pamiątki | `RecipeCardEngine+CardFormEngine` | `FamilyRecipeDocument` — PDF | `culinary/family-recipe` | **brak** |

### Refleksja i relaks

| ID | Task ID | Okienko | Engine | Dokument / wynik | Content | Asset task-specific |
|---|---|---|---|---|---|---|
| `REF-01` | `set-6-task-1` | Listu do Przyszłego Siebie | `CardFormEngine+DateGateCapability` | `PrivateLetterDocument` — PDF przed zamknięciem / po reveal | `reflection/future-self-letter` | **brak** |
| `REF-02` | `set-6-task-2` | Trzech Dobrych Scen | `CardFormEngine` | `MemoryCardDocument` — PDF | `reflection/three-good-scenes` | **brak** |
| `REF-03` | `set-6-task-3` | Roku w Sześciu Słowach | `CardFormEngine` | `TypographicCardDocument` — PDF + opcjonalny share PNG | `reflection/year-in-six-words` | **brak** |
| `REF-04` | `set-6-task-4` | Zdjęcia Roku | `ImageCardEngine` | `—` — PNG lokalnie; PDF niepotrzebny | `config w pliku zestawu` | **brak** |
| `REF-05` | `set-6-task-5` | Zimowego Spaceru Pięciu Zmysłów | `ChecklistEngine` | `ChecklistSummaryDocument` — PDF opcjonalny | `reflection/five-senses-walk` | **brak** |
| `REF-08` | `set-6-task-8` | Dobrych Ludzi | `CardFormEngine` | `GratitudeCardDocument` — PDF | `reflection/good-people` | **brak** |
| `REF-10` | `set-6-task-10` | Godziny Bez Powiadomień | `RandomizerTimerEngine:timer-only` | `—` — brak eksportu | `reflection/no-notifications-hour` | **brak** |
| `REF-11` | `set-6-task-11` | Dziesięciu Małych Radości | `CardFormEngine` | `MemoryListDocument` — PDF | `reflection/ten-small-joys` | **brak** |
| `REF-14` | `set-6-task-14` | Świątecznej Intencji | `CardFormEngine` | `—` — PNG 9:16 lokalnie — wyjątek semantyczny | `reflection/christmas-intention` | **brak** |
| `REF-18` | `set-6-task-18` | Własnej Tradycji | `CardFormEngine` | `TraditionCardDocument` — PDF | `reflection/our-tradition` | **brak** |
| `REF-23` | `set-6-task-23` | Małej Kapsuły Czasu | `CardFormEngine+DateGateCapability(optional)` | `TimeCapsuleDocument` — PDF | `reflection/time-capsule` | **brak** |
| `REF-30` | `set-6-task-30` | Grudniowego Domknięcia | `CardFormEngine` | `ClosureCardDocument` — PDF | `reflection/december-closure` | **brak** |


---

---

# 25. Szczegółowa specyfikacja wszystkich 72 okienek specjalnych

Każdy wpis poniżej jest wiążącą specyfikacją funkcjonalną. Opis zadania, cel i interakcja definiują zachowanie produktu; pola techniczne definiują routing do engine'u, contentu i dokumentu. W całej sekcji obowiązuje architektura code-first i `Asset task-specific = brak`.

## Świąteczny nastrój i zabawa

### MF-05 — Bożonarodzeniowego Quizu

> Dziś jest Dzień Bożonarodzeniowego Quizu — przygotuj pięć pytań o Bożym Narodzeniu i urządź domowy turniej. Niech jedno pytanie będzie podchwytliwe, a zwycięzca wybierze dzisiejszy świąteczny film albo deser.

- **Task ID:** `set-1-task-5`
- **Engine:** `QuizEngine`
- **Dodatek:** Gotowy Bożonarodzeniowy Quiz
- **Format UX:** Interaktywny quiz
- **Dokument / wynik:** `QuizResultDocument` — PDF + opcjonalny share PNG
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować bazę 12–20 pytań z 3 odpowiedziami, poprawną odpowiedzią i krótką ciekawostką. Na jedno otwarcie losować 7 pytań.
- **Interakcja:** Użytkownik odpowiada A/B/C, od razu widzi poprawność i ciekawostkę; pasek postępu 1/7; na końcu wynik.
- **Efekt końcowy:** Ekran wyniku „X/7 — poziom świątecznej wiedzy”, możliwość zapisania wyniku jako PNG i udostępnienia.
- **Content/config:** `mood-fun/christmas-quiz`
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API. Opcjonalny share PNG renderowany z dedykowanego komponentu eksportowego.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo. Opcjonalny share PNG renderowany do pliku tymczasowego.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `M` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] opcjonalny share PNG powstaje z dedykowanego renderera, nie z committed template PNG;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### MF-06 — Dorosłego Listu do Mikołaja

> Dziś jest Dzień Dorosłego Listu do Mikołaja — zapisz trzy rzeczy, których naprawdę sobie życzysz: jedną materialną, jedną związaną z przeżyciem lub doświadczeniem oraz jedną, której nie da się kupić.

- **Task ID:** `set-1-task-6`
- **Engine:** `CardFormEngine`
- **Dodatek:** List do Mikołaja dla dorosłych
- **Format UX:** Interaktywny formularz + eksport PDF
- **Dokument / wynik:** `FormCardDocument` — PDF
- **Content/config:** `config w pliku zestawu`
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; zaprojektować elegancką kartę z 3 polami: rzecz materialna, przeżycie/doświadczenie, rzecz której nie da się kupić. Dodać podpis/datę opcjonalnie.
- **Interakcja:** Użytkownik wpisuje odpowiedzi; podgląd karty aktualizuje się na żywo.
- **Efekt końcowy:** Pobranie eleganckiej karty jako PDF; opcjonalnie zapis w koncie.
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `M` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### MF-07 — Świątecznego Bingo

> Dziś jest Dzień Świątecznego Bingo — wypisz dziewięć rzeczy, które możesz zobaczyć podczas grudniowego spaceru, np. renifera, dużą gwiazdę, czerwony wieniec czy migające lampki. Spróbuj znaleźć tyle z nich, by skreślić cały rząd.

- **Task ID:** `set-1-task-7`
- **Engine:** `ChecklistEngine:bingo`
- **Dodatek:** Świąteczne Bingo 3×3
- **Format UX:** Interaktywna plansza bingo
- **Dokument / wynik:** `BingoDocument` — PDF + opcjonalny share PNG
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować pulę min. 30 pól (np. renifer, wieniec, gwiazda w oknie, Mikołaj, bałwan, czerwone lampki). Losować 9 bez powtórzeń.
- **Interakcja:** Kliknięcie pola oznacza je jako znalezione; postęp zapisywany automatycznie. Po zamknięciu rzędu animacja „BINGO!”.
- **Efekt końcowy:** Użytkownik może zapisać ukończoną planszę jako PNG albo zresetować i wylosować nową.
- **Content/config:** `mood-fun/christmas-bingo`
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API. Opcjonalny share PNG renderowany z dedykowanego komponentu eksportowego.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo. Opcjonalny share PNG renderowany do pliku tymczasowego.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `M` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] opcjonalny share PNG powstaje z dedykowanego renderera, nie z committed template PNG;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### MF-09 — Domowej Wioski

> Dziś jest Dzień Domowej Wioski — zbuduj miniaturową świąteczną scenkę z rzeczy, które już masz: pudełek, figurek, waty, klocków albo papieru. Wieczorem podświetl ją małą lampką lub lampkami LED.

- **Task ID:** `set-1-task-9`
- **Engine:** `DocumentEngine`
- **Dodatek:** Papierowa świąteczna wioska
- **Format UX:** PDF do druku
- **Dokument / wynik:** `PaperVillageDocument` — PDF
- **Content/config:** `config w pliku zestawu`
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; zaprojektować A4 PDF z 3 prostymi domkami: linie cięcia, linie zgięcia, okna, drzwi; wersja kolorowa i oszczędna czarno-biała.
- **Interakcja:** Podgląd generowany z definicji dokumentu + przycisk „Pobierz szablon”. Krótka instrukcja składania w 4 krokach.
- **Efekt końcowy:** Użytkownik drukuje, wycina i składa gotową dekorację.
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `M` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### MF-10 — Świątecznego Teatrzyku

> Dziś jest Dzień Świątecznego Teatrzyku — razem z domownikami wylosujcie trzy hasła, np. „Mikołaj”, „spóźniony renifer” i „zagubiony prezent”, a potem odegrajcie minutową scenkę bez wcześniejszego przygotowania.

- **Task ID:** `set-1-task-10`
- **Engine:** `RandomizerTimerEngine`
- **Dodatek:** Generator świątecznego teatrzyku
- **Format UX:** Losowanie 3 haseł + timer
- **Dokument / wynik:** `GamePromptDocument` — PDF opcjonalny
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować 3 pule po min. 20 elementów: postać, problem, przedmiot/miejsce.
- **Interakcja:** Klik „Losuj scenkę” pokazuje 3 hasła; przycisk start uruchamia 60 s; możliwość ponownego losowania.
- **Efekt końcowy:** Gotowa spontaniczna scenka bez wymyślania haseł przez użytkownika.
- **Content/config:** `mood-fun/christmas-theatre`
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `S` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### MF-11 — Świątecznej Ciekawostki

> Dziś jest Dzień Świątecznej Ciekawostki — znajdź jeden zaskakujący fakt o tradycjach bożonarodzeniowych w dowolnym kraju i opowiedz go komuś bliskiemu. Wybierz coś, co będzie nowością także dla Ciebie.

- **Task ID:** `set-1-task-11`
- **Engine:** `RandomizerTimerEngine:deck`
- **Dodatek:** Świąteczna ciekawostka dnia
- **Format UX:** Interaktywna karta ciekawostki
- **Dokument / wynik:** `FactCardDocument` — PDF + opcjonalny share PNG
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować 20–30 zweryfikowanych ciekawostek o tradycjach świątecznych z różnych krajów, każda 2–4 zdania.
- **Interakcja:** Klik „Losuj ciekawostkę”; możliwość odkrycia drugiej dopiero po oznaczeniu pierwszej jako przeczytanej.
- **Efekt końcowy:** Kartę można zapisać jako PNG lub udostępnić.
- **Content/config:** `mood-fun/christmas-trivia`
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API. Opcjonalny share PNG renderowany z dedykowanego komponentu eksportowego.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo. Opcjonalny share PNG renderowany do pliku tymczasowego.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `M` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] opcjonalny share PNG powstaje z dedykowanego renderera, nie z committed template PNG;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### MF-15 — Polowania na Iluminacje

> Dziś jest Dzień Polowania na Iluminacje — wybierz się po zmroku na 20-minutowy spacer i przyznawaj punkty mijanym dekoracjom: jeden za lampki, dwa za renifera i trzy za naprawdę efektownie udekorowany dom lub witrynę.

- **Task ID:** `set-1-task-15`
- **Engine:** `ChecklistEngine:score`
- **Dodatek:** Polowanie na iluminacje
- **Format UX:** Interaktywna karta punktowa
- **Dokument / wynik:** `ScoreSummaryDocument` — PDF + opcjonalny share PNG
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować 10–12 typów dekoracji z punktacją i 3 poziomy wyniku.
- **Interakcja:** Użytkownik odhacza napotkane dekoracje; punkty liczą się automatycznie.
- **Efekt końcowy:** Na końcu karta wyniku z tytułem np. „Łowca Świątecznych Świateł — 18 pkt”, do zapisania jako PNG.
- **Content/config:** `mood-fun/illumination-hunt`
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API. Opcjonalny share PNG renderowany z dedykowanego komponentu eksportowego.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo. Opcjonalny share PNG renderowany do pliku tymczasowego.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `S` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] opcjonalny share PNG powstaje z dedykowanego renderera, nie z committed template PNG;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### MF-17 — Fotograficznego Powrotu

> Dziś jest Dzień Fotograficznego Powrotu — znajdź stare grudniowe zdjęcie i spróbuj odtworzyć je dziś w podobnym miejscu lub w podobnej pozie. Na koniec zestaw oba ujęcia obok siebie.

- **Task ID:** `set-1-task-17`
- **Engine:** `ImageCardEngine`
- **Dodatek:** Fotograficzny powrót — przed i po
- **Format UX:** Generator kolażu zdjęć
- **Dokument / wynik:** `—` — PNG lokalnie; PDF niepotrzebny
- **Content/config:** `config w pliku zestawu`
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować szablon 2-polowy „Wtedy / Dziś” z datą i subtelnym brandingiem e‑Advent.
- **Interakcja:** Użytkownik dodaje stare i nowe zdjęcie, kadruje je i opcjonalnie wpisuje podpis.
- **Efekt końcowy:** Eksport gotowego kolażu jako PNG do galerii/udostępnienia.
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Zdjęcia są wybierane i kadrowane lokalnie; wynikowy PNG powstaje lokalnie.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Galeria/crop lokalnie; zdjęcia nie są wysyłane do API; wynikowy PNG powstaje lokalnie.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. Brak serwerowego PDF dla tego wyniku; brak obowiązkowego statycznego assetu task-specific.
- **Nakład wg specyfikacji produktu:** `L` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PNG ze zdjęciem/wynikiem powstaje lokalnie i nie wymaga task-specific template PNG;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### MF-19 — Świątecznego Alfabetu

> Dziś jest Dzień Świątecznego Alfabetu — zagraj z kimś bliskim: na zmianę wymieniajcie świąteczne słowa zaczynające się od kolejnych liter alfabetu. Osoba, która nie poda hasła w ciągu pięciu sekund, odpada z rundy.

- **Task ID:** `set-1-task-19`
- **Engine:** `TurnBasedGameEngine`
- **Dodatek:** Świąteczny alfabet
- **Format UX:** Interaktywna gra literowa
- **Dokument / wynik:** `GameResultDocument` — PDF opcjonalny
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować kolejkę liter (z możliwością pominięcia trudnych polskich liter), licznik czasu 5 s i punktację dla 2+ graczy.
- **Interakcja:** Start rundy pokazuje literę i odlicza 5 s; przyciski „zaliczone / brak odpowiedzi”; system przechodzi dalej.
- **Efekt końcowy:** Wynik rundy i możliwość rewanżu.
- **Content/config:** `mood-fun/christmas-alphabet`
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `M` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### MF-21 — Tajnej Misji Elfa

> Dziś jest Dzień Tajnej Misji Elfa — wybierz jednego domownika i w ciągu dnia zrób dla niego trzy drobne, miłe rzeczy tak, aby nie od razu było wiadomo, kto za nimi stoi.

- **Task ID:** `set-1-task-21`
- **Engine:** `RandomizerTimerEngine`
- **Dodatek:** Tajna misja elfa
- **Format UX:** Losowanie prywatnej misji
- **Dokument / wynik:** `MissionResultDocument` — PDF opcjonalny
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować 30 małych gestów dla domownika, podzielonych na łatwe/średnie.
- **Interakcja:** Użytkownik wybiera lub wpisuje imię domownika i losuje 3 sekretne misje. Postęp można odhaczać.
- **Efekt końcowy:** Po wykonaniu 3/3 pojawia się „Misja Elfa zakończona” i mała karta sukcesu.
- **Content/config:** `mood-fun/secret-elf-missions`
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `S` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### MF-22 — Świątecznych Kalamburów

> Dziś jest Dzień Świątecznych Kalamburów — przygotuj osiem haseł związanych ze świętami i urządź szybką rundę pokazywania bez słów. Tytuł „Kevin sam w domu” możesz potraktować jako poziom trudny.

- **Task ID:** `set-1-task-22`
- **Engine:** `RandomizerTimerEngine`
- **Dodatek:** Świąteczne kalambury
- **Format UX:** Losowanie haseł + timer
- **Dokument / wynik:** `GameResultDocument` — PDF opcjonalny
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować min. 80 haseł w 3 poziomach trudności, bez konieczności używania chronionych grafik.
- **Interakcja:** Użytkownik wybiera poziom, losuje hasło, uruchamia 60 s; „zaliczone/pomiń” zlicza punkty.
- **Efekt końcowy:** Wynik po 10 hasłach, możliwość nowej rundy.
- **Content/config:** `mood-fun/christmas-charades`
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `M` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### MF-23 — Prezentowego Detektywa

> Dziś jest Dzień Prezentowego Detektywa — wybierz zapakowany prezent albo zamknięte pudełko i razem z kimś spróbujcie odgadnąć jego zawartość wyłącznie po kształcie, wadze i dźwięku. Bez podglądania.

- **Task ID:** `set-1-task-23`
- **Engine:** `CardFormEngine+ScorecardEngine`
- **Dodatek:** Karta Prezentowego Detektywa
- **Format UX:** Interaktywna karta dedukcji + opcjonalny eksport PDF
- **Dokument / wynik:** `DetectiveReportDocument` — PDF
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować formularz z polami: „Co podpowiada kształt?”, „Co podpowiada waga?”, „Co słychać po delikatnym poruszeniu?”, trzy możliwe typy oraz jedno pole „Mój ostateczny strzał”. Dodać prostą punktację po ujawnieniu zawartości: 3 pkt za dokładne trafienie, 1 pkt za trafienie kategorii.
- **Interakcja:** Użytkownik zapisuje kolejne wskazówki bez podglądania prezentu, zatwierdza ostateczny typ, a po rozpakowaniu wybiera „Trafione / blisko / pudło”. Aplikacja pokazuje wynik detektywa.
- **Efekt końcowy:** Karta „Raport Prezentowego Detektywa” z wynikiem i zgadywaną odpowiedzią; możliwość zapisania jej jako PDF albo rozpoczęcia kolejnej rundy z innym prezentem.
- **Content/config:** `mood-fun/gift-detective`
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `M` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### MF-24 — Grudniowego Rankingu

> Dziś jest Dzień Grudniowego Rankingu — ułóż ranking pięciu ulubionych świątecznych filmów, potraw, piosenek albo tradycji. Porównaj go z rankingiem kogoś bliskiego i znajdź przynajmniej jedną wspólną pozycję.

- **Task ID:** `set-1-task-24`
- **Engine:** `SortableListEngine`
- **Dodatek:** Grudniowy ranking TOP 5
- **Format UX:** Interaktywne sortowanie + eksport
- **Dokument / wynik:** `RankingDocument` — PDF + opcjonalny share PNG
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować kategorie: filmy, potrawy, piosenki, tradycje + możliwość własnej.
- **Interakcja:** Użytkownik wpisuje 5 pozycji i przeciąga je w kolejności 1–5.
- **Efekt końcowy:** Eksport estetycznej karty „Moje świąteczne TOP 5” jako PNG.
- **Content/config:** `mood-fun/december-ranking`
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API. Opcjonalny share PNG renderowany z dedykowanego komponentu eksportowego.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo. Opcjonalny share PNG renderowany do pliku tymczasowego.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `M` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] opcjonalny share PNG powstaje z dedykowanego renderera, nie z committed template PNG;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### MF-28 — Świątecznej Prognozy

> Dziś jest Dzień Świątecznej Prognozy — razem z domownikami zapiszcie na osobnych kartkach po jednej zabawnej przepowiedni dotyczącej tegorocznych świąt. Otwórzcie je w Wigilię i sprawdźcie, czy któraś się spełniła.

- **Task ID:** `set-1-task-28`
- **Engine:** `CardFormEngine+DateGateCapability`
- **Dodatek:** Świąteczna prognoza
- **Format UX:** Karta przepowiedni z późniejszym odkryciem
- **Dokument / wynik:** `PredictionDocument` — PDF po reveal
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować formularz dla 1–6 osób: imię + przepowiednia. Możliwość ustawienia „nie pokazuj do 24 grudnia”.
- **Interakcja:** Wpisy są zapisywane i po zatwierdzeniu mogą zostać zasłonięte; 24.12 przycisk „Odkryj przepowiednie”.
- **Efekt końcowy:** Karta porównawcza do zapisania jako PDF po odkryciu.
- **Content/config:** `mood-fun/christmas-prediction`
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF. `DateGate` egzekwowany po stronie serwera według czasu API.
- **Nakład wg specyfikacji produktu:** `M` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] treść chroniona `DateGate` nie jest ujawniana przed `revealAt` według czasu API;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### MF-29 — Reniferowego Wyzwania

> Dziś jest Dzień Reniferowego Wyzwania — przez pięć minut komunikuj się z domownikami wyłącznie za pomocą gestów i zabawnych, świątecznych odgłosów. Zakończcie zabawę, gdy ktoś poprawnie odgadnie trzy komunikaty.

- **Task ID:** `set-1-task-29`
- **Engine:** `RandomizerTimerEngine`
- **Dodatek:** Reniferowe wyzwanie
- **Format UX:** Losowanie komunikatów + timer
- **Dokument / wynik:** `BadgeResultDocument` — PDF opcjonalny
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować 30 prostych komunikatów do przekazania gestem/dźwiękiem, np. „chcę kakao”, „Mikołaj zgubił worek”.
- **Interakcja:** Losuj komunikat → 60 s timera → zaliczone/pomiń.
- **Efekt końcowy:** Po 3 poprawnych komunikatach animacja sukcesu i odznaka „Reniferowy Tłumacz”.
- **Content/config:** `mood-fun/reindeer-challenge`
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `S` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

## Porządki i przygotowania

### PP-01 — Świątecznej Stacji Pakowania

> Dziś jest Dzień Świątecznej Stacji Pakowania — zbierz w jednym miejscu papier, taśmę, nożyczki, wstążki i etykiety. Dzięki temu przy kolejnym pakowaniu prezentów wszystko będzie pod ręką.

- **Task ID:** `set-2-task-1`
- **Engine:** `ChecklistEngine+DocumentEngine`
- **Dodatek:** Świąteczna stacja pakowania — checklista
- **Format UX:** Interaktywna checklista + PDF
- **Dokument / wynik:** `ChecklistDocument` — PDF
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować listę: papier, taśma, nożyczki, wstążki, etykiety, marker, torebki, pudełka; krótki schemat organizacji stacji.
- **Interakcja:** Użytkownik odhacza posiadane rzeczy; brakujące można oznaczyć „do kupienia”.
- **Efekt końcowy:** Pobranie listy zakupowej jako PDF/druk albo zachowanie checklisty w aplikacji.
- **Content/config:** `preparations/packing-station`
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `S` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### PP-04 — Pudełka Awaryjnego

> Dziś jest Dzień Pudełka Awaryjnego — przygotuj mały zestaw z taśmą, nożyczkami, bateriami, zapasowymi haczykami, sznurkiem i kilkoma torebkami prezentowymi. W grudniu taki zestaw potrafi uratować niejedną sytuację.

- **Task ID:** `set-2-task-4`
- **Engine:** `ChecklistEngine`
- **Dodatek:** Pudełko awaryjne — gotowa lista
- **Format UX:** Interaktywna checklista
- **Dokument / wynik:** `ChecklistDocument` — PDF
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować gotową listę awaryjną i sekcję „mam / brakuje”.
- **Interakcja:** Odhaczanie elementów; automatycznie tworzona lista braków.
- **Efekt końcowy:** Przycisk „Skopiuj listę zakupów” lub pobierz jako PDF.
- **Content/config:** `preparations/emergency-box`
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `S` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### PP-05 — Listy Bez Paniki

> Dziś jest Dzień Listy Bez Paniki — zapisz wszystkie osoby, dla których planujesz prezenty, a przy każdym imieniu dopisz jedną konkretną rzecz do zrobienia. Jeden prosty plan jest lepszy niż próba pamiętania o wszystkim naraz.

- **Task ID:** `set-2-task-5`
- **Engine:** `PlannerEngine`
- **Dodatek:** Planer prezentów
- **Format UX:** Interaktywny planer
- **Dokument / wynik:** `PlannerDocument` — PDF
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować tabelę: osoba, pomysł, budżet opcjonalny, kupione, zapakowane.
- **Interakcja:** Dodawanie osób, wpisywanie pomysłów, statusy kupione/zapakowane.
- **Efekt końcowy:** Plan zapisuje się automatycznie; możliwość eksportu do PDF. Dane prywatne — domyślnie nie udostępniać.
- **Content/config:** `preparations/gift-planner`
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `M` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### PP-06 — Świątecznej Spiżarni

> Dziś jest Dzień Świątecznej Spiżarni — sprawdź zapasy mąki, cukru, kakao, przypraw, bakalii i innych produktów, które zwykle przydają się w grudniu. Na listę zakupów dopisz tylko to, czego rzeczywiście brakuje.

- **Task ID:** `set-2-task-6`
- **Engine:** `ChecklistEngine`
- **Dodatek:** Świąteczna spiżarnia
- **Format UX:** Checklista zapasów
- **Dokument / wynik:** `ChecklistDocument` — PDF
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować kategorie: pieczenie, przyprawy, bakalie, napoje, inne; predefiniowane pozycje + własne.
- **Interakcja:** Użytkownik oznacza „mam/brakuje”; filtr „pokaż tylko braki”.
- **Efekt końcowy:** Skopiowanie listy braków do schowka albo wydruk/PDF.
- **Content/config:** `preparations/pantry-checklist`
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `S` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### PP-09 — Papierowej Kontroli

> Dziś jest Dzień Papierowej Kontroli — przejrzyj papier, torby i dodatki do pakowania prezentów. Zachowaj wstążki, pudełka i większe kawałki papieru, które można wykorzystać ponownie, a pozbądź się tylko tego, co naprawdę nieprzydatne.

- **Task ID:** `set-2-task-9`
- **Engine:** `ChecklistEngine`
- **Dodatek:** Inwentaryzacja materiałów do pakowania
- **Format UX:** Interaktywna lista stanu
- **Dokument / wynik:** `InventoryDocument` — PDF opcjonalny
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować pozycje z prostym statusem: dużo / mało / brak oraz wskazówką „wykorzystaj ponownie”.
- **Interakcja:** Użytkownik ocenia zapas materiałów.
- **Efekt końcowy:** Na końcu automatyczna mini lista „dokup tylko: …”.
- **Content/config:** `preparations/wrapping-inventory`
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `S` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### PP-18 — Prezentowych Etykiet

> Dziś jest Dzień Prezentowych Etykiet — przygotuj karteczki z imionami osób, które chcesz obdarować. Podczas pakowania unikniesz później zgadywania, które podobne pudełko jest dla kogo.

- **Task ID:** `set-2-task-18`
- **Engine:** `TemplatePersonalizerEngine+DocumentEngine`
- **Dodatek:** Prezentowe etykiety e‑Advent
- **Format UX:** PDF + prosty generator etykiet
- **Dokument / wynik:** `LabelsSheetDocument` — PDF
- **Content/config:** `config w pliku zestawu`
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; zaprojektować 2 arkusze A4 z 12–16 etykietami w stylu e‑Advent oraz wersję interaktywną z wpisaniem imienia.
- **Interakcja:** Użytkownik może pobrać pusty PDF lub wpisać imiona i wygenerować spersonalizowany arkusz.
- **Efekt końcowy:** Pobranie PDF gotowego do druku.
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `M` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### PP-19 — Grudniowego Kalendarza

> Dziś jest Dzień Grudniowego Kalendarza — wpisz w jedno miejsce ważne terminy: spotkania, dostawy, zakupy, szkolne wydarzenia i rodzinne plany. Zostaw przynajmniej jeden wieczór całkowicie wolny.

- **Task ID:** `set-2-task-19`
- **Engine:** `MonthPlannerEngine`
- **Dodatek:** Grudniowy planer
- **Format UX:** Interaktywny kalendarz 1–31 grudnia
- **Dokument / wynik:** `MonthPlannerDocument` — PDF
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować prosty widok grudnia z kategoriami: rodzina, zakupy, przesyłki, szkoła/praca, odpoczynek.
- **Interakcja:** Dodawanie krótkich wpisów do dni; specjalne oznaczenie przynajmniej jednego „wolnego wieczoru”.
- **Efekt końcowy:** Plan zapisany w aplikacji + opcjonalny eksport A4 PDF.
- **Content/config:** `preparations/december-planner`
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `M` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### PP-20 — Świątecznego Menu

> Dziś jest Dzień Świątecznego Menu — spisz potrawy, które naprawdę chcesz przygotować, i zaznacz te, które można zrobić wcześniej. Im mniej decyzji zostawisz na ostatnią chwilę, tym więcej czasu podczas świąt zostanie dla Ciebie.

- **Task ID:** `set-2-task-20`
- **Engine:** `PlannerEngine`
- **Dodatek:** Planer świątecznego menu
- **Format UX:** Interaktywny planer + lista zakupów
- **Dokument / wynik:** `PlannerDocument` — PDF
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować sekcje: potrawa, kiedy przygotować, składniki/braki, status.
- **Interakcja:** Użytkownik dodaje potrawy i oznacza „można zrobić wcześniej”.
- **Efekt końcowy:** Automatyczna lista potraw i harmonogram; eksport PDF.
- **Content/config:** `preparations/christmas-menu`
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `M` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### PP-24 — Awaryjnej Listy Prezentów

> Dziś jest Dzień Awaryjnej Listy Prezentów — zapisz trzy uniwersalne drobiazgi, które można szybko kupić lub przygotować. Taka lista przyda się, jeśli pojawi się niespodziewany gość albo przypomnisz sobie o kimś w ostatniej chwili.

- **Task ID:** `set-2-task-24`
- **Engine:** `OptionConfiguratorEngine`
- **Dodatek:** Awaryjne prezenty — gotowa baza pomysłów
- **Format UX:** Interaktywny selektor
- **Dokument / wynik:** `SuggestionListDocument` — PDF opcjonalny
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować 30 uniwersalnych pomysłów pogrupowanych wg budżetu i typu: jadalne, domowe, cyfrowe, doświadczenie.
- **Interakcja:** Użytkownik wybiera budżet i losuje/filtruje 3 propozycje; może zapisać wybrane.
- **Efekt końcowy:** Mini lista „awaryjne pomysły”, którą można skopiować do schowka.
- **Content/config:** `preparations/emergency-gift-ideas`
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `S` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### PP-30 — Ostatniej Kontroli

> Dziś jest Dzień Ostatniej Kontroli — przejdź po domu z jednym pytaniem: „Co w Wigilię mogłoby mnie najbardziej zirytować?” Wybierz tylko jeden problem, któremu możesz zapobiec, i zajmij się nim dziś.

- **Task ID:** `set-2-task-30`
- **Engine:** `ChecklistEngine:audit`
- **Dodatek:** Ostatnia kontrola przed świętami
- **Format UX:** Interaktywny audyt 10 pytań
- **Dokument / wynik:** `AuditDocument` — PDF opcjonalny
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować 10 krótkich pytań kontrolnych: prezenty, jedzenie, goście, baterie, transport, stół, odpoczynek itd.
- **Interakcja:** Użytkownik odpowiada Tak/Nie/Nie dotyczy; system pokazuje tylko punkty wymagające uwagi.
- **Efekt końcowy:** Końcowa lista maks. kilku spraw „Zajmij się tym teraz”, zapisywalna/skopiowalna.
- **Content/config:** `preparations/final-audit`
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `M` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

## Dobre uczynki i życzliwość

### KIND-01 — Tajemniczego Elfa

> Dziś jest Dzień Tajemniczego Elfa — zrób komuś drobną przysługę anonimowo i nie zdradzaj się do końca dnia. Może to być posprzątane miejsce, przygotowany napój albo mały upominek zostawiony z karteczką „dla Ciebie”.

- **Task ID:** `set-3-task-1`
- **Engine:** `RandomizerTimerEngine`
- **Dodatek:** Tajemniczy Elf — misja dobra
- **Format UX:** Losowanie misji
- **Dokument / wynik:** `BadgeResultDocument` — PDF opcjonalny
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować 40 anonimowych drobnych gestów bez wydawania pieniędzy lub za symboliczną kwotę.
- **Interakcja:** Użytkownik losuje jedną misję; może wylosować ponownie raz. Po wykonaniu klika „Misja wykonana”.
- **Efekt końcowy:** Odznaka „Tajemniczy Elf” i opcjonalna anonimowa karta sukcesu do PDF.
- **Content/config:** `kindness/secret-elf-kindness-missions`
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `S` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### KIND-02 — Prawdziwego „Dziękuję”

> Dziś jest Dzień Prawdziwego „Dziękuję” — wybierz jedną osobę i napisz jej, za co konkretnie chcesz podziękować. Zamiast ogólnego „dzięki za wszystko” przywołaj jedną sytuację, która naprawdę została Ci w pamięci.

- **Task ID:** `set-3-task-2`
- **Engine:** `CardFormEngine`
- **Dodatek:** Karta prawdziwego „Dziękuję”
- **Format UX:** Formularz + karta PDF
- **Dokument / wynik:** `FormCardDocument` — PDF
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; zaprojektować elegancki szablon: „Dziękuję Ci za…”, „Pamiętam, kiedy…”, podpis.
- **Interakcja:** Użytkownik wpisuje treść i widzi podgląd.
- **Efekt końcowy:** Pobranie PDF albo skopiowanie samego tekstu do wiadomości.
- **Content/config:** `kindness/thank-you-card-prompts`
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `M` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### KIND-07 — Ręcznej Kartki

> Dziś jest Dzień Ręcznej Kartki — przygotuj prostą kartkę świąteczną dla konkretnej osoby i dopisz kilka zdań własnymi słowami. Nie musi być idealna — ważne, żeby była osobista.

- **Task ID:** `set-3-task-7`
- **Engine:** `TemplatePersonalizerEngine+DocumentEngine`
- **Dodatek:** Świąteczna kartka e‑Advent
- **Format UX:** PDF do druku + wersja cyfrowa
- **Dokument / wynik:** `GreetingCardDocument` — PDF
- **Content/config:** `config w pliku zestawu`
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; zaprojektować 3 proste wzory kartki A6/A5 z miejscem na własny tekst.
- **Interakcja:** Wybór wzoru; opcjonalne wpisanie życzeń w przeglądarce.
- **Efekt końcowy:** Pobranie PDF do druku lub PDF do wysłania cyfrowo.
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `M` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### KIND-09 — Małej Paczuszki

> Dziś jest Dzień Małej Paczuszki — przygotuj drobiazg dla osoby, która raczej nie spodziewa się prezentu: kilka słodyczy, herbatę, mandarynkę albo domowe ciastko. Dodaj krótką, serdeczną karteczkę.

- **Task ID:** `set-3-task-9`
- **Engine:** `TemplatePersonalizerEngine`
- **Dodatek:** Etykietka do małej paczuszki
- **Format UX:** PDF etykiet
- **Dokument / wynik:** `LabelsSheetDocument` — PDF
- **Content/config:** `config w pliku zestawu`
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować arkusz małych etykiet z krótkimi hasłami „Dla Ciebie”, „Mała rzecz, dużo ciepła”, plus wersje puste.
- **Interakcja:** Użytkownik wybiera wzór i ewentualnie wpisuje imię.
- **Efekt końcowy:** Pobranie arkusza PDF lub pojedynczej etykiety PDF.
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `S` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### KIND-13 — Łańcucha Dobra

> Dziś jest Dzień Łańcucha Dobra — zrób dla kogoś coś miłego i poproś tylko o jedno: aby przy najbliższej okazji przekazać podobny gest dalej.

- **Task ID:** `set-3-task-13`
- **Engine:** `CardFormEngine`
- **Dodatek:** Łańcuch dobra
- **Format UX:** Interaktywna karta do przekazania dalej
- **Dokument / wynik:** `FormCardDocument` — PDF opcjonalny
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować kartę z instrukcją „Dostałeś gest dobra → zrób jeden dla kolejnej osoby”.
- **Interakcja:** Po wykonaniu użytkownik może wygenerować cyfrową kartę z własnym krótkim dopiskiem.
- **Efekt końcowy:** PDF/share link/kopiowanie tekstu — bez publicznego śledzenia osób.
- **Content/config:** `kindness/pay-it-forward`
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `S` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### KIND-19 — Trzech Uśmiechów

> Dziś jest Dzień Trzech Uśmiechów — spróbuj poprawić dziś humor trzem osobom: żartem, pomocą, komplementem albo małą niespodzianką. Każdy gest może być inny.

- **Task ID:** `set-3-task-19`
- **Engine:** `ChecklistEngine:steps`
- **Dodatek:** Trzy uśmiechy
- **Format UX:** Tracker 3 gestów
- **Dokument / wynik:** `StepsSummaryDocument` — PDF opcjonalny
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować trzy pola z możliwością wpisania krótkiej notatki „co zrobiłem/am” bez wymuszania form płciowych w UI, np. „Co udało Ci się zrobić?”.
- **Interakcja:** Po każdym geście użytkownik zaznacza jedno serce i opcjonalnie dopisuje notatkę.
- **Efekt końcowy:** 3/3 uruchamia delikatną animację; karta podsumowania może zostać zapisana prywatnie.
- **Content/config:** `kindness/three-smiles`
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `S` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### KIND-24 — Rodzinnych Wspomnień

> Dziś jest Dzień Rodzinnych Wspomnień — zadzwoń lub odwiedź starszą osobę w rodzinie i poproś o jedno świąteczne wspomnienie z dzieciństwa. Dziś to jej opowieść jest najważniejsza.

- **Task ID:** `set-3-task-24`
- **Engine:** `RandomizerTimerEngine:prompt-deck+DocumentEngine`
- **Dodatek:** Rodzinne wspomnienia — karta rozmowy
- **Format UX:** Interaktywne pytania + PDF
- **Dokument / wynik:** `PromptSheetDocument` — PDF
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować 12 pytań o dawne święta: potrawy, prezenty, choinka, zwyczaje, muzyka, dzieciństwo.
- **Interakcja:** Użytkownik losuje 3 pytania albo pobiera całą kartę rozmowy.
- **Efekt końcowy:** PDF A4 do rodzinnej rozmowy lub zapis 3 wylosowanych pytań na ekranie.
- **Content/config:** `kindness/family-memory-prompts`
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `S` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### KIND-27 — Życzeń Bez Kopiowania

> Dziś jest Dzień Życzeń Bez Kopiowania — napisz jednej osobie życzenia całkowicie własnymi słowami. Zamiast uniwersalnego „zdrowia i szczęścia” napisz, czego naprawdę jej życzysz w nadchodzącym roku.

- **Task ID:** `set-3-task-27`
- **Engine:** `CardFormEngine`
- **Dodatek:** Życzenia bez kopiowania
- **Format UX:** Kreator osobistych życzeń
- **Dokument / wynik:** `GreetingCardDocument` — PDF
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować 4 pola pomocnicze: za co cenisz osobę, czego jej życzysz, wspólne wspomnienie, jedno ciepłe zakończenie.
- **Interakcja:** Użytkownik odpowiada własnymi słowami; aplikacja składa odpowiedzi w elegancki układ, ale nie generuje za niego „gotowca”.
- **Efekt końcowy:** Kopiowanie tekstu lub eksport kartki PDF.
- **Content/config:** `kindness/personal-wishes-prompts`
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `M` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

## Kreatywne i artystyczne

### CRE-02 — Własnego Papieru Prezentowego

> Dziś jest Dzień Własnego Papieru Prezentowego — użyj zwykłego papieru i ozdób go powtarzalnym wzorem wykonanym flamastrem, stemplem albo końcówką gumki od ołówka. Nawet prosty motyw powtórzony wiele razy daje świetny efekt.

- **Task ID:** `set-4-task-2`
- **Engine:** `DocumentEngine`
- **Dodatek:** Własny papier prezentowy — wzory
- **Format UX:** PDF do druku
- **Dokument / wynik:** `WrappingPatternDocument` — PDF A4/A3
- **Content/config:** `config w pliku zestawu`
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; zaprojektować 4 arkusze A4/A3 z prostymi powtarzalnymi wzorami oraz 1 pustą kartę z siatką inspiracji do własnego stemplowania.
- **Interakcja:** Podgląd wzorów + wybór i pobranie.
- **Efekt końcowy:** PDF do druku lub inspiracja do ręcznego odtworzenia wzoru.
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `M` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### CRE-03 — Eleganckiej Etykietki

> Dziś jest Dzień Eleganckiej Etykietki — wytnij z grubszego papieru kilka prostych etykiet, zrób w nich otwory i przewlecz cienki sznurek. Jedną ozdób małą gałązką albo narysowaną gwiazdką.

- **Task ID:** `set-4-task-3`
- **Engine:** `TemplatePersonalizerEngine+DocumentEngine`
- **Dodatek:** Eleganckie etykiety prezentowe
- **Format UX:** PDF + personalizacja
- **Dokument / wynik:** `LabelsSheetDocument` — PDF
- **Content/config:** `config w pliku zestawu`
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; zaprojektować 12–16 etykiet w 3 stylach zgodnych z marką.
- **Interakcja:** Wybór stylu, wpisanie imienia/krótkiego „od…”, generowanie arkusza.
- **Efekt końcowy:** Pobranie PDF do druku.
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `M` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### CRE-04 — Świątecznej Pocztówki

> Dziś jest Dzień Świątecznej Pocztówki — stwórz kartkę inspirowaną miejscem, w którym mieszkasz. Dodaj charakterystyczny element miasta lub okolicy, ale pokaż go w zimowej, świątecznej wersji.

- **Task ID:** `set-4-task-4`
- **Engine:** `TemplatePersonalizerEngine`
- **Dodatek:** Świąteczna pocztówka z Twojego miejsca
- **Format UX:** Edytowalny szablon PNG/PDF
- **Dokument / wynik:** `PostcardDocument` — PDF; PNG share opcjonalny
- **Content/config:** `config w pliku zestawu`
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować ramkę pocztówki z pustym obszarem na rysunek/zdjęcie i polem na nazwę miejscowości.
- **Interakcja:** Użytkownik dodaje zdjęcie albo zostawia miejsce do ręcznego rysowania; wpisuje miejscowość.
- **Efekt końcowy:** Eksport PNG do wysłania lub PDF do druku.
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API. Opcjonalny share PNG renderowany z dedykowanego komponentu eksportowego.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo. Opcjonalny share PNG renderowany do pliku tymczasowego.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `L` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] opcjonalny share PNG powstaje z dedykowanego renderera, nie z committed template PNG;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### CRE-05 — Papierowej Wioski

> Dziś jest Dzień Papierowej Wioski — z papieru lub cienkiego kartonu wytnij trzy proste domki z okienkami. Ustaw je przed lampkami LED i zobacz, jak po zmroku zmieniają się w małe świąteczne miasteczko.

- **Task ID:** `set-4-task-5`
- **Engine:** `DocumentEngine`
- **Dodatek:** Papierowa wioska
- **Format UX:** PDF do druku
- **Dokument / wynik:** `PaperVillageDocument` — PDF
- **Content/config:** `config w pliku zestawu`
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować 3–5 domków, latarnię/choinkę jako bonus, linie cięcia i zgięcia.
- **Interakcja:** Pobranie kolorowego albo czarno-białego szablonu; instrukcja 4 kroków.
- **Efekt końcowy:** Gotowa przestrzenna dekoracja.
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `M` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### CRE-06 — Masy Solnej

> Dziś jest Dzień Masy Solnej — zrób jedną lub kilka prostych zawieszek, odciskając w masie gałązkę, koronkę albo wzór z foremki. Po wyschnięciu dodaj sznurek, aby można było je zawiesić.

- **Task ID:** `set-4-task-6`
- **Engine:** `DocumentEngine`
- **Dodatek:** Masa solna — wzory zawieszek
- **Format UX:** PDF instrukcja + szablony
- **Dokument / wynik:** `SaltDoughGuideDocument` — PDF
- **Content/config:** `config w pliku zestawu`
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować sprawdzony prosty przepis na masę solną, 6 kształtów i instrukcję suszenia/pieczenia z bezpiecznym zastrzeżeniem zależnym od grubości.
- **Interakcja:** Użytkownik wybiera kształt i pobiera kartę.
- **Efekt końcowy:** PDF A4, który można położyć obok podczas pracy.
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `S` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### CRE-07 — Świątecznego Stempla

> Dziś jest Dzień Świątecznego Stempla — przygotuj prosty stempel z ziemniaka, gąbki albo gumki i użyj go do ozdobienia papieru, koperty lub etykiet prezentowych. Najlepiej wybierz jeden łatwy do powtarzania motyw.

- **Task ID:** `set-4-task-7`
- **Engine:** `DocumentEngine`
- **Dodatek:** Świąteczne stemple — karta wzorów
- **Format UX:** PDF instrukcja
- **Dokument / wynik:** `StampGuideDocument` — PDF
- **Content/config:** `config w pliku zestawu`
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować 8 prostych wzorów: gwiazda, choinka, prezent, serce, śnieżynka itd., pokazanych jako kontur do przeniesienia na ziemniak/gąbkę.
- **Interakcja:** Wybór wzoru/pobranie jednego arkusza.
- **Efekt końcowy:** Gotowa pomoc do wykonania własnego stempla.
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `S` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### CRE-10 — Ozdobnej Koperty

> Dziś jest Dzień Ozdobnej Koperty — weź zwykłą kopertę i dodaj jeden charakterystyczny detal: ręcznie narysowaną ramkę, pieczątkę, naklejkę albo małą ilustrację w rogu. Czasem jeden motyw wystarczy, żeby całość wyglądała wyjątkowo.

- **Task ID:** `set-4-task-10`
- **Engine:** `DocumentEngine`
- **Dodatek:** Ozdobna koperta
- **Format UX:** PDF szablon ozdabiania
- **Dokument / wynik:** `EnvelopeDecorGuideDocument` — PDF
- **Content/config:** `config w pliku zestawu`
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować 4 warianty narożników/ramek i mini ikon do odrysowania lub wydrukowania.
- **Interakcja:** Użytkownik wybiera styl; może pobrać A4 z elementami lub pojedynczy PNG.
- **Efekt końcowy:** Gotowa baza do ozdobienia zwykłej koperty.
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `S` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### CRE-11 — Świątecznej Zakładki

> Dziś jest Dzień Świątecznej Zakładki — z kawałka grubszego papieru zrób zakładkę do książki i dodaj krótkie grudniowe hasło. Taki drobiazg powstaje w kilka minut, a może służyć przez cały rok.

- **Task ID:** `set-4-task-11`
- **Engine:** `DocumentEngine`
- **Dodatek:** Świąteczna zakładka
- **Format UX:** PDF do druku
- **Dokument / wynik:** `BookmarksDocument` — PDF
- **Content/config:** `config w pliku zestawu`
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; zaprojektować 6 zakładek na jednym arkuszu A4, w tym 2 z miejscem na własne hasło.
- **Interakcja:** Wybór/pobranie; opcjonalnie wpisanie hasła przed generowaniem.
- **Efekt końcowy:** PDF do wycięcia; użytkownik zachowuje fizyczny drobiazg.
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `M` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### CRE-13 — Papierowego Renifera

> Dziś jest Dzień Papierowego Renifera — z kartonu lub papieru zrób prostą sylwetkę renifera i dodaj czerwony nos. Gotową postać wykorzystaj jako dekorację, etykietę albo element kartki.

- **Task ID:** `set-4-task-13`
- **Engine:** `DocumentEngine`
- **Dodatek:** Papierowy renifer
- **Format UX:** PDF do wycięcia
- **Dokument / wynik:** `PaperReindeerDocument` — PDF
- **Content/config:** `config w pliku zestawu`
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować prosty szablon renifera w wersji płaskiej i opcjonalnie stojącej/składanej.
- **Interakcja:** Podgląd + PDF z liniami cięcia/zgięcia.
- **Efekt końcowy:** Gotowa dekoracja/etykieta po wycięciu.
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `M` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### CRE-16 — Origami

> Dziś jest Dzień Origami — z jednej kartki złóż prostą choinkę, gwiazdkę albo postać Mikołaja. Wybierz wzór, który można wykonać w mniej niż 15 minut.

- **Task ID:** `set-4-task-16`
- **Engine:** `DocumentEngine`
- **Dodatek:** Origami świąteczne
- **Format UX:** Instrukcja krok po kroku PDF + ekran
- **Dokument / wynik:** `OrigamiGuideDocument` — PDF
- **Content/config:** `config w pliku zestawu`
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować jeden naprawdę prosty model (np. choinka) z 6–10 ilustracjami kroków; opcjonalnie drugi trudniejszy.
- **Interakcja:** Użytkownik przechodzi krok po kroku na ekranie albo pobiera PDF.
- **Efekt końcowy:** Gotowe origami; możliwość zaznaczenia „ukończone”.
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `M` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### CRE-17 — Świątecznej Ramki

> Dziś jest Dzień Świątecznej Ramki — wybierz rodzinne zdjęcie i przygotuj dla niego papierową ramkę z datą oraz krótkim podpisem. Nie musi być perfekcyjna — ważne, żeby miała osobisty charakter.

- **Task ID:** `set-4-task-17`
- **Engine:** `ImageCardEngine`
- **Dodatek:** Świąteczna ramka na zdjęcie
- **Format UX:** Generator ramki
- **Dokument / wynik:** `—` — PNG lokalnie; PDF niepotrzebny
- **Content/config:** `config w pliku zestawu`
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować 3 ramki 1:1 i 4:5 z subtelnym brandingiem.
- **Interakcja:** Dodanie zdjęcia, kadrowanie, wybór ramki i wpisanie daty/podpisu.
- **Efekt końcowy:** Eksport PNG do galerii.
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Zdjęcia są wybierane i kadrowane lokalnie; wynikowy PNG powstaje lokalnie.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Galeria/crop lokalnie; zdjęcia nie są wysyłane do API; wynikowy PNG powstaje lokalnie.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. Brak serwerowego PDF dla tego wyniku; brak obowiązkowego statycznego assetu task-specific.
- **Nakład wg specyfikacji produktu:** `L` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PNG ze zdjęciem/wynikiem powstaje lokalnie i nie wymaga task-specific template PNG;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### CRE-20 — Świątecznego Komiksu

> Dziś jest Dzień Świątecznego Komiksu — narysuj cztery kadry pokazujące największy problem Świętego Mikołaja w tym roku. Nie przejmuj się poziomem rysunków — patyczaki są całkowicie dozwolone.

- **Task ID:** `set-4-task-20`
- **Engine:** `TemplatePersonalizerEngine+DocumentEngine`
- **Dodatek:** Świąteczny komiks — 4 kadry
- **Format UX:** PDF + edytowalna karta
- **Dokument / wynik:** `ComicSheetDocument` — PDF
- **Content/config:** `config w pliku zestawu`
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować kartę z 4 kadrami, miejscem na tytuł i dymki; wariant czysty do druku.
- **Interakcja:** Użytkownik może pobrać PDF lub wpisać teksty w dymkach online.
- **Efekt końcowy:** PDF do rysowania albo PDF z cyfrowymi podpisami.
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `M` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### CRE-21 — Łańcucha Wspomnień

> Dziś jest Dzień Łańcucha Wspomnień — przygotuj kilka papierowych pasków i na każdym zapisz jedno dobre wspomnienie z mijającego roku. Połącz paski w mały łańcuch i zachowaj go do Wigilii.

- **Task ID:** `set-4-task-21`
- **Engine:** `DocumentEngine`
- **Dodatek:** Łańcuch wspomnień
- **Format UX:** PDF pasków do wycięcia
- **Dokument / wynik:** `MemoryChainDocument` — PDF
- **Content/config:** `config w pliku zestawu`
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować 12–24 paski w 2 stylach, każdy z miejscem na jedno wspomnienie.
- **Interakcja:** Pobranie arkusza; opcjonalnie wpisanie wspomnień przed drukiem.
- **Efekt końcowy:** Fizyczny papierowy łańcuch wspomnień.
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `S` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### CRE-25 — Małej Girlandy

> Dziś jest Dzień Małej Girlandy — przygotuj krótką girlandę z pięciu papierowych elementów: gwiazd, chorągiewek albo choinek. Zawieś ją w jednym wybranym miejscu zamiast dekorować cały pokój.

- **Task ID:** `set-4-task-25`
- **Engine:** `DocumentEngine`
- **Dodatek:** Mała girlanda
- **Format UX:** PDF do wycięcia
- **Dokument / wynik:** `GarlandDocument` — PDF
- **Content/config:** `config w pliku zestawu`
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować zestaw gwiazd/choinek/chorągiewek z otworami zaznaczonymi do przewleczenia sznurka.
- **Interakcja:** Wybór jednego z 3 motywów i pobranie A4.
- **Efekt końcowy:** Gotowa krótka girlanda po wycięciu.
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `S` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### CRE-28 — Prezentu z Papieru

> Dziś jest Dzień Prezentu z Papieru — przygotuj dla kogoś drobiazg bez kupowania dodatkowych materiałów: kupon na wspólną kawę, małą książeczkę wspomnień albo listę pięciu rzeczy, które cenisz w tej osobie.

- **Task ID:** `set-4-task-28`
- **Engine:** `TemplatePersonalizerEngine`
- **Dodatek:** Prezent z papieru — kupony
- **Format UX:** Generator kuponów + PDF
- **Dokument / wynik:** `CouponSheetDocument` — PDF
- **Content/config:** `config w pliku zestawu`
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować gotowe typy: wspólna kawa, spacer, film, śniadanie, pomoc, dzień bez obowiązku + opcja własnego kuponu.
- **Interakcja:** Użytkownik wybiera kupon, wpisuje dla kogo/od kogo i opcjonalnie datę.
- **Efekt końcowy:** Pobranie pojedynczego PDF albo arkusza PDF z kuponami.
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `M` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

## Kuchenne i kulinarne

### CUL-02 — Czekoladowej Degustacji

> Dziś jest Dzień Czekoladowej Degustacji — wybierz trzy różne czekolady, połam je na małe kawałki i spróbuj w ciemno. Oceń każdą pod względem zapachu, smaku i tego, jak bardzo kojarzy Ci się ze świętami.

- **Task ID:** `set-5-task-2`
- **Engine:** `ScorecardEngine`
- **Dodatek:** Czekoladowa degustacja
- **Format UX:** Interaktywna karta ocen
- **Dokument / wynik:** `ScorecardDocument` — PDF opcjonalny
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować 3 kolumny próbek i skale 1–5: zapach, smak, „świąteczność”; pole na nazwę odkrywaną po teście.
- **Interakcja:** Użytkownik ocenia próbki, potem odsłania nazwy.
- **Efekt końcowy:** Karta zwycięzcy „Czekolada wieczoru” jako PDF.
- **Content/config:** `culinary/chocolate-tasting`
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `S` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### CUL-04 — Trufli Bez Pieczenia

> Dziś jest Dzień Trufli Bez Pieczenia — pokrusz herbatniki, połącz je z serkiem lub masą czekoladową i uformuj niewielkie kulki. Obtocz je w kakao, wiórkach kokosowych albo posiekanych orzechach.

- **Task ID:** `set-5-task-4`
- **Engine:** `RecipeCardEngine`
- **Dodatek:** Trufle bez pieczenia
- **Format UX:** Karta przepisu + PDF
- **Dokument / wynik:** `RecipeDocument` — PDF
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować dokładny, przetestowany przepis z gramaturami, liczbą porcji, czasem i wariantami obtoczenia.
- **Interakcja:** Tryb krok po kroku z checkboxami; opcja „nie wygaszaj ekranu” jeśli technicznie możliwe.
- **Efekt końcowy:** Pobranie/druk przepisu PDF; możliwość zapisania jako ulubiony.
- **Content/config:** `culinary/recipe-truffles`
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `M` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### CUL-05 — Piernikowego Testu

> Dziś jest Dzień Piernikowego Testu — udekoruj trzy pierniki w trzech różnych stylach: eleganckim, zabawnym i celowo przesadzonym. Przed zjedzeniem ustaw je obok siebie i zrób pamiątkowe zdjęcie.

- **Task ID:** `set-5-task-5`
- **Engine:** `ImageCardEngine+ScorecardEngine`
- **Dodatek:** Piernikowy test dekoracji
- **Format UX:** Karta wyzwania + zdjęcie
- **Dokument / wynik:** `—` — PNG lokalnie; PDF opcjonalny bez zdjęcia
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować 3 style z mini inspiracją: elegancki, zabawny, przesadzony.
- **Interakcja:** Użytkownik odhacza 3 ukończone pierniki i może dodać jedno zdjęcie wszystkich.
- **Efekt końcowy:** Eksport ramki „Piernikowy test 2026” z własnym zdjęciem jako PNG.
- **Content/config:** `culinary/gingerbread-test`
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Zdjęcia są wybierane i kadrowane lokalnie; wynikowy PNG powstaje lokalnie.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Galeria/crop lokalnie; zdjęcia nie są wysyłane do API; wynikowy PNG powstaje lokalnie.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `M` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] PNG ze zdjęciem/wynikiem powstaje lokalnie i nie wymaga task-specific template PNG;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### CUL-06 — Świątecznej Deski

> Dziś jest Dzień Świątecznej Deski — ułóż na jednym talerzu kilka przekąsek w czerwieni, zieleni i złocie: owoce, sery, orzechy, krakersy albo słodycze. Dziś liczy się przede wszystkim kompozycja.

- **Task ID:** `set-5-task-6`
- **Engine:** `OptionConfiguratorEngine`
- **Dodatek:** Świąteczna deska
- **Format UX:** Interaktywny kreator kompozycji
- **Dokument / wynik:** `ConfiguredCardDocument` — PDF opcjonalny
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować listę propozycji wg kolorów: czerwone, zielone, złote/jasne; bez narzucania konkretnych marek.
- **Interakcja:** Użytkownik wybiera 2–3 elementy z każdej grupy i dostaje własną listę zakupów/składników.
- **Efekt końcowy:** Skopiowanie listy albo zapis małej karty kompozycji.
- **Content/config:** `culinary/christmas-board-builder`
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `S` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### CUL-08 — Cynamonowych Ślimaczków

> Dziś jest Dzień Cynamonowych Ślimaczków — wykorzystaj gotowe ciasto francuskie: posmaruj je masłem, posyp cukrem i cynamonem, zwiń w rulon, pokrój na kawałki i upiecz małe ślimaczki.

- **Task ID:** `set-5-task-8`
- **Engine:** `RecipeCardEngine`
- **Dodatek:** Cynamonowe ślimaczki
- **Format UX:** Karta przepisu + PDF
- **Dokument / wynik:** `RecipeDocument` — PDF
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować konkretny przepis z gotowego ciasta francuskiego: ilości, temperatura, orientacyjny czas, zdjęciowy/rysunkowy schemat zwijania.
- **Interakcja:** Tryb krok po kroku.
- **Efekt końcowy:** PDF przepisu + oznaczenie jako ulubiony.
- **Content/config:** `culinary/recipe-cinnamon-rolls`
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `M` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### CUL-09 — Gorącej Czekolady na Bogato

> Dziś jest Dzień Gorącej Czekolady na Bogato — przygotuj kakao albo gorącą czekoladę i dodaj jeden kawiarniany akcent: piankę mleczną, bitą śmietanę, startą czekoladę lub szczyptę cynamonu.

- **Task ID:** `set-5-task-9`
- **Engine:** `OptionConfiguratorEngine+RecipeCardEngine`
- **Dodatek:** Gorąca czekolada na bogato
- **Format UX:** Kreator wersji + przepis
- **Dokument / wynik:** `RecipeDocument` — PDF
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować bazowy przepis i dodatki w kategoriach: kremowe, korzenne, chrupiące.
- **Interakcja:** Użytkownik wybiera bazę + 2 dodatki; aplikacja pokazuje gotową wersję i nazwę.
- **Efekt końcowy:** Karta własnej gorącej czekolady do PDF z recepturą.
- **Content/config:** `culinary/hot-chocolate-builder`
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `M` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### CUL-15 — Karmelizowanych Orzechów

> Dziś jest Dzień Karmelizowanych Orzechów — podgrzej na patelni garść orzechów z odrobiną cukru, cynamonu i szczyptą soli. Po ostygnięciu przełóż je do małej miseczki i podaj jak przekąskę z jarmarku.

- **Task ID:** `set-5-task-15`
- **Engine:** `RecipeCardEngine`
- **Dodatek:** Karmelizowane orzechy
- **Format UX:** Karta przepisu + PDF
- **Dokument / wynik:** `RecipeDocument` — PDF
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować przetestowane proporcje i ważne wskazówki bezpieczeństwa przy gorącym karmelu/cukrze.
- **Interakcja:** Krok po kroku; checkboxy etapów.
- **Efekt końcowy:** PDF przepisu / ulubione.
- **Content/config:** `culinary/recipe-caramelized-nuts`
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `M` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### CUL-17 — Świątecznego Koktajlu Bezalkoholowego

> Dziś jest Dzień Świątecznego Koktajlu Bezalkoholowego — połącz sok jabłkowy lub żurawinowy z wodą gazowaną i plastrem cytrusa. Podaj napój w ładnej szklance lub kieliszku i nadaj mu własną świąteczną nazwę.

- **Task ID:** `set-5-task-17`
- **Engine:** `OptionConfiguratorEngine`
- **Dodatek:** Świąteczny koktajl bezalkoholowy
- **Format UX:** Kreator napoju
- **Dokument / wynik:** `ConfiguredRecipeDocument` — PDF
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować 3 bazy, 5 dodatków i 4 dekoracje; wszystkie bezalkoholowe.
- **Interakcja:** Użytkownik wybiera elementy; aplikacja tworzy proporcje dla 1 szklanki i nazwę do samodzielnej edycji.
- **Efekt końcowy:** Eksport karty koktajlu jako PDF albo zapis przepisu.
- **Content/config:** `culinary/mocktail-builder`
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `M` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### CUL-20 — Małej Degustacji Herbat

> Dziś jest Dzień Małej Degustacji Herbat — zaparz dwie różne herbaty i spróbuj ich bez pośpiechu. Do jednej dodaj plaster cytrusa, do drugiej wybraną przyprawę, a potem zdecyduj, która zostaje „herbatą tych świąt”.

- **Task ID:** `set-5-task-20`
- **Engine:** `ScorecardEngine`
- **Dodatek:** Mała degustacja herbat
- **Format UX:** Karta porównawcza
- **Dokument / wynik:** `ScorecardDocument` — PDF opcjonalny
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować ocenę: aromat, smak, rozgrzewanie, „świąteczność” + dodatki.
- **Interakcja:** Użytkownik porównuje herbatę A i B, przyznaje punkty.
- **Efekt końcowy:** Karta „Herbata tych świąt” z wynikiem, do PDF.
- **Content/config:** `culinary/tea-tasting`
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `S` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### CUL-22 — Jadalnego Prezentu

> Dziś jest Dzień Jadalnego Prezentu — przygotuj mały słoiczek lub woreczek z domową mieszanką: orzechami, ciasteczkami albo porcją składników do kakao. Dodaj ręcznie napisaną etykietę.

- **Task ID:** `set-5-task-22`
- **Engine:** `RecipeCardEngine+TemplatePersonalizerEngine`
- **Dodatek:** Jadalny prezent
- **Format UX:** Etykieta + karta przepisu
- **Dokument / wynik:** `RecipeGiftLabelDocument` — PDF
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować 3 proste pomysły na mieszankę do słoika/woreczka oraz 6 etykiet do druku.
- **Interakcja:** Użytkownik wybiera pomysł, podaje liczbę porcji i wybiera etykietę.
- **Efekt końcowy:** PDF przepisu/instrukcji + spersonalizowana etykieta PDF.
- **Content/config:** `culinary/edible-gift`
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `M` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### CUL-24 — Ciasteczkowego Pojedynku

> Dziś jest Dzień Ciasteczkowego Pojedynku — wybierz dwa rodzaje ciastek lub pierników i zrób degustację w ciemno. Zwycięski smak otrzymuje tytuł „Oficjalnego Smaku Grudnia”.

- **Task ID:** `set-5-task-24`
- **Engine:** `ScorecardEngine`
- **Dodatek:** Ciasteczkowy pojedynek
- **Format UX:** Interaktywna karta degustacji
- **Dokument / wynik:** `ScorecardDocument` — PDF opcjonalny
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować ocenę dwóch próbek: wygląd, chrupkość/tekstura, smak, świąteczność.
- **Interakcja:** Użytkownik ocenia A i B bez nazw, potem odsłania i zatwierdza zwycięzcę.
- **Efekt końcowy:** Odznaka/karta „Oficjalny Smak Grudnia” jako PDF.
- **Content/config:** `culinary/cookie-duel`
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `S` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### CUL-27 — Kuchennej Pamiątki

> Dziś jest Dzień Kuchennej Pamiątki — przygotuj potrawę kojarzącą Ci się z dzieciństwem albo poproś bliską osobę o rodzinny przepis. Zapisz choć przybliżone proporcje, zanim kolejny raz usłyszysz, że wszystkiego dodaje się po prostu „na oko”.

- **Task ID:** `set-5-task-27`
- **Engine:** `RecipeCardEngine+CardFormEngine`
- **Dodatek:** Kuchenna pamiątka — rodzinny przepis
- **Format UX:** Formularz archiwizacji przepisu + PDF
- **Dokument / wynik:** `FamilyRecipeDocument` — PDF
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować pola: nazwa, od kogo pochodzi, składniki, sposób przygotowania, „sekret rodzinny”, wspomnienie.
- **Interakcja:** Użytkownik wpisuje przepis i historię; podgląd stylizowanej karty.
- **Efekt końcowy:** Eksport rodzinnej karty przepisu jako PDF, gotowej do zachowania.
- **Content/config:** `culinary/family-recipe`
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `M` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

## Refleksja i relaks

### REF-01 — Listu do Przyszłego Siebie

> Dziś jest Dzień Listu do Przyszłego Siebie — napisz pół strony do siebie i schowaj ją do przyszłego grudnia. Zapisz, czego dziś pragniesz, co zaprząta Ci głowę i jaką wiadomość chcesz przekazać sobie na kolejne święta.

- **Task ID:** `set-6-task-1`
- **Engine:** `CardFormEngine+DateGateCapability`
- **Dodatek:** List do przyszłego siebie
- **Format UX:** Prywatny formularz + blokada daty
- **Dokument / wynik:** `PrivateLetterDocument` — PDF przed zamknięciem / po reveal
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować edytor listu z datą otwarcia domyślnie 1 grudnia kolejnego roku.
- **Interakcja:** Użytkownik pisze list, zatwierdza i opcjonalnie „zamyka”; treść po zamknięciu jest ukryta do wybranej daty.
- **Efekt końcowy:** Zapis w koncie lub lokalnie; dodatkowo możliwość pobrania zaszyfrowanego/normalnego PDF przed zamknięciem.
- **Content/config:** `reflection/future-self-letter`
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF. `DateGate` egzekwowany po stronie serwera według czasu API.
- **Nakład wg specyfikacji produktu:** `L` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] treść chroniona `DateGate` nie jest ujawniana przed `revealAt` według czasu API;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### REF-02 — Trzech Dobrych Scen

> Dziś jest Dzień Trzech Dobrych Scen — zapisz trzy konkretne chwile z mijającego roku, do których chcesz kiedyś wrócić pamięcią. Zamiast całych wydarzeń opisz po jednej scenie: miejsce, ludzi, zapach albo zdanie, które zostało w głowie.

- **Task ID:** `set-6-task-2`
- **Engine:** `CardFormEngine`
- **Dodatek:** Trzy dobre sceny
- **Format UX:** Interaktywna karta wspomnień
- **Dokument / wynik:** `MemoryCardDocument` — PDF
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować 3 sekcje: gdzie, z kim, szczegół który pamiętasz.
- **Interakcja:** Użytkownik wypełnia po jednej scenie; karta pokazuje się jako trzy krótkie „kadry tekstowe”.
- **Efekt końcowy:** Eksport PDF do prywatnego zachowania.
- **Content/config:** `reflection/three-good-scenes`
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `M` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### REF-03 — Roku w Sześciu Słowach

> Dziś jest Dzień Roku w Sześciu Słowach — spróbuj opisać mijający rok dokładnie sześcioma słowami. Potem dodaj siódme — takie, które chcesz zabrać ze sobą w nowy rok.

- **Task ID:** `set-6-task-3`
- **Engine:** `CardFormEngine`
- **Dodatek:** Rok w sześciu słowach
- **Format UX:** Karta 6 słów + eksport
- **Dokument / wynik:** `TypographicCardDocument` — PDF + opcjonalny share PNG
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować sześć pól i osobne pole „słowo na kolejny rok”.
- **Interakcja:** Po wpisaniu słów powstaje typograficzna karta.
- **Efekt końcowy:** Eksport PNG, idealny do galerii/udostępnienia.
- **Content/config:** `reflection/year-in-six-words`
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API. Opcjonalny share PNG renderowany z dedykowanego komponentu eksportowego.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo. Opcjonalny share PNG renderowany do pliku tymczasowego.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `S` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] opcjonalny share PNG powstaje z dedykowanego renderera, nie z committed template PNG;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### REF-04 — Zdjęcia Roku

> Dziś jest Dzień Zdjęcia Roku — przejrzyj galerię i wybierz jedno zdjęcie, które najlepiej opowiada historię Twojego roku. Dopisz do niego krótki podpis tylko dla siebie i nie publikuj go nigdzie.

- **Task ID:** `set-6-task-4`
- **Engine:** `ImageCardEngine`
- **Dodatek:** Zdjęcie roku
- **Format UX:** Generator karty zdjęciowej
- **Dokument / wynik:** `—` — PNG lokalnie; PDF niepotrzebny
- **Content/config:** `config w pliku zestawu`
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować szablon zdjęcie + krótki prywatny podpis + rok.
- **Interakcja:** Użytkownik dodaje zdjęcie, kadruje i wpisuje podpis.
- **Efekt końcowy:** Eksport PNG; opcja „zapisz tylko dla mnie” bez przycisku społecznościowego na pierwszym planie.
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Zdjęcia są wybierane i kadrowane lokalnie; wynikowy PNG powstaje lokalnie.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Galeria/crop lokalnie; zdjęcia nie są wysyłane do API; wynikowy PNG powstaje lokalnie.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. Brak serwerowego PDF dla tego wyniku; brak obowiązkowego statycznego assetu task-specific.
- **Nakład wg specyfikacji produktu:** `L` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PNG ze zdjęciem/wynikiem powstaje lokalnie i nie wymaga task-specific template PNG;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### REF-05 — Zimowego Spaceru Pięciu Zmysłów

> Dziś jest Dzień Zimowego Spaceru Pięciu Zmysłów — podczas krótkiego spaceru świadomie uruchom wszystkie zmysły: wypatrz jeden szczegół, wsłuchaj się w jeden dźwięk, rozpoznaj jeden zapach i dotknij powierzchni o ciekawej fakturze. Po powrocie zwróć jeszcze uwagę na smak pierwszego łyku ciepłego napoju.

- **Task ID:** `set-6-task-5`
- **Engine:** `ChecklistEngine`
- **Dodatek:** Spacer pięciu zmysłów
- **Format UX:** Interaktywna checklista
- **Dokument / wynik:** `ChecklistSummaryDocument` — PDF opcjonalny
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować 5 pól: wzrok, słuch, węch, dotyk, smak po powrocie; krótkie przykłady bez narzucania odpowiedzi.
- **Interakcja:** Użytkownik odhacza kolejne zmysły podczas spaceru.
- **Efekt końcowy:** Po 5/5 pojawia się spokojna karta „Zauważone dziś” z możliwością wpisania jednego słowa.
- **Content/config:** `reflection/five-senses-walk`
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `S` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### REF-08 — Dobrych Ludzi

> Dziś jest Dzień Dobrych Ludzi — zapisz imiona trzech osób, które w tym roku wniosły coś dobrego do Twojego życia. Przy każdej dopisz jedno konkretne zdanie o tym, za co ją cenisz.

- **Task ID:** `set-6-task-8`
- **Engine:** `CardFormEngine`
- **Dodatek:** Dobrzy ludzie
- **Format UX:** Karta wdzięczności
- **Dokument / wynik:** `GratitudeCardDocument` — PDF
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować 3 pola: imię + „co ta osoba wniosła do mojego roku”.
- **Interakcja:** Wypełnianie trzech wpisów.
- **Efekt końcowy:** Prywatny eksport PDF; opcjonalny przycisk „skopiuj jeden wpis”, jeśli użytkownik chce go komuś wysłać.
- **Content/config:** `reflection/good-people`
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `M` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### REF-10 — Godziny Bez Powiadomień

> Dziś jest Dzień Godziny Bez Powiadomień — wycisz telefon na godzinę i wcześniej zdecyduj, czym chcesz wypełnić ten czas: książką, spacerem, rozmową, puzzlami albo spokojnym siedzeniem przy stole. Niech to będzie świadoma przerwa, a nie tylko brak ekranu.

- **Task ID:** `set-6-task-10`
- **Engine:** `RandomizerTimerEngine:timer-only`
- **Dodatek:** Godzina bez powiadomień
- **Format UX:** Timer skupienia 60 min
- **Dokument / wynik:** `—` — brak eksportu
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować wybór aktywności: książka, spacer, rozmowa, puzzle, inne; delikatny timer bez nachalnych animacji.
- **Interakcja:** Start 60 min; ekran może pokazywać tylko czas i wybraną intencję.
- **Efekt końcowy:** Po zakończeniu krótki komunikat i oznaczenie wykonania. Bez potrzeby eksportu.
- **Content/config:** `reflection/no-notifications-hour`
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Stan i wynik są renderowane z configu/contentu.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Stan i wynik są renderowane z tego samego configu/contentu.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. Brak serwerowego PDF dla tego wyniku; brak obowiązkowego statycznego assetu task-specific.
- **Nakład wg specyfikacji produktu:** `S` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### REF-11 — Dziesięciu Małych Radości

> Dziś jest Dzień Dziesięciu Małych Radości — wypisz dziesięć drobiazgów, które ostatnio poprawiły Ci humor. Jeśli przy siódmym zacznie brakować pomysłów, nie kończ — właśnie wtedy warto poszukać tych mniej oczywistych.

- **Task ID:** `set-6-task-11`
- **Engine:** `CardFormEngine`
- **Dodatek:** Dziesięć małych radości
- **Format UX:** Interaktywna lista 10 pozycji
- **Dokument / wynik:** `MemoryListDocument` — PDF
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować 10 krótkich pól; po 7. pozycji subtelna zachęta do znalezienia mniej oczywistych rzeczy.
- **Interakcja:** Użytkownik wpisuje pozycje kolejno.
- **Efekt końcowy:** Eksport eleganckiej listy jako PDF.
- **Content/config:** `reflection/ten-small-joys`
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `M` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### REF-14 — Świątecznej Intencji

> Dziś jest Dzień Świątecznej Intencji — wybierz jedno słowo, które ma opisywać tegoroczne święta: „spokój”, „bliskość”, „zabawa”, „wdzięczność” albo dowolne inne. Wróć do niego myślami, gdy przedświąteczny pośpiech zacznie przejmować kontrolę.

- **Task ID:** `set-6-task-14`
- **Engine:** `CardFormEngine`
- **Dodatek:** Świąteczna intencja
- **Format UX:** Generator tapety/karty
- **Dokument / wynik:** `—` — PNG 9:16 lokalnie — wyjątek semantyczny
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować 8 gotowych słów + własne; 3 minimalistyczne tła w stylu e‑Advent.
- **Interakcja:** Użytkownik wybiera słowo i tło.
- **Efekt końcowy:** Pobranie pionowego PNG 9:16 jako tapety na telefon oraz kwadratowego PNG.
- **Content/config:** `reflection/christmas-intention`
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Stan i wynik są renderowane z configu/contentu. Opcjonalny share PNG renderowany z dedykowanego komponentu eksportowego.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Stan i wynik są renderowane z tego samego configu/contentu. Opcjonalny share PNG renderowany do pliku tymczasowego.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. Brak serwerowego PDF dla tego wyniku; brak obowiązkowego statycznego assetu task-specific.
- **Nakład wg specyfikacji produktu:** `M` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] opcjonalny share PNG powstaje z dedykowanego renderera, nie z committed template PNG;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### REF-18 — Własnej Tradycji

> Dziś jest Dzień Własnej Tradycji — wypisz trzy świąteczne zwyczaje, które pielęgnuje się w Twoim domu, i wybierz ten, który najbardziej chcesz zachować na kolejne lata. Dopisz jedno zdanie wyjaśniające, dlaczego właśnie ten.

- **Task ID:** `set-6-task-18`
- **Engine:** `CardFormEngine`
- **Dodatek:** Karta „Nasza świąteczna tradycja”
- **Format UX:** Interaktywny formularz + elegancki eksport PDF
- **Dokument / wynik:** `TraditionCardDocument` — PDF
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować trzy krótkie pola na rodzinne zwyczaje, wybór jednego z nich jako „tradycji, którą zachowujemy”, pole „Dlaczego jest dla nas ważna?” oraz opcjonalne pole „Od którego roku ją pamiętamy / zaczynamy?”.
- **Interakcja:** Użytkownik wpisuje trzy tradycje, zaznacza jedną jako najważniejszą i dodaje krótkie uzasadnienie. Podgląd pamiątkowej karty aktualizuje się na żywo.
- **Efekt końcowy:** Gotowa karta „Nasza świąteczna tradycja 2026” do pobrania jako PDF i zachowania na kolejne lata.
- **Content/config:** `reflection/our-tradition`
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `M` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### REF-23 — Małej Kapsuły Czasu

> Dziś jest Dzień Małej Kapsuły Czasu — włóż do koperty krótką notatkę o tym, co obecnie lubisz, czym żyjesz i czego najczęściej słuchasz. Dopisz datę i otwórz kopertę za rok.

- **Task ID:** `set-6-task-23`
- **Engine:** `CardFormEngine+DateGateCapability(optional)`
- **Dodatek:** Mała kapsuła czasu
- **Format UX:** Formularz + karta PDF
- **Dokument / wynik:** `TimeCapsuleDocument` — PDF
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować pola: co lubię, czym żyję, czego słucham, czego oczekuję; data otwarcia za rok.
- **Interakcja:** Użytkownik wypełnia i „zamyka kapsułę”.
- **Efekt końcowy:** PDF do zapisania/wydrukowania; opcjonalnie ukrycie cyfrowej wersji do daty.
- **Content/config:** `reflection/time-capsule`
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF. `DateGate` egzekwowany po stronie serwera według czasu API.
- **Nakład wg specyfikacji produktu:** `M` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] treść chroniona `DateGate` nie jest ujawniana przed `revealAt` według czasu API;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

### REF-30 — Grudniowego Domknięcia

> Dziś jest Dzień Grudniowego Domknięcia — zapisz trzy rzeczy: za co chcesz podziękować mijającemu rokowi, co zostawiasz za sobą i na co najbardziej czekasz. Schowaj kartkę razem ze świątecznymi dekoracjami i wróć do niej za rok.

- **Task ID:** `set-6-task-30`
- **Engine:** `CardFormEngine`
- **Dodatek:** Grudniowe domknięcie
- **Format UX:** Interaktywny finał roku
- **Dokument / wynik:** `ClosureCardDocument` — PDF
- **Cel dodatku:** użytkownik nie musi przygotowywać narzędzia samodzielnie; przygotować 3 duże pola: dziękuję za…, zostawiam…, czekam na…; elegancki finalny layout.
- **Interakcja:** Użytkownik wypełnia trzy odpowiedzi; aplikacja tworzy podsumowanie.
- **Efekt końcowy:** Eksport „Moje grudniowe domknięcie 2026” jako PDF; możliwość zapisania do przyszłego roku.
- **Content/config:** `reflection/december-closure`
- **Asset task-specific:** **brak** — nie tworzyć osobnego template PNG/PDF.
- **WWW:** render w `SpecialWindowShell`; interakcja jako prawdziwe komponenty UI, bez template PNG. Preview dokumentu z `DocumentDefinition`; `Pobierz PDF` wywołuje renderer API.
- **Android / React Native:** natywny ekran/BottomSheet/fullscreen w `SpecialWindowShell` RN; back/foreground bez utraty autosave. Preview dokumentu z konfiguracji; PDF pobierany do cache aplikacji i udostępniany systemowo.
- **API:** descriptor i content są ujawniane dopiero po `open`; progress jest wersjonowany i synchronizowany. PDF powstaje na żądanie z `DocumentRegistry`/`DocumentKit`; brak statycznego URL do gotowego PDF.
- **Nakład wg specyfikacji produktu:** `M` (S = mały, M = średni, L = większy)
- **Uwagi implementacyjne:** Kod-first. `Asset task-specific = brak`; wygląd wynika z engine'u, design tokens, content/configu i ewentualnego `DocumentComponent`.

**Kryteria akceptacji:**

- [ ] przed otwarciem API/UI nie ujawniają specjalności dnia;
- [ ] po otwarciu ujawniany jest właściwy engine, config i tylko potrzebny content;
- [ ] UI specjalnego dodatku jest zbudowane z komponentów, bez task-specific template PNG;
- [ ] progress nie ginie po wyjściu, restarcie ani przejściu aplikacji w tło;
- [ ] PDF jest generowany przez API z `DocumentRegistry`, a nie pobierany jako statyczny source asset;
- [ ] PDF można pobrać/otworzyć/udostępnić na WWW i Androidzie, jeśli eksport jest przewidziany;
- [ ] zadanie można zakończyć zgodnie z jego `completionRule`.

---

# 26. Matryca wszystkich 180 zadań — routing do handlera

Ta sekcja służy do sprawdzenia kompletności. Każde płatne zadanie ma przypisany handler. `StandardTask` oznacza brak dodatku premium.

## Świąteczny nastrój i zabawa

| # | Task ID | Dzień | Typ | Handler |
|---:|---|---|---|---|
| 1 | `set-1-task-1` | Świątecznych Brzmień | STANDARD | `StandardTask` |
| 2 | `set-1-task-2` | Kolędowego Zgadywania | STANDARD | `StandardTask` |
| 3 | `set-1-task-3` | Świątecznego Karaoke | STANDARD | `StandardTask` |
| 4 | `set-1-task-4` | Jarmarkowej Misji | STANDARD | `StandardTask` |
| 5 | `set-1-task-5` | Bożonarodzeniowego Quizu | ✨ SPECIAL | `QuizEngine` |
| 6 | `set-1-task-6` | Dorosłego Listu do Mikołaja | ✨ SPECIAL | `CardFormEngine` |
| 7 | `set-1-task-7` | Świątecznego Bingo | ✨ SPECIAL | `ChecklistEngine:bingo` |
| 8 | `set-1-task-8` | Nietypowego Zdjęcia | STANDARD | `StandardTask` |
| 9 | `set-1-task-9` | Domowej Wioski | ✨ SPECIAL | `DocumentEngine` |
| 10 | `set-1-task-10` | Świątecznego Teatrzyku | ✨ SPECIAL | `RandomizerTimerEngine` |
| 11 | `set-1-task-11` | Świątecznej Ciekawostki | ✨ SPECIAL | `RandomizerTimerEngine:deck` |
| 12 | `set-1-task-12` | Świątecznej Parodii | STANDARD | `StandardTask` |
| 13 | `set-1-task-13` | Dawnej Kolędy | STANDARD | `StandardTask` |
| 14 | `set-1-task-14` | Filmowego Seansu Specjalnego | STANDARD | `StandardTask` |
| 15 | `set-1-task-15` | Polowania na Iluminacje | ✨ SPECIAL | `ChecklistEngine:score` |
| 16 | `set-1-task-16` | Świątecznego Stroju | STANDARD | `StandardTask` |
| 17 | `set-1-task-17` | Fotograficznego Powrotu | ✨ SPECIAL | `ImageCardEngine` |
| 18 | `set-1-task-18` | Najdziwniejszej Bombki | STANDARD | `StandardTask` |
| 19 | `set-1-task-19` | Świątecznego Alfabetu | ✨ SPECIAL | `TurnBasedGameEngine` |
| 20 | `set-1-task-20` | Mikołajowego Komunikatu | STANDARD | `StandardTask` |
| 21 | `set-1-task-21` | Tajnej Misji Elfa | ✨ SPECIAL | `RandomizerTimerEngine` |
| 22 | `set-1-task-22` | Świątecznych Kalamburów | ✨ SPECIAL | `RandomizerTimerEngine` |
| 23 | `set-1-task-23` | Prezentowego Detektywa | ✨ SPECIAL | `CardFormEngine+ScorecardEngine` |
| 24 | `set-1-task-24` | Grudniowego Rankingu | ✨ SPECIAL | `SortableListEngine` |
| 25 | `set-1-task-25` | Świątecznej Reklamy | STANDARD | `StandardTask` |
| 26 | `set-1-task-26` | Choinkowych Poszukiwań | STANDARD | `StandardTask` |
| 27 | `set-1-task-27` | Jednego Kadru | STANDARD | `StandardTask` |
| 28 | `set-1-task-28` | Świątecznej Prognozy | ✨ SPECIAL | `CardFormEngine+DateGateCapability` |
| 29 | `set-1-task-29` | Reniferowego Wyzwania | ✨ SPECIAL | `RandomizerTimerEngine` |
| 30 | `set-1-task-30` | Małego Finału | STANDARD | `StandardTask` |

## Porządki i przygotowania

| # | Task ID | Dzień | Typ | Handler |
|---:|---|---|---|---|
| 1 | `set-2-task-1` | Świątecznej Stacji Pakowania | ✨ SPECIAL | `ChecklistEngine+DocumentEngine` |
| 2 | `set-2-task-2` | Testu Lampek | STANDARD | `StandardTask` |
| 3 | `set-2-task-3` | Choinkowej Przestrzeni | STANDARD | `StandardTask` |
| 4 | `set-2-task-4` | Pudełka Awaryjnego | ✨ SPECIAL | `ChecklistEngine` |
| 5 | `set-2-task-5` | Listy Bez Paniki | ✨ SPECIAL | `PlannerEngine` |
| 6 | `set-2-task-6` | Świątecznej Spiżarni | ✨ SPECIAL | `ChecklistEngine` |
| 7 | `set-2-task-7` | Wolnej Półki | STANDARD | `StandardTask` |
| 8 | `set-2-task-8` | Prezentowego Magazynu | STANDARD | `StandardTask` |
| 9 | `set-2-task-9` | Papierowej Kontroli | ✨ SPECIAL | `ChecklistEngine` |
| 10 | `set-2-task-10` | Stołowej Próby Generalnej | STANDARD | `StandardTask` |
| 11 | `set-2-task-11` | Kuchennej Przestrzeni | STANDARD | `StandardTask` |
| 12 | `set-2-task-12` | Lodówkowego Planu | STANDARD | `StandardTask` |
| 13 | `set-2-task-13` | Zamrażarkowego Oddechu | STANDARD | `StandardTask` |
| 14 | `set-2-task-14` | Dekoracyjnego Serwisu | STANDARD | `StandardTask` |
| 15 | `set-2-task-15` | Gościnnego Wieszaka | STANDARD | `StandardTask` |
| 16 | `set-2-task-16` | Ciepłego Wejścia | STANDARD | `StandardTask` |
| 17 | `set-2-task-17` | Obrusowej Gotowości | STANDARD | `StandardTask` |
| 18 | `set-2-task-18` | Prezentowych Etykiet | ✨ SPECIAL | `TemplatePersonalizerEngine+DocumentEngine` |
| 19 | `set-2-task-19` | Grudniowego Kalendarza | ✨ SPECIAL | `MonthPlannerEngine` |
| 20 | `set-2-task-20` | Świątecznego Menu | ✨ SPECIAL | `PlannerEngine` |
| 21 | `set-2-task-21` | Naczyń Specjalnych | STANDARD | `StandardTask` |
| 22 | `set-2-task-22` | Baterii Mikołaja | STANDARD | `StandardTask` |
| 23 | `set-2-task-23` | Małych Zapasów | STANDARD | `StandardTask` |
| 24 | `set-2-task-24` | Awaryjnej Listy Prezentów | ✨ SPECIAL | `OptionConfiguratorEngine` |
| 25 | `set-2-task-25` | Porządku w Dekoracjach | STANDARD | `StandardTask` |
| 26 | `set-2-task-26` | Świątecznego Ładowania | STANDARD | `StandardTask` |
| 27 | `set-2-task-27` | Zdjęciowego Porządku | STANDARD | `StandardTask` |
| 28 | `set-2-task-28` | Pięciominutowego Koszyka | STANDARD | `StandardTask` |
| 29 | `set-2-task-29` | Spokojnego Poranka | STANDARD | `StandardTask` |
| 30 | `set-2-task-30` | Ostatniej Kontroli | ✨ SPECIAL | `ChecklistEngine:audit` |

## Dobre uczynki i życzliwość

| # | Task ID | Dzień | Typ | Handler |
|---:|---|---|---|---|
| 1 | `set-3-task-1` | Tajemniczego Elfa | ✨ SPECIAL | `RandomizerTimerEngine` |
| 2 | `set-3-task-2` | Prawdziwego „Dziękuję” | ✨ SPECIAL | `CardFormEngine` |
| 3 | `set-3-task-3` | Ciepłego Telefonu | STANDARD | `StandardTask` |
| 4 | `set-3-task-4` | Starego Zdjęcia | STANDARD | `StandardTask` |
| 5 | `set-3-task-5` | Dobrego Kubka | STANDARD | `StandardTask` |
| 6 | `set-3-task-6` | Komplementu z Uzasadnieniem | STANDARD | `StandardTask` |
| 7 | `set-3-task-7` | Ręcznej Kartki | ✨ SPECIAL | `TemplatePersonalizerEngine+DocumentEngine` |
| 8 | `set-3-task-8` | Pomocnego Elfa | STANDARD | `StandardTask` |
| 9 | `set-3-task-9` | Małej Paczuszki | ✨ SPECIAL | `TemplatePersonalizerEngine` |
| 10 | `set-3-task-10` | Dobrego Słowa dla Nieznajomego | STANDARD | `StandardTask` |
| 11 | `set-3-task-11` | Świątecznej Darowizny | STANDARD | `StandardTask` |
| 12 | `set-3-task-12` | Jednej Pełnej Torby | STANDARD | `StandardTask` |
| 13 | `set-3-task-13` | Łańcucha Dobra | ✨ SPECIAL | `CardFormEngine` |
| 14 | `set-3-task-14` | Wiadomości Bez Powodu | STANDARD | `StandardTask` |
| 15 | `set-3-task-15` | Domowego Ratunku | STANDARD | `StandardTask` |
| 16 | `set-3-task-16` | Słodkiego Dzielenia | STANDARD | `StandardTask` |
| 17 | `set-3-task-17` | Głosu Wdzięczności | STANDARD | `StandardTask` |
| 18 | `set-3-task-18` | Dobrego Wspomnienia | STANDARD | `StandardTask` |
| 19 | `set-3-task-19` | Trzech Uśmiechów | ✨ SPECIAL | `ChecklistEngine:steps` |
| 20 | `set-3-task-20` | Sąsiedzkiego „Cześć” | STANDARD | `StandardTask` |
| 21 | `set-3-task-21` | Prezentu z Czasu | STANDARD | `StandardTask` |
| 22 | `set-3-task-22` | Pomocy Przy Prezentach | STANDARD | `StandardTask` |
| 23 | `set-3-task-23` | Dobrej Opinii | STANDARD | `StandardTask` |
| 24 | `set-3-task-24` | Rodzinnych Wspomnień | ✨ SPECIAL | `RandomizerTimerEngine:prompt-deck+DocumentEngine` |
| 25 | `set-3-task-25` | Ciepłego Miejsca | STANDARD | `StandardTask` |
| 26 | `set-3-task-26` | Sekretnej Słodkości | STANDARD | `StandardTask` |
| 27 | `set-3-task-27` | Życzeń Bez Kopiowania | ✨ SPECIAL | `CardFormEngine` |
| 28 | `set-3-task-28` | Drugiej Szansy dla Rzeczy | STANDARD | `StandardTask` |
| 29 | `set-3-task-29` | Jednego „Tak” | STANDARD | `StandardTask` |
| 30 | `set-3-task-30` | Cichego Finału | STANDARD | `StandardTask` |

## Kreatywne i artystyczne

| # | Task ID | Dzień | Typ | Handler |
|---:|---|---|---|---|
| 1 | `set-4-task-1` | Bombki z Historią | STANDARD | `StandardTask` |
| 2 | `set-4-task-2` | Własnego Papieru Prezentowego | ✨ SPECIAL | `DocumentEngine` |
| 3 | `set-4-task-3` | Eleganckiej Etykietki | ✨ SPECIAL | `TemplatePersonalizerEngine+DocumentEngine` |
| 4 | `set-4-task-4` | Świątecznej Pocztówki | ✨ SPECIAL | `TemplatePersonalizerEngine` |
| 5 | `set-4-task-5` | Papierowej Wioski | ✨ SPECIAL | `DocumentEngine` |
| 6 | `set-4-task-6` | Masy Solnej | ✨ SPECIAL | `DocumentEngine` |
| 7 | `set-4-task-7` | Świątecznego Stempla | ✨ SPECIAL | `DocumentEngine` |
| 8 | `set-4-task-8` | Zimowego Kolażu | STANDARD | `StandardTask` |
| 9 | `set-4-task-9` | Zdjęcia Jak z Pocztówki | STANDARD | `StandardTask` |
| 10 | `set-4-task-10` | Ozdobnej Koperty | ✨ SPECIAL | `DocumentEngine` |
| 11 | `set-4-task-11` | Świątecznej Zakładki | ✨ SPECIAL | `DocumentEngine` |
| 12 | `set-4-task-12` | Małego Wianka | STANDARD | `StandardTask` |
| 13 | `set-4-task-13` | Papierowego Renifera | ✨ SPECIAL | `DocumentEngine` |
| 14 | `set-4-task-14` | Świątecznej Typografii | STANDARD | `StandardTask` |
| 15 | `set-4-task-15` | Pudełka z Charakterem | STANDARD | `StandardTask` |
| 16 | `set-4-task-16` | Origami | ✨ SPECIAL | `DocumentEngine` |
| 17 | `set-4-task-17` | Świątecznej Ramki | ✨ SPECIAL | `ImageCardEngine` |
| 18 | `set-4-task-18` | Rysunku Jedną Linią | STANDARD | `StandardTask` |
| 19 | `set-4-task-19` | Prezentowej Pieczęci | STANDARD | `StandardTask` |
| 20 | `set-4-task-20` | Świątecznego Komiksu | ✨ SPECIAL | `TemplatePersonalizerEngine+DocumentEngine` |
| 21 | `set-4-task-21` | Łańcucha Wspomnień | ✨ SPECIAL | `DocumentEngine` |
| 22 | `set-4-task-22` | Kartonowej Gwiazdy | STANDARD | `StandardTask` |
| 23 | `set-4-task-23` | Świątecznego Monogramu | STANDARD | `StandardTask` |
| 24 | `set-4-task-24` | Papierowego Mikołaja | STANDARD | `StandardTask` |
| 25 | `set-4-task-25` | Małej Girlandy | ✨ SPECIAL | `DocumentEngine` |
| 26 | `set-4-task-26` | Świątecznego Portretu | STANDARD | `StandardTask` |
| 27 | `set-4-task-27` | Ręcznie Pisanych Życzeń | STANDARD | `StandardTask` |
| 28 | `set-4-task-28` | Prezentu z Papieru | ✨ SPECIAL | `TemplatePersonalizerEngine` |
| 29 | `set-4-task-29` | Świątecznej Scenografii | STANDARD | `StandardTask` |
| 30 | `set-4-task-30` | Ozdoby na Lata | STANDARD | `StandardTask` |

## Kuchenne i kulinarne

| # | Task ID | Dzień | Typ | Handler |
|---:|---|---|---|---|
| 1 | `set-5-task-1` | Tosta-Gwiazdki | STANDARD | `StandardTask` |
| 2 | `set-5-task-2` | Czekoladowej Degustacji | ✨ SPECIAL | `ScorecardEngine` |
| 3 | `set-5-task-3` | Zimowych Naleśników | STANDARD | `StandardTask` |
| 4 | `set-5-task-4` | Trufli Bez Pieczenia | ✨ SPECIAL | `RecipeCardEngine` |
| 5 | `set-5-task-5` | Piernikowego Testu | ✨ SPECIAL | `ImageCardEngine+ScorecardEngine` |
| 6 | `set-5-task-6` | Świątecznej Deski | ✨ SPECIAL | `OptionConfiguratorEngine` |
| 7 | `set-5-task-7` | Zimowej Owsianki | STANDARD | `StandardTask` |
| 8 | `set-5-task-8` | Cynamonowych Ślimaczków | ✨ SPECIAL | `RecipeCardEngine` |
| 9 | `set-5-task-9` | Gorącej Czekolady na Bogato | ✨ SPECIAL | `OptionConfiguratorEngine+RecipeCardEngine` |
| 10 | `set-5-task-10` | Świątecznego Popcornu | STANDARD | `StandardTask` |
| 11 | `set-5-task-11` | Jabłka z Pieca | STANDARD | `StandardTask` |
| 12 | `set-5-task-12` | Deseru w Szklance | STANDARD | `StandardTask` |
| 13 | `set-5-task-13` | Korzennego Ciasta w Kubku | STANDARD | `StandardTask` |
| 14 | `set-5-task-14` | Czerwono-Zielonego Talerza | STANDARD | `StandardTask` |
| 15 | `set-5-task-15` | Karmelizowanych Orzechów | ✨ SPECIAL | `RecipeCardEngine` |
| 16 | `set-5-task-16` | Małych Kanapek | STANDARD | `StandardTask` |
| 17 | `set-5-task-17` | Świątecznego Koktajlu Bezalkoholowego | ✨ SPECIAL | `OptionConfiguratorEngine` |
| 18 | `set-5-task-18` | Zupy, Która Rozgrzewa | STANDARD | `StandardTask` |
| 19 | `set-5-task-19` | Kulinarnej Niespodzianki | STANDARD | `StandardTask` |
| 20 | `set-5-task-20` | Małej Degustacji Herbat | ✨ SPECIAL | `ScorecardEngine` |
| 21 | `set-5-task-21` | Świątecznej Grzanki | STANDARD | `StandardTask` |
| 22 | `set-5-task-22` | Jadalnego Prezentu | ✨ SPECIAL | `RecipeCardEngine+TemplatePersonalizerEngine` |
| 23 | `set-5-task-23` | Świątecznego Śniadania | STANDARD | `StandardTask` |
| 24 | `set-5-task-24` | Ciasteczkowego Pojedynku | ✨ SPECIAL | `ScorecardEngine` |
| 25 | `set-5-task-25` | Słodkiego Tria | STANDARD | `StandardTask` |
| 26 | `set-5-task-26` | Zimowego Talerza Owoców | STANDARD | `StandardTask` |
| 27 | `set-5-task-27` | Kuchennej Pamiątki | ✨ SPECIAL | `RecipeCardEngine+CardFormEngine` |
| 28 | `set-5-task-28` | Świątecznego Dipu | STANDARD | `StandardTask` |
| 29 | `set-5-task-29` | Kuchennego Eksperymentu | STANDARD | `StandardTask` |
| 30 | `set-5-task-30` | Własnego Świątecznego Smaku | STANDARD | `StandardTask` |

## Refleksja i relaks

| # | Task ID | Dzień | Typ | Handler |
|---:|---|---|---|---|
| 1 | `set-6-task-1` | Listu do Przyszłego Siebie | ✨ SPECIAL | `CardFormEngine+DateGateCapability` |
| 2 | `set-6-task-2` | Trzech Dobrych Scen | ✨ SPECIAL | `CardFormEngine` |
| 3 | `set-6-task-3` | Roku w Sześciu Słowach | ✨ SPECIAL | `CardFormEngine` |
| 4 | `set-6-task-4` | Zdjęcia Roku | ✨ SPECIAL | `ImageCardEngine` |
| 5 | `set-6-task-5` | Zimowego Spaceru Pięciu Zmysłów | ✨ SPECIAL | `ChecklistEngine` |
| 6 | `set-6-task-6` | Jednej Rzeczy Mniej | STANDARD | `StandardTask` |
| 7 | `set-6-task-7` | Cichej Herbaty | STANDARD | `StandardTask` |
| 8 | `set-6-task-8` | Dobrych Ludzi | ✨ SPECIAL | `CardFormEngine` |
| 9 | `set-6-task-9` | Wspomnienia z Dzieciństwa | STANDARD | `StandardTask` |
| 10 | `set-6-task-10` | Godziny Bez Powiadomień | ✨ SPECIAL | `RandomizerTimerEngine:timer-only` |
| 11 | `set-6-task-11` | Dziesięciu Małych Radości | ✨ SPECIAL | `CardFormEngine` |
| 12 | `set-6-task-12` | Powodu do Dumy | STANDARD | `StandardTask` |
| 13 | `set-6-task-13` | Rozmowy o Dawnych Świętach | STANDARD | `StandardTask` |
| 14 | `set-6-task-14` | Świątecznej Intencji | ✨ SPECIAL | `CardFormEngine` |
| 15 | `set-6-task-15` | Starej Kartki | STANDARD | `StandardTask` |
| 16 | `set-6-task-16` | Jednego Marzenia | STANDARD | `StandardTask` |
| 17 | `set-6-task-17` | Domowego Zachodu | STANDARD | `StandardTask` |
| 18 | `set-6-task-18` | Własnej Tradycji | ✨ SPECIAL | `CardFormEngine` |
| 19 | `set-6-task-19` | Głosu do Przyszłości | STANDARD | `StandardTask` |
| 20 | `set-6-task-20` | Jednego Dobrego Zdania | STANDARD | `StandardTask` |
| 21 | `set-6-task-21` | Powolnego Śniadania | STANDARD | `StandardTask` |
| 22 | `set-6-task-22` | Rodzinnego „Pamiętasz?” | STANDARD | `StandardTask` |
| 23 | `set-6-task-23` | Małej Kapsuły Czasu | ✨ SPECIAL | `CardFormEngine+DateGateCapability(optional)` |
| 24 | `set-6-task-24` | Pięciu Minut Przy Oknie | STANDARD | `StandardTask` |
| 25 | `set-6-task-25` | Odpowiedzi na Jedno Pytanie | STANDARD | `StandardTask` |
| 26 | `set-6-task-26` | Listy „Chcę Więcej” | STANDARD | `StandardTask` |
| 27 | `set-6-task-27` | Listy „Chcę Mniej” | STANDARD | `StandardTask` |
| 28 | `set-6-task-28` | Świątecznego Wspomnienia | STANDARD | `StandardTask` |
| 29 | `set-6-task-29` | Jednego Zdjęcia Tylko dla Siebie | STANDARD | `StandardTask` |
| 30 | `set-6-task-30` | Grudniowego Domknięcia | ✨ SPECIAL | `CardFormEngine` |



---

## 27. Minimalna konfiguracja specjalnego dnia

```json
{
  "taskId": "set-1-task-7",
  "specialConfigId": "christmas-bingo-v2",
  "engine": "CHECKLIST",
  "variant": "BINGO",
  "version": 2,
  "headline": "Świąteczne Bingo",
  "contentKey": "christmas-bingo-v1",
  "uiPreset": "bingo-3x3",
  "document": {
    "templateId": "bingo-v1",
    "version": 1,
    "variants": ["COLOR", "INK_SAVER"],
    "defaultPage": "A4"
  },
  "capabilities": {
    "canShareImage": true,
    "canPrint": true
  },
  "completionRule": {
    "type": "BINGO_LINE_OR_MANUAL"
  },
  "config": {
    "rows": 3,
    "columns": 3,
    "itemsPerSession": 9,
    "allowReset": true
  }
}
```

Zwróć uwagę: **brak `templatePng`, brak `assetPdf`, brak `previewPng`.**

---

## 28. Zasady dodawania nowego okienka

1. Czy da się użyć istniejącego engine? Jeśli tak — config/content, bez nowego engine.
2. Czy wygląd da się zbudować z istniejących prymitywów? Jeśli tak — bez assetu.
3. Czy PDF da się zbudować z istniejącej rodziny dokumentu? Jeśli tak — nowy preset/config, nie nowy dokument.
4. Nowy `DocumentComponent` tworzyć dopiero, gdy konstrukcja strony rzeczywiście jest inna.
5. Nowy raster/SVG asset dodawać dopiero, gdy zawiera unikalną ilustrację, nie layout.
6. Preview nigdy nie jest źródłowym assetem.
7. Nowy PDF nigdy nie jest źródłowym assetem.
8. Każdy special musi mieć web, RN, API contract, autosave, analytics, accessibility, error handling i E2E.

### Test „czy to asset?”

Przed dodaniem pliku graficznego zadaj pytanie:

> „Czy gdybym zmienił tekst, kolor, border-radius, ramkę albo liczbę pól, musiałbym wygenerować drugi plik?”

Jeśli odpowiedź brzmi **tak**, to prawdopodobnie nie powinien być assetem — powinien być komponentem.

---

## 29. Kolejność implementacji

| Faza | Zakres |
|---|---|
| 0 | shared types, schema, config, open flow |
| 1 | design tokens + SVG primitives + `SpecialWindowShell` |
| 2 | progress/autosave/sync |
| 3 | `DocumentDefinition`, `DocumentRegistry`, `PdfRenderService` |
| 4 | preview renderer web/RN |
| 5 | proste engines: checklist, quiz, randomizer, scorecard |
| 6 | form/planner/sort/configurator |
| 7 | image engine lokalny |
| 8 | code-defined craft documents |
| 9 | content 6 zestawów |
| 10 | DateGate |
| 11 | pełne E2E/visual regression |

**Nie ma osobnej fazy „wyprodukuj 18 PDF i 20 PNG”.** Grafika projektowa ogranicza się do brand assets i ewentualnego ambient background.

---

## 30. Definition of Done

- [ ] 180 płatnych zadań renderuje się poprawnie.
- [ ] 72 special ujawniają engine dopiero po open.
- [ ] 108 standardowych korzysta ze standard flow.
- [ ] brak specjalnego wyglądu zamkniętego kafelka.
- [ ] wszystkie interaktywne UI są komponentami, nie obrazkami.
- [ ] nie ma task-specific template PNG dla layoutów, formularzy i dokumentów.
- [ ] nie ma ręcznie utrzymywanych finalnych PDF-ów.
- [ ] nie ma committed preview PNG/WebP dokumentów.
- [ ] każdy dokument do pobrania powstaje przez API renderer.
- [ ] wszystkie dynamiczne teksty są renderowane jako tekst, nie część tła.
- [ ] dokumenty mają wariant ink-saver tam, gdzie pełne tło zużywałoby dużo tuszu.
- [ ] PNG pozostaje tylko dla semantycznych obrazów/share.
- [ ] zdjęcia użytkownika pozostają lokalne w v1.
- [ ] autosave/sync działa po restarcie.
- [ ] prywatne dane nie trafiają do analytics/logów.
- [ ] DateGate egzekwowany przez API.
- [ ] PDF export ma testy polskich znaków, overflow i formatów stron.
- [ ] Android pobiera/udostępnia PDF bez szerokich uprawnień do storage.
- [ ] ambient ma komplet 16:9 + 1:1 + 9:16 i renderer wybiera wariant wg proporcji kontenera.
- [ ] zmiana orientacji nie resetuje progressu ani engine'u.
- [ ] E2E pokrywa wszystkie engine'y i reprezentatywne dokumenty.

---

## 31. Ostateczny budżet assetów

### Source assets utrzymywane ręcznie

```text
2 pliki brand PNG:
- eadvent-logo.png
- eadvent-mark.png

3 warianty jednego logicznego ambient background:
- christmas-ambient-landscape.webp
- christmas-ambient-square.webp
- christmas-ambient-portrait.webp

RAZEM: 5 fizycznych plików graficznych
```

### Pochodne generowane

```text
PDF-y: generowane przez API
preview dokumentów: renderowane z kodu / generowane tymczasowo
share PNG: generowane na żądanie
platformowe app icons: pochodne eadvent-mark.png
```

### Kod/data

```text
72 special configs
6 content files
~15 engine'ów
wspólny design system
wspólny DocumentKit
unikalne craft layouts jako komponenty SVG/TSX
ResponsiveAmbient resolver dla 3 proporcji
```

Ta liczba **nie obejmuje pochodnych buildowych** (np. Android mipmap/app icon sizes), ponieważ są generowane z `eadvent-mark.png` i nie są osobnymi source assetami.

---

## 32. Checklist przekazania zespołowi

### Backend/API
- [ ] zaimplementowany open flow i brak leaków special metadata przed otwarciem;
- [ ] entitlement premium po stronie serwera;
- [ ] progress read/upsert z `payloadVersion`;
- [ ] completion endpoint/rule;
- [ ] `DocumentRegistry` i `PdfRenderService`;
- [ ] PDF export + preview endpoint;
- [ ] prywatne dokumenty bez public cache;
- [ ] DateGate oparty o czas API;
- [ ] sanitizacja tekstu i limity payloadów;
- [ ] analytics bez prywatnych treści.

### Shared packages
- [ ] typy i schema;
- [ ] 6 plików contentu;
- [ ] deterministic randomization;
- [ ] completion rules;
- [ ] design tokens;
- [ ] `DocumentDefinition` + primitives;
- [ ] craft SVG/TSX;
- [ ] resolver ambientu 16:9 / 1:1 / 9:16.

### WWW
- [ ] `SpecialWindowShell`;
- [ ] wszystkie engine'y;
- [ ] autosave i pending sync;
- [ ] `ResponsiveAmbient` wybierający wariant po proporcji kontenera;
- [ ] preview dokumentów;
- [ ] PDF download/print/share;
- [ ] lokalny image crop/export;
- [ ] accessibility i reduced motion.

### Android / React Native
- [ ] `SpecialWindowShell` RN;
- [ ] wszystkie engine'y;
- [ ] resume po background;
- [ ] offline queue progressu;
- [ ] ambient wybierany z `useWindowDimensions()`/`onLayout`;
- [ ] PDF cache + system share/save bez szerokich storage permissions;
- [ ] lokalna galeria/crop/PNG;
- [ ] orientation change bez resetu engine'u.

### Grafika
- [ ] `eadvent-logo.png` transparent;
- [ ] `eadvent-mark.png` transparent;
- [ ] `christmas-ambient-landscape.webp` 16:9;
- [ ] `christmas-ambient-square.webp` 1:1;
- [ ] `christmas-ambient-portrait.webp` 9:16;
- [ ] wszystkie trzy ambienty są tym samym stylem/kompozycją marki;
- [ ] żadne pole tekstowe/ramka/UI nie jest wypalone w tle.

### QA
- [ ] 180 tasków przechodzi routing;
- [ ] 72 speciale przechodzą E2E;
- [ ] każdy engine ma reprezentatywny test;
- [ ] PDF-y testowane na polskie znaki i overflow;
- [ ] layouty A4/A5/A6/A3;
- [ ] portrait/square/landscape ambient visual regression;
- [ ] brak leaków premium;
- [ ] brak utraty progressu;
- [ ] brak prywatnej treści w logach/analytics.

---

## 33. Ostateczna zasada architektoniczna

Jeżeli zespół ma wątpliwość, gdzie umieścić nowy element, stosuje kolejność:

```text
czy to dane/treść?
  -> content/config

czy to układ, ramka, tabela, pole, badge, ornament?
  -> komponent + design tokens

czy to dokument do pobrania?
  -> DocumentDefinition + API PdfRenderer

czy to wynik ze zdjęciem użytkownika?
  -> lokalny ImageCardEngine / PNG

czy to bogate tło/branding, którego nie warto odtwarzać kodem?
  -> source asset

czy nowy asset różniłby się od istniejącego tylko tekstem/ramką/układem?
  -> NIE DODAWAĆ ASSETU
```

**Docelowy model e-Advent: dużo doświadczeń, mało assetów, jeden spójny system renderowania, jeden responsywny ambient w trzech proporcjach.**
