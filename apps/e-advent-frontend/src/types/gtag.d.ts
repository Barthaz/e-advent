// Google Analytics gtag types
interface Window {
  gtag?: (
    command: 'config' | 'event' | 'js' | 'set',
    targetId: string | Date | Record<string, unknown>,
    config?: {
      [key: string]: unknown;
    }
  ) => void;
  dataLayer?: unknown[];
  eadventEnablePixel?: () => void;
  fbq?: (...args: unknown[]) => void;
}

