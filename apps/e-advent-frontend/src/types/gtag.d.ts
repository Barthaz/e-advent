// Google Analytics gtag types
interface Window {
  gtag?: (
    command: 'config' | 'event' | 'js' | 'set',
    targetId: string | Date,
    config?: {
      [key: string]: any;
    }
  ) => void;
  dataLayer?: any[];
  fbq?: (...args: any[]) => void;
}

