import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLoginMutation } from '../api/adminApi';
import { setCredentials } from '../store/authSlice';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';
import logoSrc from '../assets/logo.png';

export default function LoginPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const [login, { isLoading }] = useLoginMutation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: Location })?.from?.pathname ?? '/orders';

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const result = await login({ username, password }).unwrap();
      dispatch(setCredentials(result));
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const apiError = err as { data?: { message?: string }; status?: number };
      if (apiError.status === 401 || apiError.status === 403) {
        setError('Nieprawidłowa nazwa użytkownika lub hasło.');
      } else {
        setError('Błąd połączenia z serwerem. Spróbuj ponownie.');
      }
    }
  };

  return (
    <div className="min-h-screen page-bg-gradient flex items-center justify-center p-4 relative overflow-hidden">
      <div className="page-bg-texture" />

      <div className="w-full max-w-sm relative z-10 animate-fade-in-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4 overflow-hidden">
            <img src={logoSrc} alt="e-Advent" className="w-14 h-14 object-contain" />
          </div>
          <h1 className="font-display text-3xl font-semibold text-christmas-gold-light">e-Advent</h1>
          <p className="text-white/60 text-sm mt-1">Panel administracyjny</p>
        </div>

        {/* Karta logowania */}
        <div className="parchment-card p-7">
          <h2 className="font-display text-xl font-semibold text-christmas-green mb-1">
            Zaloguj się
          </h2>
          <p className="text-parchment-muted text-sm mb-6">
            Wprowadź dane dostępowe do panelu.
          </p>

          {error && (
            <div className="alert-error mb-4 flex items-start gap-2">
              <i className="fa-solid fa-triangle-exclamation flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-parchment-text mb-1.5">
                Nazwa użytkownika
              </label>
              <div className="relative">
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  required
                  className="input-field !pl-[3.25rem]"
                  placeholder="administrator"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                />
                <i className="fa-solid fa-user absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none" />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-parchment-text mb-1.5">
                Hasło
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="input-field !pl-[3.25rem] !pr-[3.25rem]"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
                <i className="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none" />
                <button
                  type="button"
                  tabIndex={-1}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
                >
                  <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`} />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !username || !password}
              className="btn-green w-full py-3 text-base mt-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <>
                  <span className="spinner spinner-sm border-white/30 border-b-white" />
                  Logowanie…
                </>
              ) : (
                <>
                  <i className="fa-solid fa-right-to-bracket" />
                  Zaloguj się
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-white/30 text-xs mt-6">
          © {new Date().getFullYear()} e-Advent. Panel tylko dla administratorów.
        </p>
      </div>
    </div>
  );
}
