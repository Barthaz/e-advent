/** Empty in dev (Vite proxies /api); set VITE_API_URL for builds served without a proxy. */
export const API_ORIGIN = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export const ADMIN_API_BASE = `${API_ORIGIN}/api/v1/admin`;
