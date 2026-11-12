import DemoCalendar from '../components/DemoCalendar';
import CalendarScene from '../components/CalendarScene';
import SEOHead from '../components/SEOHead';

export default function FreeCalendarPage() {
  return <>
    <SEOHead title="Darmowy kalendarz adwentowy | e-Advent" description="24 małe świąteczne rytuały od e-Advent. Otwieraj grudniowe okienka i ciesz się wspólnym czasem." canonical="https://e-advent.pl/darmowy-kalendarz" />
    <CalendarScene free title="Darmowy kalendarz adwentowy online" description="Każde okienko to zaproszenie do jednej dobrej chwili. Otwieraj je od 1 grudnia — bez pośpiechu, po swojemu.">
      <DemoCalendar />
    </CalendarScene>
  </>;
}
