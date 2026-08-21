import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetCalendarQuery, usePatchCalendarMutation } from '../api/calendarsApi';
import { useSendCalendarDayEmailMutation } from '../api/emailsApi';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useToast } from '../hooks/useToast';
import { formatDate } from '../utils/formatters';
import { OPENING_METHOD_LABELS } from '../utils/constants';
import type { CalendarTaskDetail } from '../types/calendar';

const TASK_STATUS_CONFIG: Record<string, { label: string; icon: string; cls: string }> = {
  opened: { label: 'Otwarte', icon: 'fa-lock-open', cls: 'badge-succeeded' },
  active: { label: 'Aktywne', icon: 'fa-star', cls: 'badge-new' },
  pending: { label: 'Oczekuje', icon: 'fa-clock', cls: 'badge-pending' },
  locked: { label: 'Zablokowane', icon: 'fa-lock', cls: 'badge-none' },
};

function TaskStatusBadge({ status }: { status: string }) {
  const cfg = TASK_STATUS_CONFIG[status] ?? { label: status || '—', icon: 'fa-circle', cls: 'badge-none' };
  return (
    <span className={`badge ${cfg.cls}`}>
      <i className={`fa-solid ${cfg.icon} text-[0.65rem]`} />
      {cfg.label}
    </span>
  );
}

export default function CalendarDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const { data: calendar, isLoading, isError, refetch } = useGetCalendarQuery(id ?? '', { skip: !id });
  const [patchCalendar, { isLoading: isSaving }] = usePatchCalendarMutation();
  const [sendDayEmail, { isLoading: isSendingDay }] = useSendCalendarDayEmailMutation();
  const [sendingDay, setSendingDay] = useState<number | null>(null);

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [tasks, setTasks] = useState<CalendarTaskDetail[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (!calendar) return;
    setTitle(calendar.title);
    setAuthor(calendar.author);
    // kopia, żeby nie mutować zamrożonej tablicy z RTK Query
    setTasks([...calendar.tasks].sort((a, b) => a.day - b.day));
    setIsDirty(false);
  }, [calendar]);

  const updateTaskText = (day: number, value: string) => {
    setTasks((prev) => prev.map((t) => (t.day === day ? { ...t, task: value } : t)));
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
          tasks: tasks.map((t) => ({
            day: t.day,
            task: t.task,
            status: t.status ?? 'closed',
            ...(t.duration != null ? { duration: t.duration } : {}),
            ...(t.latestDay != null ? { latestDay: t.latestDay } : {}),
            ...(t.lockedDay != null ? { lockedDay: t.lockedDay } : {}),
          })),
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

  if (isLoading) return <LoadingSpinner size="lg" label="Ładowanie kalendarza…" />;
  if (isError || !calendar) {
    return (
      <div className="alert-error panel-card p-6">
        <i className="fa-solid fa-triangle-exclamation mr-2" />
        Nie znaleziono kalendarza.{' '}
        <button className="underline" onClick={() => navigate(-1)}>Wróć</button>
      </div>
    );
  }

  const openedCount = tasks.filter((t) => t.status === 'opened').length;
  const totalTasks = tasks.length;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-wrap items-start gap-3">
        <button onClick={() => navigate(-1)} className="btn-secondary px-3 py-2 text-sm mt-0.5">
          <i className="fa-solid fa-arrow-left" />
          Wróć
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="heading-page">{title || 'Kalendarz'}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Autor: <span className="font-medium text-gray-700">{author || '—'}</span>
            {calendar.customer_email && <> · {calendar.customer_email}</>}
          </p>
        </div>
        {isDirty && (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn-green px-5 py-2.5 text-sm"
          >
            {isSaving ? (
              <>
                <span className="spinner spinner-sm border-white/30 border-b-white" />
                Zapisywanie…
              </>
            ) : (
              <>
                <i className="fa-solid fa-floppy-disk" />
                Zapisz zmiany
              </>
            )}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="panel-card p-5">
            <h2 className="heading-section mb-4">Szczegóły kalendarza</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Tytuł</label>
                <input
                  type="text"
                  className="input-field"
                  value={title}
                  onChange={(e) => handleMetaChange('title', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Autor</label>
                <input
                  type="text"
                  className="input-field"
                  value={author}
                  onChange={(e) => handleMetaChange('author', e.target.value)}
                />
              </div>
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <DetailRow label="ID" value={<span className="font-mono text-xs">{calendar.id}</span>} />
              {calendar.sku && <DetailRow label="SKU" value={calendar.sku} />}
              <DetailRow label="Format" value={calendar.format || '—'} />
              <DetailRow label="Status płatności" value={calendar.status} />
              <DetailRow label="Status realizacji" value={calendar.fulfillment_status} />
              <DetailRow label="Utworzony" value={formatDate(calendar.created_at)} />
              <DetailRow label="Zaktualizowany" value={formatDate(calendar.updated_at)} />
              {calendar.customer_email && (
                <DetailRow label="Email klienta" value={calendar.customer_email} />
              )}
              <DetailRow
                label="Sposób otwierania"
                value={OPENING_METHOD_LABELS[calendar.opening_method ?? ''] ?? calendar.opening_method ?? '—'}
              />
              {calendar.opening_method === 'email' && (
                <DetailRow
                  label="Adres codziennej treści"
                  value={calendar.daily_content_email || calendar.customer_email || '—'}
                />
              )}
              {calendar.design_url && (
                <DetailRow
                  label="Design URL"
                  value={
                    <a
                      href={calendar.design_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-christmas-green underline inline-flex items-center gap-1"
                    >
                      Otwórz design
                      <i className="fa-solid fa-arrow-up-right-from-square text-[0.65rem]" />
                    </a>
                  }
                />
              )}
            </dl>
          </div>

          <div className="panel-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <h2 className="heading-section">Zadania ({totalTasks})</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Edytuj treść okienek — po zapisie JSON zadań trafia do bazy.
                </p>
              </div>
              <span className="badge badge-succeeded">
                <i className="fa-solid fa-check text-[0.65rem]" />
                {openedCount} / {totalTasks} otwartych
              </span>
            </div>

            {tasks.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">Brak zadań w kalendarzu.</p>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div
                    key={task.day}
                    className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50"
                  >
                    <div className="w-10 h-10 rounded-full bg-christmas-green/10 border border-christmas-green/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-christmas-green">{task.day}</span>
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                          Dzień {task.day}
                        </p>
                        <div className="flex items-center gap-2">
                          <TaskStatusBadge status={task.status} />
                          <button
                            type="button"
                            onClick={() => handleSendDay(task.day)}
                            disabled={
                              calendar.opening_method !== 'email'
                              || !(calendar.daily_content_email || calendar.customer_email)
                              || sendingDay === task.day
                              || isSendingDay
                            }
                            className="btn-secondary px-2 py-1 text-xs disabled:opacity-40"
                            title={
                              calendar.opening_method !== 'email'
                                ? 'Kalendarz nie ma wybranej wysyłki mailowej'
                                : !(calendar.daily_content_email || calendar.customer_email)
                                  ? 'Brak adresu codziennej treści'
                                  : `Wyślij okienko dnia ${task.day}`
                            }
                          >
                            {sendingDay === task.day ? (
                              <span className="spinner spinner-sm" />
                            ) : (
                              <i className="fa-solid fa-envelope" />
                            )}
                            Wyślij
                          </button>
                        </div>
                      </div>
                      <textarea
                        rows={2}
                        className="input-field resize-y min-h-[2.75rem]"
                        value={task.task}
                        onChange={(e) => updateTaskText(task.day, e.target.value)}
                        placeholder={`Treść zadania na dzień ${task.day}…`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5">
          {calendar.access_code && (
            <div className="panel-card p-5">
              <h2 className="heading-section mb-3">Kod dostępu</h2>
              <div className="parchment-card p-4 text-center">
                <p className="text-xs text-parchment-muted mb-2 uppercase tracking-widest">Kod klienta</p>
                <p className="font-mono text-2xl font-bold text-christmas-green tracking-[0.2em]">
                  {calendar.access_code}
                </p>
              </div>
            </div>
          )}

          <div className="panel-card p-5">
            <h2 className="heading-section mb-3">Postęp</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Otwarte okienka</span>
                <span className="font-semibold">{openedCount} / {totalTasks}</span>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-christmas-green rounded-full transition-all"
                  style={{ width: totalTasks > 0 ? `${(openedCount / totalTasks) * 100}%` : '0%' }}
                />
              </div>
              <p className="text-xs text-gray-400 text-right">
                {totalTasks > 0 ? Math.round((openedCount / totalTasks) * 100) : 0}% ukończone
              </p>
            </div>
          </div>

          {isDirty && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="btn-green w-full py-3 text-base"
            >
              {isSaving ? (
                <>
                  <span className="spinner spinner-sm border-white/30 border-b-white" />
                  Zapisywanie…
                </>
              ) : (
                <>
                  <i className="fa-solid fa-floppy-disk" />
                  Zapisz zmiany
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">{label}</dt>
      <dd className="text-gray-800 font-medium">{value}</dd>
    </div>
  );
}
