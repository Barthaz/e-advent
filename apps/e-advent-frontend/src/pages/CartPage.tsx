import { Link } from 'react-router-dom';
import {
  FREE_SHIPPING_THRESHOLD,
  formatPrice,
  getProduct,
} from '../config/products';
import { useCart } from '../context/CartContext';
import FestivePage from '../components/FestivePage';
import ParchmentCard from '../components/ParchmentCard';
import SEOHead from '../components/SEOHead';

export default function CartPage() {
  const { items, totals, updateQty, removeItem, freeShippingThreshold } = useCart();

  const remainingForFree =
    totals.hasPhysical && !totals.freeShipping
      ? Math.max(0, freeShippingThreshold - totals.subtotal)
      : 0;

  return (
    <>
      <SEOHead
        title="Koszyk | e-Advent"
        description="Twój koszyk e-Advent — kalendarze adwentowe i List do Świętego Mikołaja."
        canonical="https://e-advent.pl/koszyk"
      />

      <FestivePage maxWidth="lg">
        <ParchmentCard padding="lg">
          <h1 className="font-display text-3xl md:text-4xl font-semibold text-parchment-text text-center mb-2">
            Koszyk
          </h1>
          <div className="gold-divider mb-8" />

          {items.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-parchment-muted mb-6">Twój koszyk jest pusty.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/kalendarze-adwentowe" className="btn-gold px-6 py-3">
                  Zobacz kalendarze
                </Link>
                <Link to="/list-do-swietego-mikolaja" className="btn-outline-parchment px-6 py-3">
                  List do Mikołaja
                </Link>
              </div>
            </div>
          ) : (
            <>
              <ul className="space-y-4 mb-8">
                {items.map((item) => {
                  const product = getProduct(item.sku);
                  const name = item.label ?? product?.name ?? item.sku;
                  const unit = item.unitPrice ?? product?.basePrice ?? 0;
                  const isPersonalized = Boolean(item.calendarId);
                  return (
                    <li
                      key={item.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 py-4 border-b border-parchment-dark/20 last:border-0"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-display text-xl font-semibold text-parchment-text">{name}</p>
                        <p className="text-parchment-muted text-sm">
                          {formatPrice(unit)} / szt.
                          {item.format ? ` · format ${item.format}` : ''}
                          {isPersonalized ? ' · spersonalizowany' : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {isPersonalized ? (
                          <span className="w-16 text-center text-parchment-text font-medium">1</span>
                        ) : (
                          <>
                            <label className="sr-only" htmlFor={`qty-${item.id}`}>
                              Ilość
                            </label>
                            <input
                              id={`qty-${item.id}`}
                              type="number"
                              min={1}
                              max={99}
                              value={item.quantity}
                              onChange={(e) => updateQty(item.id, Number(e.target.value))}
                              className="w-16 rounded-lg border border-parchment-dark/30 bg-cream px-2 py-1.5 text-center text-parchment-text"
                            />
                          </>
                        )}
                        <p className="font-semibold text-christmas-green min-w-[4.5rem] text-right">
                          {formatPrice(unit * item.quantity)}
                        </p>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="text-parchment-muted hover:text-christmas-red transition-colors p-2"
                          aria-label={`Usuń ${name}`}
                        >
                          <i className="fas fa-trash-alt" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="space-y-2 text-sm mb-6">
                <div className="flex justify-between text-parchment-text">
                  <span>Produkty</span>
                  <span>{formatPrice(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-parchment-text">
                  <span>Wysyłka (Poczta Polska)</span>
                  <span>
                    {totals.hasPhysical
                      ? totals.freeShipping
                        ? 'Gratis'
                        : formatPrice(totals.shipping)
                      : '—'}
                  </span>
                </div>
                <div className="flex justify-between font-semibold text-lg text-christmas-green pt-2 border-t border-parchment-dark/20">
                  <span>Razem</span>
                  <span>{formatPrice(totals.total)}</span>
                </div>
              </div>

              {totals.hasPhysical && (
                <p className="text-parchment-muted text-sm mb-6 text-center">
                  {totals.freeShipping
                    ? `Darmowa wysyłka — próg ${FREE_SHIPPING_THRESHOLD} zł osiągnięty.`
                    : remainingForFree > 0
                      ? `Do darmowej wysyłki brakuje ${formatPrice(remainingForFree)} (próg ${FREE_SHIPPING_THRESHOLD} zł).`
                      : null}
                </p>
              )}

              <p className="text-parchment-muted text-sm mb-6 text-center">
                W kolejnym kroku podasz adres dostawy i opłacisz całe zamówienie naraz.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/platnosc" className="btn-gold px-8 py-3.5 text-lg">
                  <i className="fas fa-lock" />
                  Przejdź do zamówienia
                </Link>
                <Link
                  to="/kalendarze-adwentowe"
                  className="btn-outline-parchment px-6 py-3"
                >
                  Kontynuuj zakupy
                </Link>
              </div>
            </>
          )}
        </ParchmentCard>
      </FestivePage>
    </>
  );
}
