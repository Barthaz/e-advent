import { useState, useCallback } from 'react';
import type { OrderFilters } from '../types/order';
import { DEFAULT_PAGE_LIMIT } from '../utils/constants';

const DEFAULT_FILTERS: OrderFilters = {
  status: '',
  fulfillment_status: '',
  product_type: '',
  delivery_type: '',
  from: '',
  to: '',
  search: '',
  page: 1,
  limit: DEFAULT_PAGE_LIMIT,
};

export function useOrderFilters() {
  const [filters, setFilters] = useState<OrderFilters>(DEFAULT_FILTERS);

  const setFilter = useCallback(<K extends keyof OrderFilters>(key: K, value: OrderFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: key !== 'page' ? 1 : (value as number) }));
  }, []);

  const setPage = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const activeFilters = Object.entries(filters).filter(
    ([key, val]) => key !== 'page' && key !== 'limit' && val !== '' && val != null,
  ).length;

  return { filters, setFilter, setPage, resetFilters, activeFilters };
}
