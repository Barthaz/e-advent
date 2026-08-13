import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import FestivePage from '../components/FestivePage';
import ContentCard from '../components/ContentCard';
import AndroidPromo from '../components/AndroidPromo';
import LoadingState from '../components/LoadingState';
// Importy usunięte - dane są teraz pobierane z API
import { sendCalendarEmail, getCalendar, updateCalendarAcceptance, type GetCalendarResponse } from '../api/api';
import { isPhysicalProduct, getProduct, PHYSICAL_FULFILLMENT_TIME } from '../config/products';
import logo from '../assets/logo.png';

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
}

export default function Success() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [calendarLink, setCalendarLink] = useState('');
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(true);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [isPhysicalOrder, setIsPhysicalOrder] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [physicalDetails, setPhysicalDetails] = useState<{
    sku?: string;
    format?: string;
    designUrl?: string;
    shipping?: { fullName?: string; street?: string; city?: string; postalCode?: string; phone?: string };
  }>({});

  // Funkcja weryfikacji płatności
  const verifyPayment = async (paymentIntent?: string | null, redirectStatus?: string | null): Promise<boolean> => {
    console.log('[Success] Weryfikacja płatności:', { paymentIntent, redirectStatus });
    
    // Sprawdź redirect_status z URL - jeśli jest "succeeded", płatność się powiodła
    if (redirectStatus === 'succeeded') {
      console.log('[Success] Płatność potwierdzona przez redirect_status=succeeded');
      return true;
    }
    
    // Jeśli mamy payment_intent, sprawdź czy jest zapisany w localStorage
    if (paymentIntent) {
      const savedPaymentIntentId = localStorage.getItem('paymentIntentId');
      if (savedPaymentIntentId === paymentIntent) {
        console.log('[Success] Payment Intent ID pasuje do zapisanego w localStorage');
        // W produkcji tutaj powinno być wywołanie do backendu do weryfikacji
        // Na razie akceptujemy jeśli ID się zgadza
        return true;
      }
    }
    
    // Jeśli nie ma parametrów Stripe, odrzuć (wymagamy potwierdzenia płatności)
    console.warn('[Success] Brak parametrów potwierdzających płatność');
    return false;
  };

  useEffect(() => {
    const checkPayment = async () => {
      // Sprawdź czy to darmowy kalendarz (free=true w query params)
      const isFree = searchParams.get('free') === 'true';
      
      // Pobierz parametry z URL (Stripe przekierowuje z parametrami)
      const paymentIntent = searchParams.get('payment_intent');
      const redirectStatus = searchParams.get('redirect_status');
      const paymentStatus = searchParams.get('payment_status');
      
      console.log('[Success] Parametry URL:', { paymentIntent, redirectStatus, paymentStatus, isFree });
      
      // Jeśli to darmowy kalendarz, pomiń weryfikację płatności
      if (isFree) {
        console.log('[Success] Darmowy kalendarz - pomijam weryfikację płatności');
        setPaymentVerified(true);
        setIsVerifyingPayment(false);
      } else {
        // Sprawdź czy płatność została anulowana lub nie powiodła się
        if (paymentStatus === 'canceled' || paymentStatus === 'failed' || redirectStatus === 'failed') {
          console.warn('[Success] Płatność nie powiodła się, przekierowywanie do strony błędu');
          navigate('/platnosc-blad');
          return;
        }

        // Weryfikuj płatność
        const verified = await verifyPayment(paymentIntent, redirectStatus);
        
        if (!verified) {
          console.warn('[Success] Płatność nie została zweryfikowana, przekierowywanie do strony błędu');
          navigate('/platnosc-blad');
          return;
        }

        console.log('[Success] Płatność zweryfikowana pomyślnie');
        setPaymentVerified(true);
        setIsVerifyingPayment(false);
        try {
          const { trackPurchase } = await import('../utils/analytics');
          const pi = paymentIntent || localStorage.getItem('paymentIntentId') || 'unknown';
          trackPurchase({
            transactionId: pi,
            value: Number(localStorage.getItem('orderAmount') || 0) || 0,
            items: [{ sku: localStorage.getItem('e-advent-sku') || 'order', name: 'Zamówienie e-Advent', price: 0, quantity: 1 }],
          });
          localStorage.removeItem('e-advent-cart');
        } catch { /* ignore analytics */ }
      }

      // Pobierz calendarId z query lub pending/legacy storage
      const params = new URLSearchParams(window.location.search);
      const calendarId = params.get('calendar_id') || localStorage.getItem('calendarId');
      const orderSku = localStorage.getItem('e-advent-sku') || '';
      const isLetterOrder = orderSku === 'santa-letter';

      if (!calendarId && !isLetterOrder) {
        console.error('[Success] Brak calendarId w localStorage, przekierowywanie do kreatora');
        navigate('/stworz-kalendarz');
        return;
      }

      if (!calendarId && isLetterOrder) {
        setIsPhysicalOrder(true);
        setPaymentVerified(true);
        setIsVerifyingPayment(false);
        try {
          localStorage.removeItem('e-advent-cart');
          const { trackPurchase } = await import('../utils/analytics');
          trackPurchase({
            transactionId: paymentIntent || localStorage.getItem('paymentIntentId') || 'letter',
            value: Number(localStorage.getItem('orderAmount') || 34) || 34,
            items: [{ sku: 'santa-letter', name: 'List do Świętego Mikołaja', price: 29, quantity: 1 }],
          });
        } catch { /* ignore */ }
        return;
      }

      if (!calendarId) {
        navigate('/stworz-kalendarz');
        return;
      }

      // Mark as purchased and clear pending session so next checkout gets a new UUID
      try {
        const { markCalendarPurchased } = await import('../utils/creatorStorage');
        markCalendarPurchased(calendarId);
      } catch (e) {
        console.warn('[Success] markCalendarPurchased failed', e);
      }

      console.log('[Success] Pobieranie danych kalendarza z API, calendarId:', calendarId);

      // Pobierz dane kalendarza z API
      let calendarResponse: GetCalendarResponse;
      try {
        calendarResponse = await getCalendar(calendarId);
        console.log('[Success] Kalendarz pobrany z API:', calendarResponse);
      } catch (error) {
        console.error('[Success] Błąd podczas pobierania kalendarza z API:', error);
        navigate('/stworz-kalendarz');
        return;
      }

      // Mapuj dane z API na wewnętrzną strukturę
      const apiCalendar = calendarResponse.calendar;
      const physical = isPhysicalProduct(apiCalendar.sku || localStorage.getItem('e-advent-sku') || 'interactive');
      setIsPhysicalOrder(physical);
      setOrderId(localStorage.getItem('orderId') || '');
      if (physical) {
        setPhysicalDetails({
          sku: apiCalendar.sku,
          format: apiCalendar.format,
          designUrl: apiCalendar.design?.imageUrl,
          shipping: apiCalendar.shippingAddress,
        });
      }

      const mappedCalendarData: CalendarData = {
        name: apiCalendar.author,
        email: apiCalendar.email,
        calendarTitle: apiCalendar.title,
        tasks: apiCalendar.tasks.map(task => ({
          task: task.title,
          day: task.day,
          // status jest już w API, ale nie potrzebujemy go w wewnętrznej strukturze
        })),
        dailyEmailReminders: false, // API nie zwraca tego pola
        dates: [], // API nie zwraca dat, ale możemy je wygenerować jeśli potrzeba
      };

      console.log('[Success] Dane kalendarza zmapowane:', {
        name: mappedCalendarData.name,
        email: mappedCalendarData.email,
        calendarTitle: mappedCalendarData.calendarTitle,
        tasksCount: mappedCalendarData.tasks.length,
      });

      setCalendarData(mappedCalendarData);

      const fullCalendarData = {
        name: mappedCalendarData.name,
        email: mappedCalendarData.email,
        calendarTitle: mappedCalendarData.calendarTitle,
        tasks: apiCalendar.tasks.map(task => ({
          day: task.day,
          task: task.title,
        })),
        dates: mappedCalendarData.dates || [],
        calendarId: calendarId,
        createdAt: apiCalendar.creation,
        dailyEmailReminders: mappedCalendarData.dailyEmailReminders || false,
      };

      if (!physical) {
        const link = `${window.location.origin}/kalendarz/${calendarId}`;
        setCalendarLink(link);
        if (mappedCalendarData.email) {
          sendEmail(mappedCalendarData.email, mappedCalendarData.name, link, fullCalendarData);
        } else {
          setEmailSent(false);
          setIsSendingEmail(false);
        }
      } else {
        setEmailSent(true);
        setIsSendingEmail(false);
      }

      // Pobierz i wyślij dane o akceptacji regulaminu i polityki prywatności (PRZED czyszczeniem localStorage)
      try {
        const acceptanceDataStr = localStorage.getItem('acceptanceData');
        if (acceptanceDataStr) {
          const acceptanceData = JSON.parse(acceptanceDataStr);
          console.log('[Success] Wysyłanie danych o akceptacji:', acceptanceData);
          
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
          
          console.log('[Success] Dane o akceptacji przesłane pomyślnie');
        } else {
          console.warn('[Success] Brak danych o akceptacji w localStorage');
        }
      } catch (error) {
        console.error('[Success] Błąd podczas przesyłania danych o akceptacji:', error);
        // Nie przerywamy procesu - to nie jest krytyczne
      }

      // Wyczyść WSZYSTKIE dane z localStorage po pomyślnej płatności (zachowaj tylko cookieConsent)
      try {
        console.log('[Success] Czyszczenie localStorage po pomyślnej płatności...');
        
        // Zapisz cookieConsent przed czyszczeniem
        const cookieConsent = localStorage.getItem('cookieConsent');
        
        // Wyczyść CAŁY localStorage (wszystkie dane)
        localStorage.clear();
        
        // Przywróć cookieConsent jeśli był zapisany
        if (cookieConsent) {
          localStorage.setItem('cookieConsent', cookieConsent);
        }
        
        console.log('[Success] localStorage wyczyszczony pomyślnie (zachowano cookieConsent)');
      } catch (error) {
        console.warn('[Success] Nie można wyczyścić localStorage:', error);
      }
    };

    checkPayment();
  }, [navigate, searchParams]);

  const sendEmail = async (
    email: string, 
    name: string, 
    link: string,
    calendarData: {
      name: string;
      email: string;
      calendarTitle: string;
      tasks: Array<{
        day: number;
        task: string;
        duration?: number;
        lockedDay?: number;
        latestDay?: number;
      }>;
      dates: string[];
      previewLayout?: Array<{
        day: number;
        width: number;
        height: number;
        order: number;
        x?: number;
        y?: number;
      }>;
      calendarId?: string;
      createdAt?: string;
      dailyEmailReminders?: boolean;
    }
  ) => {
    setIsSendingEmail(true);
    console.log('[Success] Rozpoczynanie wysyłki email z danymi kalendarza...');

    try {
      // Wywołaj API do wysyłki emaila z załącznikiem JSON
      await sendCalendarEmail({
        email,
        name,
        calendarLink: link,
        calendarData: {
          name: calendarData.name,
          email: calendarData.email,
          calendarTitle: calendarData.calendarTitle,
          tasks: calendarData.tasks,
          dates: calendarData.dates,
          previewLayout: calendarData.previewLayout,
        },
      });

      console.log('[Success] Email wysłany pomyślnie z załącznikiem JSON');
      setIsSendingEmail(false);
      setEmailSent(true);

      // Track email sent event
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'email_sent', {
          event_category: 'conversion',
          event_label: 'success_page_email',
        });
      }
    } catch (error) {
      console.error('[Success] Błąd podczas wysyłki email:', error);
      
      // Jeśli API nie działa, pokaż komunikat ale nie blokuj użytkownika
      // Użytkownik nadal ma dostęp do kalendarza przez link
      setIsSendingEmail(false);
      setEmailSent(false);
      
      // Pokaż alert z informacją o błędzie (opcjonalnie)
      if (error instanceof Error) {
        console.warn('[Success] Email nie został wysłany, ale kalendarz jest dostępny przez link');
      }
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(calendarLink);
    alert('✨ Link skopiowany do schowka!');
  };

  if (isVerifyingPayment || !paymentVerified) {
    return <LoadingState message="Weryfikowanie płatności..." />;
  }

  if (!calendarData) {
    return <LoadingState message="Ładowanie..." />;
  }

  return (
    <FestivePage maxWidth="md" showLogo={false}>
      <ContentCard variant="gold" padding="lg">
        <div className="text-center">
            <div className="mb-6 flex justify-center">
              <img 
                src={logo}
                alt="e-Advent - Interaktywny Kalendarz Adwentowy Online"
                width="200"
                height="80"
                loading="eager"
                fetchPriority="high"
                className="h-32 md:h-40 lg:h-48 w-auto drop-shadow-lg"
              />
            </div>

            <h1 className="heading-page font-calligraphy text-4xl md:text-6xl mb-4">
              {isPhysicalOrder ? 'Dziękujemy za zamówienie!' : 'Dziękujemy za zakup!'}
            </h1>

            <p className="text-xl md:text-2xl text-parchment-muted mb-8">
              {isPhysicalOrder ? (
                <>Twoje zamówienie <span className="font-bold text-christmas-red">{calendarData.calendarTitle}</span> zostało przyjęte do realizacji.</>
              ) : (
                <>Twój spersonalizowany kalendarz adwentowy{' '}
                <span className="font-bold text-christmas-red">{calendarData.calendarTitle}</span> jest gotowy!</>
              )}
            </p>

            {isPhysicalOrder ? (
              <div className="info-box-green mb-8 text-left">
                <p className="mb-3"><strong>Produkt:</strong> {getProduct(physicalDetails.sku || '')?.name || physicalDetails.sku}</p>
                {physicalDetails.format && <p className="mb-3"><strong>Format:</strong> {physicalDetails.format}</p>}
                {orderId && <p className="mb-3"><strong>Numer zamówienia:</strong> {orderId}</p>}
                {physicalDetails.designUrl && (
                  <div className="mb-3">
                    <p className="mb-2"><strong>Grafika:</strong></p>
                    <img src={physicalDetails.designUrl} alt="Grafika zamówienia" className="max-h-32 rounded border" />
                  </div>
                )}
                {physicalDetails.shipping && (
                  <div className="mb-3">
                    <p className="font-semibold mb-1">Adres wysyłki:</p>
                    <p>{physicalDetails.shipping.fullName}<br />{physicalDetails.shipping.street}<br />{physicalDetails.shipping.postalCode} {physicalDetails.shipping.city}<br />Tel: {physicalDetails.shipping.phone}</p>
                  </div>
                )}
                <p className="text-gray-200 text-sm mt-4">
                  Przygotujemy Twój kalendarz w ciągu {PHYSICAL_FULFILLMENT_TIME} i wyślemy go na podany adres. Potwierdzenie wysłaliśmy na {calendarData.email}.
                </p>
              </div>
            ) : (
            <>
            <div className="info-box-green mb-8 text-left md:text-center">
              <div className="flex items-center justify-center mb-4">
                <i className={`fas ${emailSent ? 'fa-check-circle' : calendarData.email ? 'fa-envelope' : 'fa-exclamation-triangle'} text-christmas-gold-light text-4xl ${isSendingEmail ? 'fa-spin' : ''}`}></i>
              </div>
              {!calendarData.email ? (
                <div>
                  <p className="text-lg md:text-xl font-semibold mb-2 text-yellow-300">
                    <i className="fas fa-exclamation-triangle mr-2"></i>
                    Brak adresu email
                  </p>
                  <p className="text-gray-200 text-sm">
                    Nie znaleziono adresu email w danych zamówienia. Skopiuj link poniżej, aby uzyskać dostęp do kalendarza.
                  </p>
                </div>
              ) : isSendingEmail ? (
                <div>
                  <p className="text-lg md:text-xl font-semibold mb-2">
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Wysyłanie emaila...
                  </p>
                  <p className="text-gray-200 text-sm">
                    Link do kalendarza jest wysyłany na adres: <span className="font-bold text-christmas-gold-light">{calendarData.email}</span>
                  </p>
                </div>
              ) : emailSent ? (
                <div>
                  <p className="text-lg md:text-xl font-semibold mb-2 text-christmas-gold-light">
                    Email wysłany!
                  </p>
                  <p className="text-gray-200 text-sm mb-3">
                    Link do Twojego kalendarza został wysłany na adres: <span className="font-bold text-christmas-gold-light">{calendarData.email}</span>
                  </p>
                  <div className="notice-warning">
                    <p>
                      <i className="fas fa-exclamation-triangle mr-2" />
                      Nie widzisz wiadomości? Sprawdź folder <strong>SPAM</strong> lub <strong>Oferty</strong>!
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-lg md:text-xl font-semibold mb-2">
                    Link do kalendarza zostanie wysłany na adres:
                  </p>
                  <p className="text-christmas-gold-light font-bold text-xl mb-3">{calendarData.email}</p>
                  <div className="notice-warning">
                    <p>
                      <i className="fas fa-exclamation-triangle mr-2" />
                      Nie widzisz wiadomości? Sprawdź folder <strong>SPAM</strong> lub <strong>Oferty</strong>!
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="info-box-gold mb-8 text-left">
              <p className="font-bold mb-3 text-christmas-green text-lg">
                <i className="fas fa-link mr-2"></i>
                Twój link do kalendarza:
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white p-3 rounded-lg border-2 border-christmas-green shadow-inner">
                <input
                  type="text"
                  value={calendarLink}
                  readOnly
                  className="flex-1 outline-none text-sm text-gray-700 bg-transparent px-2"
                />
                <button
                  onClick={copyLink}
                  className="btn-green px-6 py-2 whitespace-nowrap"
                >
                  <i className="fas fa-copy mr-2"></i>
                  Kopiuj link
                </button>
              </div>
            </div>

            <div className="alert-info mb-8 text-left">
              <p className="text-gray-700 text-sm mb-2">
                <i className="fas fa-calendar-check text-blue-500 mr-2"></i>
                <strong>Jak korzystać z kalendarza:</strong>
              </p>
              <ul className="text-gray-600 text-sm space-y-1 ml-6 list-disc">
                <li>Każdego dnia grudnia otwórz jedno okienko</li>
                <li>Wykonaj zadanie z okienka i ciesz się magiczną chwilą!</li>
                <li>Twój postęp jest automatycznie zapisywany</li>
              </ul>
            </div>

            <div className="md:hidden mb-8">
              <AndroidPromo label="Pobierz aplikację" analyticsLabel="success_page" />
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to={calendarLink.replace(window.location.origin, '')}
                className="btn-red flex-1 py-4 px-6 text-lg"
              >
                <i className="fas fa-gift mr-2"></i>
                Otwórz kalendarz teraz
              </Link>
              <Link
                to="/"
                className="btn-green flex-1 py-4 px-6 text-lg"
              >
                <i className="fas fa-home mr-2"></i>
                Strona główna
              </Link>
            </div>
            </>
            )}

            {isPhysicalOrder && (
              <Link to="/" className="btn-green inline-flex py-4 px-8 text-lg">
                <i className="fas fa-home mr-2" />
                Strona główna
              </Link>
            )}

            <p className="mt-8 text-gray-500 text-sm">
              <i className="fas fa-heart text-christmas-red mr-1"></i>
              Życzymy Ci niezapomnianego czasu adwentowego!
            </p>
        </div>
      </ContentCard>
    </FestivePage>
  );
}
