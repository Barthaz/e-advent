export function getDaysUntilChristmas(): number {
  const today = new Date();
  const currentYear = today.getFullYear();
  
  // Ustaw datę na 24 grudnia bieżącego roku
  const christmas = new Date(currentYear, 11, 24); // Miesiąc 11 = grudzień
  
  // Jeśli już minęło Boże Narodzenie w tym roku, ustaw na następny rok
  if (today > christmas) {
    christmas.setFullYear(currentYear + 1);
  }
  
  const diffTime = christmas.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

export function formatCountdown(_days: number): { days: number; hours: number; minutes: number } {
  const now = new Date();
  const currentYear = now.getFullYear();
  const christmas = new Date(currentYear, 11, 25, 0, 0, 0);
  
  if (now > christmas) {
    christmas.setFullYear(currentYear + 1);
  }
  
  const diff = christmas.getTime() - now.getTime();
  const daysLeft = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hoursLeft = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutesLeft = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  return {
    days: daysLeft,
    hours: hoursLeft,
    minutes: minutesLeft,
  };
}

