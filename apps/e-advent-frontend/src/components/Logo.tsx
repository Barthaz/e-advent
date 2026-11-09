import { Link, useLocation } from 'react-router-dom';
import logo from '@e-advent/assets/brand/eadvent-logo.png';

export default function Logo({ className = '' }: { className?: string }) {
  const location = useLocation();

  return (
    <div className={`relative z-20 flex justify-center ${className}`}>
      <Link
        to="/"
        className="transition-transform hover:scale-105"
        aria-label="e-Advent - Strona główna"
        onClick={(e) => {
          if (location.pathname === '/sledz-mikolaja') {
            e.preventDefault();
            window.location.assign('/');
          }
        }}
      >
        <img
          src={logo}
          alt="e-Advent - Kalendarz Adwentowy Online"
          className="h-16 md:h-20 w-auto drop-shadow-xl"
          width="200"
          height="80"
          loading="eager"
          fetchPriority="high"
        />
      </Link>
    </div>
  );
}
