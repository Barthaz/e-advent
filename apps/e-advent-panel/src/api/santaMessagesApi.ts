import { ADMIN_API_BASE } from './apiBase';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';

export type SantaStatus =
  | 'AWAITING_PERSONALIZATION'
  | 'SCRIPT_READY'
  | 'TTS_QUEUED'
  | 'TTS_PROCESSING'
  | 'AUDIO_READY'
  | 'DELIVERED'
  | 'NEEDS_ATTENTION'
  | 'CANCELLED'
  | 'EXPIRED';

export type SantaListItem = {
  id: string;
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  sku: string;
  mode: 'standalone' | 'letter_addon';
  status: SantaStatus;
  durationSeconds: number | null;
  audioSource: string | null;
  lastErrorCode: string | null;
  createdAt: string;
  paidAt: string | null;
  deliveredAt: string | null;
};

type AudioStorage = { provider: string; r2Configured: boolean; maxAudioBytes: number };
export type SantaList = { items: SantaListItem[]; total: number; counts: Record<string, number>; storage?: AudioStorage };

export type SantaDetail = {
  id: string;
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  orderStatus: string | null;
  sku: string;
  mode: 'standalone' | 'letter_addon';
  status: SantaStatus;
  personalization: Record<string, string> | null;
  script: { text: string; estimatedSeconds: number; wordCount: number } | null;
  scriptVersion: string | null;
  submitCount: number;
  hasAudio: boolean;
  audio: { durationSeconds: number | null; bytes: number | null; source: string | null } | null;
  ttsAutomation: boolean;
  storage: AudioStorage;
  lastErrorCode: string | null;
  timestamps: Record<string, string | null>;
  events: Array<{ type: string; actor: string; details: unknown; at: string }>;
  deliveries: Array<{ type: string; version: number; status: string; attempts: number; lastError: string | null; sentAt: string | null; createdAt: string }>;
};

export type SantaAction = 'deliver' | 'resend' | 'revoke-play-link' | 'retry-tts' | 'cancel';

export function santaErrorMessage(err: unknown, fallback: string): string {
  return (err as { data?: { message?: string } })?.data?.message || fallback;
}

export const santaMessagesApi = createApi({
  reducerPath: 'santaMessagesApi',
  tagTypes: ['SantaMessage'],
  baseQuery: fetchBaseQuery({
    baseUrl: ADMIN_API_BASE,
    prepareHeaders(headers, { getState }) {
      const token = (getState() as RootState).auth.token;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  endpoints: (builder) => ({
    getSantaMessages: builder.query<SantaList, { status?: string; q?: string; limit?: number; offset?: number }>({
      query: (params) => ({ url: '/santa-messages', params: Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null)) }),
      providesTags: ['SantaMessage'],
    }),
    getSantaMessage: builder.query<SantaDetail, string>({
      query: (id) => `/santa-messages/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'SantaMessage', id }],
    }),
    santaAction: builder.mutation<{ queued?: boolean }, { id: string; action: SantaAction }>({
      query: ({ id, action }) => ({ url: `/santa-messages/${id}/${action}`, method: 'POST' }),
      invalidatesTags: ['SantaMessage'],
    }),
    updateSantaScript: builder.mutation<unknown, { id: string; text: string }>({
      query: ({ id, text }) => ({ url: `/santa-messages/${id}/script`, method: 'PUT', body: { text } }),
      invalidatesTags: ['SantaMessage'],
    }),
    attachSantaR2Audio: builder.mutation<unknown, { id: string; objectKey: string }>({
      query: ({ id, objectKey }) => ({ url: `/santa-messages/${id}/r2-audio`, method: 'POST', body: { objectKey } }),
      invalidatesTags: ['SantaMessage'],
    }),
    uploadSantaAudio: builder.mutation<unknown, { id: string; file: File }>({
      query: ({ id, file }) => {
        const body = new FormData();
        body.append('audio', file);
        return { url: `/santa-messages/${id}/audio`, method: 'POST', body };
      },
      invalidatesTags: ['SantaMessage'],
    }),
  }),
});

/** Admin audio needs the bearer token, so it is fetched as a blob instead of a plain <audio src>. */
export async function fetchSantaAudioUrl(id: string, token: string | null): Promise<string> {
  const response = await fetch(`${ADMIN_API_BASE}/santa-messages/${id}/audio`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error('Nie udało się pobrać nagrania.');
  return URL.createObjectURL(await response.blob());
}

export const {
  useGetSantaMessagesQuery,
  useGetSantaMessageQuery,
  useSantaActionMutation,
  useUpdateSantaScriptMutation,
  useUploadSantaAudioMutation,
  useAttachSantaR2AudioMutation,
} = santaMessagesApi;
