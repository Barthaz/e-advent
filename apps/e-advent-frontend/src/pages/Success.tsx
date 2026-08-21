import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import FestivePage from '../components/FestivePage';
import ParchmentCard from '../components/ParchmentCard';
import LoadingState from '../components/LoadingState';
import { getCalendar, updateCalendarAcceptance, type GetCalendarResponse } from '../api/api';
import { isPhysicalProduct, getProduct, PHYSICAL_FULFILLMENT_TIME } from '../config/products';
import { OPENING_METHOD_LABELS } from '../components/creator/StepOpeningMethod';
import type { OpeningMethod } from '../types/order';
import logo from '@e-advent/assets/brand/eadvent-logo.png';
import {
  trackPurchase,
  loadGaPurchasePayload,
  clearGaPurchasePayload,
  type AnalyticsItem,
} from '../utils/analytics';
import { loadCart, CART_STORAGE_KEY } from '../utils/cartStorage';

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

function resolvePurchaseItemsFallback(): AnalyticsItem[] {
  const cart = loadCart();
  if (cart.length > 0) {
    return cart.map((i) => ({
      sku: i.sku,
      name: i.label || getProduct(i.sku)?.name || i.sku,
      price: i.unitPrice ?? getProduct(i.sku)?.basePrice ?? 0,
      quantity: i.quantity,
    }));
  }
  const sku = localStorage.getItem('e-advent-sku') || 'order';
  const product = getProduct(sku);
  return [{
    sku,
    name: product?.name || 'Zamówienie e-Advent',
    price: product?.basePrice ?? 0,
    quantity: 1,
  }];
}

function firePurchaseOnce(paymentIntent?: string | null) {
  try {
    const snapshot = loadGaPurchasePayload();
    const transactionId =
      snapshot?.transactionId
      || paymentIntent
      || localStorage.getItem('paymentIntentId')
      || 'unknown';
    const value = snapshot?.value ?? (Number(localStorage.getItem('orderAmount') || 0) || 0);
    const items = snapshot?.items?.length ? snapshot.items : resolvePurchaseItemsFallback();
    const shipping = snapshot?.shipping;

    trackPurchase({
      transactionId,
      value,
      items,
      ...(shipping != null ? { shipping } : {}),
    });
    clearGaPurchasePayload();
    localStorage.removeItem(CART_STORAGE_KEY);
  } catch {
    /* ignore analytics */
  }
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
  const [linkCopied, setLinkCopied] = useState(false);
  const [physicalDetails, setPhysicalDetails] = useState<{
    sku?: string;
    format?: string;
    designUrl?: string;
    shipping?: { fullName?: string; street?: string; city?: string; postalCode?: string; phone?: string };
  }>({});

  const verifyPayment = async (paymentIntent?: string | null, redirectStatus?: string | null): Promise<boolean> => {
    if (redirectStatus === 'succeeded') return true;
    if (paymentIntent) {
      const savedPaymentIntentId = localStorage.getItem('paymentIntentId');
      if (savedPaymentIntentId === paymentIntent) return true;
    }
    return false;
  };

  useEffect(() => {
    const checkPayment = async () => {
      const isFree = searchParams.get('free') === 'true';
      const paymentIntent = searchParams.get('payment_intent');
      const redirectStatus = searchParams.get('redirect_status');
      const paymentStatus = searchParams.get('payment_status');

      if (isFree) {
        setPaymentVerified(true);
        setIsVerifyingPayment(false);
        firePurchaseOnce(`free_${searchParams.get('calendar_id') || localStorage.getItem('calendarId') || 'order'}`);
      } else {
        if (paymentStatus === 'canceled' || paymentStatus === 'failed' || redirectStatus === 'failed') {
          navigate('/platnosc-blad');
          return;
        }

        const verified = await verifyPayment(paymentIntent, redirectStatus);
        if (!verified) {
          navigate('/platnosc-blad');
          return;
        }

        setPaymentVerified(true);
        setIsVerifyingPayment(false);
        firePurchaseOnce(paymentIntent);
      }

      const params = new URLSearchParams(window.location.search);
      const calendarId = params.get('calendar_id') || localStorage.getItem('calendarId');
      const orderSku = localStorage.getItem('e-advent-sku') || '';
      const isPhysicalSku =
        orderSku === 'santa-letter'
        || orderSku === 'santa-certificate'
        || orderSku.startsWith('scratch');

      if (!calendarId && !isPhysicalSku) {
        navigate('/stworz-kalendarz');
        return;
      }

      if (!calendarId && isPhysicalSku) {
        setIsPhysicalOrder(true);
        setPaymentVerified(true);
        setIsVerifyingPayment(false);
        setOrderNumber(localStorage.getItem('orderNumber') || '');
        return;
      }

      if (!calendarId) {
        navigate('/stworz-kalendarz');
        return;
      }

      try {
        const { markCalendarPurchased } = await import('../utils/creatorStorage');
        markCalendarPurchased(calendarId);
      } catch (e) {
        console.warn('[Success] markCalendarPurchased failed', e);
      }

      let calendarResponse: GetCalendarResponse;
      try {
        calendarResponse = await getCalendar(calendarId);
      } catch (error) {
        console.error('[Success] Błąd podczas pobierania kalendarza z API:', error);
        navigate('/stworz-kalendarz');
        return;
      }

      const apiCalendar = calendarResponse.calendar;
      const physical = isPhysicalProduct(apiCalendar.sku || localStorage.getItem('e-advent-sku') || 'interactive');
      setIsPhysicalOrder(physical);
      setOrderNumber(localStorage.getItem('orderNumber') || '');
      if (physical) {
        setPhysicalDetails({
          sku: apiCalendar.sku,
          format: apiCalendar.format,
          designUrl: apiCalendar.design?.imageUrl,
          shipping: apiCalendar.shippingAddress,
        });
      }

      const openingMethod = isOpeningMethod(apiCalendar.openingMethod)
        ? apiCalendar.openingMethod
        : null;

      const mappedCalendarData: CalendarData = {
        name: apiCalendar.author,
        email: apiCalendar.email,
        calendarTitle: apiCalendar.title,
        tasks: apiCalendar.tasks.map(task => ({
          task: task.title,
          day: task.day,
        })),
        dailyEmailReminders: openingMethod === 'email',
        dates: [],
        openingMethod,
        dailyContentEmail: apiCalendar.dailyContentEmail || null,
      };

      setCalendarData(mappedCalendarData);

      if (!physical) {
        const link = `${window.location.origin}/kalendarz/${calendarId}`;
        setCalendarLink(link);
      }

      try {
        const acceptanceDataStr = localStorage.getItem('acceptanceData');
        if (acceptanceDataStr) {
          const acceptanceData = JSON.parse(acceptanceDataStr);
          await updateCalendarAcceptance({
            calendarId: calendarId,
            acceptanceData: {
              termsAccepted: acceptanceData.termsAccepted || true,
              privacyAccepted: acceptanceData.privacyAccepted || true,
              termsAcceptedAt: acceptanceData.termsAcceptedAt || new Date().toISOString(),
              privacyAcceptedAt: acceptanceData.privacyAcceptedAt || new Date().toISOString(),
              clientIP: acceptanceData.clientIP || null,
            },
          });
        }
      } catch (error) {
        console.error('[Success] Błąd podczas przesyłania danych o akceptacji:', error);
      }

      try {
        const cookieConsent = localStorage.getItem('cookieConsent');
        localStorage.clear();
        if (cookieConsent) {
          localStorage.setItem('cookieConsent', cookieConsent);
        }
      } catch (error) {
        console.warn('[Success] Nie można wyczyścić localStorage:', error);
      }
    };

    checkPayment();
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

  if (isVerifyingPayment || !paymentVerified) {
    return <LoadingState message="Weryfikowanie płatności..." />;
  }

  if (!calendarData && !isPhysicalOrder) {
    return <LoadingState message="Ładowanie..." />;
  }

  const openingMethod = calendarData?.openingMethod || null;
  const contentEmail = calendarData?.dailyContentEmail || calendarData?.email || '';

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
                Twoje zamówienie{' '}
                <span className="font-semibold text-christmas-red">{calendarData?.calendarTitle}</span>{' '}
                zostało przyjęte do realizacji.
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
              <p className="mb-2">
                <strong>Produkt:</strong>{' '}
                {getProduct(physicalDetails.sku || '')?.name || physicalDetails.sku}
              </p>
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
              {physicalDetails.shipping && (
                <div className="mb-3">
                  <p className="font-semibold mb-1">Adres wysyłki:</p>
                  <p className="text-parchment-muted text-sm">
                    {physicalDetails.shipping.fullName}<br />
                    {physicalDetails.shipping.street}<br />
                    {physicalDetails.shipping.postalCode} {physicalDetails.shipping.city}<br />
                    Tel: {physicalDetails.shipping.phone}
                  </p>
                </div>
              )}
              <p className="text-sm text-parchment-muted mt-4">
                Przygotujemy Twój kalendarz w ciągu {PHYSICAL_FULFILLMENT_TIME} i wyślemy go na podany adres.
                Potwierdzenie wysłaliśmy na {calendarData?.email}.
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
                      Link do kalendarza i kod dostępu wysłaliśmy na{' '}
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

          {isPhysicalOrder && (
            <Link to="/" className="btn-green inline-flex py-3 px-8 text-base">
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
