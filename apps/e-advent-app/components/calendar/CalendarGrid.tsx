import React, { useCallback, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import CalendarWindow from './CalendarWindow';
import { calendarTheme } from './calendarTheme';

export interface CalendarGridDay {
  day: number;
  isOpened: boolean;
  date: string;
}

interface CalendarGridProps {
  days: CalendarGridDay[];
  openingDay: number | null;
  canOpenDay: (day: number, date: string) => boolean;
  disabled?: boolean;
  onWindowPress: (
    day: number,
    windowRect: { x: number; y: number; width: number; height: number }
  ) => void;
}

export default function CalendarGrid({
  days,
  openingDay,
  canOpenDay,
  disabled = false,
  onWindowPress,
}: CalendarGridProps) {
  const windowRefs = useRef<Record<number, View | null>>({});

  const measureAndPress = useCallback(
    (day: number) => {
      const windowNode = windowRefs.current[day];
      if (!windowNode) {
        onWindowPress(day, { x: 0, y: 0, width: 0, height: 0 });
        return;
      }

      windowNode.measureInWindow((wx, wy, ww, wh) => {
        onWindowPress(day, { x: wx, y: wy, width: ww, height: wh });
      });
    },
    [onWindowPress]
  );

  const orderedDays = [...days].sort((a, b) => a.day - b.day);

  return (
    <View collapsable={false} style={styles.gridFrame}>
      <View style={styles.grid}>
        {orderedDays.map(({ day, isOpened, date }) => {
          const canOpen = canOpenDay(day, date);
          return (
            <View key={`${day}-${isOpened ? 'o' : 'c'}`} style={styles.cell}>
              <CalendarWindow
                ref={(node) => {
                  windowRefs.current[day] = node;
                }}
                day={day}
                isOpened={isOpened}
                canOpen={canOpen}
                isOpening={openingDay === day}
                disabled={disabled}
                onPress={() => measureAndPress(day)}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  gridFrame: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(211,171,104,0.28)',
    backgroundColor: calendarTheme.bgDeep2,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  cell: {
    width: '23.5%',
  },
});
