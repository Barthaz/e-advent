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
  offerId: number | null; offerPrice: number | null; canBuy: boolean; needsReview: boolean;
}
type Notice = { kind: 'success' | 'warning'; text: string };

const EMAIL_NOTICE: Record<string, Notice> = {
  sent: { kind: 'success', text: 'Etykieta pobrana. Klient dostał mail „Paczka przygotowana” z numerem przesyłki.' },
  skipped: { kind: 'success', text: 'Etykieta pobrana ponownie. Mail „Paczka przygotowana” był już wysłany wcześniej.' },
};

export default function InpostShipmentCard({ orderId, delivery, paid, onRefresh }: {
  orderId: string; delivery: SavedInpostDelivery; paid: boolean; onRefresh: () => void;
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

  // On open: read the saved state, then pull the live status from InPost so
  // "wysłana / doręczona" is visible even without a reachable webhook.
  useEffect(() => {
    if (!paid) return;
    let active = true;
    load().then(async data => {
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

  // ShipX prepares offers asynchronously after creation.
  async function waitForOffers() {
    setWaitingForOffers(true);
    try {
      for (let attempt = 0; attempt < 8 && mounted.current; attempt++) {
        await new Promise(r => setTimeout(r, 2500));
        const fresh = await load('refresh');
        if (!mounted.current) return;
        setShipment(fresh);
        if (fresh.canBuy || fresh.labelReady || fresh.needsReview) return;
      }
    } catch { /* manual refresh remains available */ }
    finally { if (mounted.current) setWaitingForOffers(false); }
  }

  async function act(action: string, body?: unknown) {
    if (busy) return;
    setBusy(true); setError(''); setNotice(null);
    try {
      if (action === 'label') {
        const response = await call('label');
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `inpost-${shipment?.trackingNumber || orderId}.pdf`; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 30000);
        const email = response.headers.get('X-Shipment-Email') || 'failed';
        const reason = decodeURIComponent(response.headers.get('X-Shipment-Email-Error') || '');
        setNotice(EMAIL_NOTICE[email] ?? { kind: 'warning', text: `Etykieta pobrana, ale mail do klienta nie został wysłany${reason ? `: ${reason}` : ''}. Pobierz etykietę ponownie, aby ponowić wysyłkę maila.` });
        setShipment(await load());
        onRefresh();
        return;
      }
      const result = await (await call(action, body)).json() as Shipment;
      setShipment(result);
      onRefresh();
      if (action === 'create' && result.shipmentId && !result.canBuy && !result.labelReady) void waitForOffers();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nie udało się wykonać operacji.');
      // Reload the durable attempt after an ambiguous failure; never repeat a buy.
      try { setShipment(await load()); } catch { setShipment(undefined); }
    } finally { setBusy(false); }
  }

  const r = delivery.receiver, a = r.address, p = delivery.parcel;
  const step = !shipment || shipment.state === 'not_created' || shipment.state === 'create_rejected' ? 1
    : !shipment.labelReady ? 2 : !shipment.labelDownloadedAt ? 3 : 4;
  const steps = ['Przygotuj przesyłkę', 'Kup etykietę', 'Pobierz etykietę', 'Nadanie i doręczenie'];

  return <section className="panel-card p-5 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="heading-section">Dostawa InPost {delivery.environment === 'sandbox' && <span className="text-amber-700">— SANDBOX (test)</span>}</h2>
      {shipment?.providerStatus && <span className="text-sm font-medium text-christmas-green">{getInpostStatusLabel(shipment.providerStatus)}</span>}
    </div>

    <div className="grid gap-1 text-sm text-gray-700">
      <p><strong>{r.first_name} {r.last_name}</strong> · {r.phone} · {r.email}</p>
      {delivery.point
        ? <p>Paczkomat <strong>{delivery.point.id}</strong> · {delivery.point.address}</p>
        : a && <p>Kurier: {a.street} {a.building_number}{a.flat_number ? '/' + a.flat_number : ''}, {a.post_code} {a.city}</p>}
      <p>Opakowanie: {delivery.profile} · {p.dimensions.length} × {p.dimensions.width} × {p.dimensions.height} mm · {p.weight.amount} kg{p.template ? ` · gabaryt ${p.template}` : ''}</p>
      <p>Klient zapłacił za dostawę: {delivery.price.toFixed(2)} zł</p>
    </div>

    {!paid ? <p className="text-sm text-gray-500">Przygotowanie przesyłki będzie dostępne po potwierdzeniu płatności.</p> : <>
      <ol className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        {steps.map((label, i) => {
          const n = i + 1;
          const done = n < step || (n === 4 && shipment?.providerStatus === 'delivered');
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
        {step === 1 && <button className="btn-primary" disabled={busy || !shipment} onClick={() => act('create')}>Przygotuj przesyłkę w InPost</button>}
        {shipment?.canBuy && <button className="btn-primary" disabled={busy} onClick={() => act('buy', { offerId: shipment.offerId, acceptedPrice: shipment.offerPrice })}>
          {shipment.offerPrice == null ? 'Kup etykietę (rozliczenie wg umowy)' : `Kup etykietę za ${shipment.offerPrice.toFixed(2)} zł brutto`}
        </button>}
        {shipment?.labelReady && <button className="btn-primary" disabled={busy} onClick={() => act('label')}>
          {shipment.labelDownloadedAt ? 'Pobierz etykietę PDF ponownie' : 'Pobierz etykietę PDF i powiadom klienta'}
        </button>}
        {shipment?.shipmentId && !shipment.labelReady && !shipment.canBuy && !shipment.needsReview && <button className="btn-secondary" disabled={busy || waitingForOffers} onClick={() => act('offers')}>Odśwież oferty</button>}
        <button className="btn-secondary" disabled={busy} onClick={() => act('refresh')}>Odśwież status</button>
      </div>

      {waitingForOffers && <p className="text-sm text-gray-500" aria-live="polite">InPost przygotowuje oferty… sprawdzam automatycznie.</p>}
      {step === 3 && <p className="text-sm text-gray-600">Po pobraniu etykiety zamówienie przejdzie w status „W realizacji”, a klient dostanie jednorazowy mail z numerem przesyłki.</p>}
      {step === 4 && !shipment?.shipped && <p className="text-sm text-gray-600">Naklej etykietę i nadaj paczkę. Status „Wysłane” ustawi się sam po pierwszym skanie InPost (webhook, cron lub „Odśwież status”). Dalsze powiadomienia klient dostaje od InPost.</p>}
      {shipment?.shipped && shipment.providerStatus !== 'delivered' && <p className="text-sm text-christmas-green">Paczka jest w drodze — zamówienie oznaczone jako wysłane.</p>}
      {shipment?.providerStatus === 'delivered' && <p className="text-sm text-christmas-green">Paczka doręczona.</p>}

      {shipment?.needsReview && <p className="text-amber-800 text-sm">Operacja oczekuje na potwierdzenie. Odśwież status. Jeśli stan się nie zmienia, sprawdź tę przesyłkę w Managerze Paczek przed kolejną operacją.</p>}
      {shipment?.needsReview && !shipment.shipmentId && <div className="space-y-2 text-sm">
        <p>Po sprawdzeniu referencji zamówienia w Managerze możesz połączyć utworzoną przesyłkę. Serwer sprawdzi zgodność odbiorcy i paczki.</p>
        <label className="block">ID przesyłki InPost <input className="input-field" value={shipmentId} onChange={e => setShipmentId(e.target.value)} /></label>
        <button className="btn-secondary" disabled={busy || !/^\d+$/.test(shipmentId)} onClick={() => act('reconcile', { shipmentId })}>Sprawdź i połącz przesyłkę</button>
      </div>}
      <p className="text-xs text-gray-400">Odbiór przez kuriera zamów w Managerze Paczek zgodnie z umową — pobranie etykiety go nie zamawia.</p>
    </>}
    {busy && <p className="text-sm" aria-live="polite">Trwa operacja InPost…</p>}
    {notice && <p role="status" className={notice.kind === 'success' ? 'text-sm text-christmas-green' : 'text-sm text-amber-800'}>{notice.text}</p>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </section>;
}
