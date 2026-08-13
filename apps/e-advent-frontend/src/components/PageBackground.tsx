import type { ReactNode } from 'react';
import backgroundImage from '@e-advent/assets/background.png';
import Snowfall from './Snowfall';

interface PageBackgroundProps {
  children: ReactNode;
  className?: string;
  variant?: 'photo' | 'gradient';
  showSnow?: boolean;
  overlayOpacity?: 'light' | 'medium' | 'dark';
}

const overlayClasses = {
  light: 'bg-black/25',
  medium: 'bg-black/35',
  dark: 'bg-black/50',
};

export default function PageBackground({
  children,
  className = '',
  variant = 'photo',
  showSnow = false,
  overlayOpacity = 'medium',
}: PageBackgroundProps) {
  if (variant === 'gradient') {
    return (
      <section className={`page-bg-gradient relative overflow-hidden text-white ${className}`}>
        <div className="page-bg-texture" />
        {showSnow && <Snowfall />}
        <div className="relative z-10">{children}</div>
      </section>
    );
  }

  return (
    <section
      className={`relative overflow-hidden text-white ${className}`}
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className={`absolute inset-0 ${overlayClasses[overlayOpacity]}`} />
      <div className="absolute inset-0 bg-christmas-green/10" />
      {showSnow && <Snowfall />}
      <div className="relative z-10">{children}</div>
    </section>
  );
}
