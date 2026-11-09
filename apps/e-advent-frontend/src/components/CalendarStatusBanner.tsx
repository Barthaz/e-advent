interface CalendarStatusBannerProps {
  isBeforeDecember: boolean;
  hasOpenedWindows: boolean;
  nextAvailableDate: Date;
}
export default function CalendarStatusBanner({ hasOpenedWindows, nextAvailableDate }: CalendarStatusBannerProps) {
  const date = nextAvailableDate.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' });
  return <div className="calendar-wait-note" role="status"><i className="far fa-calendar" aria-hidden="true" /><div>
    <strong>{hasOpenedWindows ? 'Na dziś już wszystko odkryte.' : 'Najpiękniejsze chwile są przed Wami.'}</strong>
    <p>{hasOpenedWindows ? 'Kolejne' : 'Pierwsze'} okienko otworzy się {date}. {hasOpenedWindows ? 'Do odkrytych zadań możesz wracać w każdej chwili.' : 'Zachowaj ten link i wróć do wspólnego odliczania.'}</p>
  </div></div>;
}
