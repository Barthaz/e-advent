import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import FestivePage from '../components/FestivePage';
import ContentCard from '../components/ContentCard';
import LoadingState from '../components/LoadingState';
import { validateCalendarConfiguration, buildCalendarTasks } from '../utils/calendarGenerator';
import { textToCatalogTaskId } from '../utils/catalogTaskIds';
import { createPaymentIntent, createCalendar, type InternalCalendarData, validatePromoCode, createFreeCalendar } from '../api/api';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import PriceBreakdown from '../components/PriceBreakdown';
import { getProduct, getProductPrice, formatPrice, isPhysicalProduct, PHYSICAL_FULFILLMENT_TIME, computeOrderTotals } from '../config/products';
import ShippingForm, { emptyShippingAddress, validateShippingAddress } from '../components/checkout/ShippingForm';
import type { ProductType, ShippingAddress } from '../types/order';
import { getActiveProduct, getStorageKeys, loadShipping, saveShipping, loadCheckoutCalendarData, resolveCheckoutProduct, getReusablePendingCalendarId, getPendingCalendarSession, setPendingCalendarSession, getPurchasedCalendarIds, markCalendarPurchased, PENDING_EDIT_TOKEN_KEY, PURCHASED_CALENDAR_IDS_KEY } from '../utils/creatorStorage';
import { CART_STORAGE_KEY, loadCart, getCartTotals, cartItemCheckoutKey, cartItemToCheckoutItem, getCartItemDisplayName, type CartItem } from '../utils/cartStorage';
import { trackBeginCheckout, saveGaPurchasePayload } from '../utils/analytics';

/** Survives React Strict Mode remounts — prevents duplicate create-payment-intent calls */
const checkoutPaymentInitCache: {
  key: string | null;
  promise: Promise<{ clientSecret: string; paymentIntentId: string }> | null;
  result: { clientSecret: string; paymentIntentId: string } | null;
} = { key: null, promise: null, result: null };

const CHECKOUT_ORDER_ID_KEY = 'e-advent-checkout-order-id';

function getStableCheckoutOrderId(fingerprint: string): string {
  try {
    const raw = sessionStorage.getItem(CHECKOUT_ORDER_ID_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { fingerprint?: string; orderId?: string };
      if (parsed.fingerprint === fingerprint && parsed.orderId) {
        return parsed.orderId;
      }
    }
  } catch {
    /* ignore */
  }
  const orderId = `order_cart_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  try {
    sessionStorage.setItem(CHECKOUT_ORDER_ID_KEY, JSON.stringify({ fingerprint, orderId }));
  } catch {
    /* ignore */
  }
  return orderId;
}

function isValidCheckoutEmail(email: string | undefined | null): boolean {
  return Boolean(email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
}

// Funkcja pomocnicza do generowania kalendarza (fallback)
// Uwaga: Ta funkcja jest używana tylko w przypadku braku zapisanego kalendarza z localStorage
// W normalnym flow kalendarz powinien być zapisany w Creator.tsx
async function generateCalendarFallback(calendarData: {
  tasks?: CalendarTask[];
  selectedExampleSets?: number[];
}): Promise<Array<{
  day: number;
  task: string;
  duration?: number;
  lockedDay?: number;
  latestDay?: number;
}>> {
  const examplesData = await import('../data/examples.json');
  const examples = ('default' in examplesData ? examplesData.default : examplesData) as Array<{
    tasks?: string[];
    [key: string]: unknown;
  }>;

  return buildCalendarTasks(
    calendarData.tasks || [],
    Array.isArray(examples) ? examples : [],
    calendarData.selectedExampleSets || [],
    textToCatalogTaskId
  );
}

interface CalendarTask {
  task: string;
  duration?: number;
  lockedDay?: number;
  latestDay?: number;
}

interface CalendarData {
  name: string;
  email: string;
  calendarTitle: string;
  tasks: CalendarTask[];
  dailyEmailReminders: boolean;
  dates?: string[];
  productType?: ProductType;
  sku?: string;
  format?: string;
  design?: { source: string; presetId?: string; imageUrl: string };
  selectedExampleSets?: number[];
  openingMethod?: 'app' | 'email' | 'online';
  dailyContentEmail?: string;
}

const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
if (!STRIPE_PUBLISHABLE_KEY) {
  throw new Error(
    'Missing VITE_STRIPE_PUBLISHABLE_KEY — set it in apps/e-advent-frontend/.env (must match API TESTING_MODE)'
  );
}

// Funkcja do pobierania IP klienta
async function getClientIP(): Promise<string | null> {
  try {
    // Próbuj pobrać IP z zewnętrznego serwisu
    const response = await fetch('https://api.ipify.org?format=json');
    if (response.ok) {
      const data = await response.json();
      return data.ip || null;
    }
  } catch (error) {
    console.warn('[Payment] Nie można pobrać IP klienta:', error);
  }
  return null;
}

// Komponent formularza płatności używający Stripe Elements
function PaymentForm({ 
  clientSecret, 
  paymentIntentId, 
  onError,
  isFree,
  onCreateFreeCalendar,
  payAmount,
}: { 
  clientSecret: string; 
  paymentIntentId: string;
  onError: (error: string) => void;
  isFree: boolean;
  onCreateFreeCalendar: () => Promise<void>;
  payAmount: number;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Walidacja checkboxów akceptacji
    if (!acceptTerms) {
      onError('Musisz zaakceptować regulamin, aby kontynuować.');
      return;
    }

    if (!acceptPrivacy) {
      onError('Musisz zaakceptować politykę prywatności, aby kontynuować.');
      return;
    }

    // Jeśli kalendarz jest za darmo (kod 100%), utwórz kalendarz przez API
    if (isFree) {
      setIsProcessing(true);
      console.log('[Payment] Kalendarz za darmo - tworzę kalendarz przez API...');
      try {
        await onCreateFreeCalendar();
        // onCreateFreeCalendar powinien przekierować użytkownika
      } catch (error) {
        console.error('[Payment] Błąd podczas tworzenia darmowego kalendarza:', error);
        onError(error instanceof Error ? error.message : 'Wystąpił błąd podczas tworzenia kalendarza');
        setIsProcessing(false);
      }
      return;
    }

    if (!stripe || !elements) {
      console.warn('[Payment] Stripe lub Elements nie są gotowe');
      return;
    }

    setIsProcessing(true);
    console.log('[Payment] Rozpoczynanie procesu płatności...');

    // Pobierz IP klienta i zapisz dane o akceptacji
    const clientIP = await getClientIP();
    const acceptanceTimestamp = new Date().toISOString();
    
    // Zapisz dane o akceptacji w localStorage, aby można było je przesłać po płatności
    const acceptanceData = {
      termsAccepted: true,
      privacyAccepted: true,
      termsAcceptedAt: acceptanceTimestamp,
      privacyAcceptedAt: acceptanceTimestamp,
      clientIP: clientIP,
    };
    
    try {
      localStorage.setItem('acceptanceData', JSON.stringify(acceptanceData));
      console.log('[Payment] Zapisano dane o akceptacji:', acceptanceData);
    } catch (error) {
      console.warn('[Payment] Nie można zapisać danych o akceptacji:', error);
    }

    const returnUrl = `${window.location.origin}/sukces?payment_intent=${paymentIntentId}`;
    
    try {
      // WAŻNE: Najpierw wywołaj elements.submit() aby zwalidować formularz
      console.log('[Payment] Walidacja formularza płatności (elements.submit())...');
      const { error: submitError } = await elements.submit();
      
      if (submitError) {
        console.error('[Payment] Błąd walidacji formularza:', submitError);
        onError(submitError.message || 'Błąd walidacji formularza płatności');
        setIsProcessing(false);
        return;
      }

      console.log('[Payment] Formularz zwalidowany pomyślnie, potwierdzanie płatności...');
      
      // Teraz wywołaj confirmPayment
      const { error } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: returnUrl,
        },
      });

      if (error) {
        console.error('[Payment] Błąd podczas potwierdzania płatności:', error);
        onError(error.message || 'Failed to confirm payment');
        setIsProcessing(false);
      } else {
        console.log('[Payment] Płatność potwierdzona, przekierowywanie...');
        // Stripe automatycznie przekieruje do return_url
      }
    } catch (error) {
      console.error('[Payment] Błąd w procesie płatności:', error);
      onError(error instanceof Error ? error.message : 'Wystąpił błąd podczas przetwarzania płatności');
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {!isFree && (
        <div className="panel-bordered">
          <PaymentElement />
        </div>
      )}
      
      {/* Checkboxy akceptacji regulaminu i polityki prywatności */}
      <div className="space-y-4">
        <div className="flex items-start">
          <input
            type="checkbox"
            id="acceptTerms"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            className="checkbox-field"
            required
          />
          <label htmlFor="acceptTerms" className="text-sm text-gray-700 cursor-pointer">
            Akceptuję{' '}
            <a
              href="/regulamin"
              target="_blank"
              rel="noopener noreferrer"
              className="link-inline"
              onClick={(e) => e.stopPropagation()}
            >
              regulamin
            </a>
            {' '}*
          </label>
        </div>
        
        <div className="flex items-start">
          <input
            type="checkbox"
            id="acceptPrivacy"
            checked={acceptPrivacy}
            onChange={(e) => setAcceptPrivacy(e.target.checked)}
            className="checkbox-field"
            required
          />
          <label htmlFor="acceptPrivacy" className="text-sm text-gray-700 cursor-pointer">
            Akceptuję{' '}
            <a
              href="/polityka-prywatnosci"
              target="_blank"
              rel="noopener noreferrer"
              className="link-inline"
              onClick={(e) => e.stopPropagation()}
            >
              politykę prywatności
            </a>
            {' '}*
          </label>
        </div>
        
        <p className="text-xs text-gray-500">
          * Pola wymagane. Kliknij na linki, aby zapoznać się z pełną treścią regulaminu i polityki prywatności.
        </p>
      </div>
      
      <button
        type="submit"
        disabled={
          isFree 
            ? (isProcessing || !acceptTerms || !acceptPrivacy)
            : (!stripe || !elements || isProcessing || !acceptTerms || !acceptPrivacy)
        }
        className={`btn-green-gradient ${
          (isFree
            ? isProcessing || !acceptTerms || !acceptPrivacy
            : !stripe || !elements || isProcessing || !acceptTerms || !acceptPrivacy)
            ? 'btn-disabled'
            : ''
        }`}
      >
        {isProcessing ? (
          <>
            <i className="fas fa-spinner fa-spin mr-2"></i>
            Przetwarzanie...
          </>
        ) : isFree ? (
          <>
            <i className="fas fa-gift mr-2"></i>
            Stwórz swój kalendarz
          </>
        ) : (
          <>
            <i className="fas fa-credit-card mr-2"></i>
            Zapłać {formatPrice(payAmount)}
          </>
        )}
      </button>
    </form>
  );
}

export default function Checkout() {
  const navigate = useNavigate();
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [stripePromise] = useState(() => loadStripe(STRIPE_PUBLISHABLE_KEY));
  const [promoCode, setPromoCode] = useState<string>('');
  const [promoCodeDiscount, setPromoCodeDiscount] = useState<number | null>(null);
  const [promoCodeError, setPromoCodeError] = useState<string | null>(null);
  const [isCheckingPromoCode, setIsCheckingPromoCode] = useState(false);
  const [sku, setSku] = useState('interactive');
  const [productType, setProductType] = useState<ProductType>('interactive');
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>(emptyShippingAddress());
  const [shippingErrors, setShippingErrors] = useState<Partial<Record<keyof ShippingAddress, string>>>({});
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [letterOnly, setLetterOnly] = useState(false);
  /** Physical products from cart (scratch, letters) — one order, shipping at checkout */
  const [cartMode, setCartMode] = useState(false);

  /** Blokada przed pętlą createCalendar + createPaymentIntent w useEffect */
  const paymentInitLockRef = useRef(false);
  const paymentInitKeyRef = useRef<string | null>(null);
  const lastSyncedShippingRef = useRef<string | null>(null);

  const orderTotals = computeOrderTotals(
    cartItems.length > 0
      ? cartItems.map((i) => ({ sku: i.sku, quantity: i.quantity }))
      : [{ sku, quantity: 1 }],
  );
  const product = getProduct(sku);
  const totalPrice = orderTotals?.total ?? getProductPrice(sku) ?? 9;
  const shippingCost = orderTotals?.shipping ?? 0;
  const subtotal = orderTotals?.subtotal ?? (product?.basePrice ?? 9);
  const isPhysical = orderTotals?.hasPhysical ?? isPhysicalProduct(sku);
  const isFree = productType === 'interactive' && promoCodeDiscount === 100 && !cartMode && !letterOnly;

  /** Synchronous address check — never fire create-payment-intent with empty shipping */
  const shippingAddressComplete = useMemo(() => {
    if (!isPhysical) return true;
    return Object.keys(validateShippingAddress(shippingAddress)).length === 0;
  }, [isPhysical, shippingAddress]);

  const emailReady = isValidCheckoutEmail(calendarData?.email);

  useEffect(() => {
    const cookieConsent = localStorage.getItem('cookieConsent');
    const savedCartRaw = localStorage.getItem(CART_STORAGE_KEY);
    const cart = loadCart().filter((item) => {
      const p = getProduct(item.sku);
      // Interactive never goes through cart
      return p != null && p.type !== 'interactive';
    });
    const data = loadCheckoutCalendarData();
    const active = getActiveProduct();
    let parsedData: CalendarData | null = null;
    if (data) {
      try {
        parsedData = JSON.parse(data) as CalendarData;
      } catch {
        parsedData = null;
      }
    }
    const resolved = parsedData ? resolveCheckoutProduct(parsedData, active) : null;
    const isInteractiveCheckout = Boolean(resolved?.productType === 'interactive' && parsedData);

    // ── Cart checkout (scratch + letter) ───────────────────────────────────
    if (!isInteractiveCheckout && cart.length > 0) {
      const onlyLetters = cart.every(
        (i) => i.sku === 'santa-letter' || i.sku === 'santa-certificate',
      );
      const firstSku = cart[0].sku;
      const firstProduct = getProduct(firstSku);
      const emailFromCart = cart.find((i) => i.customerEmail)?.customerEmail?.trim() || '';
      const nameFromCart = cart.find((i) => i.customerName)?.customerName?.trim() || '';

      setCartMode(true);
      setLetterOnly(onlyLetters);
      setCartItems(cart);
      setSku(firstSku);
      setProductType(firstProduct?.type || (onlyLetters ? 'letter' : 'scratch'));
      setCalendarData({
        name: nameFromCart,
        email: emailFromCart,
        calendarTitle: onlyLetters ? 'List do Świętego Mikołaja' : 'Zamówienie e-Advent',
        tasks: [],
        dailyEmailReminders: false,
        productType: firstProduct?.type || 'letter',
        sku: firstSku,
      });

      const savedShipping = loadShipping('letter') || loadShipping('scratch');
      if (savedShipping) {
        setShippingAddress(savedShipping);
      }
      if (cookieConsent) localStorage.setItem('cookieConsent', cookieConsent);
      if (savedCartRaw) localStorage.setItem(CART_STORAGE_KEY, savedCartRaw);

      trackBeginCheckout({
        value: getCartTotals(cart)?.total ?? 0,
        items: cart.map((i) => ({
          sku: i.sku,
          name: i.label || getProduct(i.sku)?.name || i.sku,
          price: i.unitPrice ?? getProduct(i.sku)?.basePrice ?? 0,
          quantity: i.quantity,
        })),
      });
      return;
    }

    // ── Interactive direct checkout (bypass cart) ──────────────────────────
    if (!isInteractiveCheckout || !parsedData || !resolved) {
      navigate(cart.length === 0 ? '/koszyk' : '/koszyk');
      return;
    }

    const pt = resolved.productType;
    const pendingSession = getPendingCalendarSession();
    const reusablePendingId = getReusablePendingCalendarId();
    const purchasedIds = getPurchasedCalendarIds();
    const GENERATED_CALENDAR_KEY = getStorageKeys(pt).generatedCalendar;
    const generatedCalendar = localStorage.getItem(GENERATED_CALENDAR_KEY) || localStorage.getItem('e-advent-generated-calendar');
    const savedTasks = localStorage.getItem(getStorageKeys(pt).tasks) || localStorage.getItem('e-advent-tasks');
    const savedSelectedExamples = localStorage.getItem(getStorageKeys(pt).selectedExamples) || localStorage.getItem('e-advent-selected-examples');

    try {
      localStorage.clear();
    } catch (error) {
      console.warn('[Checkout] Nie można wyczyścić localStorage:', error);
    }

    if (cookieConsent) localStorage.setItem('cookieConsent', cookieConsent);
    // Preserve physical cart while paying for interactive separately
    if (savedCartRaw) localStorage.setItem(CART_STORAGE_KEY, savedCartRaw);
    if (purchasedIds.length) localStorage.setItem(PURCHASED_CALENDAR_IDS_KEY, JSON.stringify(purchasedIds));
    if (reusablePendingId && pendingSession) {
      setPendingCalendarSession(pendingSession.calendarId, pendingSession.editToken);
    }
    if (savedTasks) localStorage.setItem(getStorageKeys(pt).tasks, savedTasks);
    if (savedSelectedExamples) localStorage.setItem(getStorageKeys(pt).selectedExamples, savedSelectedExamples);

    const normalizedData: CalendarData = {
      ...parsedData,
      tasks: parsedData.tasks || [],
      productType: resolved.productType,
      sku: resolved.sku,
    };
    const normalizedJson = JSON.stringify(normalizedData);

    localStorage.setItem('calendarData', normalizedJson);
    localStorage.setItem(getStorageKeys(resolved.productType).calendarData, normalizedJson);
    localStorage.setItem('e-advent-product-type', resolved.productType);
    localStorage.setItem('e-advent-sku', resolved.sku);
    if (generatedCalendar) {
      localStorage.setItem(getStorageKeys(resolved.productType).generatedCalendar, generatedCalendar);
      localStorage.setItem('e-advent-generated-calendar', generatedCalendar);
    }

    setCartMode(false);
    setLetterOnly(false);
    setCalendarData(normalizedData);
    setProductType(resolved.productType);
    setSku(resolved.sku);
    setCartItems([{
      id: 'checkout-interactive',
      sku: resolved.sku,
      quantity: 1,
      label: getProduct(resolved.sku)?.name,
    }]);

    if (parsedData.tasks?.length > 0) {
      const validation = validateCalendarConfiguration(parsedData.tasks);
      setValidationError(validation.valid ? null : (validation.error || 'Nie można wygenerować kalendarza.'));
    }

    trackBeginCheckout({
      value: getProductPrice(resolved.sku) ?? 9,
      items: [{
        sku: resolved.sku,
        name: getProduct(resolved.sku)?.name || resolved.sku,
        price: getProduct(resolved.sku)?.basePrice ?? 9,
        quantity: 1,
      }],
    });
  }, [navigate]);

  useEffect(() => {
    // Wait until checkout data is loaded — avoid treating default interactive sku as "no shipping needed"
    if (!calendarData) {
      setShippingErrors({});
      return;
    }
    if (!isPhysical) {
      setShippingErrors({});
      return;
    }
    const errors = validateShippingAddress(shippingAddress);
    setShippingErrors(errors);
    const valid = Object.keys(errors).length === 0;
    if (valid) {
      saveShipping(cartMode ? 'scratch' : productType, shippingAddress);
      if (cartMode) saveShipping('letter', shippingAddress);
    }
  }, [shippingAddress, isPhysical, productType, cartMode, calendarData]);

  // Utwórz Payment Intent raz na zestaw danych (bez pętli przy re-renderach)
  useEffect(() => {
    let cancelled = false;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const initializePayment = async () => {
      if (!calendarData) return;

      // Gate API on live address/email — never send create-payment-intent early for physical
      if (isPhysical && !shippingAddressComplete) {
        return;
      }
      if (!isValidCheckoutEmail(calendarData.email)) {
        return;
      }

      // Stable key: cart/email/amount — shipping updates reuse the same pending payment on backend
      const cartFingerprint = cartMode
        ? cartItems.map((i) => cartItemCheckoutKey(i)).join('|')
        : `${sku}:1`;
      const initKey = cartMode
        ? `cart:${calendarData.email}:${totalPrice}:${cartFingerprint}`
        : `cal:${calendarData.email}:${sku}:${totalPrice}`;

      // Zmiana danych wejściowych (email / kwota / koszyk) → reset i jedna nowa inicjalizacja
      if (paymentInitKeyRef.current && paymentInitKeyRef.current !== initKey) {
        paymentInitLockRef.current = false;
        paymentInitKeyRef.current = null;
        if (checkoutPaymentInitCache.key !== initKey) {
          checkoutPaymentInitCache.key = null;
          checkoutPaymentInitCache.promise = null;
          checkoutPaymentInitCache.result = null;
        }
        if (clientSecret) {
          setClientSecret(null);
          setPaymentIntentId(null);
          return;
        }
      }

      // Mamy już Payment Intent — nie twórz kolejnych kalendarzy/zamówień
      if (clientSecret) {
        return;
      }

      // Reuse in-flight / completed init across Strict Mode remounts
      if (checkoutPaymentInitCache.key === initKey && checkoutPaymentInitCache.result) {
        setClientSecret(checkoutPaymentInitCache.result.clientSecret);
        setPaymentIntentId(checkoutPaymentInitCache.result.paymentIntentId);
        paymentInitLockRef.current = true;
        paymentInitKeyRef.current = initKey;
        return;
      }
      if (checkoutPaymentInitCache.key === initKey && checkoutPaymentInitCache.promise) {
        try {
          const result = await checkoutPaymentInitCache.promise;
          if (!cancelled) {
            setClientSecret(result.clientSecret);
            setPaymentIntentId(result.paymentIntentId);
            paymentInitLockRef.current = true;
            paymentInitKeyRef.current = initKey;
          }
        } catch {
          /* error handled by the original initiator */
        }
        return;
      }

      // Inicjalizacja w toku — nie odpalaj równolegle (Strict Mode / race)
      if (paymentInitLockRef.current) {
        return;
      }

      // ── Cart checkout: one order for all physical items (no new calendars) ──
      if (cartMode) {
        const missingCalendar = cartItems.some((item) => {
          const p = getProduct(item.sku);
          return Boolean(p?.requiresDesign && !item.calendarId);
        });
        if (missingCalendar) {
          setPaymentError('W koszyku brakuje danych kalendarza. Wróć do kreatora zdrapki i dodaj produkt ponownie.');
          return;
        }

        paymentInitLockRef.current = true;
        paymentInitKeyRef.current = initKey;

        const runCartPaymentInit = async () => {
          setPaymentError(null);
          const orderId = getStableCheckoutOrderId(initKey);
          const items = cartItems.map((i) => cartItemToCheckoutItem(i));
          const primaryCalendarId = cartItems.find((i) => i.calendarId)?.calendarId;
          const paymentIntent = await createPaymentIntent({
            amount: totalPrice,
            currency: 'pln',
            customerEmail: calendarData.email,
            orderId,
            ...(primaryCalendarId ? { productId: primaryCalendarId } : {}),
            items,
            shippingAddress,
            metadata: {
              productType: productType,
              sku,
              itemCount: String(cartItems.length),
              cartCheckout: '1',
              clientOrderId: orderId,
            },
          });
          localStorage.setItem('paymentIntentId', paymentIntent.paymentIntentId);
          localStorage.setItem('orderId', orderId);
          if (paymentIntent.orderNumber) {
            localStorage.setItem('orderNumber', paymentIntent.orderNumber);
          }
          localStorage.setItem('orderAmount', String(totalPrice));
          localStorage.setItem('e-advent-sku', sku);
          saveGaPurchasePayload({
            transactionId: paymentIntent.paymentIntentId,
            value: totalPrice,
            shipping: shippingCost,
            items: cartItems.map((i) => ({
              sku: i.sku,
              name: i.label || getProduct(i.sku)?.name || i.sku,
              price: i.unitPrice ?? getProduct(i.sku)?.basePrice ?? 0,
              quantity: i.quantity,
            })),
          });
          return {
            clientSecret: paymentIntent.clientSecret,
            paymentIntentId: paymentIntent.paymentIntentId,
          };
        };

        const promise = runCartPaymentInit();
        checkoutPaymentInitCache.key = initKey;
        checkoutPaymentInitCache.promise = promise;
        checkoutPaymentInitCache.result = null;

        try {
          const result = await promise;
          checkoutPaymentInitCache.result = result;
          lastSyncedShippingRef.current = JSON.stringify(shippingAddress);
          if (!cancelled) {
            setClientSecret(result.clientSecret);
            setPaymentIntentId(result.paymentIntentId);
          }
        } catch (err) {
          checkoutPaymentInitCache.key = null;
          checkoutPaymentInitCache.promise = null;
          checkoutPaymentInitCache.result = null;
          paymentInitLockRef.current = false;
          paymentInitKeyRef.current = null;
          if (!cancelled) {
            const message = err instanceof Error ? err.message : 'Błąd płatności';
            const isShippingError = /shipping|adres|wysyłk/i.test(message);
            setPaymentError(
              isShippingError
                ? 'Uzupełnij dane do wysyłki, aby sfinalizować płatność.'
                : message
            );
          }
        }
        return;
      }

      paymentInitLockRef.current = true;
      paymentInitKeyRef.current = initKey;

      console.log('[Payment] Inicjalizacja płatności (interaktywny)...');
      setPaymentError(null);

      const runInteractivePaymentInit = async () => {
        const existingCalendarId = getReusablePendingCalendarId();
        console.log('[Payment] Sprawdzam istniejący calendarId:', existingCalendarId);

        const orderId = existingCalendarId
          ? `order_update_${existingCalendarId}`
          : getStableCheckoutOrderId(initKey);

        let previewLayout = null;
        try {
          const savedLayout = localStorage.getItem('previewLayout');
          if (savedLayout) {
            previewLayout = JSON.parse(savedLayout);
          }
        } catch (e) {
          console.warn('[Payment] Nie można załadować previewLayout:', e);
        }

        let openedDays: number[] = [];
        try {
          const previewStorageKeys = [
            'calendarPreview_openedDays',
            'e-advent-preview-opened',
          ];

          for (const key of previewStorageKeys) {
            const previewStorage = localStorage.getItem(key);
            if (previewStorage) {
              const parsed = JSON.parse(previewStorage);
              if (Array.isArray(parsed)) {
                openedDays = parsed.filter((d): d is number => typeof d === 'number');
                break;
              }
            }
          }
        } catch (e) {
          console.warn('[Payment] Nie można załadować statusu otwartych zadań:', e);
        }

        const GENERATED_CALENDAR_KEY = getStorageKeys(productType).generatedCalendar;
        const savedGeneratedCalendar = localStorage.getItem(GENERATED_CALENDAR_KEY) || localStorage.getItem('e-advent-generated-calendar');

        let generatedTasks: Array<{
          day: number;
          task: string;
          duration?: number;
          lockedDay?: number;
          latestDay?: number;
        }> = [];

        if (savedGeneratedCalendar) {
          try {
            const generatedCalendar: Array<{ day: number; task: string; duration?: number; latestDay?: number }> = JSON.parse(savedGeneratedCalendar);
            generatedTasks = generatedCalendar.map(({ day, task, duration, latestDay, catalogTaskId }) => ({
              day,
              task,
              duration,
              ...(catalogTaskId ? { catalogTaskId } : {}),
              ...(latestDay !== undefined ? { latestDay } : {}),
            }));
          } catch (error) {
            console.error('[Payment] Błąd podczas wczytywania wygenerowanego kalendarza:', error);
            generatedTasks = await generateCalendarFallback(calendarData);
          }
        } else {
          console.warn('[Payment] Brak zapisanego wygenerowanego kalendarza, generuję na nowo');
          generatedTasks = await generateCalendarFallback(calendarData);
        }

        generatedTasks = generatedTasks.sort((a, b) => a.day - b.day);

        const calendarDataToSave: InternalCalendarData = {
          name: calendarData.name,
          email: calendarData.email,
          calendarTitle: calendarData.calendarTitle,
          tasks: generatedTasks,
          dates: calendarData.dates || [],
          dailyEmailReminders: calendarData.dailyEmailReminders || calendarData.openingMethod === 'email',
          openingMethod: calendarData.openingMethod,
          dailyContentEmail:
            calendarData.openingMethod === 'email'
              ? (calendarData.dailyContentEmail || calendarData.email)
              : undefined,
          previewLayout: previewLayout,
          openedDays: openedDays,
          productType: calendarData.productType || productType,
          sku: calendarData.sku || sku,
          format: calendarData.format as InternalCalendarData['format'],
          design: calendarData.design as InternalCalendarData['design'],
        };

        console.log('[Payment] Zapisuję kalendarz w bazie...', {
          isUpdate: !!existingCalendarId,
          calendarId: existingCalendarId,
        });

        const calendarResponse = await createCalendar(calendarDataToSave, existingCalendarId || undefined);
        const finalCalendarId = calendarResponse.calendar?.id;
        const editToken = calendarResponse.editToken || localStorage.getItem(PENDING_EDIT_TOKEN_KEY);

        if (!finalCalendarId || finalCalendarId.trim() === '') {
          throw new Error('Nie otrzymano calendarId z backendu. Nie można kontynuować płatności.');
        }
        if (!editToken) {
          throw new Error('Nie otrzymano editToken z backendu. Nie można bezpiecznie kontynuować płatności.');
        }

        setPendingCalendarSession(finalCalendarId, editToken);

        const paymentAmount = totalPrice;

        const paymentIntentData = {
          amount: paymentAmount,
          currency: 'pln',
          customerEmail: calendarData.email,
          orderId: orderId,
          productId: finalCalendarId,
          items: [{
            sku,
            quantity: 1,
            calendarId: finalCalendarId,
          }],
          metadata: {
            productName: calendarData.calendarTitle,
            productType: calendarData.productType || productType,
            sku: calendarData.sku || sku,
            clientOrderId: orderId,
          },
        };

        if (!paymentIntentData.orderId || paymentIntentData.orderId.trim() === '') {
          throw new Error('orderId jest wymagany, ale nie został podany');
        }

        const paymentIntent = await createPaymentIntent(paymentIntentData);

        localStorage.setItem('paymentIntentId', paymentIntent.paymentIntentId);
        localStorage.setItem('orderId', orderId);
        if (paymentIntent.orderNumber) {
          localStorage.setItem('orderNumber', paymentIntent.orderNumber);
        }
        localStorage.setItem('orderAmount', String(paymentAmount));
        localStorage.setItem('e-advent-sku', sku);
        saveGaPurchasePayload({
          transactionId: paymentIntent.paymentIntentId,
          value: paymentAmount,
          shipping: 0,
          items: [{
            sku,
            name: getProduct(sku)?.name || sku,
            price: getProduct(sku)?.basePrice ?? paymentAmount,
            quantity: 1,
            category: 'interactive',
          }],
        });

        try {
          localStorage.removeItem('calendarData');
        } catch (error) {
          console.warn('[Checkout] Nie można usunąć calendarData:', error);
        }

        return {
          clientSecret: paymentIntent.clientSecret,
          paymentIntentId: paymentIntent.paymentIntentId,
        };
      };

      const promise = runInteractivePaymentInit();
      checkoutPaymentInitCache.key = initKey;
      checkoutPaymentInitCache.promise = promise;
      checkoutPaymentInitCache.result = null;

      try {
        const result = await promise;
        checkoutPaymentInitCache.result = result;
        if (!cancelled) {
          setClientSecret(result.clientSecret);
          setPaymentIntentId(result.paymentIntentId);
        }
      } catch (error) {
        console.error('[Payment] Błąd podczas inicjalizacji płatności:', error);
        checkoutPaymentInitCache.key = null;
        checkoutPaymentInitCache.promise = null;
        checkoutPaymentInitCache.result = null;
        paymentInitLockRef.current = false;
        paymentInitKeyRef.current = null;

        if (cancelled) return;

        const isNetworkError = error instanceof Error && (
          error.message.includes('Failed to fetch') ||
          error.message.includes('NetworkError') ||
          error.message.includes('Network request failed') ||
          error.message.includes('ERR_CONNECTION_REFUSED') ||
          error.message.includes('ERR_INTERNET_DISCONNECTED')
        );

        if (isNetworkError) {
          setPaymentError(
            'Ups! Mamy chwilowy problem z połączeniem z serwerem. ' +
            'Nasz zespół już nad tym pracuje, aby magia świąt Cię nie ominęła! 🎄✨\n\n' +
            'Spróbuj odświeżyć stronę za chwilę lub sprawdź swoje połączenie internetowe.'
          );
        } else {
          setPaymentError(
            error instanceof Error
              ? error.message
              : 'Wystąpił błąd podczas inicjalizacji płatności. Spróbuj odświeżyć stronę.'
          );
        }
      }
    };

    // Debounce so address/email typing and Strict Mode double-mount don't spam the API
    debounceTimer = setTimeout(() => {
      void initializePayment();
    }, 450);

    return () => {
      cancelled = true;
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [calendarData, clientSecret, shippingAddressComplete, isPhysical, totalPrice, productType, sku, shippingAddress, cartMode, cartItems]);

  // After Payment Intent exists, push shipping address updates without creating a new order row
  useEffect(() => {
    if (!cartMode || !isPhysical || !clientSecret || !calendarData) return;
    if (!shippingAddressComplete || !isValidCheckoutEmail(calendarData.email)) return;

    const shippingKey = JSON.stringify(shippingAddress);
    if (lastSyncedShippingRef.current === shippingKey) return;

    const timer = setTimeout(() => {
      const orderId = getStableCheckoutOrderId(
        `cart:${calendarData.email}:${totalPrice}:${cartItems.map((i) => cartItemCheckoutKey(i)).join('|')}`
      );
      const items = cartItems.map((i) => cartItemToCheckoutItem(i));
      const primaryCalendarId = cartItems.find((i) => i.calendarId)?.calendarId;
      void createPaymentIntent({
        amount: totalPrice,
        currency: 'pln',
        customerEmail: calendarData.email,
        orderId,
        ...(primaryCalendarId ? { productId: primaryCalendarId } : {}),
        items,
        shippingAddress,
        metadata: {
          productType,
          sku,
          itemCount: String(cartItems.length),
          cartCheckout: '1',
          clientOrderId: orderId,
          shippingUpdate: '1',
        },
      })
        .then((paymentIntent) => {
          lastSyncedShippingRef.current = shippingKey;
          if (paymentIntent.orderNumber) {
            localStorage.setItem('orderNumber', paymentIntent.orderNumber);
          }
        })
        .catch(() => {
          /* non-blocking — pay flow still works with address captured at first successful init */
        });
    }, 600);

    return () => clearTimeout(timer);
  }, [shippingAddress, shippingAddressComplete, cartMode, isPhysical, clientSecret, calendarData, totalPrice, cartItems, productType, sku]);

  // Funkcja do sprawdzania kodu promocyjnego
  const handlePromoCodeBlur = async () => {
    if (!promoCode || promoCode.trim() === '') {
      setPromoCodeError(null);
      setPromoCodeDiscount(null);
      return;
    }

    setIsCheckingPromoCode(true);
    setPromoCodeError(null);

    try {
      const response = await validatePromoCode(promoCode.trim());
      
      if (response.success && response.valid && response.discount !== undefined) {
        setPromoCodeDiscount(response.discount);
        setPromoCodeError(null);
        console.log('[PromoCode] Kod promocyjny zwalidowany:', {
          code: promoCode,
          discount: response.discount,
        });
      } else {
        setPromoCodeDiscount(null);
        setPromoCodeError(response.message || 'Nieprawidłowy kod promocyjny');
      }
    } catch (error) {
      console.error('[PromoCode] Błąd podczas sprawdzania kodu:', error);
      setPromoCodeDiscount(null);
      setPromoCodeError(error instanceof Error ? error.message : 'Wystąpił błąd podczas sprawdzania kodu');
    } finally {
      setIsCheckingPromoCode(false);
    }
  };

  // Funkcja do tworzenia darmowego kalendarza
  const handleCreateFreeCalendar = async () => {
    if (!calendarData) {
      throw new Error('Brak danych kalendarza - nie można utworzyć kalendarza');
    }

    console.log('[FreeCalendar] Tworzę darmowy kalendarz...');
    
    try {
      // Pobierz IP klienta i zapisz dane o akceptacji
      const clientIP = await getClientIP();
      const acceptanceTimestamp = new Date().toISOString();
      
      // Zapisz dane o akceptacji w localStorage, aby można było je przesłać po utworzeniu
      const acceptanceData = {
        termsAccepted: true,
        privacyAccepted: true,
        termsAcceptedAt: acceptanceTimestamp,
        privacyAcceptedAt: acceptanceTimestamp,
        clientIP: clientIP,
      };
      
      try {
        localStorage.setItem('acceptanceData', JSON.stringify(acceptanceData));
        console.log('[FreeCalendar] Zapisano dane o akceptacji:', acceptanceData);
      } catch (error) {
        console.warn('[FreeCalendar] Nie można zapisać danych o akceptacji:', error);
      }

      // Pobierz previewLayout jeśli istnieje
      let previewLayout = null;
      try {
        const savedLayout = localStorage.getItem('previewLayout');
        if (savedLayout) {
          previewLayout = JSON.parse(savedLayout);
          console.log('[FreeCalendar] Załadowano zapisany previewLayout');
        }
      } catch (e) {
        console.warn('[FreeCalendar] Nie można załadować previewLayout:', e);
      }

      // Pobierz status otwartych zadań jeśli istnieje
      let openedDays: number[] = [];
      try {
        const previewStorageKeys = [
          'calendarPreview_openedDays',
          'e-advent-preview-opened',
        ];
        
        for (const key of previewStorageKeys) {
          const previewStorage = localStorage.getItem(key);
          if (previewStorage) {
            const parsed = JSON.parse(previewStorage);
            if (Array.isArray(parsed)) {
              openedDays = parsed.filter((d): d is number => typeof d === 'number');
              console.log('[FreeCalendar] Załadowano status otwartych zadań z', key, ':', openedDays.length, 'dni');
              break;
            }
          }
        }
      } catch (e) {
        console.warn('[FreeCalendar] Nie można załadować statusu otwartych zadań:', e);
      }

      // Wczytaj wygenerowany kalendarz z localStorage
      const GENERATED_CALENDAR_KEY = 'e-advent-generated-calendar';
      const savedGeneratedCalendar = localStorage.getItem(GENERATED_CALENDAR_KEY);
      
      let generatedTasks: Array<{
        day: number;
        task: string;
        duration?: number;
        lockedDay?: number;
        latestDay?: number;
      }> = [];
      
      if (savedGeneratedCalendar) {
        try {
          const generatedCalendar: Array<{ day: number; task: string; duration?: number; latestDay?: number }> = JSON.parse(savedGeneratedCalendar);
          
          generatedTasks = generatedCalendar.map(({ day, task, duration, latestDay, catalogTaskId }) => ({
            day,
            task,
            duration,
            ...(catalogTaskId ? { catalogTaskId } : {}),
            ...(latestDay !== undefined ? { latestDay } : {}),
          }));
          
          console.log('[FreeCalendar] Użyto zapisanego wygenerowanego kalendarza z localStorage');
        } catch (error) {
          console.error('[FreeCalendar] Błąd podczas wczytywania wygenerowanego kalendarza:', error);
          generatedTasks = await generateCalendarFallback(calendarData);
        }
      } else {
        console.warn('[FreeCalendar] Brak zapisanego wygenerowanego kalendarza, generuję na nowo');
        generatedTasks = await generateCalendarFallback(calendarData);
      }

      // Sortuj zadania według dnia
      generatedTasks = generatedTasks.sort((a, b) => a.day - b.day);

      // Przygotuj pełne dane kalendarza do zapisania w bazie
      const calendarDataToSave: InternalCalendarData = {
        name: calendarData.name,
        email: calendarData.email,
        calendarTitle: calendarData.calendarTitle,
        tasks: generatedTasks,
        dates: calendarData.dates || [],
        dailyEmailReminders: calendarData.dailyEmailReminders || calendarData.openingMethod === 'email',
        openingMethod: calendarData.openingMethod,
        dailyContentEmail:
          calendarData.openingMethod === 'email'
            ? (calendarData.dailyContentEmail || calendarData.email)
            : undefined,
        previewLayout: previewLayout,
        openedDays: openedDays,
        productType: calendarData.productType || productType,
        sku: calendarData.sku || sku,
      };

      // Pobierz pending calendarId jeśli istnieje
      const existingCalendarId = getReusablePendingCalendarId();

      console.log('[FreeCalendar] Wysyłanie danych kalendarza do API...');
      console.log('[FreeCalendar] Dane kalendarza:', {
        name: calendarDataToSave.name,
        email: calendarDataToSave.email,
        calendarTitle: calendarDataToSave.calendarTitle,
        tasksCount: calendarDataToSave.tasks.length,
        hasPreviewLayout: !!previewLayout,
        openedDaysCount: openedDays.length,
        calendarId: existingCalendarId,
      });

      // Utwórz darmowy kalendarz przez API (wymaga serwerowej weryfikacji promo)
      const response = await createFreeCalendar(
        calendarDataToSave,
        existingCalendarId || undefined,
        promoCode.trim()
      );
      
      const newCalendarId = response.calendar?.id;
      if (!newCalendarId) {
        throw new Error('Nie otrzymano calendarId z backendu. Nie można kontynuować.');
      }

      console.log('[FreeCalendar] Darmowy kalendarz utworzony pomyślnie, calendarId:', newCalendarId);
      
      markCalendarPurchased(newCalendarId);

      const freeSku = calendarData.sku || sku;
      saveGaPurchasePayload({
        transactionId: `free_${newCalendarId}`,
        value: 0,
        shipping: 0,
        items: [{
          sku: freeSku,
          name: getProduct(freeSku)?.name || freeSku,
          price: 0,
          quantity: 1,
          category: 'interactive',
        }],
      });
      
      // Przekieruj do strony sukcesu z parametrem free=true aby pominąć weryfikację płatności
      navigate(`/sukces?calendar_id=${newCalendarId}&free=true`);
    } catch (error) {
      console.error('[FreeCalendar] Błąd podczas tworzenia darmowego kalendarza:', error);
      throw error;
    }
  };

  if (!calendarData) {
    return <LoadingState message="Ładowanie..." />;
  }

  return (
    <FestivePage className="py-4" maxWidth="md">
      <ContentCard padding="md" className="checkout-page">
          <h1 className="heading-page mb-8">
            Podsumowanie zamówienia
          </h1>

          {validationError && (
            <div className="alert-error mb-6">
              <h3 className="font-bold mb-2">Nie można wygenerować kalendarza</h3>
              <p>{validationError}</p>
              <button
                onClick={() => navigate('/stworz-kalendarz')}
                className="link-inline mt-3"
              >
                Wróć i popraw konfigurację →
              </button>
            </div>
          )}

          <div className="space-y-6 mb-8">
            <div className="checkout-summary-section border-b pb-4">
              <h2 className="summary-section-title">Twoje dane</h2>
              {cartMode ? (
                <div className="mt-2 space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1" htmlFor="checkout-email">
                      E-mail (potwierdzenie zamówienia)
                    </label>
                    <input
                      id="checkout-email"
                      type="email"
                      className="w-full border border-christmas-green/30 rounded px-3 py-2"
                      value={calendarData.email}
                      onChange={(e) => {
                        setCalendarData({ ...calendarData, email: e.target.value.trim() });
                        setClientSecret(null);
                        setPaymentIntentId(null);
                        paymentInitLockRef.current = false;
                        paymentInitKeyRef.current = null;
                        checkoutPaymentInitCache.key = null;
                        checkoutPaymentInitCache.promise = null;
                        checkoutPaymentInitCache.result = null;
                        lastSyncedShippingRef.current = null;
                      }}
                      placeholder="jan@example.com"
                      required
                    />
                  </div>
                  {calendarData.name ? (
                    <p className="text-sm text-gray-600"><strong>Imię:</strong> {calendarData.name}</p>
                  ) : null}
                </div>
              ) : (
                <>
                  <p><strong>Imię:</strong> {calendarData.name}</p>
                  <p><strong>Email:</strong> {calendarData.email}</p>
                </>
              )}
            </div>

            <div className="checkout-summary-section border-b pb-4">
              <h2 className="summary-section-title">Zamówienie</h2>
              {cartItems.length > 0 ? (
                <ul className="space-y-2">
                  {cartItems.map((item) => {
                    const p = getProduct(item.sku);
                    const unit = item.unitPrice ?? p?.basePrice ?? 0;
                    const displayName = getCartItemDisplayName(item);
                    return (
                      <li key={item.id} className="flex justify-between gap-3 text-sm sm:text-base">
                        <span>
                          <strong>{displayName}</strong>
                          {item.format ? ` (${item.format})` : ''}
                          {' '}× {item.quantity}
                        </span>
                        <span className="whitespace-nowrap font-medium">{formatPrice(unit * item.quantity)}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p><strong>{product?.name || 'Kalendarz adwentowy'}</strong></p>
              )}
              {calendarData.format && !cartMode && <p><strong>Format:</strong> {calendarData.format}</p>}
              {calendarData.design?.imageUrl && !cartMode && (
                <img src={calendarData.design.imageUrl} alt="Grafika" className="mt-2 max-h-24 rounded border" />
              )}
              {isPhysical && (
                <p className="mt-2 text-sm text-gray-600">
                  <i className="fas fa-clock mr-2 text-christmas-green" />
                  Czas realizacji: {PHYSICAL_FULFILLMENT_TIME}. Wysyłka: Poczta Polska.
                  {orderTotals?.freeShipping
                    ? ' Darmowa wysyłka (próg 100 zł).'
                    : null}
                </p>
              )}
              {cartMode && (
                <p className="mt-2 text-sm text-gray-500">
                  Wszystkie pozycje z koszyka zostaną opłacone jako jedno zamówienie.
                </p>
              )}
            </div>

            {!cartMode && (
            <div className="checkout-summary-section border-b pb-4">
              <h2 className="summary-section-title">Kalendarz</h2>
              <p><strong>Tytuł:</strong> {calendarData.calendarTitle}</p>
              {(
                <>
                  <p><strong>Liczba własnych zadań:</strong> {calendarData.tasks.length} / 24</p>
                  {calendarData.tasks.length > 0 && (
                    <div className="mt-2 text-sm text-gray-600">
                      <p className="mb-1"><i className="fas fa-random mr-2"></i>Zadania będą losowo przypisane do dni</p>
                      {calendarData.tasks.some(t => t.lockedDay !== undefined) && (
                        <p className="mb-1">
                          <i className="fas fa-lock mr-2 text-christmas-red"></i>
                          {calendarData.tasks.filter(t => t.lockedDay !== undefined).length} zadanie(zadań) zablokowanych na konkretne dni
                        </p>
                      )}
                      {calendarData.tasks.some(t => t.latestDay !== undefined) && (
                        <p>
                          <i className="fas fa-calendar-check mr-2 text-christmas-green"></i>
                          {calendarData.tasks.filter(t => t.latestDay !== undefined).length} zadanie(zadań) z ograniczeniem najpóźniejszej daty
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
              {(calendarData.openingMethod === 'email' || calendarData.dailyEmailReminders) && (
                <p className="text-christmas-green mt-2">
                  ✓ Codzienna treść okienka na: {calendarData.dailyContentEmail || calendarData.email}
                </p>
              )}
              {calendarData.openingMethod === 'app' && (
                <p className="text-christmas-green mt-2">✓ Otwieranie w aplikacji Android</p>
              )}
              {calendarData.openingMethod === 'online' && (
                <p className="text-christmas-green mt-2">✓ Otwieranie online przez unikalny link</p>
              )}
            </div>
            )}

            <div className="price-box">
              {isFree ? (
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold">Do zapłaty:</span>
                  <span className="text-4xl font-bold text-christmas-gold-light">0 zł</span>
                </div>
              ) : (
                <PriceBreakdown
                  basePrice={subtotal}
                  shippingCost={shippingCost}
                  variant="checkout"
                  totalLabel="Do zapłaty"
                  freeShipping={orderTotals?.freeShipping}
                />
              )}
              {promoCodeDiscount !== null && promoCodeDiscount > 0 && promoCodeDiscount < 100 && (
                <div className="mt-2 text-sm text-gray-200">
                  Zniżka: {promoCodeDiscount}%
                </div>
              )}
            </div>
          </div>

          {isPhysical && (
            <ShippingForm address={shippingAddress} onChange={setShippingAddress} errors={shippingErrors} />
          )}

          {/* Pole kodu promocyjnego — tylko interaktywny */}
          {!isPhysical && (
          <div className="panel-bordered mb-6">
            <label htmlFor="promoCode" className="block text-sm font-medium text-gray-700 mb-2">
              Kod promocyjny (opcjonalnie)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                id="promoCode"
                value={promoCode}
                onChange={(e) => {
                  setPromoCode(e.target.value);
                  setPromoCodeError(null);
                  setPromoCodeDiscount(null);
                }}
                onBlur={handlePromoCodeBlur}
                placeholder="Wpisz kod promocyjny"
                className="input-field flex-1"
                disabled={isCheckingPromoCode}
              />
              {isCheckingPromoCode && (
                <div className="flex items-center px-4">
                  <div className="spinner" style={{ width: '1.25rem', height: '1.25rem', borderWidth: '2px' }}></div>
                </div>
              )}
            </div>
            {promoCodeError && (
              <p className="mt-2 text-sm text-red-600">{promoCodeError}</p>
            )}
            {promoCodeDiscount !== null && promoCodeDiscount > 0 && !promoCodeError && (
              <p className="mt-2 text-sm text-green-600 font-semibold">
                {promoCodeDiscount === 100 ? (
                  <span className="flex items-center">
                    <i className="fas fa-gift mr-2"></i>
                    Gratulacje! Masz kalendarz za darmo! 🎉
                  </span>
                ) : (
                  `Kod promocyjny aktywny - zniżka ${promoCodeDiscount}%`
                )}
              </p>
            )}
          </div>
          )}

          {isFree && (
            <div className="bg-green-50 border-l-4 border-green-400 p-6 mb-6 rounded-lg">
              <div className="flex items-start">
                <i className="fas fa-gift text-green-500 text-2xl mr-3 mt-1"></i>
                <div>
                  <h3 className="font-bold text-green-800 mb-2 text-lg">
                    Kalendarz za darmo!
                  </h3>
                  <p className="text-green-700">
                    Twój kod promocyjny daje Ci 100% zniżki. Kliknij "Stwórz swój kalendarz" poniżej, aby dokończyć zamówienie.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="creator-form-well mb-6">
            <h3 className="font-bold mb-2 text-christmas-green">🔒 Bezpieczna płatność</h3>
            <p className="text-gray-600 text-sm">
              {isPhysical
                ? 'Po złożeniu zamówienia otrzymasz potwierdzenie na e-mail. Przygotujemy i wyślemy kalendarz na podany adres.'
                : 'Po złożeniu zamówienia otrzymasz unikalny link do swojego kalendarza na podany adres e-mail.'}
            </p>
          </div>

          {paymentError && (
            <div className="notice-amber">
              <h3 className="notice-amber-title">
                <i className="fas fa-snowflake mr-2" />
                {/wysyłk|adres|shipping/i.test(paymentError)
                  ? 'Brakuje danych do wysyłki'
                  : /połączeniem|serwerem|Failed to fetch|Network/i.test(paymentError)
                    ? 'Chwilowy problem z połączeniem'
                    : 'Nie udało się przygotować płatności'}
              </h3>
              <div className="notice-amber-body">{paymentError}</div>
              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <button onClick={() => window.location.reload()} className="btn-gold px-4 py-2 text-sm">
                  <i className="fas fa-redo" />
                  Odśwież stronę
                </button>
                <button onClick={() => setPaymentError(null)} className="btn-secondary">
                  <i className="fas fa-times" />
                  Zamknij
                </button>
              </div>
            </div>
          )}

          {clientSecret && paymentIntentId ? (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: 'stripe',
                },
              }}
            >
              <PaymentForm
                clientSecret={clientSecret}
                paymentIntentId={paymentIntentId}
                onError={setPaymentError}
                isFree={isFree}
                onCreateFreeCalendar={handleCreateFreeCalendar}
                payAmount={totalPrice}
              />
            </Elements>
          ) : isPhysical && !shippingAddressComplete ? (
            <div className="creator-form-well text-center py-8">
              <i className="fas fa-truck text-christmas-green text-2xl mb-3" />
              <p className="text-gray-700 font-medium">
                Uzupełnij dane do wysyłki, aby sfinalizować płatność.
              </p>
              <p className="text-gray-500 text-sm mt-2">
                Formularz płatności pojawi się po uzupełnieniu adresu powyżej.
              </p>
            </div>
          ) : cartMode && !emailReady ? (
            <div className="creator-form-well text-center py-8">
              <p className="text-gray-700 font-medium">
                Podaj adres e-mail, aby przygotować płatność.
              </p>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="spinner mx-auto mb-4"></div>
              <p className="text-gray-600">Przygotowywanie formularza płatności...</p>
            </div>
          )}
        </ContentCard>
    </FestivePage>
  );
}

