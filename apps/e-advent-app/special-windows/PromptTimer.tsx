import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { formatMmSs, remainingTimerSeconds } from '@e-advent/special-core';
import { calendarTheme } from '../components/calendar/calendarTheme';

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
    const id = setInterval(() => {
      setLeft(remainingTimerSeconds(startedAt, duration));
    }, 200);
    return () => clearInterval(id);
  }, [startedAt, duration]);

  if (!startedAt) return null;

  return (
    <View style={{ alignItems: 'center', marginVertical: 8 }}>
      <Text
        style={{
          color: left === 0 ? '#c41e3a' : calendarTheme.goldBright,
          fontSize: 48,
          fontVariant: ['tabular-nums'],
          fontWeight: '700',
        }}
      >
        {formatMmSs(left)}
      </Text>
      <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase' }}>
        {left === 0 ? doneLabel : runningLabel}
      </Text>
    </View>
  );
}
