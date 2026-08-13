import type { ReactNode } from 'react';

interface ParchmentCardProps {
  children: ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
}

const paddingClasses = {
  sm: 'p-4',
  md: 'p-5 md:p-6',
  lg: 'p-6 md:p-8',
};

export default function ParchmentCard({ children, className = '', padding = 'md' }: ParchmentCardProps) {
  return (
    <div className={`parchment-card ${paddingClasses[padding]} ${className}`}>
      {children}
    </div>
  );
}
