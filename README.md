# e-advent

Monorepo aplikacji e-Advent: sklep (frontend), aplikacja mobilna, panel admin oraz API.

## Struktura

```
apps/e-advent-frontend   # Vite + React (port 5173)
apps/e-advent-app        # Expo / React Native
apps/e-advent-panel      # Panel admin (port 5174)
apps/e-advent-api        # Express + MySQL (port 3000)
packages/types           # @e-advent/types
packages/products        # @e-advent/products
packages/assets          # @e-advent/assets
assets/                  # wspólne grafiki
```

## Start

```bash
npm install
npm run dev:api
npm run dev:frontend
npm run dev:panel
```

Skopiuj `.env.example` → `.env` w `apps/e-advent-api` (oraz opcjonalnie w frontend/app/panel).

## Testy

```bash
npm test
```
