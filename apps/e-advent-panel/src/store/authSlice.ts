import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AuthState, LoginResponse } from '../types/auth';

const STORAGE_KEY = 'eadvent_admin_auth';

function loadFromStorage(): AuthState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { token: null, username: null, expiresAt: null };
    const parsed = JSON.parse(raw) as AuthState;
    if (parsed.expiresAt && new Date(parsed.expiresAt) < new Date()) {
      localStorage.removeItem(STORAGE_KEY);
      return { token: null, username: null, expiresAt: null };
    }
    return parsed;
  } catch {
    return { token: null, username: null, expiresAt: null };
  }
}

const initialState: AuthState = loadFromStorage();

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<LoginResponse>) {
      state.token = action.payload.token;
      state.username = action.payload.username;
      state.expiresAt = action.payload.expiresAt;
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          token: action.payload.token,
          username: action.payload.username,
          expiresAt: action.payload.expiresAt,
        }),
      );
    },
    clearCredentials(state) {
      state.token = null;
      state.username = null;
      state.expiresAt = null;
      localStorage.removeItem(STORAGE_KEY);
    },
  },
});

export const { setCredentials, clearCredentials } = authSlice.actions;
export default authSlice.reducer;

export const selectToken = (state: { auth: AuthState }) => state.auth.token;
export const selectUsername = (state: { auth: AuthState }) => state.auth.username;
export const selectIsAuthenticated = (state: { auth: AuthState }) => !!state.auth.token;
