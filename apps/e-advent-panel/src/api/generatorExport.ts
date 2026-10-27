import { ADMIN_API_BASE } from './apiBase';
import type { RootState } from '../store';
import type { CertificateVariant } from './certificateExport';
import { fetchAdminExport, saveAdminExportResponse } from './exportDownload';

export async function downloadGeneratorCertificatePdf(
  getState: () => RootState,
  calendarId: string,
  variant: CertificateVariant,
): Promise<void> {
  const token = getState().auth.token;
  const qs = new URLSearchParams({ variant });
  const res = await fetchAdminExport(
    `${ADMIN_API_BASE}/generator/certificates/${encodeURIComponent(calendarId)}/pdf?${qs}`,
    token,
  );
  await saveAdminExportResponse(res, `certyfikat-GEN-${variant}.pdf`);
}
