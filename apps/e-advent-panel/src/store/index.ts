import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import uiReducer from './uiSlice';
import { ordersApi } from '../api/ordersApi';
import { calendarsApi } from '../api/calendarsApi';
import { adminApi } from '../api/adminApi';
import { emailsApi } from '../api/emailsApi';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    [adminApi.reducerPath]: adminApi.reducer,
    [ordersApi.reducerPath]: ordersApi.reducer,
    [calendarsApi.reducerPath]: calendarsApi.reducer,
    [emailsApi.reducerPath]: emailsApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(adminApi.middleware)
      .concat(ordersApi.middleware)
      .concat(calendarsApi.middleware)
      .concat(emailsApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
