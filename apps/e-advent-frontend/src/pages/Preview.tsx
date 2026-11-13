import { useMemo, useState } from 'react';
import CalendarGrid from '../components/CalendarGrid';
import Modal from '../components/Modal';
import CalendarScene from '../components/CalendarScene';

const SAMPLE_TASK = 'Przykładowe zadanie na ten dzień.';

export default function Preview() {
  const [opened, setOpened] = useState<number[]>([]);
  const [openedDay, setOpenedDay] = useState<number | null>(null);
  const year = new Date().getFullYear();
  const days = useMemo(() => Array.from({ length: 24 }, (_, index) => ({
    day: index + 1,
    task: SAMPLE_TASK,
    isOpened: opened.includes(index + 1),
    date: new Date(year, 11, index + 1).toISOString(),
  })), [opened, year]);

  return (
    <CalendarScene
      title="Zajrzyj do kalendarza"
      description="Tak wyglądają okienka. W podglądzie każde z nich ma przykładowe zadanie."
    >
      <div className="notice-preview">
        <p>
          <i className="fas fa-eye mr-2" />
          <strong>Tryb podglądu</strong> — okienka otwierają się jak w kalendarzu i pokazują przykładowe zadanie
        </p>
      </div>
      <CalendarGrid
        days={days}
        onDayClick={(day) => {
          setOpened((current) => current.includes(day) ? current : [...current, day]);
          setOpenedDay(day);
        }}
        currentDate={new Date()}
        previewMode
      />
      <Modal isOpen={openedDay !== null} onClose={() => setOpenedDay(null)} title={`Dzień ${openedDay}!`}>
        <p className="text-2xl md:text-3xl mb-4 text-christmas-gold-light drop-shadow-lg px-4 font-task text-center">
          {SAMPLE_TASK}
        </p>
      </Modal>
    </CalendarScene>
  );
}
