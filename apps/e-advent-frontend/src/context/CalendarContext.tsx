import { useState, type ReactNode } from 'react';

import { CalendarContext, type CalendarData } from './useCalendar';

export function CalendarProvider({ children }: { children: ReactNode }) {
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);

  const clearCalendarData = () => {
    setCalendarData(null);
    localStorage.removeItem('calendarData');
  };

  return (
    <CalendarContext.Provider value={{ calendarData, setCalendarData, clearCalendarData }}>
      {children}
    </CalendarContext.Provider>
  );
}

