import type { OpeningMethod } from '../../types/order';

export const OPENING_METHOD_OPTIONS: Array<{
  id: OpeningMethod;
  icon: string;
  title: string;
  description: string;
}> = [
  {
    id: 'app',
    icon: 'fab fa-android',
    title: 'Aplikacja mobilna Android',
    description: 'Otwieraj okienka wygodnie w aplikacji na telefonie. Po zakupie pobierzesz plik APK.',
  },
  {
    id: 'email',
    icon: 'fas fa-envelope-open-text',
    title: 'Codzienny e-mail',
    description: 'Każdego dnia na wskazany adres przyjdzie ładnie sformatowana treść okienka.',
  },
  {
    id: 'online',
    icon: 'fas fa-globe',
    title: 'Otwieranie online',
    description: 'Otrzymasz unikalny link i będziesz otwierać okienka, wchodząc codziennie na ten adres.',
  },
];

export const OPENING_METHOD_LABELS: Record<OpeningMethod, string> = {
  app: 'Aplikacja mobilna Android',
  email: 'Codzienny e-mail',
  online: 'Otwieranie online',
};

