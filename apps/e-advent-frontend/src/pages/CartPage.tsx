import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import FestivePage from '../components/FestivePage';
import ParchmentCard from '../components/ParchmentCard';
import SEOHead from '../components/SEOHead';
import {
  FREE_SHIPPING_THRESHOLD,
  formatPrice,
  getProduct,
} from '../config/products';
import { buildCartDisplayRows, getCartItemDisplayName } from '../utils/cartStorage';

export default function CartPage() {
  const { items, totals, updateQty, removeItem, freeShippingThreshold } = useCart();
  const displayRows = buildCartDisplayRows(items);

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
                {displayRows.map((row) => {
                  const item = row.item;
                  const product = getProduct(item.sku);
                  const name = getCartItemDisplayName(item);
                  const unit = item.unitPrice ?? product?.basePrice ?? 0;
                  const isPersonalized = Boolean(item.calendarId);
                  const isAddon = row.kind === 'addon';
                  const lockQuantity = row.kind === 'item' ? row.lockQuantity : true;
                  const removable = row.kind === 'item' ? row.removable : false;

                  return (
                    <li
                      key={item.id}
                      className={`flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 py-4 border-b border-parchment-dark/20 last:border-0 ${
                        isAddon ? 'ml-4 sm:ml-6 pl-4 border-l-2 border-christmas-gold/35 bg-cream/20 rounded-r-xl' : ''
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p
                          className={`font-display font-semibold text-parchment-text ${
                            isAddon ? 'text-lg' : 'text-xl'
                          }`}
                        >
                          {isAddon && (
                            <i className="fas fa-link text-christmas-gold/80 text-sm mr-2" aria-hidden />
                          )}
                          {name}
                        </p>
                        <p className="text-parchment-muted text-sm">
                          {formatPrice(unit)} / szt.
                          {item.format ? ` · format ${item.format}` : ''}
                          {isPersonalized ? ' · spersonalizowany' : ''}
                          {isAddon ? ' · dodatek do listu' : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {lockQuantity ? (
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
                        {removable ? (
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="text-parchment-muted hover:text-christmas-red transition-colors p-2"
                            aria-label={`Usuń ${name}`}
                          >
                            <i className="fas fa-trash-alt" />
                          </button>
                        ) : (
                          <span
                            className="w-9 text-center text-parchment-muted/40 p-2"
                            title="Certyfikat usuwa się razem z listem"
                            aria-hidden
                          >
                            <i className="fas fa-trash-alt" />
                          </span>
                        )}
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
