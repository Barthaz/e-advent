import { useId } from 'react';
import {
  ADDRESS_FORM_OPTIONS,
  AGE_BAND_OPTIONS,
  charCount,
  FIELD_RULES,
  suggestVocative,
  type FieldErrors,
  type FieldName,
  type Personalization,
} from './validation';

interface FieldsProps {
  step: 1 | 2;
  value: Personalization;
  errors: FieldErrors;
  onChange: (next: Personalization) => void;
  /** Set once the parent edits the vocative by hand, so auto-suggestions stop */
  vocativeTouched?: boolean;
  onVocativeTouched?: () => void;
}

const TEXT_FIELDS: Array<{ name: FieldName; label: string; placeholder: string; help?: string }> = [
  {
    name: 'achievement',
    label: 'Czego dziecko nauczyło się w tym roku albo co mu się udało?',
    placeholder: 'np. Nauczyła się sama jeździć na rowerze',
  },
  {
    name: 'proudOf',
    label: 'Za co jesteście z dziecka szczególnie dumni?',
    placeholder: 'np. Wspaniale opiekuje się młodszym bratem',
  },
  {
    name: 'workingOn',
    label: 'Nad czym dziecko teraz pracuje?',
    placeholder: 'np. Coraz lepiej radzi sobie ze złością',
    help: 'Mikołaj doceni wysiłek — bez oceniania i zawstydzania.',
  },
  {
    name: 'wishes',
    label: 'Świąteczne marzenia',
    placeholder: 'np. Marzy o nowych klockach i wyprawie w góry',
    help: 'Mikołaj wspomni o marzeniach, ale niczego nie obiecuje.',
  },
  {
    name: 'siblingsNote',
    label: 'Rodzeństwo lub bliscy',
    placeholder: 'np. Ma młodszą siostrę, której chętnie pomaga',
  },
];

function Counter({ value, max }: { value: string | undefined; max: number }) {
  const count = charCount(value);
  return (
    <span className={`text-xs tabular-nums ${count > max ? 'text-christmas-red font-semibold' : 'text-parchment-muted'}`}>
      {count}/{max}
    </span>
  );
}

function ErrorText({ id, error }: { id: string; error?: string }) {
  if (!error) return null;
  return (
    <p id={id} className="mt-1 text-sm text-christmas-red" role="alert">
      {error}
    </p>
  );
}

export default function PersonalizationFields({ step, value, errors, onChange, vocativeTouched, onVocativeTouched }: FieldsProps) {
  const uid = useId();
  const set = (patch: Partial<Personalization>) => onChange({ ...value, ...patch });
  const fieldId = (name: string) => `${uid}-${name}`;
  const errorId = (name: string) => `${uid}-${name}-error`;
  const describedBy = (name: FieldName) => (errors[name] ? errorId(name) : undefined);

  if (step === 1) {
    return (
      <div className="space-y-5">
        <div>
          <label htmlFor={fieldId('childName')} className="block text-sm font-medium text-parchment-text mb-1.5">
            Imię dziecka <span className="text-christmas-red" aria-hidden="true">*</span>
          </label>
          <input
            id={fieldId('childName')}
            className="input-field"
            value={value.childName}
            autoComplete="off"
            maxLength={60}
            aria-invalid={Boolean(errors.childName)}
            aria-describedby={describedBy('childName')}
            onChange={(e) => {
              const childName = e.target.value;
              set(vocativeTouched ? { childName } : { childName, childVocative: suggestVocative(childName) });
            }}
            placeholder="np. Zosia"
          />
          <ErrorText id={errorId('childName')} error={errors.childName} />
        </div>

        <div>
          <label htmlFor={fieldId('childVocative')} className="block text-sm font-medium text-parchment-text mb-1.5">
            Jak Mikołaj ma zawołać dziecko? <span className="text-christmas-red" aria-hidden="true">*</span>
          </label>
          <input
            id={fieldId('childVocative')}
            className="input-field"
            value={value.childVocative}
            autoComplete="off"
            maxLength={60}
            aria-invalid={Boolean(errors.childVocative)}
            aria-describedby={`${fieldId('childVocative')}-help${errors.childVocative ? ` ${errorId('childVocative')}` : ''}`}
            onChange={(e) => {
              onVocativeTouched?.();
              set({ childVocative: e.target.value });
            }}
            placeholder="np. Zosiu, Kubo, Franku"
          />
          <p id={`${fieldId('childVocative')}-help`} className="mt-1 text-xs text-parchment-muted">
            Wołacz lub zdrobnienie — dokładnie tak, jak Mikołaj ma to wypowiedzieć („Witaj, Zosiu!”).
          </p>
          <ErrorText id={errorId('childVocative')} error={errors.childVocative} />
        </div>

        <fieldset>
          <legend className="block text-sm font-medium text-parchment-text mb-2">
            Forma zwracania się <span className="text-christmas-red" aria-hidden="true">*</span>
          </legend>
          <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-describedby={describedBy('addressForm')}>
            {ADDRESS_FORM_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 cursor-pointer text-sm transition-colors ${
                  value.addressForm === option.value
                    ? 'border-christmas-green bg-christmas-green/10 text-christmas-green font-semibold'
                    : 'border-parchment-dark/30 bg-white/60 text-parchment-text hover:border-christmas-gold'
                }`}
              >
                <input
                  type="radio"
                  name={fieldId('addressForm')}
                  value={option.value}
                  checked={value.addressForm === option.value}
                  onChange={() => set({ addressForm: option.value })}
                  className="accent-christmas-green"
                />
                {option.label}
              </label>
            ))}
          </div>
          <ErrorText id={errorId('addressForm')} error={errors.addressForm} />
        </fieldset>

        <fieldset>
          <legend className="block text-sm font-medium text-parchment-text mb-2">Wiek dziecka (opcjonalnie)</legend>
          <div className="flex flex-wrap gap-2">
            {AGE_BAND_OPTIONS.map((option) => {
              const active = value.ageBand === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => set({ ageBand: active ? '' : option.value })}
                  className={`rounded-full border px-4 py-2 text-sm min-h-[44px] transition-colors ${
                    active
                      ? 'border-christmas-green bg-christmas-green text-white'
                      : 'border-parchment-dark/30 bg-white/60 text-parchment-text hover:border-christmas-gold'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-xs text-parchment-muted">Pomaga dobrać ton wypowiedzi Mikołaja.</p>
        </fieldset>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-parchment-muted leading-relaxed">
        Pisz tak, jakbyś pisał(a) list do Mikołaja. Święty Mikołaj zacytuje Twoje słowa — dlatego krótko i ciepło.
        Bez danych o zdrowiu, szkole czy adresie.
      </p>
      {TEXT_FIELDS.map((field) => {
        const rule = FIELD_RULES[field.name]!;
        const current = (value[field.name] as string | undefined) ?? '';
        return (
          <div key={field.name}>
            <div className="flex items-end justify-between gap-3 mb-1.5">
              <label htmlFor={fieldId(field.name)} className="block text-sm font-medium text-parchment-text">
                {field.label}{' '}
                {rule.required ? (
                  <span className="text-christmas-red" aria-hidden="true">*</span>
                ) : (
                  <span className="text-parchment-muted font-normal">(opcjonalnie)</span>
                )}
              </label>
              <Counter value={current} max={rule.max} />
            </div>
            <textarea
              id={fieldId(field.name)}
              className="input-field"
              rows={2}
              value={current}
              placeholder={field.placeholder}
              aria-invalid={Boolean(errors[field.name])}
              aria-describedby={describedBy(field.name)}
              onChange={(e) => set({ [field.name]: e.target.value } as Partial<Personalization>)}
            />
            {field.help && <p className="mt-1 text-xs text-parchment-muted">{field.help}</p>}
            <ErrorText id={errorId(field.name)} error={errors[field.name]} />
          </div>
        );
      })}
    </div>
  );
}
