import { Link } from 'react-router-dom';
import logo from '../assets/logo.png';

export default function Footer() {
  return (
    <footer className="footer-bar text-white mt-auto relative">
      <div className="container mx-auto px-4 py-10 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 md:gap-10">
          <div className="md:col-span-1">
            <Link to="/" className="inline-block mb-5">
              <img
                src={logo}
                alt="e-Advent - Interaktywny Kalendarz Adwentowy Online"
                className="h-14 w-auto drop-shadow-lg"
                width="160"
                height="64"
                loading="lazy"
              />
            </Link>
            <p className="text-parchment-muted text-sm leading-relaxed mb-3">
              Święta pełne ciepła — list do Mikołaja, kalendarze adwentowe i magia oczekiwania.
            </p>
            <p className="text-white/40 text-xs">
              List od 29 zł · Kalendarze od 9 zł · Darmowa wysyłka od 100 zł
            </p>
          </div>

          <div>
            <h4 className="font-display text-christmas-gold text-lg font-semibold mb-4 tracking-wide">
              Produkty
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link to="/list-do-swietego-mikolaja" className="text-white/60 hover:text-christmas-gold-light transition-colors text-sm">
                  List do Świętego Mikołaja
                </Link>
              </li>
              <li>
                <Link to="/kalendarze-adwentowe" className="text-white/60 hover:text-christmas-gold-light transition-colors text-sm">
                  Kalendarze adwentowe
                </Link>
              </li>
              <li>
                <Link to="/stworz-kalendarz/interaktywny" className="text-white/60 hover:text-christmas-gold-light transition-colors text-sm">
                  Kalendarz interaktywny
                </Link>
              </li>
              <li>
                <Link to="/stworz-kalendarz/zdrapka" className="text-white/60 hover:text-christmas-gold-light transition-colors text-sm">
                  Kalendarz zdrapka
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-christmas-gold text-lg font-semibold mb-4 tracking-wide">
              Informacje
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link to="/polityka-prywatnosci" className="text-white/60 hover:text-christmas-gold-light transition-colors text-sm">
                  Polityka prywatności
                </Link>
              </li>
              <li>
                <Link to="/regulamin" className="text-white/60 hover:text-christmas-gold-light transition-colors text-sm">
                  Regulamin
                </Link>
              </li>
              <li>
                <Link to="/sledz-mikolaja" className="text-white/60 hover:text-christmas-gold-light transition-colors text-sm">
                  Śledź Mikołaja
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-christmas-gold text-lg font-semibold mb-4 tracking-wide">
              Kontakt
            </h4>
            <p className="text-white/60 text-sm">
              <a href="mailto:kontakt@e-advent.pl" className="hover:text-christmas-gold-light transition-colors">
                kontakt@e-advent.pl
              </a>
            </p>
          </div>

          <div>
            <h4 className="font-display text-christmas-gold text-lg font-semibold mb-4 tracking-wide">
              Aplikacja mobilna
            </h4>
            <a
              href="https://e-advent.pl/download/e-advent.apk"
              className="btn-gold px-5 py-2.5 text-sm"
              onClick={() => {
                if (typeof window !== 'undefined' && window.gtag) {
                  window.gtag('event', 'android_app_downloaded', {
                    event_category: 'engagement',
                    event_label: 'footer',
                  });
                }
              }}
            >
              <i className="fab fa-android" />
              Pobierz na Androida
            </a>
            <p className="text-white/40 text-xs mt-3">
              Korzystaj z kalendarza wygodnie na telefonie
            </p>
          </div>
        </div>

        <div className="border-t border-white/10 mt-10 pt-6 text-center">
          <p className="text-white/30 text-xs tracking-wider">
            &copy; 2025 e-Advent. Wszelkie prawa zastrzeżone.
          </p>
        </div>
      </div>
    </footer>
  );
}
