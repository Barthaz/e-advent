import { Link } from 'react-router-dom';
import { LETTER_PROMO_CODE, LETTER_PROMO_PERCENT } from '../../config/products';
import PromoCodeChip from './PromoCodeChip';

interface LetterPromoNoticeProps {
  tone?: 'onDark' | 'onLight';
  className?: string;
  showCta?: boolean;
}

export default function LetterPromoNotice({
  tone = 'onLight',
  className = '',
  showCta = false,
}: LetterPromoNoticeProps) {
  const isDark = tone === 'onDark';
  const titleClass = isDark
    ? 'font-display text-xl md:text-2xl font-semibold text-christmas-gold-light'
    : 'font-display text-xl md:text-2xl font-semibold text-christmas-green';
  const textClass = isDark
    ? 'text-white/80 text-sm md:text-base leading-relaxed'
    : 'text-parchment-text text-sm md:text-base leading-relaxed';
  const boxClass = isDark
    ? 'rounded-2xl border border-christmas-gold/40 bg-christmas-green/35 p-4 md:p-5 backdrop-blur-sm shadow-lg'
    : 'rounded-2xl border border-christmas-gold/35 bg-white/70 p-4 md:p-5 shadow-sm';

  return (
    <aside className={`${boxClass} ${className}`.trim()} aria-label="Promocja na listy do Mikołaja">
      <p className="text-christmas-gold text-xs tracking-[0.18em] uppercase mb-2">Do końca października</p>
      <p className={`${titleClass} mb-2`}>Listy i certyfikaty −{LETTER_PROMO_PERCENT}%</p>
      <p className={`${textClass} mb-3`}>
        Na List do Świętego Mikołaja i Certyfikat Grzecznego Dziecka. W kasie wpisz kod{' '}
        <strong>{LETTER_PROMO_CODE}</strong> — zniżka {LETTER_PROMO_PERCENT}% na zamówienie.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <PromoCodeChip tone={tone} />
        {showCta && (
          <Link to="/list-do-swietego-mikolaja" className="btn-gold px-5 py-2.5 text-sm">
            Zamów list −{LETTER_PROMO_PERCENT}%
          </Link>
        )}
      </div>
    </aside>
  );
}
