import { useEffect, useState } from 'react';
import { formatMmSs, remainingTimerSeconds } from '@e-advent/special-core';

export default function PromptTimer({
  startedAt,
  duration = 60,
  runningLabel = 'Czas na rundę',
  doneLabel = 'Czas minął',
}: {
  startedAt?: string;
  duration?: number;
  runningLabel?: string;
  doneLabel?: string;
}) {
  const [left, setLeft] = useState(() => remainingTimerSeconds(startedAt, duration));

  useEffect(() => {
    setLeft(remainingTimerSeconds(startedAt, duration));
    if (!startedAt) return;
    const id = window.setInterval(() => {
      setLeft(remainingTimerSeconds(startedAt, duration));
    }, 200);
    return () => window.clearInterval(id);
  }, [startedAt, duration]);

  if (!startedAt) return null;

  return (
    <div className="flex flex-col items-center gap-1">
      <p
        className={`font-display tabular-nums text-5xl md:text-6xl leading-none ${
          left === 0 ? 'text-christmas-red' : 'text-christmas-gold-light'
        }`}
      >
        {formatMmSs(left)}
      </p>
      <p className="text-xs uppercase tracking-[0.16em] text-white/55">
        {left === 0 ? doneLabel : runningLabel}
      </p>
    </div>
  );
}
