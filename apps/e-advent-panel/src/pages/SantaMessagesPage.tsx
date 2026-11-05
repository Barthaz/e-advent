import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  fetchSantaAudioUrl,
  santaErrorMessage,
  useGetSantaMessageQuery,
  useGetSantaMessagesQuery,
  useSantaActionMutation,
  useUpdateSantaScriptMutation,
  useUploadSantaAudioMutation,
  type SantaAction,
  type SantaDetail,
} from '../api/santaMessagesApi';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { SANTA_STATUS_BADGE, SANTA_STATUS_LABELS } from '../utils/constants';

const PAGE_SIZE = 25;

const FIELD_LABELS: Record<string, string> = {
  childName: 'Imię',
  childVocative: 'Wołacz',
  addressForm: 'Forma',
  ageBand: 'Wiek',
  achievement: 'Osiągnięcie',
  proudOf: 'Z czego dumni',
  workingOn: 'Nad czym pracuje',
  wishes: 'Marzenia',
  siblingsNote: 'Rodzeństwo / zwierzak',
};

const ADDRESS_FORM_LABELS: Record<string, string> = { male: 'chłopiec', female: 'dziewczynka', neutral: 'neutralna' };

const EDITABLE = ['SCRIPT_READY', 'TTS_QUEUED', 'NEEDS_ATTENTION'];
const CLOSED = ['CANCELLED', 'EXPIRED'];

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' });
}

function formatDuration(seconds: number | null | undefined) {
  if (seconds == null) return '—';
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function StatusBadge({ status }: { status: string }) {
  return <Badge variant={SANTA_STATUS_BADGE[status] ?? 'pending'} label={SANTA_STATUS_LABELS[status] ?? status} icon="fa-microphone" />;
}

export default function SantaMessagesPage() {
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const selectedId = params.get('id');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(search.trim());
      setPage(0);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isFetching, isError, refetch } = useGetSantaMessagesQuery(
    { status, q: query, limit: PAGE_SIZE, offset: page * PAGE_SIZE },
    { pollingInterval: 30000 },
  );
  const counts = data?.counts ?? {};
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  const select = (id: string | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set('id', id);
    else next.delete('id');
    setParams(next, { replace: true });
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="heading-page">Wiadomości od Mikołaja</h1>
          <p className="text-sm text-gray-500 mt-1">
            Personalizacje, teksty i nagrania. Nagranie trafia do klienta dopiero po kliknięciu „Wyślij klientowi”.
          </p>
        </div>
        <button type="button" className="btn-secondary px-3 py-2 text-sm" onClick={() => refetch()} disabled={isFetching}>
          <i className={`fa-solid fa-rotate mr-1.5 ${isFetching ? 'fa-spin' : ''}`} /> Odśwież
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => { setStatus(''); setPage(0); }} className={`btn-secondary px-3 py-1.5 text-xs ${status === '' ? '!border-christmas-gold !bg-christmas-gold/10' : ''}`}>
          Wszystkie
        </button>
        {Object.keys(SANTA_STATUS_LABELS).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => { setStatus(key); setPage(0); }}
            className={`btn-secondary px-3 py-1.5 text-xs ${status === key ? '!border-christmas-gold !bg-christmas-gold/10' : ''}`}
          >
            {SANTA_STATUS_LABELS[key]} <span className="ml-1 text-gray-400">{counts[key] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <section className="panel-card overflow-hidden xl:col-span-2">
          <div className="border-b border-gray-100 px-4 py-3">
            <input
              type="search"
              className="input-field"
              placeholder="Szukaj: e-mail lub numer zamówienia"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {isLoading ? (
            <LoadingSpinner label="Ładowanie wiadomości…" />
          ) : isError ? (
            <div className="alert-error m-4">
              <i className="fa-solid fa-triangle-exclamation mr-2" />
              Nie udało się wczytać wiadomości. Czy migracja <code>migrate:santa-messages</code> została uruchomiona?
            </div>
          ) : !data?.items.length ? (
            <p className="px-5 py-8 text-sm text-gray-500">Brak wiadomości dla wybranych filtrów.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {data.items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => select(item.id)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${selectedId === item.id ? 'bg-christmas-gold/10' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm font-semibold text-gray-800">{item.orderNumber || item.orderId.slice(0, 8)}</span>
                      <StatusBadge status={item.status} />
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2 text-xs text-gray-500">
                      <span className="truncate">{item.customerEmail}</span>
                      <span className="whitespace-nowrap">{item.mode === 'letter_addon' ? 'z listem' : 'samodzielna'} · {formatDate(item.paidAt || item.createdAt)}</span>
                    </div>
                    {item.lastErrorCode && <p className="mt-1 text-xs text-red-600">{item.lastErrorCode}</p>}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2 text-sm">
              <button type="button" className="btn-secondary px-3 py-1 text-xs" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Poprzednia</button>
              <span className="text-gray-500">{page + 1} / {totalPages}</span>
              <button type="button" className="btn-secondary px-3 py-1 text-xs" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>Następna</button>
            </div>
          )}
        </section>

        <section className="xl:col-span-3">
          {selectedId ? (
            <SantaMessageDetail id={selectedId} onClose={() => select(null)} />
          ) : (
            <div className="panel-card p-8 text-center text-sm text-gray-500">
              <i className="fa-solid fa-microphone-lines text-3xl text-christmas-gold mb-3 block" />
              Wybierz wiadomość z listy, aby zobaczyć szczegóły.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function SantaMessageDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const toast = useToast();
  const { token } = useAuth();
  const { data, isLoading, isError, isFetching } = useGetSantaMessageQuery(id, { pollingInterval: 20000 });
  const [runAction, { isLoading: acting }] = useSantaActionMutation();
  const [saveScript, { isLoading: saving }] = useUpdateSantaScriptMutation();
  const [upload, { isLoading: uploading }] = useUploadSantaAudioMutation();
  const [editingScript, setEditingScript] = useState(false);
  const [scriptDraft, setScriptDraft] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const audioStamp = data ? `${data.audio?.bytes ?? 0}-${data.timestamps.audioReadyAt ?? ''}` : '';

  useEffect(() => {
    setEditingScript(false);
    setAudioUrl(null);
  }, [id]);

  useEffect(() => {
    setAudioUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  }, [audioStamp]);

  useEffect(() => () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  if (isLoading) return <div className="panel-card"><LoadingSpinner label="Ładowanie…" /></div>;
  if (isError || !data) {
    return (
      <div className="panel-card p-5">
        <div className="alert-error">Nie udało się wczytać wiadomości.</div>
      </div>
    );
  }

  const act = async (action: SantaAction, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    try {
      await runAction({ id, action }).unwrap();
      toast.success('Gotowe.');
    } catch (err) {
      toast.error(santaErrorMessage(err, 'Operacja nie powiodła się.'));
    }
  };

  const submitScript = async () => {
    try {
      await saveScript({ id, text: scriptDraft }).unwrap();
      setEditingScript(false);
      toast.success('Tekst zapisany.');
    } catch (err) {
      toast.error(santaErrorMessage(err, 'Nie udało się zapisać tekstu.'));
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      await upload({ id, file }).unwrap();
      toast.success('Nagranie wgrane. Odsłuchaj i wyślij klientowi.');
    } catch (err) {
      toast.error(santaErrorMessage(err, 'Nie udało się wgrać pliku.'));
    }
  };

  const loadAudio = async () => {
    setAudioLoading(true);
    try {
      setAudioUrl(await fetchSantaAudioUrl(id, token));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setAudioLoading(false);
    }
  };

  const closed = CLOSED.includes(data.status);
  const busy = acting || saving || uploading;

  return (
    <div className="panel-card p-5 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="heading-section">Zamówienie {data.orderNumber}</h2>
            <StatusBadge status={data.status} />
            {isFetching && <i className="fa-solid fa-circle-notch fa-spin text-gray-400 text-xs" />}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {data.customerEmail} · {data.mode === 'letter_addon' ? 'dodatek do listu' : 'samodzielna'} ·{' '}
            <Link to={`/orders/${data.orderId}`} className="underline">szczegóły zamówienia</Link>
          </p>
          {data.lastErrorCode && <p className="mt-1 text-sm text-red-600">Ostatni błąd: {data.lastErrorCode}</p>}
        </div>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1" aria-label="Zamknij">
          <i className="fa-solid fa-xmark" />
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {data.status === 'AUDIO_READY' && (
          <button type="button" className="btn-primary px-4 py-2 text-sm" disabled={busy} onClick={() => void act('deliver', 'Wysłać klientowi e-mail z linkiem do nagrania?')}>
            <i className="fa-solid fa-paper-plane mr-1.5" /> Wyślij klientowi
          </button>
        )}
        {['AWAITING_PERSONALIZATION', 'SCRIPT_READY', 'DELIVERED'].includes(data.status) && (
          <button type="button" className="btn-secondary px-3 py-2 text-sm" disabled={busy} onClick={() => void act('resend')}>
            <i className="fa-solid fa-envelope mr-1.5" /> Wyślij link ponownie
          </button>
        )}
        {data.status === 'NEEDS_ATTENTION' && data.ttsAutomation && (
          <button type="button" className="btn-secondary px-3 py-2 text-sm" disabled={busy} onClick={() => void act('retry-tts')}>
            <i className="fa-solid fa-rotate-right mr-1.5" /> Ponów syntezę
          </button>
        )}
        {data.status === 'DELIVERED' && (
          <button
            type="button"
            className="btn-secondary px-3 py-2 text-sm"
            disabled={busy}
            onClick={() => void act('revoke-play-link', 'Unieważnić obecny link do odsłuchu? Klient dostanie nowy link e-mailem.')}
          >
            <i className="fa-solid fa-link-slash mr-1.5" /> Nowy link (unieważnij stary)
          </button>
        )}
        {!closed && data.status !== 'DELIVERED' && (
          <button
            type="button"
            className="btn-secondary px-3 py-2 text-sm hover:!text-red-600"
            disabled={busy}
            onClick={() => void act('cancel', 'Anulować wiadomość? Linki klienta przestaną działać. Zwrot płatności wykonaj osobno w Stripe.')}
          >
            <i className="fa-solid fa-ban mr-1.5" /> Anuluj
          </button>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Personalizacja</h3>
          {data.personalization ? (
            <dl className="space-y-1.5 text-sm">
              {Object.entries(FIELD_LABELS).map(([key, label]) => {
                const raw = data.personalization?.[key];
                if (!raw) return null;
                const value = key === 'addressForm' ? ADDRESS_FORM_LABELS[raw] ?? raw : raw;
                return (
                  <div key={key} className="grid grid-cols-[8.5rem_1fr] gap-2">
                    <dt className="text-gray-500">{label}</dt>
                    <dd className="text-gray-800 break-words">{value}</dd>
                  </div>
                );
              })}
            </dl>
          ) : (
            <p className="text-sm text-gray-500">Klient jeszcze nie uzupełnił danych.</p>
          )}
          <p className="mt-2 text-xs text-gray-400">Poprawki klienta: {data.submitCount}</p>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Nagranie</h3>
          {data.audio ? (
            <div className="space-y-2 text-sm">
              <p className="text-gray-700">
                {formatDuration(data.audio.durationSeconds)} · {data.audio.bytes ? `${Math.round(data.audio.bytes / 1024)} KB` : '—'} ·{' '}
                {data.audio.source === 'upload' ? 'wgrane ręcznie' : data.audio.source === 'tts' ? 'synteza' : data.audio.source}
              </p>
              {audioUrl ? (
                <audio controls src={audioUrl} className="w-full" />
              ) : (
                <button type="button" className="btn-secondary px-3 py-1.5 text-xs" disabled={audioLoading} onClick={() => void loadAudio()}>
                  <i className={`fa-solid ${audioLoading ? 'fa-circle-notch fa-spin' : 'fa-play'} mr-1.5`} /> Odsłuchaj
                </button>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              Brak nagrania.{' '}
              {data.ttsAutomation ? 'Synteza uruchomi się po akceptacji tekstu.' : 'Automatyczna synteza jest wyłączona — wgraj MP3.'}
            </p>
          )}
          {data.script && !closed && data.status !== 'DELIVERED' && (
            <label className="mt-3 inline-flex cursor-pointer items-center gap-2 btn-secondary px-3 py-1.5 text-xs">
              <i className={`fa-solid ${uploading ? 'fa-circle-notch fa-spin' : 'fa-upload'}`} />
              {data.audio ? 'Podmień MP3' : 'Wgraj MP3'}
              <input
                type="file"
                accept="audio/mpeg,.mp3"
                className="sr-only"
                disabled={busy}
                onChange={(e) => {
                  void onFile(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </label>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Tekst Mikołaja {data.script ? `· ${data.script.wordCount} słów · ~${data.script.estimatedSeconds} s` : ''}
          </h3>
          {data.script && EDITABLE.includes(data.status) && !editingScript && (
            <button type="button" className="text-xs underline text-gray-600" onClick={() => { setScriptDraft(data.script?.text ?? ''); setEditingScript(true); }}>
              Edytuj
            </button>
          )}
        </div>
        {editingScript ? (
          <div className="space-y-2">
            <textarea className="input-field min-h-[14rem] font-serif text-sm leading-relaxed" value={scriptDraft} onChange={(e) => setScriptDraft(e.target.value)} />
            <div className="flex gap-2">
              <button type="button" className="btn-primary px-4 py-1.5 text-sm" disabled={saving} onClick={() => void submitScript()}>Zapisz</button>
              <button type="button" className="btn-secondary px-4 py-1.5 text-sm" onClick={() => setEditingScript(false)}>Anuluj</button>
            </div>
          </div>
        ) : data.script ? (
          <p className="whitespace-pre-line rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm leading-relaxed text-gray-800">{data.script.text}</p>
        ) : (
          <p className="text-sm text-gray-500">Tekst powstanie po uzupełnieniu personalizacji.</p>
        )}
      </div>

      <Timeline data={data} />
    </div>
  );
}

function Timeline({ data }: { data: SantaDetail }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">E-maile</h3>
        {data.deliveries.length === 0 ? (
          <p className="text-sm text-gray-500">Brak.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {data.deliveries.map((d) => (
              <li key={`${d.type}-${d.version}`} className="flex justify-between gap-2">
                <span className="text-gray-700">{d.type} v{d.version}</span>
                <span className={d.status === 'sent' ? 'text-green-700' : d.status === 'failed' ? 'text-red-600' : 'text-gray-500'}>
                  {d.status}{d.attempts > 1 ? ` (${d.attempts}×)` : ''} · {formatDate(d.sentAt || d.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Historia</h3>
        <ul className="space-y-1 text-sm max-h-56 overflow-y-auto">
          {data.events.map((e, i) => (
            <li key={`${e.type}-${i}`} className="flex justify-between gap-2">
              <span className="text-gray-700">{e.type} <span className="text-gray-400">({e.actor})</span></span>
              <span className="text-gray-500 whitespace-nowrap">{formatDate(e.at)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
