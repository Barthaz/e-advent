import { ADMIN_API_BASE } from './apiBase';
import type { RootState } from '../store';
import { fetchAdminExport, saveAdminExportResponse } from './exportDownload';

/**
 * Download scratch calendar PDF/PNG via admin export endpoints.
 * PNG defaults to 300 DPI so Vercel can finish before the function/response cap.
 */
export async function downloadScratchExport(
  getState: () => RootState,
  calendarId: string,
  kind: 'pdf' | 'png',
): Promise<void> {
  const token = getState().auth.token;
  const qs = kind === 'png' ? '?dpi=300' : '';
  const res = await fetchAdminExport(
    `${ADMIN_API_BASE}/calendars/${encodeURIComponent(calendarId)}/export/${kind}${qs}`,
    token,
  );
  await saveAdminExportResponse(res, `kalendarz-${calendarId}.${kind}`);
}
