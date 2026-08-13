# Raport testów bezpieczeństwa e-advent

**Data:** 2026-08-11  
**Środowisko:** lokalne testy automatyczne (Jest/Vitest/node:test) + audyt kodu  
**Zakres:** API (`apps/e-advent-api`), WWW (`apps/e-advent-frontend`), Panel (`apps/e-advent-panel`), App (`apps/e-advent-app`)

---

## Podsumowanie wykonawcze

| Suite | Wynik |
|-------|-------|
| `intaz-server` Jest | **43 passed** (w tym `test.failing` = znane luki, suite zielony) |
| `e-advent` Vitest | **8 passed** |
| `e-advent-panel` Vitest | **3 passed** |
| `e-advent-app` node:test | **3 passed** |

**Werdykt bezpieczeństwa:** krytyczne luki płatności i aktywacji darmowej są **potwierdzone automatycznie**. Część kontroli cen i auth admina działa poprawnie i jest spięta UT.

### Top 5 krytycznych findings

1. **Pay-01** — `POST /calendars/createFree` aktywuje kalendarz bez weryfikacji kodu promocyjnego  
2. **P-02** — kwota walidowana względem `metadata.sku` z klienta, nie SKU z DB kalendarza (downgrade scratch→interactive)  
3. **Pay-03/04** — klient może ustawić `status: succeeded` przy create/update  
4. **P-03** — waluta ≠ `pln` omija porównanie kwoty z katalogiem  
5. **C-02 / C-01** — brak auth użytkownika: publiczny GET + PUT pending = IDOR / nadpisanie

---

## Matryca wyników

| ID | Obszar | Wynik | Dowód | Ryzyko |
|----|--------|-------|-------|--------|
| P-01 | Cena | **PASS** | `tests/security/price-tampering.test.js` — amount≠katalog → 400 | — |
| P-02 | Cena/SKU | **FAIL** | `test.failing` w `payment-bypass.test.js` | Critical |
| P-03 | Waluta | **FAIL** | `test.failing` P-03 | High |
| P-04 | SKU | **PASS** | unknown SKU → 400 | — |
| P-05 | productId/status | **PASS** | brak / 404 / succeeded → reject | — |
| P-06 | WWW DevTools | **MANUAL** | checklista | High (zależne od P-01..03) |
| Pay-01 | createFree | **FAIL** | `test.failing` Pay-01 | Critical |
| Pay-02 | free+scratch | **MANUAL** | brak server-side product scope | High |
| Pay-03 | status spoof create | **FAIL** | characterization + failing secure test | Critical |
| Pay-04 | status spoof update | **FAIL** | ten sam mechanizm statusu | Critical |
| Pay-05 | webhook sig | **PASS** | invalid signature → 400 | — |
| Pay-06 | fake confirm | **PASS** | brak `Calendar.updateCalendar` | — |
| Pay-07 | Stripe happy | **MANUAL** | checklista / Stripe Test Mode | — |
| Pay-08 | promo endpoint | **PASS** | rabat100 valid; inne false | Medium (brak limitów) |
| A-01 | Admin no token | **PASS** | 401 | — |
| A-02 | JWT tamper/expiry | **PASS** | 401 | — |
| A-03 | Panel UI bypass | **MANUAL** | checklista (API i tak 401) | Low |
| A-04 | Bearer null | **PASS** | 401 | — |
| A-05 | Rate limit login | **FAIL** | `test.failing` A-05 | Medium |
| A-06 | Token w LS | **PASS\*** | UT panel clearCredentials; ryzyko XSS pozostaje | Medium |
| A-07 | JWT secret ≠ default | **PASS** | w test env / `.env` ustawiony | — |
| C-01 | Public GET | **FAIL\*** | characterization: 200 + email | High (obscurity) |
| C-02 | PUT pending IDOR | **FAIL** | `test.failing` | Critical |
| C-03 | open day w/o proof | **FAIL** | `test.failing` | High |
| C-04 | Client ID ignored | **FAIL** | `test.failing` — ID z body akceptowane | High |
| C-05 | Collision no overwrite | **PASS** | already exists → error | — |
| C-06 | Bad access code | **PASS** | 404, brak payload | — |
| C-07 | App ID from API | **PASS** | `accessSession` UT | — |
| M-01..03 | Multi zakup | **PARTIAL** | API: 2 create → 2 UUID PASS; LS global `calendarId` overwrite RISK | High |
| M-04 | Multi-tab | **MANUAL** | last-write-wins | Medium |
| M-05 | LS spoof ID | **FAIL** | wynika z C-02 | High |
| M-06 | Product-scoped keys | **PASS** | Vitest creatorStorage | — |
| X-01 | Email no auth | **FAIL** | `test.failing` | Critical |
| X-02 | Upload no auth | **FAIL** | `test.failing` | High |
| X-03 | Promo enum | **PASS** | brak listy kodów | Low |
| X-04 | testingMode/CORS | **FAIL** | `testingMode === true` | High (prod) |
| X-05 | Health secrets | **PASS** | brak sk_/password w body | — |

\*FAIL\* = nie spełnia oczekiwanego bezpiecznego zachowania (nawet jeśli „działa jak zaprojektowano”).

---

## Findings (FAIL) — szczegóły

### F-01 Pay-01 — Darmowa aktywacja bez promo
- **Endpoint:** `POST /api/v1/calendars/createFree`
- **Repro:** utwórz pending calendar → `POST { calendarId, email }` bez kodu  
- **Impact:** dowolny znany `calendarId` → `succeeded` + access code na email atakującego  
- **Fix:** wymagać i zużywać serwerowy promo (jednorazowy); ograniczyć do `interactive` + `pending`

### F-02 P-02 — Downgrade SKU / ceny
- **Endpoint:** `POST /api/v1/stripe/create-payment-intent`
- **Repro:** calendar DB `sku=scratch-a3`, body `amount:9, metadata.sku:interactive`  
- **Impact:** płatność 9 PLN za produkt 84 PLN  
- **Fix:** `sku` i `amount` wyłącznie z `calendar.data.sku` / `getProductPrice`

### F-03 P-03 — Bypass walutą
- **Repro:** `currency: eur`, `amount: 1`  
- **Impact:** pominięcie checku `amount === expected` (tylko dla `pln`)  
- **Fix:** wymusić `pln` lub walidować kwotę zawsze

### F-04 Pay-03/04 — Spoof status
- **Endpoint:** `POST/PUT /calendars`  
- **Impact:** ominięcie maszyny stanów płatności  
- **Fix:** ignorować client `status`; zawsze `pending` do webhooka/createFree (po walidacji)

### F-05 C-02/C-04/M-05 — IDOR i client ID
- **Impact:** nadpisanie cudzego pending; forced ID  
- **Fix:** server-only UUID; ownership token / signed edit key dla pending; nie ufać `localStorage.calendarId`

### F-06 X-01/X-02 — Otwarty email i upload
- **Impact:** spam relay / abuse storage  
- **Fix:** `authAdmin` lub signed upload token + rate limit

### F-07 X-04 — `testingMode = true`
- **Plik:** `intaz-server/config/app.js`  
- **Impact:** CORS `origin: true`  
- **Fix:** `false` w produkcji; ENV-driven

### F-08 A-05 — Brak rate limit logowania
- **Fix:** express-rate-limit na `/admin/login`, `createFree`, `/promocodes`

### F-09 M-02 — Globalne `localStorage.calendarId`
- **Impact:** drugi zakup nadpisuje referencję do pierwszego w przeglądarce (DB zwykle OK jeśli nowe UUID)  
- **Fix:** `calendarIds[]` / per-session; przy starcie creatora czyść paid ID

---

## Potwierdzone zabezpieczenia (PASS) + UT

| Zabezpieczenie | Test |
|----------------|------|
| Katalog cen 9 / 64 / 84 | `intaz-server/tests/unit/products.test.js` |
| Zła kwota PLN odrzucona | `tests/security/price-tampering.test.js` P-01 |
| Nieznany SKU odrzucony | P-04 |
| Brak/nieistniejący/paid productId | P-05* |
| Webhook bez podpisu | Pay-05 |
| confirm-payment nie unlockuje kalendarza | Pay-06 |
| Admin bez JWT → 401 | A-01, A-02, A-04 |
| Złe hasło admina | A-06 |
| Collision ID bez overwrite | C-05 |
| Zły access code | C-06 |
| Paid calendar nieedytowalny | C-succeeded-lock |
| Product-scoped LS keys | `e-advent/.../creatorStorage.test.ts` |
| Panel logout czyści token | `e-advent-panel/.../authSlice.test.ts` |
| App: sesja tylko po API id | `e-advent-app/utils/__tests__/accessSession.test.js` |
| Health bez sekretów | X-05 |

Uruchomienie:
```bash
cd apps/e-advent-api && npm test
cd apps/e-advent-frontend && npm test
cd apps/e-advent-panel && npm test
cd apps/e-advent-app && npm test
```

Znane luki: `tests/security/*.test.js` — bloki `known * vulns` z `test.failing`. Po fixie usuń `.failing` i przenieś do zielonej suite.

---

## Brakujące UT (backlog U-01…U-18)

| # | Brakujący UT | Priorytet | Status |
|---|--------------|-----------|--------|
| U-01 | Kwota zawsze z DB SKU | P0 | brak (red P-02) |
| U-02 | Waluta tylko PLN | P0 | brak (red P-03) |
| U-03 | createFree + serwerowy promo | P0 | brak (red Pay-01) |
| U-04 | Client nie ustawia status | P0 | brak (red Pay-03) |
| U-05 | Rate limit login/createFree/promo | P1 | brak (red A-05) |
| U-06 | Email/upload auth | P1 | brak (red X-01/X-02) |
| U-07 | Access code entropy + lockout | P1 | brak |
| U-08 | CORS production allowlist | P1 | brak (red X-04) |
| U-09 | JWT secret fail-fast jeśli default | P0 | częściowo A-07 |
| U-10 | Multi-calendar `calendarIds[]` | P1 | characterization LS only |
| U-11 | IDOR policy (access na GET/open) | P1 | brak (red C-02/C-03) |
| U-12 | Webhook re-verify amount vs SKU | P0 | brak |
| U-13 | Promo expiry / max uses / scope | P1 | brak |
| U-14 | Panel token refresh / idle | P2 | brak |
| U-15 | App cleartext / pinning note | P2 | brak |
| U-16 | E2E Playwright 3 zakupy | P1 | checklista manualna |
| U-17 | confirm ≠ activate bez webhook | P0 | **jest** Pay-06 |
| U-18 | Order nie nadpisuje obcego productId | P0 | częściowo przez pending check |

---

## Rekomendacje priorytetowe

### P0 (natychmiast)
1. Zablokować / zabezpieczyć `createFree` (promo serwerowy + scope)  
2. Wiązać cenę i SKU z rekordem kalendarza  
3. Ignorować client `status`  
4. Wymusić PLN (lub pełną walidację)  
5. Webhook: ponowna weryfikacja kwoty vs katalog przed unlock  
6. `testingMode=false` w produkcji; JWT secret obowiązkowy z ENV  

### P1
7. Auth na email/upload lub signed tokens  
8. Rate limiting  
9. Ownership / edit-token dla pending calendars  
10. Naprawa globalnego `calendarId` w LS  
11. E2E Playwright multi-purchase  

### P2
12. httpOnly cookie dla admin JWT zamiast localStorage  
13. Silniejsze access codes + lockout  
14. Idle timeout panelu  

---

## Checklista manualna

Zobacz: [manual-security-checklist.md](./manual-security-checklist.md)

---

## Artefakty dodane w tej kampanii

- `intaz-server/jest.config.js`, `tests/**`  
- `docs/security-test-report.md` (szablon)  
- `docs/security-test-report-2026-08-11.md` (ten plik)  
- `docs/manual-security-checklist.md`  
- UT WWW / panel / app jak wyżej  
