import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import catalog from '../../../../packages/content/catalog/e-advent-calendars-data.json' with { type: 'json' };
import Badge from '../components/ui/Badge';

type CatalogTask = {
  id: string;
  order: number;
  title: string;
  text: string;
  isSpecial?: boolean;
  special?: {
    addon?: string;
    format?: string;
  };
};

type CatalogSet = {
  setNumber: number;
  title: string;
  tasks: CatalogTask[];
};

type Filter = 'all' | 'special' | 'standard';

const STOREFRONT = import.meta.env.VITE_STOREFRONT_URL;
if (!STOREFRONT) {
  throw new Error('Missing VITE_STOREFRONT_URL — set it in apps/e-advent-panel/.env');
}

const SET_DESCRIPTIONS: Record<string, string> = {
  'Świąteczny nastrój i zabawa': 'Zadania, które wprowadzą Cię w klimat świąt i poprawią humor.',
  'Porządki i przygotowania': 'Zadania pomagające uporządkować dom i przygotować się do świąt.',
  'Dobre uczynki i życzliwość': 'Zadania, które pomagają szerzyć dobro i pozytywną energię.',
  'Kreatywne i artystyczne': 'Zadania rozwijające kreatywność i artystyczną stronę świąt.',
  'Kuchenne i kulinarne': 'Zadania kuchenne i kulinarne na świąteczny czas.',
  'Refleksja i relaks': 'Zadania na spokojne chwile refleksji i relaksu w grudniu.',
};

export default function CatalogTasksPage() {
  const sets = (catalog as { sets: CatalogSet[] }).sets || [];
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [previewId, setPreviewId] = useState<string | null>(null);

  const totals = useMemo(() => {
    const tasks = sets.flatMap((set) => set.tasks);
    const special = tasks.filter((task) => task.isSpecial).length;
    return { total: tasks.length, special, standard: tasks.length - special };
  }, [sets]);

  const normalizedQuery = query.trim().toLowerCase();

  useEffect(() => {
    if (!previewId) return;
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'e-advent-preview-close') setPreviewId(null);
    };
    const main = document.querySelector('main');
    const previousOverflow = main instanceof HTMLElement ? main.style.overflowY : '';
    if (main instanceof HTMLElement) main.style.overflowY = 'hidden';
    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
      if (main instanceof HTMLElement) main.style.overflowY = previousOverflow;
    };
  }, [previewId]);

  return (
    <>
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="heading-page">Zadania</h1>
          <p className="text-sm text-gray-500 mt-1">
            Katalog predefiniowanych okienek — podgląd 1:1 ze stroną www (frontend :5173, API :3000).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="panel-card px-3 py-1.5 text-sm text-gray-700">
            <strong>{totals.total}</strong> zadań
          </span>
          <span className="panel-card px-3 py-1.5 text-sm text-amber-800">
            <strong>{totals.special}</strong> specjalnych
          </span>
          <span className="panel-card px-3 py-1.5 text-sm text-gray-600">
            <strong>{totals.standard}</strong> zwykłych
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['all', 'Wszystkie'],
              ['special', 'Specjalne'],
              ['standard', 'Zwykłe'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                filter === id
                  ? 'bg-christmas-green text-white border-christmas-green'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-christmas-gold'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="relative ml-auto min-w-[16rem] flex-1 max-w-md">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Szukaj po tytule lub treści…"
            className="w-full rounded-lg border border-gray-200 bg-white py-1.5 pl-9 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-christmas-gold focus:outline-none"
          />
        </label>
      </div>

      {sets.map((set) => {
        const visible = set.tasks.filter((task) => {
          if (filter === 'special' && !task.isSpecial) return false;
          if (filter === 'standard' && task.isSpecial) return false;
          if (!normalizedQuery) return true;
          const haystack = [task.title, task.text, task.special?.addon, task.special?.format]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return haystack.includes(normalizedQuery);
        });
        if (visible.length === 0) return null;
        const specialCount = set.tasks.filter((task) => task.isSpecial).length;
        const description = SET_DESCRIPTIONS[set.title];

        return (
          <section key={set.setNumber} className="panel-card overflow-hidden">
            <header className="px-5 py-4 border-b border-gray-100 bg-gray-50/80 flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Zestaw {set.setNumber}
                </p>
                <h2 className="font-display text-xl text-gray-800">{set.title}</h2>
                {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
              </div>
              <p className="text-sm text-gray-500 whitespace-nowrap">
                {set.tasks.length} zadań · {specialCount} specjalnych
                {(filter !== 'all' || normalizedQuery) && visible.length !== set.tasks.length
                  ? ` · pokazano ${visible.length}`
                  : ''}
              </p>
            </header>
            <ul>
              {visible.map((task) => (
                <li key={task.id} className="border-b border-gray-50 last:border-0">
                  <button
                    type="button"
                    onClick={() => setPreviewId(task.id)}
                    className="w-full text-left px-5 py-3.5 flex items-start gap-3 hover:bg-amber-50/60 transition-colors"
                  >
                    <span className="mt-0.5 w-8 h-8 shrink-0 rounded-full bg-christmas-green/10 text-christmas-green text-sm font-semibold flex items-center justify-center">
                      {task.order}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-gray-800">Dzień {task.title}</span>
                        {task.isSpecial ? (
                          <Badge variant="special" label="Specjalne" icon="fa-star" />
                        ) : (
                          <Badge variant="standard" label="Zwykłe" icon="fa-align-left" />
                        )}
                        {task.isSpecial && task.special?.format && (
                          <span className="text-[11px] uppercase tracking-wide text-amber-700/80">
                            {task.special.format}
                          </span>
                        )}
                      </span>
                      <span className="mt-1 block text-sm text-gray-500 line-clamp-2">{task.text}</span>
                    </span>
                    <i className="fa-solid fa-eye text-gray-300 mt-2" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
    {previewId && <TaskPreviewOverlay previewId={previewId} onClose={() => setPreviewId(null)} />}
    </>
  );
}

function TaskPreviewOverlay({
  previewId,
  onClose,
}: {
  previewId: string;
  onClose: () => void;
}) {
  return createPortal(
    <div className="fixed inset-0 z-[80] overflow-hidden">
      <iframe
        title="Podgląd okienka"
        src={`${STOREFRONT.replace(/\/$/, '')}/podglad-okienka/${previewId}`}
        className="block h-full w-full border-0 bg-transparent"
        allow="downloads; clipboard-write"
      />
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-[81] rounded-full w-10 h-10 text-2xl leading-none text-white/90 bg-black/40 hover:bg-black/60"
        aria-label="Zamknij podgląd"
      >
        ×
      </button>
    </div>,
    document.body
  );
}
