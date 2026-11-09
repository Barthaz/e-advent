import type { ReactNode } from 'react';
import './commerce.css';

export default function OrderResultLayout({ children }: { children: ReactNode }) {
  return <div className="commerce-page order-result"><div className="commerce-container"><div className="order-panel order-result-card">{children}</div></div></div>;
}
