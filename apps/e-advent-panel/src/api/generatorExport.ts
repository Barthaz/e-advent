import { ADMIN_API_BASE } from './apiBase';
import type { RootState } from '../store';
import type { CertificateVariant } from './certificateExport';

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

export async function downloadGeneratorCertificatePdf(
  getState: () => RootState,
  calendarId: string,
  variant: CertificateVariant,
): Promise<void> {
  const token = getState().auth.token;
  const qs = new URLSearchParams({ variant });
  const res = await fetch(
    `${ADMIN_API_BASE}/generator/certificates/${encodeURIComponent(calendarId)}/pdf?${qs}`,
    {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  );

  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }

  const blob = await res.blob();
  const fallback = `certyfikat-GEN-${variant}.pdf`;
  const filename = filenameFromDisposition(res.headers.get('Content-Disposition'), fallback);
  triggerBlobDownload(blob, filename);
}
