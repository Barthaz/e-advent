# e-Advent API

REST API (Express) z Stripe, WebSocketami, e-mailem i **MySQL**.

## Funkcjonalności

- REST API (Express.js)
- Stripe (płatności)
- Socket.io
- Nodemailer
- MySQL (`mysql2`)
- Panel admin (JWT)

## Instalacja

Z root monorepo:

```bash
npm install
```

Skopiuj `.env.example` → `.env` i uzupełnij `MYSQL_*`, Stripe, e-mail, `FRONTEND_URL`, `PANEL_URL`.

## Uruchomienie

```bash
npm run dev          # z apps/e-advent-api
# lub z root:
npm run dev:api
```

Domyślny port: `3000`.

## Testy

```bash
npm test
npm run test:unit
npm run test:security
```

## Endpointy

- `/api/v1/*` — wersja aktualna
- `/api/*` — legacy alias
