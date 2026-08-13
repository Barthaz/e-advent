# Checklisty manualne — Faza 5 (www / panel / app)

Wykonać na staging + Stripe Test Mode. Zaznacz `[x]` po weryfikacji.

## WWW (`e-advent`)

- [ ] Flow interactive: creator → checkout → Stripe test card → Success → email/kod → `/kalendarz/:id`
- [ ] Flow scratch A4: design + shipping → płatność 64 PLN → Success
- [ ] Flow scratch A3: design + shipping → płatność 84 PLN → Success
- [ ] Promo `rabat100` tylko dla interactive → `createFree` (do czasu fixu: weryfikuj, że nie da się aktywować scratch za darmo z UI)
- [ ] DevTools Network: podmiana `amount` w `create-payment-intent` → API 400 (P-06)
- [ ] DevTools Network: `metadata.sku=interactive` przy scratch-a3 + amount 9 → **obecnie przechodzi (P-02 FAIL)** — potwierdź i zgłoś
- [ ] Trzy kolejne zakupy bez czyszczenia przeglądarki (M-01…M-03): trzy osobne rekordy w panelu/DB; Success nie gubi pierwszego access code z emaila
- [ ] Success page: poprawny link / ID dla ostatniego zakupu
- [ ] Ręczna podmiana `localStorage.calendarId` na cudzy pending UUID → save nie powinien psuć paid; pending = IDOR (M-05)

## Panel (`e-advent-panel`)

- [ ] Login poprawnymi danymi
- [ ] Logout czyści dostęp; odświeżenie nie wraca do sesji
- [ ] Wygaśnięcie tokena (lub cofnięcie zegara `expiresAt` w LS) → redirect / 401
- [ ] Bezpośredni URL `/orders` bez tokena → brak danych (Network 401)
- [ ] DevTools: usunięcie `AuthGuard` / podmiana UI nie daje danych bez Bearer (A-03)
- [ ] Lista zamówień, detail, patch fulfillment

## App (`e-advent-app`)

- [ ] Otwarcie kalendarza emailem + kodem z maila
- [ ] Zły kod → brak dostępu, brak zapisu sesji
- [ ] Otwieranie dni działa online
- [ ] AsyncStorage: podmiana „calendar id” (jeśli gdzieś trzymany) nie otwiera cudzego bez kodu
- [ ] Offline: lokalne opened days nie nadpisują cudzego kalendarza

## API smoke (opcjonalnie curl/Postman)

- [ ] `GET /api/v1/health` — bez sekretów
- [ ] `POST /api/v1/admin/orders` bez tokena → 401
- [ ] `POST /api/v1/calendars/createFree` bez promo → **obecnie 200 (Pay-01 FAIL)**
- [ ] Webhook Stripe bez podpisu → 400
