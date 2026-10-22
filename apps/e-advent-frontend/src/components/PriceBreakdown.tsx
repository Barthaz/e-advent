import { formatPrice } from '../config/products';

export type PriceBreakdownVariant = 'inline' | 'panel' | 'checkout' | 'format';

interface PriceBreakdownProps {
  basePrice: number;
  shippingCost: number;
  shippingPending?: boolean;
  variant?: PriceBreakdownVariant;
  className?: string;
  totalLabel?: string;
  freeShipping?: boolean;
  productLabel?: string;
  discount?: number;
  discountPercent?: number;
}

export default function PriceBreakdown({
  basePrice,
  shippingCost,
  shippingPending = false,
  variant = 'inline',
  className = '',
  totalLabel = 'Razem',
  freeShipping = false,
  productLabel = 'Produkty',
  discount = 0,
  discountPercent,
}: PriceBreakdownProps) {
  const rebate = Number(discount) > 0 ? Number(discount) : 0;
  const total = basePrice - rebate + shippingCost;

  if (shippingPending) return <div className="price-breakdown"><p>Produkty: {formatPrice(basePrice)}</p><p>Dostawa InPost: wybierz sposób dostawy, aby obliczyć koszt.</p></div>;

  if (shippingCost === 0 && !freeShipping && rebate <= 0) {
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
      {rebate > 0 && (
        <div className="price-breakdown-row">
          <span>Rabat{discountPercent ? ` ${discountPercent}%` : ''}</span>
          <span>−{formatPrice(rebate)}</span>
        </div>
      )}
      {(shippingCost > 0 || freeShipping) && (
      <div className="price-breakdown-row">
        <span>Dostawa InPost</span>
        <span>{freeShipping || shippingCost === 0 ? 'Gratis' : formatPrice(shippingCost)}</span>
      </div>
      )}
      <div className="price-breakdown-total">
        <span>{totalLabel}</span>
        <span className="price-breakdown-total-amount">{formatPrice(total)}</span>
      </div>
    </div>
  );
}
