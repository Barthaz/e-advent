import { getGaMeasurementId, isPrivatePagePath, sanitizePagePath } from './analytics';

const key = 'eadvent-measurement-consent';

export function measurementChoice(): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

export function startMeasurement() {
  if (window.gtag) return;
  const id = getGaMeasurementId();
  window.dataLayer ??= [];
  window.gtag = function () {
    // Google's bootstrap queues Arguments objects until gtag.js loads.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag('js', new Date());
  const location = window.location;
  const path = sanitizePagePath(location.pathname + location.search);
  window.gtag('set', { page_location: location.origin + path, page_referrer: document.referrer ? new URL(document.referrer).origin : '' });
  window.gtag('config', id, { send_page_view: false });
  const tag = document.createElement('script');
  tag.async = true;
  tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
  document.head.append(tag);
  if (!isPrivatePagePath(location.pathname)) window.eadventEnablePixel?.();
}

export function chooseMeasurement(accepted: boolean) {
  try {
    localStorage.setItem(key, accepted ? 'yes' : 'no');
    if (accepted) localStorage.setItem('cookieConsent', 'accepted');
    else localStorage.removeItem('cookieConsent');
  } catch { /* Session choice still applies. */ }
  if (accepted && !window.gtag) {
    startMeasurement();
    window.dispatchEvent(new Event('eadvent:measurement-enabled'));
  } else if (!accepted && window.gtag) {
    window.location.reload();
  }
}
