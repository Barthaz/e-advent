import { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../context/useCart';
import navLogo from '../assets/nav-logo.webp';

type NavItem = { to: string; label: string; hint: string };

type NavGroup = { id: string; label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'kalendarze',
    label: 'Kalendarze',
    items: [
      { to: '/stworz-kalendarz', label: 'Wybierz prezent', hint: 'Porównaj produkty e-Advent' },
      { to: '/kalendarze-adwentowe', label: 'Wszystkie kalendarze', hint: 'Online i zdrapka' },
      { to: '/stworz-kalendarz/interaktywny', label: 'Kalendarz online', hint: '24 okienka na telefonie' },
      { to: '/stworz-kalendarz/zdrapka', label: 'Kalendarz zdrapka', hint: 'Papierowy prezent do domu' },
      { to: '/darmowy-kalendarz', label: 'Darmowy kalendarz', hint: 'Gotowe zadania, bez zamówienia' },
      { to: '/kalendarz', label: 'Otwórz swój kalendarz', hint: 'Masz już link do okienek' },
    ],
  },
  {
    id: 'mikolaj',
    label: 'Święty Mikołaj',
    items: [
      { to: '/list-do-swietego-mikolaja', label: 'List do Mikołaja', hint: 'Papierowy zestaw do wysyłki' },
      { to: '/wiadomosc-od-mikolaja', label: 'Wiadomość od Mikołaja', hint: 'Nagranie na imię dziecka' },
      { to: '/sledz-mikolaja', label: 'Śledź Mikołaja', hint: 'Mapa na żywo w Wigilię' },
    ],
  },
];

function isActive(pathname: string, to: string) {
  return pathname === to || pathname.startsWith(`${to}/`);
}

function groupForPath(pathname: string) {
  return NAV_GROUPS.find((group) => group.items.some((item) => isActive(pathname, item.to)))?.id ?? null;
}

export default function SiteNav() {
  const location = useLocation();
  const { itemCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileGroup, setMobileGroup] = useState<string | null>(null);
  const menuId = useId();
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMenuOpen(false);
    setOpenMenu(null);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setMenuOpen(false); menuButton.current?.focus(); }
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!openMenu) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenMenu(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openMenu]);

  const cartLink = (
    <Link
      to="/koszyk"
      className={`relative inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        isActive(location.pathname, '/koszyk')
          ? 'bg-white/10 text-christmas-gold-light'
          : 'text-white/75 hover:bg-white/5 hover:text-christmas-gold-light'
      }`}
      aria-label={itemCount > 0 ? `Koszyk, ${itemCount} pozycji` : 'Koszyk'}
      onClick={() => setMenuOpen(false)}
    >
      <i className="fas fa-shopping-basket" />
      <span className="hidden sm:inline">Koszyk</span>
      {itemCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-christmas-gold px-1 text-xs font-bold text-christmas-green">
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
          className="fixed inset-0 z-40 bg-black/50 xl:hidden"
          aria-label="Zamknij menu"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <nav
        className="storefront-nav sticky top-[var(--santa-banner-h,0px)] z-50"
        aria-label="Główna nawigacja"
      >
        <div className="storefront-nav-inner relative z-[51]">
          <div className="storefront-nav-bar flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-2">
            <Link
              to="/"
              className="inline-flex shrink-0 items-center transition-opacity hover:opacity-90"
              aria-label="e-Advent — strona główna"
              onClick={() => setMenuOpen(false)}
            >
              <img src={navLogo} alt="e-Advent" className="h-8 w-auto md:h-9" width="180" height="48" />
            </Link>

            <ul className="storefront-nav-links ml-3 hidden items-center gap-1 xl:flex">
              {NAV_GROUPS.map((group) => {
                const current = group.items.some((item) => isActive(location.pathname, item.to));
                const expanded = openMenu === group.id;
                return (
                  <li
                    key={group.id}
                    className="nav-drop"
                    onMouseEnter={() => setOpenMenu(group.id)}
                    onMouseLeave={() => setOpenMenu(null)}
                    onBlur={(event) => {
                      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpenMenu(null);
                    }}
                  >
                    <button
                      type="button"
                      className={`nav-trigger${current ? ' is-current' : ''}`}
                      aria-expanded={expanded}
                      aria-haspopup="true"
                      onClick={() => setOpenMenu(expanded ? null : group.id)}
                    >
                      {group.label}
                      <i className="fas fa-chevron-down" aria-hidden="true" />
                    </button>
                    <div className={`nav-dropdown${expanded ? ' is-open' : ''}`} inert={!expanded} aria-hidden={!expanded}>
                      {group.items.map((item) => (
                        <Link
                          key={item.to}
                          to={item.to}
                          aria-current={isActive(location.pathname, item.to) ? 'page' : undefined}
                          onClick={() => setOpenMenu(null)}
                        >
                          {item.label}
                          <small>{item.hint}</small>
                        </Link>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
            </div>

            <div className="flex items-center gap-1">
              {cartLink}
              <button
                ref={menuButton}
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-christmas-gold-light transition-colors hover:bg-white/10 xl:hidden"
                aria-label={menuOpen ? 'Zamknij menu' : 'Otwórz menu'}
                aria-expanded={menuOpen}
                aria-controls={menuId}
                onClick={() => {
                  setMenuOpen((open) => {
                    const next = !open;
                    if (next) setMobileGroup(groupForPath(location.pathname));
                    return next;
                  });
                }}
              >
                <i className={`fas ${menuOpen ? 'fa-times' : 'fa-bars'} text-lg`} />
              </button>
            </div>
          </div>
        </div>

        <div
          id={menuId}
          inert={!menuOpen}
          aria-hidden={!menuOpen}
          className={`nav-mobile-panel xl:hidden${menuOpen ? ' is-open' : ''}`}
        >
          <div className="storefront-mobile-links storefront-nav-inner">
            {NAV_GROUPS.map((group) => {
              const expanded = mobileGroup === group.id;
              const panelId = `${menuId}-${group.id}`;
              return (
                <div key={group.id} className="nav-mobile-group">
                  <button
                    type="button"
                    className="nav-mobile-toggle"
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    onClick={() => setMobileGroup(expanded ? null : group.id)}
                  >
                    {group.label}
                    <i className="fas fa-chevron-down" aria-hidden="true" />
                  </button>
                  <div id={panelId} className={`nav-mobile-collapse${expanded ? ' is-open' : ''}`} inert={!expanded} aria-hidden={!expanded}>
                    <div className="nav-mobile-collapse-inner"><div className="nav-mobile-links">
                    {group.items.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        aria-current={isActive(location.pathname, item.to) ? 'page' : undefined}
                        onClick={() => setMenuOpen(false)}
                      >
                        {item.label}
                        <small>{item.hint}</small>
                      </Link>
                    ))}
                    </div></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
