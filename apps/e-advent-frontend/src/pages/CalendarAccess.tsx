import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FestivePage from '../components/FestivePage';
import ContentCard from '../components/ContentCard';
import AndroidPromo from '../components/AndroidPromo';
import { getCalendarByAccessCode } from '../api/api';

export default function CalendarAccess() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

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
      const response = await getCalendarByAccessCode(email, fullCode);
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
    <FestivePage showLogo maxWidth="sm">
      <ContentCard variant="gold" padding="md">
        <div className="text-center mb-6">
          <h1 className="heading-page font-calligraphy mb-2">Dostęp do kalendarza</h1>
          <p className="text-parchment-muted text-lg">Wprowadź swój adres email i kod dostępu</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-parchment-muted mb-2">
              Adres email
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
            <div className="flex gap-1.5 md:gap-2 justify-center">
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el; }}
                  type="text"
                  inputMode="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onPaste={(e) => handleCodePaste(e, index)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="input-code"
                  disabled={isLoading}
                  autoComplete="off"
                />
              ))}
            </div>
          </div>

          {error && <div className="alert-error">{error}</div>}

          <div className="md:hidden">
            <AndroidPromo label="Pobierz aplikację" analyticsLabel="calendar_access_page" />
          </div>

          <button type="submit" disabled={isLoading} className="btn-green-full">
            {isLoading ? 'Sprawdzanie...' : 'Otwórz kalendarz'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button onClick={() => navigate('/')} className="link-green">
            Wróć na stronę główną
          </button>
        </div>
      </ContentCard>
    </FestivePage>
  );
}
