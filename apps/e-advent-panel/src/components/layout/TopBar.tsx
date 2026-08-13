import { useLocation, Link } from 'react-router-dom';

interface Breadcrumb {
  label: string;
  to?: string;
}

function useBreadcrumbs(): Breadcrumb[] {
  const { pathname } = useLocation();
  const segments = pathname.split('/').filter(Boolean);

  const crumbs: Breadcrumb[] = [{ label: 'Panel', to: '/orders' }];

  if (segments[0] === 'orders') {
    crumbs.push({ label: 'Zamówienia', to: '/orders' });
    if (segments[1]) {
      crumbs.push({ label: `Zamówienie #${segments[1]}` });
    }
  } else if (segments[0] === 'calendars') {
    crumbs.push({ label: 'Kalendarz' });
    if (segments[1]) {
      crumbs.push({ label: segments[1] });
    }
  }

  return crumbs;
}

export default function TopBar() {
  const breadcrumbs = useBreadcrumbs();

  return (
    <header className="topbar h-14 px-6 flex items-center flex-shrink-0">
      <nav aria-label="Breadcrumb">
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
          href={import.meta.env.VITE_STOREFRONT_URL || 'http://localhost:5173'}
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
