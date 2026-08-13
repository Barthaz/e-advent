// Funkcja generująca losowy układ pól dla preview kalendarza
// Zwraca tablicę z informacją o kolejności i rozmiarach pól
// Algorytm wypełnia siatkę tak, aby nie było pustych miejsc

export type PreviewLayoutItem = {
  day: number;
  width: number; // szerokość w jednostkach (1 = 1 pole, 2 = 2 pola)
  height: number; // wysokość w jednostkach (1 = 1 pole, 2 = 2 pola)
  order: number; // kolejność wyświetlania
  x: number; // pozycja X w siatce
  y: number; // pozycja Y w siatce
};

// Sprawdź czy pole może być umieszczone w danym miejscu
function canPlace(grid: boolean[][], x: number, y: number, width: number, height: number, gridWidth: number, gridHeight: number): boolean {
  if (x + width > gridWidth || y + height > gridHeight) {
    return false;
  }
  
  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) {
      if (grid[y + dy] && grid[y + dy][x + dx]) {
        return false;
      }
    }
  }
  
  return true;
}

// Zaznacz miejsce w siatce jako zajęte
function markPlace(grid: boolean[][], x: number, y: number, width: number, height: number): void {
  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) {
      if (!grid[y + dy]) {
        grid[y + dy] = [];
      }
      grid[y + dy][x + dx] = true;
    }
  }
}

export function generatePreviewLayout(): PreviewLayoutItem[] {
  const days = Array.from({ length: 24 }, (_, i) => i + 1);
  
  // Losuj kolejność dni
  const shuffledDays = [...days].sort(() => Math.random() - 0.5);
  
  // Określ rozmiary pól - około 60% standardowych, 25% szerokich, 15% wysokich
  const maxWide = Math.floor(24 * 0.25); // ~6 pól szerokich
  const maxTall = Math.floor(24 * 0.15); // ~3-4 pola wysokie
  
  // Przygotuj listę pól z rozmiarami
  const items: Array<{ day: number; width: number; height: number }> = [];
  let wideCount = 0;
  let tallCount = 0;
  
  shuffledDays.forEach((day) => {
    const rand = Math.random();
    let width = 1;
    let height = 1;
    
    if (rand < 0.25 && wideCount < maxWide) {
      width = 2;
      height = 1;
      wideCount++;
    } else if (rand < 0.4 && tallCount < maxTall) {
      width = 1;
      height = 2;
      tallCount++;
    }
    
    items.push({ day, width, height });
  });
  
  // Sortuj: najpierw duże pola (2x1 i 1x2), potem małe (1x1)
  items.sort((a, b) => {
    const aSize = a.width * a.height;
    const bSize = b.width * b.height;
    if (aSize !== bSize) {
      return bSize - aSize; // Większe pierwsze
    }
    // Jeśli ten sam rozmiar, preferuj wysokie przed szerokimi
    if (a.height !== b.height) {
      return b.height - a.height;
    }
    return b.width - a.width;
  });
  
  // Utwórz siatkę (zakładamy maksymalną szerokość ~6 kolumn)
  const gridWidth = 6;
  const gridHeight = 20; // Wystarczająco duża
  const grid: boolean[][] = [];
  
  const layout: PreviewLayoutItem[] = [];
  let order = 0;
  
  // Umieść każde pole w siatce
  for (const item of items) {
    let placed = false;
    
    // Szukaj miejsca od góry do dołu, od lewej do prawej
    for (let y = 0; y < gridHeight && !placed; y++) {
      for (let x = 0; x < gridWidth && !placed; x++) {
        if (canPlace(grid, x, y, item.width, item.height, gridWidth, gridHeight)) {
          markPlace(grid, x, y, item.width, item.height);
          layout.push({
            day: item.day,
            width: item.width,
            height: item.height,
            order: order++,
            x,
            y,
          });
          placed = true;
        }
      }
    }
    
    // Jeśli nie udało się znaleźć miejsca (nie powinno się zdarzyć), użyj pozycji 0,0
    if (!placed) {
      markPlace(grid, 0, 0, item.width, item.height);
      layout.push({
        day: item.day,
        width: item.width,
        height: item.height,
        order: order++,
        x: 0,
        y: 0,
      });
    }
  }
  
  // Sortuj według pozycji Y, potem X (dla lepszego wyświetlania)
  layout.sort((a, b) => {
    if (a.y !== b.y) {
      return a.y - b.y;
    }
    return a.x - b.x;
  });
  
  // Przypisz nowe kolejności
  layout.forEach((item, index) => {
    item.order = index;
  });
  
  return layout;
}

