import type { OpenedCalendarWindow } from '@e-advent/types';
import Modal from './Modal';
import SpecialWindowShell from '../special-windows/SpecialWindowShell';

interface OpenedDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  day: number;
  taskText: string;
  duration?: number;
  calendarId: string;
  openedWindow?: OpenedCalendarWindow;
  viewportLock?: boolean;
}

export default function OpenedDayModal({
  isOpen,
  onClose,
  day,
  taskText,
  duration,
  calendarId,
  openedWindow,
  viewportLock = false,
}: OpenedDayModalProps) {
  const isSpecial = !!openedWindow?.isSpecial;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Dzień ${day}!`} viewportLock={viewportLock}>
      <div className="text-center w-full max-w-2xl mx-auto px-1">
        <p
          className={`mb-3 text-christmas-gold-light drop-shadow-lg px-2 font-task ${
            isSpecial ? 'text-lg md:text-2xl line-clamp-5' : 'text-2xl md:text-4xl'
          }`}
        >
          {taskText}
        </p>
        {duration && duration > 0 && (
          <p className="text-base md:text-xl text-christmas-gold-light font-medium drop-shadow-md font-calligraphy">
            <i className="fas fa-clock text-christmas-gold-light mr-2" />
            Czas realizacji: {duration} {duration === 1 ? 'dzień' : 'dni'}
          </p>
        )}

        {isSpecial && openedWindow && (
          <SpecialWindowShell
            calendarId={calendarId}
            openedWindow={openedWindow}
            onClose={onClose}
          />
        )}
      </div>
    </Modal>
  );
}
