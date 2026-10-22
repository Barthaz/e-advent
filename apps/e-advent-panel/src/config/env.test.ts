import { describe, expect, it } from 'vitest';
import { PRODUCTION_API_ORIGIN, PRODUCTION_STOREFRONT_URL, resolvePublicOrigin } from './env';

describe('resolvePublicOrigin', () => {
  it('keeps relative /api in development when unset', () => {
    expect(resolvePublicOrigin(undefined, PRODUCTION_API_ORIGIN, false)).toBe('');
  });

  it('uses the production API when the production build has no origin', () => {
    expect(resolvePublicOrigin('', PRODUCTION_API_ORIGIN, true)).toBe(PRODUCTION_API_ORIGIN);
  });

  it('does not bake localhost from a local .env into a production build', () => {
    expect(resolvePublicOrigin('http://localhost:3000', PRODUCTION_API_ORIGIN, true)).toBe(PRODUCTION_API_ORIGIN);
    expect(resolvePublicOrigin('http://localhost:5173', PRODUCTION_STOREFRONT_URL, true)).toBe(PRODUCTION_STOREFRONT_URL);
  });

  it('keeps an explicit deployed origin', () => {
    expect(resolvePublicOrigin('https://api.example.test', PRODUCTION_API_ORIGIN, true)).toBe('https://api.example.test');
  });
});
