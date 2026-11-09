import type { CSSProperties, ReactNode } from 'react';
import ProductSection from './ProductSection';

export interface ProductStep {
  title: string;
  text: string;
}

interface ProductStepsProps {
  kicker: string;
  title: ReactNode;
  steps: readonly ProductStep[];
  footer?: ReactNode;
}

export default function ProductSteps({ kicker, title, steps, footer }: ProductStepsProps) {
  return (
    <ProductSection kicker={kicker} title={title}>
      <ol
        className="pdp-steps"
        data-count={steps.length}
        style={{ '--pdp-steps': steps.length } as CSSProperties}
      >
        {steps.map((step, i) => (
          <li key={step.title}>
            <span>{String(i + 1).padStart(2, '0')}</span>
            <h3>{step.title}</h3>
            <p>{step.text}</p>
          </li>
        ))}
      </ol>
      {footer && <div className="pdp-section-footer">{footer}</div>}
    </ProductSection>
  );
}
