import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';
import type {
  OrdersResponse,
  OrderDetail,
  OrderFilters,
  PatchOrderRequest,
} from '../types/order';
import { mapOrdersResponse, mapOrderDetail, mapPatchedOrder } from '../utils/mappers';

export const ordersApi = createApi({
  reducerPath: 'ordersApi',
  tagTypes: ['Order', 'OrderList'],
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/v1/admin',
    prepareHeaders(headers, { getState }) {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  endpoints: (builder) => ({
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
  }),
});

export const { useGetOrdersQuery, useGetOrderQuery, usePatchOrderMutation } = ordersApi;
