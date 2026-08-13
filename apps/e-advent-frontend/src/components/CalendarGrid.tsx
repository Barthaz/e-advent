import { useMemo } from 'react';
// Import wszystkich ikon adwentowych
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

// Mapa ikon dla każdego dnia
const adventIcons: Record<number, string> = {
  1: icon1, 2: icon2, 3: icon3, 4: icon4, 5: icon5, 6: icon6,
  7: icon7, 8: icon8, 9: icon9, 10: icon10, 11: icon11, 12: icon12,
  13: icon13, 14: icon14, 15: icon15, 16: icon16, 17: icon17, 18: icon18,
  19: icon19, 20: icon20, 21: icon21, 22: icon22, 23: icon23, 24: icon24,
};

const getAdventIcon = (day: number): string | null => {
  return adventIcons[day] || null;
};

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

export default function CalendarGrid({ days, onDayClick, debugMode = false, previewMode = false }: CalendarGridProps) {
  const today = new Date();
  
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
  
  // W trybie debug/preview: sprawdź które pola są dostępne do otwarcia (dla podświetlenia)
  const isAvailableInDebug = (day: number) => {
    if (previewMode) {
      // W trybie preview wszystkie nieotwarte okienka są dostępne
      return !days.find(d => d.day === day)?.isOpened;
    }
    if (!debugMode) return false;
    if (days.find(d => d.day === day)?.isOpened) return false; // Już otwarte
    // W trybie debug sprawdzamy czy wszystkie poprzednie dni są otwarte
    const allPreviousOpened = days
      .filter(d => d.day < day)
      .every(d => d.isOpened);
    return allPreviousOpened;
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
    <div className="grid grid-cols-3 md:grid-cols-6 gap-4 p-6">
      {shuffledDays.map(({ day, task, isOpened, date }) => {
        const canOpenDay = canOpen(day, date);
        const dateObj = new Date(date);
        const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const dateLocal = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
        const isToday = dateLocal.getTime() === todayLocal.getTime();
        const iconSrc = getAdventIcon(day);
        const availableInDebug = isAvailableInDebug(day);
        
        return (
          <div
            key={day}
            onClick={() => (canOpenDay || isOpened) && onDayClick(day)}
            className={`
              aspect-square rounded-lg shadow-lg cursor-pointer transition-all transform hover:scale-105
              ${isOpened 
                ? 'calendar-cell-opened animate-opened-glow border-[3px] ring-2 ring-christmas-gold-light/50' 
                : canOpenDay 
                  ? 'bg-gray-200 hover:bg-gray-300' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
              }
              ${isToday && !isOpened ? 'ring-4 ring-christmas-gold-light/75' : ''}
              ${availableInDebug && !isOpened ? 'animate-debug-pulse' : ''}
              ${canOpenDay && !isOpened && !availableInDebug ? 'animate-available-pulse' : ''}
            `}
          >
            <div className="h-full w-full relative overflow-hidden rounded-lg">
              {iconSrc && (
                <img 
                  src={iconSrc} 
                  alt={`Kalendarz adwentowy - Dzień ${day} grudnia`}
                  className={`w-full h-full object-cover transition-opacity ${isOpened ? 'opacity-20' : 'opacity-30'}`}
                  width="200"
                  height="200"
                  loading={previewMode ? "eager" : "lazy"}
                  decoding="async"
                  fetchPriority={previewMode ? "high" : "auto"}
                />
              )}
              {!iconSrc && (
                <div className="h-full w-full flex items-center justify-center" role="img" aria-label={`Dzień ${day} - Brak ikony`}>
                  <div className={`text-3xl ${isOpened ? 'text-christmas-gold-light' : 'text-christmas-green'}`}>🎁</div>
                </div>
              )}
              
              {/* Wskaźnik otwartego okienka - złoty ptaszek w prawym dolnym rogu */}
              {isOpened && (
                <div className="absolute bottom-2 right-2 z-20">
                  <i className="fas fa-check-circle text-christmas-gold-light text-2xl md:text-3xl drop-shadow-lg animate-checkmark-pop"></i>
                </div>
              )}
              
              {isOpened && task && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 z-10">
                  <div className="text-xs text-center font-semibold text-white line-clamp-2">
                    {task}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

