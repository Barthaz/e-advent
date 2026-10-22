export const PRODUCTION_API_ORIGIN = 'https://apie-advent.vercel.app';
export const PRODUCTION_STOREFRONT_URL = 'https://e-advent.pl';

function trimSlash(value: string) {
  return value.replace(/\/$/, '');
}

function isLocalHost(url: string) {
  try {
    const { hostname } = new URL(url.includes('://') ? url : `http://${url}`);
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

/** Production builds ignore empty/localhost env so a local `.env` cannot ship into dist. */
export function resolvePublicOrigin(configured: string | undefined, productionDefault: string, isProd: boolean) {
  const raw = trimSlash(configured || '');
  if (isProd && (!raw || isLocalHost(raw))) return productionDefault;
  return raw;
}

export const API_ORIGIN = resolvePublicOrigin(
  import.meta.env.VITE_API_URL,
  PRODUCTION_API_ORIGIN,
  import.meta.env.PROD,
);

export const STOREFRONT_URL = resolvePublicOrigin(
  import.meta.env.VITE_STOREFRONT_URL,
  PRODUCTION_STOREFRONT_URL,
  import.meta.env.PROD,
) || 'http://localhost:5173';

export const ADMIN_API_BASE = `${API_ORIGIN}/api/v1/admin`;
