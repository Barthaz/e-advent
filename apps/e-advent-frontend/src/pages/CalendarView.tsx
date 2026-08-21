import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import CalendarGrid from '../components/CalendarGrid';
import FestivePage from '../components/FestivePage';
import ContentCard from '../components/ContentCard';
import CalendarStatusBanner from '../components/CalendarStatusBanner';
import LoadingState from '../components/LoadingState';
import StatusMessagePage from '../components/StatusMessagePage';
import { getCalendar, openCalendarDay, type GetCalendarResponse } from '../api/api';
import type { OpenedCalendarWindow } from '@e-advent/types';
import OpenedDayModal from '../components/OpenedDayModal';
import SpecialWindowShell from '../special-windows/SpecialWindowShell';
import { isDayUnlockedByDate, parseOkienkoParam } from '../special-windows/okienkoParam';

interface CalendarDay {
  day: number;
  task: string;
  isOpened: boolean;
  date: string;
  latestDay?: number; // Najpóźniejszy dzień na wykonanie zadania
}

interface CalendarData {
  name: string;
  calendarTitle: string;
  tasks: Array<{ day: number; task: string; duration?: number; latestDay?: number }>;
  dates: string[];
}

export default function CalendarView() {
  const { calendarId } = useParams<{ calendarId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [openedDay, setOpenedDay] = useState<number | null>(null);
  const [openedWindows, setOpenedWindows] = useState<Record<number, OpenedCalendarWindow>>({});
  const [emailSpecialWindow, setEmailSpecialWindow] = useState<OpenedCalendarWindow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderStatus, setOrderStatus] = useState<string | null>(null);
  const [readyTick, setReadyTick] = useState(0);
  const hasLoadedRef = useRef(false);
  const consumedOkienkoRef = useRef<string | null>(null);
  const openedWindowsRef = useRef(openedWindows);
  openedWindowsRef.current = openedWindows;
  
  // Sprawdź czy tryb debug jest włączony
  const debugMode = searchParams.get('debugmode') === 'true';

  useEffect(() => {
    let cancelled = false;
    consumedOkienkoRef.current = null;
    setEmailSpecialWindow(null);
    setReadyTick(0);

    const loadCalendar = async () => {
      if (!calendarId) {
        setError('Brak ID kalendarza');
        setIsLoading(false);
        return;
      }

      if (!hasLoadedRef.current) {
        try {
          const cached = sessionStorage.getItem(`e-advent-cal-view:${calendarId}`);
          if (cached) {
            const parsed = JSON.parse(cached) as {
              calendarData: CalendarData;
              days: CalendarDay[];
              openedWindows: Record<number, OpenedCalendarWindow>;
              orderStatus: string | null;
            };
            setCalendarData(parsed.calendarData);
            setDays(parsed.days);
            setOpenedWindows(parsed.openedWindows || {});
            setOrderStatus(parsed.orderStatus);
            hasLoadedRef.current = true;
            setIsLoading(false);
          }
        } catch {
          /* ignore broken cache */
        }
      }

      if (!hasLoadedRef.current) {
        setIsLoading(true);
      }
      setError(null);

      try {
        console.log('[CalendarView] Pobieranie kalendarza z API, calendarId:', calendarId);

        const response: GetCalendarResponse = await getCalendar(calendarId);
        if (cancelled) return;
        const apiCalendar = response.calendar;

        console.log('[CalendarView] Kalendarz pobrany z API:', {
          id: apiCalendar.id,
          title: apiCalendar.title,
          author: apiCalendar.author,
          tasksCount: apiCalendar.tasks.length,
          orderStatus: apiCalendar.status,
        });

        // Sprawdź status zamówienia
        if (apiCalendar.status) {
          setOrderStatus(apiCalendar.status);
        }

        // Mapuj dane z API na wewnętrzną strukturę
        const mappedData: CalendarData = {
          name: apiCalendar.author,
          calendarTitle: apiCalendar.title,
          tasks: apiCalendar.tasks.map(task => ({
            day: task.day,
            task: task.title,
            ...(task.duration !== undefined ? { duration: task.duration } : {}),
            ...(task.latestDay !== undefined ? { latestDay: task.latestDay } : {}),
          })),
          dates: [], // Wygenerujemy daty poniżej
        };

        setCalendarData(mappedData);

        // Generuj daty dla grudnia (1-24 grudnia)
        const currentYear = new Date().getFullYear();
        const dates: string[] = [];
        for (let i = 1; i <= 24; i++) {
          dates.push(new Date(currentYear, 11, i).toISOString());
        }

        // Utwórz tablicę dni z danymi z API
        const calendarDays: CalendarDay[] = [];
        for (let i = 1; i <= 24; i++) {
          const apiTask = apiCalendar.tasks.find(t => t.day === i);
          // Sprawdź status z API - jeśli task ma status "opened", traktuj jako otwarte
          const isOpened = apiTask?.status === 'opened';

          calendarDays.push({
            day: i,
            task: apiTask?.title || '',
            isOpened,
            date: dates[i - 1],
            ...(apiTask?.latestDay !== undefined ? { latestDay: apiTask.latestDay } : {}),
          });
        }

        setDays(calendarDays);

        const hydrated: Record<number, OpenedCalendarWindow> = {};
        for (const apiTask of apiCalendar.tasks) {
          if (apiTask.status === 'opened' && apiTask.isSpecial && apiTask.special) {
            hydrated[apiTask.day] = {
              taskId: apiTask.catalogTaskId || '',
              day: apiTask.day,
              state: 'OPENED',
              title: apiTask.title,
              text: apiTask.title,
              isSpecial: true,
              special: apiTask.special,
            };
          }
        }
        setOpenedWindows(hydrated);
        hasLoadedRef.current = true;
        setIsLoading(false);
        try {
          sessionStorage.setItem(
            `e-advent-cal-view:${calendarId}`,
            JSON.stringify({
              calendarData: mappedData,
              days: calendarDays,
              openedWindows: hydrated,
              orderStatus: apiCalendar.status || null,
            })
          );
        } catch {
          /* quota */
        }
      } catch (error) {
        if (cancelled) return;
        console.error('[CalendarView] Błąd podczas pobierania kalendarza:', error);
        if (!hasLoadedRef.current) {
          setError('Nie można załadować kalendarza. Sprawdź czy link jest poprawny.');
        }
        setIsLoading(false);
      } finally {
        if (!cancelled) setReadyTick((n) => n + 1);
      }
    };

    loadCalendar();
    return () => {
      cancelled = true;
    };
  }, [calendarId]);

  useEffect(() => {
    if (!calendarId || !calendarData || days.length === 0 || readyTick === 0) return;

    const raw = searchParams.get('okienko');
    const token = `${calendarId}:${raw ?? ''}`;
    if (consumedOkienkoRef.current === token) return;

    const stripOkienko = () => {
      if (!searchParams.has('okienko')) return;
      const next = new URLSearchParams(searchParams);
      next.delete('okienko');
      setSearchParams(next, { replace: true });
    };

    const requested = parseOkienkoParam(raw);
    if (requested == null) {
      consumedOkienkoRef.current = token;
      if (raw != null) stripOkienko();
      return;
    }

    const dayData = days.find((d) => d.day === requested);
    if (!dayData || !isDayUnlockedByDate(dayData)) {
      consumedOkienkoRef.current = token;
      stripOkienko();
      return;
    }

    consumedOkienkoRef.current = token;
    stripOkienko();

    const existing = openedWindowsRef.current[requested];
    if (existing?.isSpecial && existing.special) {
      setEmailSpecialWindow(existing);
      return;
    }

    if (dayData.isOpened && !existing?.isSpecial) {
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await openCalendarDay(calendarId, requested);
        if (cancelled) return;
        if (res.openedWindow?.isSpecial && res.openedWindow.special) {
          setOpenedWindows((prev) => ({ ...prev, [requested]: res.openedWindow! }));
          setDays((prev) =>
            prev.map((d) => (d.day === requested ? { ...d, isOpened: true } : d))
          );
          setEmailSpecialWindow(res.openedWindow);
        }
      } catch {
        /* stay on the calendar grid */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [calendarId, calendarData, days, readyTick, searchParams, setSearchParams]);

  const loadOpenedWindow = async (day: number) => {
    if (!calendarId) return;
    if (openedWindows[day]) return;
    try {
      const res = await openCalendarDay(calendarId, day);
      if (res.openedWindow) {
        setOpenedWindows((prev) => ({ ...prev, [day]: res.openedWindow! }));
      }
    } catch {
      /* ignore */
    }
  };

  const handleDayClick = async (day: number) => {
    const dayData = days.find(d => d.day === day);
    if (!dayData) return;

    if (dayData.isOpened) {
      await loadOpenedWindow(day);
      setOpenedDay(day);
      return;
    }

    // W trybie debug: sprawdź czy wszystkie poprzednie dni są otwarte
    if (debugMode) {
      // Sprawdź czy wszystkie dni od 1 do (day-1) są otwarte
      const allPreviousOpened = days
        .filter(d => d.day < day)
        .every(d => d.isOpened);
      
      if (!allPreviousOpened) {
        // Znajdź pierwszy nieotwarty dzień przed tym dniem
        const firstUnopened = days.find(d => d.day < day && !d.isOpened);
        if (firstUnopened) {
          console.log(`[Debug] Musisz najpierw otworzyć dzień ${firstUnopened.day}`);
          return;
        }
      }
    }

    // Oznacz dzień jako otwarty w UI (optymistyczna aktualizacja)
    const previousDays = days; // Zapisz poprzednią wartość
    const updated = days.map(d =>
      d.day === day ? { ...d, isOpened: true } : d
    );
    setDays(updated);

    // Wyślij informację do API o otwarciu okienka
    if (calendarId) {
      try {
        console.log('[CalendarView] Otwieranie okienka w API:', { calendarId, day });
        const res = await openCalendarDay(calendarId, day);
        console.log('[CalendarView] Okienko otwarte w API pomyślnie');
        if (res.openedWindow) {
          setOpenedWindows((prev) => ({ ...prev, [day]: res.openedWindow! }));
        }
      } catch (error) {
        console.error('[CalendarView] Błąd podczas otwierania okienka w API:', error);
        // Cofnij zmianę w UI jeśli API zwróciło błąd
        setDays(previousDays);
        // Można dodać powiadomienie o błędzie dla użytkownika
      }
    }

    // Pokaż modal z zadaniem
    setOpenedDay(day);
  };

  const getDayTask = (day: number) => {
    const dayData = days.find(d => d.day === day);
    if (!dayData) return { task: 'Brak zadania dla tego dnia!', duration: undefined, daysToComplete: undefined };
    
    const taskData = calendarData?.tasks.find(t => t.day === day);
    const taskText = dayData.task || 'Brak zadania dla tego dnia!';
    const duration = taskData?.duration;
    
    // Użyj duration jako liczby dni na wykonanie zadania
    const daysToComplete = (duration && duration > 0) ? duration : undefined;
    
    return {
      task: taskText,
      duration: duration,
      daysToComplete: daysToComplete,
    };
  };

  // Sprawdź czy są dostępne okienka do otwarcia
  const getNextAvailableDay = () => {
    const today = new Date();
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
    const today = new Date();
    const dayDate = new Date(d.date);
    // Użyj lokalnej daty bez czasu dla porównania
    const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dayLocal = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
    // Okienko można otworzyć tylko jeśli data okienka jest dzisiaj lub wcześniej
    return dayLocal <= todayLocal;
  });

  const hasOpenedWindows = days.some(d => d.isOpened);
  const nextAvailableDate = getNextAvailableDay();
  const isBeforeDecember = nextAvailableDate && nextAvailableDate.getMonth() !== 11; // 11 = grudzień (0-indexed)

  if (isLoading && !calendarData) {
    return <LoadingState message="Ładowanie kalendarza..." variant="light" />;
  }

  if (!calendarData) {
    return (
      <StatusMessagePage
        icon="fas fa-exclamation-circle"
        iconClassName="text-christmas-red"
        title="Kalendarz niedostępny"
        description={error || 'Kalendarz nie został znaleziony'}
      />
    );
  }

  if (orderStatus === 'pending') {
    return (
      <StatusMessagePage
        icon="fas fa-clock"
        title="Oczekiwanie na płatność"
        description={
          <>
            <p className="mb-4">
              Twoje zamówienie jest w trakcie przetwarzania. Kalendarz adwentowy będzie dostępny po
              potwierdzeniu płatności.
            </p>
            <p className="text-base">
              Jeśli już dokonałeś płatności, odśwież stronę za chwilę.
            </p>
          </>
        }
      />
    );
  }

  if (orderStatus && orderStatus !== 'succeeded' && orderStatus !== 'pending') {
    return (
      <StatusMessagePage
        icon="fas fa-exclamation-triangle"
        iconClassName="text-christmas-red"
        title="Kalendarz niedostępny"
        description="Ten kalendarz nie jest dostępny. Sprawdź czy link jest poprawny lub skontaktuj się z nami."
      />
    );
  }

  return (
    <FestivePage maxWidth="xl">
      <ContentCard variant="gold" padding="md">
          {/* Tytuł kalendarza */}
          {calendarData.calendarTitle && (
            <div className="text-center mb-6">
              <h1 className="heading-page mb-2">
                {calendarData.calendarTitle}
              </h1>
            </div>
          )}
          
          {!hasOpenableWindows && nextAvailableDate && (
            <CalendarStatusBanner
              isBeforeDecember={!!isBeforeDecember}
              hasOpenedWindows={hasOpenedWindows}
              nextAvailableDate={nextAvailableDate}
            />
          )}

          <CalendarGrid
            days={days}
            onDayClick={handleDayClick}
            currentDate={new Date()}
            debugMode={debugMode}
          />
        <OpenedDayModal
          isOpen={openedDay !== null}
          onClose={() => setOpenedDay(null)}
          day={openedDay || 0}
          taskText={(() => {
            const taskInfo = getDayTask(openedDay || 0);
            return typeof taskInfo === 'string' ? taskInfo : taskInfo.task;
          })()}
          duration={(() => {
            const taskInfo = getDayTask(openedDay || 0);
            return typeof taskInfo === 'object' ? taskInfo.duration : undefined;
          })()}
          calendarId={calendarId || ''}
          openedWindow={openedDay ? openedWindows[openedDay] : undefined}
        />
        {emailSpecialWindow && calendarId && (
          <SpecialWindowShell
            calendarId={calendarId}
            openedWindow={emailSpecialWindow}
            autoOpenStage
            onClose={() => setEmailSpecialWindow(null)}
          />
        )}
      </ContentCard>
    </FestivePage>
  );
}

