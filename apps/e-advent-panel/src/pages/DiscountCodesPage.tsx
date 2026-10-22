import { useState } from 'react';
import {
  useCreateDiscountCodesMutation,
  useGetDiscountCodesQuery,
  useSetDiscountCodeActiveMutation,
} from '../api/discountsApi';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useToast } from '../hooks/useToast';

function formatDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' });
}

export default function DiscountCodesPage() {
  const toast = useToast();
  const { data: codes = [], isLoading, isError, refetch } = useGetDiscountCodesQuery();
  const [createCodes, { isLoading: creating }] = useCreateDiscountCodesMutation();
  const [setActive, { isLoading: toggling }] = useSetDiscountCodeActiveMutation();
  const [percent, setPercent] = useState<10 | 100>(10);
  const [reusable, setReusable] = useState(false);
  const [count, setCount] = useState(1);
  const [copied, setCopied] = useState('');

  async function handleCreate() {
    try {
      const created = await createCodes({ percent, reusable, count }).unwrap();
      toast.success(created.length === 1 ? `Wygenerowano kod ${created[0].code}.` : `Wygenerowano ${created.length} kodów.`);
    } catch (err) {
      const message = (err as { data?: { error?: string }; message?: string })?.data?.error
        || (err as { message?: string })?.message
        || 'Nie udało się wygenerować kodów.';
      toast.error(message);
    }
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      window.setTimeout(() => setCopied((current) => (current === code ? '' : current)), 1500);
    } catch {
      toast.error('Nie udało się skopiować kodu.');
    }
  }

  async function toggleActive(id: string, active: boolean) {
    try {
      await setActive({ id, active }).unwrap();
    } catch {
      toast.error('Nie udało się zapisać statusu kodu.');
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="heading-page">Kody rabatowe</h1>
        <p className="text-sm text-gray-500 mt-1">
          10% obniża produkty (dostawa bez zmian). 100% zdejmuje całą kwotę, w tym dostawę.
        </p>
      </div>

      <section className="panel-card p-5 space-y-4">
        <h2 className="heading-section">Nowy kod</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Rabat</label>
            <select
              className="admin-select"
              value={percent}
              onChange={(event) => setPercent(Number(event.target.value) as 10 | 100)}
            >
              <option value={10}>10%</option>
              <option value={100}>100%</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Użycie</label>
            <select
              className="admin-select"
              value={reusable ? 'reusable' : 'once'}
              onChange={(event) => setReusable(event.target.value === 'reusable')}
            >
              <option value="once">Jednorazowy</option>
              <option value="reusable">Wielokrotny</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Ile kodów</label>
            <input
              type="number"
              min={1}
              max={50}
              className="input-field"
              value={count}
              onChange={(event) => setCount(Math.min(50, Math.max(1, Number(event.target.value) || 1)))}
            />
          </div>
          <div className="flex items-end">
            <button type="button" className="btn-primary w-full" disabled={creating} onClick={() => void handleCreate()}>
              {creating ? 'Generowanie…' : 'Generuj'}
            </button>
          </div>
        </div>
      </section>

      <section className="panel-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <h2 className="heading-section">Wygenerowane kody</h2>
          <button type="button" className="btn-secondary px-3 py-2 text-sm" onClick={() => refetch()} disabled={isLoading}>
            Odśwież
          </button>
        </div>
        {isLoading ? (
          <LoadingSpinner label="Ładowanie kodów…" />
        ) : isError ? (
          <div className="alert-error m-5">
            <i className="fa-solid fa-triangle-exclamation mr-2" />
            Nie udało się wczytać kodów rabatowych.
          </div>
        ) : codes.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-500">Brak kodów. Wygeneruj pierwszy powyżej.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Kod</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Rabat</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Użycie</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Wykorzystania</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Utworzony</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500" />
                </tr>
              </thead>
              <tbody>
                {codes.map((code) => (
                  <tr key={code.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-3">
                      <button type="button" onClick={() => copyCode(code.code)} className="font-mono font-semibold text-gray-800 hover:underline">
                        {code.code}
                      </button>
                      {copied === code.code && <span className="ml-2 text-xs text-christmas-green">Skopiowano</span>}
                    </td>
                    <td className="px-5 py-3">{code.percent}%</td>
                    <td className="px-5 py-3">{code.reusable ? 'Wielokrotny' : 'Jednorazowy'}</td>
                    <td className="px-5 py-3">{code.usesCount}</td>
                    <td className="px-5 py-3">
                      <Badge variant={code.active ? 'succeeded' : 'cancelled'} label={code.active ? 'Aktywny' : 'Wyłączony'} />
                    </td>
                    <td className="px-5 py-3 text-gray-500">{formatDate(code.createdAt)}</td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        className="btn-secondary px-3 py-1.5 text-xs"
                        disabled={toggling}
                        onClick={() => void toggleActive(code.id, !code.active)}
                      >
                        {code.active ? 'Wyłącz' : 'Włącz'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
