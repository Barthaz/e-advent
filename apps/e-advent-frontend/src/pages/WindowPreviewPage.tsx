import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { OpenedCalendarWindow, SpecialWindowDescriptor } from '@e-advent/types';
import catalog from '../../../../packages/content/catalog/e-advent-calendars-data.json' with { type: 'json' };
import registry from '../../../../packages/content/generated/special-config-registry.json' with { type: 'json' };
import OpenedDayModal from '../components/OpenedDayModal';
import SEOHead from '../components/SEOHead';
import { previewCalendarId } from '../special-windows/previewCalendar';

type CatalogTask = {
  id: string;
  order: number;
  title: string;
  text: string;
  isSpecial?: boolean;
};

type CatalogSet = {
  setNumber: number;
  title: string;
  tasks: CatalogTask[];
};

export default function WindowPreviewPage() {
  const { catalogTaskId } = useParams<{ catalogTaskId: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.classList.add('embed-window-preview');
    return () => document.documentElement.classList.remove('embed-window-preview');
  }, []);

  const task = useMemo(() => {
    const sets = (catalog as { sets: CatalogSet[] }).sets || [];
    for (const set of sets) {
      const found = set.tasks.find((item) => item.id === catalogTaskId);
      if (found) return found;
    }
    return null;
  }, [catalogTaskId]);

  const openedWindow = useMemo<OpenedCalendarWindow | undefined>(() => {
    if (!task?.isSpecial || !catalogTaskId) return undefined;
    const descriptor = (registry as { entries: Record<string, SpecialWindowDescriptor> }).entries[
      catalogTaskId
    ];
    if (!descriptor) return undefined;
    return {
      taskId: catalogTaskId,
      day: task.order,
      state: 'OPENED',
      title: task.text,
      text: task.text,
      isSpecial: true,
      special: descriptor,
    };
  }, [task, catalogTaskId]);

  const closePreview = () => {
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'e-advent-preview-close' }, '*');
      return;
    }
    navigate(-1);
  };

  return (
    <>
      <SEOHead title="Podgląd okienka" robots="noindex, nofollow" />
      {!task || !catalogTaskId ? (
        <p className="p-8 text-center text-white">Nie znaleziono tego zadania w katalogu.</p>
      ) : (
        <OpenedDayModal
          isOpen
          onClose={closePreview}
          day={task.order}
          taskText={task.text}
          calendarId={previewCalendarId(catalogTaskId)}
          openedWindow={openedWindow}
          viewportLock
        />
      )}
    </>
  );
}
