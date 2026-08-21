import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import AuthGuard from './guards/AuthGuard';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import OrdersPage from './pages/OrdersPage';
import OrderDetailPage from './pages/OrderDetailPage';
import CalendarDetailPage from './pages/CalendarDetailPage';
import DailyEmailsPage from './pages/DailyEmailsPage';
import EmailTemplatesPage from './pages/EmailTemplatesPage';
import CatalogTasksPage from './pages/CatalogTasksPage';

export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/*"
            element={
              <AuthGuard>
                <AppLayout>
                  <Routes>
                    <Route index element={<Navigate to="/orders" replace />} />
                    <Route path="orders" element={<OrdersPage />} />
                    <Route path="orders/:id" element={<OrderDetailPage />} />
                    <Route path="calendars/:id" element={<CalendarDetailPage />} />
                    <Route path="emails" element={<DailyEmailsPage />} />
                    <Route path="email-templates" element={<EmailTemplatesPage />} />
                    <Route path="tasks" element={<CatalogTasksPage />} />
                    <Route path="*" element={<Navigate to="/orders" replace />} />
                  </Routes>
                </AppLayout>
              </AuthGuard>
            }
          />
        </Routes>
      </BrowserRouter>
    </Provider>
  );
}
