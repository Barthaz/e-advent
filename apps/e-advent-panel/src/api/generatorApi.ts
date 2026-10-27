import { ADMIN_API_BASE } from './apiBase';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';
import type { CalendarDetail } from '../types/calendar';
import { mapCalendarDetail } from '../utils/mappers';

export type GeneratorKind = 'certificate' | 'scratch' | 'interactive';

export interface GeneratorListResponse {
  items: CalendarDetail[];
  total: number;
  page: number;
  limit: number;
}

type RawCalendar = Parameters<typeof mapCalendarDetail>[0];

export const generatorApi = createApi({
  reducerPath: 'generatorApi',
  tagTypes: ['Generator'],
  baseQuery: fetchBaseQuery({
    baseUrl: ADMIN_API_BASE,
    prepareHeaders(headers, { getState }) {
      const token = (getState() as RootState).auth.token;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  endpoints: (builder) => ({
    getGenerated: builder.query<GeneratorListResponse, { type?: GeneratorKind | ''; page?: number; limit?: number }>({
      query: ({ type, page = 1, limit = 50 }) => {
        const params = new URLSearchParams();
        if (type) params.set('type', type);
        params.set('page', String(page));
        params.set('limit', String(limit));
        return `/generator?${params}`;
      },
      transformResponse: (response: { items?: RawCalendar[]; total?: number; page?: number; limit?: number }) => ({
        items: (response.items ?? []).map(mapCalendarDetail),
        total: response.total ?? 0,
        page: response.page ?? 1,
        limit: response.limit ?? 50,
      }),
      providesTags: ['Generator'],
    }),

    createCertificate: builder.mutation<CalendarDetail, { childName: string; variant: 'on' | 'ona' }>({
      query: (body) => ({ url: '/generator/certificates', method: 'POST', body }),
      transformResponse: (response: { calendar: RawCalendar }) => mapCalendarDetail(response.calendar),
      invalidatesTags: ['Generator'],
    }),

    createScratch: builder.mutation<CalendarDetail, {
      title?: string;
      color: 'green' | 'red' | 'blue';
      presetId?: number | string;
      tasks?: Array<{ day: number; title?: string; description?: string }>;
    }>({
      query: (body) => ({ url: '/generator/scratch', method: 'POST', body }),
      transformResponse: (response: { calendar: RawCalendar }) => mapCalendarDetail(response.calendar),
      invalidatesTags: ['Generator'],
    }),

    createInteractive: builder.mutation<{ calendar: CalendarDetail; accessCode: string }, {
      title?: string;
      email: string;
      openingMethod: 'app' | 'email' | 'online';
      dailyContentEmail?: string;
      tasks?: Array<{ day: number; title?: string; task?: string }>;
    }>({
      query: (body) => ({ url: '/generator/interactive', method: 'POST', body }),
      transformResponse: (response: { calendar: RawCalendar; accessCode?: string }) => {
        const calendar = mapCalendarDetail(response.calendar);
        return { calendar, accessCode: response.accessCode || calendar.access_code || '' };
      },
      invalidatesTags: ['Generator'],
    }),
  }),
});

export const {
  useGetGeneratedQuery,
  useCreateCertificateMutation,
  useCreateScratchMutation,
  useCreateInteractiveMutation,
} = generatorApi;
