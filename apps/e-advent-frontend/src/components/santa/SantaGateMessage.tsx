import { formatCountdown, nextDecember24Start, msUntil } from '../../utils/santa/dateGate';
import { useSantaNow } from '../../hooks/useSantaSchedule';

export default function SantaGateMessage() {
  const now = useSantaNow(1000);
  const target = nextDecember24Start(now);
  const remaining = formatCountdown(msUntil(target, now));

  return (
    <div className="text-center px-2 py-2">
      <p className="font-display text-xl md:text-2xl font-semibold text-christmas-green leading-snug tracking-wide">
        Live tracker odblokuje się 24 grudnia
      </p>
      <div className="gold-divider my-4" />
      <p className="text-parchment-muted text-base md:text-lg leading-relaxed mb-2">
        Do startu śledzenia zostało:{' '}
        <span className="font-medium text-parchment-text">{remaining}</span>
      </p>
      <p className="text-parchment-muted text-sm md:text-base leading-relaxed">
        Możesz już wybrać miasto i godzinę przyjazdu — 24 grudnia mapa ożyje automatycznie.
        Mikołaj czeka na biegunie w Laponii.
      </p>
    </div>
  );
}
