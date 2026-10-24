import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useLogoutMutation } from '../../api/adminApi';
import { useToast } from '../../hooks/useToast';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { setSidebarOpen } from '../../store/uiSlice';
import logoSrc from '@e-advent/assets/brand/eadvent-logo.png';

interface NavItem {
  to: string;
  icon: string;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/orders', icon: 'fa-list-ul', label: 'Zamówienia' },
  { to: '/rabaty', icon: 'fa-percent', label: 'Rabaty' },
  { to: '/tasks', icon: 'fa-calendar-days', label: 'Zadania' },
  { to: '/emails', icon: 'fa-paper-plane', label: 'Wysyłki' },
  { to: '/email-templates', icon: 'fa-envelope-open-text', label: 'Szablony' },
];

export default function Sidebar() {
  const { username, logout } = useAuth();
  const [logoutMutation] = useLogoutMutation();
  const navigate = useNavigate();
  const toast = useToast();
  const dispatch = useAppDispatch();
  const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen);

  const closeMobileNav = () => dispatch(setSidebarOpen(false));

  const handleLogout = async () => {
    try {
      await logoutMutation().unwrap();
    } catch {
      // stateless logout — ignore server errors
    }
    logout();
    toast.info('Wylogowano z panelu.');
    closeMobileNav();
    navigate('/login');
  };

  return (
    <aside
      className={`sidebar max-lg:fixed lg:static z-50 inset-y-0 left-0 w-64 h-dvh lg:h-screen flex flex-col overflow-hidden transition-transform duration-200 ease-out max-lg:shadow-2xl ${
        sidebarOpen ? 'translate-x-0' : 'max-lg:-translate-x-full'
      } ${sidebarOpen ? '' : 'max-lg:pointer-events-none'}`}
    >
      <div className="sidebar-logo px-5 py-4">
        <div className="flex items-center gap-3">
          <img
            src={logoSrc}
            alt="e-Advent"
            className="h-11 w-auto max-w-[3.25rem] object-contain flex-shrink-0 drop-shadow"
          />
          <div className="min-w-0">
            <p className="font-display font-semibold text-christmas-gold-light text-lg leading-tight">e-Advent</p>
            <p className="text-xs text-white/50 leading-tight">Panel administracyjny</p>
          </div>
          <button
            type="button"
            className="ml-auto lg:hidden text-white/70 hover:text-christmas-gold-light p-1"
            aria-label="Zamknij menu"
            onClick={closeMobileNav}
          >
            <i className="fa-solid fa-xmark text-lg" />
          </button>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/30 px-3 mb-2">
          Zarządzanie
        </p>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={closeMobileNav}
            className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
          >
            <i className={`fa-solid ${item.icon}`} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-christmas-gold/20 border border-christmas-gold/30 flex items-center justify-center flex-shrink-0">
            <i className="fa-solid fa-user text-christmas-gold text-xs" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{username ?? 'Admin'}</p>
            <p className="text-xs text-white/40">Administrator</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="sidebar-nav-item w-full text-left hover:!text-christmas-red"
        >
          <i className="fa-solid fa-right-from-bracket" />
          Wyloguj się
        </button>
      </div>
    </aside>
  );
}
