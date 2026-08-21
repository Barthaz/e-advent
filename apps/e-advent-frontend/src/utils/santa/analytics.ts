import { getGaMeasurementId } from '../analytics';

const TRACKER_PATH = '/sledz-mikolaja';
const TRACKER_TITLE = 'Śledź Świętego Mikołaja na żywo | Tracker e-Advent';

function gtagEvent(name: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('event', name, {
    event_category: 'santa_tracker',
    ...params,
  });
}

/** Virtual page view for SPA — shows up in GA4 Reports → Engagement → Pages */
export function trackSantaTrackerPageView(debug = false) {
  if (typeof window === 'undefined') return;

  const pagePath = debug ? `${TRACKER_PATH}?debug=true` : TRACKER_PATH;
  const pageLocation = `${window.location.origin}${pagePath}`;

  if (window.gtag) {
    window.gtag('event', 'page_view', {
      page_title: TRACKER_TITLE,
      page_location: pageLocation,
      page_path: pagePath,
      send_to: getGaMeasurementId(),
    });
    window.gtag('event', 'santa_tracker_viewed', {
      event_category: 'santa_tracker',
      event_label: debug ? 'debug' : 'live',
      page_path: pagePath,
    });
  }

  if (window.fbq) {
    window.fbq('track', 'PageView');
    window.fbq('trackCustom', 'SantaTrackerView', {
      debug: debug ? 1 : 0,
    });
  }
}

export function trackSantaTrackerBannerClick() {
  gtagEvent('santa_tracker_banner_click', {
    event_label: 'promo_bar',
  });
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('trackCustom', 'SantaTrackerBannerClick');
  }
}

export function trackSantaCitySelected(cityName: string, country: string) {
  gtagEvent('santa_tracker_city_selected', {
    event_label: cityName,
    city_name: cityName,
    city_country: country,
  });
}

export function trackSantaTrackingStarted(params: {
  cityName: string;
  arrivalHour: number;
  arrivalMinute: number;
  debug: boolean;
}) {
  gtagEvent('santa_tracker_started', {
    event_label: params.cityName,
    city_name: params.cityName,
    arrival_hour: params.arrivalHour,
    arrival_minute: params.arrivalMinute,
    debug_mode: params.debug ? 1 : 0,
  });
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('trackCustom', 'SantaTrackerStarted', {
      city: params.cityName,
    });
  }
}

export function trackSantaTrackingReset() {
  gtagEvent('santa_tracker_reset', {
    event_label: 'debug_reset',
  });
}
