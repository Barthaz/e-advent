import type { ReactNode } from 'react';
import { formatPrice, getProduct } from '../../config/products';
import { getCartItemDisplayName, type CartItem } from '../../utils/cartStorage';
import type { CheckoutPromo } from './useCheckoutPromo';

interface Props {
  items: CartItem[];
  subtotal: number;
  total: number;
  discount?: number;
  shipping?: number;
  shippingPending?: boolean;
  hasPhysical: boolean;
  promo: CheckoutPromo;
  children?: ReactNode;
}

export default function OrderSummary({ items, subtotal, total, discount = 0, shipping = 0, shippingPending, hasPhysical, promo, children }: Props) {
  return (
    <aside className="order-summary" aria-label="Podsumowanie zamówienia">
      <p className="order-eyebrow">Twoje świąteczne chwile</p>
      <h2>Podsumowanie</h2>
      <ul className="order-summary-items">
        {items.map(item => <li key={item.id}>
          <span>{getCartItemDisplayName(item)}<small>{item.quantity} szt.</small></span>
          <strong>{formatPrice((item.unitPrice ?? getProduct(item.sku)?.basePrice ?? 0) * item.quantity)}</strong>
        </li>)}
      </ul>
      <div className="order-promo">
        <label htmlFor="promoCode">Masz kod rabatowy?</label>
        <div className="order-promo-input">
          <input id="promoCode" value={promo.code} onChange={e => promo.change(e.target.value)} onBlur={() => void promo.apply()}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void promo.apply(); } }}
            placeholder="Wpisz kod rabatowy" autoCapitalize="characters" aria-describedby="promo-status" />
          <button type="button" className="btn-secondary" onClick={() => void promo.apply()} disabled={promo.checking || !promo.code.trim()}>{promo.checking ? 'Sprawdzam…' : 'Zastosuj'}</button>
        </div>
        <div id="promo-status" aria-live="polite">
          {promo.error && <p className="order-field-error">{promo.error}</p>}
          {promo.discount != null && !promo.error && <p className="order-promo-success">{promo.discount === 100 ? 'Kod zastosowany — zamówienie za 0 zł.' : promo.discount === 95 ? 'Kod zastosowany — zniżka 95% od wartości zamówienia.' : `Kod zastosowany — zniżka ${promo.discount}% od produktów.`} <button type="button" onClick={() => promo.change('')}>Usuń kod</button></p>}
        </div>
      </div>
      <dl className="order-totals">
        <div><dt>Produkty</dt><dd>{formatPrice(subtotal)}</dd></div>
        {discount > 0 && <div className="order-discount"><dt>Rabat {promo.discount}%</dt><dd>−{formatPrice(discount)}</dd></div>}
        <div><dt>{hasPhysical ? 'Dostawa' : 'Dostawa cyfrowa'}</dt><dd>{shippingPending ? 'Po wyborze dostawy' : shipping > 0 ? formatPrice(shipping) : 'Bezpłatnie'}</dd></div>
        <div className="order-total"><dt>{shippingPending ? 'Razem bez dostawy' : 'Do zapłaty'}</dt><dd>{formatPrice(total)}</dd></div>
      </dl>
      <p className="order-tax-note">Ceny zawierają podatek VAT.{shippingPending && ' Koszt dostawy poznasz przed płatnością.'}</p>
      {children}
      <p className="order-safe"><i className="fas fa-lock" aria-hidden="true" /> Bezpieczna płatność przez Stripe</p>
    </aside>
  );
}
