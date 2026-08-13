import { useState, useEffect } from 'react';
import CalendarGrid from './CalendarGrid';
import Modal from './Modal';
import CalendarStatusBanner from './CalendarStatusBanner';
import Logo from './Logo';

interface DemoDay {
  day: number;
  task: string;
  isOpened: boolean;
  date: string;
}

const demoTasks = [
  { day: 1, task: 'Posłuchaj swojej ulubionej świątecznej piosenki' },
  { day: 2, task: 'Zapal świeczkę i ciesz się jej blaskiem' },
  { day: 3, task: 'Przeczytaj rozdział z ulubionej książki' },
  { day: 4, task: 'Zjedz coś, co naprawdę lubisz.' },
  { day: 5, task: 'Zrób sobie gorącą herbatę i odpocznij' },
  { day: 6, task: 'Zaobserwuj zachód słońca lub gwiazdy' },
  { day: 7, task: 'Zadzwoń do bliskiej osoby' },
  { day: 8, task: 'Obejrzyj ulubiony film świąteczny' },
  { day: 9, task: 'Medytuj przez 5 minut lub oddychaj głęboko' },
  { day: 10, task: 'Wypij ciepły napój przy oknie' },
  { day: 11, task: 'Posłuchaj audiobooka lub podcastu' },
  { day: 12, task: 'Zapisz 3 rzeczy, za które jesteś wdzięczny' },
  { day: 13, task: 'Poczytaj świąteczne opowiadanie' },
  { day: 14, task: 'Zrób sobie przerwę i idź na krótki spacer' },
  { day: 15, task: 'Zaobserwuj światło dzienne lub wieczorne' },
  { day: 16, task: 'Posłuchaj dźwięków natury lub świątecznej muzyki' },
  { day: 17, task: 'Zapisz ulubione wspomnienie z dzieciństwa' },
  { day: 18, task: 'Posłuchaj jednej piosenki w pełnym skupieniu.' },
  { day: 19, task: 'Obejrzyj krótki film na YouTube o świętach' },
  { day: 20, task: 'Przeczytaj poezję lub cytaty świąteczne' },
  { day: 21, task: 'Zadzwoń do przyjaciela i porozmawiaj' },
  { day: 22, task: 'Posłuchaj podcastu o magii świąt' },
  { day: 23, task: 'Zapisz życzenia na następny rok' },
  { day: 24, task: 'Ciesz się chwilą - święta są już tu!' },
];

interface DemoCalendarProps {
  debugMode?: boolean;
}

export default function DemoCalendar({ debugMode = false }: DemoCalendarProps) {
  const today = new Date();
  const currentYear = today.getFullYear();
  const CALENDAR_ID = 'public-demo-calendar'; // Wspólny ID dla wszystkich użytkowników
  
  // Generuj daty dla grudnia
  const generateDates = () => {
    const dates = [];
    for (let i = 1; i <= 24; i++) {
      dates.push(new Date(currentYear, 11, i).toISOString());
    }
    return dates;
  };

  const dates = generateDates();
  
  // Wczytaj zapisany stan kalendarza z localStorage
  const loadSavedDays = (): DemoDay[] => {
    const saved = localStorage.getItem(CALENDAR_ID);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Jeśli nie można odczytać, zwróć pustą tablicę
      }
    }
    return [];
  };

  // Utwórz dni - otwórz wszystkie do dzisiaj (lub wszystkie jeśli już grudzień minął)
  // W trybie DEBUG wszystkie dni są dostępne do otwarcia
  const createInitialDays = (): DemoDay[] => {
    return demoTasks.map((task, index) => {
      const dayDate = new Date(dates[index]);
      // Użyj lokalnej daty bez czasu dla porównania
      const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const dayLocal = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
      const isOpened = debugMode ? false : (dayLocal <= todayLocal); // W trybie DEBUG nic nie otwieraj automatycznie
      
      return {
        day: task.day,
        task: task.task,
        isOpened,
        date: dates[index],
      };
    });
  };

  // Połącz zapisany stan z nowymi danymi
  const getInitialDays = (): DemoDay[] => {
    const savedDays = loadSavedDays();
    const newDays = createInitialDays();
    
    // Jeśli mamy zapisany stan, użyj go, ale aktualizuj dla nowych dni
    if (savedDays.length === 24) {
      return newDays.map((newDay, index) => {
        const savedDay = savedDays[index];
        // Jeśli dzień może być otwarty i był zapisany jako otwarty, zachowaj stan
        const dayDate = new Date(newDay.date);
        const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const dayLocal = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
        if (dayLocal <= todayLocal && savedDay?.isOpened) {
          return { ...newDay, isOpened: true };
        }
        return newDay;
      });
    }
    
    return newDays;
  };

  const [days, setDays] = useState<DemoDay[]>(getInitialDays);
  const [openedDay, setOpenedDay] = useState<number | null>(null);

  // Zapisz stan do localStorage przy każdej zmianie
  useEffect(() => {
    localStorage.setItem(CALENDAR_ID, JSON.stringify(days));
  }, [days]);

  const handleDayClick = (day: number) => {
    const today = new Date();
    const dayData = days.find(d => d.day === day);
    if (!dayData) return;
    
    const dayDate = new Date(dayData.date);
    // Użyj lokalnej daty bez czasu dla porównania
    const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dayLocal = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
    
    // Jeśli już otwarte, zawsze pokaż modal (ponowne otwarcie)
    if (dayData.isOpened) {
      setOpenedDay(day);
      return;
    }
    
    // W trybie DEBUG można otworzyć wszystkie okienka
    // W normalnym trybie tylko jeśli dzień już minął lub jest dzisiaj
    if (debugMode || dayLocal <= todayLocal) {
      const updated = days.map(d =>
        d.day === day ? { ...d, isOpened: true } : d
      );
      setDays(updated);
      setOpenedDay(day);
    }
  };

  const getDayTask = (day: number) => {
    return days.find(d => d.day === day)?.task || 'Brak zadania dla tego dnia!';
  };

  // Sprawdź czy są dostępne okienka do otwarcia
  const getNextAvailableDay = () => {
    const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    for (const day of days) {
      if (!day.isOpened) {
        const dayDate = new Date(day.date);
        const dayLocal = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
        if (dayLocal > todayLocal) {
          return new Date(day.date);
        }
      }
    }
    return null;
  };

  const hasOpenableWindows = days.some(d => {
    if (d.isOpened) return false;
    const dayDate = new Date(d.date);
    const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dayLocal = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
    return dayLocal <= todayLocal || debugMode;
  });

  const hasOpenedWindows = days.some(d => d.isOpened);
  const nextAvailableDate = getNextAvailableDay();
  const isBeforeDecember = nextAvailableDate && nextAvailableDate.getMonth() !== 11; // 11 = grudzień (0-indexed)

  return (
    <div className="calendar-wrapper">
      <Logo className="mb-6" />

      {!hasOpenableWindows && !debugMode && nextAvailableDate && (
        <CalendarStatusBanner
          isBeforeDecember={!!isBeforeDecember}
          hasOpenedWindows={hasOpenedWindows}
          nextAvailableDate={nextAvailableDate}
        />
      )}

      <CalendarGrid
        days={days}
        onDayClick={handleDayClick}
        currentDate={today}
        debugMode={debugMode}
      />

      <Modal
        isOpen={openedDay !== null}
        onClose={() => setOpenedDay(null)}
        title={`Dzień ${openedDay}!`}
        usePortal={true}
      >
        <div className="text-center">
          <p className="text-4xl md:text-5xl mb-4 text-christmas-gold-light font-bold drop-shadow-lg px-4 font-task">
            {getDayTask(openedDay || 0)}
          </p>
        </div>
      </Modal>
    </div>
  );
}

