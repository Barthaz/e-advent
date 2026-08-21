import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CalendarGrid from '../components/CalendarGrid';
import Modal from '../components/Modal';
import FestivePage from '../components/FestivePage';
import ContentCard from '../components/ContentCard';
import LoadingState from '../components/LoadingState';
import { buildCalendarTasks } from '../utils/calendarGenerator';
import { textToCatalogTaskId } from '../utils/catalogTaskIds';
import examplesData from '../data/examples.json';
// Import wszystkich ikon adwentowych do preloadowania
import icon1 from '../assets/advent/1.png';
import icon2 from '../assets/advent/2.png';
import icon3 from '../assets/advent/3.png';
import icon4 from '../assets/advent/4.png';
import icon5 from '../assets/advent/5.png';
import icon6 from '../assets/advent/6.png';
import icon7 from '../assets/advent/7.png';
import icon8 from '../assets/advent/8.png';
import icon9 from '../assets/advent/9.png';
import icon10 from '../assets/advent/10.png';
import icon11 from '../assets/advent/11.png';
import icon12 from '../assets/advent/12.png';
import icon13 from '../assets/advent/13.png';
import icon14 from '../assets/advent/14.png';
import icon15 from '../assets/advent/15.png';
import icon16 from '../assets/advent/16.png';
import icon17 from '../assets/advent/17.png';
import icon18 from '../assets/advent/18.png';
import icon19 from '../assets/advent/19.png';
import icon20 from '../assets/advent/20.png';
import icon21 from '../assets/advent/21.png';
import icon22 from '../assets/advent/22.png';
import icon23 from '../assets/advent/23.png';
import icon24 from '../assets/advent/24.png';

// Mapa ikon dla preloadowania
const adventIcons: string[] = [
  icon1, icon2, icon3, icon4, icon5, icon6,
  icon7, icon8, icon9, icon10, icon11, icon12,
  icon13, icon14, icon15, icon16, icon17, icon18,
  icon19, icon20, icon21, icon22, icon23, icon24,
];

interface CalendarTask {
  task: string;
  duration?: number;
  lockedDay?: number;
  latestDay?: number;
}

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
  tasks: CalendarTask[];
  dates: string[];
  selectedExampleSets?: number[];
}

// Funkcja pomocnicza do generowania kalendarza (fallback)
function generateCalendarFallback(
  data: CalendarData,
  dates: string[],
  openedDaysSet: Set<number>
): CalendarDay[] {
  const examples = examplesData as Array<{ title: string; description: string; tasks: string[] }>;
  const generated = buildCalendarTasks(
    data.tasks || [],
    examples,
    data.selectedExampleSets || [],
    textToCatalogTaskId
  );

  return generated.map(({ day, task, latestDay }) => ({
    day,
    task,
    isOpened: openedDaysSet.has(day),
    date: dates[day - 1],
    ...(latestDay !== undefined ? { latestDay } : {}),
  }));
}

const PREVIEW_STORAGE_KEY = 'calendarPreview_openedDays';

export default function Preview() {
  const navigate = useNavigate();
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [openedDay, setOpenedDay] = useState<number | null>(null);
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Preview zawsze ma włączony tryb debug
  const debugMode = true;
  const [imagesLoaded, setImagesLoaded] = useState(false);

  // Preloaduj wszystkie grafiki przed renderowaniem
  useEffect(() => {
    const preloadImages = () => {
      const imagePromises = adventIcons.map((iconSrc) => {
        return new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve(); // Kontynuuj nawet jeśli obraz się nie załaduje
          img.src = iconSrc;
        });
      });

      Promise.all(imagePromises).then(() => {
        setImagesLoaded(true);
      });
    };

    preloadImages();
  }, []);

  useEffect(() => {
    // Nie ładuj danych dopóki grafiki nie są załadowane
    if (!imagesLoaded) return;

    const loadPreview = async () => {
      const previewData = localStorage.getItem('calendarPreview');
      if (!previewData) {
        navigate('/stworz-kalendarz');
        return;
      }

      setIsLoading(true);
      const data: CalendarData = JSON.parse(previewData);
      
      // Walidacja: sprawdź czy są wymagane dane (24 własne zadania LUB wybrana kategoria)
      const hasEnoughTasks = (data.tasks && data.tasks.length >= 24);
      const hasSelectedCategories = (data.selectedExampleSets && data.selectedExampleSets.length > 0);
      
      if (!hasEnoughTasks && !hasSelectedCategories) {
        // Przekieruj z powrotem do tworzenia kalendarza
        navigate('/stworz-kalendarz');
        return;
      }
      
      setCalendarData(data);

      // Zawsze czyść stan otwartych okienek przy każdym wejściu w podgląd
      // (nie wczytuj zapisanych otwartych okienek - wszystkie powinny być zamknięte)
      localStorage.removeItem(PREVIEW_STORAGE_KEY);
      sessionStorage.removeItem(PREVIEW_STORAGE_KEY);
      
      // Wszystkie okienka powinny być zamknięte przy każdym wejściu
      const openedDaysSet = new Set<number>();

      // Wczytaj wygenerowany kalendarz z localStorage (zapisany w Creator.tsx)
      const GENERATED_CALENDAR_KEY = 'e-advent-generated-calendar';
      const savedGeneratedCalendar = localStorage.getItem(GENERATED_CALENDAR_KEY);
      
      // Generuj daty dla grudnia
      const currentYear = new Date().getFullYear();
      const dates: string[] = [];
      for (let i = 1; i <= 24; i++) {
        dates.push(new Date(currentYear, 11, i).toISOString());
      }

      let allDays: CalendarDay[] = [];
      
      if (savedGeneratedCalendar) {
        // Użyj zapisanego wygenerowanego kalendarza
        try {
          const generatedCalendar: Array<{ day: number; task: string; duration?: number; latestDay?: number }> = JSON.parse(savedGeneratedCalendar);
          
          // Mapuj wygenerowany kalendarz na CalendarDay[]
          // Zapisz również latestDay w stanie, aby móc go użyć w getDayTask
          allDays = generatedCalendar.map(({ day, task, latestDay }) => ({
            day,
            task,
            isOpened: openedDaysSet.has(day),
            date: dates[day - 1],
            latestDay: latestDay, // Zapisz latestDay dla każdego dnia
          }));
        } catch (error) {
          console.error('Błąd podczas wczytywania wygenerowanego kalendarza:', error);
          // Fallback: wygeneruj kalendarz na nowo
          allDays = generateCalendarFallback(data, dates, openedDaysSet);
        }
      } else {
        // Fallback: wygeneruj kalendarz na nowo (jeśli nie ma zapisanego)
        allDays = generateCalendarFallback(data, dates, openedDaysSet);
      }

      setDays(allDays);
      setIsLoading(false);
    };

    loadPreview();
  }, [navigate, imagesLoaded]);

  // Zapisz stan otwartych okienek do localStorage (tylko podczas sesji, nie przy każdym wejściu)
  // Używamy sessionStorage zamiast localStorage, aby stan był czyszczony przy odświeżeniu
  useEffect(() => {
    if (days.length === 0) return;
    
    const openedDays = days.filter(d => d.isOpened).map(d => d.day);
    // Używamy sessionStorage zamiast localStorage, aby przy odświeżeniu stan był czyszczony
    sessionStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(openedDays));
  }, [days]);

  const handleDayClick = (day: number) => {
    const dayData = days.find(d => d.day === day);
    if (!dayData) return;

    // Jeśli już otwarte, zawsze pokaż modal (ponowne otwarcie)
    if (dayData.isOpened) {
      setOpenedDay(day);
      return;
    }

    // W trybie debug wszystkie okienka są dostępne do otwarcia (bez sprawdzania kolejności)
    // W normalnym trybie sprawdzamy datę, ale w preview zawsze mamy debugMode=true

    // Oznacz dzień jako otwarty w UI (tylko lokalnie, bez wysyłania do API)
    // W preview nie wysyłamy żadnych requestów do API
    const updated = days.map(d =>
      d.day === day ? { ...d, isOpened: true } : d
    );
    setDays(updated);

    // Pokaż modal z zadaniem
    setOpenedDay(day);
  };

  const getDayTask = (day: number) => {
    const dayData = days.find(d => d.day === day);
    if (!dayData) return { task: 'Brak zadania dla tego dnia!', duration: undefined, daysToComplete: undefined };
    
    const taskText = dayData.task || 'Brak zadania dla tego dnia!';
    
    // Użyj duration jako liczby dni na wykonanie zadania
    // Sprawdź w wygenerowanym kalendarzu z localStorage
    let daysToComplete: number | undefined = undefined;
    const GENERATED_CALENDAR_KEY = 'e-advent-generated-calendar';
    const savedGeneratedCalendar = localStorage.getItem(GENERATED_CALENDAR_KEY);
    
    if (savedGeneratedCalendar) {
      try {
        const generatedCalendar: Array<{ day: number; task: string; duration?: number; latestDay?: number }> = JSON.parse(savedGeneratedCalendar);
        const generatedTask = generatedCalendar.find(t => t.day === day);
        if (generatedTask && generatedTask.duration !== undefined && generatedTask.duration !== null && generatedTask.duration > 0) {
          daysToComplete = generatedTask.duration;
        }
      } catch (error) {
        console.error('[Preview] Błąd podczas wczytywania wygenerowanego kalendarza w getDayTask:', error);
      }
    }
    
    return {
      task: taskText,
      duration: daysToComplete,
      daysToComplete: daysToComplete,
    };
  };

  if (!imagesLoaded || isLoading) {
    return (
      <LoadingState
        message={!imagesLoaded ? 'Ładowanie grafik...' : 'Ładowanie podglądu...'}
        variant="light"
      />
    );
  }

  if (!calendarData) {
    return (
      <div className="min-h-screen flex items-center justify-center section-cream">
        <div className="text-center">
          <p className="text-2xl text-parchment-muted mb-4">Nie można załadować podglądu</p>
          <button onClick={() => navigate('/stworz-kalendarz')} className="link-green">
            Wróć do tworzenia kalendarza
          </button>
        </div>
      </div>
    );
  }

  return (
    <FestivePage maxWidth="xl">
      <ContentCard variant="gold" padding="md">
          <div className="notice-preview">
            <p>
              <i className="fas fa-eye mr-2" />
              <strong>Tryb podglądu</strong> — Okienka można otwierać w dowolnej kolejności
            </p>
          </div>

          <CalendarGrid
            days={days}
            onDayClick={handleDayClick}
            currentDate={new Date()}
            debugMode={debugMode}
            previewMode={true}
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
                  <p className="text-2xl md:text-4xl mb-4 text-christmas-gold-light drop-shadow-lg px-4 font-task">
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

