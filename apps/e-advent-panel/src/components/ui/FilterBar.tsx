import type { OrderFilters } from '../../types/order';
import {
  PAYMENT_STATUS_OPTIONS,
  FULFILLMENT_STATUS_OPTIONS,
  DELIVERY_TYPE_OPTIONS,
  PRODUCT_TYPE_OPTIONS,
} from '../../utils/constants';

interface FilterBarProps {
  filters: OrderFilters;
  onChange: <K extends keyof OrderFilters>(key: K, value: OrderFilters[K]) => void;
  onReset: () => void;
  activeCount: number;
}

export default function FilterBar({ filters, onChange, onReset, activeCount }: FilterBarProps) {
  return (
    <div className="panel-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
          <i className="fa-solid fa-filter text-christmas-green text-sm" />
          Filtry
          {activeCount > 0 && (
            <span className="badge badge-processing text-xs">{activeCount}</span>
          )}
        </h3>
        {activeCount > 0 && (
          <button onClick={onReset} className="text-sm text-christmas-red hover:underline flex items-center gap-1">
            <i className="fa-solid fa-xmark" />
            Resetuj
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Status płatności</label>
          <select
            className="admin-select"
            value={filters.status ?? ''}
            onChange={(e) => onChange('status', e.target.value as OrderFilters['status'])}
          >
            {PAYMENT_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Status realizacji</label>
          <select
            className="admin-select"
            value={filters.fulfillment_status ?? ''}
            onChange={(e) => onChange('fulfillment_status', e.target.value as OrderFilters['fulfillment_status'])}
          >
            {FULFILLMENT_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Dostawa</label>
          <select
            className="admin-select"
            value={filters.delivery_type ?? ''}
            onChange={(e) => onChange('delivery_type', e.target.value as OrderFilters['delivery_type'])}
          >
            {DELIVERY_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Typ produktu</label>
          <select
            className="admin-select"
            value={filters.product_type ?? ''}
            onChange={(e) => onChange('product_type', e.target.value as OrderFilters['product_type'])}
          >
            {PRODUCT_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Data od</label>
          <input
            type="date"
            className="input-field"
            value={filters.from ?? ''}
            onChange={(e) => onChange('from', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Data do</label>
          <input
            type="date"
            className="input-field"
            value={filters.to ?? ''}
            onChange={(e) => onChange('to', e.target.value)}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">Szukaj</label>
          <div className="relative">
            <input
              type="text"
              className="input-field !pl-[2.75rem]"
              placeholder="Email, nazwisko lub ID zamówienia…"
              value={filters.search ?? ''}
              onChange={(e) => onChange('search', e.target.value)}
            />
            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
}
