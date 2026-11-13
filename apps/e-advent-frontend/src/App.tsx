import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { privateTitle } from './seo/pages';
import { lazy, Suspense, useEffect, useLayoutEffect, useRef } from 'react';
import Footer from './components/Footer';
import CookieBanner from './components/CookieBanner';
import ScrollToTop from './components/ScrollToTop';
import SantaTrackerTeaser from './components/santa/SantaTrackerTeaser';
import SiteNav from './components/SiteNav';
import { CartProvider } from './context/CartContext';
import Landing from './pages/Landing';
import ProductSelector from './components/products/ProductSelector';
import CreatorInteractive from './pages/CreatorInteractive';
import CreatorScratch from './pages/CreatorScratch';
import PaymentError from './pages/PaymentError';
import CalendarAccess from './pages/CalendarAccess';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Terms from './pages/Terms';
import ShippingAndReturns from './pages/ShippingAndReturns';
import NotFound from './pages/NotFound';
import SantaTracker from './pages/SantaTracker';
import CartPage from './pages/CartPage';
import SantaLetterProduct from './pages/SantaLetterProduct';
import CalendarsHub from './pages/CalendarsHub';
import FreeCalendarPage from './pages/FreeCalendarPage';
import VoiceMessageProduct from './pages/santa-message/VoiceMessageProduct';
import { replayProductView, trackPageView } from './utils/analytics';
import SEOHead from './components/SEOHead';

const Checkout = lazy(() => import('./pages/Checkout'));
const Success = lazy(() => import('./pages/Success'));
const CalendarView = lazy(() => import('./pages/CalendarView'));
const Preview = lazy(() => import('./pages/Preview'));
const WindowPreviewPage = lazy(() => import('./pages/WindowPreviewPage'));
const VoiceMessageCreator = lazy(() => import('./pages/santa-message/VoiceMessageCreator'));
const VoiceMessagePersonalize = lazy(() => import('./pages/santa-message/VoiceMessagePersonalize'));
const SantaPlayerPage = lazy(() => import('./pages/santa-message/SantaPlayerPage'));
const InteractiveCreator = lazy(() => import('./pages/InteractiveCreator'));
const Creator = lazy(() => import('./pages/Creator'));

function AnalyticsListener() {
  const location = useLocation();
  const previous = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (previous.current === location.pathname) return;
    previous.current = location.pathname;
    trackPageView(location.pathname + location.search, privateTitle(location.pathname) ?? document.title);
  }, [location.pathname, location.search]);
  useEffect(() => {
    const enable = () => {
      trackPageView(location.pathname + location.search, privateTitle(location.pathname) ?? document.title);
      replayProductView();
    };
    window.addEventListener('eadvent:measurement-enabled', enable);
    return () => window.removeEventListener('eadvent:measurement-enabled', enable);
  }, [location.pathname, location.search]);
  return null;
}

export function AppContent() {
  const location = useLocation();
  const isPreviewPage =
    location.pathname === '/preview' ||
    location.pathname === '/podglad' ||
    location.pathname.startsWith('/podglad-okienka');
  const isSantaPlayer = location.pathname.startsWith('/od-mikolaja/');
  const hideChrome = isPreviewPage || isSantaPlayer;
  const isWindowPreview = location.pathname.startsWith('/podglad-okienka');
  const screenTitle = privateTitle(location.pathname);

  return (
    <div className={isWindowPreview ? '' : 'flex flex-col min-h-screen pt-[var(--santa-banner-h,0px)]'}>
      {screenTitle && (
        <SEOHead title={screenTitle} description={screenTitle} robots="noindex, nofollow" />
      )}
      {!hideChrome && <SantaTrackerTeaser />}
      {!hideChrome && <SiteNav />}
      <main className={isWindowPreview ? '' : 'grow'}>
        <Suspense fallback={<p role="status" className="p-6 text-center">Ładowanie strony…</p>}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/kalendarze-adwentowe" element={<CalendarsHub />} />
            <Route path="/darmowy-kalendarz" element={<FreeCalendarPage />} />
            <Route path="/list-do-swietego-mikolaja" element={<SantaLetterProduct />} />
            <Route path="/wiadomosc-od-mikolaja" element={<VoiceMessageProduct />} />
            <Route path="/wiadomosc-od-mikolaja/kreator" element={<VoiceMessageCreator />} />
            <Route path="/wiadomosc-od-mikolaja/personalizacja/:token" element={<VoiceMessagePersonalize />} />
            <Route path="/od-mikolaja/:token" element={<SantaPlayerPage />} />
            <Route path="/od-mikolaja/przyklad/:sample" element={<SantaPlayerPage />} />
            <Route path="/koszyk" element={<CartPage />} />
            <Route path="/stworz-kalendarz" element={<ProductSelector />} />
            <Route path="/stworz-kalendarz/interaktywny" element={<CreatorInteractive />} />
            <Route path="/stworz-kalendarz/interaktywny/kreator" element={<InteractiveCreator />} />
            <Route path="/stworz-kalendarz/zdrapka" element={<CreatorScratch />} />
            <Route path="/stworz-kalendarz/puzzle" element={<Navigate to="/stworz-kalendarz" replace />} />
            <Route path="/platnosc" element={<Checkout />} />
            <Route path="/sukces" element={<Success />} />
            <Route path="/platnosc-blad" element={<PaymentError />} />
            <Route path="/kalendarz" element={<CalendarAccess />} />
            <Route path="/kalendarz/:calendarId" element={<CalendarView />} />
            <Route path="/podglad" element={<Preview />} />
            <Route path="/podglad-okienka/:catalogTaskId" element={<WindowPreviewPage />} />
            <Route path="/polityka-prywatnosci" element={<PrivacyPolicy />} />
            <Route path="/regulamin" element={<Terms />} />
            <Route path="/dostawa-i-zwroty" element={<ShippingAndReturns />} />
            <Route path="/sledz-mikolaja" element={<SantaTracker />} />
            <Route path="/track-santa" element={<Navigate to="/sledz-mikolaja" replace />} />
            <Route path="/create" element={<Creator />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/success" element={<Success />} />
            <Route path="/calendar/:calendarId" element={<CalendarView />} />
            <Route path="/preview" element={<Preview />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/shipping" element={<ShippingAndReturns />} />
            <Route path="/returns" element={<ShippingAndReturns />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      {!hideChrome && <Footer />}
      {(!hideChrome || isSantaPlayer) && <CookieBanner />}
    </div>
  );
}

function App() {
  return (
    <Router>
      <CartProvider>
        <ScrollToTop />
        <AppContent />
        <AnalyticsListener />
      </CartProvider>
    </Router>
  );
}

export default App;
