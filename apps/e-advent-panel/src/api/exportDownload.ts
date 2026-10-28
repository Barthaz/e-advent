export const EXPORT_TIMEOUT_MS = 55_000;

export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function filenameFromDisposition(header: string | null, fallback: string): string {
  if (!header) return fallback;
  const match = header.match(/filename="?([^";]+)"?/i);
  return match?.[1]?.trim() || fallback;
}

export async function readExportError(res: Response): Promise<string> {
  try {
    const data = await res.json() as { message?: string; error?: string };
    return data.message || data.error || `Błąd eksportu (${res.status})`;
  } catch {
    return `Błąd eksportu (${res.status})`;
  }
}

export async function fetchAdminExport(url: string, token: string | null): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), EXPORT_TIMEOUT_MS);
  try {
    return await fetch(url, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Generowanie trwa zbyt długo. Spróbuj ponownie za chwilę albo pobierz PDF.');
    }
    if (err instanceof TypeError) {
      throw new Error('Nie udało się pobrać pliku — serwer przerwał przesyłanie. Spróbuj ponownie za chwilę.');
    }
    throw err;
  } finally {
    window.clearTimeout(timer);
  }
}

export async function saveAdminExportResponse(res: Response, fallbackFilename: string): Promise<void> {
  if (!res.ok) {
    throw new Error(await readExportError(res));
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const data = await res.json() as { downloadUrl?: string; filename?: string; message?: string };
    if (!data.downloadUrl) {
      throw new Error(data.message || 'Nie udało się przygotować pliku do pobrania.');
    }
    const a = document.createElement('a');
    a.href = data.downloadUrl;
    a.download = data.filename || fallbackFilename;
    a.rel = 'noopener';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    a.remove();
    return;
  }

  const blob = await res.blob();
  const fallback = contentType.includes('image/jpeg')
    ? fallbackFilename.replace(/\.png$/i, '.jpg')
    : fallbackFilename;
  triggerBlobDownload(blob, filenameFromDisposition(res.headers.get('Content-Disposition'), fallback));
}
