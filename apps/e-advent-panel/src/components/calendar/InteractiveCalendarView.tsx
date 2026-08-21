import type { CalendarDetail, CalendarTaskDetail } from '../../types/calendar';
import { OPENING_METHOD_LABELS } from '../../utils/constants';
import { DetailRow } from './CalendarDetailShell';

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

interface InteractiveCalendarViewProps {
  calendar: CalendarDetail;
  tasks: CalendarTaskDetail[];
  sendingDay: number | null;
  isSendingDay: boolean;
  onUpdateTask: (day: number, value: string) => void;
  onSendDay: (day: number) => void;
}

export function InteractiveExtraMeta({ calendar }: { calendar: CalendarDetail }) {
  return (
    <>
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
    </>
  );
}

export function InteractiveProgressSidebar({
  openedCount,
  totalTasks,
}: {
  openedCount: number;
  totalTasks: number;
}) {
  return (
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
  );
}

export default function InteractiveCalendarView({
  calendar,
  tasks,
  sendingDay,
  isSendingDay,
  onUpdateTask,
  onSendDay,
}: InteractiveCalendarViewProps) {
  const openedCount = tasks.filter((t) => t.status === 'opened').length;
  const totalTasks = tasks.length;

  return (
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
                      onClick={() => onSendDay(task.day)}
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
                  onChange={(e) => onUpdateTask(task.day, e.target.value)}
                  placeholder={`Treść zadania na dzień ${task.day}…`}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
