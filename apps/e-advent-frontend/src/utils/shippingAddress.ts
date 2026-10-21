import type { ShippingAddress } from '../types/order';

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
): ShippingAddress & { fullName: string } {
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
    buildingNumber: String(raw?.buildingNumber ?? ''),
    apartmentNumber: String(raw?.apartmentNumber ?? ''),
    city: String(raw?.city ?? ''),
    postalCode: String(raw?.postalCode ?? ''),
    phone: String(raw?.phone ?? ''),
    country: String(raw?.country ?? 'PL') || 'PL',
    fullName,
  };
}

export function validateShippingAddress(
  address: ShippingAddress,
  deliveryType?: string,
): Partial<Record<keyof ShippingAddress, string>> {
  const a = normalizeShippingAddress(address);
  const errors: Partial<Record<keyof ShippingAddress, string>> = {};
  if (!a.firstName.trim()) errors.firstName = 'Wymagane';
  if (!a.lastName.trim()) errors.lastName = 'Wymagane';
  if (deliveryType && !/^[1-9]\d{8}$/.test(a.phone.replace(/[\s()-]/g, '').replace(/^(\+48|0048)/, ''))) errors.phone = 'Podaj polski numer telefonu (9 cyfr)';
  if (deliveryType === 'parcel_inpost') return errors;
  if (deliveryType === 'courier_inpost' && !a.buildingNumber?.trim()) errors.buildingNumber = 'Podaj numer budynku';
  if (!a.street.trim()) errors.street = 'Podaj ulicę oraz numer domu/mieszkania';
  if (!a.city.trim()) errors.city = 'Wymagane';
  if (!/^\d{2}-\d{3}$/.test(a.postalCode.trim())) errors.postalCode = 'Format: XX-XXX';
  if (!a.phone.trim()) errors.phone = 'Wymagane';
  return errors;
}

