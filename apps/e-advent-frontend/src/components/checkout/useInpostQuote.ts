import { useEffect, useState } from 'react';

export type InpostType = 'parcel_inpost' | 'courier_inpost';
export interface InpostChoice { type: InpostType; pointId?: string; pointLabel?: string }
export interface Quote { price: number; currency: string; profile: string; quoteKey: string }
export async function shippingApi<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const r = await fetch(`${import.meta.env.VITE_API_URL}/shipping/${path}`, {
    ...(body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}), signal,
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'Nie udało się pobrać dostawy.');
  return data;
}

export function useInpostQuote(items: Array<{ sku: string; quantity: number }>, type: InpostType, enabled: boolean) {
  const key = JSON.stringify({ items, type });
  const [result, setResult] = useState<{ key: string; quote?: Quote; error?: string }>();
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      shippingApi<Quote>('quote', JSON.parse(key), controller.signal).then(quote => {
        if (!controller.signal.aborted) setResult({ key, quote });
      }).catch(e => { if (!controller.signal.aborted) setResult({ key, error: e.message }); });
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [key, enabled, retry]);
  return { quote: enabled && result?.key === key ? result.quote : undefined,
    error: result?.key === key ? result.error : undefined,
    retry: () => { setResult(undefined); setRetry(n => n + 1); } };
}

