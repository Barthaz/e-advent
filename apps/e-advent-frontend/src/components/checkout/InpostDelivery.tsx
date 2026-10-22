import { useEffect, useRef, useState } from 'react';

import { shippingApi, type InpostChoice, type Quote } from './useInpostQuote';

interface Point { name: string; address?: { line1?: string; line2?: string } }
interface GeoApi { changePointsType: (type: string) => void; addPointSelectedCallback: (fn: (p: Point) => void) => void }

function Geowidget({ onSelect }: { onSelect: (p: Point) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const callback = useRef(onSelect);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => { callback.current = onSelect; }, [onSelect]);
  useEffect(() => {
    const controller = new AbortController();
    let widget: HTMLElement | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    shippingApi<{ environment: string; geowidgetToken: string }>('config', undefined, controller.signal).then(c => {
      if (controller.signal.aborted) return;
      if (!c.geowidgetToken) throw new Error('Mapa Paczkomatów nie jest jeszcze skonfigurowana. Wybierz kuriera lub skontaktuj się ze sklepem.');
      const base = c.environment === 'production' ? 'https://geowidget.inpost.pl' : 'https://sandbox-easy-geowidget-sdk.easypack24.net';
      if (!document.querySelector('link[data-inpost]')) {
        const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = `${base}/inpost-geowidget.css`; css.dataset.inpost = 'true'; document.head.appendChild(css);
      }
      widget = document.createElement('inpost-geowidget');
      widget.setAttribute('token', c.geowidgetToken);
      widget.setAttribute('language', 'pl');
      widget.setAttribute('config', 'parcelCollect');
      widget.className = 'inpost-geowidget-el';
      widget.style.cssText = 'display:block;width:100%;height:100%;min-height:100%;';
      widget.addEventListener('inpost.geowidget.init', event => {
        clearTimeout(timeout);
        setError('');
        const api = (event as CustomEvent<{ api: GeoApi }>).detail.api;
        api.changePointsType('PARCEL_LOCKER');
        api.addPointSelectedCallback(p => { if (!controller.signal.aborted) callback.current(p); });
      });
      timeout = setTimeout(() => { if (!controller.signal.aborted) setError('Mapa nie odpowiedziała. Sprawdź połączenie i spróbuj ponownie.'); }, 20000);
      host.current?.appendChild(widget);
      if (!document.querySelector('script[data-inpost]')) {
        const script = document.createElement('script'); script.src = `${base}/inpost-geowidget.js`; script.defer = true; script.dataset.inpost = 'true';
        script.onerror = () => { script.remove(); if (!controller.signal.aborted) setError('Nie udało się załadować mapy InPost. Spróbuj ponownie.'); };
        document.head.appendChild(script);
      }
    }).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => { controller.abort(); clearTimeout(timeout); widget?.remove(); };
  }, [retry]);
  return (
    <>
      <div ref={host} className="inpost-map-host" aria-label="Mapa Paczkomatów InPost" />
      {error && (
        <p className="mt-3 text-sm text-christmas-red" role="alert">
          {error}{' '}
          <button
            type="button"
            className="underline font-medium"
            onClick={() => { setError(''); setRetry(n => n + 1); }}
          >
            Ponów ładowanie mapy
          </button>
        </p>
      )}
    </>
  );
}

export default function InpostDelivery({ value, onChange, quote, error, retry }: {
  value: InpostChoice; onChange: (choice: InpostChoice) => void; quote?: Quote; error?: string; retry: () => void;
}) {
  const parcel = value.type === 'parcel_inpost';

  return (
    <section className="rounded-2xl border border-christmas-gold/30 bg-white/45 p-4 md:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="heading-section">Dostawa InPost</h2>
          <p className="text-parchment-muted text-sm mt-1">
            Wybierz Paczkomat albo kuriera — koszt doliczymy do zamówienia.
          </p>
        </div>
        <p className="text-sm text-parchment-text sm:text-right" aria-live="polite">
          {quote ? (
            <>
              <span className="block text-parchment-muted text-xs uppercase tracking-wide">Koszt dostawy</span>
              <span className="font-display text-2xl font-semibold text-christmas-green">
                {quote.price > 0 ? `${quote.price.toFixed(2)} zł` : 'Gratis'}
              </span>
            </>
          ) : error ? (
            <span className="text-christmas-red">{error}</span>
          ) : (
            <span className="text-parchment-muted">Obliczam koszt dostawy…</span>
          )}
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <label className={`option-card option-card--delivery ${parcel ? 'option-card--selected' : ''}`}>
          <input
            type="radio"
            name="delivery"
            aria-label="Paczkomat InPost"
            checked={parcel}
            onChange={() => onChange({ type: 'parcel_inpost' })}
          />
          <span className="option-card-icon" aria-hidden>
            <i className="fas fa-map-marker-alt" />
          </span>
          <span>
            <span className="block font-semibold text-parchment-text">Paczkomat InPost</span>
            <span className="block text-sm text-parchment-muted mt-0.5">
              Odbierz, kiedy Ci wygodnie — mapa poniżej.
            </span>
          </span>
        </label>
        <label className={`option-card option-card--delivery ${!parcel ? 'option-card--selected' : ''}`}>
          <input
            type="radio"
            name="delivery"
            aria-label="Kurier InPost"
            checked={!parcel}
            onChange={() => onChange({ type: 'courier_inpost' })}
          />
          <span className="option-card-icon" aria-hidden>
            <i className="fas fa-truck" />
          </span>
          <span>
            <span className="block font-semibold text-parchment-text">Kurier InPost</span>
            <span className="block text-sm text-parchment-muted mt-0.5">
              Przesyłka pod wskazany adres.
            </span>
          </span>
        </label>
      </div>

      <button type="button" className="text-sm text-christmas-green underline hover:text-christmas-gold" onClick={retry}>
        Odśwież cenę dostawy
      </button>

      {parcel && (
        <div className="space-y-3">
          <p className="text-parchment-text text-sm">
            Wpisz miasto lub ulicę na mapie i wybierz Paczkomat, w którym odbieresz zamówienie.
          </p>
          <Geowidget
            onSelect={(p) => onChange({
              type: 'parcel_inpost',
              pointId: p.name,
              pointLabel: [p.name, p.address?.line1, p.address?.line2].filter(Boolean).join(', '),
            })}
          />
          {value.pointId ? (
            <p className="rounded-xl border border-christmas-green/30 bg-white/70 px-4 py-3 text-parchment-text flex items-start gap-3" aria-live="polite">
              <i className="fas fa-check-circle text-christmas-green mt-0.5" aria-hidden />
              <span>
                <span className="block text-xs uppercase tracking-wide text-christmas-green font-semibold mb-1">
                  Wybrany Paczkomat
                </span>
                <span className="font-semibold">{value.pointLabel || value.pointId}</span>
              </span>
            </p>
          ) : (
            <p className="text-sm text-parchment-muted">Nie wybrano jeszcze Paczkomatu.</p>
          )}
        </div>
      )}
    </section>
  );
}
