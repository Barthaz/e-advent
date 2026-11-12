import { chooseMeasurement, measurementChoice } from '../utils/measurementConsent';
import { useState, useEffect } from 'react';

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(!measurementChoice());
    const open = () => setIsVisible(true);
    window.addEventListener('eadvent:cookie-settings', open);
    return () => window.removeEventListener('eadvent:cookie-settings', open);
  }, []);

  const choose = (accepted: boolean) => {
    setIsVisible(false);
    chooseMeasurement(accepted);
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
                Zapamiętujemy koszyk i postęp w kalendarzu. Za Twoją zgodą włączymy także Google Analytics i Meta Pixel do pomiaru odwiedzin i zakupów. Wybór możesz zmienić w stopce. Szczegóły opisujemy w{' '}
                <a href="/polityka-prywatnosci" className="text-christmas-gold-light hover:underline font-medium">
                  Polityce prywatności
                </a>.
              </p>
            </div>
            <button onClick={() => choose(false)} className="text-white underline px-3 py-2">Tylko niezbędne</button>
            <button onClick={() => choose(true)} className="btn-gold px-6 py-3 whitespace-nowrap">
              <i className="fas fa-check" />
              Zezwalam na pomiar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
