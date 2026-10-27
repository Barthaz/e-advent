import { useLocation, Link } from 'react-router-dom';
import { STOREFRONT_URL } from '../../config/env';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { toggleSidebar } from '../../store/uiSlice';

interface Breadcrumb {
  label: string;
  to?: string;
}

function useBreadcrumbs(): Breadcrumb[] {
  const { pathname } = useLocation();
  const segments = pathname.split('/').filter(Boolean);

  const crumbs: Breadcrumb[] = [{ label: 'Panel', to: '/' }];

  if (segments.length === 0) {
    crumbs.push({ label: 'Pulpit' });
  } else if (segments[0] === 'orders') {
    crumbs.push({ label: 'Zamówienia', to: '/orders' });
    if (segments[1]) {
      crumbs.push({ label: 'Szczegóły zamówienia' });
    }
  } else if (segments[0] === 'calendars') {
    crumbs.push({ label: 'Kalendarz' });
    if (segments[1]) {
      crumbs.push({ label: segments[1] });
    }
  } else if (segments[0] === 'emails') {
    crumbs.push({ label: 'Wysyłki' });
  } else if (segments[0] === 'email-templates') {
    crumbs.push({ label: 'Szablony e-mail' });
  } else if (segments[0] === 'tasks') {
    crumbs.push({ label: 'Zadania' });
  } else if (segments[0] === 'rabaty') {
    crumbs.push({ label: 'Rabaty' });
  } else if (segments[0] === 'generator') {
    crumbs.push({ label: 'Generator' });
  }

  return crumbs;
}

export default function TopBar() {
  const breadcrumbs = useBreadcrumbs();
  const dispatch = useAppDispatch();

  return (
    <header className="topbar h-14 px-4 md:px-6 flex items-center flex-shrink-0 gap-3">
      <button
        type="button"
        className="lg:hidden w-10 h-10 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-christmas-green"
        aria-label="Otwórz menu"
        onClick={() => dispatch(toggleSidebar())}
      >
        <i className="fa-solid fa-bars" />
      </button>
      <nav aria-label="Breadcrumb" className="min-w-0 overflow-hidden">
        <ol className="flex items-center gap-1.5 text-sm">
          {breadcrumbs.map((crumb, idx) => (
            <li key={idx} className="flex items-center gap-1.5">
              {idx > 0 && (
                <i className="fa-solid fa-chevron-right text-[0.6rem] text-gray-400" />
              )}
              {crumb.to && idx < breadcrumbs.length - 1 ? (
                <Link to={crumb.to} className="text-gray-500 hover:text-christmas-green transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span className={idx === breadcrumbs.length - 1 ? 'font-semibold text-gray-800' : 'text-gray-500'}>
                  {crumb.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <div className="ml-auto flex items-center gap-3">
        <a
          href={STOREFRONT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-400 hover:text-christmas-green transition-colors flex items-center gap-1"
        >
          <i className="fa-solid fa-arrow-up-right-from-square" />
          Strona główna
        </a>
      </div>
    </header>
  );
}
