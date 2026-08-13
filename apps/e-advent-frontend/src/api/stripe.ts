// Mock obsługa Stripe Checkout (do przyszłej implementacji)

export async function createCheckoutSession(_calendarId: string, _amount: number) {
  // W prawdziwej aplikacji tutaj byłoby połączenie z backendem/Stripe API
  return {
    sessionId: `mock_session_${Date.now()}`,
    url: '/success',
  };
}

export function redirectToCheckout(sessionUrl: string) {
  // W prawdziwej aplikacji przekierowanie do Stripe Checkout
  window.location.href = sessionUrl;
}

