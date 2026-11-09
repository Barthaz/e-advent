import type { Personalization, PurchaseMode } from './validation';

const API_BASE_URL = import.meta.env.VITE_API_URL as string;

export interface FieldError {
  field: string;
  code: string;
  min?: number;
  max?: number;
}

export class SantaApiError extends Error {
  status: number;
  code: string;
  fieldErrors: FieldError[];

  constructor(status: number, code: string, message: string, fieldErrors: FieldError[] = []) {
    super(message);
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/santa-messages${path}`, {
      ...init,
      referrerPolicy: 'no-referrer',
      headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
    });
  } catch {
    throw new SantaApiError(0, 'NETWORK', 'Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.');
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new SantaApiError(
      response.status,
      body?.error || 'ERROR',
      body?.message || 'Coś poszło nie tak. Spróbuj ponownie.',
      Array.isArray(body?.errors) ? body.errors : [],
    );
  }
  if (body === null) throw new SantaApiError(response.status, 'INVALID_RESPONSE', 'Serwer nie zwrócił danych wiadomości.');
  return body as T;
}

export interface DraftResult {
  id: string;
  key?: string;
  mode: PurchaseMode;
  preview: { text: string; estimatedSeconds: number } | null;
}

export interface DraftView extends DraftResult {
  status: string;
  personalization: Personalization | null;
}

export function createDraft(mode: PurchaseMode, personalization: Personalization): Promise<DraftResult> {
  return request<DraftResult>('/drafts', { method: 'POST', body: JSON.stringify({ mode, personalization }) });
}

export function updateDraft(id: string, key: string, mode: PurchaseMode, personalization: Personalization): Promise<DraftResult> {
  return request<DraftResult>(`/drafts/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'X-Santa-Draft-Key': key },
    body: JSON.stringify({ mode, personalization }),
  });
}

export function getDraft(id: string, key: string): Promise<DraftView> {
  return request<DraftView>(`/drafts/${encodeURIComponent(id)}`, { headers: { 'X-Santa-Draft-Key': key } });
}

export type MessageStatus =
  | 'AWAITING_PERSONALIZATION'
  | 'SCRIPT_READY'
  | 'TTS_QUEUED'
  | 'TTS_PROCESSING'
  | 'AUDIO_READY'
  | 'DELIVERED'
  | 'NEEDS_ATTENTION'
  | 'CANCELLED'
  | 'EXPIRED';

export interface ActivationView {
  status: MessageStatus;
  mode: PurchaseMode;
  email: string;
  orderNumber: string | null;
  personalization: Personalization | null;
  script: { text: string; estimatedSeconds: number } | null;
  canEdit: boolean;
  canApprove: boolean;
  approvalRequired: boolean;
  remainingEdits: number;
}

export function getActivation(token: string): Promise<ActivationView> {
  return request<ActivationView>(`/activate/${encodeURIComponent(token)}`);
}

export function submitActivation(token: string, personalization: Personalization): Promise<ActivationView> {
  return request<ActivationView>(`/activate/${encodeURIComponent(token)}/submit`, {
    method: 'POST',
    body: JSON.stringify({ personalization }),
  });
}

export function approveActivation(token: string): Promise<ActivationView> {
  return request<ActivationView>(`/activate/${encodeURIComponent(token)}/approve`, { method: 'POST', body: '{}' });
}

export interface PlaybackView {
  childName?: string;
  childVocative: string;
  durationSeconds: number | null;
  audioUrl: string;
  downloadUrl: string;
  transcript: string;
  availableUntil: string | null;
}

export function absoluteAudioUrl(path: string): string {
  return /^https?:/.test(path) ? path : `${API_BASE_URL}${path}`;
}

export function getPlayback(token: string): Promise<PlaybackView> {
  return request<PlaybackView>(`/play/${encodeURIComponent(token)}`);
}

export function refreshPlayback(token: string): Promise<PlaybackView> {
  return request<PlaybackView>(`/play/${encodeURIComponent(token)}/refresh-audio`, { method: 'POST', body: '{}' });
}

/** Refresh the signed URL at download time, including after a long pause on the finale. */
export async function downloadRecording(token: string): Promise<void> {
  const fresh = await refreshPlayback(token);
  await saveAudioFile(absoluteAudioUrl(fresh.downloadUrl));
}

export async function saveAudioFile(sourceUrl: string): Promise<void> {
  const response = await fetch(sourceUrl, { referrerPolicy: 'no-referrer' });
  if (!response.ok) throw new Error('Audio download failed');
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = 'wiadomosc-od-swietego-mikolaja.mp3';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
