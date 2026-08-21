// Helper do komunikacji z backendem

import type { CalendarFormat, DesignSelection, OpeningMethod, ProductType, ShippingAddress } from '../types/order';
import type { OpenedCalendarWindow, SpecialWindowDescriptor, SpecialWindowProgress } from '@e-advent/types';
import { catalogTaskIdFromPreview } from '../special-windows/previewCalendar';

const API_BASE_URL = import.meta.env.VITE_API_URL;
if (!API_BASE_URL) {
  throw new Error('Missing VITE_API_URL — set it in apps/e-advent-frontend/.env');
}

// Wewnętrzna struktura danych (używana w aplikacji)
export interface InternalCalendarData {
  name: string;
  email: string;
  calendarTitle: string;
  tasks: Array<{
    day: number;
    /** Treść / opis dnia */
    task: string;
    /** Opcjonalny tytuł dnia (zdrapka) */
    title?: string;
    catalogTaskId?: string;
    duration?: number;
    lockedDay?: number;
    latestDay?: number;
  }>;
  dates?: string[];
  dailyEmailReminders?: boolean;
  openingMethod?: OpeningMethod;
  dailyContentEmail?: string;
  previewLayout?: Array<{
    day: number;
    width: number;
    height: number;
    order: number;
    x?: number;
    y?: number;
  }>;
  openedDays?: number[];
  productType?: ProductType;
  sku?: string;
  format?: CalendarFormat;
  design?: DesignSelection;
  shippingAddress?: ShippingAddress;
  fulfillmentStatus?: string;
}

// Struktura danych zgodna z API backendu
export interface CreateCalendarRequest {
  id?: string; // Opcjonalne - tylko dla aktualizacji
  title: string; // Tytuł kalendarza
  author: string; // Imię autora
  email: string; // Email autora
  creation?: string; // Data utworzenia (ISO string) - opcjonalne, backend może ustawić
  modified?: string; // Data modyfikacji (ISO string) - opcjonalne, backend może ustawić
  tasks: Array<{
    /**
     * Interaktywny: treść okienka.
     * Zdrapka z tytułem dnia: nagłówek; treść wtedy w `description`.
     */
    title: string;
    day: number;
    status: 'opened' | 'closed';
    /** Zdrapka: treść pod tytułem dnia */
    description?: string;
    latestDay?: number;
    duration?: number;
    catalogTaskId?: string;
  }>;
  productType?: ProductType;
  sku?: string;
  format?: CalendarFormat;
  design?: DesignSelection;
  shippingAddress?: ShippingAddress;
  fulfillmentStatus?: string;
  openingMethod?: OpeningMethod;
  dailyContentEmail?: string;
}

export interface CreateCalendarResponse {
  success: boolean;
  calendar: {
    id: string;
    status: string;
    createdAt: string;
  };
  editToken?: string;
  message?: string;
}

/**
 * Mapuje wewnętrzną strukturę danych na strukturę API
 */
function mapToApiFormat(
  internalData: InternalCalendarData,
  calendarId?: string,
  openedDays?: number[]
): CreateCalendarRequest {
  const openedDaysSet = new Set(openedDays || []);
  
  return {
    id: calendarId || undefined,
    title: internalData.calendarTitle,
    author: internalData.name,
    email: internalData.email,
    tasks: internalData.tasks.map(task => {
      const dayTitle = task.title?.trim();
      // Zdrapka: title = nagłówek dnia, description = treść. Interaktywny: title = treść.
      if (dayTitle) {
        return {
          title: dayTitle,
          description: task.task,
          day: task.day,
          status: (openedDaysSet.has(task.day) ? 'opened' : 'closed') as 'opened' | 'closed',
          ...(task.catalogTaskId ? { catalogTaskId: task.catalogTaskId } : {}),
          ...(task.latestDay !== undefined ? { latestDay: task.latestDay } : {}),
          ...(task.duration !== undefined ? { duration: task.duration } : {}),
        };
      }
      return {
        title: task.task,
        day: task.day,
        status: (openedDaysSet.has(task.day) ? 'opened' : 'closed') as 'opened' | 'closed',
        ...(task.catalogTaskId ? { catalogTaskId: task.catalogTaskId } : {}),
        ...(task.latestDay !== undefined ? { latestDay: task.latestDay } : {}),
        ...(task.duration !== undefined ? { duration: task.duration } : {}),
      };
    }),
    ...(internalData.productType ? { productType: internalData.productType } : {}),
    ...(internalData.sku ? { sku: internalData.sku } : {}),
    ...(internalData.format ? { format: internalData.format } : {}),
    ...(internalData.design ? { design: internalData.design } : {}),
    ...(internalData.shippingAddress ? { shippingAddress: internalData.shippingAddress } : {}),
    ...(internalData.fulfillmentStatus ? { fulfillmentStatus: internalData.fulfillmentStatus } : {}),
    ...(internalData.openingMethod ? { openingMethod: internalData.openingMethod } : {}),
    ...(internalData.dailyContentEmail ? { dailyContentEmail: internalData.dailyContentEmail } : {}),
  };
}

export async function createCalendar(
  internalData: InternalCalendarData,
  calendarId?: string,
  _forceNewId?: string
): Promise<CreateCalendarResponse> {
  const pendingToken = typeof localStorage !== 'undefined'
    ? localStorage.getItem('e-advent-pending-edit-token')
    : null;
  const usePut = Boolean(calendarId && pendingToken);
  const url = usePut
    ? `${API_BASE_URL}/calendars/${calendarId}`
    : `${API_BASE_URL}/calendars`;

  // Never send client id/status — server generates UUID and forces pending
  const apiData = mapToApiFormat(internalData, undefined, internalData.openedDays);
  delete (apiData as { id?: string }).id;
  delete (apiData as { status?: string }).status;

  const requestBody: Record<string, unknown> = {
    calendar: apiData,
  };
  if (usePut && pendingToken) {
    requestBody.editToken = pendingToken;
  }

  const requestOptions = {
    method: usePut ? 'PUT' : 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(usePut && pendingToken ? { 'X-Calendar-Edit-Token': pendingToken } : {}),
    },
    body: JSON.stringify(requestBody),
  };

  const startTime = Date.now();

  try {
    const response = await fetch(url, requestOptions);
    const responseData = await response.json();

    const hasError = !response.ok || responseData.error;

    if (hasError) {
      const errorMessage = responseData.message || responseData.error || 'Failed to create calendar';

      if (calendarId && (response.status === 403 || response.status === 404 || errorMessage.includes('not found'))) {
        try {
          localStorage.removeItem('e-advent-pending-calendar-id');
          localStorage.removeItem('e-advent-pending-edit-token');
          localStorage.removeItem('calendarId');
        } catch {
          /* ignore */
        }
        return createCalendar(internalData, undefined);
      }

      const error = new Error(errorMessage) as Error & { status?: number; responseData?: unknown };
      error.status = response.status;
      error.responseData = responseData;
      throw error;
    }

    if (!responseData.calendar || !responseData.calendar.id) {
      throw new Error('Backend zwrócił nieprawidłową strukturę odpowiedzi - brak calendar.id');
    }

    if (responseData.editToken) {
      try {
        localStorage.setItem('e-advent-pending-calendar-id', responseData.calendar.id);
        localStorage.setItem('e-advent-pending-edit-token', responseData.editToken);
        localStorage.setItem('calendarId', responseData.calendar.id);
      } catch {
        /* ignore */
      }
    }

    console.log('[API] Kalendarz utworzony/zaktualizowany:', responseData.calendar.id);
    return responseData as CreateCalendarResponse;
  } catch (error) {
    const requestDuration = Date.now() - startTime;
    console.error('[API] Błąd podczas wywołania API:', {
      error,
      duration: `${requestDuration}ms`,
      url,
    });
    throw error;
  }
}

export interface GetCalendarResponse {
  success: boolean;
  calendar: {
    id: string;
    title: string;
    author: string;
    email: string;
    creation: string;
    modified: string;
    status?: string; // Status zamówienia (np. 'pending', 'paid', 'completed')
    tasks: Array<{
      title: string;
      day: number;
      status: 'opened' | 'closed';
      latestDay?: number;
      duration?: number;
      catalogTaskId?: string;
      isSpecial?: boolean;
      special?: OpenedCalendarWindow['special'];
    }>;
    productType?: string;
    sku?: string;
    format?: string;
    design?: { imageUrl?: string };
    shippingAddress?: {
      firstName?: string;
      lastName?: string;
      fullName?: string;
      street?: string;
      city?: string;
      postalCode?: string;
      phone?: string;
      country?: string;
    };
    openingMethod?: OpeningMethod;
    dailyContentEmail?: string;
  };
}

export async function getCalendar(calendarId: string): Promise<GetCalendarResponse> {
  console.log('[API] Pobieranie kalendarza:', calendarId);
  const url = `${API_BASE_URL}/calendars/${calendarId}`;

  const fetchOnce = () => fetch(url);
  let response: Response;
  try {
    response = await fetchOnce();
  } catch {
    await new Promise((r) => setTimeout(r, 400));
    response = await fetchOnce();
  }

  if (!response.ok) {
    console.error('[API] Błąd podczas pobierania kalendarza:', {
      status: response.status,
      statusText: response.statusText,
    });
    throw new Error('Calendar not found');
  }

  const responseData = await response.json();
  console.log('[API] Kalendarz pobrany:', {
    success: responseData.success,
    hasCalendar: !!responseData.calendar,
    calendarId: responseData.calendar?.id,
    title: responseData.calendar?.title,
    tasksCount: responseData.calendar?.tasks?.length,
  });

  return responseData as GetCalendarResponse;
}

/**
 * Otwiera okienko kalendarza (oznacza zadanie jako otwarte)
 */
export type OpenDayResponse = {
  success: boolean;
  message?: string;
  calendar?: unknown;
  openedWindow?: OpenedCalendarWindow;
};

export async function openCalendarDay(
  calendarId: string,
  day: number,
  _accessCode?: string
): Promise<OpenDayResponse> {
  console.log('[API] Otwieranie okienka:', { calendarId, day });
  const url = `${API_BASE_URL}/calendars/${calendarId}/open/${day}`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    console.error('[API] Błąd podczas otwierania okienka:', {
      status: response.status,
      statusText: response.statusText,
    });
    throw new Error(`Failed to open day ${day}`);
  }

  const responseData = await response.json();
  return responseData;
}

export interface CreatePaymentIntentRequest {
  amount: number;
  currency: string;
  customerEmail: string;
  orderId: string;
  productId?: string;
  items?: Array<{
    sku?: string;
    calendarId?: string;
    quantity?: number;
  }>;
  shippingAddress?: {
    firstName?: string;
    lastName?: string;
    fullName: string;
    street: string;
    city: string;
    postalCode: string;
    phone: string;
    country?: string;
  };
  metadata?: {
    productName?: string;
    [key: string]: string | undefined;
  };
  acceptanceData?: {
    termsAccepted: boolean;
    privacyAccepted: boolean;
    termsAcceptedAt: string;
    privacyAcceptedAt: string;
    clientIP: string | null;
  };
}

export interface CreatePaymentIntentSuccessResponse {
  clientSecret: string;
  paymentIntentId: string;
  productId?: string | null;
  orderId?: string;
  /** Publiczny numer zamówienia, np. "000001" */
  orderNumber?: string | null;
  amount?: number;
  shipping?: number;
  subtotal?: number;
}

export interface CreatePaymentIntentErrorResponse {
  errors: Array<{
    msg: string;
    param: string;
    location: string;
  }>;
}

export async function createPaymentIntent(
  data: CreatePaymentIntentRequest
): Promise<CreatePaymentIntentSuccessResponse> {
  const url = `${API_BASE_URL}/stripe/create-payment-intent`;

  if (!data.orderId || (typeof data.orderId === 'string' && data.orderId.trim() === '')) {
    throw new Error('orderId jest wymagany');
  }
  const hasItems = Array.isArray(data.items) && data.items.length > 0;
  if (!hasItems && (!data.productId || (typeof data.productId === 'string' && data.productId.trim() === ''))) {
    throw new Error('productId (calendarId) lub items jest wymagany');
  }

  const requestBody = {
    data: {
      amount: data.amount,
      currency: data.currency,
      customerEmail: data.customerEmail,
      orderId: String(data.orderId),
      ...(data.productId ? { productId: String(data.productId) } : {}),
      ...(hasItems ? { items: data.items } : {}),
      ...(data.shippingAddress ? { shippingAddress: data.shippingAddress } : {}),
      metadata: {
        ...(data.metadata || {}),
        ...(data.shippingAddress
          ? { shippingAddress: JSON.stringify(data.shippingAddress) }
          : {}),
      },
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  const responseData = await response.json();
  if (!response.ok || responseData.error || responseData.errors) {
    const msg =
      responseData.message ||
      responseData.error ||
      responseData.errors?.[0]?.msg ||
      'Failed to create payment intent';
    throw new Error(msg);
  }

  return responseData as CreatePaymentIntentSuccessResponse;
}

export interface UpdateCalendarAcceptanceRequest {
  calendarId: string;
  acceptanceData: {
    termsAccepted: boolean;
    privacyAccepted: boolean;
    termsAcceptedAt: string; // ISO timestamp
    privacyAcceptedAt: string; // ISO timestamp
    clientIP: string | null;
  };
}

export interface PaymentOrderItem {
  id?: string;
  sku: string;
  productType?: string;
  quantity: number;
  unitPrice: number;
  calendarId?: string | null;
  metadata?: { childName?: string } | null;
}

export interface PaymentOrderResponse {
  payment: {
    id: string;
    orderNumber?: number | null;
    orderNumberDisplay?: string | null;
    stripePaymentIntentId?: string;
    amount: number;
    shippingAmount?: number;
    status: string;
    customerEmail?: string | null;
    customerName?: string | null;
    customerPhone?: string | null;
    sku?: string | null;
    productType?: string | null;
    format?: string | null;
    shippingAddress?: {
      fullName?: string;
      street?: string;
      city?: string;
      postalCode?: string;
      phone?: string;
    } | null;
    items?: PaymentOrderItem[];
  };
  stripeStatus?: string;
}

export async function getPaymentByIntentId(paymentIntentId: string): Promise<PaymentOrderResponse> {
  const url = `${API_BASE_URL}/stripe/payment/${encodeURIComponent(paymentIntentId)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Payment not found (${response.status})`);
  }
  return response.json() as Promise<PaymentOrderResponse>;
}

export interface UpdateCalendarAcceptanceResponse {
  success: boolean;
  message?: string;
}

export async function updateCalendarAcceptance(
  data: UpdateCalendarAcceptanceRequest
): Promise<UpdateCalendarAcceptanceResponse> {
  const url = `${API_BASE_URL}/calendars/${data.calendarId}/acceptance`;
  console.log('[API] Wywoływanie updateCalendarAcceptance:', {
    url,
    method: 'PUT',
    calendarId: data.calendarId,
    acceptanceData: data.acceptanceData,
  });

  const requestOptions = {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      acceptanceData: data.acceptanceData,
    }),
  };

  console.log('[API] Wysyłanie żądania HTTP...');
  const startTime = Date.now();
  
  try {
    const response = await fetch(url, requestOptions);
    const requestDuration = Date.now() - startTime;
    
    console.log('[API] Otrzymano odpowiedź:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      duration: `${requestDuration}ms`,
    });

    const responseData = await response.json();
    console.log('[API] Parsowana odpowiedź:', {
      success: responseData.success,
      message: responseData.message,
    });

    if (!response.ok) {
      const errorMessage = responseData.message || 'Failed to update acceptance data';
      console.error('[API] Błąd odpowiedzi API:', {
        status: response.status,
        errorMessage,
      });
      throw new Error(errorMessage);
    }

    console.log('[API] Dane akceptacji zaktualizowane pomyślnie');
    return responseData as UpdateCalendarAcceptanceResponse;
  } catch (error) {
    const requestDuration = Date.now() - startTime;
    console.error('[API] Błąd podczas wywołania API:', {
      error,
      duration: `${requestDuration}ms`,
      url,
    });
    throw error;
  }
}

export interface ValidatePromoCodeRequest {
  code: string;
}

export interface ValidatePromoCodeResponse {
  success: boolean;
  valid: boolean;
  discount?: number; // Procent zniżki (0-100)
  message?: string;
}

export async function validatePromoCode(
  code: string
): Promise<ValidatePromoCodeResponse> {
  const url = `${API_BASE_URL}/promocodes/${encodeURIComponent(code)}`;
  console.log('[API] Wywoływanie validatePromoCode:', {
    url,
    method: 'GET',
    code,
  });

  const requestOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  console.log('[API] Wysyłanie żądania HTTP...');
  const startTime = Date.now();
  
  try {
    const response = await fetch(url, requestOptions);
    const requestDuration = Date.now() - startTime;
    
    console.log('[API] Otrzymano odpowiedź:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      duration: `${requestDuration}ms`,
    });

    const responseData = await response.json();
    console.log('[API] Parsowana odpowiedź:', {
      success: responseData.success,
      valid: responseData.valid,
      discount: responseData.discount,
      message: responseData.message,
    });

    if (!response.ok) {
      const errorMessage = responseData.message || 'Failed to validate promo code';
      console.error('[API] Błąd odpowiedzi API:', {
        status: response.status,
        errorMessage,
      });
      throw new Error(errorMessage);
    }

    console.log('[API] Kod promocyjny zwalidowany pomyślnie');
    return responseData as ValidatePromoCodeResponse;
  } catch (error) {
    const requestDuration = Date.now() - startTime;
    console.error('[API] Błąd podczas wywołania API:', {
      error,
      duration: `${requestDuration}ms`,
      url,
    });
    throw error;
  }
}

export interface UpdateCalendarStatusRequest {
  calendarId: string;
  status: string; // 'pending' | 'succeeded' | 'failed' etc.
}

export interface UpdateCalendarStatusResponse {
  success: boolean;
  message?: string;
}

export async function updateCalendarStatus(
  data: UpdateCalendarStatusRequest
): Promise<UpdateCalendarStatusResponse> {
  const url = `${API_BASE_URL}/calendars/${data.calendarId}/status`;
  console.log('[API] Wywoływanie updateCalendarStatus:', {
    url,
    method: 'PUT',
    calendarId: data.calendarId,
    status: data.status,
  });

  const requestOptions = {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      status: data.status,
    }),
  };

  console.log('[API] Wysyłanie żądania HTTP...');
  const startTime = Date.now();
  
  try {
    const response = await fetch(url, requestOptions);
    const requestDuration = Date.now() - startTime;
    
    console.log('[API] Otrzymano odpowiedź:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      duration: `${requestDuration}ms`,
    });

    const responseData = await response.json();
    console.log('[API] Parsowana odpowiedź:', {
      success: responseData.success,
      message: responseData.message,
    });

    if (!response.ok) {
      const errorMessage = responseData.message || 'Failed to update calendar status';
      console.error('[API] Błąd odpowiedzi API:', {
        status: response.status,
        errorMessage,
      });
      throw new Error(errorMessage);
    }

    console.log('[API] Status kalendarza zaktualizowany pomyślnie');
    return responseData as UpdateCalendarStatusResponse;
  } catch (error) {
    const requestDuration = Date.now() - startTime;
    console.error('[API] Błąd podczas wywołania API:', {
      error,
      duration: `${requestDuration}ms`,
      url,
    });
    throw error;
  }
}

export interface CreateFreeCalendarResponse {
  success: boolean;
  calendar: {
    id: string;
    status: string;
    createdAt: string;
  };
  accessCode?: string;
  message?: string;
}

export async function createFreeCalendar(
  internalData: InternalCalendarData,
  calendarId: string | undefined,
  promoCode: string
): Promise<CreateFreeCalendarResponse> {
  if (!promoCode) {
    throw new Error('Kod promocyjny jest wymagany');
  }

  // Ensure calendar exists as pending first
  let id = calendarId;
  if (!id) {
    const created = await createCalendar(internalData);
    id = created.calendar.id;
  } else {
    await createCalendar(internalData, id);
  }

  const url = `${API_BASE_URL}/calendars/createFree`;
  const requestBody = {
    calendarId: id,
    email: internalData.email,
    promoCode,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  const responseData = await response.json();
  if (!response.ok || responseData.error) {
    throw new Error(responseData.message || responseData.error || 'Failed to create free calendar');
  }
  if (!responseData.calendar || !responseData.calendar.id) {
    throw new Error('Backend zwrócił nieprawidłową strukturę odpowiedzi - brak calendar.id');
  }

  if (responseData.accessCode) {
    try {
      sessionStorage.setItem(`e-advent-access-code-${responseData.calendar.id}`, responseData.accessCode);
    } catch {
      /* ignore */
    }
  }

  return responseData as CreateFreeCalendarResponse;
}

export interface GetCalendarByAccessCodeRequest {
  email: string;
  accessCode: string;
}

export interface GetCalendarByAccessCodeResponse {
  success: boolean;
  calendar: {
    id: string;
    title: string;
    author: string;
    email: string;
    creation: string;
    modified: string;
    status?: string;
    tasks: Array<{
      title: string;
      day: number;
      status: 'opened' | 'closed';
      latestDay?: number;
      duration?: number;
      catalogTaskId?: string;
      isSpecial?: boolean;
      special?: OpenedCalendarWindow['special'];
    }>;
  };
  message?: string;
}

export async function getCalendarByAccessCode(
  email: string,
  accessCode: string
): Promise<GetCalendarByAccessCodeResponse> {
  const url = `${API_BASE_URL}/calendars/access`;
  console.log('[API] Pobieranie kalendarza po kodzie dostępu:', {
    url,
    method: 'POST',
    email,
    accessCodeLength: accessCode.length,
  });

  const requestOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      accessCode,
    }),
  };

  console.log('[API] Wysyłanie żądania HTTP...');
  const startTime = Date.now();
  
  try {
    const response = await fetch(url, requestOptions);
    const requestDuration = Date.now() - startTime;
    
    console.log('[API] Otrzymano odpowiedź:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      duration: `${requestDuration}ms`,
    });

    const responseData = await response.json();
    console.log('[API] Parsowana odpowiedź:', {
      success: responseData.success,
      hasCalendar: !!responseData.calendar,
      calendarId: responseData.calendar?.id,
    });

    if (!response.ok) {
      const errorMessage = responseData.message || 'Nieprawidłowy email lub kod dostępu';
      console.error('[API] Błąd odpowiedzi API:', {
        status: response.status,
        errorMessage,
      });
      throw new Error(errorMessage);
    }

    // Walidacja struktury odpowiedzi
    if (!responseData.calendar || !responseData.calendar.id) {
      console.error('[API] Nieprawidłowa struktura odpowiedzi:', responseData);
      throw new Error('Backend zwrócił nieprawidłową strukturę odpowiedzi - brak calendar.id');
    }

    console.log('[API] Kalendarz pobrany po kodzie dostępu pomyślnie, calendarId:', responseData.calendar.id);
    return responseData as GetCalendarByAccessCodeResponse;
  } catch (error) {
    const requestDuration = Date.now() - startTime;
    console.error('[API] Błąd podczas wywołania API:', {
      error,
      duration: `${requestDuration}ms`,
      url,
    });
    throw error;
  }
}

export interface UploadDesignResponse {
  success: boolean;
  imageUrl?: string;
  imageKey?: string;
  error?: string;
}

export async function uploadDesignImage(
  file: File,
  calendarId: string,
  editToken: string
): Promise<UploadDesignResponse> {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('calendarId', calendarId);
  formData.append('editToken', editToken);

  const response = await fetch(`${API_BASE_URL}/uploads/design`, {
    method: 'POST',
    headers: {
      'X-Calendar-Edit-Token': editToken,
      'X-Calendar-Id': calendarId,
    },
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Błąd uploadu grafiki');
  }
  return data as UploadDesignResponse;
}

function specialHeaders(): Record<string, string> {
  return { 'Content-Type': 'application/json' };
}

export async function getSpecialProgress(
  calendarId: string,
  day: number
): Promise<{ progress: SpecialWindowProgress | null; dateGate?: { revealed: boolean; revealAt: string | null } }> {
  const res = await fetch(`${API_BASE_URL}/calendars/${calendarId}/days/${day}/special/progress`, {
    headers: specialHeaders(),
  });
  if (!res.ok) return { progress: null };
  const data = await res.json();
  return {
    progress: data.progress ?? null,
    dateGate: data.dateGate,
  };
}

export async function saveSpecialProgress(
  calendarId: string,
  day: number,
  body: Partial<SpecialWindowProgress> & { seal?: boolean; revealAt?: string }
): Promise<{ progress: SpecialWindowProgress; dateGate?: { revealed: boolean; revealAt: string | null } }> {
  const res = await fetch(`${API_BASE_URL}/calendars/${calendarId}/days/${day}/special/progress`, {
    method: 'PUT',
    headers: specialHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Autosave failed');
  const data = await res.json();
  return { progress: data.progress, dateGate: data.dateGate };
}

export async function uploadSpecialImage(
  calendarId: string,
  day: number,
  slot: string,
  blob: Blob,
  filename = 'photo.jpg'
): Promise<{ imageUrl: string; imageKey?: string }> {
  const formData = new FormData();
  formData.append('image', blob, filename);
  formData.append('slot', slot);

  const response = await fetch(
    `${API_BASE_URL}/calendars/${calendarId}/days/${day}/special/upload`,
    { method: 'POST', body: formData }
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || data.message || 'Błąd uploadu grafiki');
  }
  return { imageUrl: data.imageUrl, imageKey: data.imageKey };
}

export async function completeSpecialWindow(calendarId: string, day: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/calendars/${calendarId}/days/${day}/special/complete`, {
    method: 'POST',
    headers: specialHeaders(),
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error('Complete failed');
}

export async function exportSpecialPdf(
  calendarId: string,
  day: number,
  variant: 'COLOR' | 'INK_SAVER' = 'COLOR',
  payload?: Record<string, unknown>,
  layout?: 'PORTRAIT' | 'LANDSCAPE' | 'SQUARE'
): Promise<Blob> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('Do wygenerowania PDF potrzebne jest połączenie z internetem.');
  }

  const previewTaskId = catalogTaskIdFromPreview(calendarId);
  const url = previewTaskId
    ? `${API_BASE_URL}/special/preview/pdf`
    : `${API_BASE_URL}/calendars/${calendarId}/days/${day}/special/export/pdf`;

  const res = await fetch(url, {
    method: 'POST',
    headers: specialHeaders(),
    body: JSON.stringify({
      variant,
      ...(payload ? { payload } : {}),
      ...(layout ? { layout } : {}),
      ...(previewTaskId ? { catalogTaskId: previewTaskId } : {}),
    }),
  });
  if (!res.ok) {
    let message = 'Nie udało się wygenerować PDF.';
    try {
      const data = await res.json();
      message = data.message || data.error || message;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(message);
  }
  return res.blob();
}

export type { OpenedCalendarWindow, SpecialWindowDescriptor, SpecialWindowProgress };

