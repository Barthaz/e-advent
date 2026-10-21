import { createContext, useContext } from 'react';
import type { OrderTotals } from '../config/products';
import type { CartItem } from '../utils/cartStorage';
export interface AddItemInput {
  sku: string;
  quantity?: number;
  calendarId?: string;
  label?: string;
  unitPrice?: number;
  customerEmail?: string;
  customerName?: string;
  format?: string;
  childName?: string;
  linkedLetterId?: string;
}

export interface AddSantaLetterBundleInput {
  letterLabel?: string;
  childName?: string;
}

export interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  totals: OrderTotals;
  freeShippingThreshold: number;
  addItem: (input: AddItemInput) => CartItem;
  addSantaLetterBundle: (input: AddSantaLetterBundleInput) => CartItem[];
  removeItem: (id: string) => void;
  updateQty: (id: string, quantity: number) => void;
  clear: () => void;
}

export const CartContext = createContext<CartContextValue | undefined>(undefined);

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
