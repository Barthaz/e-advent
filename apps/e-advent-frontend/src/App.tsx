import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Footer from './components/Footer';
import CookieBanner from './components/CookieBanner';
import ScrollToTop from './components/ScrollToTop';
import SantaTrackerTeaser from './components/santa/SantaTrackerTeaser';
import SiteNav from './components/SiteNav';
import { CartProvider } from './context/CartContext';
import Landing from './pages/Landing';
import Creator from './pages/Creator';
import ProductSelector from './components/products/ProductSelector';
import CreatorInteractive from './pages/CreatorInteractive';
import CreatorScratch from './pages/CreatorScratch';
import Checkout from './pages/Checkout';
import Success from './pages/Success';
import PaymentError from './pages/PaymentError';
import CalendarView from './pages/CalendarView';
import CalendarAccess from './pages/CalendarAccess';
import Preview from './pages/Preview';
import WindowPreviewPage from './pages/WindowPreviewPage';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Terms from './pages/Terms';
import NotFound from './pages/NotFound';
import SantaTracker from './pages/SantaTracker';
import CartPage from './pages/CartPage';
import SantaLetterProduct from './pages/SantaLetterProduct';
import CalendarsHub from './pages/CalendarsHub';
import { trackPageView } from './utils/analytics';
import SEOHead from './components/SEOHead';

function AnalyticsListener() {
  const location = useLocation();
  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location.pathname, location.search]);
  return null;
}

function AppContent() {
  const location = useLocation();
  const isPreviewPage =
    location.pathname === '/preview' ||
    location.pathname === '/podglad' ||
    location.pathname.startsWith('/podglad-okienka');
  const hideChrome = isPreviewPage;
  const isWindowPreview = location.pathname.startsWith('/podglad-okienka');
  const noIndexPaths = ['/platnosc', '/checkout', '/sukces', '/success', '/platnosc-blad', '/koszyk'];
  const isNoIndex =
    noIndexPaths.some((p) => location.pathname === p) || isWindowPreview;

  return (
    <div className={isWindowPreview ? '' : 'flex flex-col min-h-screen pt-[var(--santa-banner-h,0px)]'}>
      {isNoIndex && (
        <SEOHead title="e-Advent" description="Proces zamówienia" robots="noindex, nofollow" />
      )}
      {!hideChrome && <SantaTrackerTeaser />}
      {!hideChrome && <SiteNav />}
      <main className={isWindowPreview ? '' : 'grow'}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/kalendarze-adwentowe" element={<CalendarsHub />} />
          <Route path="/list-do-swietego-mikolaja" element={<SantaLetterProduct />} />
          <Route path="/koszyk" element={<CartPage />} />
          <Route path="/stworz-kalendarz" element={<ProductSelector />} />
          <Route path="/stworz-kalendarz/interaktywny" element={<CreatorInteractive />} />
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
          <Route path="/sledz-mikolaja" element={<SantaTracker />} />
          <Route path="/track-santa" element={<Navigate to="/sledz-mikolaja" replace />} />
          <Route path="/create" element={<Creator />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/success" element={<Success />} />
          <Route path="/calendar/:calendarId" element={<CalendarView />} />
          <Route path="/preview" element={<Preview />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {!hideChrome && <Footer />}
      {!hideChrome && <CookieBanner />}
    </div>
  );
}

function App() {
  return (
    <Router>
      <CartProvider>
        <ScrollToTop />
        <AnalyticsListener />
        <AppContent />
      </CartProvider>
    </Router>
  );
}

export default App;
