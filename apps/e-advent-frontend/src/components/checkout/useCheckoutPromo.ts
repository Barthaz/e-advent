import { useCallback, useEffect, useRef, useState } from 'react';
import { validatePromoCode } from '../../api/api';
import { isSupportedDiscountPercent } from '../../config/products';
import { CHECKOUT_PROMO_KEY } from '../../utils/checkoutDetails';

function savedCode() {
  try { return sessionStorage.getItem(CHECKOUT_PROMO_KEY) || ''; } catch { return ''; }
}
function remember(code: string) {
  try {
    if (code) sessionStorage.setItem(CHECKOUT_PROMO_KEY, code);
    else sessionStorage.removeItem(CHECKOUT_PROMO_KEY);
  } catch { /* ignore */ }
}

/** Persist only the code between steps; always verify its value with the API. */
export function useCheckoutPromo() {
  const [code, setCode] = useState(savedCode);
  const [discount, setDiscount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(() => Boolean(savedCode()));
  const current = useRef(code);
  const request = useRef(0);
  const pending = useRef<string | null>(null);
  const applied = useRef<string | null>(null);

  const change = useCallback((next: string) => {
    current.current = next;
    request.current++;
    pending.current = null;
    applied.current = null;
    setCode(next); setDiscount(null); setError(null); setChecking(false);
    remember('');
  }, []);

  const apply = useCallback(async () => {
    const value = current.current.trim();
    if (!value || pending.current === value || applied.current === value) return;
    const id = ++request.current;
    pending.current = value;
    setChecking(true); setError(null);
    try {
      const result = await validatePromoCode(value);
      if (id !== request.current) return;
      if (!result.success || !result.valid || typeof result.discount !== 'number' || !isSupportedDiscountPercent(result.discount)) {
        throw new Error(result.message || 'Nieprawidłowy kod promocyjny');
      }
      applied.current = value;
      setDiscount(result.discount);
      remember(value);
    } catch (err) {
      if (id !== request.current) return;
      setDiscount(null); remember('');
      setError(err instanceof Error && !(err instanceof TypeError) ? err.message : 'Nie udało się sprawdzić kodu. Sprawdź internet i spróbuj ponownie.');
    } finally {
      if (id === request.current) { pending.current = null; setChecking(false); }
    }
  }, []);

  useEffect(() => {
    if (current.current) void apply();
    return () => { request.current++; pending.current = null; };
  }, [apply]);

  return { code, discount, error, checking, change, apply };
}
export type CheckoutPromo = ReturnType<typeof useCheckoutPromo>;
