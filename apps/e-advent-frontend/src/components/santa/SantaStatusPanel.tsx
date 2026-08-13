import type { SantaScheduleState } from '../../hooks/useSantaSchedule';

interface SantaStatusPanelProps {
  state: SantaScheduleState;
  tracking: boolean;
}

export default function SantaStatusPanel({ state, tracking }: SantaStatusPanelProps) {
  const {
    position,
    liveAllowed,
    etaMs,
    etaLabel,
    arrivalLabel,
    progressPct,
    currentCity,
    nextCity,
    userCity,
    visitedLabel,
  } = state;

  if (!userCity) {
    return (
      <div className="text-center text-parchment-muted text-base md:text-lg py-4 leading-relaxed">
        Wybierz miasto, aby zobaczyć, kiedy Mikołaj do Ciebie dotrze.
      </div>
    );
  }

  let headline = 'Mikołaj przygotowuje sanie…';
  let detail = '';

  if (!liveAllowed) {
    headline = 'Śledzenie na żywo od 24 grudnia';
    detail = `Zaplanowany przyjazd do ${userCity.name}: ok. ${arrivalLabel}`;
  } else if (position.beforeStart) {
    headline = 'Mikołaj jest jeszcze na biegunie';
    detail = `Wyruszy w trasę, a u Ciebie będzie o ${arrivalLabel}`;
  } else if (position.atUserCity || (etaMs === 0 && !position.afterEnd && position.posFloat >= userCity.index)) {
    headline = `Mikołaj jest w ${userCity.name}!`;
    detail = 'Ho ho ho — czas na prezenty.';
  } else if (etaMs > 0) {
    headline = `U Ciebie za ${etaLabel}`;
    detail = `Przyjazd ok. ${arrivalLabel} · teraz: ${currentCity?.name ?? '…'}`;
  } else if (position.afterEnd) {
    headline = 'Trasa zakończona';
    detail = 'Mikołaj okrążył świat — do zobaczenia za rok!';
  } else {
    headline = `Już był w ${userCity.name}`;
    detail = `Kolejny postój: ${nextCity?.name ?? '—'}`;
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="font-display text-2xl md:text-3xl font-semibold text-christmas-green leading-snug tracking-wide">
          {headline}
        </p>
        {detail && (
          <p className="mt-3 text-parchment-muted text-base md:text-lg leading-relaxed">{detail}</p>
        )}
      </div>

      {tracking && liveAllowed && (
        <>
          <div className="h-2.5 overflow-hidden rounded-full bg-bronze/20">
            <div
              className="h-full rounded-full bg-gradient-to-r from-christmas-red to-christmas-gold transition-[width] duration-300"
              style={{ width: `${Math.min(100, progressPct)}%` }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <Stat label="Postęp" value={`${progressPct}%`} />
            <Stat label="Odwiedzone" value={visitedLabel} />
            <Stat label="Teraz" value={currentCity?.name ?? '—'} />
            <Stat label="Następne" value={nextCity?.name ?? '—'} />
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-cream/80 px-3 py-2 text-center border border-bronze/15">
      <div className="text-xs uppercase tracking-wide text-parchment-muted">{label}</div>
      <div className="mt-0.5 font-medium text-parchment-text truncate" title={value}>
        {value}
      </div>
    </div>
  );
}
