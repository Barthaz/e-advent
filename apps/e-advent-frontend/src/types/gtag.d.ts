// Google Analytics gtag types
interface Window {
  gtag?: (
    command: 'config' | 'event' | 'js' | 'set',
    targetId: string | Date,
    config?: {
      [key: string]: unknown;
    }
  ) => void;
  dataLayer?: unknown[];
  fbq?: (...args: unknown[]) => void;
}

