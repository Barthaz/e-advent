import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import modalBackground from '../assets/home/christmas-room.webp';
import './calendar-experience.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  usePortal?: boolean; // Opcjonalny prop do użycia portalu (domyślnie true)
  /** Lock overlay to 100vh (iframe / panel embed — `inset-0` can grow with the document). */
  viewportLock?: boolean;
}

export default function Modal({ isOpen, onClose, title, children, usePortal = true, viewportLock = false }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const titleId = useId();
  // Zamykanie modala po naciśnięciu Escape
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeRef.current();
      }
      if (e.key === 'Tab') {
        const controls = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]');
        if (!controls?.length) return;
        const first = controls[0], last = controls[controls.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      dialogRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const modalContent = (
    <div 
      className={
        viewportLock
          ? 'fixed top-0 left-0 right-0 z-[9999] flex h-[100vh] max-h-[100vh] w-auto max-w-full items-center justify-center overflow-hidden p-4 bg-black/70 backdrop-blur-sm animate-fade-in'
          : 'fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in'
      }
      onClick={onClose}
    >
      <div 
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="advent-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="advent-modal-photo"
          style={{ backgroundImage: `url(${modalBackground})` }}
          aria-hidden
        />
        
        {/* Zawartość modala */}
        <div className="relative z-10 flex flex-col">
          {/* Przycisk zamykania */}
          <button
            onClick={onClose}
            aria-label="Zamknij okienko"
            className="advent-modal-close"
          >
            ×
          </button>
          
          {/* Dzień X na środku w 3/5 wysokości */}
          <div className="advent-modal-heading">
            <p className="calendar-eyebrow">Chwila, która należy do Was</p>
            <h2 id={titleId}>{title}</h2>
          </div>
          
          {/* Tytuł i opis na dole w 2/5 wysokości */}
          <div className="advent-modal-content">
            <div className="h-full flex flex-col justify-center items-center">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Użyj portalu jeśli usePortal jest true (domyślnie), aby modal był renderowany w body
  if (usePortal) {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
}

