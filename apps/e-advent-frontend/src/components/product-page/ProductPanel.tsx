import type { ReactNode } from 'react';

interface ProductPanelProps {
  title?: string;
  children: ReactNode;
}

/** Frosted box for product options inside the dark hero. */
export default function ProductPanel({ title, children }: ProductPanelProps) {
  return (
    <div className="mb-6 rounded-2xl border border-christmas-gold/35 bg-white/5 p-4 md:p-5 backdrop-blur-sm">
      {title && <p className="font-display text-[15px] sm:text-lg text-christmas-gold-light mb-3">{title}</p>}
      {children}
    </div>
  );
}
