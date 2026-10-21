const SESSION_KEY = 'e-advent-checkout-token';

export function getCheckoutToken(): string {
  const saved = sessionStorage.getItem(SESSION_KEY);
  if (saved && /^[a-f0-9]{64}$/.test(saved)) return saved;
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('');
  sessionStorage.setItem(SESSION_KEY, token);
  return token;
}

export function finishCheckout(paymentIntentId: string): void {
  if (sessionStorage.getItem(`e-advent-checkout-owner:${paymentIntentId}`) === sessionStorage.getItem(SESSION_KEY)) {
    sessionStorage.removeItem(SESSION_KEY);
  }
}
