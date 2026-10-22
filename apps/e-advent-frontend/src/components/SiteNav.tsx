import { useEffect, useId, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../context/useCart';

const NAV_LINKS = [
  { to: '/', label: 'Strona główna', end: true },
  { to: '/kalendarze-adwentowe', label: 'Kalendarze' },
  { to: '/list-do-swietego-mikolaja', label: 'List do Mikołaja' },
  { to: '/sledz-mikolaja', label: 'Śledź Mikołaja' },
] as const;

export default function SiteNav() {
  const location = useLocation();
  const { itemCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();

  const isActive = (to: string, end?: boolean) => {
    if (end) return location.pathname === to;
    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  };

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const linkClass = (to: string, end?: boolean, compact = false) =>
    `${compact ? 'px-3 py-2 text-sm' : 'px-4 py-3 text-base'} rounded-lg font-medium transition-colors ${
      isActive(to, end)
        ? 'text-christmas-gold-light bg-white/10'
        : 'text-white/75 hover:text-christmas-gold-light hover:bg-white/5'
    }`;

  const cartLink = (
    <Link
      to="/koszyk"
      className={`relative inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors shrink-0 ${
        isActive('/koszyk')
          ? 'text-christmas-gold-light bg-white/10'
          : 'text-white/75 hover:text-christmas-gold-light hover:bg-white/5'
      }`}
      aria-label={itemCount > 0 ? `Koszyk, ${itemCount} pozycji` : 'Koszyk'}
      onClick={() => setMenuOpen(false)}
    >
      <i className="fas fa-shopping-basket" />
      <span className="hidden sm:inline">Koszyk</span>
      {itemCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 flex items-center justify-center rounded-full bg-christmas-gold text-christmas-green text-xs font-bold">
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
    </Link>
  );

  return (
    <>
      {menuOpen && (
        <button
          type="button"
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          aria-label="Zamknij menu"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <nav
        className="sticky top-[var(--santa-banner-h,0px)] z-50 border-b border-christmas-gold/20 bg-christmas-green/95 backdrop-blur-md shadow-lg shadow-black/10"
        aria-label="Główna nawigacja"
      >
        <div className="relative z-[51] container mx-auto px-4">
          <div className="flex items-center justify-between gap-4 py-3">
            <Link
              to="/"
              className="font-display text-xl md:text-2xl font-semibold text-christmas-gold-light tracking-wide shrink-0 hover:text-christmas-gold transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              e-Advent
            </Link>

            <ul className="hidden lg:flex items-center gap-1 lg:gap-2">
              {NAV_LINKS.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className={linkClass(link.to, 'end' in link && link.end, true)}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-1">
              {cartLink}
              <button
                type="button"
                className="lg:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg text-christmas-gold-light hover:bg-white/10 transition-colors"
                aria-label={menuOpen ? 'Zamknij menu' : 'Otwórz menu'}
                aria-expanded={menuOpen}
                aria-controls={menuId}
                onClick={() => setMenuOpen((open) => !open)}
              >
                <i className={`fas ${menuOpen ? 'fa-times' : 'fa-bars'} text-lg`} />
              </button>
            </div>
          </div>
        </div>

        <div
          id={menuId}
          className={`lg:hidden overflow-hidden transition-[max-height,opacity] duration-200 ease-out ${
            menuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
          }`}
        >
          <ul className="container mx-auto px-4 pb-4 flex flex-col gap-1 border-t border-christmas-gold/15 pt-2 bg-christmas-green/95">
            {NAV_LINKS.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className={`block ${linkClass(link.to, 'end' in link && link.end)}`}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </>
  );
}
