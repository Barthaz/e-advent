export const publicPaths = [
  '/', '/kalendarze-adwentowe', '/darmowy-kalendarz', '/list-do-swietego-mikolaja',
  '/wiadomosc-od-mikolaja', '/stworz-kalendarz', '/stworz-kalendarz/interaktywny',
  '/stworz-kalendarz/zdrapka', '/sledz-mikolaja', '/regulamin',
  '/polityka-prywatnosci', '/dostawa-i-zwroty',
];

const privateScreens: Record<string, string> = {
  '/koszyk': 'Koszyk', '/platnosc': 'Dostawa i płatność', '/checkout': 'Dostawa i płatność',
  '/sukces': 'Potwierdzenie zamówienia', '/success': 'Potwierdzenie zamówienia',
  '/platnosc-blad': 'Problem z płatnością', '/kalendarz': 'Otwórz swój kalendarz',
  '/podglad': 'Podgląd kalendarza', '/preview': 'Podgląd kalendarza',
  '/create': 'Kreator kalendarza',
  '/stworz-kalendarz/interaktywny/kreator': 'Kreator kalendarza online',
  '/wiadomosc-od-mikolaja/kreator': 'Kreator wiadomości od Mikołaja',
};

export function privateTitle(path: string) {
  let name = privateScreens[path];
  if (/^\/(kalendarz|calendar)\//.test(path)) name = 'Twój kalendarz adwentowy';
  if (path.startsWith('/podglad-okienka/')) name = 'Podgląd okienka';
  if (path.startsWith('/wiadomosc-od-mikolaja/personalizacja/')) name = 'Personalizacja wiadomości od Mikołaja';
  if (path.startsWith('/od-mikolaja/')) name = path.startsWith('/od-mikolaja/przyklad/') ? 'Przykładowa wiadomość od Mikołaja' : 'Odsłuch wiadomości od Mikołaja';
  return name ? name + ' | e-Advent' : undefined;
}
