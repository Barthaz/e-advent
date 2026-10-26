import InpostDelivery from '../components/checkout/InpostDelivery';
import { useInpostQuote, type InpostChoice } from '../components/checkout/useInpostQuote';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import FestivePage from '../components/FestivePage';
import ParchmentCard from '../components/ParchmentCard';
import FormField from '../components/FormField';
import LoadingState from '../components/LoadingState';
import { validateCalendarConfiguration, buildCalendarTasks } from '../utils/calendarGenerator';
import { textToCatalogTaskId } from '../utils/catalogTaskIds';
import { createPaymentIntent, createCalendar, type InternalCalendarData, validatePromoCode, createFreeCalendar, type CreatePaymentIntentRequest } from '../api/api';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import PriceBreakdown from '../components/PriceBreakdown';
import CalendarWaitNotice from '../components/campaign/CalendarWaitNotice';
import { getProduct, getProductPrice, formatPrice, isPhysicalProduct, PHYSICAL_FULFILLMENT_TIME, computeOrderTotals, applyPercentDiscount, isSupportedDiscountPercent, isCalendarsOnSale, isCalendarSku, isLetterPromoActive, LETTER_PROMO_CODE } from '../config/products';
import ShippingForm from '../components/checkout/ShippingForm';
import { emptyShippingAddress, normalizeShippingAddress, validateShippingAddress } from '../utils/shippingAddress';
import type { ProductType, ShippingAddress } from '../types/order';
import { getActiveProduct, getStorageKeys, loadShipping, saveShipping, loadCheckoutCalendarData, resolveCheckoutProduct, getReusablePendingCalendarId, getPendingCalendarSession, setPendingCalendarSession, getPurchasedCalendarIds, markCalendarPurchased, PENDING_EDIT_TOKEN_KEY, PURCHASED_CALENDAR_IDS_KEY } from '../utils/creatorStorage';
import { CART_STORAGE_KEY, loadCart, getCartTotals, checkoutItemsFromCart, getCartItemDisplayName, buildCartDisplayRows, clearCartStorage, type CartItem } from '../utils/cartStorage';
import { trackBeginCheckout, saveGaPurchasePayload } from '../utils/analytics';
import { saveOrderSummary, cartItemsToOrderLines } from '../utils/orderSummary';
import { getCheckoutToken, notifyCartChanged } from '../utils/checkoutSession';

/** Survives React Strict Mode remounts — prevents duplicate create-payment-intent calls */
const checkoutPaymentInitCache: {
  key: string | null;
  promise: Promise<{ clientSecret: string | null; paymentIntentId: string | null }> | null;
  result: { clientSecret: string | null; paymentIntentId: string | null } | null;
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

type StripeBillingAddress = {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
};

function toStripeBillingAddress(address: ShippingAddress | null): StripeBillingAddress {
  const number = [address?.buildingNumber, address?.apartmentNumber].filter(Boolean).join('/');
  return {
    line1: [address?.street, number].filter(Boolean).join(' ').trim(),
    line2: '',
    city: address?.city?.trim() || '',
    state: '',
    postal_code: address?.postalCode?.trim() || '',
    country: address?.country?.trim().toUpperCase() || 'PL',
  };
}

// Komponent formularza płatności używający Stripe Elements
function PaymentForm({ 
  onError,
  isFree,
  onCreateFreeCalendar,
  onCommitCheckout,
  payAmount,
  billingAddress,
}: { 
  clientSecret: string; 
  paymentIntentId: string;
  onError: (error: string) => void;
  isFree: boolean;
  onCreateFreeCalendar: () => Promise<void>;
  onCommitCheckout: (acceptanceData: NonNullable<CreatePaymentIntentRequest['acceptanceData']>) => Promise<{ clientSecret: string; paymentIntentId: string }>;
  payAmount: number;
  billingAddress: StripeBillingAddress;
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

      console.log('[Payment] Formularz zwalidowany pomyślnie, zapis zamówienia...');
      const committed = await onCommitCheckout(acceptanceData);
      const returnUrl = `${window.location.origin}/sukces?payment_intent=${committed.paymentIntentId}`;

      console.log('[Payment] Potwierdzanie płatności...');
      const { error } = await stripe.confirmPayment({
        elements,
        clientSecret: committed.clientSecret,
        confirmParams: {
          return_url: returnUrl,
          // PaymentElement hides the address (fields.billingDetails.address = 'never'), so Stripe requires it here.
          payment_method_data: { billing_details: { address: billingAddress } },
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
        <div className="rounded-2xl border border-christmas-gold/25 bg-white/70 p-4 md:p-5">
          <PaymentElement
            options={{
              fields: {
                billingDetails: {
                  address: 'never',
                },
              },
            }}
          />
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
          <label htmlFor="acceptTerms" className="text-sm text-parchment-text cursor-pointer">
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
          <label htmlFor="acceptPrivacy" className="text-sm text-parchment-text cursor-pointer">
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
        
        <p className="text-xs text-parchment-muted">
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
        className={`btn-gold w-full justify-center px-8 py-3.5 text-lg ${
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
            Dokończ zamówienie — 0 zł
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
  const [activePaymentKey, setActivePaymentKey] = useState('');
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
  /** Physical products from cart (scratch, letters) — one order, shipping at checkout */
  const [cartMode, setCartMode] = useState(false);

  /** Blokada przed pętlą createCalendar + createPaymentIntent w useEffect */
  const paymentInitLockRef = useRef(false);
  const paymentInitKeyRef = useRef<string | null>(null);
  const pendingIntentRequestRef = useRef<CreatePaymentIntentRequest | null>(null);
  const autoPromoRef = useRef(false);

  const [delivery, setDelivery] = useState<InpostChoice>({ type: 'parcel_inpost' });
  const deliveryItems = cartItems.length ? cartItems.map(i => ({ sku: i.sku, quantity: i.quantity })) : [{ sku, quantity: 1 }];
  const needsDelivery = deliveryItems.some(i => isPhysicalProduct(i.sku));
  const shippingQuote = useInpostQuote(deliveryItems, delivery.type, needsDelivery);
  const orderTotals = computeOrderTotals(
    cartItems.length > 0
      ? cartItems.map((i) => ({ sku: i.sku, quantity: i.quantity }))
      : [{ sku, quantity: 1 }],
    { shippingAmount: shippingQuote.quote?.price ?? 0 },
  );
  const pricedTotals = isSupportedDiscountPercent(promoCodeDiscount ?? 0) && orderTotals
    ? applyPercentDiscount(orderTotals, promoCodeDiscount as number)
    : orderTotals;
  const product = getProduct(sku);
  const totalPrice = pricedTotals?.total ?? getProductPrice(sku) ?? 9;
  const shippingCost = pricedTotals?.shipping ?? 0;
  const subtotal = pricedTotals?.subtotal ?? (product?.basePrice ?? 9);
  const discountAmount = pricedTotals?.discount ?? 0;
  const isPhysical = pricedTotals?.hasPhysical ?? isPhysicalProduct(sku);
  const isFree = promoCodeDiscount === 100;

  /** Synchronous address check — never fire create-payment-intent with empty shipping */
  const shippingAddressComplete = useMemo(() => {
    if (!isPhysical) return true;
    return Boolean(shippingQuote.quote && (delivery.type === 'courier_inpost' || delivery.pointId)) && Object.keys(validateShippingAddress(shippingAddress, delivery.type)).length === 0;
  }, [isPhysical, shippingAddress, delivery, shippingQuote.quote]);

  const emailReady = isValidCheckoutEmail(calendarData?.email);
  const checkoutSkus = cartItems.length ? cartItems : [{ sku }];
  const calendarSaleBlocked = !isCalendarsOnSale() && checkoutSkus.some((item) => isCalendarSku(item.sku));
  const letterOnlyCheckout = checkoutSkus.every((item) => getProduct(item.sku)?.type === 'letter');

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
        setShippingAddress(normalizeShippingAddress(savedShipping));
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
    const errors = validateShippingAddress(shippingAddress, delivery.type);
    setShippingErrors(errors);
    const valid = Object.keys(errors).length === 0;
    if (valid) {
      saveShipping(cartMode ? 'scratch' : productType, normalizeShippingAddress(shippingAddress));
      if (cartMode) saveShipping('letter', normalizeShippingAddress(shippingAddress));
    }
  }, [shippingAddress, isPhysical, productType, cartMode, calendarData, delivery.type]);

  const checkoutFingerprint = JSON.stringify({ checkoutToken: getCheckoutToken(), calendarData, cart: cartMode ? cartItems : null,
    shipping: isPhysical ? normalizeShippingAddress(shippingAddress) : null, delivery: isPhysical ? delivery : null, quoteKey: shippingQuote.quote?.quoteKey, sku, totalPrice, promoCode: promoCodeDiscount ? promoCode.trim() : '' });

  // Utwórz Payment Intent raz na zestaw danych (bez pętli przy re-renderach)
  useEffect(() => {
    let cancelled = false;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const initializePayment = async () => {
      if (!calendarData) return;

      // Gate API on live address/email — never send create-payment-intent early for physical
      if (calendarSaleBlocked) {
        return;
      }
      if (isPhysical && !shippingAddressComplete) {
        return;
      }
      if (!isValidCheckoutEmail(calendarData.email)) {
        return;
      }

      const initKey = checkoutFingerprint;
      if (promoCodeDiscount === 100) {
        if (paymentInitKeyRef.current !== initKey) {
          paymentInitLockRef.current = false;
          paymentInitKeyRef.current = initKey;
          checkoutPaymentInitCache.key = null;
          checkoutPaymentInitCache.promise = null;
          checkoutPaymentInitCache.result = null;
          if (clientSecret) {
            setClientSecret(null);
            setPaymentIntentId(null);
          }
        }
        return;
      }

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
        setActivePaymentKey(initKey);
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
            setActivePaymentKey(initKey);
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
          const items = checkoutItemsFromCart(cartItems);
          const primaryCalendarId = cartItems.find((i) => i.calendarId)?.calendarId;
          const paymentRequest: CreatePaymentIntentRequest = {
            amount: totalPrice,
            currency: 'pln',
            customerEmail: calendarData.email,
            orderId,
            ...(promoCodeDiscount ? { promoCode: promoCode.trim() } : {}),
            ...(primaryCalendarId ? { productId: primaryCalendarId } : {}),
            items,
            shippingAddress: normalizeShippingAddress(shippingAddress),
            delivery: { ...delivery, quoteKey: shippingQuote.quote?.quoteKey },
            metadata: {
              productType: productType,
              sku,
              itemCount: String(cartItems.length),
              cartCheckout: '1',
              clientOrderId: orderId,
            },
          };
          pendingIntentRequestRef.current = paymentRequest;
          const paymentIntent = await createPaymentIntent(paymentRequest);
          if (!paymentIntent.clientSecret || !paymentIntent.paymentIntentId) {
            throw new Error('Nie otrzymano danych płatności.');
          }
          localStorage.setItem('paymentIntentId', paymentIntent.paymentIntentId);
          if (paymentIntent.orderId) localStorage.setItem('orderId', paymentIntent.orderId);
          if (paymentIntent.orderNumber) {
            localStorage.setItem('orderNumber', paymentIntent.orderNumber);
          }
          localStorage.setItem('orderAmount', String(totalPrice));
          localStorage.setItem('e-advent-sku', sku);
          const gaItems = cartItems.map((i) => ({
            sku: i.sku,
            name: i.label || getProduct(i.sku)?.name || i.sku,
            price: i.unitPrice ?? getProduct(i.sku)?.basePrice ?? 0,
            quantity: i.quantity,
          }));
          saveGaPurchasePayload({
            transactionId: paymentIntent.paymentIntentId,
            value: totalPrice,
            shipping: shippingCost,
            items: gaItems,
          });
          saveOrderSummary({
            items: cartItemsToOrderLines(cartItems),
            shipping: normalizeShippingAddress(shippingAddress),
            orderNumber: paymentIntent.orderNumber || undefined,
            customerEmail: calendarData.email,
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
          if (checkoutPaymentInitCache.key === initKey) checkoutPaymentInitCache.result = result;
          if (!cancelled) {
            setClientSecret(result.clientSecret);
            setPaymentIntentId(result.paymentIntentId);
            setActivePaymentKey(initKey);
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
                ? 'Wybierz dostawę i uzupełnij dane odbiorcy, aby przejść do płatności.'
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
            const generatedCalendar: Array<{ day: number; task: string; duration?: number; latestDay?: number; catalogTaskId?: string }> = JSON.parse(savedGeneratedCalendar);
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

        const paymentIntentData: CreatePaymentIntentRequest = {
          ...(isPhysical ? { shippingAddress: normalizeShippingAddress(shippingAddress), delivery: { ...delivery, quoteKey: shippingQuote.quote?.quoteKey } } : {}),
          amount: paymentAmount,
          currency: 'pln',
          customerEmail: calendarData.email,
          orderId: orderId,
          ...(promoCodeDiscount ? { promoCode: promoCode.trim() } : {}),
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

        pendingIntentRequestRef.current = paymentIntentData;
        const paymentIntent = await createPaymentIntent(paymentIntentData);
        if (!paymentIntent.clientSecret || !paymentIntent.paymentIntentId) {
          throw new Error('Nie otrzymano danych płatności.');
        }

        localStorage.setItem('paymentIntentId', paymentIntent.paymentIntentId);
        if (paymentIntent.orderId) localStorage.setItem('orderId', paymentIntent.orderId);
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
        if (checkoutPaymentInitCache.key === initKey) checkoutPaymentInitCache.result = result;
        if (!cancelled) {
          setClientSecret(result.clientSecret);
          setPaymentIntentId(result.paymentIntentId);
            setActivePaymentKey(initKey);
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
  }, [checkoutFingerprint, calendarData, clientSecret, shippingCost, shippingAddressComplete, isPhysical, totalPrice, productType, sku, shippingAddress, cartMode, cartItems, delivery, shippingQuote.quote, promoCode, promoCodeDiscount, calendarSaleBlocked]);

  const applyPromoCode = async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) {
      setPromoCodeError(null);
      setPromoCodeDiscount(null);
      return;
    }

    setIsCheckingPromoCode(true);
    setPromoCodeError(null);

    try {
      const response = await validatePromoCode(trimmed);
      const discount = response.discount;
      if (response.success && response.valid && typeof discount === 'number' && isSupportedDiscountPercent(discount)) {
        setPromoCodeDiscount(discount);
        setPromoCodeError(null);
        console.log('[PromoCode] Kod promocyjny zwalidowany:', {
          code: trimmed,
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

  const handlePromoCodeBlur = async () => {
    await applyPromoCode(promoCode);
  };

  useEffect(() => {
    if (autoPromoRef.current || !calendarData || calendarSaleBlocked) return;
    if (!isLetterPromoActive() || !letterOnlyCheckout) return;
    autoPromoRef.current = true;
    setPromoCode(LETTER_PROMO_CODE);
    void applyPromoCode(LETTER_PROMO_CODE);
  }, [calendarData, calendarSaleBlocked, letterOnlyCheckout]);

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
          const generatedCalendar: Array<{ day: number; task: string; duration?: number; latestDay?: number; catalogTaskId?: string }> = JSON.parse(savedGeneratedCalendar);
          
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

  const completeFreeOrder = async () => {
    if (!calendarData) throw new Error('Brak danych zamówienia');
    if (!cartMode && !isPhysical) {
      await handleCreateFreeCalendar();
      return;
    }
    if (isPhysical && !shippingAddressComplete) {
      throw new Error('Uzupełnij dane do wysyłki.');
    }
    const orderId = getStableCheckoutOrderId(checkoutFingerprint);
    const items = cartMode
      ? checkoutItemsFromCart(cartItems)
      : [{ sku, quantity: 1, calendarId: getReusablePendingCalendarId() || undefined }];
    const primaryCalendarId = (cartMode ? cartItems.find((i) => i.calendarId)?.calendarId : items[0]?.calendarId) || undefined;
    const acceptanceTimestamp = new Date().toISOString();
    const result = await createPaymentIntent({
      amount: 0,
      currency: 'pln',
      customerEmail: calendarData.email,
      orderId,
      promoCode: promoCode.trim(),
      ...(primaryCalendarId ? { productId: primaryCalendarId } : {}),
      items,
      acceptanceData: {
        termsAccepted: true,
        privacyAccepted: true,
        termsAcceptedAt: acceptanceTimestamp,
        privacyAcceptedAt: acceptanceTimestamp,
        clientIP: null,
      },
      ...(isPhysical ? {
        shippingAddress: normalizeShippingAddress(shippingAddress),
        delivery: { ...delivery, quoteKey: shippingQuote.quote?.quoteKey },
      } : {}),
    });
    if (!result.free || !result.orderId) throw new Error('Nie udało się zrealizować darmowego zamówienia.');
    saveOrderSummary({
      items: cartMode ? cartItemsToOrderLines(cartItems) : [{ sku, name: getProduct(sku)?.name || sku, quantity: 1, price: 0 }],
      shipping: isPhysical ? normalizeShippingAddress(shippingAddress) : null,
      orderNumber: result.orderNumber || undefined,
      customerEmail: calendarData.email,
    });
    if (cartMode) {
      clearCartStorage();
      notifyCartChanged();
    }
    navigate(`/sukces?free=true&order_id=${encodeURIComponent(result.orderId)}`);
  };

  const commitPaidCheckout = async (acceptanceData: NonNullable<CreatePaymentIntentRequest['acceptanceData']>) => {
    const paymentRequest = pendingIntentRequestRef.current;
    if (!paymentRequest) {
      throw new Error('Odśwież stronę płatności — brak przygotowanej płatności.');
    }
    const paymentIntent = await createPaymentIntent({ ...paymentRequest, acceptanceData });
    if (!paymentIntent.clientSecret || !paymentIntent.paymentIntentId) {
      throw new Error('Nie otrzymano danych płatności.');
    }
    if (!paymentIntent.orderId) {
      throw new Error('Nie udało się zapisać zamówienia. Spróbuj ponownie.');
    }
    localStorage.setItem('paymentIntentId', paymentIntent.paymentIntentId);
    localStorage.setItem('orderId', paymentIntent.orderId);
    if (paymentIntent.orderNumber) {
      localStorage.setItem('orderNumber', paymentIntent.orderNumber);
    }
    if (calendarData) {
      saveOrderSummary({
        items: cartMode ? cartItemsToOrderLines(cartItems) : [{
          sku,
          name: getProduct(sku)?.name || sku,
          quantity: 1,
          price: totalPrice,
        }],
        shipping: isPhysical ? normalizeShippingAddress(shippingAddress) : null,
        orderNumber: paymentIntent.orderNumber || undefined,
        customerEmail: calendarData.email,
      });
    }
    return {
      clientSecret: paymentIntent.clientSecret,
      paymentIntentId: paymentIntent.paymentIntentId,
    };
  };

  if (!calendarData) {
    return <LoadingState message="Ładowanie..." />;
  }

  const resetPaymentForEmail = (email: string) => {
    setCalendarData({ ...calendarData, email });
    setClientSecret(null);
    setPaymentIntentId(null);
    paymentInitLockRef.current = false;
    paymentInitKeyRef.current = null;
    checkoutPaymentInitCache.key = null;
    checkoutPaymentInitCache.promise = null;
    checkoutPaymentInitCache.result = null;
  };

  return (
    <FestivePage className="py-4" maxWidth={isPhysical ? 'full' : 'lg'}>
      <ParchmentCard padding="lg" className="checkout-page">
        <h1 className="heading-page mb-2">Zamówienie</h1>
        <div className="gold-divider mb-8" />

        {calendarSaleBlocked && (
          <div className="mb-8">
            <CalendarWaitNotice />
          </div>
        )}

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

        {!calendarSaleBlocked && <div className="grid lg:grid-cols-12 gap-6 lg:gap-8">
          <section className="rounded-2xl border border-christmas-gold/30 bg-white/45 p-4 md:p-6 lg:col-span-12">
            <div className="grid lg:grid-cols-12 gap-6 lg:gap-8 lg:items-start">
              <div className="lg:col-span-7">
                <div className="flex items-start gap-3 mb-4">
                  <span className="option-card-icon mt-0.5" aria-hidden>
                    <i className="fas fa-envelope" />
                  </span>
                  <div>
                    <h2 className="heading-section">Twoje dane</h2>
                    <p className="text-parchment-muted text-sm mt-1">
                      {isPhysical
                        ? 'Potwierdzenie zamówienia wyślemy na e-mail. Paczkomat, kuriera i dane odbiorcy podasz poniżej.'
                        : 'Na ten adres wyślemy potwierdzenie zakupu i link do kalendarza.'}
                    </p>
                  </div>
                </div>
                {cartMode ? (
                  <>
                    <FormField
                      label="E-mail (potwierdzenie zamówienia)"
                      type="email"
                      id="checkout-email"
                      name="checkout-email"
                      autoComplete="email"
                      value={calendarData.email}
                      onChange={(v) => resetPaymentForEmail(v.trim())}
                      placeholder="jan@example.com"
                      required
                    />
                    {calendarData.name ? (
                      <p className="text-sm text-parchment-muted"><strong>Imię:</strong> {calendarData.name}</p>
                    ) : null}
                  </>
                ) : (
                  <div className="text-parchment-text space-y-1">
                    <p><strong>Imię:</strong> {calendarData.name}</p>
                    <p><strong>Email:</strong> {calendarData.email}</p>
                  </div>
                )}
                {isPhysical && (
                  <ol className="mt-2 space-y-2.5 text-sm text-parchment-text !list-none pl-0">
                    <li className="flex items-center gap-3">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-christmas-green/10 text-christmas-green text-xs font-semibold shrink-0">1</span>
                      Wybierz Paczkomat albo kuriera InPost
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-christmas-green/10 text-christmas-green text-xs font-semibold shrink-0">2</span>
                      Uzupełnij dane odbiorcy
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-christmas-green/10 text-christmas-green text-xs font-semibold shrink-0">3</span>
                      Opłać zamówienie
                    </li>
                  </ol>
                )}
              </div>

              <div className="lg:col-span-5 lg:border-l lg:border-christmas-gold/25 lg:pl-8">
                <h2 className="heading-section mb-3">Zamówienie</h2>
                {cartItems.length > 0 ? (
                  <ul className="space-y-3">
                    {buildCartDisplayRows(cartItems).map((row) => {
                      if (row.kind === 'letter-group') {
                        return (
                          <li key="letter-pack" className="text-sm">
                            <div className="flex justify-between gap-3">
                              <span className="text-parchment-text">
                                <strong>{row.label}</strong>
                                {' '}× {row.quantity}
                              </span>
                              <span className="whitespace-nowrap font-medium text-christmas-green">
                                {formatPrice(row.unitPrice * row.quantity)}
                              </span>
                            </div>
                            {row.certificates.map((cert) => {
                              const unit = cert.unitPrice ?? getProduct(cert.sku)?.basePrice ?? 0;
                              return (
                                <div key={cert.id} className="mt-1.5 ml-3 flex justify-between gap-3 text-parchment-muted">
                                  <span>{getCartItemDisplayName(cert)}</span>
                                  <span className="whitespace-nowrap text-christmas-green">{formatPrice(unit)}</span>
                                </div>
                              );
                            })}
                          </li>
                        );
                      }
                      const item = row.item;
                      const p = getProduct(item.sku);
                      const unit = item.unitPrice ?? p?.basePrice ?? 0;
                      const displayName = getCartItemDisplayName(item);
                      return (
                        <li key={item.id} className="flex justify-between gap-3 text-sm">
                          <span className="text-parchment-text">
                            <strong>{displayName}</strong>
                            {item.format ? ` (${item.format})` : ''}
                            {' '}× {item.quantity}
                          </span>
                          <span className="whitespace-nowrap font-medium text-christmas-green">
                            {formatPrice(unit * item.quantity)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-parchment-text"><strong>{product?.name || 'Kalendarz adwentowy'}</strong></p>
                )}
                {calendarData.format && !cartMode && (
                  <p className="text-sm text-parchment-muted mt-2">Format: {calendarData.format}</p>
                )}
                {calendarData.design?.imageUrl && !cartMode && (
                  <img src={calendarData.design.imageUrl} alt="Grafika" className="mt-2 max-h-24 rounded border border-christmas-gold/20" />
                )}
                {isPhysical && (
                  <p className="mt-3 text-sm text-parchment-muted">
                    Realizacja {PHYSICAL_FULFILLMENT_TIME}. Wysyłka InPost.
                    {orderTotals?.freeShipping ? ' Wysyłka gratis.' : ' Darmowa wysyłka od 100 zł.'}
                  </p>
                )}
                {cartMode && (
                  <p className="mt-3 text-sm text-parchment-muted">
                    Wszystkie pozycje opłacisz jako jedno zamówienie.
                  </p>
                )}
                <div className="mt-5">
                  <label htmlFor="promoCode" className="block text-sm font-medium text-parchment-muted mb-2">
                    Kod rabatowy
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
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          void handlePromoCodeBlur();
                        }
                      }}
                      placeholder="Wpisz kod rabatowy"
                      className="input-field flex-1"
                      disabled={isCheckingPromoCode}
                      autoCapitalize="characters"
                    />
                    <button type="button" className="btn-secondary shrink-0" disabled={isCheckingPromoCode || !promoCode.trim()} onClick={() => void handlePromoCodeBlur()}>
                      {isCheckingPromoCode ? 'Sprawdzam…' : 'Zastosuj'}
                    </button>
                  </div>
                  {promoCodeError && (
                    <p className="mt-2 text-sm text-red-600">{promoCodeError}</p>
                  )}
                  {promoCodeDiscount !== null && promoCodeDiscount > 0 && !promoCodeError && (
                    <p className="mt-2 text-sm text-christmas-green font-semibold">
                      {promoCodeDiscount === 100
                        ? 'Kod zastosowany — zamówienie za 0 zł.'
                        : promoCodeDiscount === 95
                          ? 'Kod zastosowany — zniżka 95% od wartości zamówienia.'
                          : `Kod zastosowany — zniżka ${promoCodeDiscount}% od produktów.`}
                    </p>
                  )}
                </div>
                <div className="price-box mt-4">
                  <PriceBreakdown
                    basePrice={subtotal}
                    shippingCost={shippingCost}
                    variant="checkout"
                    totalLabel="Do zapłaty"
                    freeShipping={Boolean(isPhysical && pricedTotals?.freeShipping)}
                    shippingPending={isPhysical && !shippingQuote.quote}
                    discount={discountAmount}
                    discountPercent={promoCodeDiscount ?? undefined}
                  />
                </div>
                {!cartMode && (
                  <div className="mt-5 text-sm text-parchment-text space-y-1">
                    <h2 className="heading-section mb-3">Kalendarz</h2>
                    <p><strong>Tytuł:</strong> {calendarData.calendarTitle}</p>
                    <p><strong>Własne zadania:</strong> {calendarData.tasks.length} / 24</p>
                    {calendarData.tasks.length > 0 && (
                      <p className="text-parchment-muted">Zadania będą losowo przypisane do dni.</p>
                    )}
                    {(calendarData.openingMethod === 'email' || calendarData.dailyEmailReminders) && (
                      <p className="text-christmas-green mt-2">
                        Codzienna treść na: {calendarData.dailyContentEmail || calendarData.email}
                      </p>
                    )}
                    {calendarData.openingMethod === 'app' && (
                      <p className="text-christmas-green mt-2">Otwieranie w aplikacji Android</p>
                    )}
                    {calendarData.openingMethod === 'online' && (
                      <p className="text-christmas-green mt-2">Otwieranie online przez unikalny link</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>

          {isPhysical && (
            <div className="lg:col-span-12">
              <InpostDelivery value={delivery} onChange={setDelivery} {...shippingQuote} />
            </div>
          )}

          {isPhysical && (
            <div className="lg:col-span-12">
              <ShippingForm address={shippingAddress} onChange={setShippingAddress} errors={shippingErrors} deliveryType={delivery.type} />
            </div>
          )}

            <div className="rounded-2xl border border-christmas-gold/30 bg-white/45 p-4 md:p-6 lg:col-span-12">
              <h3 className="heading-section mb-2">Bezpieczna płatność</h3>
              <p className="text-parchment-muted text-sm mb-6">
                {isPhysical
                  ? 'Po złożeniu zamówienia otrzymasz potwierdzenie na e-mail. Przygotujemy przesyłkę i wyślemy ją InPost.'
                  : 'Po złożeniu zamówienia otrzymasz unikalny link do swojego kalendarza na podany adres e-mail.'}
              </p>

              {paymentError && (
                <div className="notice-amber mb-6">
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

              {isFree && emailReady && (!isPhysical || shippingAddressComplete) ? (
                  <PaymentForm
                    clientSecret=""
                    paymentIntentId=""
                    onError={setPaymentError}
                    isFree
                    onCreateFreeCalendar={completeFreeOrder}
                    onCommitCheckout={commitPaidCheckout}
                    payAmount={0}
                    billingAddress={toStripeBillingAddress(isPhysical ? shippingAddress : null)}
                  />
              ) : clientSecret && paymentIntentId && activePaymentKey === checkoutFingerprint && emailReady && (!isPhysical || shippingAddressComplete) ? (
                <Elements
                  key={clientSecret}
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
                    isFree={false}
                    onCreateFreeCalendar={completeFreeOrder}
                    onCommitCheckout={commitPaidCheckout}
                    payAmount={totalPrice}
                    billingAddress={toStripeBillingAddress(isPhysical ? shippingAddress : null)}
                  />
                </Elements>
              ) : isPhysical && !shippingAddressComplete ? (
                <div className="text-center py-6">
                  <i className="fas fa-truck text-christmas-green text-2xl mb-3" />
                  <p className="text-parchment-text font-medium">
                    Uzupełnij dane do wysyłki, aby sfinalizować płatność.
                  </p>
                  <p className="text-parchment-muted text-sm mt-2">
                    Formularz płatności pojawi się po wycenie dostawy oraz wyborze Paczkomatu lub podaniu adresu kuriera.
                  </p>
                </div>
              ) : cartMode && !emailReady ? (
                <div className="text-center py-6">
                  <p className="text-parchment-text font-medium">
                    Podaj adres e-mail, aby przygotować płatność.
                  </p>
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="spinner mx-auto mb-4"></div>
                  <p className="text-parchment-muted">Przygotowywanie formularza płatności...</p>
                </div>
              )}
            </div>
        </div>}
      </ParchmentCard>
    </FestivePage>
  );
}

