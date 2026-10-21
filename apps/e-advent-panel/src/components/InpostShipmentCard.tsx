import { useCallback, useEffect, useState } from 'react';
import { useAppSelector } from '../hooks/useAppDispatch';

export interface SavedInpostDelivery {
  type: string; price: number; profile: string; environment: string;
  point?: { id: string; name: string; address: string } | null;
  receiver: { first_name: string; last_name: string; email: string; phone: string;
    address?: { street: string; building_number: string; flat_number?: string; city: string; post_code: string } };
  parcel: { dimensions: { length: number; width: number; height: number }; weight: { amount: number }; template?: string };
}
interface Shipment {
  shipmentId: string | null; state: string; providerStatus: string | null; trackingNumber: string | null;
  labelReady: boolean; offerId: number | null; offerPrice: number | null; canBuy: boolean; needsReview: boolean;
}
export default function InpostShipmentCard({ orderId, delivery, paid, onRefresh }: {
  orderId: string; delivery: SavedInpostDelivery; paid: boolean; onRefresh: () => void;
}) {
  const token = useAppSelector(s => s.auth.token);
  const [shipment, setShipment] = useState<Shipment>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [shipmentId, setShipmentId] = useState('');
  const call = useCallback(async (action = '', body?: unknown) => {
    const response = await fetch(`/api/v1/admin/orders/${encodeURIComponent(orderId)}/inpost${action ? '/' + action : ''}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(action && action !== 'label' ? { method: 'POST', body: JSON.stringify(body || {}) } : {}),
    });
    if (!response.ok) { const e = await response.json(); throw new Error(e.error || 'Nie udało się pobrać przesyłki.'); }
    if (action === 'label') return response.blob();
    return response.json();
  }, [orderId, token]);
  useEffect(() => {
    let active = true;
    if (paid) call().then(data => { if (active) setShipment(data); }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [call, paid]);
  async function act(action: string, body?: unknown) {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const result = await call(action, body);
      if (action === 'label') {
        const url = URL.createObjectURL(result);
        const a = document.createElement('a'); a.href = url; a.download = `inpost-${orderId}.pdf`; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 30000);
      } else { setShipment(result); onRefresh(); }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nie udało się wykonać operacji.');
      // Reload the durable attempt after an ambiguous failure; never repeat a buy.
      try { setShipment(await call()); } catch { setShipment(undefined); }
    } finally { setBusy(false); }
  }
  const r = delivery.receiver, a = r.address, p = delivery.parcel;
  return <section className="panel-card p-5 space-y-3">
    <h2 className="heading-section">Dostawa InPost {delivery.environment === 'sandbox' && '— TEST'}</h2>
    <p>{r.first_name} {r.last_name} · {r.phone} · {r.email}</p>
    {delivery.point ? <p>Paczkomat <strong>{delivery.point.id}</strong> · {delivery.point.address}</p> : a && <p>{a.street} {a.building_number}{a.flat_number ? '/' + a.flat_number : ''}, {a.post_code} {a.city}</p>}
    <p>Opakowanie: {delivery.profile} · {p.dimensions.length} × {p.dimensions.width} × {p.dimensions.height} mm · {p.weight.amount} kg</p>
    <p>Klient zapłacił za dostawę: {delivery.price.toFixed(2)} zł.</p>
    {!paid ? <p>Przygotowanie przesyłki będzie dostępne po potwierdzeniu płatności.</p> : <>
      {shipment && <p>Status: {shipment.providerStatus || shipment.state}{shipment.shipmentId && ` · ID InPost: ${shipment.shipmentId}`}</p>}
      {shipment?.trackingNumber && <p>Numer śledzenia: <strong>{shipment.trackingNumber}</strong> · <a className="underline" href={`https://inpost.pl/sledzenie-przesylek?number=${encodeURIComponent(shipment.trackingNumber)}`} target="_blank" rel="noreferrer">Śledź przesyłkę</a></p>}
      <div className="flex flex-wrap gap-3">
        {(shipment?.state === 'not_created' || shipment?.state === 'create_rejected') && <button className="btn-primary" disabled={busy} onClick={() => act('create')}>Przygotuj przesyłkę</button>}
        <button className="btn-secondary" disabled={busy} onClick={() => act('refresh')}>Odśwież status</button>
        {shipment?.shipmentId && !shipment.labelReady && !shipment.needsReview && <button className="btn-secondary" disabled={busy} onClick={() => act('offers')}>Odśwież oferty</button>}
        {shipment?.canBuy && <>
          <button className="btn-primary" disabled={busy} onClick={() => act('buy', { offerId: shipment.offerId, acceptedPrice: shipment.offerPrice })}>
            {shipment.offerPrice == null ? 'Kup etykietę według umowy InPost' : `Kup etykietę za ${shipment.offerPrice.toFixed(2)} zł brutto`}
          </button>
        </>}
        {shipment?.labelReady && <button className="btn-primary" disabled={busy} onClick={() => act('label')}>Pobierz etykietę PDF</button>}
      </div>
      {shipment?.needsReview && <p className="text-amber-800">Operacja oczekuje na potwierdzenie. Odśwież status. Jeśli stan się nie zmienia, sprawdź tę przesyłkę w Managerze Paczek przed kolejną operacją.</p>}
      {shipment?.needsReview && !shipment.shipmentId && <div>
        <p>Po sprawdzeniu referencji zamówienia w Managerze możesz połączyć utworzoną przesyłkę. Serwer sprawdzi zgodność odbiorcy i paczki.</p>
        <label>ID przesyłki InPost <input className="input-field" value={shipmentId} onChange={e => setShipmentId(e.target.value)} /></label>
        <button className="btn-secondary" disabled={busy || !/^\d+$/.test(shipmentId)} onClick={() => act('reconcile', { shipmentId })}>Sprawdź i połącz przesyłkę</button>
      </div>}
      <p className="text-sm text-gray-500">Utworzenie etykiety nie oznacza nadania paczki. Po przekazaniu jej InPost oznacz zamówienie jako wysłane i wyślij klientowi powiadomienie. Odbiór przez kuriera zamów w Managerze Paczek zgodnie z umową.</p>
    </>}
    {busy && <p aria-live="polite">Trwa operacja InPost…</p>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
  </section>;
}
