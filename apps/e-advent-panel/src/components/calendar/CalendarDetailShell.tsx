import type { ReactNode } from 'react';
import type { CalendarDetail } from '../../types/calendar';
import { formatDate, getProductTypeLabel } from '../../utils/formatters';

export function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">{label}</dt>
      <dd className="text-gray-800 font-medium">{value}</dd>
    </div>
  );
}

interface CalendarDetailShellProps {
  calendar: CalendarDetail;
  title: string;
  author: string;
  isDirty: boolean;
  isSaving: boolean;
  onBack: () => void;
  onMetaChange: (field: 'title' | 'author', value: string) => void;
  onSave: () => void;
  extraMeta?: ReactNode;
  main: ReactNode;
  sidebar?: ReactNode;
  headerActions?: ReactNode;
}

export default function CalendarDetailShell({
  calendar,
  title,
  author,
  isDirty,
  isSaving,
  onBack,
  onMetaChange,
  onSave,
  extraMeta,
  main,
  sidebar,
  headerActions,
}: CalendarDetailShellProps) {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-wrap items-start gap-3">
        <button type="button" onClick={onBack} className="btn-secondary px-3 py-2 text-sm mt-0.5">
          <i className="fa-solid fa-arrow-left" />
          Wróć
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="heading-page">{title || 'Kalendarz'}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Autor: <span className="font-medium text-gray-700">{author || '—'}</span>
            {calendar.customer_email && <> · {calendar.customer_email}</>}
            <span className="ml-2 text-gray-400">· {getProductTypeLabel(calendar.product_type)}</span>
          </p>
        </div>
        {headerActions}
        {isDirty && (
          <button
            type="button"
            onClick={onSave}
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
                  onChange={(e) => onMetaChange('title', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Autor</label>
                <input
                  type="text"
                  className="input-field"
                  value={author}
                  onChange={(e) => onMetaChange('author', e.target.value)}
                />
              </div>
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <DetailRow label="ID" value={<span className="font-mono text-xs">{calendar.id}</span>} />
              {calendar.sku && <DetailRow label="SKU" value={calendar.sku} />}
              <DetailRow label="Typ" value={getProductTypeLabel(calendar.product_type)} />
              {calendar.format ? <DetailRow label="Format" value={calendar.format} /> : null}
              <DetailRow label="Status płatności" value={calendar.status} />
              <DetailRow label="Status realizacji" value={calendar.fulfillment_status} />
              <DetailRow label="Utworzony" value={formatDate(calendar.created_at)} />
              <DetailRow label="Zaktualizowany" value={formatDate(calendar.updated_at)} />
              {calendar.customer_email && (
                <DetailRow label="Email klienta" value={calendar.customer_email} />
              )}
              {extraMeta}
            </dl>
          </div>

          {main}
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

          {sidebar}

          {isDirty && (
            <button
              type="button"
              onClick={onSave}
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
