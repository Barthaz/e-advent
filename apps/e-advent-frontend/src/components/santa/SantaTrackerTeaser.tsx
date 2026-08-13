import { useLayoutEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { canTrackLive, isDecember24 } from '../../utils/santa/dateGate';
import { trackSantaTrackerBannerClick } from '../../utils/santa/analytics';

const BANNER_H = '2.5rem';

function setBannerOffset(on: boolean) {
  if (on) {
    document.documentElement.style.setProperty('--santa-banner-h', BANNER_H);
  } else {
    document.documentElement.style.removeProperty('--santa-banner-h');
  }
}

/** Slim fixed promo bar — always visible (not dismissible). */
export default function SantaTrackerTeaser() {
  const location = useLocation();
  const hideOnPath =
    location.pathname === '/sledz-mikolaja' ||
    location.pathname === '/podglad' ||
    location.pathname === '/preview';

  const [visible, setVisible] = useState(() => !hideOnPath);

  useLayoutEffect(() => {
    const show = !hideOnPath;
    setVisible(show);
    setBannerOffset(show);
    return () => setBannerOffset(false);
  }, [hideOnPath]);

  if (!visible) return null;

  const live = canTrackLive();
  const isEve = isDecember24();

  return (
    <div
      className="santa-promo-bar fixed inset-x-0 top-0 z-50 flex h-10 items-center justify-center gap-2 px-4 text-center text-[13px] leading-tight text-white shadow-md sm:text-sm"
      role="region"
      aria-label="Śledź Świętego Mikołaja"
    >
      <span className="hidden opacity-90 sm:inline" aria-hidden>
        <i className="fas fa-globe-europe" />
      </span>
      <p className="min-w-0 truncate px-1">
        {isEve || live ? (
          <>
            <span className="font-semibold text-christmas-gold-light">Na żywo</span>
            {' — pokaż dzieciom magię Wigilii na mapie. '}
          </>
        ) : (
          <>Od 24 grudnia pokaż dzieciom magię Wigilii na mapie. </>
        )}
        <Link
          to="/sledz-mikolaja"
          onClick={() => trackSantaTrackerBannerClick()}
          className="font-semibold text-christmas-gold-light underline decoration-white/30 underline-offset-2 transition hover:text-white hover:decoration-white"
        >
          Otwórz tracker
        </Link>
      </p>
    </div>
  );
}
