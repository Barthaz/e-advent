import { createContext, useContext, useState, type ReactNode } from 'react';

interface CalendarTask {
  day: number;
  task: string;
  duration?: number;
}

interface CalendarData {
  name: string;
  email: string;
  calendarTitle: string;
  tasks: CalendarTask[];
  dailyEmailReminders: boolean;
}

interface CalendarContextType {
  calendarData: CalendarData | null;
  setCalendarData: (data: CalendarData | null) => void;
  clearCalendarData: () => void;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

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

export function useCalendar() {
  const context = useContext(CalendarContext);
  if (context === undefined) {
    throw new Error('useCalendar must be used within a CalendarProvider');
  }
  return context;
}

