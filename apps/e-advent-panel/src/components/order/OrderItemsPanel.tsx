import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from 'react-redux';
import { SANTA_CERTIFICATE_SKU } from '@e-advent/products';
import type { OrderItem } from '../../types/order';
import type { RootState } from '../../store';
import { groupOrderItems } from '../../utils/groupOrderItems';
import { formatAmount, getProductTypeLabel } from '../../utils/formatters';
import { downloadScratchExport } from '../../api/scratchExport';
import { downloadCertificatePdf, type CertificateVariant } from '../../api/certificateExport';
import {
  useDeleteOrderItemMutation,
  useRemoveOrderLetterMutation,
} from '../../api/ordersApi';
import { useToast } from '../../hooks/useToast';
import ExportGeneratingModal from '../calendar/ExportGeneratingModal';
import type { ProductType } from '../../types/order';

interface OrderItemsPanelProps {
  orderId: string;
  items: OrderItem[];
  currency: string;
  shippingAmount: number;
  shippingNetto?: number;
  shippingVat?: number;
  amount: number;
  canEditPack: boolean;
}

function serialLabel(item: OrderItem): string | null {
  const n = Number(item.metadata?.certificateNumber);
  if (!Number.isInteger(n) || n < 1) return null;
  return `SN-2026-${String(n).padStart(6, '0')}`;
}

function ActionButton({
  label,
  icon,
  onClick,
  disabled,
  tone = 'default',
}: {
  label: string;
  icon: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: 'default' | 'danger';
}) {
  return (
    <button
      type="button"
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium disabled:opacity-50 ${
        tone === 'danger'
          ? 'border-red-200 text-christmas-red hover:bg-red-50'
          : 'border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-christmas-green'
      }`}
      disabled={disabled}
      onClick={onClick}
    >
      <i className={`fa-solid ${icon}`} />
      {label}
    </button>
  );
}

export default function OrderItemsPanel({
  orderId,
  items,
  currency,
  shippingAmount,
  shippingNetto,
  shippingVat,
  amount,
  canEditPack,
}: OrderItemsPanelProps) {
  const lines = groupOrderItems(items);
  const toast = useToast();
  const store = useStore<RootState>();
  const [deleteItem, { isLoading: deletingItem }] = useDeleteOrderItemMutation();
  const [removeLetter, { isLoading: removingLetter }] = useRemoveOrderLetterMutation();
  const [busy, setBusy] = useState<string | null>(null);

  const packBusy = deletingItem || removingLetter;

  const handleScratch = async (calendarId: string, kind: 'pdf' | 'png') => {
    const key = `${calendarId}:${kind}`;
    setBusy(key);
    try {
      await downloadScratchExport(() => store.getState(), calendarId, kind);
      toast.success(kind === 'png' ? 'Pobrano PNG kalendarza.' : 'Pobrano PDF kalendarza.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Nie udało się pobrać kalendarza.');
    } finally {
      setBusy(null);
    }
  };

  const handleCertificate = async (item: OrderItem, variant: CertificateVariant) => {
    const childName = item.metadata?.childName?.trim();
    if (!childName || childName.length < 2) {
      toast.error('Brak imienia dziecka na certyfikacie.');
      return;
    }
    const key = `${item.id}:${variant}`;
    setBusy(key);
    try {
      await downloadCertificatePdf(() => store.getState(), orderId, item.id, variant);
      toast.success(variant === 'on' ? 'Pobrano certyfikat męski (ON).' : 'Pobrano certyfikat damski (ONA).');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Nie udało się wygenerować certyfikatu.');
    } finally {
      setBusy(null);
    }
  };

  const handleRemoveCertificate = async (item: OrderItem) => {
    const name = item.metadata?.childName?.trim() || 'ten certyfikat';
    if (!window.confirm(`Usunąć certyfikat dla ${name}? List pozostanie w zamówieniu.`)) return;
    try {
      await deleteItem({ orderId, itemId: item.id }).unwrap();
      toast.success('Usunięto certyfikat.');
    } catch (err) {
      const message = (err as { data?: { error?: string } })?.data?.error;
      toast.error(message || 'Nie udało się usunąć certyfikatu.');
    }
  };

  const handleRemoveLetter = async (certificates: OrderItem[]) => {
    const last = certificates[certificates.length - 1];
    const certNote = last
      ? ` Zostanie też usunięty ostatni certyfikat${last.metadata?.childName ? ` (${last.metadata.childName})` : ''}.`
      : '';
    if (!window.confirm(`Usunąć jeden list z zamówienia?${certNote} Kwota opłacona się nie zmieni.`)) return;
    try {
      await removeLetter(orderId).unwrap();
      toast.success(last ? 'Usunięto list i ostatni certyfikat.' : 'Usunięto jeden list.');
    } catch (err) {
      const message = (err as { data?: { error?: string } })?.data?.error;
      toast.error(message || 'Nie udało się usunąć listu.');
    }
  };

  const itemActions = (item: OrderItem) => {
    const productType = item.productType as ProductType | string;
    const calendarId = item.calendarId;
    const isScratch = productType === 'scratch' || item.sku.startsWith('scratch');
    const isInteractive = productType === 'interactive' || item.sku === 'interactive';
    const isCertificate = item.sku === SANTA_CERTIFICATE_SKU;

    return (
      <div className="flex flex-wrap gap-1.5 justify-end">
        {calendarId && isScratch && (
          <>
            <Link to={`/calendars/${calendarId}`} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:text-christmas-green">
              <i className="fa-solid fa-eye" />
              Podgląd
            </Link>
            <ActionButton
              label="PNG"
              icon="fa-image"
              disabled={busy === `${calendarId}:png`}
              onClick={() => void handleScratch(calendarId, 'png')}
            />
            <ActionButton
              label="PDF"
              icon="fa-file-pdf"
              disabled={busy === `${calendarId}:pdf`}
              onClick={() => void handleScratch(calendarId, 'pdf')}
            />
          </>
        )}
        {calendarId && isInteractive && (
          <Link to={`/calendars/${calendarId}`} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:text-christmas-green">
            <i className="fa-solid fa-mobile-screen" />
            Kalendarz interaktywny
          </Link>
        )}
        {isCertificate && (
          <>
            <ActionButton
              label="ON"
              icon="fa-file-pdf"
              disabled={busy === `${item.id}:on`}
              onClick={() => void handleCertificate(item, 'on')}
            />
            <ActionButton
              label="ONA"
              icon="fa-file-pdf"
              disabled={busy === `${item.id}:ona`}
              onClick={() => void handleCertificate(item, 'ona')}
            />
            {canEditPack && (
              <ActionButton
                label="Usuń"
                icon="fa-trash"
                tone="danger"
                disabled={packBusy}
                onClick={() => void handleRemoveCertificate(item)}
              />
            )}
          </>
        )}
      </div>
    );
  };

  const exporting = busy?.endsWith(':png') ? 'png' : busy?.endsWith(':pdf') || busy?.endsWith(':on') || busy?.endsWith(':ona') ? 'pdf' : null;

  return (
    <>
      {exporting && <ExportGeneratingModal kind={exporting} />}
      <section className="panel-card p-5 overflow-hidden">
        <h2 className="heading-section mb-4">Pozycje zamówienia</h2>
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="pb-2 font-medium">Produkt</th>
                <th className="pb-2 font-medium">Typ</th>
                <th className="pb-2 font-medium text-right">Ilość</th>
                <th className="pb-2 font-medium text-right">Netto</th>
                <th className="pb-2 font-medium text-right">VAT</th>
                <th className="pb-2 font-medium text-right">Brutto</th>
                <th className="pb-2 font-medium text-right">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => {
                if (line.kind === 'letter-group') {
                  return (
                    <LetterGroupRows
                      key="letter-pack"
                      line={line}
                      currency={currency}
                      canEditPack={canEditPack}
                      packBusy={packBusy}
                      onRemoveLetter={() => void handleRemoveLetter(line.certificates)}
                      renderCertActions={itemActions}
                    />
                  );
                }
                const item = line.item;
                const lineBrutto = item.lineBrutto ?? item.unitPrice * item.quantity;
                return (
                  <tr key={item.id} className="border-b border-gray-50 align-top">
                    <td className="py-3">
                      <div className="font-medium text-gray-800">{item.displayName ?? item.sku}</div>
                      <div className="font-mono text-[11px] text-gray-400">{item.sku}</div>
                    </td>
                    <td className="py-3 text-gray-600">
                      {getProductTypeLabel(item.productType as ProductType)}
                    </td>
                    <td className="py-3 text-right">{item.quantity}</td>
                    <td className="py-3 text-right">{item.lineNetto != null ? formatAmount(item.lineNetto, currency) : '—'}</td>
                    <td className="py-3 text-right">{item.lineVat != null ? formatAmount(item.lineVat, currency) : '—'}</td>
                    <td className="py-3 text-right font-medium">{formatAmount(lineBrutto, currency)}</td>
                    <td className="py-3 text-right">{itemActions(item)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200">
                <td colSpan={5} className="pt-3 text-right text-xs text-gray-500">Produkty (brutto)</td>
                <td className="pt-3 text-right text-sm">
                  {formatAmount(items.reduce((s, i) => s + (i.lineBrutto ?? i.unitPrice * i.quantity), 0), currency)}
                </td>
                <td />
              </tr>
              <tr>
                <td colSpan={5} className="pt-1 text-right text-xs text-gray-500">
                  Wysyłka
                  {(shippingVat ?? 0) > 0 && (
                    <span className="block text-[10px] font-normal">
                      netto {formatAmount(shippingNetto ?? 0, currency)}
                      {' · '}
                      VAT {formatAmount(shippingVat ?? 0, currency)}
                    </span>
                  )}
                </td>
                <td className="pt-1 text-right text-sm">
                  {shippingAmount > 0 ? formatAmount(shippingAmount, currency) : 'Gratis / 0'}
                </td>
                <td />
              </tr>
              <tr>
                <td colSpan={5} className="pt-2 text-right text-sm font-semibold text-gray-700">Opłacone brutto</td>
                <td className="pt-2 text-right text-base font-bold text-christmas-green">
                  {formatAmount(amount, currency)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </>
  );
}

function LetterGroupRows({
  line,
  currency,
  canEditPack,
  packBusy,
  onRemoveLetter,
  renderCertActions,
}: {
  line: Extract<ReturnType<typeof groupOrderItems>[number], { kind: 'letter-group' }>;
  currency: string;
  canEditPack: boolean;
  packBusy: boolean;
  onRemoveLetter: () => void;
  renderCertActions: (item: OrderItem) => ReactNode;
}) {
  return (
    <>
      <tr className="border-b border-gray-50 align-top bg-cream/40">
        <td className="py-3">
          <div className="font-medium text-gray-800">List do Świętego Mikołaja</div>
          <div className="font-mono text-[11px] text-gray-400">santa-letter</div>
        </td>
        <td className="py-3 text-gray-600">List</td>
        <td className="py-3 text-right font-semibold">× {line.quantity}</td>
        <td className="py-3 text-right">{formatAmount(line.lineNetto, currency)}</td>
        <td className="py-3 text-right">{formatAmount(line.lineVat, currency)}</td>
        <td className="py-3 text-right font-medium">{formatAmount(line.lineBrutto, currency)}</td>
        <td className="py-3 text-right">
          {canEditPack && (
            <ActionButton
              label="Usuń 1 list"
              icon="fa-minus"
              tone="danger"
              disabled={packBusy}
              onClick={onRemoveLetter}
            />
          )}
        </td>
      </tr>
      {line.certificates.map((cert) => {
        const childName = cert.metadata?.childName?.trim() || '—';
        const serial = serialLabel(cert);
        const lineBrutto = cert.lineBrutto ?? cert.unitPrice * cert.quantity;
        return (
          <tr key={cert.id} className="border-b border-gray-50 align-top">
            <td className="py-2.5 pl-6">
              <div className="font-medium text-gray-800">
                <i className="fa-solid fa-award text-christmas-gold text-xs mr-1.5" />
                {cert.displayName ?? `CERTYFIKAT - ${childName}`}
              </div>
              <div className="font-mono text-[11px] text-gray-400">
                {cert.sku}{serial ? ` · ${serial}` : ''}
              </div>
            </td>
            <td className="py-2.5 text-gray-600">Certyfikat</td>
            <td className="py-2.5 text-right">{cert.quantity}</td>
            <td className="py-2.5 text-right">{cert.lineNetto != null ? formatAmount(cert.lineNetto, currency) : '—'}</td>
            <td className="py-2.5 text-right">{cert.lineVat != null ? formatAmount(cert.lineVat, currency) : '—'}</td>
            <td className="py-2.5 text-right font-medium">{formatAmount(lineBrutto, currency)}</td>
            <td className="py-2.5 text-right">{renderCertActions(cert)}</td>
          </tr>
        );
      })}
    </>
  );
}
