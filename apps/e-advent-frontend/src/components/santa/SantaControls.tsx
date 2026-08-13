import type { SantaCity } from '../../utils/santa/schedule';
import type { CitySearchHit } from '../../hooks/useCitySearch';

interface SantaControlsProps {
  query: string;
  onQueryChange: (value: string) => void;
  results: CitySearchHit[];
  selected: SantaCity | null;
  onSelect: (city: SantaCity) => void;
  arrivalHour: number;
  arrivalMinute: number;
  onArrivalChange: (hour: number, minute: number) => void;
  disabled?: boolean;
}

export default function SantaControls({
  query,
  onQueryChange,
  results,
  selected,
  onSelect,
  arrivalHour,
  arrivalMinute,
  onArrivalChange,
  disabled = false,
}: SantaControlsProps) {
  const timeValue = `${String(arrivalHour).padStart(2, '0')}:${String(arrivalMinute).padStart(2, '0')}`;

  return (
    <div className="grid gap-4 sm:grid-cols-[1.4fr_1fr]">
      <div className="relative mb-0">
        <label className="block text-sm font-medium text-parchment-muted mb-2">
          Twoje miasto
        </label>
        <input
          type="text"
          value={query}
          disabled={disabled}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="np. Kraków, Zakopane, Suwałki…"
          autoComplete="off"
          className="input-field"
        />
        {results.length > 0 && query.length >= 2 && normalizeMismatch(query, selected) ? (
          <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-bronze/30 bg-cream shadow-lg">
            {results.map(({ city }) => (
              <li key={`${city.id}-${city.name}`}>
                <button
                  type="button"
                  className="flex w-full items-baseline justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-christmas-gold/15"
                  onClick={() => onSelect(city)}
                >
                  <span className="font-medium text-parchment-text">{city.name}</span>
                  <span className="text-xs text-parchment-muted">{city.country}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {selected && (
          <p className="mt-2 text-sm text-parchment-muted">
            Wybrano:{' '}
            <span className="text-christmas-green font-medium">{selected.name}</span>
            {selected.country !== 'Polska' ? ` (${selected.country})` : ''}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-parchment-muted mb-2">
          Godzina przyjazdu (24 grudnia)
        </label>
        <input
          type="time"
          value={timeValue}
          disabled={disabled}
          onChange={(e) => {
            const [h, m] = e.target.value.split(':').map(Number);
            onArrivalChange(h || 0, m || 0);
          }}
          className="input-field"
        />
        <p className="mt-2 text-sm text-parchment-muted">Domyślnie 18:00 — Wigilia u Ciebie</p>
      </div>
    </div>
  );
}

function normalizeMismatch(query: string, selected: SantaCity | null): boolean {
  if (!selected) return true;
  return query.trim().toLowerCase() !== selected.name.toLowerCase();
}
