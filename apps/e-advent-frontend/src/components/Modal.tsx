import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import modalBackground from '../assets/adventTaskModal.png';

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
  // Zamykanie modala po naciśnięciu Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

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
        className="relative rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-slide-down"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${modalBackground})` }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-black/35" aria-hidden />
        
        {/* Zawartość modala */}
        <div className="relative z-10 h-full flex flex-col">
          {/* Przycisk zamykania */}
          <button
            onClick={onClose}
            className="absolute cursor-pointer top-6 right-6 text-white hover:text-gray-200 text-3xl font-bold rounded-full w-10 h-10 flex items-center justify-center transition-all z-20"
          >
            ×
          </button>
          
          {/* Dzień X na środku w 3/5 wysokości */}
          <div className="flex-1 flex items-center justify-center" style={{ height: '60%' }}>
            <h2 className="text-6xl md:text-8xl font-bold text-christmas-gold-light drop-shadow-2xl font-calligraphy">{title}</h2>
          </div>
          
          {/* Tytuł i opis na dole w 2/5 wysokości */}
          <div className="flex-shrink-0 px-6 pb-6 overflow-y-auto" style={{ maxHeight: '42%', minHeight: '32%' }}>
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

