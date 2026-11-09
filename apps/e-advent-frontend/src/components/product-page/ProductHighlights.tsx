import './product-page.css';

export interface ProductHighlight {
  /** Full Font Awesome class, e.g. `far fa-heart` */
  icon: string;
  label: string;
}

export default function ProductHighlights({ items }: { items: readonly ProductHighlight[] }) {
  return (
    <div className="pdp-highlights">
      <div className="pdp-container">
        {items.map((item) => (
          <span key={item.label}>
            <i className={item.icon} aria-hidden="true" /> {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
