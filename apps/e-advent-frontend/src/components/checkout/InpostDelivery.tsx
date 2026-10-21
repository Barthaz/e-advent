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
      widget.setAttribute('token', c.geowidgetToken); widget.setAttribute('language', 'pl'); widget.setAttribute('config', 'parcelCollect');
      widget.style.display = 'block'; widget.style.height = '500px';
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
  return <><div ref={host} aria-label="Mapa Paczkomatów InPost" />{error && <p role="alert">{error} <button type="button" className="underline" onClick={() => { setError(''); setRetry(n => n + 1); }}>Ponów ładowanie mapy</button></p>}</>;
}

export default function InpostDelivery({ value, onChange, quote, error, retry }: {
  value: InpostChoice; onChange: (choice: InpostChoice) => void; quote?: Quote; error?: string; retry: () => void;
}) {
  return <section className="panel-bordered mb-6 space-y-4">
    <h2 className="heading-section">Dostawa InPost</h2>
    <div className="flex flex-wrap gap-5">
      <label><input type="radio" name="delivery" checked={value.type === 'parcel_inpost'} onChange={() => onChange({ type: 'parcel_inpost' })} /> Paczkomat InPost</label>
      <label><input type="radio" name="delivery" checked={value.type === 'courier_inpost'} onChange={() => onChange({ type: 'courier_inpost' })} /> Kurier InPost</label>
    </div>
    <p aria-live="polite">{quote ? `Koszt dostawy: ${quote.price.toFixed(2)} zł` : error || 'Obliczam koszt dostawy…'}</p>
    <button type="button" className="underline" onClick={retry}>Odśwież cenę dostawy</button>
    {value.type === 'parcel_inpost' && <>
      <p>Wybierz Paczkomat, w którym odbierzesz zamówienie.</p>
      <Geowidget onSelect={p => onChange({ type: 'parcel_inpost', pointId: p.name, pointLabel: [p.name, p.address?.line1, p.address?.line2].filter(Boolean).join(', ') })} />
      {value.pointId && <p className="font-semibold" aria-live="polite">Wybrany Paczkomat: {value.pointLabel || value.pointId}</p>}
    </>}
  </section>;
}
