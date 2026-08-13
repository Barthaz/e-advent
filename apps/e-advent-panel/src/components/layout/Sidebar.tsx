import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useLogoutMutation } from '../../api/adminApi';
import { useToast } from '../../hooks/useToast';

interface NavItem {
  to: string;
  icon: string;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/orders', icon: 'fa-list-ul', label: 'Zamówienia' },
];

export default function Sidebar() {
  const { username, logout } = useAuth();
  const [logoutMutation] = useLogoutMutation();
  const navigate = useNavigate();
  const toast = useToast();

  const handleLogout = async () => {
    try {
      await logoutMutation().unwrap();
    } catch {
      // stateless logout — ignore server errors
    }
    logout();
    toast.info('Wylogowano z panelu.');
    navigate('/login');
  };

  return (
    <aside className="sidebar w-64 h-screen flex-shrink-0 flex flex-col overflow-hidden">
      {/* Logo */}
      <div className="sidebar-logo px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-christmas-gold flex items-center justify-center flex-shrink-0">
            <i className="fa-solid fa-star text-christmas-green text-base" />
          </div>
          <div>
            <p className="font-display font-semibold text-christmas-gold-light text-lg leading-tight">e-Advent</p>
            <p className="text-xs text-white/50 leading-tight">Panel administracyjny</p>
          </div>
        </div>
      </div>

      {/* Nawigacja */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/30 px-3 mb-2">
          Zarządzanie
        </p>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
          >
            <i className={`fa-solid ${item.icon}`} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Użytkownik */}
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
