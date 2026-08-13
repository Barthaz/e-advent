import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';
import type { CalendarDetail, PatchCalendarRequest } from '../types/calendar';
import { mapCalendarDetail } from '../utils/mappers';

export const calendarsApi = createApi({
  reducerPath: 'calendarsApi',
  tagTypes: ['Calendar'],
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
    getCalendar: builder.query<CalendarDetail, string>({
      query: (id) => `/calendars/${id}`,
      transformResponse: (response: { calendar: Parameters<typeof mapCalendarDetail>[0] }) =>
        mapCalendarDetail(response.calendar),
      providesTags: (_result, _error, id) => [{ type: 'Calendar', id }],
    }),

    patchCalendar: builder.mutation<CalendarDetail, { id: string; data: PatchCalendarRequest }>({
      query: ({ id, data }) => ({
        url: `/calendars/${id}`,
        method: 'PATCH',
        body: data,
      }),
      transformResponse: (response: { calendar: Parameters<typeof mapCalendarDetail>[0] }) =>
        mapCalendarDetail(response.calendar),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Calendar', id }],
    }),
  }),
});

export const { useGetCalendarQuery, usePatchCalendarMutation } = calendarsApi;
