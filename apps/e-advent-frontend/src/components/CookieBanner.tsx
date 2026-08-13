import { useState, useEffect } from 'react';

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up">
      <div className="cookie-banner">
        <div className="container mx-auto px-4 md:px-8 py-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 max-w-7xl mx-auto">
            <div className="flex-1">
              <div className="flex items-center mb-2">
                <i className="fas fa-cookie text-christmas-gold-light text-2xl mr-3" />
                <h3 className="text-xl font-semibold font-display">Informacja o plikach cookie</h3>
              </div>
              <p className="text-white/80 text-sm md:text-base leading-relaxed">
                Ta strona używa plików cookie, aby zapamiętać Twój postęp w kalendarzu adwentowym
                i zapewnić lepsze doświadczenie. Kontynuując korzystanie ze strony, zgadzasz się
                na wykorzystanie plików cookie. Więcej informacji znajdziesz w naszej{' '}
                <a href="/polityka-prywatnosci" className="text-christmas-gold-light hover:underline font-medium">
                  Polityce prywatności
                </a>.
              </p>
            </div>
            <button onClick={handleAccept} className="btn-gold px-6 py-3 whitespace-nowrap">
              <i className="fas fa-check" />
              Akceptuję
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
