import { useNavigate } from 'react-router-dom';
import { useGetDashboardQuery } from '../api/ordersApi';
import DataTable, { type Column } from '../components/ui/DataTable';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import type { OrderListItem } from '../types/order';
import {
  formatAmount,
  formatDate,
  formatOrderNumber,
  getFulfillmentStatusLabel,
  getPaymentStatusLabel,
  truncate,
} from '../utils/formatters';

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
    render: (row) => <span className="text-sm text-gray-700">{truncate(row.customer_email, 28)}</span>,
  },
  {
    key: 'status',
    header: 'Płatność',
    render: (row) => <Badge variant={row.status} label={getPaymentStatusLabel(row.status)} />,
  },
  {
    key: 'fulfillment_status',
    header: 'Realizacja',
    render: (row) => (
      <Badge
        variant={row.fulfillment_status === 'pending' ? 'new' : row.fulfillment_status}
        label={getFulfillmentStatusLabel(row.fulfillment_status)}
      />
    ),
  },
  {
    key: 'amount',
    header: 'Kwota',
    render: (row) => (
      <span className="font-semibold text-christmas-green">{formatAmount(row.amount, row.currency)}</span>
    ),
  },
  {
    key: 'created_at',
    header: 'Data',
    render: (row) => <span className="text-xs text-gray-500 whitespace-nowrap">{formatDate(row.created_at)}</span>,
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useGetDashboardQuery();

  if (isLoading) return <LoadingSpinner size="lg" label="Ładowanie pulpitu…" />;

  if (isError || !data) {
    return (
      <div className="alert-error panel-card p-6">
        Nie udało się wczytać pulpitu.{' '}
        <button type="button" className="underline" onClick={() => refetch()}>Spróbuj ponownie</button>
      </div>
    );
  }

  const { summary, season } = data;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="heading-page">{season.label}</h1>
        <p className="text-sm text-gray-500 mt-1">
          Zamówienia od 1 stycznia {season.year} do końca stycznia {season.year + 1} (czas warszawski).
          W styczniu nadal liczy się poprzedni sezon.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Zamówienia" value={String(summary.orders)} hint={`anulowane: ${summary.canceledOrders}`} />
        <Stat label="Opłacone" value={String(summary.paidOrders)} hint={`oczekujące: ${summary.pendingOrders}`} />
        <Stat label="Wartość opłaconych" value={formatAmount(summary.paidAmount, summary.currency)} hint={`średnio ${formatAmount(summary.averagePaid, summary.currency)}`} />
        <Stat label="Do wysłania" value={String(summary.toShip)} hint={`nowe do realizacji: ${summary.toFulfill}`} />
      </div>

      <Queue
        title="Dzisiejsze zamówienia"
        hint="Wszystkie zamówienia złożone dzisiaj."
        rows={data.today}
        total={summary.todayOrders}
        empty="Dziś nie ma jeszcze zamówień."
        onOpen={(row) => navigate(`/orders/${row.id}`)}
      />
      <Queue
        title="Do realizacji"
        hint="Opłacone, status realizacji: Nowe."
        rows={data.toFulfill}
        total={summary.toFulfill}
        empty="Brak nowych opłaconych zamówień."
        onOpen={(row) => navigate(`/orders/${row.id}`)}
      />
      <Queue
        title="Do wysłania"
        hint="Opłacone, status Nowe albo W realizacji, złożone co najmniej 4 dni temu."
        rows={data.toShip}
        total={summary.toShip}
        empty="Nie ma zamówień czekających na wysyłkę dłużej niż 4 dni."
        onOpen={(row) => navigate(`/orders/${row.id}`)}
      />
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="panel-card p-4">
      <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-christmas-green">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{hint}</p>
    </div>
  );
}

function Queue({
  title,
  hint,
  rows,
  total,
  empty,
  onOpen,
}: {
  title: string;
  hint: string;
  rows: OrderListItem[];
  total: number;
  empty: string;
  onOpen: (row: OrderListItem) => void;
}) {
  const hidden = Math.max(0, total - rows.length);
  return (
    <section className="panel-card overflow-hidden">
      <div className="border-b border-gray-100 px-5 py-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="heading-section">{title}</h2>
          <span className="text-sm text-gray-500">{total}</span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{hint}</p>
      </div>
      <div className="p-3">
        <DataTable
          columns={columns}
          data={rows}
          keyExtractor={(row) => row.id}
          onRowClick={onOpen}
          emptyMessage={empty}
        />
        {hidden > 0 && (
          <p className="px-2 pt-3 text-xs text-gray-500">
            Pokazano {rows.length} z {total}. Starsze pozycje są na liście zamówień.
          </p>
        )}
      </div>
    </section>
  );
}
