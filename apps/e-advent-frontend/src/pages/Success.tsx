import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import FestivePage from '../components/FestivePage';
import ParchmentCard from '../components/ParchmentCard';
import LoadingState from '../components/LoadingState';
import {
  getCalendar,
  getPaymentByIntentId,
} from '../api/api';
import { isPhysicalProduct, PHYSICAL_FULFILLMENT_TIME, formatPrice } from '../config/products';
import { OPENING_METHOD_LABELS } from '../components/creator/openingMethods';
import type { OpeningMethod } from '../types/order';
import logo from '@e-advent/assets/brand/eadvent-logo.png';
import { trackPurchase } from '../utils/analytics';
import { CART_STORAGE_KEY } from '../utils/cartStorage';
import { finishCheckout } from '../utils/checkoutSession';
import { markCalendarPurchased } from '../utils/creatorStorage';
import { clearOrderSummary, loadOrderSummary, paymentItemsToOrderLines, type OrderLineItem } from '../utils/orderSummary';

const ANDROID_APK_URL = 'https://e-advent.pl/download/e-advent.apk';

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
  dates: string[];
  openingMethod?: OpeningMethod | null;
  dailyContentEmail?: string | null;
}

function isOpeningMethod(value: unknown): value is OpeningMethod {
  return value === 'app' || value === 'email' || value === 'online';
}

export default function Success() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [calendarLink, setCalendarLink] = useState('');
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(true);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [isPhysicalOrder, setIsPhysicalOrder] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [verificationMessage, setVerificationMessage] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [calendarLinks, setCalendarLinks] = useState<string[]>([]);
  const [linkCopied, setLinkCopied] = useState(false);
  const [orderItems, setOrderItems] = useState<OrderLineItem[]>([]);
  const [physicalDetails, setPhysicalDetails] = useState<{
    deliveryType?: string;
    point?: { id: string; name: string; address: string } | null;
    format?: string;
    designUrl?: string;
    shipping?: { fullName?: string; street?: string; city?: string; postalCode?: string; phone?: string };
  }>({});


  useEffect(() => {
    let canceled = false;
    const checkPayment = async () => {
      try {
        const paymentIntent = searchParams.get('payment_intent');
        let ids: string[] = [];
        let interactiveIds: string[] = [];
        let physical = false;
        if (paymentIntent) {
          let response = await getPaymentByIntentId(paymentIntent);
          for (let attempt = 0; attempt < 8 && response.payment.status !== 'succeeded' &&
              ['processing', 'succeeded'].includes(response.stripeStatus || ''); attempt++) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            if (canceled) return;
            response = await getPaymentByIntentId(paymentIntent);
          }
          if (canceled) return;
          const payment = response.payment;
          if (payment.stripePaymentIntentId !== paymentIntent || !payment.items?.length) throw new Error('Order identity mismatch');
          if (payment.status !== 'succeeded' || response.stripeStatus !== 'succeeded') {
            if (['processing', 'succeeded'].includes(response.stripeStatus || '')) {
              setVerificationMessage('Czekamy na potwierdzenie płatności. Nie płać ponownie — możesz sprawdzić wynik za chwilę.');
              return;
            }
            navigate('/platnosc-blad');
            return;
          }
          const items = paymentItemsToOrderLines(payment.items);
          setOrderItems(items);
          setOrderNumber(payment.orderNumberDisplay || String(payment.orderNumber || ''));
          setEmailSent(response.emailStatus === 'sent');
          setPhysicalDetails({ shipping: payment.shippingAddress || undefined, deliveryType: payment.deliveryType, point: payment.parcelLocker });
          physical = payment.items.some(item => isPhysicalProduct(item.sku));
          ids = payment.items.flatMap(item => item.calendarId ? [item.calendarId] : []);
          interactiveIds = payment.items.flatMap(item => item.calendarId && !isPhysicalProduct(item.sku) ? [item.calendarId] : []);
          setCalendarData({ name: payment.customerName || '', email: payment.customerEmail || '',
            calendarTitle: 'Zamówienie e-Advent', tasks: [], dailyEmailReminders: false, dates: [] });
          trackPurchase({ transactionId: payment.id, value: payment.amount, shipping: payment.shippingAmount || 0,
            items: items.map(item => ({ sku: item.sku, name: item.name, price: item.price, quantity: item.quantity })) });
          // A return from an older tab must never erase the customer's new cart.
          const snapshot = sessionStorage.getItem(`e-advent-checkout-cart:${paymentIntent}`);
          if (snapshot && snapshot === localStorage.getItem(CART_STORAGE_KEY)) localStorage.removeItem(CART_STORAGE_KEY);
          finishCheckout(paymentIntent);
        } else if (searchParams.get('free') === 'true') {
          const id = searchParams.get('calendar_id');
          const summary = loadOrderSummary();
          if (id) {
            const response = await getCalendar(id);
            if (response.calendar.status !== 'succeeded') throw new Error('Calendar is not active');
            ids = [id]; interactiveIds = [id];
            setOrderItems([{ sku: response.calendar.sku || 'interactive', name: 'Kalendarz interaktywny', quantity: 1, price: 0 }]);
          } else if (summary) {
            setOrderItems(summary.items);
            setOrderNumber(summary.orderNumber || '');
            physical = summary.items.some(item => isPhysicalProduct(item.sku));
            setPhysicalDetails({ shipping: summary.shipping || undefined });
            ids = [];
          } else {
            throw new Error('Missing free order');
          }
          finishCheckout();
          clearOrderSummary();
        } else {
          throw new Error('Missing payment ID');
        }
        for (const id of ids) markCalendarPurchased(id);
        const links = interactiveIds.map(id => `${window.location.origin}/kalendarz/${id}`);
        setCalendarLinks(links);
        setCalendarLink(links[0] || '');
        setIsPhysicalOrder(physical);
        if (!physical && interactiveIds.length) {
          const { calendar } = await getCalendar(interactiveIds[0]);
          if (canceled) return;
          const openingMethod = isOpeningMethod(calendar.openingMethod) ? calendar.openingMethod : null;
          setCalendarData({ name: calendar.author, email: calendar.email, calendarTitle: calendar.title,
            tasks: [], dailyEmailReminders: openingMethod === 'email', dates: [], openingMethod,
            dailyContentEmail: calendar.dailyContentEmail || null });
        }
        if (!canceled) { setPaymentVerified(true); setIsVerifyingPayment(false); }
      } catch (error) {
        console.warn('[Success] Nie udało się zweryfikować zamówienia:', error);
        if (!canceled) setVerificationMessage('Nie udało się sprawdzić zamówienia. Spróbuj ponownie za chwilę. Nie wykonuj ponownej płatności, jeśli środki zostały pobrane.');
      }
    };
    void checkPayment();
    return () => { canceled = true; };
  }, [navigate, searchParams]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(calendarLink);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2500);
    } catch {
      setLinkCopied(false);
    }
  };

  if (verificationMessage) {
    return <FestivePage maxWidth="md"><ParchmentCard><p>{verificationMessage}</p>
      <button className="btn-green mt-4" onClick={() => window.location.reload()}>Sprawdź ponownie</button>
    </ParchmentCard></FestivePage>;
  }

  if (isVerifyingPayment || !paymentVerified) {
    return <LoadingState message="Weryfikowanie płatności..." />;
  }

  if (!calendarData && !isPhysicalOrder) {
    return <LoadingState message="Ładowanie..." />;
  }

  const openingMethod = calendarData?.openingMethod || null;
  const contentEmail = calendarData?.dailyContentEmail || calendarData?.email || '';
  const totalItemQty = orderItems.reduce((sum, i) => sum + i.quantity, 0);
  const productsHeading = totalItemQty <= 1 && orderItems.length <= 1 ? 'Produkt' : 'Produkty';

  return (
    <FestivePage maxWidth="md" showLogo={false}>
      <ParchmentCard padding="lg">
        <div className="success-page text-center">
          <div className="mb-6 flex justify-center">
            <img
              src={logo}
              alt="e-Advent - Interaktywny Kalendarz Adwentowy Online"
              width="200"
              height="80"
              loading="eager"
              fetchPriority="high"
              className="h-24 md:h-32 w-auto"
            />
          </div>

          <h1 className="font-display text-3xl md:text-4xl font-semibold text-parchment-text mb-3">
            {isPhysicalOrder ? 'Dziękujemy za zamówienie!' : 'Dziękujemy za zakup!'}
          </h1>

          <p className="text-base md:text-lg text-parchment-muted mb-8">
            {isPhysicalOrder ? (
              <>
                Twoje zamówienie
                {calendarData?.calendarTitle ? (
                  <>
                    {' '}
                    <span className="font-semibold text-christmas-red">{calendarData.calendarTitle}</span>
                  </>
                ) : null}
                {' '}zostało przyjęte do realizacji.
              </>
            ) : (
              <>
                Twój kalendarz{' '}
                <span className="font-semibold text-christmas-red">{calendarData?.calendarTitle}</span>{' '}
                jest gotowy.
              </>
            )}
          </p>

          {isPhysicalOrder ? (
            <div className="success-panel text-left mb-8">
              <div className="mb-3">
                <p className="mb-2">
                  <strong>{productsHeading}:</strong>
                </p>
                {orderItems.length === 0 ? (
                  <p className="text-parchment-muted text-sm">Brak szczegółów produktów w sesji.</p>
                ) : orderItems.length === 1 && orderItems[0].quantity === 1 ? (
                  <p className="text-parchment-text">{orderItems[0].name}</p>
                ) : (
                  <ul className="space-y-1.5 ml-0 list-none">
                    {orderItems.map((item, index) => (
                      <li
                        key={`${item.sku}-${index}`}
                        className="flex items-start justify-between gap-3 text-parchment-text"
                      >
                        <span>
                          {item.name}
                          {item.quantity > 1 ? (
                            <span className="text-parchment-muted"> × {item.quantity}</span>
                          ) : null}
                        </span>
                        {item.price > 0 && (
                          <span className="text-sm text-parchment-muted whitespace-nowrap">
                            {formatPrice(item.price * item.quantity)}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {physicalDetails.format && (
                <p className="mb-2"><strong>Format:</strong> {physicalDetails.format}</p>
              )}
              {orderNumber && (
                <p className="mb-2"><strong>Numer zamówienia:</strong> {orderNumber}</p>
              )}
              {physicalDetails.designUrl && (
                <div className="mb-3">
                  <p className="mb-2"><strong>Grafika:</strong></p>
                  <img
                    src={physicalDetails.designUrl}
                    alt="Grafika zamówienia"
                    className="max-h-32 rounded border border-parchment-dark/30"
                  />
                </div>
              )}
              {physicalDetails.point && <p className="mb-3"><strong>Paczkomat InPost: {physicalDetails.point.id}</strong><br />{physicalDetails.point.address}</p>}
              {physicalDetails.deliveryType === 'courier_inpost' && <p>Kurier InPost</p>}
              {physicalDetails.shipping && (
                <div className="mb-3">
                  <p className="font-semibold mb-1">Dane odbiorcy:</p>
                  <p className="text-parchment-muted text-sm">
                    {physicalDetails.shipping.fullName}<br />
                    {physicalDetails.shipping.street}<br />
                    {physicalDetails.shipping.postalCode} {physicalDetails.shipping.city}<br />
                    Tel: {physicalDetails.shipping.phone}
                  </p>
                </div>
              )}
              <p className="text-sm text-parchment-muted mt-4">
                Przygotujemy Twoje zamówienie w ciągu {PHYSICAL_FULFILLMENT_TIME} i wyślemy je zgodnie z wybraną metodą dostawy.
                {calendarData?.email
                  ? <> {emailSent ? 'Potwierdzenie wysłaliśmy na' : 'Potwierdzenie wyślemy na'} {calendarData.email}.</>
                  : null}
              </p>
            </div>
          ) : (
            <>
              {openingMethod && (
                <div className="success-panel text-left mb-6">
                  <h2 className="success-panel-title">
                    <i className="fas fa-door-open" />
                    Wybrany sposób otwierania
                  </h2>
                  <p className="font-semibold text-parchment-text mb-2">
                    {OPENING_METHOD_LABELS[openingMethod]}
                  </p>
                  {openingMethod === 'app' && (
                    <p className="text-sm text-parchment-muted mb-4">
                      Pobierz aplikację Android i otwieraj okienka na telefonie. Link online też zostaje
                      dostępny poniżej.
                    </p>
                  )}
                  {openingMethod === 'email' && (
                    <p className="text-sm text-parchment-muted mb-4">
                      Codziennie rano na adres{' '}
                      <strong className="text-parchment-text">{contentEmail}</strong>{' '}
                      przyjdzie sformatowana treść okienka. Link online też zostaje dostępny poniżej.
                    </p>
                  )}
                  {openingMethod === 'online' && (
                    <p className="text-sm text-parchment-muted mb-4">
                      Każdego dnia wchodź na swój unikalny adres URL i otwieraj kolejne okienko.
                    </p>
                  )}
                  {openingMethod === 'app' && (
                    <a
                      href={ANDROID_APK_URL}
                      className="btn-green inline-flex items-center px-5 py-2.5 text-sm"
                      onClick={() => {
                        if (typeof window !== 'undefined' && window.gtag) {
                          window.gtag('event', 'android_app_downloaded', {
                            event_category: 'engagement',
                            event_label: 'success_page_opening_method',
                          });
                        }
                      }}
                    >
                      <i className="fab fa-android mr-2" />
                      Pobierz aplikację
                    </a>
                  )}
                </div>
              )}

              <div className="success-panel text-left mb-6">
                <h2 className="success-panel-title">
                  <i className="fas fa-envelope" />
                  Potwierdzenie e-mail
                </h2>
                {!calendarData?.email ? (
                  <p className="text-sm text-parchment-muted">
                    Nie znaleziono adresu e-mail w zamówieniu. Skopiuj link poniżej, aby mieć dostęp
                    do kalendarza.
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-parchment-muted mb-3">
                      Link do kalendarza i kod dostępu {emailSent ? 'wysłaliśmy' : 'wyślemy'} na{' '}
                      <strong className="text-parchment-text">{calendarData.email}</strong>.
                    </p>
                    <div className="notice-warning">
                      <p>
                        Nie widzisz wiadomości? Sprawdź folder <strong>SPAM</strong> lub{' '}
                        <strong>Oferty</strong>.
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="success-panel text-left mb-6">
                <h2 className="success-panel-title">
                  <i className="fas fa-link" />
                  Twój unikalny link
                </h2>
                <p className="text-sm text-parchment-muted mb-3">
                  Zachowaj ten adres — możesz otwierać okienka online niezależnie od wybranego
                  sposobu.
                </p>
                <div className="success-link-row">
                  <input
                    type="text"
                    value={calendarLink}
                    readOnly
                    className="success-link-input"
                    aria-label="Link do kalendarza"
                  />
                  <button type="button" onClick={copyLink} className="btn-green px-4 py-2 whitespace-nowrap text-sm">
                    <i className={`fas ${linkCopied ? 'fa-check' : 'fa-copy'} mr-2`} />
                    {linkCopied ? 'Skopiowano' : 'Kopiuj'}
                  </button>
                </div>
              </div>

              <div className="alert-info mb-8 text-left">
                <p className="font-semibold mb-2">Jak korzystać z kalendarza</p>
                <ul className="space-y-1 ml-5 list-disc text-sm">
                  <li>Każdego dnia grudnia otwórz jedno okienko</li>
                  <li>Wykonaj zadanie z okienka</li>
                  <li>Postęp zapisuje się automatycznie</li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  to={calendarLink.replace(window.location.origin, '')}
                  className="btn-red flex-1 py-3 px-6 text-base"
                >
                  <i className="fas fa-gift mr-2" />
                  Otwórz kalendarz
                </Link>
                <Link to="/" className="btn-outline-parchment flex-1 py-3 px-6 text-base text-center">
                  <i className="fas fa-home mr-2" />
                  Strona główna
                </Link>
              </div>
            </>
          )}

          {calendarLinks.length > 0 && (isPhysicalOrder || calendarLinks.length > 1) && (
            <div className="success-panel mb-6">
              <h2 className="success-panel-title">Twoje kalendarze</h2>
              {calendarLinks.map((link, index) => <Link className="block underline my-2" key={link}
                to={link.replace(window.location.origin, '')}>Otwórz kalendarz {index + 1}</Link>)}
            </div>
          )}

          {isPhysicalOrder && (
            <Link
              to="/"
              className="btn-green inline-flex py-3 px-8 text-base"
              onClick={() => clearOrderSummary()}
            >
              <i className="fas fa-home mr-2" />
              Strona główna
            </Link>
          )}

          <p className="mt-8 text-parchment-muted text-sm">
            Życzymy niezapomnianego czasu adwentowego.
          </p>
        </div>
      </ParchmentCard>
    </FestivePage>
  );
}
