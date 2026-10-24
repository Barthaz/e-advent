import { ADMIN_API_BASE } from '../api/apiBase';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppSelector } from '../hooks/useAppDispatch';
import { getInpostStatusLabel, inpostTrackingUrl } from '../utils/inpostStatus';

export interface SavedInpostDelivery {
  type: string; price: number; profile: string; environment: string;
  point?: { id: string; name: string; address: string } | null;
  receiver: { first_name: string; last_name: string; email: string; phone: string;
    address?: { street: string; building_number: string; flat_number?: string; city: string; post_code: string } };
  parcel: { dimensions: { length: number; width: number; height: number }; weight: { amount: number }; template?: string };
}
interface Shipment {
  shipmentId: string | null; state: string; providerStatus: string | null; trackingNumber: string | null;
  labelReady: boolean; labelDownloadedAt: string | null; shipped: boolean;
  dispatched: boolean; shippedNotified: boolean;
  offerId: number | null; offerPrice: number | null; canBuy: boolean; needsReview: boolean;
  email?: string; emailError?: string | null;
  shippedEmail?: string; shippedEmailError?: string | null;
}
type Notice = { kind: 'success' | 'warning'; text: string };

const PREPARED_NOTICE: Record<string, Notice> = {
  sent: { kind: 'success', text: 'Wygenerowano etykietę i pobrano PDF. Wysłano do klienta mail „Paczka przygotowana”.' },
  skipped: { kind: 'success', text: 'Etykieta pobrana. Klient dostał już mail „Paczka przygotowana”.' },
};
const SHIPPED_NOTICE: Record<string, Notice> = {
  sent: { kind: 'success', text: 'Oznaczono jako wysłane. Wysłano do klienta mail, że paczka została nadana.' },
  skipped: { kind: 'success', text: 'Zamówienie jest już oznaczone jako wysłane. Klient dostał mail o nadaniu.' },
};

export default function InpostShipmentCard({ orderId, delivery, paid, onRefresh, compact = false }: {
  orderId: string; delivery: SavedInpostDelivery; paid: boolean; onRefresh: () => void; compact?: boolean;
}) {
  const token = useAppSelector(s => s.auth.token);
  const [shipment, setShipment] = useState<Shipment>();
  const [busy, setBusy] = useState(false);
  const [waitingForOffers, setWaitingForOffers] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [shipmentId, setShipmentId] = useState('');
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  const call = useCallback(async (action = '', body?: unknown) => {
    const response = await fetch(`${ADMIN_API_BASE}/orders/${encodeURIComponent(orderId)}/inpost${action ? '/' + action : ''}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(action && action !== 'label' ? { method: 'POST', body: JSON.stringify(body || {}) } : {}),
    });
    if (!response.ok) {
      const e = await response.json().catch(() => ({}));
      throw new Error(e.error || 'Nie udało się pobrać przesyłki.');
    }
    return response;
  }, [orderId, token]);
  const load = useCallback(async (action = '') => (await call(action)).json() as Promise<Shipment>, [call]);

  useEffect(() => {
    if (!paid) return;
    let active = true;
    load().then(async data => {
      if (!active) return;
      if (!data.shipmentId && !data.needsReview) {
        if (active) setBusy(true);
        try {
          data = await load('create');
        } catch (e) {
          if (active) setError(e instanceof Error ? e.message : 'Nie udało się utworzyć przesyłki.');
        } finally {
          if (active) setBusy(false);
        }
      }
      if (!active) return;
      setShipment(data);
      if (data.shipmentId && data.providerStatus !== 'delivered' && !data.needsReview) {
        const fresh = await load('refresh');
        if (active) { setShipment(fresh); if (fresh.providerStatus !== data.providerStatus) onRefresh(); }
      }
    }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, paid]);

  async function waitForOffers() {
    setWaitingForOffers(true);
    try {
      for (let attempt = 0; attempt < 8 && mounted.current; attempt++) {
        await new Promise(r => setTimeout(r, 2500));
        const fresh = await load('refresh');
        if (!mounted.current) return fresh;
        setShipment(fresh);
        if (fresh.canBuy || fresh.labelReady || fresh.needsReview) return fresh;
      }
    } catch { /* manual refresh remains available */ }
    finally { if (mounted.current) setWaitingForOffers(false); }
    return mounted.current ? await load() : undefined;
  }

  async function downloadLabel(current?: Shipment) {
    const response = await call('label');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inpost-${current?.trackingNumber || shipment?.trackingNumber || orderId}.pdf`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    const email = current?.email === 'sent'
      ? 'sent'
      : (response.headers.get('X-Shipment-Email') || current?.email || 'failed');
    const reason = decodeURIComponent(response.headers.get('X-Shipment-Email-Error') || current?.emailError || '');
    setNotice(PREPARED_NOTICE[email] ?? { kind: 'warning', text: `Etykieta pobrana, ale mail do klienta nie został wysłany${reason ? `: ${reason}` : ''}. Pobierz etykietę ponownie, aby ponowić wysyłkę maila.` });
    setShipment(await load());
    onRefresh();
  }

  async function generateLabel() {
    if (busy) return;
    setBusy(true); setError(''); setNotice(null);
    try {
      let current = shipment?.labelReady ? shipment : await load('generate');
      if (mounted.current) setShipment(current);
      if (!current.labelReady && !current.canBuy && !current.needsReview && current.shipmentId) {
        const waited = await waitForOffers();
        if (!mounted.current) return;
        current = waited || current;
        setShipment(current);
      }
      if (current.canBuy && !current.labelReady) {
        current = await load('generate');
        if (mounted.current) setShipment(current);
      }
      if (current.labelReady) {
        await downloadLabel(current);
        return;
      }
      if (current.needsReview) setError('Operacja oczekuje na potwierdzenie. Odśwież status albo sprawdź przesyłkę w Managerze Paczek.');
      else setError('InPost jeszcze przygotowuje ofertę. Spróbuj ponownie za chwilę.');
      onRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nie udało się wygenerować etykiety.');
      try { setShipment(await load()); } catch { setShipment(undefined); }
    } finally { setBusy(false); }
  }

  async function markSent() {
    if (busy) return;
    setBusy(true); setError(''); setNotice(null);
    try {
      const result = await load('dispatch');
      setShipment(result);
      const email = result.shippedEmail || 'failed';
      const reason = result.shippedEmailError || '';
      setNotice(SHIPPED_NOTICE[email] ?? { kind: 'warning', text: `Oznaczono jako wysłane, ale mail do klienta nie został wysłany${reason ? `: ${reason}` : ''}. Kliknij ponownie, aby ponowić wysyłkę maila.` });
      onRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nie udało się oznaczyć wysyłki.');
      try { setShipment(await load()); } catch { setShipment(undefined); }
    } finally { setBusy(false); }
  }

  async function act(action: string, body?: unknown) {
    if (busy) return;
    setBusy(true); setError(''); setNotice(null);
    try {
      if (action === 'label') {
        await downloadLabel();
        return;
      }
      const result = await (await call(action, body)).json() as Shipment;
      setShipment(result);
      onRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nie udało się wykonać operacji.');
      try { setShipment(await load()); } catch { setShipment(undefined); }
    } finally { setBusy(false); }
  }

  const r = delivery.receiver, a = r.address, p = delivery.parcel;
  const step = !shipment?.labelReady ? 1 : !shipment.shippedNotified ? 2 : 3;
  const steps = ['Generuj etykietę', 'Oznacz jako wysłane', 'Doręczenie'];
  const generateLabelText = shipment?.canBuy && shipment.offerPrice == null
    ? 'Generuj etykietę (rozliczenie wg umowy)'
    : shipment?.offerPrice == null
      ? 'Generuj etykietę'
      : `Generuj etykietę · ${shipment.offerPrice.toFixed(2)} zł brutto`;

  return <section className={compact ? 'space-y-4' : 'panel-card p-5 space-y-4'}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="heading-section">Dostawa InPost {delivery.environment === 'sandbox' && <span className="text-amber-700">— SANDBOX (test)</span>}</h2>
      {shipment?.providerStatus && <span className="text-sm font-medium text-christmas-green">{getInpostStatusLabel(shipment.providerStatus)}</span>}
    </div>

    {!compact && (
    <div className="grid gap-1 text-sm text-gray-700">
      <p><strong>{r.first_name} {r.last_name}</strong> · {r.phone} · {r.email}</p>
      {delivery.point
        ? <p>Paczkomat <strong>{delivery.point.id}</strong> · {delivery.point.address}</p>
        : a && <p>Kurier: {a.street} {a.building_number}{a.flat_number ? '/' + a.flat_number : ''}, {a.post_code} {a.city}</p>}
      <p>Opakowanie: {delivery.profile} · {p.dimensions.length} × {p.dimensions.width} × {p.dimensions.height} mm · {p.weight.amount} kg{p.template ? ` · gabaryt ${p.template}` : ''}</p>
      <p>Klient zapłacił za dostawę: {delivery.price.toFixed(2)} zł</p>
    </div>
    )}
    {compact && (
      <p className="text-sm text-gray-600">
        {delivery.point
          ? <>Paczkomat <strong>{delivery.point.id}</strong> · {delivery.point.address}</>
          : a ? <>Kurier: {a.street} {a.building_number}{a.flat_number ? '/' + a.flat_number : ''}, {a.post_code} {a.city}</> : null}
        {' · '}opakowanie {delivery.profile}
        {' · '}klient zapłacił {delivery.price.toFixed(2)} zł
      </p>
    )}

    {!paid ? <p className="text-sm text-gray-500">Po opłaceniu przesyłka powstanie w InPost automatycznie. Etykietę kupujesz tutaj ręcznie — konto sklepu nie jest obciążane samo.</p> : <>
      <ol className="grid grid-cols-3 gap-2 text-xs">
        {steps.map((label, i) => {
          const n = i + 1;
          const done = n < step || (n === 3 && shipment?.providerStatus === 'delivered');
          return <li key={label} className={`rounded-lg border px-2.5 py-2 ${done ? 'border-christmas-green bg-green-50 text-christmas-green' : n === step ? 'border-amber-400 bg-amber-50 text-amber-900 font-medium' : 'border-gray-200 text-gray-400'}`}>
            {done ? '✓' : n}. {label}
          </li>;
        })}
      </ol>

      {(shipment?.shipmentId || shipment?.trackingNumber) && <div className="text-sm space-y-1">
        {shipment.shipmentId && <p>ID przesyłki InPost: <span className="font-mono">{shipment.shipmentId}</span></p>}
        {shipment.trackingNumber && <p>Numer śledzenia: <strong className="font-mono">{shipment.trackingNumber}</strong> · <a className="underline" href={inpostTrackingUrl(shipment.trackingNumber)} target="_blank" rel="noreferrer">Śledź przesyłkę</a></p>}
      </div>}

      <div className="flex flex-wrap gap-3">
        {paid && !shipment?.labelReady && !shipment?.needsReview && (
          <button className="btn-primary" disabled={busy || !shipment || waitingForOffers} onClick={() => void generateLabel()}>
            {generateLabelText}
          </button>
        )}
        {shipment?.labelReady && (
          <button className="btn-secondary" disabled={busy} onClick={() => void act('label')}>
            {shipment.labelDownloadedAt ? 'Pobierz etykietę PDF ponownie' : 'Pobierz etykietę PDF'}
          </button>
        )}
        {shipment?.labelReady && !shipment.shippedNotified && (
          <button className="btn-primary" disabled={busy} onClick={() => void markSent()}>
            Oznacz jako wysłane
          </button>
        )}
        {shipment?.shipmentId && !shipment.labelReady && !shipment.canBuy && !shipment.needsReview && (
          <button className="btn-secondary" disabled={busy || waitingForOffers} onClick={() => void act('offers')}>Odśwież oferty</button>
        )}
        <button className="btn-secondary" disabled={busy} onClick={() => void act('refresh')}>Odśwież status</button>
      </div>

      {waitingForOffers && <p className="text-sm text-gray-500" aria-live="polite">InPost przygotowuje oferty… sprawdzam automatycznie, potem kupię etykietę.</p>}
      {step === 1 && <p className="text-sm text-gray-600">Przesyłka w InPost powstaje po płatności. „Generuj etykietę” opłaca ofertę z konta sklepu, wysyła klientowi mail z numerem śledzenia i pobiera PDF.</p>}
      {step === 2 && <p className="text-sm text-gray-600">Naklej etykietę i nadaj paczkę. Gdy wyjdzie z magazynu, kliknij „Oznacz jako wysłane” — klient dostanie mail, że paczka została nadana.</p>}
      {shipment?.shippedNotified && shipment.providerStatus !== 'delivered' && <p className="text-sm text-christmas-green">Klient dostał informację o nadaniu.</p>}
      {shipment?.providerStatus === 'delivered' && <p className="text-sm text-christmas-green">Paczka doręczona.</p>}

      {shipment?.needsReview && <p className="text-amber-800 text-sm">Operacja oczekuje na potwierdzenie. Odśwież status. Jeśli stan się nie zmienia, sprawdź tę przesyłkę w Managerze Paczek przed kolejną operacją.</p>}
      {shipment?.needsReview && !shipment.shipmentId && <div className="space-y-2 text-sm">
        <p>Po sprawdzeniu referencji zamówienia w Managerze możesz połączyć utworzoną przesyłkę. Serwer sprawdzi zgodność odbiorcy i paczki.</p>
        <label className="block">ID przesyłki InPost <input className="input-field" value={shipmentId} onChange={e => setShipmentId(e.target.value)} /></label>
        <button className="btn-secondary" disabled={busy || !/^\d+$/.test(shipmentId)} onClick={() => void act('reconcile', { shipmentId })}>Sprawdź i połącz przesyłkę</button>
      </div>}
      <p className="text-xs text-gray-400">Odbiór przez kuriera zamów w Managerze Paczek zgodnie z umową — wygenerowanie etykiety go nie zamawia.</p>
    </>}
    {busy && <p className="text-sm" aria-live="polite">Trwa operacja InPost…</p>}
    {notice && <p role="status" className={notice.kind === 'success' ? 'text-sm text-christmas-green' : 'text-sm text-amber-800'}>{notice.text}</p>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </section>;
}
