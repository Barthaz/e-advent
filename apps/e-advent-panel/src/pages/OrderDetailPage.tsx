import { useState, useEffect } from 'react';
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
import type { PatchOrderRequest, FulfillmentStatus, PaymentStatus, DeliveryType } from '../types/order';
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
  PAYMENT_STATUS_OPTIONS,
  DELIVERY_TYPE_OPTIONS,
  EMAIL_TYPE_LABELS,
} from '../utils/constants';
import { isPhysicalProduct } from '@e-advent/products';

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const orderId = id ?? '';

  const { data: order, isLoading, isError } = useGetOrderQuery(orderId, { skip: !orderId });
  const [patchOrder, { isLoading: isSaving }] = usePatchOrderMutation();
  const { data: emails = [], isLoading: emailsLoading } = useGetOrderEmailsQuery(orderId, { skip: !orderId });
  const [sendPaidEmail, { isLoading: isSendingPaid }] = useSendPaidOrderEmailMutation();
  const [sendShippingEmail, { isLoading: isSendingShipping }] = useSendShippingEmailMutation();

  const [form, setForm] = useState<PatchOrderRequest>({});
  const [isDirty, setIsDirty] = useState(false);

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
      setIsDirty(false);
    }
  }, [order]);

  const handleChange = <K extends keyof PatchOrderRequest>(key: K, value: PatchOrderRequest[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    try {
      await patchOrder({ id: orderId, data: form }).unwrap();
      toast.success('Zamówienie zostało zaktualizowane.');
      setIsDirty(false);
    } catch {
      toast.error('Nie udało się zapisać zmian. Spróbuj ponownie.');
    }
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

  const showParcelFields = form.delivery_type === 'parcel_inpost';
  const showShippingFields =
    form.delivery_type === 'courier_inpost' ||
    form.delivery_type === 'poczta_polska' ||
    form.delivery_type === 'none';

  const hasPhysical = (order.items ?? []).some((item) => isPhysicalProduct(item.sku))
    || order.product_type === 'scratch'
    || order.product_type === 'letter';
  const trackingReady = Boolean((form.tracking_number ?? order.tracking_number ?? '').trim());
  const canSendPaid = order.status === 'succeeded';

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Nagłówek */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="btn-secondary px-3 py-2 text-sm"
        >
          <i className="fa-solid fa-arrow-left" />
          Wróć
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="heading-page">
            Zamówienie #{order.order_number_display ?? formatOrderNumber(order.order_number)}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Złożone: {formatDate(order.created_at)} · Ostatnia zmiana: {formatDate(order.updated_at)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={order.status} label={getPaymentStatusLabel(order.status)} />
          <Badge
            variant={order.fulfillment_status === 'pending' ? 'new' : order.fulfillment_status}
            label={getFulfillmentStatusLabel(order.fulfillment_status)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── Lewa kolumna ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Status i realizacja */}
          <div className="panel-card p-5">
            <h2 className="heading-section mb-4">Status zamówienia</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Status płatności</label>
                <select
                  className="admin-select"
                  value={form.status ?? order.status}
                  onChange={(e) => handleChange('status', e.target.value as PaymentStatus)}
                >
                  {PAYMENT_STATUS_OPTIONS.filter((o) => o.value !== '').map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Status realizacji</label>
                <select
                  className="admin-select"
                  value={form.fulfillment_status ?? order.fulfillment_status}
                  onChange={(e) => handleChange('fulfillment_status', e.target.value as FulfillmentStatus)}
                >
                  {FULFILLMENT_STATUS_OPTIONS.filter((o) => o.value !== '').map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Numer śledzenia</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="np. 123456789012345678"
                  value={form.tracking_number ?? ''}
                  onChange={(e) => handleChange('tracking_number', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Typ dostawy</label>
                <select
                  className="admin-select"
                  value={form.delivery_type ?? order.delivery_type}
                  onChange={(e) => handleChange('delivery_type', e.target.value as DeliveryType)}
                >
                  {DELIVERY_TYPE_OPTIONS.filter((o) => o.value !== '').map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Notatki realizacji</label>
                <textarea
                  rows={3}
                  className="input-field resize-none"
                  placeholder="Wewnętrzne notatki do zamówienia…"
                  value={form.fulfillment_notes ?? ''}
                  onChange={(e) => handleChange('fulfillment_notes', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Pozycje zamówienia */}
          {order.items && order.items.length > 0 && (
            <div className="panel-card p-5">
              <h2 className="heading-section mb-4">Pozycje zamówienia</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                      <th className="pb-2 font-medium">Produkt</th>
                      <th className="pb-2 font-medium">Typ</th>
                      <th className="pb-2 font-medium text-right">Ilość</th>
                      <th className="pb-2 font-medium text-right">Netto</th>
                      <th className="pb-2 font-medium text-right">VAT</th>
                      <th className="pb-2 font-medium text-right">Brutto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item) => {
                      const lineBrutto = item.lineBrutto ?? item.unitPrice * item.quantity;
                      const lineNetto = item.lineNetto;
                      const lineVat = item.lineVat;
                      return (
                        <tr key={item.id} className="border-b border-gray-50 last:border-0">
                          <td className="py-2.5">
                            <div className="font-medium text-gray-800">
                              {item.displayName ?? item.sku}
                            </div>
                            <div className="font-mono text-[11px] text-gray-400">{item.sku}</div>
                            {item.vatRate != null && (
                              <div className="text-[11px] text-gray-400">VAT {item.vatRate}%</div>
                            )}
                            {item.calendarId && (
                              <Link
                                to={`/calendars/${item.calendarId}`}
                                className="text-[11px] text-christmas-green hover:underline"
                              >
                                Kalendarz →
                              </Link>
                            )}
                          </td>
                          <td className="py-2.5 text-gray-600">
                            {getProductTypeLabel(item.productType as typeof order.product_type)}
                          </td>
                          <td className="py-2.5 text-right text-gray-800">{item.quantity}</td>
                          <td className="py-2.5 text-right text-gray-800">
                            {lineNetto != null ? formatAmount(lineNetto, order.currency) : '—'}
                          </td>
                          <td className="py-2.5 text-right text-gray-800">
                            {lineVat != null ? formatAmount(lineVat, order.currency) : '—'}
                          </td>
                          <td className="py-2.5 text-right font-medium text-gray-900">
                            {formatAmount(lineBrutto, order.currency)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-200">
                      <td colSpan={5} className="pt-3 text-right text-xs text-gray-500">
                        Produkty (brutto)
                      </td>
                      <td className="pt-3 text-right text-sm text-gray-800">
                        {formatAmount(
                          order.items.reduce(
                            (s, i) => s + (i.lineBrutto ?? i.unitPrice * i.quantity),
                            0,
                          ),
                          order.currency,
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={5} className="pt-1 text-right text-xs text-gray-500">
                        Wysyłka
                        {(order.shipping_vat ?? 0) > 0 && (
                          <span className="block text-[10px] font-normal">
                            netto {formatAmount(order.shipping_netto ?? 0, order.currency)}
                            {' · '}
                            VAT {formatAmount(order.shipping_vat ?? 0, order.currency)}
                          </span>
                        )}
                      </td>
                      <td className="pt-1 text-right text-sm text-gray-800">
                        {(order.shipping_amount ?? 0) > 0
                          ? formatAmount(order.shipping_amount, order.currency)
                          : 'Gratis / 0'}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={5} className="pt-2 text-right text-sm font-semibold text-gray-700">
                        Razem brutto
                      </td>
                      <td className="pt-2 text-right text-base font-bold text-christmas-green">
                        {formatAmount(order.amount, order.currency)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Dane klienta */}
          <div className="panel-card p-5">
            <h2 className="heading-section mb-4">Dane klienta</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Imię i nazwisko</label>
                <input
                  type="text"
                  className="input-field"
                  value={form.customer_name ?? ''}
                  onChange={(e) => handleChange('customer_name', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Telefon</label>
                <input
                  type="tel"
                  className="input-field"
                  value={form.customer_phone ?? ''}
                  onChange={(e) => handleChange('customer_phone', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Email</label>
                <input type="email" className="input-field" value={order.customer_email ?? ''} disabled />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Adres IP</label>
                <input type="text" className="input-field" value={order.ip_address ?? ''} disabled />
              </div>
            </div>
          </div>

          {/* Adres dostawy */}
          {showShippingFields && (
            <div className="panel-card p-5">
              <h2 className="heading-section mb-4">Adres dostawy</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Ulica i numer</label>
                  <input
                    type="text"
                    className="input-field"
                    value={form.shipping_street ?? ''}
                    onChange={(e) => handleChange('shipping_street', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Kod pocztowy</label>
                  <input
                    type="text"
                    className="input-field"
                    value={form.shipping_postal_code ?? ''}
                    onChange={(e) => handleChange('shipping_postal_code', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Miasto</label>
                  <input
                    type="text"
                    className="input-field"
                    value={form.shipping_city ?? ''}
                    onChange={(e) => handleChange('shipping_city', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Paczkomat */}
          {showParcelFields && (
            <div className="panel-card p-5">
              <h2 className="heading-section mb-4">Paczkomat InPost</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">ID paczkomatu</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="np. WAW120"
                    value={form.parcel_locker_id ?? ''}
                    onChange={(e) => handleChange('parcel_locker_id', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Nazwa paczkomatu</label>
                  <input
                    type="text"
                    className="input-field"
                    value={form.parcel_locker_name ?? ''}
                    onChange={(e) => handleChange('parcel_locker_name', e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Adres paczkomatu</label>
                  <input
                    type="text"
                    className="input-field"
                    value={form.parcel_locker_address ?? ''}
                    onChange={(e) => handleChange('parcel_locker_address', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Prawa kolumna — podsumowanie ── */}
        <div className="space-y-5">

          {/* Podsumowanie finansowe */}
          <div className="panel-card p-5">
            <h2 className="heading-section mb-4">Podsumowanie</h2>
            <dl className="space-y-3 text-sm">
              <Row
                label={`Netto${order.vat_rate != null ? ` (VAT ${order.vat_rate}%)` : ''}`}
                value={formatAmount(order.amount_netto ?? 0, order.currency)}
              />
              <Row label="VAT" value={formatAmount(order.vat_amount ?? 0, order.currency)} />
              <Row label="Brutto" value={formatAmount(order.amount, order.currency)} highlight />
              {order.discount_code && (
                <Row label="Kod rabatowy" value={order.discount_code} />
              )}
              <div className="border-t border-gray-100 pt-3 mt-1">
                <Row label="Typ produktu" value={getProductTypeLabel(order.product_type)} />
                <Row
                  label="Dostawa"
                  value={getDeliveryTypeLabel(order.delivery_type, order.product_type)}
                />
              </div>
              <div className="border-t border-gray-100 pt-3 mt-1">
                <Row
                  label="RODO / regulamin"
                  value={
                    order.terms_accepted_at || order.privacy_policy_accepted_at
                      ? '✓ Zaakceptowane'
                      : '✗ Brak'
                  }
                />
                <Row label="Stripe PI" value={
                  <span className="font-mono text-xs break-all">{order.stripe_payment_intent_id ?? '—'}</span>
                } />
                <Row label="ID wewnętrzne" value={
                  <span className="font-mono text-xs break-all text-gray-400">{order.id}</span>
                } />
              </div>
            </dl>
          </div>

          {/* Powiązany kalendarz */}
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
                    <i className="fa-solid fa-arrow-right text-xs" />
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Wiadomości e-mail */}
          <div className="panel-card p-5">
            <h2 className="heading-section mb-3">Wiadomości e-mail</h2>
            <p className="text-xs text-gray-500 mb-4">
              Webhook wysyła maile po opłaceniu automatycznie. Te przyciski służą do ręcznej wysyłki,
              gdy coś nie dotrze.
            </p>
            <div className="space-y-2 mb-4">
              <button
                type="button"
                onClick={handleSendPaid}
                disabled={!canSendPaid || isSendingPaid}
                className="btn-secondary w-full py-2.5 text-sm disabled:opacity-50"
                title={!canSendPaid ? 'Zamówienie musi być opłacone' : undefined}
              >
                {isSendingPaid ? (
                  <>
                    <span className="spinner spinner-sm" />
                    Wysyłanie…
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-envelope" />
                    Wyślij mail po opłaceniu
                  </>
                )}
              </button>
              {hasPhysical && (
                <button
                  type="button"
                  onClick={handleSendShipping}
                  disabled={!trackingReady || isSendingShipping}
                  className="btn-secondary w-full py-2.5 text-sm disabled:opacity-50"
                  title={!trackingReady ? 'Uzupełnij i zapisz numer listu' : undefined}
                >
                  {isSendingShipping ? (
                    <>
                      <span className="spinner spinner-sm" />
                      Wysyłanie…
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-truck" />
                      Wyślij mail o wysyłce
                    </>
                  )}
                </button>
              )}
              {hasPhysical && !trackingReady && (
                <p className="text-xs text-gray-400">
                  Mail o wysyłce wymaga zapisanego numeru listu przewozowego.
                </p>
              )}
            </div>
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

          {/* Przycisk zapisu */}
          {isDirty && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="btn-green w-full py-3 text-base"
            >
              {isSaving ? (
                <>
                  <span className="spinner spinner-sm border-white/30 border-b-white" />
                  Zapisywanie…
                </>
              ) : (
                <>
                  <i className="fa-solid fa-floppy-disk" />
                  Zapisz zmiany
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, highlight = false }: {
  label: string;
  value: React.ReactNode;
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
