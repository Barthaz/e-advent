import type { CalendarDetail } from '../../types/calendar';
import type { CertificateVariant } from '../../api/certificateExport';
import { DetailRow } from './CalendarDetailShell';

function serialLabel(n: number | null): string {
  if (!n) return '—';
  return `GEN-2026-${String(n).padStart(6, '0')}`;
}

interface CertificateCalendarViewProps {
  calendar: CalendarDetail;
  exporting: CertificateVariant | null;
  onDownload: (variant: CertificateVariant) => void;
}

export function CertificateExtraMeta({ calendar }: { calendar: CalendarDetail }) {
  return (
    <DetailRow label="Numer certyfikatu" value={serialLabel(calendar.certificate_number)} />
  );
}

export default function CertificateCalendarView({
  calendar,
  exporting,
  onDownload,
}: CertificateCalendarViewProps) {
  const busy = exporting != null;
  const nameOk = calendar.title.trim().length >= 2;

  return (
    <div className="panel-card p-5 space-y-4">
      <div>
        <h2 className="heading-section">Certyfikat Grzecznego Dziecka</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Pobierz PDF w wariancie ON albo ONA. Numer {serialLabel(calendar.certificate_number)} zostaje ten sam.
        </p>
      </div>
      <p className="text-lg font-medium text-gray-800">{calendar.title || '—'}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-secondary px-3 py-2 text-sm"
          disabled={busy || !nameOk}
          onClick={() => onDownload('on')}
        >
          {exporting === 'on' ? <span className="spinner spinner-sm" /> : <i className="fa-solid fa-file-pdf" />}
          Pobierz ON
        </button>
        <button
          type="button"
          className="btn-green px-3 py-2 text-sm"
          disabled={busy || !nameOk}
          onClick={() => onDownload('ona')}
        >
          {exporting === 'ona' ? (
            <span className="spinner spinner-sm border-white/30 border-b-white" />
          ) : (
            <i className="fa-solid fa-file-pdf" />
          )}
          Pobierz ONA
        </button>
      </div>
      {!nameOk && (
        <p className="text-sm text-amber-800">Imię musi mieć co najmniej 2 znaki — zapisz tytuł i pobierz ponownie.</p>
      )}
    </div>
  );
}
