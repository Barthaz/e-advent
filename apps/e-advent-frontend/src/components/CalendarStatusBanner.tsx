interface CalendarStatusBannerProps {
  isBeforeDecember: boolean;
  hasOpenedWindows: boolean;
  nextAvailableDate: Date;
}

export default function CalendarStatusBanner({
  isBeforeDecember,
  hasOpenedWindows,
  nextAvailableDate,
}: CalendarStatusBannerProps) {
  const formattedDate = nextAvailableDate.toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="status-banner mb-6">
      <div className="status-banner-texture" />
      <div className="relative z-10 text-center">
        <div className="mb-3">
          <i className={`fas ${isBeforeDecember || !hasOpenedWindows ? 'fa-calendar-check' : 'fa-gift'} text-christmas-gold-light text-4xl`} />
        </div>
        {isBeforeDecember ? (
          <>
            <p className="status-banner-title">
              <i className="fas fa-star mr-2" />
              Magia świąt dopiero się zaczyna!
              <i className="fas fa-star ml-2" />
            </p>
            <p className="text-white text-base md:text-lg">
              Kalendarz adwentowy rozpocznie się{' '}
              <span className="font-bold text-christmas-gold-light">1 grudnia</span>. Wróć do nas wtedy,
              aby otworzyć pierwsze okienko!
            </p>
          </>
        ) : hasOpenedWindows ? (
          <>
            <p className="status-banner-title">
              <i className="fas fa-gift mr-2" />
              Wszystkie dzisiejsze okienka już otwarte!
              <i className="fas fa-gift ml-2" />
            </p>
            <p className="text-white text-base md:text-lg">
              Wróć do nas{' '}
              <span className="font-bold text-christmas-gold-light">{formattedDate}</span> aby otworzyć
              następne okienko!
            </p>
          </>
        ) : (
          <>
            <p className="status-banner-title">
              <i className="fas fa-star mr-2" />
              Magia świąt dopiero się zaczyna!
              <i className="fas fa-star ml-2" />
            </p>
            <p className="text-white text-base md:text-lg">
              Wróć do nas{' '}
              <span className="font-bold text-christmas-gold-light">{formattedDate}</span> aby otworzyć
              pierwsze okienko!
            </p>
          </>
        )}
      </div>
    </div>
  );
}
