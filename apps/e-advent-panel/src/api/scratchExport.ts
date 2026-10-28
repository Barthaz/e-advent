import { ADMIN_API_BASE } from './apiBase';
import type { RootState } from '../store';
import { fetchAdminExport, saveAdminExportResponse } from './exportDownload';

/**
 * Download scratch calendar PDF/PNG via admin export endpoints.
 * PNG is requested at 600 DPI (print). Without Vercel Blob the API returns a 300 DPI JPEG
 * that fits a single response instead.
 */
export async function downloadScratchExport(
  getState: () => RootState,
  calendarId: string,
  kind: 'pdf' | 'png',
): Promise<void> {
  const token = getState().auth.token;
  const qs = kind === 'png' ? '?dpi=600' : '';
  const res = await fetchAdminExport(
    `${ADMIN_API_BASE}/calendars/${encodeURIComponent(calendarId)}/export/${kind}${qs}`,
    token,
  );
  await saveAdminExportResponse(res, `kalendarz-${calendarId}.${kind}`);
}
