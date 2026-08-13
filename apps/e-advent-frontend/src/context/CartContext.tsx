import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  FREE_SHIPPING_THRESHOLD,
  getProduct,
  type OrderTotals,
} from '../config/products';
import {
  cartItemCount,
  clearCartStorage,
  createCartItem,
  getCartTotals,
  loadCart,
  saveCart,
  type CartItem,
} from '../utils/cartStorage';
import { trackAddToCart } from '../utils/analytics';

interface AddItemInput {
  sku: string;
  quantity?: number;
  calendarId?: string;
  label?: string;
  unitPrice?: number;
  customerEmail?: string;
  customerName?: string;
  format?: string;
}

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  totals: OrderTotals;
  freeShippingThreshold: number;
  addItem: (input: AddItemInput) => CartItem;
  removeItem: (id: string) => void;
  updateQty: (id: string, quantity: number) => void;
  clear: () => void;
}

const EMPTY_TOTALS: OrderTotals = {
  subtotal: 0,
  shipping: 0,
  total: 0,
  hasPhysical: false,
  freeShipping: false,
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => loadCart());

  const persist = useCallback((next: CartItem[]) => {
    setItems(next);
    saveCart(next);
  }, []);

  const addItem = useCallback(
    (input: AddItemInput) => {
      const product = getProduct(input.sku);
      const existing = items.find(
        (item) =>
          item.sku === input.sku &&
          (item.calendarId ?? '') === (input.calendarId ?? ''),
      );

      let next: CartItem[];
      let added: CartItem;

      if (existing && !input.calendarId) {
        added = {
          ...existing,
          quantity: existing.quantity + Math.max(1, input.quantity ?? 1),
          label: input.label ?? existing.label ?? product?.name,
          unitPrice: input.unitPrice ?? existing.unitPrice ?? product?.basePrice,
          customerEmail: input.customerEmail ?? existing.customerEmail,
          customerName: input.customerName ?? existing.customerName,
          format: input.format ?? existing.format,
        };
        next = items.map((item) => (item.id === existing.id ? added : item));
      } else if (existing && input.calendarId) {
        // Personalized calendar already in cart — keep single line
        added = {
          ...existing,
          label: input.label ?? existing.label ?? product?.name,
          unitPrice: input.unitPrice ?? existing.unitPrice ?? product?.basePrice,
          customerEmail: input.customerEmail ?? existing.customerEmail,
          customerName: input.customerName ?? existing.customerName,
          format: input.format ?? existing.format,
          quantity: 1,
        };
        next = items.map((item) => (item.id === existing.id ? added : item));
      } else {
        added = createCartItem({
          sku: input.sku,
          quantity: input.calendarId ? 1 : input.quantity,
          calendarId: input.calendarId,
          label: input.label ?? product?.name,
          unitPrice: input.unitPrice ?? product?.basePrice,
          customerEmail: input.customerEmail,
          customerName: input.customerName,
          format: input.format,
        });
        next = [...items, added];
      }

      persist(next);
      trackAddToCart({
        sku: added.sku,
        name: added.label ?? product?.name ?? added.sku,
        price: added.unitPrice ?? product?.basePrice ?? 0,
        quantity: input.quantity ?? 1,
      });
      return added;
    },
    [items, persist],
  );

  const removeItem = useCallback(
    (id: string) => {
      persist(items.filter((item) => item.id !== id));
    },
    [items, persist],
  );

  const updateQty = useCallback(
    (id: string, quantity: number) => {
      const target = items.find((item) => item.id === id);
      // Personalized calendars are unique — quantity stays 1
      if (target?.calendarId) return;
      const qty = Math.floor(quantity);
      if (qty < 1) {
        persist(items.filter((item) => item.id !== id));
        return;
      }
      persist(items.map((item) => (item.id === id ? { ...item, quantity: qty } : item)));
    },
    [items, persist],
  );

  const clear = useCallback(() => {
    setItems([]);
    clearCartStorage();
  }, []);

  const totals = useMemo(() => getCartTotals(items) ?? EMPTY_TOTALS, [items]);
  const itemCount = useMemo(() => cartItemCount(items), [items]);

  const value = useMemo(
    () => ({
      items,
      itemCount,
      totals,
      freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
      addItem,
      removeItem,
      updateQty,
      clear,
    }),
    [items, itemCount, totals, addItem, removeItem, updateQty, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
