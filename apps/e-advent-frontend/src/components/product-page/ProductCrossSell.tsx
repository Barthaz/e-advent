import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import ProductSection from './ProductSection';

interface ProductCrossSellProps {
  kicker: string;
  title: ReactNode;
  text: ReactNode;
  price: string;
  priceNote: ReactNode;
  cta: { label: string; to: string; onClick?: () => void };
}

export default function ProductCrossSell({ kicker, title, text, price, priceNote, cta }: ProductCrossSellProps) {
  return (
    <ProductSection>
      <div className="pdp-cross-sell">
        <div className="pdp-cross-sell-copy">
          <p className="pdp-kicker">{kicker}</p>
          <h2>{title}</h2>
          <p>{text}</p>
        </div>
        <div className="pdp-cross-sell-price">
          <strong>{price}</strong>
          <p>{priceNote}</p>
          <Link to={cta.to} onClick={cta.onClick} className="btn-green">
            {cta.label} <i className="fas fa-arrow-right" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </ProductSection>
  );
}
