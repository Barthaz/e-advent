import type { ReactNode } from 'react';
import PageBackground from './PageBackground';
import Logo from './Logo';

interface FestivePageProps {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
  showLogo?: boolean;
  centered?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showSnow?: boolean;
  /** Defaults to photo (marketing look). Pass gradient only when explicitly needed. */
  variant?: 'photo' | 'gradient';
  overlayOpacity?: 'light' | 'medium' | 'dark';
}

const maxWidthClasses = {
  sm: 'max-w-2xl',
  md: 'max-w-3xl',
  lg: 'max-w-4xl',
  xl: 'max-w-5xl',
  full: 'max-w-7xl',
};

export default function FestivePage({
  children,
  className = '',
  containerClassName = '',
  showLogo = true,
  centered = false,
  maxWidth = 'lg',
  showSnow = true,
  variant = 'photo',
  overlayOpacity = 'medium',
}: FestivePageProps) {
  return (
    <PageBackground
      variant={variant}
      showSnow={showSnow}
      overlayOpacity={overlayOpacity}
      className={`min-h-screen py-6 md:py-10 ${className}`}
    >
      <div
        className={`container mx-auto px-4 ${maxWidthClasses[maxWidth]} ${containerClassName} ${
          centered ? 'min-h-[calc(100vh-3rem)] flex flex-col items-center justify-center' : ''
        }`}
      >
        {showLogo && <Logo className="mb-6 md:mb-8" />}
        {children}
      </div>
    </PageBackground>
  );
}

export { PageBackground };
