# Security fixes — 2026-08-11

Closed findings from the security campaign (P0+P1):

- Pay-01/02: `createFree` requires `promoCode`, 100% discount, interactive + pending only
- P-02/P-03: payment amount/SKU from DB calendar; PLN only
- Pay-03/04: client `status` ignored; create always pending
- C-04: server UUID only; client id ignored
- C-02: pending updates require `editToken`
- C-03: open-day requires accessCode or editToken
- X-01/X-02: email requires admin JWT; upload requires editToken
- X-04: `TESTING_MODE` env (default false)
- A-05: rate limit on admin login (and createFree/promo/upload)
- M-02: pending vs purchased calendar ids in localStorage

Run: `cd apps/e-advent-api && npm test` (and frontend/panel/app `npm test`).
