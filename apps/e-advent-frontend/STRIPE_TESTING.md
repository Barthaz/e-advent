# Dokumentacja testowania płatności Stripe

## 📋 Jak Stripe przekierowuje po płatności

Po zakończeniu płatności w Stripe Checkout, użytkownik jest przekierowywany na stronę sukcesu z następującymi parametrami w URL:

### Parametry URL po udanej płatności:

```
https://twoja-domena.pl/sukces?session_id=cs_test_xxxxx&payment_status=paid
```

### Parametry URL po anulowanej płatności:

```
https://twoja-domena.pl/sukces?session_id=cs_test_xxxxx&payment_status=canceled
```

### Główne parametry Stripe:

1. **`session_id`** (lub `checkout_session_id`)
   - ID sesji checkout w Stripe
   - Format: `cs_test_xxxxx` (test) lub `cs_live_xxxxx` (produkcja)
   - Używane do weryfikacji statusu płatności

2. **`payment_intent`** (lub `payment_intent_client_secret`)
   - ID intencji płatności
   - Format: `pi_xxxxx`
   - Alternatywny sposób weryfikacji

3. **`payment_status`**
   - Status płatności: `paid`, `canceled`, `failed`
   - Używany do szybkiej weryfikacji

## 🔧 Konfiguracja Stripe Payment Link

W panelu Stripe, dla Twojego Payment Link (`aFacN7dsL2iqbYvduQew800`), ustaw:

### Success URL:
```
https://twoja-domena.pl/sukces
```

### Cancel URL:
```
https://twoja-domena.pl/platnosc-blad
```

Lub dodaj w URL Payment Link:
```
https://buy.stripe.com/aFacN7dsL2iqbYvduQew800?success_url=https://twoja-domena.pl/sukces&cancel_url=https://twoja-domena.pl/platnosc-blad
```

## 🧪 Jak testować

### Test 1: Symulacja udanej płatności

1. Przejdź do strony checkout: `https://twoja-domena.pl/platnosc`
2. Kliknij "Zapłać 9 zł"
3. W Stripe Checkout użyj **testowej karty**:
   - **Numer karty:** `4242 4242 4242 4242`
   - **Data wygaśnięcia:** dowolna przyszła data (np. `12/34`)
   - **CVC:** dowolne 3 cyfry (np. `123`)
   - **ZIP:** dowolny kod (np. `12345`)
4. Ukończ płatność
5. Stripe przekieruje na: `https://twoja-domena.pl/sukces?session_id=cs_test_xxxxx&payment_status=paid`
6. Aplikacja zweryfikuje płatność i pokaże stronę sukcesu

### Test 2: Symulacja anulowanej płatności

1. Przejdź do strony checkout
2. Kliknij "Zapłać 9 zł"
3. W Stripe Checkout kliknij "Anuluj" lub zamknij okno
4. Stripe przekieruje na: `https://twoja-domena.pl/sukces?session_id=cs_test_xxxxx&payment_status=canceled`
5. Aplikacja wykryje anulowanie i przekieruje na `/platnosc-blad`

### Test 3: Bezpośrednie wejście na sukces (test bez Stripe)

1. Wejdź bezpośrednio na: `https://twoja-domena.pl/sukces`
2. Aplikacja sprawdzi parametry URL
3. **W trybie deweloperskim:** pozwoli na dostęp (dla testów)
4. **W produkcji:** przekieruje na `/platnosc-blad` jeśli brak parametrów Stripe

### Test 4: Test z błędną kartą

1. W Stripe Checkout użyj karty która zostanie odrzucona:
   - **Numer karty:** `4000 0000 0000 0002` (odrzucona)
   - Ukończ formularz
2. Stripe pokaże błąd
3. Po ponownej próbie może przekierować na cancel URL

## 🔍 Testowanie w kodzie

### Sprawdzenie parametrów URL w konsoli:

```javascript
// W konsoli przeglądarki na stronie /sukces
const urlParams = new URLSearchParams(window.location.search);
console.log('Session ID:', urlParams.get('session_id'));
console.log('Payment Intent:', urlParams.get('payment_intent'));
console.log('Payment Status:', urlParams.get('payment_status'));
```

### Testowe karty Stripe:

| Opis | Numer karty | Oczekiwany rezultat |
|------|-------------|---------------------|
| Sukces | `4242 4242 4242 4242` | Płatność udana |
| Odrzucona | `4000 0000 0000 0002` | Błąd płatności |
| Wymaga uwierzytelnienia | `4000 0025 0000 3155` | Wymaga 3D Secure |
| Niewystarczające środki | `4000 0000 0000 9995` | Błąd płatności |

Więcej testowych kart: https://stripe.com/docs/testing

## 🛠️ Implementacja weryfikacji (do rozbudowy)

### Obecna implementacja (zamockowana):

W pliku `src/pages/Success.tsx` funkcja `verifyPayment()` jest zamockowana:

```typescript
const verifyPayment = async (sessionId, paymentIntent) => {
  // TODO: Prawdziwa weryfikacja przez backend
  // const response = await fetch(`/api/verify-payment?session_id=${sessionId}`);
  // return response.json().verified;
  
  // Na razie: symulacja
  return true; // Jeśli są parametry Stripe
};
```

### Prawdziwa implementacja (do dodania):

**Backend endpoint (np. `/api/verify-payment`):**

```javascript
// Przykład w Node.js/Express
app.get('/api/verify-payment', async (req, res) => {
  const { session_id } = req.query;
  
  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    
    return res.json({
      verified: session.payment_status === 'paid',
      status: session.payment_status,
      amount: session.amount_total,
    });
  } catch (error) {
    return res.status(400).json({ verified: false, error: error.message });
  }
});
```

**Frontend:**

```typescript
const verifyPayment = async (sessionId: string) => {
  const response = await fetch(`/api/verify-payment?session_id=${sessionId}`);
  const data = await response.json();
  return data.verified && data.status === 'paid';
};
```

## 📊 Tracking zdarzeń

Aplikacja automatycznie wysyła eventy do Google Analytics:

- `checkout_button_clicked` - kliknięcie przycisku płatności
- `email_sent` - wysłanie emaila z linkiem do kalendarza
- `payment_verified` - weryfikacja płatności (do dodania)

## ⚠️ Ważne uwagi

1. **Weryfikacja na backendzie:** Nigdy nie ufaj tylko parametrom URL! Zawsze weryfikuj przez backend z Stripe API.

2. **Webhooki:** Dla produkcji rozważ użycie Stripe Webhooks do weryfikacji płatności po stronie serwera.

3. **Bezpieczeństwo:** W produkcji zmień `verifyPayment()` aby wymagało parametrów Stripe:
   ```typescript
   if (!hasStripeParams) {
     resolve(false); // Wymaga parametrów Stripe
   }
   ```

4. **Testowanie:** W trybie deweloperskim możesz pozwolić na dostęp bez parametrów, ale w produkcji zawsze weryfikuj.

## 🔗 Przydatne linki

- [Stripe Testing Cards](https://stripe.com/docs/testing)
- [Stripe Checkout Sessions](https://stripe.com/docs/api/checkout/sessions)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Payment Links](https://stripe.com/docs/payment-links)

---

**Data aktualizacji:** 2025-01-29

