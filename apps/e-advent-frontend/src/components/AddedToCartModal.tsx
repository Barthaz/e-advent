import { useEffect } from 'react';

interface AddedToCartModalProps {
  open: boolean;
  onContinue: () => void;
  onGoToCart: () => void;
}

export default function AddedToCartModal({ open, onContinue, onGoToCart }: AddedToCartModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onContinue();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onContinue]);

  if (!open) return null;

  return (
    <div
      className="modal-overlay-simple"
      role="dialog"
      aria-modal="true"
      aria-labelledby="added-to-cart-title"
      onClick={onContinue}
    >
      <div className="modal-panel text-center" onClick={(event) => event.stopPropagation()}>
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-christmas-green/10 text-christmas-green">
          <i className="fas fa-check text-xl" aria-hidden />
        </div>
        <h3 id="added-to-cart-title" className="font-display text-2xl font-semibold text-christmas-green mb-2">
          Dodano do koszyka
        </h3>
        <p className="text-parchment-muted mb-6">
          Możesz dokończyć zamówienie albo wrócić do sklepu.
        </p>
        <div className="flex flex-col gap-3">
          <button type="button" className="btn-gold w-full py-3 text-base" onClick={onGoToCart}>
            Przejdź do koszyka
          </button>
          <button type="button" className="btn-outline-gold w-full py-3 text-base !text-christmas-green !border-christmas-green/40" onClick={onContinue}>
            Kontynuuj zakupy
          </button>
        </div>
      </div>
    </div>
  );
}
