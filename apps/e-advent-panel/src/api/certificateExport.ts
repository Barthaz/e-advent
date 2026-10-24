import { ADMIN_API_BASE } from './apiBase';
import type { RootState } from '../store';

export type CertificateVariant = 'on' | 'ona';

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function filenameFromDisposition(header: string | null, fallback: string): string {
  if (!header) return fallback;
  const match = header.match(/filename="?([^";]+)"?/i);
  return match?.[1]?.trim() || fallback;
}

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const data = await res.json() as { message?: string; error?: string };
    return data.message || data.error || `Błąd eksportu (${res.status})`;
  } catch {
    return `Błąd eksportu (${res.status})`;
  }
}

export async function downloadCertificatePdf(
  getState: () => RootState,
  orderId: string,
  itemId: string,
  variant: CertificateVariant,
): Promise<void> {
  const token = getState().auth.token;
  const qs = new URLSearchParams({ variant });
  const res = await fetch(
    `${ADMIN_API_BASE}/orders/${encodeURIComponent(orderId)}/items/${encodeURIComponent(itemId)}/certificate.pdf?${qs}`,
    {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  );

  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }

  const blob = await res.blob();
  const fallback = `certyfikat-${variant}.pdf`;
  const filename = filenameFromDisposition(res.headers.get('Content-Disposition'), fallback);
  triggerBlobDownload(blob, filename);
}
