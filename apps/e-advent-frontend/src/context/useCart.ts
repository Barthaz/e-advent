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
  childNames?: string[];
  letterQuantity?: number;
  /** Dodaje w tej samej operacji wiadomość od Mikołaja w cenie dodatku */
  withVoiceMessage?: boolean;
}

export interface AddVoiceMessageInput {
  mode: 'standalone' | 'letter_addon';
  voiceDraftId?: string;
  voiceDraftKey?: string;
}

export interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  totals: OrderTotals;
  freeShippingThreshold: number;
  addItem: (input: AddItemInput) => CartItem;
  addSantaLetterBundle: (input: AddSantaLetterBundleInput) => CartItem[];
  removeItem: (id: string) => void;
  removeCertificate: (id: string) => void;
  addCertificate: (name: string) => void;
  setLetterQuantity: (quantity: number) => void;
  removeLetterPack: () => void;
  updateQty: (id: string, quantity: number) => void;
  clear: () => void;
  addVoiceMessage: (input: AddVoiceMessageInput) => CartItem;
  convertVoiceToAddon: (id: string) => void;
  /** Informacja o przeliczeniu dodatku na cenę samodzielną po usunięciu listu */
  voiceNotice: string | null;
  dismissVoiceNotice: () => void;
}

export const CartContext = createContext<CartContextValue | undefined>(undefined);

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
