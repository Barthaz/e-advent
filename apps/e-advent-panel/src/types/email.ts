export type EmailSendType =
  | 'order_confirmation'
  | 'interactive_access'
  | 'shipping'
  | 'daily_window'
  | 'collaboration_invite';

export interface EmailSend {
  id: string;
  type: EmailSendType;
  orderId: string | null;
  calendarId: string | null;
  day: number | null;
  recipientEmail: string;
  subject: string;
  status: 'sent' | 'failed';
  errorMessage: string | null;
  triggeredBy: 'webhook' | 'admin' | 'cron' | 'system';
  createdAt: string;
}

export interface SendEmailsResult {
  success: boolean;
  sent: number;
  failed: number;
  skippedCount?: number;
  skipped?: boolean;
  reason?: string | null;
  day?: number | null;
  year?: number | null;
  results: Array<{
    success: boolean;
    skipped?: boolean;
    type?: string;
    recipient?: string;
    error?: string;
    reason?: string;
    day?: number;
    calendarId?: string;
  }>;
}

export interface DailyPreview {
  isAdvent: boolean;
  day: number | null;
  year: number | null;
  eligible: number;
  alreadySent: number;
  remaining: number;
}

export interface EmailTemplateMeta {
  id: EmailSendType;
  name: string;
  description: string;
  trigger: string;
  subject: string;
}

export interface EmailTemplatePreview extends EmailTemplateMeta {
  html: string;
  text: string;
  mocked: boolean;
}
