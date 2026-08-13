import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const NAV_LINKS = [
  { to: '/', label: 'Strona główna', end: true },
  { to: '/kalendarze-adwentowe', label: 'Kalendarze' },
  { to: '/list-do-swietego-mikolaja', label: 'List do Mikołaja' },
  { to: '/sledz-mikolaja', label: 'Śledź Mikołaja' },
] as const;

export default function SiteNav() {
  const location = useLocation();
  const { itemCount } = useCart();

  const isActive = (to: string, end?: boolean) => {
    if (end) return location.pathname === to;
    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  };

  return (
    <nav
      className="sticky top-0 z-50 border-b border-christmas-gold/20 bg-christmas-green/95 backdrop-blur-md shadow-lg shadow-black/10"
      aria-label="Główna nawigacja"
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between gap-4 py-3">
          <Link
            to="/"
            className="font-display text-xl md:text-2xl font-semibold text-christmas-gold-light tracking-wide shrink-0 hover:text-christmas-gold transition-colors"
          >
            e-Advent
          </Link>

          <ul className="hidden md:flex items-center gap-1 lg:gap-2">
            {NAV_LINKS.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(link.to, 'end' in link && link.end)
                      ? 'text-christmas-gold-light bg-white/10'
                      : 'text-white/75 hover:text-christmas-gold-light hover:bg-white/5'
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <Link
            to="/koszyk"
            className={`relative inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors shrink-0 ${
              isActive('/koszyk')
                ? 'text-christmas-gold-light bg-white/10'
                : 'text-white/75 hover:text-christmas-gold-light hover:bg-white/5'
            }`}
            aria-label={itemCount > 0 ? `Koszyk, ${itemCount} pozycji` : 'Koszyk'}
          >
            <i className="fas fa-shopping-basket" />
            <span className="hidden sm:inline">Koszyk</span>
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 flex items-center justify-center rounded-full bg-christmas-gold text-christmas-green text-xs font-bold">
                {itemCount > 99 ? '99+' : itemCount}
              </span>
            )}
          </Link>
        </div>

        {/* Mobile links */}
        <ul className="md:hidden flex gap-1 overflow-x-auto pb-3 -mt-1 scrollbar-none">
          {NAV_LINKS.map((link) => (
            <li key={link.to} className="shrink-0">
              <Link
                to={link.to}
                className={`block px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive(link.to, 'end' in link && link.end)
                    ? 'text-christmas-gold-light bg-white/10'
                    : 'text-white/70 hover:text-christmas-gold-light'
                }`}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
