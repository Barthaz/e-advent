import FormField from '../FormField';
import type { ShippingAddress } from '../../types/order';

interface ShippingFormProps {
  address: ShippingAddress;
  onChange: (address: ShippingAddress) => void;
  errors?: Partial<Record<keyof ShippingAddress, string>>;
}

const defaultAddress: ShippingAddress = {
  firstName: '',
  lastName: '',
  street: '',
  city: '',
  postalCode: '',
  phone: '',
  country: 'PL',
  fullName: '',
};

export function emptyShippingAddress(): ShippingAddress {
  return { ...defaultAddress };
}

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

export function composeShippingFullName(address: Pick<ShippingAddress, 'firstName' | 'lastName' | 'fullName'>): string {
  const composed = `${address.firstName ?? ''} ${address.lastName ?? ''}`.trim();
  if (composed) return composed;
  return String(address.fullName ?? '').trim();
}

/** Uzupełnia brakujące pola (np. stary zapis w localStorage z samym fullName). */
export function normalizeShippingAddress(
  raw: Partial<ShippingAddress> | null | undefined,
): ShippingAddress {
  let firstName = String(raw?.firstName ?? '');
  let lastName = String(raw?.lastName ?? '');
  const legacyFull = String(raw?.fullName ?? '').trim();

  if (!firstName.trim() && !lastName.trim() && legacyFull) {
    const split = splitFullName(legacyFull);
    firstName = split.firstName;
    lastName = split.lastName;
  }

  const fullName = composeShippingFullName({ firstName, lastName, fullName: legacyFull });

  return {
    firstName,
    lastName,
    street: String(raw?.street ?? ''),
    city: String(raw?.city ?? ''),
    postalCode: String(raw?.postalCode ?? ''),
    phone: String(raw?.phone ?? ''),
    country: String(raw?.country ?? 'PL') || 'PL',
    fullName,
  };
}

export function validateShippingAddress(
  address: ShippingAddress,
): Partial<Record<keyof ShippingAddress, string>> {
  const a = normalizeShippingAddress(address);
  const errors: Partial<Record<keyof ShippingAddress, string>> = {};
  if (!a.firstName.trim()) errors.firstName = 'Wymagane';
  if (!a.lastName.trim()) errors.lastName = 'Wymagane';
  if (!a.street.trim()) errors.street = 'Podaj ulicę oraz numer domu/mieszkania';
  if (!a.city.trim()) errors.city = 'Wymagane';
  if (!/^\d{2}-\d{3}$/.test(a.postalCode.trim())) errors.postalCode = 'Format: XX-XXX';
  if (!a.phone.trim()) errors.phone = 'Wymagane';
  return errors;
}

export default function ShippingForm({ address, onChange, errors = {} }: ShippingFormProps) {
  const safe = normalizeShippingAddress(address);

  const update = (field: keyof ShippingAddress, value: string) => {
    const next = { ...safe, [field]: value };
    next.fullName = composeShippingFullName(next);
    onChange(next);
  };

  return (
    <section className="mb-6">
      <h2 className="heading-section mb-4">
        <i className="fas fa-truck mr-2 text-christmas-green" />
        Adres wysyłki
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <FormField
            label="Imię"
            name="shipping-given-name"
            id="shipping-given-name"
            autoComplete="given-name"
            value={safe.firstName}
            onChange={(v) => update('firstName', v)}
            placeholder="Jan"
            required
          />
          {errors.firstName && <p className="text-red-600 text-sm -mt-2 mb-3">{errors.firstName}</p>}
        </div>
        <div>
          <FormField
            label="Nazwisko"
            name="shipping-family-name"
            id="shipping-family-name"
            autoComplete="family-name"
            value={safe.lastName}
            onChange={(v) => update('lastName', v)}
            placeholder="Kowalski"
            required
          />
          {errors.lastName && <p className="text-red-600 text-sm -mt-2 mb-3">{errors.lastName}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <FormField
            label="Kod pocztowy"
            name="shipping-postal-code"
            id="shipping-postal-code"
            autoComplete="postal-code"
            value={safe.postalCode}
            onChange={(v) => update('postalCode', v)}
            placeholder="00-000"
            required
          />
          {errors.postalCode && <p className="text-red-600 text-sm -mt-2 mb-3">{errors.postalCode}</p>}
        </div>
        <div>
          <FormField
            label="Miasto"
            name="shipping-city"
            id="shipping-city"
            autoComplete="address-level2"
            value={safe.city}
            onChange={(v) => update('city', v)}
            placeholder="Warszawa"
            required
          />
          {errors.city && <p className="text-red-600 text-sm -mt-2 mb-3">{errors.city}</p>}
        </div>
      </div>

      <FormField
        label="Ulica i numer domu/mieszkania"
        name="shipping-street-address"
        id="shipping-street-address"
        autoComplete="street-address"
        value={safe.street}
        onChange={(v) => update('street', v)}
        placeholder="ul. Przykładowa 12/3"
        required
      />
      {errors.street && <p className="text-red-600 text-sm -mt-2 mb-3">{errors.street}</p>}

      <FormField
        label="Telefon"
        type="tel"
        name="shipping-tel"
        id="shipping-tel"
        autoComplete="tel"
        value={safe.phone}
        onChange={(v) => update('phone', v)}
        placeholder="+48 123 456 789"
        required
      />
      {errors.phone && <p className="text-red-600 text-sm -mt-2 mb-3">{errors.phone}</p>}
    </section>
  );
}
