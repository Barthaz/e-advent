import { useEffect, useState } from 'react';
import { formatCountdown } from '../utils/countdown';

function readCountdown() {
  const now = new Date();
  return {
    ...formatCountdown(),
    isChristmas: now.getMonth() === 11 && (now.getDate() === 25 || now.getDate() === 26),
  };
}

export default function ChristmasCountdown() {
  const [countdown, setCountdown] = useState(readCountdown);

  useEffect(() => {
    const timer = window.setInterval(() => setCountdown(readCountdown()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="story-countdown" role="timer" aria-label="Odliczanie do Bożego Narodzenia">
      <p>{countdown.isChristmas ? 'Wesołych Świąt! Cieszcie się wspólnymi chwilami.' : 'Do Bożego Narodzenia pozostało'}</p>
      {!countdown.isChristmas && (
        <dl>
          {[
            { value: countdown.days, label: 'dni' },
            { value: countdown.hours, label: 'godzin' },
            { value: countdown.minutes, label: 'minut' },
          ].map(({ value, label }) => (
            <div key={label}><dt>{label}</dt><dd>{String(value).padStart(2, '0')}</dd></div>
          ))}
        </dl>
      )}
    </div>
  );
}
