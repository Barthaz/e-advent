import { useState } from 'react';
import FormField from '../FormField';
import type { ShippingAddress } from '../../types/order';

interface ShippingFormProps {
  address: ShippingAddress;
  deliveryType?: string;
  onChange: (address: ShippingAddress) => void;
  errors?: Partial<Record<keyof ShippingAddress, string>>;
}

import { normalizeShippingAddress, composeShippingFullName } from '../../utils/shippingAddress';

export default function ShippingForm({ address, onChange, deliveryType, errors = {} }: ShippingFormProps) {
  const safe = normalizeShippingAddress(address);
  const [touched, setTouched] = useState<Set<string>>(() => new Set());
  const fieldIds: Record<string, string> = { 'shipping-given-name': 'firstName', 'shipping-family-name': 'lastName', 'shipping-postal-code': 'postalCode', 'shipping-city': 'city', 'shipping-street-address': 'street', 'shipping-building': 'buildingNumber', 'shipping-tel': 'phone' };

  const update = (field: keyof ShippingAddress, value: string) => {
    const next = { ...safe, [field]: value };
    next.fullName = composeShippingFullName(next);
    onChange(next);
  };

  return (
    <section className="order-panel" onBlur={event => { const field = fieldIds[event.target.id]; if (field) setTouched(previous => new Set(previous).add(field)); }}>
      <h2 className="heading-section mb-1">
        Dane odbiorcy
      </h2>
      <p className="text-parchment-muted text-sm mb-4">
        {deliveryType === 'parcel_inpost'
          ? 'Imię, nazwisko i telefon — adres zastąpi wybrany Paczkomat.'
          : 'Adres, na który kurier InPost dostarczy przesyłkę.'}
      </p>

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
          {touched.has('firstName') && errors.firstName && <p className="text-red-600 text-sm -mt-2 mb-3">{errors.firstName}</p>}
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
          {touched.has('lastName') && errors.lastName && <p className="text-red-600 text-sm -mt-2 mb-3">{errors.lastName}</p>}
        </div>
      </div>

      {deliveryType !== 'parcel_inpost' && <>
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
          {touched.has('postalCode') && errors.postalCode && <p className="text-red-600 text-sm -mt-2 mb-3">{errors.postalCode}</p>}
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
          {touched.has('city') && errors.city && <p className="text-red-600 text-sm -mt-2 mb-3">{errors.city}</p>}
        </div>
      </div>

      <FormField
        label={deliveryType ? "Ulica" : "Ulica i numer domu/mieszkania"}
        name="shipping-street-address"
        id="shipping-street-address"
        autoComplete="street-address"
        value={safe.street}
        onChange={(v) => update('street', v)}
        placeholder={deliveryType ? "np. Świąteczna" : "ul. Przykładowa 12/3"}
        required
      />
      {touched.has('street') && errors.street && <p className="text-red-600 text-sm -mt-2 mb-3">{errors.street}</p>}

      {deliveryType === 'courier_inpost' && <div className="grid grid-cols-2 gap-4">
        <div><FormField label="Numer budynku" id="shipping-building" name="shipping-building" value={safe.buildingNumber || ''} onChange={v => update('buildingNumber', v)} required />
        {touched.has('buildingNumber') && errors.buildingNumber && <p className="text-red-600 text-sm">{errors.buildingNumber}</p>}</div>
        <FormField label="Numer mieszkania (opcjonalnie)" id="shipping-apartment" name="shipping-apartment" value={safe.apartmentNumber || ''} onChange={v => update('apartmentNumber', v)} />
      </div>}
      </>}
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
      {touched.has('phone') && errors.phone && <p className="text-red-600 text-sm -mt-2 mb-3">{errors.phone}</p>}
    </section>
  );
}
