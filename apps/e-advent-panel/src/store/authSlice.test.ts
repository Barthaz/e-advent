import { describe, it, expect, beforeEach, vi } from 'vitest';

const STORAGE_KEY = 'eadvent_admin_auth';

describe('authSlice (A-06 / UT-15)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('setCredentials persists token to localStorage', async () => {
    const { default: authReducer, setCredentials } = await import('./authSlice');
    const expiresAt = new Date(Date.now() + 3600_000).toISOString();
    const state = authReducer(
      { token: null, username: null, expiresAt: null },
      setCredentials({
        token: 'jwt-token',
        username: 'admin',
        expiresAt,
      })
    );

    expect(state.token).toBe('jwt-token');
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.token).toBe('jwt-token');
    expect(stored.username).toBe('admin');
  });

  it('clearCredentials removes token from state and localStorage', async () => {
    const expiresAt = new Date(Date.now() + 3600_000).toISOString();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        token: 'jwt-token',
        username: 'admin',
        expiresAt,
      })
    );

    const { default: authReducer, clearCredentials } = await import('./authSlice');
    const state = authReducer(
      { token: 'jwt-token', username: 'admin', expiresAt },
      clearCredentials()
    );

    expect(state.token).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('expired credentials in storage are treated as logged out on load', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        token: 'expired-token',
        username: 'admin',
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      })
    );

    const { default: authReducer } = await import('./authSlice');
    expect(authReducer(undefined, { type: '@@INIT' }).token).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
