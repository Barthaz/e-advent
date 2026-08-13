import type { ReactNode } from 'react';

type ContentCardVariant = 'default' | 'gold' | 'error' | 'glass';

interface ContentCardProps {
  children: ReactNode;
  className?: string;
  variant?: ContentCardVariant;
  padding?: 'sm' | 'md' | 'lg';
}

const variantClasses: Record<ContentCardVariant, string> = {
  default: 'content-card',
  gold: 'content-card content-card--gold',
  error: 'content-card content-card--error',
  glass: 'content-card content-card--glass',
};

const paddingClasses = {
  sm: 'p-5 md:p-6',
  md: 'p-6 md:p-8',
  lg: 'p-8 md:p-12',
};

export default function ContentCard({
  children,
  className = '',
  variant = 'default',
  padding = 'md',
}: ContentCardProps) {
  return (
    <div className={`${variantClasses[variant]} ${paddingClasses[padding]} ${className}`}>
      {children}
    </div>
  );
}
