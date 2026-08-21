import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';
import type {
  DailyPreview,
  EmailSend,
  EmailTemplateMeta,
  EmailTemplatePreview,
  SendEmailsResult,
} from '../types/email';

interface RawEmailSend {
  id: string;
  type: EmailSend['type'];
  orderId?: string | null;
  calendarId?: string | null;
  day?: number | null;
  recipientEmail?: string;
  subject?: string;
  status: EmailSend['status'];
  errorMessage?: string | null;
  triggeredBy?: EmailSend['triggeredBy'];
  createdAt?: string;
}

function mapEmailSend(row: RawEmailSend): EmailSend {
  return {
    id: row.id,
    type: row.type,
    orderId: row.orderId ?? null,
    calendarId: row.calendarId ?? null,
    day: row.day ?? null,
    recipientEmail: row.recipientEmail ?? '',
    subject: row.subject ?? '',
    status: row.status,
    errorMessage: row.errorMessage ?? null,
    triggeredBy: row.triggeredBy ?? 'system',
    createdAt: row.createdAt ?? '',
  };
}

export const emailsApi = createApi({
  reducerPath: 'emailsApi',
  tagTypes: ['OrderEmails', 'DailyPreview', 'Calendar', 'EmailTemplates'],
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
    getOrderEmails: builder.query<EmailSend[], string>({
      query: (orderId) => `/orders/${orderId}/emails`,
      transformResponse: (response: { emails: RawEmailSend[] }) =>
        (response.emails ?? []).map(mapEmailSend),
      providesTags: (_result, _error, orderId) => [{ type: 'OrderEmails', id: orderId }],
    }),

    sendPaidOrderEmail: builder.mutation<SendEmailsResult, string>({
      query: (orderId) => ({
        url: `/orders/${orderId}/emails/paid`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, orderId) => [{ type: 'OrderEmails', id: orderId }],
    }),

    sendShippingEmail: builder.mutation<SendEmailsResult, string>({
      query: (orderId) => ({
        url: `/orders/${orderId}/emails/shipping`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, orderId) => [{ type: 'OrderEmails', id: orderId }],
    }),

    sendCalendarDayEmail: builder.mutation<
      SendEmailsResult & { recipient?: string },
      { calendarId: string; day: number; force?: boolean }
    >({
      query: ({ calendarId, day, force = true }) => ({
        url: `/calendars/${calendarId}/emails/day/${day}`,
        method: 'POST',
        body: { force },
      }),
      invalidatesTags: (_result, _error, { calendarId }) => [
        { type: 'Calendar', id: calendarId },
        'DailyPreview',
      ],
    }),

    getDailyPreview: builder.query<DailyPreview, void>({
      query: () => '/emails/daily-today/preview',
      providesTags: ['DailyPreview'],
    }),

    sendDailyToday: builder.mutation<SendEmailsResult, { force?: boolean }>({
      query: ({ force } = {}) => ({
        url: '/emails/daily-today',
        method: 'POST',
        body: { force: !!force },
      }),
      invalidatesTags: ['DailyPreview'],
    }),

    getEmailTemplates: builder.query<EmailTemplateMeta[], void>({
      query: () => '/email-templates',
      transformResponse: (response: { templates: EmailTemplateMeta[] }) => response.templates ?? [],
      providesTags: ['EmailTemplates'],
    }),

    getEmailTemplatePreview: builder.query<EmailTemplatePreview, string>({
      query: (id) => `/email-templates/${id}/preview`,
      transformResponse: (response: { preview: EmailTemplatePreview }) => response.preview,
    }),
  }),
});

export const {
  useGetOrderEmailsQuery,
  useSendPaidOrderEmailMutation,
  useSendShippingEmailMutation,
  useSendCalendarDayEmailMutation,
  useGetDailyPreviewQuery,
  useSendDailyTodayMutation,
  useGetEmailTemplatesQuery,
  useLazyGetEmailTemplatePreviewQuery,
} = emailsApi;
