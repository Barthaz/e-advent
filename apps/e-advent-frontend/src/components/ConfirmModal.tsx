import type { ReactNode } from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  icon?: string;
  children?: ReactNode;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Kontynuuj',
  cancelLabel = 'Anuluj',
  icon = 'fas fa-exclamation-circle text-amber-500',
  children,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay-simple">
      <div className="modal-panel">
        <div className="flex items-start mb-4">
          <i className={`${icon} text-3xl mr-4`} />
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
            <p className="text-parchment-muted mb-4">{message}</p>
            {children}
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onConfirm} className="btn-red flex-1 py-2 px-4">
            {confirmLabel}
          </button>
          <button onClick={onClose} className="btn-secondary flex-1">
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
