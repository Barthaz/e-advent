import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import {
  FREE_SHIPPING_THRESHOLD,
  getProduct,
  isCalendarSku,
  isCalendarsOnSale,
  type OrderTotals,
} from '../config/products';
import {
  appendSantaLetterBundle,
  CART_CHANGED_EVENT,
  cartItemCount,
  clearCartStorage,
  createCartItem,
  getCartTotals,
  hasLinkedCertificate,
  loadCart,
  removeCartItem,
  sanitizeCartItems,
  saveCart,
  SANTA_CERTIFICATE_SKU,
  type CartItem,
} from '../utils/cartStorage';
import { reconcilePendingCheckout } from '../utils/reconcileCheckout';
import { trackAddToCart } from '../utils/analytics';

import { CartContext, type AddItemInput, type AddSantaLetterBundleInput } from './useCart';

const EMPTY_TOTALS: OrderTotals = getCartTotals([])!;


function trackAddedItems(added: CartItem[], quantityFallback = 1) {
  for (const item of added) {
    const product = getProduct(item.sku);
    trackAddToCart({
      sku: item.sku,
      name: item.label ?? product?.name ?? item.sku,
      price: item.unitPrice ?? product?.basePrice ?? 0,
      quantity: item.quantity || quantityFallback,
    });
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const reconciledRef = useRef(false);
  const [items, setItems] = useState<CartItem[]>(() => sanitizeCartItems(loadCart()));

  useEffect(() => {
    const sync = () => setItems(sanitizeCartItems(loadCart()));
    window.addEventListener(CART_CHANGED_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CART_CHANGED_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  useEffect(() => {
    if (reconciledRef.current) return;
    if (location.pathname === '/sukces' || location.pathname === '/success') return;
    reconciledRef.current = true;
    void reconcilePendingCheckout().then((result) => {
      if (result === 'cleared') setItems([]);
      if (result === 'restored') setItems(sanitizeCartItems(loadCart()));
    });
  }, [location.pathname]);

  const addItem = useCallback(
    (input: AddItemInput) => {
      if (input.sku === SANTA_CERTIFICATE_SKU) {
        return createCartItem({ sku: input.sku });
      }
      if (isCalendarSku(input.sku) && !isCalendarsOnSale()) {
        return createCartItem({ sku: input.sku });
      }

      let added: CartItem = createCartItem({ sku: input.sku });

      setItems((prev) => {
        const product = getProduct(input.sku);
        const existing = prev.find(
          (item) =>
            item.sku === input.sku &&
            (item.calendarId ?? '') === (input.calendarId ?? ''),
        );

        let next: CartItem[];

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
          next = prev.map((item) => (item.id === existing.id ? added : item));
        } else if (existing && input.calendarId) {
          added = {
            ...existing,
            label: input.label ?? existing.label ?? product?.name,
            unitPrice: input.unitPrice ?? existing.unitPrice ?? product?.basePrice,
            customerEmail: input.customerEmail ?? existing.customerEmail,
            customerName: input.customerName ?? existing.customerName,
            format: input.format ?? existing.format,
            quantity: 1,
          };
          next = prev.map((item) => (item.id === existing.id ? added : item));
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
          next = [...prev, added];
        }

        const sanitized = sanitizeCartItems(next);
        saveCart(sanitized);
        return sanitized;
      });

      trackAddToCart({
        sku: added.sku,
        name: added.label ?? getProduct(added.sku)?.name ?? added.sku,
        price: added.unitPrice ?? getProduct(added.sku)?.basePrice ?? 0,
        quantity: input.quantity ?? 1,
      });
      return added;
    },
    [],
  );

  const addSantaLetterBundle = useCallback((input: AddSantaLetterBundleInput) => {
    let added: CartItem[] = [];

    setItems((prev) => {
      const result = appendSantaLetterBundle(prev, input);
      added = result.added;
      saveCart(result.items);
      return result.items;
    });

    trackAddedItems(added);
    return added;
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const next = removeCartItem(prev, id);
      saveCart(next);
      return next;
    });
  }, []);

  const updateQty = useCallback((id: string, quantity: number) => {
    setItems((prev) => {
      const target = prev.find((item) => item.id === id);
      if (!target?.calendarId && target?.sku === SANTA_CERTIFICATE_SKU) return prev;
      if (target?.calendarId || (target && hasLinkedCertificate(prev, target.id))) return prev;

      const qty = Math.floor(quantity);
      const next =
        qty < 1
          ? removeCartItem(prev, id)
          : prev.map((item) => (item.id === id ? { ...item, quantity: qty } : item));

      saveCart(next);
      return next;
    });
  }, []);

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
      addSantaLetterBundle,
      removeItem,
      updateQty,
      clear,
    }),
    [items, itemCount, totals, addItem, addSantaLetterBundle, removeItem, updateQty, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
