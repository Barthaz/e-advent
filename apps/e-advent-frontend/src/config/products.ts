import type { CalendarFormat, ProductType } from '@e-advent/types';
import type { ProductSkuConfig, ProductFamilyBase, OrderTotals } from '@e-advent/products';
import {
  SHIPPING_COST,
  FREE_SHIPPING_THRESHOLD,
  PRODUCTS,
  PRODUCT_FAMILIES as BASE_PRODUCT_FAMILIES,
  getProduct,
  getProductPrice,
  computeOrderTotals,
  getSkuForTypeAndFormat,
  isPhysicalProduct,
} from '@e-advent/products';
import interactiveImage from '../assets/interactive.png';

export {
  SHIPPING_COST,
  FREE_SHIPPING_THRESHOLD,
  PRODUCTS,
  getProduct,
  getProductPrice,
  computeOrderTotals,
  getSkuForTypeAndFormat,
  isPhysicalProduct,
};
export type { ProductSkuConfig, OrderTotals };

export const PHYSICAL_FULFILLMENT_TIME = '3–5 dni roboczych';
export const PHYSICAL_FULFILLMENT_NOTE = `Dodaj produkt do koszyka — adres dostawy i płatność uzupełnisz przy składaniu zamówienia. Czas realizacji: ${PHYSICAL_FULFILLMENT_TIME}. Po opłaceniu przygotujemy przesyłkę i wyślemy ją Pocztą Polską.`;
export const PHYSICAL_CHECKOUT_HINT = 'Następny krok: koszyk → adres dostawy i bezpieczna płatność.';
export const PHYSICAL_ADD_TO_CART_HINT = 'Produkt trafi do koszyka. Możesz dodać więcej pozycji, a potem opłacić wszystko jako jedno zamówienie.';

export function getCheckoutCtaLabel(price: string, isPhysical: boolean): string {
  return isPhysical
    ? `Dodaj do koszyka — ${price}`
    : `Przejdź do płatności — ${price}`;
}

export function formatPrice(amount: number): string {
  return `${amount} zł`;
}

export interface ProductFamily extends ProductFamilyBase {
  imageSrc?: string;
  imageAlt?: string;
  eyebrow?: string;
}

export const PRODUCT_FAMILIES: ProductFamily[] = BASE_PRODUCT_FAMILIES.map((family) => {
  if (family.type === 'letter') {
    return {
      ...family,
      imageSrc: '/products/santa-letter/letter-1.svg',
      imageAlt: 'Zestaw List do Świętego Mikołaja',
      eyebrow: 'Prezent adwentowy',
    };
  }
  if (family.type === 'interactive') {
    return {
      ...family,
      imageSrc: interactiveImage,
      imageAlt: 'Kalendarz adwentowy interaktywny',
      eyebrow: 'Online',
    };
  }
  return {
    ...family,
    imageSrc: '/designs/scratch/red.png',
    imageAlt: 'Kalendarz adwentowy zdrapka',
    eyebrow: 'Fizyczny prezent',
  };
});

export type { CalendarFormat, ProductType };
