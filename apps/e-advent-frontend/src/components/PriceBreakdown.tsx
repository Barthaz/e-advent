import { formatPrice } from '../config/products';

export type PriceBreakdownVariant = 'inline' | 'panel' | 'checkout' | 'format';

interface PriceBreakdownProps {
  basePrice: number;
  shippingCost: number;
  variant?: PriceBreakdownVariant;
  className?: string;
  totalLabel?: string;
  freeShipping?: boolean;
  productLabel?: string;
}

export default function PriceBreakdown({
  basePrice,
  shippingCost,
  variant = 'inline',
  className = '',
  totalLabel = 'Razem',
  freeShipping = false,
  productLabel = 'Produkty',
}: PriceBreakdownProps) {
  const total = basePrice + shippingCost;

  if (shippingCost === 0 && !freeShipping) {
    return (
      <div className={`price-breakdown price-breakdown--${variant} ${className}`.trim()}>
        <div className="price-breakdown-total">
          <span>{totalLabel}</span>
          <span className="price-breakdown-total-amount">{formatPrice(total)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`price-breakdown price-breakdown--${variant} ${className}`.trim()}>
      <div className="price-breakdown-row">
        <span>{productLabel}</span>
        <span>{formatPrice(basePrice)}</span>
      </div>
      <div className="price-breakdown-row">
        <span>Wysyłka (Poczta Polska)</span>
        <span>{freeShipping || shippingCost === 0 ? 'Gratis' : formatPrice(shippingCost)}</span>
      </div>
      <div className="price-breakdown-total">
        <span>{totalLabel}</span>
        <span className="price-breakdown-total-amount">{formatPrice(total)}</span>
      </div>
    </div>
  );
}
