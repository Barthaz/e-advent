import { SANTA_CERTIFICATE_SKU, SANTA_LETTER_SKU } from '@e-advent/products';
import type { OrderItem } from '../types/order';

export type OrderLine =
  | { kind: 'item'; item: OrderItem }
  | {
      kind: 'letter-group';
      letters: OrderItem[];
      quantity: number;
      unitPrice: number;
      lineNetto: number;
      lineVat: number;
      lineBrutto: number;
      certificates: OrderItem[];
    };

export function groupOrderItems(items: OrderItem[]): OrderLine[] {
  const letters = items.filter((item) => item.sku === SANTA_LETTER_SKU);
  const certificates = items.filter((item) => item.sku === SANTA_CERTIFICATE_SKU);
  const rest = items.filter(
    (item) => item.sku !== SANTA_LETTER_SKU && item.sku !== SANTA_CERTIFICATE_SKU,
  );

  const lines: OrderLine[] = rest.map((item) => ({ kind: 'item', item }));
  if (letters.length > 0) {
    lines.unshift({
      kind: 'letter-group',
      letters,
      quantity: letters.reduce((sum, item) => sum + item.quantity, 0),
      unitPrice: letters[0].unitPrice,
      lineNetto: letters.reduce((sum, item) => sum + (item.lineNetto ?? 0), 0),
      lineVat: letters.reduce((sum, item) => sum + (item.lineVat ?? 0), 0),
      lineBrutto: letters.reduce(
        (sum, item) => sum + (item.lineBrutto ?? item.unitPrice * item.quantity),
        0,
      ),
      certificates,
    });
  }
  return lines;
}
