import FormField from '../FormField';
import type { OpeningMethod } from '../../types/order';

export const OPENING_METHOD_OPTIONS: Array<{
  id: OpeningMethod;
  icon: string;
  title: string;
  description: string;
}> = [
  {
    id: 'app',
    icon: 'fab fa-android',
    title: 'Aplikacja mobilna Android',
    description: 'Otwieraj okienka wygodnie w aplikacji na telefonie. Po zakupie pobierzesz plik APK.',
  },
  {
    id: 'email',
    icon: 'fas fa-envelope-open-text',
    title: 'Codzienny e-mail',
    description: 'Każdego dnia na wskazany adres przyjdzie ładnie sformatowana treść okienka.',
  },
  {
    id: 'online',
    icon: 'fas fa-globe',
    title: 'Otwieranie online',
    description: 'Otrzymasz unikalny link i będziesz otwierać okienka, wchodząc codziennie na ten adres.',
  },
];

export const OPENING_METHOD_LABELS: Record<OpeningMethod, string> = {
  app: 'Aplikacja mobilna Android',
  email: 'Codzienny e-mail',
  online: 'Otwieranie online',
};

interface StepOpeningMethodProps {
  openingMethod: OpeningMethod | null;
  setOpeningMethod: (method: OpeningMethod) => void;
  dailyContentEmail: string;
  setDailyContentEmail: (email: string) => void;
  buyerEmail: string;
}

export default function StepOpeningMethod({
  openingMethod,
  setOpeningMethod,
  dailyContentEmail,
  setDailyContentEmail,
  buyerEmail,
}: StepOpeningMethodProps) {
  const handleSelect = (method: OpeningMethod) => {
    setOpeningMethod(method);
    if (method === 'email' && !dailyContentEmail.trim() && buyerEmail.trim()) {
      setDailyContentEmail(buyerEmail.trim());
    }
  };

  return (
    <section className="opening-method">
      <h2 className="heading-section mb-2">Jak chcesz otwierać okienka?</h2>

      <div className="opening-method-options" role="radiogroup" aria-label="Sposób otwierania">
        {OPENING_METHOD_OPTIONS.map((option) => {
          const selected = openingMethod === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`opening-method-option ${selected ? 'opening-method-option--selected' : ''}`}
              onClick={() => handleSelect(option.id)}
            >
              <span className="opening-method-option-icon" aria-hidden>
                <i className={option.icon} />
              </span>
              <span className="opening-method-option-body">
                <span className="opening-method-option-title">{option.title}</span>
                <span className="opening-method-option-desc">{option.description}</span>
              </span>
              <span className={`opening-method-radio ${selected ? 'opening-method-radio--on' : ''}`} aria-hidden />
            </button>
          );
        })}
      </div>

      {openingMethod === 'email' && (
        <div className="opening-method-email mt-6">
          <FormField
            label="E-mail na treść okienka"
            type="email"
            value={dailyContentEmail}
            onChange={setDailyContentEmail}
            placeholder={buyerEmail || 'jan@example.com'}
            required
            helpText="Na ten adres będzie codziennie przychodzić zawartość okienka. To może być inny adres niż e-mail z zamówienia."
          />
        </div>
      )}

      {openingMethod === 'app' && (
        <p className="opening-method-hint mt-5">
          <i className="fas fa-info-circle mr-2" />
          Po płatności zobaczysz przycisk pobierania aplikacji Android.
        </p>
      )}

      {openingMethod === 'online' && (
        <p className="opening-method-hint mt-5">
          <i className="fas fa-info-circle mr-2" />
          Po płatności otrzymasz unikalny adres URL — zapiszesz go lub otworzysz od razu.
        </p>
      )}
    </section>
  );
}
