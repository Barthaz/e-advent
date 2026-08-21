import { useEffect, useState } from 'react';
import {
  useGetEmailTemplatesQuery,
  useLazyGetEmailTemplatePreviewQuery,
} from '../api/emailsApi';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import type { EmailTemplateMeta, EmailTemplatePreview } from '../types/email';

export default function EmailTemplatesPage() {
  const { data: templates = [], isLoading, isError } = useGetEmailTemplatesQuery();
  const [fetchPreview, { isFetching: isPreviewLoading }] = useLazyGetEmailTemplatePreviewQuery();
  const [preview, setPreview] = useState<EmailTemplatePreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const openPreview = async (template: EmailTemplateMeta) => {
    setPreviewError(null);
    try {
      const result = await fetchPreview(template.id).unwrap();
      setPreview(result);
    } catch {
      setPreviewError('Nie udało się wczytać podglądu szablonu.');
      setPreview(null);
    }
  };

  const closePreview = () => {
    setPreview(null);
    setPreviewError(null);
  };

  if (isLoading) return <LoadingSpinner size="lg" label="Ładowanie szablonów…" />;
  if (isError) {
    return (
      <div className="panel-card p-6 alert-error">
        <i className="fa-solid fa-triangle-exclamation mr-2" />
        Nie udało się pobrać listy szablonów e-mail.
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="heading-page">Szablony e-mail</h1>
        <p className="text-sm text-gray-500 mt-1">
          Aktualne szablony wysyłane do klientów. Podgląd używa mockowanych, kompletnych danych.
        </p>
      </div>

      {previewError && (
        <div className="alert-error px-4 py-3 text-sm">
          <i className="fa-solid fa-triangle-exclamation mr-2" />
          {previewError}
        </div>
      )}

      <div className="panel-card overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/80">
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Szablon</th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 hidden md:table-cell">Kiedy</th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 w-36 text-right">Akcja</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => (
              <tr key={t.id} className="border-b border-gray-50 last:border-0">
                <td className="px-5 py-4 align-top">
                  <p className="font-medium text-gray-800">{t.name}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{t.description}</p>
                  <p className="text-xs text-gray-400 mt-1 font-mono">{t.id}</p>
                </td>
                <td className="px-5 py-4 align-top hidden md:table-cell">
                  <p className="text-sm text-gray-600">{t.trigger}</p>
                  <p className="text-xs text-gray-400 mt-1">Temat: {t.subject}</p>
                </td>
                <td className="px-5 py-4 align-top text-right">
                  <button
                    type="button"
                    className="btn-secondary px-3 py-1.5 text-sm"
                    disabled={isPreviewLoading}
                    onClick={() => openPreview(t)}
                  >
                    <i className="fa-solid fa-eye mr-1.5" />
                    Podgląd
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {preview && (
        <EmailPreviewModal preview={preview} onClose={closePreview} />
      )}
    </div>
  );
}

function EmailPreviewModal({
  preview,
  onClose,
}: {
  preview: EmailTemplatePreview;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="email-preview-title"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100">
          <div className="min-w-0">
            <h2 id="email-preview-title" className="font-semibold text-gray-900 truncate">
              {preview.name}
            </h2>
            <p className="text-xs text-gray-500 mt-1 truncate">
              Temat: {preview.subject}
              <span className="ml-2 text-christmas-gold">· dane mock</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-1"
            aria-label="Zamknij"
          >
            <i className="fa-solid fa-xmark text-lg" />
          </button>
        </div>
        <div className="flex-1 overflow-auto bg-[#efe6d6] p-3 sm:p-4">
          <iframe
            title={`Podgląd: ${preview.name}`}
            srcDoc={preview.html}
            className="w-full min-h-[70vh] bg-transparent border-0 rounded"
            sandbox=""
          />
        </div>
      </div>
    </div>
  );
}
