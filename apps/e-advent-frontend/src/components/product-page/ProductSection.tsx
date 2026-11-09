import type { ReactNode } from 'react';
import './product-page.css';

interface ProductSectionProps {
  kicker?: string;
  title?: ReactNode;
  intro?: ReactNode;
  tinted?: boolean;
  className?: string;
  children: ReactNode;
}

export default function ProductSection({ kicker, title, intro, tinted = false, className = '', children }: ProductSectionProps) {
  return (
    <section className={`pdp-band pdp-section ${tinted ? 'pdp-band--tinted' : ''} ${className}`}>
      <div className="pdp-container">
        {title && (
          <header className="pdp-section-heading">
            {kicker && <p className="pdp-kicker">{kicker}</p>}
            <h2>{title}</h2>
            {intro && <p className="pdp-text">{intro}</p>}
          </header>
        )}
        {children}
      </div>
    </section>
  );
}
