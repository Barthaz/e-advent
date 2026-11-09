import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SEOHead from '../components/SEOHead';
import room from '../assets/home/christmas-room.webp';
import '../components/calendar-experience.css';
import { getCalendarByAccessCode } from '../api/api';

export default function CalendarAccess() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleCodeChange = (index: number, value: string) => {
    const sanitizedValue = value.replace(/[^0-9A-Za-z]/g, '').toUpperCase().slice(0, 1);
    const newCode = [...code];
    newCode[index] = sanitizedValue;
    setCode(newCode);
    setError(null);
    if (sanitizedValue && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent<HTMLInputElement>, index: number) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/[^0-9A-Za-z]/g, '').toUpperCase();
    if (pastedData.length === 0) return;

    const newCode = [...code];
    for (let i = 0; i < 6 && index + i < 6; i++) {
      newCode[index + i] = i < pastedData.length ? pastedData[i] : '';
    }
    setCode(newCode);
    setError(null);
    const nextFocusIndex = Math.min(index + pastedData.length, 5);
    setTimeout(() => inputRefs.current[nextFocusIndex]?.focus(), 0);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !email.includes('@')) {
      setError('Proszę wprowadzić poprawny adres email');
      return;
    }

    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      setError('Kod dostępu musi składać się z 6 znaków');
      return;
    }

    setIsLoading(true);
    try {
      const response = await getCalendarByAccessCode(email.trim(), fullCode);
      if (response.success && response.calendar?.id) {
        try {
          sessionStorage.setItem(`e-advent-access-code-${response.calendar.id}`, fullCode);
        } catch {
          /* ignore */
        }
        navigate(`/kalendarz/${response.calendar.id}`);
      } else {
        setError('Nieprawidłowy email lub kod dostępu');
      }
    } catch (err) {
      console.error('[CalendarAccess] Błąd podczas pobierania kalendarza:', err);
      setError(err instanceof Error ? err.message : 'Nieprawidłowy email lub kod dostępu');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="calendar-access">
      <SEOHead title="Otwórz swój kalendarz | e-Advent" robots="noindex, follow" />
      <div className="calendar-access-layout">
        <div className="calendar-access-intro"><img src={room} alt="Świąteczny dom z choinką i kominkiem" /><p className="calendar-eyebrow">Dobrze, że jesteście</p><h1>Wasza grudniowa<br />opowieść czeka.</h1><p>Mała chwila dla siebie, jedno okienko i kolejny powód do uśmiechu.</p></div>
        <section className="calendar-access-form"><h2>Otwórz swój kalendarz</h2><p>Podaj e-mail użyty przy zamówieniu i sześcioznakowy kod z wiadomości potwierdzającej zakup.</p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-parchment-muted mb-2">
              Adres e-mail
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); }}
              className="input-field text-lg"
              placeholder="twoj@email.pl"
              required
              disabled={isLoading}
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-parchment-muted mb-2">
              Kod dostępu (6 znaków)
            </label>
            <div className="calendar-code" role="group" aria-label="Kod dostępu (6 znaków)">
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el; }}
                  type="text"
                  inputMode="text"
                  maxLength={1}
                  aria-label={`Znak ${index + 1} kodu dostępu`}
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onPaste={(e) => handleCodePaste(e, index)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="input-code"
                  disabled={isLoading}
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                />
              ))}
            </div>
          </div>

          <p className="calendar-access-help">Kod znajdziesz w e-mailu z linkiem do kalendarza. Możesz go tutaj wkleić w całości.</p>

          {error && <div role="alert" className="alert-error">{error}</div>}

          <button type="submit" disabled={isLoading} className="btn-green-full">
            {isLoading ? 'Sprawdzanie...' : 'Otwórz kalendarz'}
          </button>
        </form>

        <div className="calendar-access-links"><Link to="/darmowy-kalendarz">Nie masz jeszcze kalendarza? Otwórz darmowy</Link><a href="mailto:kontakt@e-advent.pl">Nie możesz znaleźć kodu? Napisz do nas</a></div>
        </section>
      </div>
    </div>
  );
}
