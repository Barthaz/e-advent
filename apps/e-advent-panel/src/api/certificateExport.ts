import { ADMIN_API_BASE } from './apiBase';
import type { RootState } from '../store';
import { fetchAdminExport, saveAdminExportResponse } from './exportDownload';

export type CertificateVariant = 'on' | 'ona';

export async function downloadCertificatePdf(
  getState: () => RootState,
  orderId: string,
  itemId: string,
  variant: CertificateVariant,
): Promise<void> {
  const token = getState().auth.token;
  const qs = new URLSearchParams({ variant });
  const res = await fetchAdminExport(
    `${ADMIN_API_BASE}/orders/${encodeURIComponent(orderId)}/items/${encodeURIComponent(itemId)}/certificate.pdf?${qs}`,
    token,
  );
  await saveAdminExportResponse(res, `certyfikat-${variant}.pdf`);
}
