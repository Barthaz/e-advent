import { Link } from 'react-router-dom';
import { useCart } from '../context/useCart';
import FestivePage from '../components/FestivePage';
import ParchmentCard from '../components/ParchmentCard';
import SEOHead from '../components/SEOHead';
import CalendarWaitNotice from '../components/campaign/CalendarWaitNotice';
import LetterPromoNotice from '../components/campaign/LetterPromoNotice';
import {
  formatPrice,
  getProduct,
  isCalendarSku,
  isCalendarsOnSale,
  isLetterPromoActive,
} from '../config/products';
import {
  buildCartDisplayRows,
  certificatesRemovedByLetterDrop,
  getCartItemDisplayName,
} from '../utils/cartStorage';

export default function CartPage() {
  const {
    items,
    totals,
    updateQty,
    removeItem,
    removeCertificate,
    setLetterQuantity,
    removeLetterPack,
  } = useCart();
  const displayRows = buildCartDisplayRows(items);
  const hasRetiredProduct = items.some((item) => getProduct(item.sku)?.discontinued);
  const hasUnsaleableCalendar = !isCalendarsOnSale() && items.some((item) => isCalendarSku(item.sku));
  const letterPromo = isLetterPromoActive() && items.some((item) => getProduct(item.sku)?.type === 'letter');
  const checkoutBlocked = hasRetiredProduct || hasUnsaleableCalendar;

  const confirmLetterDrop = (nextQty: number) => {
    const dropped = certificatesRemovedByLetterDrop(items, nextQty);
    if (dropped.length === 0) return true;
    const names = dropped.map((cert) => cert.childName || 'certyfikat').join(', ');
    return window.confirm(
      nextQty < 1
        ? `Usunąć wszystkie listy z koszyka? Zostaną też usunięte certyfikaty (${names}).`
        : `Zmniejszenie liczby listów usunie ostatni certyfikat${dropped.length > 1 ? 'y' : ''} (${names}). Kontynuować?`,
    );
  };

  return (
    <>
      <SEOHead
        title="Koszyk | e-Advent"
        description="Twój koszyk e-Advent — kalendarze adwentowe i List do Świętego Mikołaja."
        canonical="https://e-advent.pl/koszyk"
      />

      <FestivePage maxWidth="lg">
        <ParchmentCard padding="lg">
          <h1 className="heading-page mb-2">
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
                  if (row.kind === 'letter-group') {
                    return (
                      <li key="letter-pack" className="py-4 border-b border-parchment-dark/20 last:border-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="font-display font-semibold text-parchment-text text-xl">
                              {row.label}
                            </p>
                            <p className="text-parchment-muted text-sm">
                              {formatPrice(row.unitPrice)} / szt.
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <label className="sr-only" htmlFor="qty-letter-pack">
                              Liczba listów
                            </label>
                            <input
                              id="qty-letter-pack"
                              type="number"
                              min={1}
                              max={99}
                              value={row.quantity}
                              onChange={(e) => {
                                const nextQty = Number(e.target.value);
                                if (!confirmLetterDrop(nextQty)) return;
                                setLetterQuantity(nextQty);
                              }}
                              className="w-16 rounded-lg border border-parchment-dark/30 bg-cream px-2 py-1.5 text-center text-parchment-text"
                            />
                            <p className="font-semibold text-christmas-green min-w-[4.5rem] text-right">
                              {formatPrice(row.unitPrice * row.quantity)}
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                if (!confirmLetterDrop(0)) return;
                                removeLetterPack();
                              }}
                              className="text-parchment-muted hover:text-christmas-red transition-colors p-2"
                              aria-label="Usuń listy"
                            >
                              <i className="fas fa-trash-alt" />
                            </button>
                          </div>
                        </div>
                        {row.certificates.length > 0 && (
                          <ul className="mt-3 ml-3 sm:ml-5 space-y-2 border-l-2 border-christmas-gold/35 pl-4">
                            {row.certificates.map((cert) => {
                              const name = getCartItemDisplayName(cert);
                              const unit = cert.unitPrice ?? getProduct(cert.sku)?.basePrice ?? 0;
                              return (
                                <li key={cert.id} className="flex items-center gap-3 py-1.5">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-display font-semibold text-parchment-text">
                                      <i className="fas fa-award text-christmas-gold/80 text-sm mr-2" aria-hidden />
                                      {name}
                                    </p>
                                    <p className="text-parchment-muted text-sm">
                                      {formatPrice(unit)} · dodatek do listu
                                    </p>
                                  </div>
                                  <p className="font-semibold text-christmas-green min-w-[4.5rem] text-right">
                                    {formatPrice(unit)}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!window.confirm(`Usunąć certyfikat${cert.childName ? ` dla ${cert.childName}` : ''}? List pozostanie w koszyku.`)) {
                                        return;
                                      }
                                      removeCertificate(cert.id);
                                    }}
                                    className="text-parchment-muted hover:text-christmas-red transition-colors p-2"
                                    aria-label={`Usuń ${name}`}
                                  >
                                    <i className="fas fa-trash-alt" />
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </li>
                    );
                  }

                  const item = row.item;
                  const product = getProduct(item.sku);
                  const name = getCartItemDisplayName(item);
                  const unit = item.unitPrice ?? product?.basePrice ?? 0;
                  const isPersonalized = Boolean(item.calendarId);

                  return (
                    <li
                      key={item.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 py-4 border-b border-parchment-dark/20 last:border-0"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-semibold text-parchment-text text-xl">
                          {name}
                        </p>
                        <p className="text-parchment-muted text-sm">
                          {formatPrice(unit)} / szt.
                          {item.format ? ` · format ${item.format}` : ''}
                          {isPersonalized ? ' · spersonalizowany' : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {row.lockQuantity ? (
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
                        {row.removable ? (
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="text-parchment-muted hover:text-christmas-red transition-colors p-2"
                            aria-label={`Usuń ${name}`}
                          >
                            <i className="fas fa-trash-alt" />
                          </button>
                        ) : null}
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
                  <span>Dostawa InPost</span>
                  <span>
                    {totals.hasPhysical ? 'Cena w następnym kroku' : '—'}
                  </span>
                </div>
                <div className="flex justify-between font-semibold text-lg text-christmas-green pt-2 border-t border-parchment-dark/20">
                  <span>Produkty razem</span>
                  <span>{formatPrice(totals.subtotal)}</span>
                </div>
              </div>


              {hasUnsaleableCalendar && (
                <div className="mb-6">
                  <CalendarWaitNotice />
                </div>
              )}
              {letterPromo && !hasUnsaleableCalendar && (
                <div className="mb-6">
                  <LetterPromoNotice />
                </div>
              )}
              {hasRetiredProduct && (
                <p role="alert" className="alert-error mb-6">
                  W koszyku jest wycofany wariant kalendarza. Usuń go i utwórz kalendarz w aktualnym formacie A3.
                </p>
              )}
              <p className="text-parchment-muted text-sm mb-6 text-center">
                W kolejnym kroku podasz adres dostawy i opłacisz całe zamówienie naraz.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {!checkoutBlocked && <Link to="/platnosc" className="btn-gold px-8 py-3.5 text-lg">
                  <i className="fas fa-lock" />
                  Przejdź do zamówienia
                </Link>}
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
