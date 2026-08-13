import { SPEED_OPTIONS } from '../../hooks/useSantaDebug';

interface SantaDebugPanelProps {
  speed: number;
  onSpeedChange: (speed: number) => void;
}

export default function SantaDebugPanel({ speed, onSpeedChange }: SantaDebugPanelProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-bronze/20 bg-cream px-4 py-3">
      <div>
        <p className="text-christmas-gold text-xs tracking-[0.25em] uppercase mb-1">Debug mode</p>
        <p className="text-parchment-muted text-sm leading-relaxed">
          Symulacja 24 grudnia · tempo trasy (godzina przyjazdu bez zmian)
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {SPEED_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSpeedChange(opt.value)}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              speed === opt.value
                ? 'btn-gold !px-3 !py-1.5 !text-sm'
                : 'border border-bronze/30 text-parchment-muted hover:border-christmas-gold hover:text-christmas-green'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
