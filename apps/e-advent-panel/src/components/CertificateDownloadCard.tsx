import { useState } from 'react';
import { useStore } from 'react-redux';
import { SANTA_CERTIFICATE_SKU } from '@e-advent/products';
import { downloadCertificatePdf, type CertificateVariant } from '../api/certificateExport';
import type { OrderItem } from '../types/order';
import type { RootState } from '../store';
import { useToast } from '../hooks/useToast';
import ExportGeneratingModal from './calendar/ExportGeneratingModal';

interface CertificateDownloadCardProps {
  orderId: string;
  items: OrderItem[];
}

function serialLabel(item: OrderItem): string | null {
  const n = Number(item.metadata?.certificateNumber);
  if (!Number.isInteger(n) || n < 1) return null;
  return `SN-2026-${String(n).padStart(6, '0')}`;
}

export default function CertificateDownloadCard({ orderId, items }: CertificateDownloadCardProps) {
  const certificates = items.filter((item) => item.sku === SANTA_CERTIFICATE_SKU);
  const toast = useToast();
  const store = useStore<RootState>();
  const [downloading, setDownloading] = useState<string | null>(null);

  if (certificates.length === 0) return null;

  const handleDownload = async (item: OrderItem, variant: CertificateVariant) => {
    const childName = item.metadata?.childName?.trim();
    if (!childName || childName.length < 2) {
      toast.error('Brak imienia dziecka na certyfikacie.');
      return;
    }
    const key = `${item.id}:${variant}`;
    setDownloading(key);
    try {
      await downloadCertificatePdf(() => store.getState(), orderId, item.id, variant);
      toast.success(variant === 'on' ? 'Pobrano certyfikat męski (ON).' : 'Pobrano certyfikat damski (ONA).');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Nie udało się wygenerować certyfikatu.');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <>
      {downloading && <ExportGeneratingModal kind="pdf" />}
      <div className="panel-card p-5">
        <h2 className="heading-section mb-1">Certyfikaty Grzecznego Dziecka</h2>
        <p className="text-xs text-gray-500 mb-4">
          Wybierz wariant i pobierz spersonalizowany PDF do druku.
        </p>
        <div className="space-y-3">
          {certificates.map((item) => {
            const childName = item.metadata?.childName?.trim() || '—';
            const serial = serialLabel(item);
            const busy = downloading?.startsWith(`${item.id}:`) ?? false;
            return (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">{childName}</p>
                  <p className="text-[11px] text-gray-400 font-mono">
                    {item.displayName ?? item.sku}
                    {serial ? ` · ${serial}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-secondary px-3 py-2 text-sm"
                    disabled={busy}
                    onClick={() => void handleDownload(item, 'on')}
                  >
                    {downloading === `${item.id}:on` ? (
                      <span className="spinner spinner-sm" />
                    ) : (
                      <i className="fa-solid fa-file-pdf" />
                    )}
                    Pobierz męski (ON)
                  </button>
                  <button
                    type="button"
                    className="btn-green px-3 py-2 text-sm"
                    disabled={busy}
                    onClick={() => void handleDownload(item, 'ona')}
                  >
                    {downloading === `${item.id}:ona` ? (
                      <span className="spinner spinner-sm border-white/30 border-b-white" />
                    ) : (
                      <i className="fa-solid fa-file-pdf" />
                    )}
                    Pobierz damski (ONA)
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
