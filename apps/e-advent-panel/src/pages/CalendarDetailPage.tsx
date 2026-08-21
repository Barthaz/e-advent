import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from 'react-redux';
import { useGetCalendarQuery, usePatchCalendarMutation } from '../api/calendarsApi';
import { useSendCalendarDayEmailMutation } from '../api/emailsApi';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import CalendarDetailShell from '../components/calendar/CalendarDetailShell';
import ScratchCalendarView, { ScratchExtraMeta } from '../components/calendar/ScratchCalendarView';
import InteractiveCalendarView, {
  InteractiveExtraMeta,
  InteractiveProgressSidebar,
} from '../components/calendar/InteractiveCalendarView';
import LetterCalendarView from '../components/calendar/LetterCalendarView';
import ExportGeneratingModal from '../components/calendar/ExportGeneratingModal';
import { useToast } from '../hooks/useToast';
import { downloadScratchExport } from '../api/scratchExport';
import type { RootState } from '../store';
import type { CalendarTaskDetail } from '../types/calendar';

export default function CalendarDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const store = useStore<RootState>();

  const { data: calendar, isLoading, isError, refetch } = useGetCalendarQuery(id ?? '', { skip: !id });
  const [patchCalendar, { isLoading: isSaving }] = usePatchCalendarMutation();
  const [sendDayEmail, { isLoading: isSendingDay }] = useSendCalendarDayEmailMutation();
  const [sendingDay, setSendingDay] = useState<number | null>(null);
  const [exporting, setExporting] = useState<'pdf' | 'png' | null>(null);

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [tasks, setTasks] = useState<CalendarTaskDetail[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (!calendar) return;
    setTitle(calendar.title);
    setAuthor(calendar.author);
    setTasks([...calendar.tasks].sort((a, b) => a.day - b.day));
    setIsDirty(false);
  }, [calendar]);

  const updateTaskText = (day: number, value: string, field: 'task' | 'title' = 'task') => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.day !== day) return t;
        if (field === 'title') {
          const trimmed = value.trim();
          return trimmed ? { ...t, title: value } : { ...t, title: undefined };
        }
        return { ...t, task: value };
      }),
    );
    setIsDirty(true);
  };

  const handleMetaChange = (field: 'title' | 'author', value: string) => {
    if (field === 'title') setTitle(value);
    else setAuthor(value);
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!id) return;
    try {
      await patchCalendar({
        id,
        data: {
          title,
          author,
          tasks: tasks.map((t) => {
            const dayTitle = t.title?.trim();
            if (dayTitle) {
              return {
                day: t.day,
                title: dayTitle,
                description: t.task,
                status: t.status ?? 'closed',
                ...(t.duration != null ? { duration: t.duration } : {}),
                ...(t.latestDay != null ? { latestDay: t.latestDay } : {}),
                ...(t.lockedDay != null ? { lockedDay: t.lockedDay } : {}),
              };
            }
            return {
              day: t.day,
              title: t.task,
              status: t.status ?? 'closed',
              ...(t.duration != null ? { duration: t.duration } : {}),
              ...(t.latestDay != null ? { latestDay: t.latestDay } : {}),
              ...(t.lockedDay != null ? { lockedDay: t.lockedDay } : {}),
            };
          }),
        },
      }).unwrap();
      toast.success('Kalendarz został zaktualizowany.');
      setIsDirty(false);
    } catch {
      toast.error('Nie udało się zapisać zmian kalendarza.');
    }
  };

  const handleSendDay = async (day: number) => {
    if (!id) return;
    setSendingDay(day);
    try {
      const result = await sendDayEmail({ calendarId: id, day, force: true }).unwrap();
      const to = result.recipient
        || calendar?.daily_content_email
        || calendar?.customer_email
        || '';
      if (result.skipped) {
        toast.info(`Okienko dnia ${day} było już wysłane${to ? ` na ${to}` : ''}.`);
      } else if (result.success === false) {
        const failMsg = (result as { error?: string }).error
          || result.results?.[0]?.error
          || `Wysyłka dnia ${day} nie powiodła się${to ? ` (${to})` : ''}.`;
        toast.error(failMsg);
      } else {
        toast.success(`Wysłano okienko dnia ${day}${to ? ` na ${to}` : ''}.`);
      }
      await refetch();
    } catch (err) {
      const message = (err as { data?: { message?: string } })?.data?.message
        || `Nie udało się wysłać okienka dnia ${day}.`;
      toast.error(message);
    } finally {
      setSendingDay(null);
    }
  };

  const handleExport = async (kind: 'pdf' | 'png') => {
    if (!id) return;
    setExporting(kind);
    try {
      await downloadScratchExport(() => store.getState(), id, kind);
      toast.success(kind === 'pdf' ? 'Pobrano plik PDF.' : 'Pobrano plik PNG.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Nie udało się wygenerować pliku.');
    } finally {
      setExporting(null);
    }
  };

  if (isLoading) return <LoadingSpinner size="lg" label="Ładowanie kalendarza…" />;
  if (isError || !calendar) {
    return (
      <div className="alert-error panel-card p-6">
        <i className="fa-solid fa-triangle-exclamation mr-2" />
        Nie znaleziono kalendarza.{' '}
        <button type="button" className="underline" onClick={() => navigate(-1)}>Wróć</button>
      </div>
    );
  }

  const productType = calendar.product_type;
  const openedCount = tasks.filter((t) => t.status === 'opened').length;

  let extraMeta = null;
  let main = null;
  let sidebar = null;

  if (productType === 'scratch') {
    extraMeta = <ScratchExtraMeta calendar={calendar} />;
    main = (
      <ScratchCalendarView
        calendar={calendar}
        tasks={tasks}
        exporting={exporting}
        onUpdateTask={updateTaskText}
        onExportPdf={() => handleExport('pdf')}
        onExportPng={() => handleExport('png')}
      />
    );
  } else if (productType === 'letter') {
    main = (
      <LetterCalendarView
        tasks={tasks}
        onUpdateTask={updateTaskText}
      />
    );
  } else {
    extraMeta = <InteractiveExtraMeta calendar={calendar} />;
    main = (
      <InteractiveCalendarView
        calendar={calendar}
        tasks={tasks}
        sendingDay={sendingDay}
        isSendingDay={isSendingDay}
        onUpdateTask={updateTaskText}
        onSendDay={handleSendDay}
      />
    );
    sidebar = (
      <InteractiveProgressSidebar openedCount={openedCount} totalTasks={tasks.length} />
    );
  }

  return (
    <>
      {exporting && <ExportGeneratingModal kind={exporting} />}
      <CalendarDetailShell
        calendar={calendar}
        title={title}
        author={author}
        isDirty={isDirty}
        isSaving={isSaving}
        onBack={() => navigate(-1)}
        onMetaChange={handleMetaChange}
        onSave={handleSave}
        extraMeta={extraMeta}
        main={main}
        sidebar={sidebar}
      />
    </>
  );
}
