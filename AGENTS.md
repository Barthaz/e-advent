# Dokumentacja projektu e-advent (monorepo)

Ten plik opisuje strukturę monorepo i służy jako punkt startowy przy każdej sesji.

---

## Struktura katalogów

```
e-advent/                    ← katalog główny monorepo
├── apps/
│   ├── e-advent-frontend/   ← strona web (Vite + React)
│   ├── e-advent-app/        ← aplikacja mobilna (Expo)
│   ├── e-advent-panel/      ← panel administracyjny
│   └── e-advent-api/        ← REST API (Express + MySQL)
├── packages/
│   ├── types/               ← @e-advent/types
│   ├── products/            ← @e-advent/products (katalog SKU + totals)
│   └── assets/              ← @e-advent/assets (thin → root assets/)
├── assets/                  ← wspólne grafiki (background, logo)
└── docs/
```

---

## Instalacja (root)

```bash
cd e-advent
npm install
```

---

## Uruchamianie

```bash
# Terminal 1 — API
npm run dev:api

# Terminal 2 — Strona web
npm run dev:frontend

# Terminal 3 — Panel
npm run dev:panel

# Terminal 4 — Aplikacja mobilna (opcjonalnie)
npm run dev:app
```

Lub z katalogów aplikacji:

```bash
cd apps/e-advent-api && npm run dev        # :3000
cd apps/e-advent-frontend && npm run dev   # :5173
cd apps/e-advent-panel && npm run dev      # :5174
cd apps/e-advent-app && npm start
```

---

## e-advent-frontend — strona web

**Katalog:** `apps/e-advent-frontend/`

**Stos:** React 19 + TypeScript, Vite 6, Tailwind CSS 4, React Router DOM 7, Stripe

**Env:** `VITE_API_URL`, `VITE_STRIPE_PUBLISHABLE_KEY` (patrz `.env.example`)

---

## e-advent-app — aplikacja mobilna

**Katalog:** `apps/e-advent-app/`

**Stos:** React Native + Expo, TypeScript, React Navigation

**Env:** `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_ORDER_CALENDAR_URL` (patrz `.env.example`)

---

## e-advent-api — REST API

**Katalog:** `apps/e-advent-api/`

**Stos:** Node.js + Express 4, **MySQL** (mysql2), Stripe, Socket.io, Nodemailer, Multer, Vercel Blob

**Wejście:** `app.js`

**Env:** wymagany `.env` — MySQL, Stripe, e-mail, JWT, `FRONTEND_URL`, `PANEL_URL` (patrz `.env.example`). Nie commituj `.env`.

---

## e-advent-panel — panel administracyjny

**Katalog:** `apps/e-advent-panel/`

**Stos:** React + Vite + Redux Toolkit; proxy `/api` → API

---

## Pakiety wspólne

| Pakiet | Opis |
|--------|------|
| `@e-advent/types` | Typy domenowe (produkty, kalendarz, fulfillment) |
| `@e-advent/products` | Katalog SKU, shipping, `computeOrderTotals` |
| `@e-advent/assets` | Wspólne PNG (background, logo) |

---

## Testy

```bash
npm test                 # wszystkie workspaces
npm run test:api
npm run test:frontend
npm run test:panel
npm run test:app
```
