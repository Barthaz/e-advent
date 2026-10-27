import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from 'react-redux';
import scratchPresets from '../../../../packages/content/catalog/scratch-presets.json' with { type: 'json' };
import catalog from '../../../../packages/content/catalog/e-advent-calendars-data.json' with { type: 'json' };
import {
  useCreateCertificateMutation,
  useCreateInteractiveMutation,
  useCreateScratchMutation,
  useGetGeneratedQuery,
  type GeneratorKind,
} from '../api/generatorApi';
import { downloadGeneratorCertificatePdf } from '../api/generatorExport';
import { downloadScratchExport } from '../api/scratchExport';
import ExportGeneratingModal from '../components/calendar/ExportGeneratingModal';
import Badge from '../components/ui/Badge';
import DataTable, { type Column } from '../components/ui/DataTable';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { STOREFRONT_URL } from '../config/env';
import { useToast } from '../hooks/useToast';
import type { RootState } from '../store';
import type { CalendarDetail } from '../types/calendar';
import { formatDate, getProductTypeLabel } from '../utils/formatters';

type TabId = 'certificate' | 'scratch' | 'interactive';

const TABS: Array<{ id: TabId; label: string; icon: string }> = [
  { id: 'certificate', label: 'Certyfikat', icon: 'fa-certificate' },
  { id: 'scratch', label: 'Zdrapka', icon: 'fa-screwdriver-wrench' },
  { id: 'interactive', label: 'Interaktywny', icon: 'fa-mobile-screen' },
];

const SCRATCH_COLORS = [
  { id: 'green' as const, label: 'Zielona Gwiazdka', swatch: '#1e4a32' },
  { id: 'red' as const, label: 'Czerwony Mikołaj', swatch: '#7a1c1c' },
  { id: 'blue' as const, label: 'Błękitna Noc', swatch: '#1b3b63' },
];

type CatalogSet = {
  setNumber: number;
  title: string;
  tasks: Array<{ order: number; title: string; text: string }>;
};

const catalogSets = ((catalog as { sets?: CatalogSet[] }).sets || []) as CatalogSet[];
const presets = scratchPresets as Array<{
  name: string;
  shortDescription?: string;
  tasks: Array<{ day: number; title: string; description: string }>;
}>;

function emptyDays(): Array<{ day: number; title: string; description: string }> {
  return Array.from({ length: 24 }, (_, i) => ({ day: i + 1, title: '', description: '' }));
}

function kindOf(row: CalendarDetail): GeneratorKind {
  if (row.product_type === 'certificate') return 'certificate';
  if (row.product_type === 'scratch') return 'scratch';
  return 'interactive';
}

export default function GeneratorPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const store = useStore<RootState>();
  const [tab, setTab] = useState<TabId>('certificate');
  const [listType, setListType] = useState<GeneratorKind | ''>('');
  const [exporting, setExporting] = useState<'pdf' | 'png' | null>(null);

  const { data, isLoading, isError, refetch } = useGetGeneratedQuery({ type: listType, limit: 50 });
  const [createCertificate, { isLoading: creatingCert }] = useCreateCertificateMutation();
  const [createScratch, { isLoading: creatingScratch }] = useCreateScratchMutation();
  const [createInteractive, { isLoading: creatingInteractive }] = useCreateInteractiveMutation();

  const [childName, setChildName] = useState('');
  const [certVariant, setCertVariant] = useState<'on' | 'ona'>('ona');

  const [scratchTitle, setScratchTitle] = useState('Kalendarz zdrapka');
  const [scratchColor, setScratchColor] = useState<'green' | 'red' | 'blue'>('red');
  const [scratchMode, setScratchMode] = useState<'preset' | 'custom'>('preset');
  const [scratchPreset, setScratchPreset] = useState(0);
  const [scratchDays, setScratchDays] = useState(emptyDays);

  const [interactiveTitle, setInteractiveTitle] = useState('Kalendarz interaktywny');
  const [interactiveEmail, setInteractiveEmail] = useState('');
  const [openingMethod, setOpeningMethod] = useState<'app' | 'email' | 'online'>('online');
  const [dailyEmail, setDailyEmail] = useState('');
  const [catalogSet, setCatalogSet] = useState('');
  const [interactiveDays, setInteractiveDays] = useState(emptyDays);
  const [lastAccess, setLastAccess] = useState<{ code: string; id: string } | null>(null);

  const items = data?.items ?? [];

  const createdLink = useMemo(() => {
    if (!lastAccess) return '';
    return `${STOREFRONT_URL}/kalendarz/${lastAccess.id}`;
  }, [lastAccess]);

  const apiError = (err: unknown, fallback: string) => {
    const message = (err as { data?: { message?: string; error?: string } })?.data?.message
      || (err as { data?: { error?: string } })?.data?.error
      || (err as { message?: string })?.message
      || fallback;
    toast.error(message);
  };

  const handleCertificate = async () => {
    const name = childName.replace(/\s+/g, ' ').trim();
    if (name.length < 2) {
      toast.error('Imię musi mieć co najmniej 2 znaki.');
      return;
    }
    setExporting('pdf');
    try {
      const calendar = await createCertificate({ childName: name, variant: certVariant }).unwrap();
      await downloadGeneratorCertificatePdf(() => store.getState(), calendar.id, certVariant);
      toast.success('Pobrano certyfikat.');
    } catch (err) {
      apiError(err, 'Nie udało się wygenerować certyfikatu.');
    } finally {
      setExporting(null);
    }
  };

  const handleScratch = async () => {
    setExporting('png');
    try {
      const payload = scratchMode === 'preset'
        ? { title: scratchTitle, color: scratchColor, presetId: scratchPreset }
        : {
          title: scratchTitle,
          color: scratchColor,
          tasks: scratchDays.map((d) => ({ day: d.day, title: d.title, description: d.description })),
        };
      const calendar = await createScratch(payload).unwrap();
      await downloadScratchExport(() => store.getState(), calendar.id, 'png');
      toast.success('Pobrano PNG zdrapki.');
    } catch (err) {
      apiError(err, 'Nie udało się wygenerować zdrapki.');
    } finally {
      setExporting(null);
    }
  };

  const applyCatalogSet = (value: string) => {
    setCatalogSet(value);
    const set = catalogSets.find((s) => String(s.setNumber) === value);
    if (!set) return;
    const picked = [...set.tasks].sort((a, b) => a.order - b.order).slice(0, 24);
    setInteractiveDays(emptyDays().map((slot, i) => {
      const task = picked[i];
      return {
        day: slot.day,
        title: task?.title || '',
        description: task?.text || '',
      };
    }));
  };

  const handleInteractive = async () => {
    if (!interactiveEmail.trim()) {
      toast.error('Podaj adres e-mail właściciela kalendarza.');
      return;
    }
    try {
      const result = await createInteractive({
        title: interactiveTitle,
        email: interactiveEmail.trim(),
        openingMethod,
        dailyContentEmail: openingMethod === 'email' ? (dailyEmail.trim() || interactiveEmail.trim()) : undefined,
        tasks: interactiveDays.map((d) => ({
          day: d.day,
          title: d.description || d.title,
          task: d.description || d.title,
        })),
      }).unwrap();
      setLastAccess({ code: result.accessCode, id: result.calendar.id });
      toast.success('Kalendarz interaktywny gotowy. Kod dostępu jest na liście — bez maila powitalnego.');
    } catch (err) {
      apiError(err, 'Nie udało się wygenerować kalendarza.');
    }
  };

  const copyText = async (value: string, ok: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(ok);
    } catch {
      toast.error('Nie udało się skopiować.');
    }
  };

  const handleListDownload = async (row: CalendarDetail) => {
    const kind = kindOf(row);
    if (kind === 'certificate') {
      const variant = row.author === 'on' ? 'on' : 'ona';
      setExporting('pdf');
      try {
        await downloadGeneratorCertificatePdf(() => store.getState(), row.id, variant);
        toast.success('Pobrano certyfikat.');
      } catch (err) {
        apiError(err, 'Nie udało się pobrać certyfikatu.');
      } finally {
        setExporting(null);
      }
      return;
    }
    if (kind === 'scratch') {
      setExporting('png');
      try {
        await downloadScratchExport(() => store.getState(), row.id, 'png');
        toast.success('Pobrano PNG zdrapki.');
      } catch (err) {
        apiError(err, 'Nie udało się pobrać zdrapki.');
      } finally {
        setExporting(null);
      }
    }
  };

  const columns: Column<CalendarDetail>[] = [
    {
      key: 'type',
      header: 'Typ',
      render: (row) => (
        <Badge variant={kindOf(row)} label={getProductTypeLabel(row.product_type)} />
      ),
    },
    {
      key: 'title',
      header: 'Nazwa',
      render: (row) => <span className="font-medium text-gray-800">{row.title || '—'}</span>,
    },
    {
      key: 'email',
      header: 'E-mail',
      render: (row) => row.customer_email || '—',
    },
    {
      key: 'code',
      header: 'Kod',
      render: (row) => row.access_code
        ? <span className="font-mono tracking-widest">{row.access_code}</span>
        : '—',
    },
    {
      key: 'created',
      header: 'Utworzono',
      render: (row) => formatDate(row.created_at),
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="btn-secondary px-2 py-1 text-xs" onClick={() => navigate(`/calendars/${row.id}`)}>
            Podgląd
          </button>
          {kindOf(row) !== 'interactive' && (
            <button type="button" className="btn-secondary px-2 py-1 text-xs" onClick={() => void handleListDownload(row)}>
              Pobierz
            </button>
          )}
          {row.access_code && (
            <button
              type="button"
              className="btn-secondary px-2 py-1 text-xs"
              onClick={() => void copyText(row.access_code || '', 'Skopiowano kod dostępu.')}
            >
              Kopiuj kod
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in-up">
      {exporting && <ExportGeneratingModal kind={exporting} />}
      <div>
        <h1 className="heading-page">Generator</h1>
        <p className="text-sm text-gray-500 mt-1">
          Twórz certyfikaty, zdrapki i kalendarze interaktywne bez zamówienia. Codzienne maile z okienkami idą tym samym mechanizmem co w sklepie.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={tab === item.id ? 'btn-primary px-3 py-2 text-sm' : 'btn-secondary px-3 py-2 text-sm'}
            onClick={() => setTab(item.id)}
          >
            <i className={`fa-solid ${item.icon}`} />
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'certificate' && (
        <section className="panel-card p-5 space-y-4">
          <h2 className="heading-section">Nowy certyfikat</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Imię</label>
              <input className="input-field" value={childName} onChange={(e) => setChildName(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Wariant</label>
              <select className="admin-select" value={certVariant} onChange={(e) => setCertVariant(e.target.value as 'on' | 'ona')}>
                <option value="on">ON</option>
                <option value="ona">ONA</option>
              </select>
            </div>
          </div>
          <button type="button" className="btn-primary" disabled={creatingCert || exporting != null} onClick={() => void handleCertificate()}>
            {creatingCert || exporting === 'pdf' ? 'Generowanie…' : 'Utwórz i pobierz PDF'}
          </button>
        </section>
      )}

      {tab === 'scratch' && (
        <section className="panel-card p-5 space-y-4">
          <h2 className="heading-section">Nowa zdrapka A3</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Tytuł</label>
              <input className="input-field" value={scratchTitle} onChange={(e) => setScratchTitle(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Treść okienek</label>
              <select
                className="admin-select"
                value={scratchMode}
                onChange={(e) => setScratchMode(e.target.value as 'preset' | 'custom')}
              >
                <option value="preset">Szablon</option>
                <option value="custom">Własne okienka</option>
              </select>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Kolor</p>
            <div className="flex flex-wrap gap-2">
              {SCRATCH_COLORS.map((color) => (
                <button
                  key={color.id}
                  type="button"
                  className={`px-3 py-2 text-sm rounded-lg border ${scratchColor === color.id ? 'border-christmas-green ring-2 ring-christmas-green/30' : 'border-gray-200'}`}
                  onClick={() => setScratchColor(color.id)}
                >
                  <span className="inline-block w-3 h-3 rounded-full mr-2 align-middle" style={{ background: color.swatch }} />
                  {color.label}
                </button>
              ))}
            </div>
          </div>
          {scratchMode === 'preset' ? (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Szablon</label>
              <select
                className="admin-select"
                value={scratchPreset}
                onChange={(e) => setScratchPreset(Number(e.target.value))}
              >
                {presets.map((preset, index) => (
                  <option key={preset.name} value={index}>{preset.name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">{presets[scratchPreset]?.shortDescription}</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
              {scratchDays.map((day, index) => (
                <div key={day.day} className="grid grid-cols-[2.5rem_1fr_2fr] gap-2 items-center">
                  <span className="text-xs text-gray-400">{day.day}</span>
                  <input
                    className="input-field py-1.5 text-sm"
                    placeholder="Tytuł"
                    value={day.title}
                    onChange={(e) => setScratchDays((prev) => prev.map((d, i) => i === index ? { ...d, title: e.target.value } : d))}
                  />
                  <input
                    className="input-field py-1.5 text-sm"
                    placeholder="Treść okienka"
                    value={day.description}
                    onChange={(e) => setScratchDays((prev) => prev.map((d, i) => i === index ? { ...d, description: e.target.value } : d))}
                  />
                </div>
              ))}
            </div>
          )}
          <button type="button" className="btn-primary" disabled={creatingScratch || exporting != null} onClick={() => void handleScratch()}>
            {creatingScratch || exporting === 'png' ? 'Generowanie…' : 'Utwórz i pobierz PNG'}
          </button>
        </section>
      )}

      {tab === 'interactive' && (
        <section className="panel-card p-5 space-y-4">
          <h2 className="heading-section">Nowy kalendarz interaktywny</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Tytuł</label>
              <input className="input-field" value={interactiveTitle} onChange={(e) => setInteractiveTitle(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">E-mail właściciela</label>
              <input
                className="input-field"
                type="email"
                value={interactiveEmail}
                onChange={(e) => setInteractiveEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Sposób otwierania</label>
              <select
                className="admin-select"
                value={openingMethod}
                onChange={(e) => setOpeningMethod(e.target.value as 'app' | 'email' | 'online')}
              >
                <option value="online">Otwieranie online</option>
                <option value="email">Codzienny e-mail</option>
                <option value="app">Aplikacja mobilna</option>
              </select>
            </div>
            {openingMethod === 'email' && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Adres codziennej treści</label>
                <input
                  className="input-field"
                  type="email"
                  placeholder={interactiveEmail || 'ten sam co właściciel'}
                  value={dailyEmail}
                  onChange={(e) => setDailyEmail(e.target.value)}
                />
              </div>
            )}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Wczytaj zestaw z katalogu</label>
              <select className="admin-select" value={catalogSet} onChange={(e) => applyCatalogSet(e.target.value)}>
                <option value="">— ręcznie —</option>
                {catalogSets.map((set) => (
                  <option key={set.setNumber} value={set.setNumber}>{set.title}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
            {interactiveDays.map((day, index) => (
              <div key={day.day} className="grid grid-cols-[2.5rem_1fr] gap-2 items-start">
                <span className="text-xs text-gray-400 pt-2">{day.day}</span>
                <textarea
                  className="input-field text-sm min-h-[2.5rem]"
                  rows={2}
                  placeholder="Treść okienka"
                  value={day.description}
                  onChange={(e) => setInteractiveDays((prev) => prev.map((d, i) => i === index ? { ...d, description: e.target.value } : d))}
                />
              </div>
            ))}
          </div>
          <button type="button" className="btn-primary" disabled={creatingInteractive} onClick={() => void handleInteractive()}>
            {creatingInteractive ? 'Generowanie…' : 'Utwórz kalendarz i kod dostępu'}
          </button>
          {lastAccess && (
            <div className="parchment-card p-4 space-y-2">
              <p className="text-sm text-gray-700">
                Kod dostępu: <span className="font-mono text-lg font-bold tracking-[0.2em]">{lastAccess.code}</span>
              </p>
              <p className="text-xs text-gray-500 break-all">{createdLink}</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-secondary px-3 py-1.5 text-sm" onClick={() => void copyText(lastAccess.code, 'Skopiowano kod.')}>
                  Kopiuj kod
                </button>
                <button type="button" className="btn-secondary px-3 py-1.5 text-sm" onClick={() => void copyText(createdLink, 'Skopiowano link.')}>
                  Kopiuj link
                </button>
                <button type="button" className="btn-secondary px-3 py-1.5 text-sm" onClick={() => navigate(`/calendars/${lastAccess.id}`)}>
                  Otwórz w panelu
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      <section className="panel-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-3">
          <h2 className="heading-section">Wygenerowane elementy</h2>
          <div className="flex flex-wrap gap-2">
            <select
              className="admin-select"
              value={listType}
              onChange={(e) => setListType(e.target.value as GeneratorKind | '')}
            >
              <option value="">Wszystkie typy</option>
              <option value="certificate">Certyfikaty</option>
              <option value="scratch">Zdrapki</option>
              <option value="interactive">Interaktywne</option>
            </select>
            <button type="button" className="btn-secondary px-3 py-2 text-sm" onClick={() => refetch()} disabled={isLoading}>
              Odśwież
            </button>
          </div>
        </div>
        {isLoading ? (
          <LoadingSpinner label="Ładowanie wygenerowanych elementów…" />
        ) : isError ? (
          <p className="p-5 text-sm text-red-700">Nie udało się pobrać listy generatora.</p>
        ) : (
          <div className="p-3">
            <DataTable
              columns={columns}
              data={items}
              keyExtractor={(row) => row.id}
              onRowClick={(row) => navigate(`/calendars/${row.id}`)}
              emptyMessage="Brak wygenerowanych elementów."
            />
          </div>
        )}
      </section>
    </div>
  );
}
