import { useState } from 'react';
import { useGetDailyPreviewQuery, useSendDailyTodayMutation } from '../api/emailsApi';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useToast } from '../hooks/useToast';
import type { SendEmailsResult } from '../types/email';

export default function DailyEmailsPage() {
  const toast = useToast();
  const { data: preview, isLoading, isError, refetch } = useGetDailyPreviewQuery();
  const [sendToday, { isLoading: isSending }] = useSendDailyTodayMutation();
  const [force, setForce] = useState(false);
  const [lastResult, setLastResult] = useState<SendEmailsResult | null>(null);

  const handleSend = async () => {
    try {
      const result = await sendToday({ force }).unwrap();
      setLastResult(result);
      await refetch();
      if (result.skipped && result.reason === 'not_advent') {
        toast.info('Poza 1–24 grudnia nie ma dzisiejszego okienka.');
        return;
      }
      if ((result.failed ?? 0) > 0) {
        toast.error(`Wysłano ${result.sent}, pominięto ${result.skippedCount ?? 0}, błędy: ${result.failed}.`);
      } else {
        toast.success(`Wysłano ${result.sent} wiadomości (pominięto ${result.skippedCount ?? 0}).`);
      }
    } catch (err) {
      const message = (err as { data?: { message?: string } })?.data?.message
        || 'Nie udało się wysłać dziennych okienek.';
      toast.error(message);
    }
  };

  if (isLoading) return <LoadingSpinner size="lg" label="Ładowanie podglądu wysyłek…" />;
  if (isError || !preview) {
    return (
      <div className="panel-card p-6 alert-error">
        <i className="fa-solid fa-triangle-exclamation mr-2" />
        Nie udało się pobrać podglądu dziennych wysyłek.
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="heading-page">Wysyłki e-mail</h1>
        <p className="text-sm text-gray-500 mt-1">
          Hurtowa wysyłka dzisiejszych okienek do wszystkich kalendarzy z metodą „codzienny e-mail”.
        </p>
      </div>

      <div className="panel-card p-6 space-y-4">
        <h2 className="heading-section">Dzisiejsze okienka</h2>
        {preview.isAdvent ? (
          <p className="text-lg font-medium text-gray-800">
            Dziś: dzień {preview.day} grudnia {preview.year}
          </p>
        ) : (
          <p className="text-gray-600">
            Poza okresem adwentu (1–24 grudnia) hurtowa wysyłka „na dziś” jest wyłączona.
            Pojedyncze dni nadal możesz wysłać z karty kalendarza.
          </p>
        )}

        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Stat label="Kalendarze e-mail" value={preview.eligible} />
          <Stat label="Już wysłane dziś" value={preview.alreadySent} />
          <Stat label="Pozostało" value={preview.remaining} />
        </dl>

        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={force}
            onChange={(e) => setForce(e.target.checked)}
          />
          Wyślij ponownie już wysłane
        </label>

        <button
          type="button"
          onClick={handleSend}
          disabled={!preview.isAdvent || isSending || preview.eligible === 0}
          className="btn-green px-5 py-2.5 text-sm disabled:opacity-50"
        >
          {isSending ? (
            <>
              <span className="spinner spinner-sm border-white/30 border-b-white" />
              Wysyłanie…
            </>
          ) : (
            <>
              <i className="fa-solid fa-paper-plane" />
              Wyślij dzisiejsze okienka
            </>
          )}
        </button>
      </div>

      {lastResult && (
        <div className="panel-card p-6">
          <h2 className="heading-section mb-3">Ostatni wynik</h2>
          {lastResult.skipped && lastResult.reason === 'not_advent' ? (
            <p className="text-sm text-gray-500">Pominięto — dziś nie ma okienka adwentowego.</p>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-4">
                Wysłano {lastResult.sent} · pominięto {lastResult.skippedCount ?? 0} · błędy {lastResult.failed}
              </p>
              {lastResult.results.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                        <th className="pb-2 font-medium">Adres</th>
                        <th className="pb-2 font-medium">Status</th>
                        <th className="pb-2 font-medium">Szczegóły</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lastResult.results.map((row, index) => (
                        <tr key={`${row.calendarId ?? row.recipient ?? index}`} className="border-b border-gray-50">
                          <td className="py-2 text-gray-800">{row.recipient || '—'}</td>
                          <td className="py-2">
                            {row.skipped ? 'pominięto' : row.success ? 'wysłano' : 'błąd'}
                          </td>
                          <td className="py-2 text-gray-500">{row.error || row.reason || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
      <dt className="text-xs uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="text-2xl font-semibold text-christmas-green mt-1">{value}</dd>
    </div>
  );
}
