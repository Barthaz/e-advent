import { ADMIN_API_BASE } from './apiBase';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';
import type {
  OrdersResponse,
  OrderDetail,
  OrderFilters,
  PatchOrderRequest,
  OrderListItem,
} from '../types/order';
import { mapOrdersResponse, mapOrderDetail, mapPatchedOrder } from '../utils/mappers';

export const ordersApi = createApi({
  reducerPath: 'ordersApi',
  tagTypes: ['Order', 'OrderList'],
  baseQuery: fetchBaseQuery({
    baseUrl: ADMIN_API_BASE,
    prepareHeaders(headers, { getState }) {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  endpoints: (builder) => ({
    getDashboard: builder.query<DashboardResponse, void>({
      query: () => '/dashboard',
      transformResponse: (raw: RawDashboard) => ({
        season: raw.season,
        summary: raw.summary,
        today: mapOrdersResponse({ orders: raw.today ?? [], total: raw.today?.length ?? 0, page: 1, limit: raw.today?.length ?? 0 }).orders,
        toFulfill: mapOrdersResponse({ orders: raw.toFulfill ?? [], total: raw.toFulfill?.length ?? 0, page: 1, limit: raw.toFulfill?.length ?? 0 }).orders,
        toShip: mapOrdersResponse({ orders: raw.toShip ?? [], total: raw.toShip?.length ?? 0, page: 1, limit: raw.toShip?.length ?? 0 }).orders,
        listLimit: raw.listLimit ?? 40,
      }),
      providesTags: ['OrderList'],
    }),

    getOrders: builder.query<OrdersResponse, OrderFilters>({
      query: (filters) => {
        const params = new URLSearchParams();
        if (filters.status)             params.set('status', filters.status);
        if (filters.fulfillment_status) params.set('fulfillment_status', filters.fulfillment_status);
        if (filters.product_type)       params.set('product_type', filters.product_type);
        if (filters.delivery_type)      params.set('delivery_type', filters.delivery_type);
        if (filters.from)               params.set('from', filters.from);
        if (filters.to)                 params.set('to', filters.to);
        if (filters.search)             params.set('search', filters.search);
        if (filters.page)               params.set('page', String(filters.page));
        if (filters.limit)              params.set('limit', String(filters.limit));
        return `/orders?${params.toString()}`;
      },
      transformResponse: (response: Parameters<typeof mapOrdersResponse>[0]) =>
        mapOrdersResponse(response),
      providesTags: ['OrderList'],
    }),

    getOrder: builder.query<OrderDetail, string>({
      query: (id) => `/orders/${id}`,
      transformResponse: (response: { order: Parameters<typeof mapOrderDetail>[0] }) =>
        mapOrderDetail(response.order),
      providesTags: (_result, _error, id) => [{ type: 'Order', id }],
    }),

    patchOrder: builder.mutation<OrderDetail, { id: string; data: PatchOrderRequest }>({
      query: ({ id, data }) => ({
        url: `/orders/${id}`,
        method: 'PATCH',
        body: data,
      }),
      transformResponse: (response: { order: Record<string, unknown> }) =>
        mapPatchedOrder(response.order),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Order', id },
        'OrderList',
      ],
    }),

    syncInpost: builder.mutation<{ skipped: boolean; refreshed: number; failed: number }, void>({
      query: () => ({ url: '/inpost/sync', method: 'POST' }),
      invalidatesTags: ['OrderList', 'Order'],
    }),
  }),
});

export interface DashboardSummary {
  orders: number;
  ordersTotal: number;
  paidOrders: number;
  paidAmount: number;
  averagePaid: number;
  canceledOrders: number;
  pendingOrders: number;
  toFulfill: number;
  toShip: number;
  todayOrders: number;
  currency: string;
}

export interface DashboardResponse {
  season: { year: number; label: string; from: string; to: string };
  summary: DashboardSummary;
  today: OrderListItem[];
  toFulfill: OrderListItem[];
  toShip: OrderListItem[];
  listLimit: number;
}

type RawDashboard = {
  season: DashboardResponse['season'];
  summary: DashboardSummary;
  today?: Parameters<typeof mapOrdersResponse>[0]['orders'];
  toFulfill?: Parameters<typeof mapOrdersResponse>[0]['orders'];
  toShip?: Parameters<typeof mapOrdersResponse>[0]['orders'];
  listLimit?: number;
};

export const {
  useGetDashboardQuery,
  useGetOrdersQuery,
  useGetOrderQuery,
  usePatchOrderMutation,
  useSyncInpostMutation,
} = ordersApi;
