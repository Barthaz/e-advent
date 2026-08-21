import { useNavigate } from 'react-router-dom';
import { useGetOrdersQuery } from '../api/ordersApi';
import { useOrderFilters } from '../hooks/useOrderFilters';
import DataTable, { type Column } from '../components/ui/DataTable';
import FilterBar from '../components/ui/FilterBar';
import Pagination from '../components/ui/Pagination';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import type { OrderListItem } from '../types/order';
import {
  formatDate,
  formatAmount,
  formatOrderNumber,
  getPaymentStatusLabel,
  getFulfillmentStatusLabel,
  getDeliveryTypeLabel,
  getDeliveryBadgeVariant,
  getProductTypeLabel,
  truncate,
} from '../utils/formatters';

export default function OrdersPage() {
  const navigate = useNavigate();
  const { filters, setFilter, setPage, resetFilters, activeFilters } = useOrderFilters();

  const { data, isLoading, isError, isFetching } = useGetOrdersQuery(filters);

  const columns: Column<OrderListItem>[] = [
    {
      key: 'order_number',
      header: 'Numer',
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-gray-700">
          #{row.order_number_display ?? formatOrderNumber(row.order_number)}
        </span>
      ),
    },
    {
      key: 'customer',
      header: 'Klient',
      render: (row) => (
        <span className="text-sm text-gray-700">{truncate(row.customer_email, 32)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Płatność',
      render: (row) => (
        <Badge variant={row.status} label={getPaymentStatusLabel(row.status)} />
      ),
    },
    {
      key: 'fulfillment_status',
      header: 'Status realizacji',
      render: (row) => (
        <Badge
          variant={row.fulfillment_status === 'pending' ? 'new' : row.fulfillment_status}
          label={getFulfillmentStatusLabel(row.fulfillment_status)}
        />
      ),
    },
    {
      key: 'delivery_type',
      header: 'Dostawa',
      render: (row) => (
        <Badge
          variant={getDeliveryBadgeVariant(row.delivery_type, row.product_type)}
          label={getDeliveryTypeLabel(row.delivery_type, row.product_type)}
        />
      ),
    },
    {
      key: 'items',
      header: 'Pozycje',
      render: (row) => {
        const qty = row.items_quantity ?? row.item_count;
        if (qty == null || qty === 0) {
          return (
            <span className="text-xs text-gray-500">
              {getProductTypeLabel(row.product_type)}
            </span>
          );
        }
        return (
          <span className="text-sm text-gray-700">
            {qty} {qty === 1 ? 'szt.' : 'szt.'}
            <span className="text-xs text-gray-400 ml-1">
              ({getProductTypeLabel(row.product_type)}
              {(row.item_count ?? 0) > 1 ? ' + inne' : ''})
            </span>
          </span>
        );
      },
    },
    {
      key: 'amount',
      header: 'Kwota',
      render: (row) => (
        <div className="text-right">
          <span className="font-semibold text-christmas-green block">
            {formatAmount(row.amount, row.currency)}
          </span>
          {(row.shipping_amount ?? 0) > 0 && (
            <span className="text-[11px] text-gray-400">
              w tym wysyłka {formatAmount(row.shipping_amount, row.currency)}
            </span>
          )}
          {(row.shipping_amount === 0 || row.shipping_amount == null) &&
            (row.product_type === 'scratch' || row.product_type === 'letter') && (
            <span className="text-[11px] text-gray-400">wysyłka gratis / 0</span>
          )}
        </div>
      ),
    },
    {
      key: 'tracking',
      header: 'Nr przesyłki',
      render: (row) => (
        <span className="font-mono text-xs text-gray-500">{row.tracking_number ?? '—'}</span>
      ),
    },
    {
      key: 'created_at',
      header: 'Data',
      render: (row) => (
        <span className="text-xs text-gray-500 whitespace-nowrap">{formatDate(row.created_at)}</span>
      ),
    },
    {
      key: 'action',
      header: '',
      render: () => (
        <i className="fa-solid fa-chevron-right text-xs text-gray-300" />
      ),
    },
  ];

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Nagłówek */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-page">Zamówienia</h1>
          {data && (
            <p className="text-sm text-gray-500 mt-0.5">
              Łącznie: <span className="font-semibold">{data.total}</span>
            </p>
          )}
        </div>
        {isFetching && !isLoading && (
          <div className="flex items-center gap-2 text-sm text-christmas-green">
            <span className="spinner spinner-sm" />
            Odświeżam…
          </div>
        )}
      </div>

      {/* Filtry */}
      <FilterBar
        filters={filters}
        onChange={setFilter}
        onReset={resetFilters}
        activeCount={activeFilters}
      />

      {/* Tabela */}
      <div className="panel-card overflow-hidden">
        {isLoading ? (
          <LoadingSpinner label="Ładowanie zamówień…" />
        ) : isError ? (
          <div className="alert-error m-5">
            <i className="fa-solid fa-triangle-exclamation mr-2" />
            Błąd podczas ładowania zamówień. Spróbuj odświeżyć stronę.
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={data?.orders ?? []}
            keyExtractor={(row) => row.id}
            onRowClick={(row) => navigate(`/orders/${row.id}`)}
            emptyMessage="Nie znaleziono zamówień pasujących do filtrów."
          />
        )}
      </div>

      {/* Paginacja */}
      {data && data.total > data.limit && (
        <Pagination
          page={data.page}
          total={data.total}
          limit={data.limit}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
