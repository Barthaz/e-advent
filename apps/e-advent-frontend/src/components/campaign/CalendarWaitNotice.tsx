import { Link } from 'react-router-dom';
import { LETTER_PROMO_CODE, LETTER_PROMO_PERCENT } from '../../config/products';
import PromoCodeChip from './PromoCodeChip';

interface CalendarWaitNoticeProps {
  tone?: 'onDark' | 'onLight';
  className?: string;
}

export default function CalendarWaitNotice({ tone = 'onLight', className = '' }: CalendarWaitNoticeProps) {
  const isDark = tone === 'onDark';
  const titleClass = isDark
    ? 'font-display text-2xl md:text-3xl font-semibold text-christmas-gold-light leading-tight'
    : 'font-display text-2xl md:text-3xl font-semibold text-christmas-green leading-tight';
  const textClass = isDark
    ? 'text-white/80 text-sm md:text-base leading-relaxed'
    : 'text-parchment-text text-sm md:text-base leading-relaxed';
  const boxClass = isDark
    ? 'rounded-2xl border border-christmas-gold/45 bg-christmas-green/40 p-5 md:p-7 backdrop-blur-sm shadow-xl'
    : 'parchment-card p-5 md:p-7';

  return (
    <aside className={`${boxClass} ${className}`.trim()} aria-label="Zamówienia kalendarzy od 1 listopada">
      <p className="text-christmas-gold text-xs tracking-[0.18em] uppercase mb-2">Adwent lubi się zapowiadać</p>
      <p className={`${titleClass} mb-3`}>Zamówienia od 1 listopada</p>
      <p className={`${textClass} mb-3`}>
        Zamówienia kalendarzy interaktywnych i kalendarza zdrapka przyjmiemy od 1 listopada — żeby grudzień
        zdążył zapukać na czas.
      </p>
      <p className={`${textClass} mb-4`}>
        A póki magia się rozgrzewa, Mikołaj zostawił wcześniejszy prezent: listy i certyfikaty z kodem{' '}
        <strong>{LETTER_PROMO_CODE}</strong> są {LETTER_PROMO_PERCENT}% taniej na zamówienie — do końca października.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <PromoCodeChip tone={tone} />
        <Link to="/list-do-swietego-mikolaja" className="btn-gold px-5 py-2.5 text-sm">
          Zamów List do Mikołaja −{LETTER_PROMO_PERCENT}%
        </Link>
      </div>
    </aside>
  );
}
