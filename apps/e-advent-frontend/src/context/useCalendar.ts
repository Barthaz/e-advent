import { createContext, useContext } from 'react';
export interface CalendarTask {
  day: number;
  task: string;
  duration?: number;
}

export interface CalendarData {
  name: string;
  email: string;
  calendarTitle: string;
  tasks: CalendarTask[];
  dailyEmailReminders: boolean;
}

export interface CalendarContextType {
  calendarData: CalendarData | null;
  setCalendarData: (data: CalendarData | null) => void;
  clearCalendarData: () => void;
}

export const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

export function useCalendar() {
  const context = useContext(CalendarContext);
  if (context === undefined) {
    throw new Error('useCalendar must be used within a CalendarProvider');
  }
  return context;
}

