import type { CalendarTaskDetail } from '../../types/calendar';

interface LetterCalendarViewProps {
  tasks: CalendarTaskDetail[];
  onUpdateTask: (day: number, value: string) => void;
}

/** Uproszczony widok listu / treści bez postępu interaktywnego. */
export default function LetterCalendarView({
  tasks,
  onUpdateTask,
}: LetterCalendarViewProps) {
  return (
    <div className="panel-card p-5">
      <div className="mb-4">
        <h2 className="heading-section">Treść ({tasks.length})</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Edytuj treści powiązane z zamówieniem listu.
        </p>
      </div>

      {tasks.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">Brak treści w kalendarzu.</p>
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
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Pozycja {task.day}
                </p>
                <textarea
                  rows={2}
                  className="input-field resize-y min-h-[2.75rem]"
                  value={task.task}
                  onChange={(e) => onUpdateTask(task.day, e.target.value)}
                  placeholder="Treść…"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
