import certificatePreview from '../../assets/certyficate-preview.webp';
import { formatPrice, FREE_SHIPPING_THRESHOLD } from '../../config/products';

export const MAX_LETTER_QTY = 9;

interface LetterPackComposerProps {
  letterQty: number;
  onLetterQtyChange: (qty: number) => void;
  certNames: string[];
  onCertNamesChange: (names: string[]) => void;
  letterPrice: number;
  certificatePrice: number;
  letterCompareAt?: number;
  certificateCompareAt?: number;
  error: string | null;
}

function PriceWithCompare({ price, compareAt }: { price: number; compareAt?: number }) {
  if (compareAt != null && compareAt > price) {
    return (
      <>
        <span className="line-through decoration-white/40 text-white/45">{formatPrice(compareAt)}</span>
        {' '}
        {formatPrice(price)}
      </>
    );
  }
  return <>{formatPrice(price)}</>;
}

function polishCount(n: number, one: string, few: string, many: string) {
  if (n === 1) return `${n} ${one}`;
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} ${few}`;
  return `${n} ${many}`;
}

export default function LetterPackComposer({
  letterQty,
  onLetterQtyChange,
  certNames,
  onCertNamesChange,
  letterPrice,
  certificatePrice,
  letterCompareAt,
  certificateCompareAt,
  error,
}: LetterPackComposerProps) {
  const filledCerts = certNames.filter((name) => name.trim().length >= 2).length;
  const canAddCert = certNames.length < letterQty;
  const packTotal = letterQty * letterPrice + filledCerts * certificatePrice;
  const catalogTotal =
    letterQty * (letterCompareAt ?? letterPrice) + filledCerts * (certificateCompareAt ?? certificatePrice);

  const setQty = (next: number) => {
    const qty = Math.min(MAX_LETTER_QTY, Math.max(1, next));
    onLetterQtyChange(qty);
    if (certNames.length > qty) onCertNamesChange(certNames.slice(0, qty));
  };

  const updateName = (index: number, value: string) => {
    onCertNamesChange(certNames.map((name, i) => (i === index ? value : name)));
  };

  return (
    <div className="mb-6 space-y-4">
      <div className="rounded-2xl border border-christmas-gold/35 bg-white/5 p-4 md:p-5 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-display text-lg text-christmas-gold-light">Zestawy listów</p>
            <p className="text-white/55 text-sm mt-0.5">
              2 wersje listu, koperta i naklejki · <PriceWithCompare price={letterPrice} compareAt={letterCompareAt} /> / szt.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              className="h-10 w-10 rounded-full border border-christmas-gold/50 text-christmas-gold-light text-xl leading-none hover:bg-white/10 disabled:opacity-40"
              aria-label="Mniej zestawów"
              disabled={letterQty <= 1}
              onClick={() => setQty(letterQty - 1)}
            >
              −
            </button>
            <span className="w-8 text-center font-sans text-2xl font-semibold tabular-nums text-christmas-gold-light" aria-live="polite">
              {letterQty}
            </span>
            <button
              type="button"
              className="h-10 w-10 rounded-full border border-christmas-gold/50 text-christmas-gold-light text-xl leading-none hover:bg-white/10 disabled:opacity-40"
              aria-label="Więcej zestawów"
              disabled={letterQty >= MAX_LETTER_QTY}
              onClick={() => setQty(letterQty + 1)}
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-christmas-gold/35 bg-white/5 p-4 md:p-5 backdrop-blur-sm">
        <div className="flex gap-4 items-start">
          <figure className="w-[88px] sm:w-[112px] shrink-0 rounded-lg border border-christmas-gold/30 bg-cream/10 p-1.5 shadow-lg">
            <img
              src={certificatePreview}
              alt="Podgląd Certyfikatu Grzecznego Dziecka"
              width={280}
              height={364}
              loading="lazy"
              decoding="async"
              className="w-full h-auto rounded-md object-contain"
            />
          </figure>
          <div className="min-w-0 flex-1">
            <p className="font-display text-[15px] sm:text-lg text-christmas-gold-light leading-snug">
              Certyfikaty Grzecznego Dziecka
            </p>
            <p className="text-white/70 text-sm leading-relaxed mt-1.5">
              Imię na ozdobnym dokumencie od Świętego Mikołaja —{' '}
              <PriceWithCompare price={certificatePrice} compareAt={certificateCompareAt} /> za dziecko.
              Możesz dodać mniej certyfikatów niż listów.
            </p>
          </div>
        </div>

        {certNames.length > 0 && (
          <ul className="mt-4 space-y-2">
            {certNames.map((name, index) => (
              <li key={`cert-${index}`} className="flex items-center gap-2">
                <span className="w-6 shrink-0 text-center text-christmas-gold/80 text-sm font-display">
                  {index + 1}
                </span>
                <input
                  id={`certificate-child-name-${index}`}
                  type="text"
                  value={name}
                  onChange={(e) => updateName(index, e.target.value)}
                  placeholder="Imię dziecka"
                  maxLength={60}
                  aria-label={`Imię dziecka na certyfikacie ${index + 1}`}
                  className="w-full rounded-xl border border-christmas-gold/40 bg-cream/95 px-4 py-2.5 text-parchment-text placeholder:text-parchment-muted/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-christmas-gold"
                />
                <button
                  type="button"
                  className="shrink-0 p-2 text-white/50 hover:text-white transition-colors"
                  aria-label={`Usuń certyfikat ${index + 1}`}
                  onClick={() => onCertNamesChange(certNames.filter((_, i) => i !== index))}
                >
                  <i className="fas fa-times" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {canAddCert ? (
          <button
            type="button"
            className="mt-4 text-sm text-christmas-gold-light hover:text-christmas-gold font-medium"
            onClick={() => onCertNamesChange([...certNames, ''])}
          >
            <i className="fas fa-plus mr-2" />
            {certNames.length === 0 ? 'Dodaj certyfikat z imieniem' : 'Dodaj kolejne imię'}
          </button>
        ) : (
          <p className="mt-4 text-white/45 text-xs">
            {letterQty >= MAX_LETTER_QTY
              ? `Możesz dodać najwyżej ${MAX_LETTER_QTY} certyfikatów.`
              : 'Dodaj kolejny zestaw listu, żeby dopisać następne imię.'}
          </p>
        )}

        {error && (
          <p className="mt-3 text-sm text-red-200" role="alert">
            <i className="fas fa-exclamation-circle mr-1.5" />
            {error}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-2 px-1">
        <div>
          <p className="text-white/70 text-sm">
            {polishCount(letterQty, 'zestaw', 'zestawy', 'zestawów')}
            {filledCerts > 0
              ? ` · ${polishCount(filledCerts, 'certyfikat', 'certyfikaty', 'certyfikatów')}`
              : ''}
          </p>
          {catalogTotal >= FREE_SHIPPING_THRESHOLD ? (
            <p className="text-christmas-gold-light/80 text-xs mt-1">
              W tym pakiecie dostawa InPost jest już darmowa.
            </p>
          ) : catalogTotal >= FREE_SHIPPING_THRESHOLD - 20 ? (
            <p className="text-white/45 text-xs mt-1">
              Do darmowej dostawy brakuje {formatPrice(FREE_SHIPPING_THRESHOLD - catalogTotal)}
            </p>
          ) : null}
        </div>
        <p className="font-display text-2xl font-semibold text-christmas-gold-light">
          {catalogTotal > packTotal ? (
            <>
              <span className="mr-2 text-white/45 line-through decoration-white/40 text-xl">
                {formatPrice(catalogTotal)}
              </span>
              {formatPrice(packTotal)}
            </>
          ) : (
            formatPrice(packTotal)
          )}
        </p>
      </div>
    </div>
  );
}
