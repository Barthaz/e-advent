import { useState } from 'react';
import { LETTER_PROMO_CODE } from '../../config/products';

interface PromoCodeChipProps {
  className?: string;
  tone?: 'onDark' | 'onLight';
}

export default function PromoCodeChip({ className = '', tone = 'onLight' }: PromoCodeChipProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(LETTER_PROMO_CODE);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const toneClass =
    tone === 'onDark'
      ? 'border-christmas-gold/50 bg-christmas-green/70 text-christmas-gold-light hover:bg-christmas-green'
      : 'border-christmas-gold/60 bg-white/80 text-christmas-green hover:bg-white';

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-sm font-semibold tracking-wide transition-colors ${toneClass} ${className}`.trim()}
      aria-label={`Skopiuj kod rabatowy ${LETTER_PROMO_CODE}`}
    >
      <span>{LETTER_PROMO_CODE}</span>
      <i className={`fas ${copied ? 'fa-check' : 'fa-copy'} text-xs opacity-80`} aria-hidden />
      <span className="sr-only">{copied ? 'Skopiowano' : 'Kopiuj kod'}</span>
    </button>
  );
}
