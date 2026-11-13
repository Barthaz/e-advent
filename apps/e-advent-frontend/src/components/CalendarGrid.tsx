import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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

function doorCanSwing(button: HTMLButtonElement) {
  const panel = button.querySelector<HTMLElement>('.advent-door-panel');
  if (!panel || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
  button.classList.add('advent-door--opening');
  void panel.offsetWidth;
  const animationName = getComputedStyle(panel).animationName;
  button.classList.remove('advent-door--opening');
  return Boolean(animationName && animationName !== 'none');
}

function DoorFace({ day, footer }: { day: number; footer: ReactNode }) {
  return (
    <>
      <span className="advent-door-month" aria-hidden="true">grudzień</span>
      <i className={`fas ${ornaments[(day - 1) % ornaments.length]} advent-door-ornament`} aria-hidden="true" />
      <span className="advent-door-number" aria-hidden="true">{day}</span>
      <span className="advent-door-footer" aria-hidden="true">{footer}</span>
    </>
  );
}

export default function CalendarGrid({ days, onDayClick, currentDate = new Date(), debugMode = false, previewMode = false }: CalendarGridProps) {
  const today = currentDate;
  const opening = useRef<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const onDayClickRef = useRef(onDayClick);
  onDayClickRef.current = onDayClick;
  const [swinging, setSwinging] = useState<number | null>(null);

  useEffect(() => {
    if (swinging == null || !gridRef.current) return;
    const day = swinging;
    const button = gridRef.current.querySelector<HTMLButtonElement>(`[data-day="${day}"]`);
    const panel = button?.querySelector<HTMLElement>('.advent-door-panel');
    if (!panel) return;
    let settled = false;
    let attempts = 0;
    let fallback = 0;
    let frame = 0;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(fallback);
      opening.current = null;
      setSwinging(null);
      onDayClickRef.current(day);
    };
    const arm = () => {
      const animation = panel.getAnimations().find((item) => item instanceof CSSAnimation && item.animationName === 'door-swing');
      if (!animation) {
        if (attempts++ < 4) {
          frame = window.requestAnimationFrame(arm);
          return;
        }
        finish();
        return;
      }
      animation.finished.then(() => finish()).catch(() => {});
      const duration = animation.effect?.getComputedTiming().duration;
      fallback = window.setTimeout(finish, (typeof duration === 'number' ? duration : 500) + 40);
    };
    frame = window.requestAnimationFrame(arm);
    return () => {
      settled = true;
      window.cancelAnimationFrame(frame);
      window.clearTimeout(fallback);
    };
  }, [swinging]);
  
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
    <div ref={gridRef} className="advent-grid" role="group" aria-label="24 okienka kalendarza adwentowego">
      {shuffledDays.map(({ day, task, isOpened, date }) => {
        const available = canOpen(day, date);
        const dayDate = new Date(date);
        const isToday = today.toDateString() === dayDate.toDateString();
        const isSwinging = swinging === day;
        const state = isOpened ? 'opened' : available ? 'available' : 'locked';
        const closedFooter = isToday ? 'Na dziś' : available ? 'Otwórz' : <i className="fas fa-lock" />;
        const openedFooter = <><i className="fas fa-check" /> Odkryte</>;
        const showDoor = !isOpened || isSwinging;
        return <button key={day} type="button" data-day={day} disabled={!available && !isOpened}
          onClick={(event) => {
            if (isOpened) { onDayClick(day); return; }
            if (opening.current != null) return;
            if (!doorCanSwing(event.currentTarget)) { onDayClick(day); return; }
            opening.current = day;
            setSwinging(day);
          }}
          className={`advent-door advent-door--${state}${isToday ? ' advent-door--today' : ''}${isSwinging ? ' advent-door--opening' : ''}`}
          aria-label={`${day} grudnia — ${isOpened ? 'otwarte, przeczytaj ponownie' : available ? 'otwórz okienko' : 'dostępne '+day+' grudnia'}`}>
          {showDoor ? (
            <>
              <span className="advent-door-inside"><DoorFace day={day} footer={openedFooter} /></span>
              <span className="advent-door-panel"><DoorFace day={day} footer={closedFooter} /></span>
            </>
          ) : <DoorFace day={day} footer={openedFooter} />}
          {isOpened && task && <span className="advent-door-task" aria-hidden="true">{task}</span>}
        </button>;
      })}
    </div>
  );
}
