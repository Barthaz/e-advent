import { ADMIN_API_BASE } from './apiBase';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';

export type DiscountCode = {
  id: string;
  code: string;
  percent: 10 | 20 | 100;
  reusable: boolean;
  active: boolean;
  usesCount: number;
  createdAt?: string;
};

export const discountsApi = createApi({
  reducerPath: 'discountsApi',
  tagTypes: ['DiscountCode'],
  baseQuery: fetchBaseQuery({
    baseUrl: ADMIN_API_BASE,
    prepareHeaders(headers, { getState }) {
      const token = (getState() as RootState).auth.token;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  endpoints: (builder) => ({
    getDiscountCodes: builder.query<DiscountCode[], void>({
      query: () => '/discount-codes',
      transformResponse: (response: { codes: DiscountCode[] }) => response.codes ?? [],
      providesTags: ['DiscountCode'],
    }),
    createDiscountCodes: builder.mutation<DiscountCode[], { percent: 10 | 20 | 100; reusable: boolean; count?: number }>({
      query: (body) => ({ url: '/discount-codes', method: 'POST', body }),
      transformResponse: (response: { codes: DiscountCode[] }) => response.codes ?? [],
      invalidatesTags: ['DiscountCode'],
    }),
    setDiscountCodeActive: builder.mutation<DiscountCode, { id: string; active: boolean }>({
      query: ({ id, active }) => ({ url: `/discount-codes/${id}`, method: 'PATCH', body: { active } }),
      transformResponse: (response: { code: DiscountCode }) => response.code,
      invalidatesTags: ['DiscountCode'],
    }),
  }),
});

export const {
  useGetDiscountCodesQuery,
  useCreateDiscountCodesMutation,
  useSetDiscountCodeActiveMutation,
} = discountsApi;
