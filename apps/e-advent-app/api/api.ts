// API helper dla aplikacji mobilnej
import type { CalendarPayload, OpenedCalendarWindow, SpecialWindowProgress } from '@e-advent/types';

export type { CalendarPayload };

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;
if (!API_BASE_URL) {
  throw new Error('Missing EXPO_PUBLIC_API_URL — set it in apps/e-advent-app/.env');
}

const orderCalendarUrl = process.env.EXPO_PUBLIC_ORDER_CALENDAR_URL;
if (!orderCalendarUrl) {
  throw new Error('Missing EXPO_PUBLIC_ORDER_CALENDAR_URL — set it in apps/e-advent-app/.env');
}
export const ORDER_CALENDAR_URL = orderCalendarUrl;

export type AccessCredentials = {
  email: string;
  accessCode: string;
};

function accessHeaders(credentials: AccessCredentials): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Access-Email': credentials.email,
    'X-Access-Code': credentials.accessCode,
  };
}

async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const data = await response.json();
    if (data?.message) return String(data.message);
  } catch {
    // ignore
  }
  return fallback;
}

export interface GetCalendarResponse {
  success: boolean;
  calendar: CalendarPayload;
}

export async function getCalendar(calendarId: string): Promise<GetCalendarResponse> {
  console.log('[API] Pobieranie kalendarza:', calendarId);
  const url = `${API_BASE_URL}/calendars/${calendarId}`;

  let response: Response;
  try {
    response = await fetch(url);
  } catch (error) {
    console.error('[API] Błąd połączenia:', error);
    throw new Error('Nie można połączyć się z serwerem. Sprawdź połączenie internetowe.');
  }

  if (!response.ok) {
    let errorMessage = 'Nie udało się pobrać kalendarza';
    if (response.status === 404) {
      errorMessage = 'Kalendarz o podanym ID nie został znaleziony. Sprawdź poprawność ID.';
    } else if (response.status >= 500) {
      errorMessage = 'Serwer tymczasowo niedostępny. Spróbuj ponownie za chwilę.';
    } else if (response.status === 400) {
      errorMessage = 'Nieprawidłowe ID kalendarza.';
    } else {
      errorMessage = `Nie udało się pobrać kalendarza (błąd ${response.status}).`;
    }
    throw new Error(errorMessage);
  }

  return (await response.json()) as GetCalendarResponse;
}

export interface GetCalendarByAccessCodeResponse {
  success: boolean;
  calendar: CalendarPayload;
  message?: string;
}

export async function getCalendarByAccessCode(
  email: string,
  accessCode: string
): Promise<GetCalendarByAccessCodeResponse> {
  console.log('[API] Pobieranie kalendarza po kodzie dostępu:', {
    email,
    accessCodeLength: accessCode.length,
  });
  const url = `${API_BASE_URL}/calendars/access`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, accessCode }),
    });
  } catch (error) {
    console.error('[API] Błąd połączenia:', error);
    throw new Error('Nie można połączyć się z serwerem. Sprawdź połączenie internetowe.');
  }

  if (!response.ok) {
    let errorMessage = await parseErrorMessage(response, 'Nieprawidłowy email lub kod dostępu');
    if (response.status === 404) {
      errorMessage = 'Nie znaleziono kalendarza dla podanego adresu email i kodu dostępu.';
    } else if (response.status >= 500) {
      errorMessage = 'Serwer tymczasowo niedostępny. Spróbuj ponownie za chwilę.';
    } else if (response.status === 400) {
      errorMessage = 'Nieprawidłowy email lub kod dostępu.';
    }
    throw new Error(errorMessage);
  }

  const responseData = await response.json();
  if (!responseData.calendar || !responseData.calendar.id) {
    throw new Error('Nieprawidłowa struktura odpowiedzi z serwera.');
  }

  return responseData as GetCalendarByAccessCodeResponse;
}

export async function openCalendarDay(
  calendarId: string,
  day: number,
  _accessCode?: string
): Promise<{ success: boolean; openedWindow?: OpenedCalendarWindow }> {
  console.log('[API] Otwieranie okienka:', { calendarId, day });
  const url = `${API_BASE_URL}/calendars/${calendarId}/open/${day}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
  } catch (error) {
    console.error('[API] Błąd połączenia:', error);
    throw new Error('Nie można połączyć się z serwerem. Sprawdź połączenie internetowe.');
  }

  if (!response.ok) {
    let errorMessage = `Nie udało się otworzyć okienka dnia ${day}`;
    if (response.status === 404) {
      errorMessage = 'Kalendarz nie został znaleziony.';
    } else if (response.status >= 500) {
      errorMessage = 'Serwer tymczasowo niedostępny. Spróbuj ponownie za chwilę.';
    } else if (response.status === 400) {
      errorMessage = 'Nie można otworzyć tego okienka.';
    }
    throw new Error(errorMessage);
  }

  const data = (await response.json()) as {
    success?: boolean;
    openedWindow?: OpenedCalendarWindow;
  };
  return { success: data.success !== false, openedWindow: data.openedWindow };
}

export interface MinVersionResponse {
  minVersion: string;
  message?: string;
  updateUrl?: string;
}

export async function getMinVersion(): Promise<MinVersionResponse> {
  const url = `${API_BASE_URL}/android/min-version`;
  let response: Response;
  try {
    response = await fetch(url);
  } catch (error) {
    throw new Error('Nie można sprawdzić aktualizacji. Sprawdź połączenie internetowe.');
  }

  if (!response.ok) {
    throw new Error('Nie można sprawdzić aktualizacji.');
  }

  return (await response.json()) as MinVersionResponse;
}

// ── Collaboration ────────────────────────────────────────────────────────────

export type CollaborationMember = {
  email: string;
  role: 'owner' | 'member';
  status: 'pending' | 'active';
  invitedAt?: string;
};

export type CollaborationResponse = {
  success: boolean;
  collaboration: { id: string; ownerEmail: string } | null;
  members: CollaborationMember[];
  me?: { email: string; role: 'owner' | 'member'; status: 'pending' | 'active' };
};

export async function getCollaboration(
  credentials: AccessCredentials
): Promise<CollaborationResponse> {
  const response = await fetch(`${API_BASE_URL}/collaboration`, {
    method: 'GET',
    headers: accessHeaders(credentials),
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, 'Nie udało się pobrać współpracy'));
  }

  return (await response.json()) as CollaborationResponse;
}

export async function inviteCollaborator(
  credentials: AccessCredentials,
  email: string
): Promise<CollaborationResponse & { invited?: CollaborationMember; emailSent?: boolean }> {
  const response = await fetch(`${API_BASE_URL}/collaboration/invite`, {
    method: 'POST',
    headers: accessHeaders(credentials),
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, 'Nie udało się zaprosić osoby'));
  }

  return await response.json();
}

export async function removeCollaborator(
  credentials: AccessCredentials,
  email: string
): Promise<{ success: boolean; dissolved?: boolean; members?: CollaborationMember[] }> {
  const response = await fetch(
    `${API_BASE_URL}/collaboration/members/${encodeURIComponent(email)}`,
    {
      method: 'DELETE',
      headers: accessHeaders(credentials),
    }
  );

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, 'Nie udało się usunąć członka'));
  }

  return await response.json();
}

// ── Shared tasks ─────────────────────────────────────────────────────────────

export type SharedTask = {
  id: string;
  collaborationId: string;
  authorEmail: string;
  text: string;
  done: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export async function getSharedTasks(credentials: AccessCredentials): Promise<SharedTask[]> {
  const response = await fetch(`${API_BASE_URL}/shared-tasks`, {
    method: 'GET',
    headers: accessHeaders(credentials),
  });

  if (response.status === 404 || response.status === 403) {
    return [];
  }

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, 'Nie udało się pobrać wspólnych zadań'));
  }

  const data = await response.json();
  return (data.tasks || []) as SharedTask[];
}

export async function createSharedTask(
  credentials: AccessCredentials,
  text: string
): Promise<SharedTask> {
  const response = await fetch(`${API_BASE_URL}/shared-tasks`, {
    method: 'POST',
    headers: accessHeaders(credentials),
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, 'Nie udało się dodać zadania'));
  }

  const data = await response.json();
  return data.task as SharedTask;
}

export async function updateSharedTask(
  credentials: AccessCredentials,
  id: string,
  patch: { text?: string; done?: boolean }
): Promise<SharedTask> {
  const response = await fetch(`${API_BASE_URL}/shared-tasks/${id}`, {
    method: 'PATCH',
    headers: accessHeaders(credentials),
    body: JSON.stringify(patch),
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, 'Nie udało się zaktualizować zadania'));
  }

  const data = await response.json();
  return data.task as SharedTask;
}

export async function deleteSharedTask(
  credentials: AccessCredentials,
  id: string
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/shared-tasks/${id}`, {
    method: 'DELETE',
    headers: accessHeaders(credentials),
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, 'Nie udało się usunąć zadania'));
  }
}

// ── Gift ideas ───────────────────────────────────────────────────────────────

export type GiftIdea = {
  id: string;
  collaborationId: string;
  authorEmail: string;
  text: string;
  createdAt?: string;
  updatedAt?: string;
};

export async function getGiftIdeas(credentials: AccessCredentials): Promise<GiftIdea[]> {
  const response = await fetch(`${API_BASE_URL}/gift-ideas`, {
    method: 'GET',
    headers: accessHeaders(credentials),
  });

  if (response.status === 404 || response.status === 403) {
    return [];
  }

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, 'Nie udało się pobrać pomysłów na prezent'));
  }

  const data = await response.json();
  return (data.ideas || []) as GiftIdea[];
}

export async function createGiftIdea(
  credentials: AccessCredentials,
  text: string
): Promise<GiftIdea> {
  const response = await fetch(`${API_BASE_URL}/gift-ideas`, {
    method: 'POST',
    headers: accessHeaders(credentials),
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, 'Nie udało się dodać pomysłu'));
  }

  const data = await response.json();
  return data.idea as GiftIdea;
}

export async function updateGiftIdea(
  credentials: AccessCredentials,
  id: string,
  text: string
): Promise<GiftIdea> {
  const response = await fetch(`${API_BASE_URL}/gift-ideas/${id}`, {
    method: 'PATCH',
    headers: accessHeaders(credentials),
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, 'Nie udało się zaktualizować pomysłu'));
  }

  const data = await response.json();
  return data.idea as GiftIdea;
}

export async function deleteGiftIdea(
  credentials: AccessCredentials,
  id: string
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/gift-ideas/${id}`, {
    method: 'DELETE',
    headers: accessHeaders(credentials),
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, 'Nie udało się usunąć pomysłu'));
  }
}

function specialHeaders(): Record<string, string> {
  return { 'Content-Type': 'application/json' };
}

export async function getSpecialProgress(
  calendarId: string,
  day: number
): Promise<SpecialWindowProgress | null> {
  const res = await fetch(`${API_BASE_URL}/calendars/${calendarId}/days/${day}/special/progress`, {
    headers: specialHeaders(),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.progress ?? null;
}

export async function saveSpecialProgress(
  calendarId: string,
  day: number,
  body: Partial<SpecialWindowProgress>
): Promise<SpecialWindowProgress> {
  const res = await fetch(`${API_BASE_URL}/calendars/${calendarId}/days/${day}/special/progress`, {
    method: 'PUT',
    headers: specialHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Autosave failed');
  const data = await res.json();
  return data.progress;
}

export async function uploadSpecialImage(
  calendarId: string,
  day: number,
  slot: string,
  uri: string,
  mimeType = 'image/jpeg'
): Promise<{ imageUrl: string; imageKey?: string }> {
  const formData = new FormData();
  const name = `${slot}.${mimeType.includes('png') ? 'png' : 'jpg'}`;
  formData.append('image', { uri, name, type: mimeType } as unknown as Blob);
  formData.append('slot', slot);

  const res = await fetch(`${API_BASE_URL}/calendars/${calendarId}/days/${day}/special/upload`, {
    method: 'POST',
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.message || 'Błąd uploadu grafiki');
  }
  return { imageUrl: data.imageUrl, imageKey: data.imageKey };
}

export async function exportSpecialPdf(
  calendarId: string,
  day: number,
  payload?: Record<string, unknown>
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/calendars/${calendarId}/days/${day}/special/export/pdf`, {
    method: 'POST',
    headers: specialHeaders(),
    body: JSON.stringify({
      variant: 'COLOR',
      client: 'mobile',
      ...(payload ? { payload } : {}),
    }),
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Nie udało się przygotować PDF.'));
  }

  const buffer = await res.arrayBuffer();
  const { File, Paths } = await import('expo-file-system');
  const Sharing = await import('expo-sharing');
  const file = new File(Paths.cache, `e-advent-dzien-${day}.pdf`);
  file.write(new Uint8Array(buffer));

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: 'Zapisz listę PDF',
    });
    return;
  }

  throw new Error('Na tym urządzeniu nie da się udostępnić pliku PDF.');
}
