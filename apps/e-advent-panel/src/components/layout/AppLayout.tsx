import type { ReactNode } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import ToastContainer from '../ui/Toast';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { setSidebarOpen } from '../../store/uiSlice';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const dispatch = useAppDispatch();
  const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen);

  return (
    <div className="flex h-screen overflow-hidden bg-cream">
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/45 lg:hidden"
          aria-label="Zamknij menu"
          onClick={() => dispatch(setSidebarOpen(false))}
        />
      )}
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 min-h-0 p-4 md:p-6 overflow-y-auto">
          {children}
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}
