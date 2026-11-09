import type { ReactNode } from 'react';
import ProductSection from './ProductSection';

export interface ProductStoryItem {
  title?: string;
  text: string;
}

interface ProductStoryProps {
  kicker: string;
  title: ReactNode;
  description?: ReactNode;
  items: readonly ProductStoryItem[];
}

/** Tinted band: heading on the left, numbered list on the right. */
export default function ProductStory({ kicker, title, description, items }: ProductStoryProps) {
  return (
    <ProductSection tinted className="pdp-story">
      <div className="pdp-story-grid">
        <div>
          <p className="pdp-kicker">{kicker}</p>
          <h2>{title}</h2>
          {description && <p className="pdp-text">{description}</p>}
        </div>
        <ul className="pdp-story-list">
          {items.map((item, i) => (
            <li key={item.title ?? item.text}>
              <span>{String(i + 1).padStart(2, '0')}</span>
              <div>
                {item.title && <h3>{item.title}</h3>}
                <p>{item.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </ProductSection>
  );
}
