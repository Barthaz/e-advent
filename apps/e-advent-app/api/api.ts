// API helper dla aplikacji mobilnej
import type { CalendarPayload } from '@e-advent/types';

export type { CalendarPayload };

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'https://intaz-server.vercel.app/api'; // temporary until EAS env is set

export const ORDER_CALENDAR_URL =
  process.env.EXPO_PUBLIC_ORDER_CALENDAR_URL ?? 'https://e-advent.pl/stworz-kalendarz';

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
  accessCode?: string
): Promise<{ success: boolean }> {
  console.log('[API] Otwieranie okienka:', { calendarId, day, hasAccessCode: !!accessCode });
  const url = `${API_BASE_URL}/calendars/${calendarId}/open/${day}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(accessCode ? { 'X-Access-Code': accessCode } : {}),
      },
      body: JSON.stringify(accessCode ? { accessCode } : {}),
    });
  } catch (error) {
    console.error('[API] Błąd połączenia:', error);
    throw new Error('Nie można połączyć się z serwerem. Sprawdź połączenie internetowe.');
  }

  if (!response.ok) {
    let errorMessage = `Nie udało się otworzyć okienka dnia ${day}`;
    if (response.status === 401 || response.status === 403) {
      errorMessage = 'Brak uprawnień do otwarcia okienka. Zaloguj się ponownie kodem dostępu.';
    } else if (response.status === 404) {
      errorMessage = 'Kalendarz nie został znaleziony.';
    } else if (response.status >= 500) {
      errorMessage = 'Serwer tymczasowo niedostępny. Spróbuj ponownie za chwilę.';
    } else if (response.status === 400) {
      errorMessage = 'Nie można otworzyć tego okienka.';
    }
    throw new Error(errorMessage);
  }

  return { success: true };
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
