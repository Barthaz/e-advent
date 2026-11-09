import type { ReactNode } from 'react';
import './product-page.css';

export interface ProductFaqItem {
  q: string;
  a: ReactNode;
}

interface ProductFaqProps {
  items: readonly ProductFaqItem[];
  kicker?: string;
  title?: string;
  note?: ReactNode;
}

export default function ProductFaq({
  items,
  kicker = 'Wszystko jasne, zanim zamówisz',
  title = 'Rodzice pytają',
  note,
}: ProductFaqProps) {
  return (
    <section className="pdp-band pdp-section">
      <div className="pdp-container pdp-faq">
        <header>
          <p className="pdp-kicker">{kicker}</p>
          <h2>{title}</h2>
          <p>
            Jeszcze o coś chcesz zapytać?
            <br />
            <a href="mailto:kontakt@e-advent.pl">Napisz do nas.</a>
          </p>
        </header>
        <div>
          {items.map((item) => (
            <details key={item.q}>
              <summary>
                {item.q}
                <i className="fas fa-plus" aria-hidden="true" />
              </summary>
              <p>{item.a}</p>
            </details>
          ))}
          {note && <p className="pdp-small">{note}</p>}
        </div>
      </div>
    </section>
  );
}
