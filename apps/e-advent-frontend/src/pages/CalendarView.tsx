import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import CalendarGrid from '../components/CalendarGrid';
import Modal from '../components/Modal';
import FestivePage from '../components/FestivePage';
import ContentCard from '../components/ContentCard';
import CalendarStatusBanner from '../components/CalendarStatusBanner';
import LoadingState from '../components/LoadingState';
import StatusMessagePage from '../components/StatusMessagePage';
import { getCalendar, openCalendarDay, type GetCalendarResponse } from '../api/api';

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
  const [searchParams] = useSearchParams();
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [openedDay, setOpenedDay] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderStatus, setOrderStatus] = useState<string | null>(null);
  
  // Sprawdź czy tryb debug jest włączony
  const debugMode = searchParams.get('debugmode') === 'true';
  const accessCodeFromUrl = searchParams.get('code');

  useEffect(() => {
    if (calendarId && accessCodeFromUrl) {
      try {
        sessionStorage.setItem(`e-advent-access-code-${calendarId}`, accessCodeFromUrl);
      } catch {
        /* ignore */
      }
    }
  }, [calendarId, accessCodeFromUrl]);

  useEffect(() => {
    const loadCalendar = async () => {
      if (!calendarId) {
        setError('Brak ID kalendarza');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        console.log('[CalendarView] Pobieranie kalendarza z API, calendarId:', calendarId);
        
        // Pobierz dane kalendarza z API
        const response: GetCalendarResponse = await getCalendar(calendarId);
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
        setIsLoading(false);
      } catch (error) {
        console.error('[CalendarView] Błąd podczas pobierania kalendarza:', error);
        setError('Nie można załadować kalendarza. Sprawdź czy link jest poprawny.');
        setIsLoading(false);
      }
    };

    loadCalendar();
  }, [calendarId]);

  const handleDayClick = async (day: number) => {
    const dayData = days.find(d => d.day === day);
    if (!dayData) return;

    // Jeśli już otwarte, zawsze pokaż modal (ponowne otwarcie)
    if (dayData.isOpened) {
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
        await openCalendarDay(calendarId, day);
        console.log('[CalendarView] Okienko otwarte w API pomyślnie');
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

  if (isLoading) {
    return <LoadingState message="Ładowanie kalendarza..." variant="light" />;
  }

  if (error || !calendarData) {
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
        <Modal
          isOpen={openedDay !== null}
          onClose={() => setOpenedDay(null)}
          title={`Dzień ${openedDay}!`}
        >
          <div className="text-center">
            {(() => {
              const taskInfo = getDayTask(openedDay || 0);
              const taskText = typeof taskInfo === 'string' ? taskInfo : taskInfo.task;
              const duration = typeof taskInfo === 'object' ? taskInfo.duration : undefined;
              
              return (
                <>
                  <p className="text-4xl md:text-5xl mb-4 text-christmas-gold-light font-bold drop-shadow-lg px-4 font-task">
                    {taskText}
                  </p>
                  {duration && duration > 0 && (
                    <p className="text-xl text-christmas-gold-light font-medium drop-shadow-md font-calligraphy">
                      <i className="fas fa-clock text-christmas-gold-light mr-2" />
                      Czas realizacji: {duration} {duration === 1 ? 'dzień' : 'dni'}
                    </p>
                  )}
                  
                </>
              );
            })()}
          </div>
        </Modal>
      </ContentCard>
    </FestivePage>
  );
}

