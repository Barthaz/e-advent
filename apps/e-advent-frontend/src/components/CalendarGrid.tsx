import { useMemo, useRef } from 'react';
import './calendar-experience.css';

const ornaments = ['fa-star', 'fa-snowflake', 'fa-tree', 'fa-gift', 'fa-bell', 'fa-heart'];

interface CalendarDay {
  day: number;
  task: string;
  isOpened: boolean;
  date: string;
}

interface CalendarGridProps {
  days: CalendarDay[];
  onDayClick: (day: number) => void;
  currentDate?: Date;
  debugMode?: boolean;
  previewMode?: boolean; // W trybie preview wszystkie okienka są dostępne (bez sprawdzania kolejności)
}

function swingDoor(button: HTMLButtonElement, done: () => void) {
  const finishNow = () => {
    button.classList.remove('advent-door--opening');
    done();
  };
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    done();
    return;
  }
  button.classList.add('advent-door--opening');
  void button.offsetWidth;
  const animations = button.getAnimations?.() ?? [];
  if (animations.length === 0) {
    finishNow();
    return;
  }
  let settled = false;
  const finish = () => {
    if (settled) return;
    settled = true;
    button.removeEventListener('animationend', onEnd);
    finishNow();
  };
  const onEnd = (event: AnimationEvent) => {
    if (event.animationName === 'door-swing') finish();
  };
  button.addEventListener('animationend', onEnd);
  window.setTimeout(finish, 700);
}

export default function CalendarGrid({ days, onDayClick, currentDate = new Date(), debugMode = false, previewMode = false }: CalendarGridProps) {
  const today = currentDate;
  const opening = useRef<number | null>(null);
  
  // Sprawdzamy czy możemy otworzyć okienko (musi być odpowiednia data)
  // W trybie preview wszystkie okienka są dostępne
  // W trybie debug sprawdzamy czy wszystkie poprzednie dni są otwarte (sekwencyjnie)
  const canOpen = (day: number, dateStr: string) => {
    if (previewMode) {
      // W trybie preview: wszystkie okienka są dostępne do otwarcia
      return true;
    }
    if (debugMode) {
      // W trybie debug: sprawdź czy wszystkie poprzednie dni są otwarte (sekwencyjnie)
      const allPreviousOpened = days
        .filter(d => d.day < day)
        .every(d => d.isOpened);
      return allPreviousOpened;
    }
    const dayDate = new Date(dateStr);
    // Użyj lokalnej daty bez czasu dla porównania
    const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dayLocal = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
    // Okienko można otworzyć tylko jeśli data okienka jest dzisiaj lub wcześniej
    return dayLocal <= todayLocal;
  };
  
  // Losowa kolejność pól - deterministyczna dla danego zestawu dni
  // Używamy seeda opartego na sumie dni, aby kolejność była stała
  const shuffledDays = useMemo(() => {
    // Utwórz seed z sumy dni
    const seed = days.reduce((sum, d) => sum + d.day, 0);
    
    // Prosty generator pseudolosowy oparty na seedzie
    let randomSeed = seed;
    const seededRandom = () => {
      randomSeed = (randomSeed * 9301 + 49297) % 233280;
      return randomSeed / 233280;
    };
    
    // Shuffle z użyciem seeded random
    const shuffled = [...days];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(seededRandom() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    return shuffled;
  }, [days]);

  return (
    <div className="advent-grid" role="group" aria-label="24 okienka kalendarza adwentowego">
      {shuffledDays.map(({ day, task, isOpened, date }) => {
        const available = canOpen(day, date);
        const dayDate = new Date(date);
        const isToday = today.toDateString() === dayDate.toDateString();
        const state = isOpened ? 'opened' : available ? 'available' : 'locked';
        const face = (
          <>
            <span className="advent-door-month" aria-hidden="true">grudzień</span>
            <i className={`fas ${ornaments[(day - 1) % ornaments.length]} advent-door-ornament`} aria-hidden="true" />
            <span className="advent-door-number" aria-hidden="true">{day}</span>
            <span className="advent-door-footer" aria-hidden="true">{isOpened ? <><i className="fas fa-check" /> Odkryte</> : isToday ? 'Na dziś' : available ? 'Otwórz' : <i className="fas fa-lock" />}</span>
          </>
        );
        return <button key={day} type="button" disabled={!available && !isOpened}
          onClick={(event) => {
            if (isOpened) { onDayClick(day); return; }
            if (opening.current != null) return;
            opening.current = day;
            swingDoor(event.currentTarget, () => {
              opening.current = null;
              onDayClick(day);
            });
          }}
          className={`advent-door advent-door--${state}${isToday ? ' advent-door--today' : ''}`}
          aria-label={`${day} grudnia — ${isOpened ? 'otwarte, przeczytaj ponownie' : available ? 'otwórz okienko' : 'dostępne '+day+' grudnia'}`}>
          {isOpened ? face : <span className="advent-door-panel">{face}</span>}
          {isOpened && task && <span className="advent-door-task" aria-hidden="true">{task}</span>}
        </button>;
      })}
    </div>
  );
}
