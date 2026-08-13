import { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../hooks/useAppDispatch';
import { removeToast } from '../../store/uiSlice';

const ICONS: Record<string, string> = {
  success: 'fa-circle-check',
  error: 'fa-circle-xmark',
  info: 'fa-circle-info',
};

const AUTO_DISMISS_MS = 4500;

export default function ToastContainer() {
  const toasts = useAppSelector((s) => s.ui.toasts);
  const dispatch = useAppDispatch();

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((t) => (
        <ToastItem
          key={t.id}
          id={t.id}
          type={t.type}
          message={t.message}
          onDismiss={() => dispatch(removeToast(t.id))}
        />
      ))}
    </div>
  );
}

interface ToastItemProps {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  onDismiss: () => void;
}

function ToastItem({ type, message, onDismiss }: ToastItemProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className={`toast toast-${type}`} role="alert">
      <i className={`fa-solid ${ICONS[type]} text-lg flex-shrink-0`} />
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button onClick={onDismiss} className="ml-2 opacity-60 hover:opacity-100 transition-opacity">
        <i className="fa-solid fa-xmark" />
      </button>
    </div>
  );
}
