export const PREVIEW_CALENDAR_PREFIX = '__preview__:';

export function previewCalendarId(catalogTaskId: string): string {
  return `${PREVIEW_CALENDAR_PREFIX}${catalogTaskId}`;
}

export function isPreviewCalendarId(calendarId: string): boolean {
  return calendarId.startsWith(PREVIEW_CALENDAR_PREFIX);
}

export function catalogTaskIdFromPreview(calendarId: string): string | null {
  if (!isPreviewCalendarId(calendarId)) return null;
  return calendarId.slice(PREVIEW_CALENDAR_PREFIX.length) || null;
}
