# Dokumentacja płatności Stripe

## Jak działa płatność - Przepływ (Flow)

1. **Frontend** → Wysyła żądanie utworzenia płatności do backendu
2. **Backend** → Tworzy Payment Intent w Stripe i zapisuje w bazie danych
3. **Backend** → Zwraca `clientSecret` i `paymentIntentId` do frontendu
4. **Frontend** → Używa Stripe.js do potwierdzenia płatności użytkownika
5. **Stripe** → Przetwarza płatność i wysyła webhook do backendu
6. **Backend** → Aktualizuje status płatności w bazie danych na podstawie webhooka

---

## Endpointy API

### 1. Utworzenie intencji płatności

**Endpoint:** `POST /api/stripe/create-payment-intent`

**Opis:** Tworzy nową intencję płatności w Stripe i zapisuje ją w bazie danych.

#### Request Body

```json
{
  "amount": 100.00,
  "currency": "pln",
  "customerEmail": "customer@example.com",
  "orderId": "order_12345",
  "data": {
    "calendarData": {
      "days": [
        {
          "day": 1,
          "content": "Treść dnia 1",
          "image": "url_do_obrazu"
        }
      ]
    }
  },
  "metadata": {
    "productName": "Produkt XYZ"
  }
}
```

#### Parametry

| Parametr | Typ | Wymagane | Opis |
|----------|-----|----------|------|
| `amount` | Number | ✅ Tak | Kwota płatności (w jednostkach waluty, np. 100.00 dla 100 PLN) |
| `currency` | String | ❌ Nie | Kod waluty (domyślnie: "pln") |
| `customerEmail` | String (email) | ✅ Tak | Email klienta |
| `orderId` | String | ❌ Nie | Unikalny identyfikator zamówienia |
| `data` | Object | ❌ Nie | Dane kalendarza adwentowego (JSON) - zapisywane w bazie danych |
| `metadata` | Object | ❌ Nie | Dodatkowe metadane (np. productName) - zapisywane również w Stripe |

#### Response (Success - 200)

```json
{
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxxxxxxxxxxxx"
}
```

#### Response (Error - 400)

```json
{
  "errors": [
    {
      "msg": "Amount must be a number",
      "param": "amount",
      "location": "body"
    }
  ]
}
```

#### Przykład użycia (JavaScript/Fetch)

```javascript
const createPaymentIntent = async (amount, customerEmail, orderId, calendarData, metadata = {}) => {
  try {
    const response = await fetch('http://localhost:3000/api/stripe/create-payment-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount,
        currency: 'pln',
        customerEmail: customerEmail,
        orderId: orderId, // Opcjonalnie
        data: calendarData, // Dane kalendarza adwentowego (JSON)
        metadata: metadata
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to create payment intent');
    }

    return data; // { clientSecret, paymentIntentId }
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};
```

---

### 2. Potwierdzenie płatności

**Endpoint:** `POST /api/stripe/confirm-payment`

**Opis:** Sprawdza status płatności w Stripe i aktualizuje go w bazie danych. **Uwaga:** Ten endpoint służy do weryfikacji statusu. Rzeczywiste potwierdzenie płatności odbywa się przez Stripe.js na frontendzie.

#### Request Body

```json
{
  "paymentIntentId": "pi_xxxxxxxxxxxxx"
}
```

#### Parametry

| Parametr | Typ | Wymagane | Opis |
|----------|-----|----------|------|
| `paymentIntentId` | String | ✅ Tak | ID Payment Intent z Stripe |

#### Response (Success - 200)

```json
{
  "status": "succeeded",
  "payment": {
    "id": "pi_xxxxxxxxxxxxx",
    "object": "payment_intent",
    "amount": 10000,
    "currency": "pln",
    "status": "succeeded",
    ...
  }
}
```

#### Możliwe statusy:
- `pending` - Płatność oczekuje
- `succeeded` - Płatność zakończona sukcesem
- `failed` - Płatność nieudana
- `canceled` - Płatność anulowana

#### Przykład użycia

```javascript
const confirmPayment = async (paymentIntentId) => {
  try {
    const response = await fetch('http://localhost:3000/api/stripe/confirm-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentIntentId: paymentIntentId
      })
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};
```

---

### 3. Sprawdzenie statusu płatności

**Endpoint:** `GET /api/stripe/payment/:paymentIntentId`

**Opis:** Pobiera informacje o płatności z bazy danych i aktualny status z Stripe.

#### URL Parameters

| Parametr | Typ | Wymagane | Opis |
|----------|-----|----------|------|
| `paymentIntentId` | String | ✅ Tak | ID Payment Intent z Stripe |

#### Response (Success - 200)

```json
{
  "payment": {
    "_id": "507f1f77bcf86cd799439011",
    "stripePaymentIntentId": "pi_xxxxxxxxxxxxx",
    "amount": 100,
    "currency": "pln",
    "status": "succeeded",
    "customerEmail": "customer@example.com",
    "metadata": {
      "orderId": "12345",
      "productName": "Produkt XYZ"
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "stripeStatus": "succeeded"
}
```

#### Response (Error - 404)

```json
{
  "error": "Payment not found"
}
```

#### Przykład użycia

```javascript
const getPaymentStatus = async (paymentIntentId) => {
  try {
    const response = await fetch(`http://localhost:3000/api/stripe/payment/${paymentIntentId}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};
```

---

### 4. Webhook Stripe

**Endpoint:** `POST /api/stripe/webhook`

**Opis:** Endpoint do odbierania zdarzeń z Stripe. **Nie używać bezpośrednio z frontendu!** Stripe automatycznie wysyła tu zdarzenia.

#### Konfiguracja webhooka w Stripe Dashboard

1. Przejdź do: **Developers** → **Webhooks**
2. Kliknij **Add endpoint**
3. URL endpoint: `https://twoja-domena.com/api/stripe/webhook`
4. Wybierz eventy do nasłuchiwania:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Skopiuj **Signing secret** i dodaj do `.env` jako `STRIPE_WEBHOOK_SECRET`

#### Obsługiwane eventy

| Event | Opis | Akcja |
|-------|------|-------|
| `payment_intent.succeeded` | Płatność zakończona sukcesem | Aktualizuje status w bazie na `succeeded`, pobiera dane kalendarza i wysyła email z linkiem do kalendarza |
| `payment_intent.payment_failed` | Płatność nieudana | Aktualizuje status w bazie na `failed` |

#### Szczegóły obsługi `payment_intent.succeeded`

Gdy płatność zakończy się sukcesem, webhook automatycznie:

1. **Aktualizuje status płatności** w bazie danych na `succeeded`
2. **Pobiera dane paymentu** z bazy danych (po `stripePaymentIntentId`)
3. **Pobiera dane kalendarza** z bazy danych (po `productId` z paymentu)
4. **Generuje link do kalendarza** w formacie: `${FRONTEND_URL}/calendar/${calendarId}`
5. **Wysyła email** do klienta z:
   - Tytułem kalendarza
   - Linkiem do kalendarza (przycisk + tekst)
   - Potwierdzeniem udanej płatności

**Wymagane zmienne środowiskowe:**
- `FRONTEND_URL` - URL do frontendu (domyślnie: `http://localhost:3000`)
- `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM` - konfiguracja emaila

**Logi:**
Webhook loguje szczegółowe informacje o każdym kroku przetwarzania:
- Odebranie webhooka
- Aktualizacja statusu płatności
- Pobranie danych paymentu i kalendarza
- Generowanie linku
- Wysłanie emaila

#### Response

```json
{
  "received": true
}
```

---

## Implementacja na Frontendzie

### Kompletny przykład z Stripe.js

```html
<!DOCTYPE html>
<html>
<head>
  <title>Stripe Payment</title>
  <script src="https://js.stripe.com/v3/"></script>
</head>
<body>
  <div id="payment-form">
    <div id="card-element"></div>
    <button id="submit-button">Zapłać</button>
    <div id="payment-status"></div>
  </div>

  <script>
    // Inicjalizacja Stripe (użyj swojego publishable key)
    const stripe = Stripe('pk_test_your_publishable_key_here');
    const elements = stripe.elements();
    const cardElement = elements.create('card');
    cardElement.mount('#card-element');

    const submitButton = document.getElementById('submit-button');
    const statusDiv = document.getElementById('payment-status');

    submitButton.addEventListener('click', async () => {
      try {
        // 1. Utwórz Payment Intent na backendzie
        const paymentData = await fetch('http://localhost:3000/api/stripe/create-payment-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: 100.00,
            currency: 'pln',
            customerEmail: 'customer@example.com',
            metadata: {
              orderId: '12345'
            }
          })
        });

        const { clientSecret, paymentIntentId } = await paymentData.json();

        // 2. Potwierdź płatność przez Stripe
        const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: cardElement,
            billing_details: {
              email: 'customer@example.com',
            }
          }
        });

        if (error) {
          // Płatność nieudana
          statusDiv.textContent = `Błąd: ${error.message}`;
          statusDiv.style.color = 'red';
        } else if (paymentIntent.status === 'succeeded') {
          // Płatność udana
          statusDiv.textContent = 'Płatność zakończona sukcesem!';
          statusDiv.style.color = 'green';
          
          // Opcjonalnie: sprawdź status na backendzie
          const statusCheck = await fetch(`http://localhost:3000/api/stripe/payment/${paymentIntentId}`);
          const statusData = await statusCheck.json();
          console.log('Payment status:', statusData);
        }
      } catch (error) {
        console.error('Error:', error);
        statusDiv.textContent = `Błąd: ${error.message}`;
        statusDiv.style.color = 'red';
      }
    });
  </script>
</body>
</html>
```

### Przykład z React

```jsx
import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';

const stripePromise = loadStripe('pk_test_your_publishable_key_here');

const PaymentForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      // 1. Utwórz Payment Intent
      const response = await fetch('http://localhost:3000/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: 100.00,
          currency: 'pln',
          customerEmail: 'customer@example.com',
        })
      });

      const { clientSecret, paymentIntentId } = await response.json();

      // 2. Potwierdź płatność
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
        }
      });

      if (error) {
        setStatus(`Błąd: ${error.message}`);
      } else if (paymentIntent.status === 'succeeded') {
        setStatus('Płatność zakończona sukcesem!');
      }
    } catch (error) {
      setStatus(`Błąd: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <CardElement />
      <button type="submit" disabled={!stripe || loading}>
        {loading ? 'Przetwarzanie...' : 'Zapłać'}
      </button>
      {status && <div>{status}</div>}
    </form>
  );
};

const App = () => {
  return (
    <Elements stripe={stripePromise}>
      <PaymentForm />
    </Elements>
  );
};

export default App;
```

---

## Model danych Payment

### Struktura w MongoDB

```javascript
{
  _id: ObjectId,
  stripePaymentIntentId: String,  // ID z Stripe (unique)
  amount: Number,                  // Kwota (np. 100.00)
  currency: String,                // Waluta (domyślnie: "pln")
  status: String,                  // "pending" | "succeeded" | "failed" | "canceled"
  customerEmail: String,           // Email klienta
  orderId: String,                 // Unikalny identyfikator zamówienia
  data: Object,                    // Dane kalendarza adwentowego (JSON)
  metadata: Map<String, String>,  // Dodatkowe metadane
  createdAt: Date,                 // Data utworzenia
  updatedAt: Date                  // Data aktualizacji
}
```

---

## Statusy płatności

| Status | Opis | Kiedy występuje |
|--------|------|-----------------|
| `pending` | Oczekuje | Po utworzeniu Payment Intent, przed potwierdzeniem |
| `succeeded` | Zakończona sukcesem | Po udanej płatności (webhook `payment_intent.succeeded`) |
| `failed` | Nieudana | Gdy płatność się nie powiodła (webhook `payment_intent.payment_failed`) |
| `canceled` | Anulowana | Gdy płatność została anulowana |

---

## Ważne uwagi

1. **Kwota:** Backend automatycznie konwertuje kwotę na centy (mnoży przez 100) przed wysłaniem do Stripe
2. **Webhook:** Zawsze weryfikuj podpis webhooka używając `STRIPE_WEBHOOK_SECRET`
3. **Bezpieczeństwo:** Nigdy nie używaj `STRIPE_SECRET_KEY` na frontendzie - tylko `STRIPE_PUBLISHABLE_KEY`
4. **Testowanie:** Użyj testowych kluczy Stripe (zaczynających się od `sk_test_` i `pk_test_`)
5. **Webhook w development:** Użyj Stripe CLI do przekierowania webhooków lokalnie:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

---

## Przykładowy przepływ płatności

```
1. Użytkownik wybiera produkt (100 PLN)
   ↓
2. Frontend: POST /api/stripe/create-payment-intent
   Body: { amount: 100, currency: "pln", customerEmail: "user@example.com" }
   ↓
3. Backend: Tworzy Payment Intent w Stripe, zapisuje w DB
   Response: { clientSecret: "pi_xxx_secret_xxx", paymentIntentId: "pi_xxx" }
   ↓
4. Frontend: stripe.confirmCardPayment(clientSecret, { payment_method: {...} })
   ↓
5. Stripe: Przetwarza płatność
   ↓
6. Stripe: Wysyła webhook do /api/stripe/webhook
   Event: payment_intent.succeeded
   ↓
7. Backend: Aktualizuje status w DB na "succeeded"
   ↓
8. Frontend: Sprawdza status przez GET /api/stripe/payment/:paymentIntentId
   Response: { status: "succeeded", ... }
```

---

## Testowanie

### Testowe karty kredytowe Stripe

| Numer karty | Rezultat |
|-------------|----------|
| `4242 4242 4242 4242` | Sukces |
| `4000 0000 0000 0002` | Odrzucona |
| `4000 0000 0000 9995` | Wymaga 3D Secure |

**CVV:** Dowolny 3-cyfrowy numer (np. 123)  
**Data ważności:** Dowolna przyszła data (np. 12/25)  
**Kod pocztowy:** Dowolny (np. 12345)

---

## Troubleshooting

### Problem: "Webhook signature verification failed"
**Rozwiązanie:** Sprawdź czy `STRIPE_WEBHOOK_SECRET` w `.env` jest poprawny i odpowiada webhookowi w Stripe Dashboard.

### Problem: "Amount must be a number"
**Rozwiązanie:** Upewnij się, że wysyłasz `amount` jako liczbę, nie string (np. `100.00` zamiast `"100.00"`).

### Problem: Płatność nie aktualizuje się w bazie
**Rozwiązanie:** Sprawdź czy webhook jest poprawnie skonfigurowany w Stripe Dashboard i czy endpoint jest dostępny publicznie (lub użyj Stripe CLI do testowania lokalnie).

