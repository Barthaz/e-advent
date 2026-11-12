export type PurchaseMode = 'standalone' | 'letter_addon';
export type AddressForm = 'male' | 'female' | 'siblings';
export type AgeBand = '2-3' | '4-6' | '7-9' | '10+';

export interface Personalization {
  childName: string;
  childVocative: string;
  addressForm: AddressForm | '';
  ageYears?: string;
  ageBand?: AgeBand | ''; // Range from earlier drafts.
  achievement: string;
  proudOf: string;
  workingOn?: string;
  wishes?: string;
  siblingsNote?: string;
}

export type FieldName = keyof Personalization;

export const EMPTY_PERSONALIZATION: Personalization = {
  childName: '',
  childVocative: '',
  addressForm: '',
  ageYears: '',
  ageBand: '',
  achievement: '',
  proudOf: '',
  workingOn: '',
  wishes: '',
  siblingsNote: '',
};

export const ADDRESS_FORM_OPTIONS: Array<{ value: AddressForm; label: string }> = [
  { value: 'male', label: 'Chłopiec (np. „jesteś dzielny”)' },
  { value: 'female', label: 'Dziewczynka (np. „jesteś dzielna”)' },
  { value: 'siblings', label: 'Dla rodzeństwa (jedno wspólne nagranie)' },
];

interface Rule {
  required: boolean;
  min: number;
  max: number;
  kind: 'name' | 'text';
}

/** Mirrors the API limits (services/santaMessages/validation.js); the server stays authoritative. */
export const FIELD_RULES: Partial<Record<FieldName, Rule>> = {
  childName: { required: true, min: 2, max: 40, kind: 'name' },
  childVocative: { required: true, min: 2, max: 40, kind: 'name' },
  achievement: { required: true, min: 3, max: 180, kind: 'text' },
  proudOf: { required: true, min: 3, max: 180, kind: 'text' },
  workingOn: { required: false, min: 3, max: 150, kind: 'text' },
  wishes: { required: false, min: 3, max: 180, kind: 'text' },
  siblingsNote: { required: false, min: 3, max: 120, kind: 'text' },
};

export const STEP_FIELDS: Record<1 | 2, FieldName[]> = {
  1: ['childName', 'childVocative', 'addressForm', 'ageYears'],
  2: ['achievement', 'proudOf', 'workingOn', 'wishes', 'siblingsNote'],
};

const NAME_PATTERN = /^\p{L}[\p{L}\p{M}' .-]*$/u;
const LINK_PATTERN = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(?:pl|com|net|org|eu|io)\b)/i;
const MARKUP_PATTERN = /[<>{}\\[\]`|]/;

export function cleanText(value: string | undefined): string {
  return String(value ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
}

export function charCount(value: string | undefined): number {
  return [...String(value ?? '')].length;
}

export type FieldErrors = Partial<Record<FieldName, string>>;

export function errorMessage(code: string, rule?: { min?: number; max?: number }): string {
  switch (code) {
    case 'REQUIRED': return 'To pole jest wymagane.';
    case 'TOO_SHORT': return `Wpisz co najmniej ${rule?.min ?? 2} znaki.`;
    case 'TOO_LONG': return `Maksymalnie ${rule?.max ?? ''} znaków — skróć, proszę, tekst.`;
    case 'INVALID_CHARS': return 'Użyj samych liter i zwykłych znaków interpunkcyjnych.';
    case 'LINK_NOT_ALLOWED': return 'Bez linków i adresów stron, proszę.';
    case 'INVALID_AGE': return 'Wpisz wiek w pełnych latach (0–120).';
    case 'AGE_COUNT': return 'Podaj po jednym wieku dla każdego imienia, w tej samej kolejności.';
    case 'INVALID_OPTION': return 'Wybierz jedną z opcji.';
    case 'SIBLING_COUNT': return 'Wpisz od 2 do 9 imion, oddzielając je przecinkami.';
    case 'SIBLING_MISMATCH': return 'Podaj formę powitania dla każdego imienia, w tej samej kolejności.';
    default: return 'Sprawdź to pole.';
  }
}

export function validateFields(value: Personalization, fields: FieldName[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of fields) {
    if (field === 'addressForm') {
      if (!ADDRESS_FORM_OPTIONS.some(option => option.value === value.addressForm)) errors.addressForm = 'Wybierz, jak Mikołaj ma się zwracać do dziecka.';
      continue;
    }
    if (field === 'ageYears') {
      const ageText = cleanText(value.ageYears);
      if (!ageText) continue;
      const ages = ageText.split(',').map(age => age.trim());
      if (ages.some(age => !/^\d{1,3}$/.test(age) || Number(age) > 120)) errors.ageYears = errorMessage('INVALID_AGE');
      else if (value.addressForm === 'siblings' && ages.length !== value.childName.split(',').length) errors.ageYears = errorMessage('AGE_COUNT');
      else if (value.addressForm !== 'siblings' && ages.length !== 1) errors.ageYears = errorMessage('INVALID_AGE');
      continue;
    }
    const rule = FIELD_RULES[field];
    if (!rule) continue;
    const text = cleanText(value[field] as string | undefined);
    if (rule.kind === 'name' && value.addressForm === 'siblings') {
      const names = text.split(',').map(cleanText);
      if (names.length < 2 || names.length > 9 || names.some(name => !name)) errors[field] = errorMessage('SIBLING_COUNT');
      else if (names.some(name => charCount(name) < rule.min || charCount(name) > rule.max || !NAME_PATTERN.test(name))) {
        errors[field] = 'Każde imię powinno mieć od 2 do 40 znaków. Sprawdź pisownię imion.';
      } else if (field === 'childVocative' && names.length !== value.childName.split(',').length) {
        errors[field] = errorMessage('SIBLING_MISMATCH');
      }
      continue;
    }
    if (!text) {
      if (rule.required) errors[field] = errorMessage('REQUIRED');
      continue;
    }
    const len = charCount(text);
    if (len < rule.min) errors[field] = errorMessage('TOO_SHORT', rule);
    else if (len > rule.max) errors[field] = errorMessage('TOO_LONG', rule);
    else if (rule.kind === 'name' && !NAME_PATTERN.test(text)) errors[field] = errorMessage('INVALID_CHARS');
    else if (rule.kind === 'text' && LINK_PATTERN.test(text)) errors[field] = errorMessage('LINK_NOT_ALLOWED');
    else if (rule.kind === 'text' && MARKUP_PATTERN.test(text)) errors[field] = errorMessage('INVALID_CHARS');
  }
  return errors;
}

export function normalizePersonalization(value: Personalization): Personalization {
  return {
    childName: cleanText(value.childName),
    childVocative: cleanText(value.childVocative),
    addressForm: value.addressForm,
    ageYears: cleanText(value.ageYears),
    ...(!value.ageYears && value.ageBand ? { ageBand: value.ageBand } : {}),
    achievement: cleanText(value.achievement),
    proudOf: cleanText(value.proudOf),
    workingOn: cleanText(value.workingOn),
    wishes: cleanText(value.wishes),
    siblingsNote: cleanText(value.siblingsNote),
  };
}

/** Polish vocative suggestion for common name endings; the parent always confirms it. */
export function suggestVocative(name: string): string {
  const n = cleanText(name);
  if (charCount(n) < 2) return '';
  const lower = n.toLowerCase();
  if (/(sia|zia|cia|nia|dzia)$/.test(lower)) return `${n.slice(0, -1)}u`;
  if (/a$/.test(lower)) return `${n.slice(0, -1)}o`;
  if (/(ek)$/.test(lower)) return `${n.slice(0, -2)}ku`;
  if (/ś$/.test(lower)) return `${n.slice(0, -1)}siu`;
  if (/(ź|ć|ń)$/.test(lower)) return n;
  if (/(sz|cz|rz|ż|k|g|ch|j)$/.test(lower)) return `${n}u`;
  if (/ł$/.test(lower)) return `${n.slice(0, -1)}le`;
  if (/r$/.test(lower)) return `${n}ze`;
  if (/t$/.test(lower)) return `${n.slice(0, -1)}cie`;
  if (/d$/.test(lower)) return `${n.slice(0, -1)}dzie`;
  if (/(n|m|w|f|p|b|s|z)$/.test(lower)) return `${n}ie`;
  return n;
}
