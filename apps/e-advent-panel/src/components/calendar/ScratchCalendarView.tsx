import type { CalendarDetail, CalendarTaskDetail } from '../../types/calendar';
import { DetailRow } from './CalendarDetailShell';
import ScratchDesignThumb from './ScratchDesignThumb';
import { resolveScratchPreviewUrl } from '../../utils/scratchPreview';

interface ScratchCalendarViewProps {
  calendar: CalendarDetail;
  tasks: CalendarTaskDetail[];
  exporting: 'pdf' | 'png' | null;
  onUpdateTask: (day: number, value: string, field?: 'task' | 'title') => void;
  onExportPdf: () => void;
  onExportPng: () => void;
}

export default function ScratchCalendarView({
  calendar,
  tasks,
  exporting,
  onUpdateTask,
  onExportPdf,
  onExportPng,
}: ScratchCalendarViewProps) {
  const previewUrl = resolveScratchPreviewUrl(calendar.design_url);
  const busy = exporting != null;

  return (
    <div className="space-y-5">
      <div className="panel-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="heading-section">Design produkcyjny</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Format z zamówienia: <span className="font-semibold text-gray-700">{calendar.format || 'A4'}</span>
              {' · '}eksport PNG @ 600 DPI
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-secondary px-3 py-2 text-sm"
              disabled={busy || !calendar.design_url}
              onClick={onExportPdf}
            >
              {exporting === 'pdf' ? (
                <span className="spinner spinner-sm" />
              ) : (
                <i className="fa-solid fa-file-pdf" />
              )}
              Pobierz PDF
            </button>
            <button
              type="button"
              className="btn-green px-3 py-2 text-sm"
              disabled={busy || !calendar.design_url}
              onClick={onExportPng}
            >
              {exporting === 'png' ? (
                <span className="spinner spinner-sm border-white/30 border-b-white" />
              ) : (
                <i className="fa-solid fa-image" />
              )}
              Pobierz PNG
            </button>
          </div>
        </div>

        {previewUrl ? (
          <ScratchDesignThumb imageSrc={previewUrl} />
        ) : (
          <p className="text-sm text-gray-400 text-center py-8">Brak grafiki designu w zamówieniu.</p>
        )}
      </div>

      <div className="panel-card p-5">
        <div className="mb-4">
          <h2 className="heading-section">Treści okienek ({tasks.length})</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Edytuj teksty naniesione na PDF/PNG — bez statusów otwarcia (kalendarz fizyczny).
          </p>
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
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Dzień {task.day}
                  </p>
                  <input
                    type="text"
                    className={`input-field ${task.title ? 'font-semibold' : 'text-sm'}`}
                    value={task.title ?? ''}
                    onChange={(e) => onUpdateTask(task.day, e.target.value, 'title')}
                    placeholder="Tytuł dnia (opcjonalnie)…"
                  />
                  <textarea
                    rows={2}
                    className="input-field resize-y min-h-[2.75rem]"
                    value={task.task}
                    onChange={(e) => onUpdateTask(task.day, e.target.value, 'task')}
                    placeholder={`Treść na dzień ${task.day}…`}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Extra meta rows for scratch (no opening method). */
export function ScratchExtraMeta({ calendar }: { calendar: CalendarDetail }) {
  if (!calendar.design_url) return null;
  return (
    <DetailRow
      label="Design"
      value={<span className="text-xs break-all text-gray-600">{calendar.design_url}</span>}
    />
  );
}
