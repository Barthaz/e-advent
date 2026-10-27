import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import uiReducer from './uiSlice';
import { ordersApi } from '../api/ordersApi';
import { calendarsApi } from '../api/calendarsApi';
import { adminApi } from '../api/adminApi';
import { emailsApi } from '../api/emailsApi';
import { discountsApi } from '../api/discountsApi';
import { generatorApi } from '../api/generatorApi';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    [adminApi.reducerPath]: adminApi.reducer,
    [ordersApi.reducerPath]: ordersApi.reducer,
    [calendarsApi.reducerPath]: calendarsApi.reducer,
    [emailsApi.reducerPath]: emailsApi.reducer,
    [discountsApi.reducerPath]: discountsApi.reducer,
    [generatorApi.reducerPath]: generatorApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(adminApi.middleware)
      .concat(ordersApi.middleware)
      .concat(calendarsApi.middleware)
      .concat(emailsApi.middleware)
      .concat(discountsApi.middleware)
      .concat(generatorApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
