import FormField from '../FormField';
import type { ShippingAddress } from '../../types/order';

interface ShippingFormProps {
  address: ShippingAddress;
  onChange: (address: ShippingAddress) => void;
  errors?: Partial<Record<keyof ShippingAddress, string>>;
}

const defaultAddress: ShippingAddress = {
  fullName: '',
  street: '',
  city: '',
  postalCode: '',
  phone: '',
  country: 'PL',
};

export function emptyShippingAddress(): ShippingAddress {
  return { ...defaultAddress };
}

export function validateShippingAddress(address: ShippingAddress): Partial<Record<keyof ShippingAddress, string>> {
  const errors: Partial<Record<keyof ShippingAddress, string>> = {};
  if (!address.fullName.trim()) errors.fullName = 'Wymagane';
  if (!address.street.trim()) errors.street = 'Wymagane';
  if (!address.city.trim()) errors.city = 'Wymagane';
  if (!/^\d{2}-\d{3}$/.test(address.postalCode.trim())) errors.postalCode = 'Format: XX-XXX';
  if (!address.phone.trim()) errors.phone = 'Wymagane';
  return errors;
}

export default function ShippingForm({ address, onChange, errors = {} }: ShippingFormProps) {
  const update = (field: keyof ShippingAddress, value: string) => {
    onChange({ ...address, [field]: value });
  };

  return (
    <section className="mb-6">
      <h2 className="heading-section mb-4">
        <i className="fas fa-truck mr-2 text-christmas-green" />
        Adres wysyłki
      </h2>
      <FormField label="Imię i nazwisko *" value={address.fullName} onChange={(v) => update('fullName', v)} placeholder="Jan Kowalski" required />
      {errors.fullName && <p className="text-red-600 text-sm mb-2">{errors.fullName}</p>}
      <FormField label="Ulica i numer *" value={address.street} onChange={(v) => update('street', v)} placeholder="ul. Przykładowa 12/3" required />
      {errors.street && <p className="text-red-600 text-sm mb-2">{errors.street}</p>}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <FormField label="Kod pocztowy *" value={address.postalCode} onChange={(v) => update('postalCode', v)} placeholder="00-000" required />
          {errors.postalCode && <p className="text-red-600 text-sm">{errors.postalCode}</p>}
        </div>
        <div>
          <FormField label="Miasto *" value={address.city} onChange={(v) => update('city', v)} placeholder="Warszawa" required />
          {errors.city && <p className="text-red-600 text-sm">{errors.city}</p>}
        </div>
      </div>
      <FormField label="Telefon *" type="tel" value={address.phone} onChange={(v) => update('phone', v)} placeholder="+48 123 456 789" required />
      {errors.phone && <p className="text-red-600 text-sm mb-2">{errors.phone}</p>}
    </section>
  );
}
