import InpostShipmentCard from '../components/InpostShipmentCard';
import OrderItemsPanel from '../components/order/OrderItemsPanel';
import { useState, useEffect, type ReactNode } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useGetOrderQuery, usePatchOrderMutation } from '../api/ordersApi';
import {
  useGetOrderEmailsQuery,
  useSendPaidOrderEmailMutation,
  useSendShippingEmailMutation,
} from '../api/emailsApi';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useToast } from '../hooks/useToast';
import type { PatchOrderRequest, FulfillmentStatus } from '../types/order';
import {
  formatDate,
  formatAmount,
  formatOrderNumber,
  getPaymentStatusLabel,
  getFulfillmentStatusLabel,
  getDeliveryTypeLabel,
  getProductTypeLabel,
} from '../utils/formatters';
import {
  FULFILLMENT_STATUS_OPTIONS,
  EMAIL_TYPE_LABELS,
} from '../utils/constants';
import { isPhysicalProduct } from '@e-advent/products';
import { getInpostStatusLabel, inpostTrackingUrl } from '../utils/inpostStatus';

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const orderId = id ?? '';

  const { data: order, isLoading, isError, refetch } = useGetOrderQuery(orderId, { skip: !orderId });
  const [patchOrder, { isLoading: isSaving }] = usePatchOrderMutation();
  const { data: emails = [], isLoading: emailsLoading, refetch: refetchEmails } = useGetOrderEmailsQuery(orderId, { skip: !orderId });
  const [sendPaidEmail, { isLoading: isSendingPaid }] = useSendPaidOrderEmailMutation();
  const [sendShippingEmail, { isLoading: isSendingShipping }] = useSendShippingEmailMutation();

  const [form, setForm] = useState<PatchOrderRequest>({});
  const [savingField, setSavingField] = useState<string | null>(null);

  useEffect(() => {
    if (order) {
      setForm({
        fulfillment_status: order.fulfillment_status,
        fulfillment_notes: order.fulfillment_notes ?? '',
        tracking_number: order.tracking_number ?? '',
        status: order.status,
        delivery_type: order.delivery_type,
        parcel_locker_id: order.parcel_locker_id ?? '',
        parcel_locker_name: order.parcel_locker_name ?? '',
        parcel_locker_address: order.parcel_locker_address ?? '',
        customer_name: order.customer_name ?? '',
        customer_phone: order.customer_phone ?? '',
        shipping_street: order.shipping_street ?? '',
        shipping_city: order.shipping_city ?? '',
        shipping_postal_code: order.shipping_postal_code ?? '',
      });
    }
  }, [order]);

  const saveFields = async (data: PatchOrderRequest, field = 'fulfillment_status') => {
    setSavingField(field);
    try {
      await patchOrder({ id: orderId, data }).unwrap();
      if (field === 'fulfillment_status') toast.success('Zapisano status realizacji.');
    } catch {
      toast.error('Nie udało się zapisać zmian.');
      refetch();
    } finally {
      setSavingField(null);
    }
  };

  const handleFulfillmentChange = (value: FulfillmentStatus) => {
    setForm((prev) => ({ ...prev, fulfillment_status: value }));
    void saveFields({ fulfillment_status: value }, 'fulfillment_status');
  };

  const handleNotesBlur = () => {
    const notes = form.fulfillment_notes ?? '';
    if (notes === (order?.fulfillment_notes ?? '')) return;
    void saveFields({ fulfillment_notes: notes }, 'fulfillment_notes');
  };

  const handleTrackingBlur = () => {
    const tracking = form.tracking_number ?? '';
    if (order?.inpostDelivery) return;
    if (tracking === (order?.tracking_number ?? '')) return;
    void saveFields({ tracking_number: tracking }, 'tracking_number');
  };

  const handleSendPaid = async () => {
    try {
      const result = await sendPaidEmail(orderId).unwrap();
      const failed = result.failed ?? 0;
      if (failed > 0) {
        toast.error(`Wysłano ${result.sent}, nie udało się: ${failed}.`);
      } else {
        toast.success(`Wysłano wiadomości po opłaceniu (${result.sent}).`);
      }
    } catch (err) {
      const message = (err as { data?: { message?: string } })?.data?.message
        || 'Nie udało się wysłać maila po opłaceniu.';
      toast.error(message);
    }
  };

  const handleSendShipping = async () => {
    try {
      await sendShippingEmail(orderId).unwrap();
      toast.success('Wysłano mail o wysyłce paczki.');
    } catch (err) {
      const message = (err as { data?: { message?: string } })?.data?.message
        || 'Nie udało się wysłać maila o wysyłce.';
      toast.error(message);
    }
  };

  if (isLoading) return <LoadingSpinner size="lg" label="Ładowanie zamówienia…" />;
  if (isError || !order) {
    return (
      <div className="panel-card p-6 alert-error">
        <i className="fa-solid fa-triangle-exclamation mr-2" />
        Nie udało się załadować zamówienia #{id}.{' '}
        <button className="underline" onClick={() => navigate('/orders')}>Wróć do listy</button>
      </div>
    );
  }

  const hasPhysical = (order.items ?? []).some((item) => isPhysicalProduct(item.sku))
    || order.product_type === 'scratch'
    || order.product_type === 'letter';
  const isInpost = Boolean(order.inpostDelivery);
  const trackingReady = Boolean((form.tracking_number ?? order.tracking_number ?? '').trim());
  const canSendPaid = order.status === 'succeeded';
  const locker = order.delivery_type === 'parcel_inpost';
  const courier = order.delivery_type === 'courier_inpost' || order.delivery_type === 'poczta_polska';

  const building = [order.shipping_street, order.shipping_building_number].filter(Boolean).join(' ');
  const apartment = order.shipping_apartment_number ? `/${order.shipping_apartment_number}` : '';
  const addressLine = [building + apartment, [order.shipping_postal_code, order.shipping_city].filter(Boolean).join(' ')]
    .filter((part) => part.trim())
    .join(', ');

  return (
    <div className="w-full max-w-none space-y-5 animate-fade-in-up">
      <section className="panel-card p-4 md:p-5 space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-start gap-4">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <button
              onClick={() => navigate(-1)}
              className="btn-secondary px-3 py-2 text-sm flex-shrink-0"
            >
              <i className="fa-solid fa-arrow-left" />
              Wróć
            </button>
            <div className="min-w-0">
              <h1 className="heading-page">
                Zamówienie #{order.order_number_display ?? formatOrderNumber(order.order_number)}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Złożone: {formatDate(order.created_at)} · Ostatnia zmiana: {formatDate(order.updated_at)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3 xl:justify-end">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">Płatność</p>
              <Badge variant={order.status} label={getPaymentStatusLabel(order.status)} />
            </div>
            <div className="min-w-[12rem]">
              <label className="block text-[11px] uppercase tracking-wide text-gray-400 mb-1">
                Status realizacji {savingField === 'fulfillment_status' && <span className="normal-case tracking-normal text-christmas-green">· zapisuję…</span>}
              </label>
              <select
                className="admin-select"
                value={form.fulfillment_status ?? order.fulfillment_status}
                disabled={isSaving && savingField === 'fulfillment_status'}
                onChange={(e) => handleFulfillmentChange(e.target.value as FulfillmentStatus)}
              >
                {FULFILLMENT_STATUS_OPTIONS.filter((o) => o.value !== '').map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {order.inpostDelivery ? (
          <div className="border-t border-gray-100 pt-4">
            <InpostShipmentCard
              orderId={orderId}
              delivery={order.inpostDelivery}
              paid={order.status === 'succeeded'}
              compact
              onRefresh={() => { refetch(); refetchEmails(); }}
            />
          </div>
        ) : (
          <div className="border-t border-gray-100 pt-4 flex flex-wrap gap-2">
            {canSendPaid && (
              <button
                type="button"
                onClick={() => void handleSendPaid()}
                disabled={isSendingPaid}
                className="btn-secondary px-3 py-2 text-sm disabled:opacity-50"
              >
                <i className="fa-solid fa-envelope" />
                {isSendingPaid ? 'Wysyłanie…' : 'Wyślij mail po opłaceniu'}
              </button>
            )}
            {hasPhysical && (
              <button
                type="button"
                onClick={() => void handleSendShipping()}
                disabled={!trackingReady || isSendingShipping}
                className="btn-secondary px-3 py-2 text-sm disabled:opacity-50"
                title={!trackingReady ? 'Uzupełnij numer listu' : undefined}
              >
                <i className="fa-solid fa-truck" />
                {isSendingShipping ? 'Wysyłanie…' : 'Wyślij mail o wysyłce'}
              </button>
            )}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="panel-card p-5 xl:col-span-2">
          <h2 className="heading-section mb-4">Informacje o zamówieniu</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <Info label="Status płatności" value={getPaymentStatusLabel(order.status)} />
            <Info label="Status realizacji" value={getFulfillmentStatusLabel(order.fulfillment_status)} />
            <Info label="Typ produktu" value={getProductTypeLabel(order.product_type)} />
            <Info label="Dostawa" value={getDeliveryTypeLabel(order.delivery_type, order.product_type)} />
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Numer śledzenia</label>
              {isInpost ? (
                order.tracking_number ? (
                  <a className="font-mono text-christmas-green underline" href={inpostTrackingUrl(order.tracking_number)} target="_blank" rel="noreferrer">
                    {order.tracking_number}
                  </a>
                ) : <p className="text-gray-400">—</p>
              ) : (
                <input
                  type="text"
                  className="input-field"
                  placeholder="np. 123456789012345678"
                  value={form.tracking_number ?? ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, tracking_number: e.target.value }))}
                  onBlur={handleTrackingBlur}
                />
              )}
            </div>
            {isInpost && (
              <>
                <Info label="Status InPost" value={getInpostStatusLabel(order.inpost_status)} />
                <Info label="ID przesyłki" value={<span className="font-mono text-xs">{order.inpost_shipment_id ?? '—'}</span>} />
                <Info label="Etykieta" value={order.label_created_at ? formatDate(order.label_created_at) : '—'} />
                <Info label="Wysłano" value={order.shipped_at ? formatDate(order.shipped_at) : '—'} />
                <Info label="Doręczono" value={order.delivered_at ? formatDate(order.delivered_at) : '—'} />
              </>
            )}
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Notatki realizacji {savingField === 'fulfillment_notes' && <span className="text-christmas-green">· zapisuję…</span>}
              </label>
              <textarea
                rows={3}
                className="input-field resize-none"
                placeholder="Wewnętrzne notatki do zamówienia…"
                value={form.fulfillment_notes ?? ''}
                onChange={(e) => setForm((prev) => ({ ...prev, fulfillment_notes: e.target.value }))}
                onBlur={handleNotesBlur}
              />
            </div>
          </div>
        </div>

        <div className="panel-card p-5">
          <h2 className="heading-section mb-4">Podsumowanie</h2>
          <dl className="space-y-3 text-sm">
            <Row
              label={`Netto${order.vat_rate != null ? ` (VAT ${order.vat_rate}%)` : ''}`}
              value={formatAmount(order.amount_netto ?? 0, order.currency)}
            />
            <Row label="VAT" value={formatAmount(order.vat_amount ?? 0, order.currency)} />
            <Row label="Wysyłka" value={formatAmount(order.shipping_amount ?? 0, order.currency)} />
            <Row label="Brutto" value={formatAmount(order.amount, order.currency)} highlight />
            {order.discount_code && (
              <Row
                label="Kod rabatowy"
                value={
                  order.discount_percent
                    ? `${order.discount_code} (−${order.discount_percent}%)`
                    : order.discount_code
                }
              />
            )}
            {(order.discount_amount ?? 0) > 0 && (
              <Row label="Rabat" value={`−${formatAmount(order.discount_amount, order.currency)}`} />
            )}
            <div className="border-t border-gray-100 pt-3">
              <Row
                label="RODO / regulamin"
                value={
                  <span className="text-christmas-green">
                    ✓ Zaakceptowane
                    <span className="block text-xs font-normal text-gray-500 mt-0.5">
                      {formatDate(
                        order.terms_accepted_at
                          || order.privacy_policy_accepted_at
                          || order.created_at,
                      )}
                    </span>
                  </span>
                }
              />
              <Row label="Stripe PI" value={<span className="font-mono text-xs break-all">{order.stripe_payment_intent_id ?? '—'}</span>} />
              <Row label="ID" value={<span className="font-mono text-xs break-all text-gray-400">{order.id}</span>} />
            </div>
          </dl>
        </div>
      </section>

      <OrderItemsPanel
        orderId={orderId}
        items={order.items ?? []}
        currency={order.currency}
        shippingAmount={order.shipping_amount ?? 0}
        shippingNetto={order.shipping_netto}
        shippingVat={order.shipping_vat}
        amount={order.amount}
      />

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="panel-card p-5 xl:col-span-2">
          <h2 className="heading-section mb-4">Dane klienta</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <Info label="Imię i nazwisko" value={order.customer_name || '—'} />
            <Info label="Telefon" value={order.customer_phone || '—'} />
            <Info label="Email" value={order.customer_email || '—'} />
            <Info label="Adres IP" value={<span className="font-mono text-xs">{order.ip_address || '—'}</span>} />
          </div>
          {(locker || courier || addressLine) && (
            <div className="mt-5 pt-4 border-t border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Dostawa</h3>
              {locker ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <Info label="Paczkomat" value={order.parcel_locker_id || '—'} />
                  <Info label="Nazwa" value={order.parcel_locker_name || '—'} />
                  <div className="sm:col-span-2">
                    <Info label="Adres paczkomatu" value={order.parcel_locker_address || '—'} />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-800">{addressLine || '—'}</p>
              )}
              {isInpost && (
                <p className="text-xs text-gray-400 mt-3">
                  Adres InPost jest powiązany z płatnością i nie edytuje się z tego widoku.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-5">
          {order.calendar && (
            <div className="panel-card p-5">
              <h2 className="heading-section mb-3">Kalendarz</h2>
              <div className="space-y-2 text-sm">
                <p className="font-medium text-gray-800">{order.calendar.title}</p>
                <p className="text-gray-500">Autor: {order.calendar.author}</p>
                {order.calendar.format && (
                  <p className="text-gray-500">Format: {order.calendar.format}</p>
                )}
                {order.calendar.access_code && (
                  <div className="mt-2 p-2.5 bg-cream rounded-lg border border-parchment-mid">
                    <p className="text-xs text-gray-500 mb-0.5">Kod dostępu</p>
                    <p className="font-mono font-bold text-christmas-green tracking-widest">
                      {order.calendar.access_code}
                    </p>
                  </div>
                )}
                {(order.calendar.id || order.calendar_id) && (
                  <Link
                    to={`/calendars/${order.calendar.id ?? order.calendar_id}`}
                    className="inline-flex items-center gap-1.5 text-christmas-green hover:underline text-sm font-medium mt-2"
                  >
                    <i className="fa-solid fa-calendar-days text-xs" />
                    Podgląd kalendarza
                  </Link>
                )}
              </div>
            </div>
          )}

          <div className="panel-card p-5">
            <h2 className="heading-section mb-3">Wiadomości e-mail</h2>
            {isInpost && (
              <p className="text-xs text-gray-500 mb-3">
                Mail „Paczka przygotowana” wychodzi przy generowaniu etykiety. Mail o nadaniu — przy „Oznacz jako wysłane”.
              </p>
            )}
            {isInpost && canSendPaid && (
              <button
                type="button"
                onClick={() => void handleSendPaid()}
                disabled={isSendingPaid}
                className="btn-secondary w-full py-2 text-sm disabled:opacity-50 mb-3"
              >
                <i className="fa-solid fa-envelope" />
                {isSendingPaid ? 'Wysyłanie…' : 'Wyślij mail po opłaceniu'}
              </button>
            )}
            {emailsLoading ? (
              <p className="text-xs text-gray-400">Ładowanie historii…</p>
            ) : emails.length === 0 ? (
              <p className="text-xs text-gray-400">Brak zarejestrowanych wysyłek.</p>
            ) : (
              <ul className="space-y-2 max-h-64 overflow-y-auto">
                {emails.map((mail) => (
                  <li key={mail.id} className="text-xs border border-gray-100 rounded-lg p-2.5 bg-gray-50">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-gray-700">
                        {EMAIL_TYPE_LABELS[mail.type] ?? mail.type}
                      </span>
                      <span className={mail.status === 'sent' ? 'text-christmas-green' : 'text-christmas-red'}>
                        {mail.status === 'sent' ? 'wysłano' : 'błąd'}
                      </span>
                    </div>
                    <p className="text-gray-500 truncate mt-0.5">{mail.recipientEmail}</p>
                    <p className="text-gray-400 mt-0.5">{formatDate(mail.createdAt)}</p>
                    {mail.errorMessage && (
                      <p className="text-christmas-red mt-1">{mail.errorMessage}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <div className="font-medium text-gray-800 break-words">{value}</div>
    </div>
  );
}

function Row({ label, value, highlight = false }: {
  label: string;
  value: ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-gray-500 flex-shrink-0">{label}</dt>
      <dd className={`text-right ${highlight ? 'font-bold text-christmas-green text-base' : 'font-medium text-gray-800'}`}>
        {value}
      </dd>
    </div>
  );
}
