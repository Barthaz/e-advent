import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/useCart';
import OrderSummary from '../components/checkout/OrderSummary';
import OrderSteps from '../components/checkout/OrderSteps';
import { useCheckoutPromo } from '../components/checkout/useCheckoutPromo';
import { readCheckoutEmail, saveCheckoutEmail, isValidCheckoutEmail } from '../utils/checkoutDetails';
import '../components/checkout/commerce.css';
import SEOHead from '../components/SEOHead';
import {
  formatPrice, applyPercentDiscount,
  getProduct,
} from '../config/products';
import {
  buildCartDisplayRows,
  certificatesRemovedByLetterDrop,
  getCartItemDisplayName,
  isVoiceSku,
  VOICE_MESSAGE_ADDON_SKU,
  voiceAddonSlots,
  voiceItems,
} from '../utils/cartStorage';
import { trackCartEvent, trackSantaEvent } from '../utils/analytics';

const UPSELL_KEY = 'e-advent-voice-upsell-dismissed';

export default function CartPage() {
  const {
    items,
    totals,
    updateQty,
    removeItem,
    removeCertificate,
    addCertificate,
    setLetterQuantity,
    removeLetterPack,
    addVoiceMessage,
    convertVoiceToAddon,
    voiceNotice,
    dismissVoiceNotice,
  } = useCart();
  const currentCart = useRef(items);
  useEffect(() => { currentCart.current = items; }, [items]);
  useEffect(() => {
    const view = () => trackCartEvent('view_cart', currentCart.current.map(line => ({
      sku: line.sku, name: getProduct(line.sku)?.name ?? line.sku, quantity: line.quantity,
      price: line.unitPrice ?? getProduct(line.sku)?.basePrice ?? 0,
    })));
    view();
    window.addEventListener('eadvent:measurement-enabled', view);
    return () => window.removeEventListener('eadvent:measurement-enabled', view);
  }, []);
  const navigate = useNavigate();
  const promo = useCheckoutPromo();
  const [email, setEmail] = useState(() => readCheckoutEmail() || items.find(item => item.customerEmail)?.customerEmail || '');
  const [emailError, setEmailError] = useState('');
  const [certificateOpen, setCertificateOpen] = useState(false);
  const [certificateName, setCertificateName] = useState('');
  const [certificateError, setCertificateError] = useState('');
  const beforeDelivery = { ...totals, shipping: 0, total: totals.subtotal };
  const priced = (promo.discount != null ? applyPercentDiscount(beforeDelivery, promo.discount) : null) ?? beforeDelivery;
  const continueOrder = (event: React.FormEvent) => {
    event.preventDefault();
    if (!isValidCheckoutEmail(email)) { setEmailError('Wpisz poprawny adres e-mail, np. imie@example.com.'); return; }
    if (checkoutBlocked || promo.checking) return;
    saveCheckoutEmail(email);
    navigate('/platnosc?koszyk=1');
  };
  const addonPrice = getProduct(VOICE_MESSAGE_ADDON_SKU)!.basePrice;
  const [upsellDismissed, setUpsellDismissed] = useState(() => sessionStorage.getItem(UPSELL_KEY) === '1');
  const displayRows = buildCartDisplayRows(items);
  const addonSlots = voiceAddonSlots(items);
  const showUpsell = !upsellDismissed && addonSlots > 0 && voiceItems(items).length === 0;
  const dismissUpsell = () => {
    sessionStorage.setItem(UPSELL_KEY, '1');
    setUpsellDismissed(true);
  };
  const hasRetiredProduct = items.some((item) => getProduct(item.sku)?.discontinued);
  const checkoutBlocked = hasRetiredProduct;

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
      <SEOHead title="Koszyk | e-Advent" description="Twoje świąteczne zamówienie e-Advent." canonical="https://e-advent.pl/koszyk" robots="noindex, follow" />
      <div className="commerce-page"><div className="commerce-container">
        <OrderSteps step={1} />
        <header className="commerce-heading"><p className="order-eyebrow">Jeszcze chwila i magia będzie w drodze</p><h1>Twój koszyk</h1><p>Sprawdź wybrane produkty i podaj e-mail. Kupujesz bez zakładania konta.</p></header>
        {items.length === 0 ? <section className="order-panel order-empty"><i className="far fa-envelope" aria-hidden="true" /><h2>Tu zaczyna się Wasza opowieść</h2><p>Twój koszyk jest jeszcze pusty. Wybierz coś na wspólne świąteczne chwile.</p><Link to="/" className="btn-green">Odkryj e-Advent <i className="fas fa-arrow-right" aria-hidden="true" /></Link></section> : <div className="commerce-layout">
          <div className="commerce-main">
            <section className="order-panel"><h2>Wybrane dla Was</h2>
              {voiceNotice && (
                <div role="status" className="mb-6 flex items-start gap-3 rounded-xl border border-christmas-gold/50 bg-christmas-gold/10 px-4 py-3 text-sm text-parchment-text">
                  <i className="fas fa-info-circle text-christmas-gold mt-0.5" aria-hidden />
                  <p className="flex-1">{voiceNotice}</p>
                  <button type="button" onClick={dismissVoiceNotice} className="text-parchment-muted hover:text-parchment-text" aria-label="Zamknij komunikat">
                    <i className="fas fa-times" />
                  </button>
                </div>
              )}
              <ul className="cart-product-list">
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
                        {row.quantity > row.certificates.length && (
                          <div className="mt-4 rounded-lg border border-christmas-green/15 bg-cream p-4">
                            {certificateOpen ? (
                              <form onSubmit={(event) => {
                                event.preventDefault();
                                const name = certificateName.replace(/\s+/g, ' ').trim();
                                if (name.length < 2) { setCertificateError('Wpisz imię dziecka (co najmniej 2 znaki).'); return; }
                                addCertificate(name);
                                setCertificateName(''); setCertificateError(''); setCertificateOpen(false);
                              }}>
                                <label className="block text-sm font-medium text-parchment-text mb-2" htmlFor="cart-certificate-name">Imię dziecka na certyfikacie</label>
                                <div className="flex flex-wrap gap-2">
                                  <input id="cart-certificate-name" className="input-field min-w-0 flex-1" maxLength={60} value={certificateName} onChange={(event) => setCertificateName(event.target.value)} required />
                                  <button type="submit" className="btn-green px-5 py-2.5">Dodaj za {formatPrice(getProduct('santa-certificate')?.basePrice ?? 9)}</button>
                                  <button type="button" className="px-3 py-2 text-sm text-parchment-muted" onClick={() => setCertificateOpen(false)}>Anuluj</button>
                                </div>
                                {certificateError && <p role="alert" className="mt-2 text-sm text-christmas-red">{certificateError}</p>}
                              </form>
                            ) : <button type="button" className="text-left text-sm font-medium text-christmas-green" onClick={() => setCertificateOpen(true)}><i className="fas fa-plus mr-2" aria-hidden="true" />Dodaj certyfikat z imieniem — {formatPrice(getProduct('santa-certificate')?.basePrice ?? 9)}</button>}
                          </div>
                        )}
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
                  const isVoice = isVoiceSku(item.sku);

                  if (isVoice) {
                    const isAddon = item.sku === VOICE_MESSAGE_ADDON_SKU;
                    const canConvert = !isAddon && addonSlots > 0;
                    return (
                      <li key={item.id} className="py-4 border-b border-parchment-dark/20 last:border-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="font-display font-semibold text-parchment-text text-xl">
                              <i className="fas fa-microphone-alt text-christmas-gold/80 text-base mr-2" aria-hidden />
                              {name}
                            </p>
                            <p className="text-parchment-muted text-sm">
                              {isAddon ? 'dodatek do listu' : 'produkt cyfrowy'} ·{' '}
                              {item.voiceDraftId ? 'personalizacja uzupełniona' : 'personalizacja po zakupie (link w e-mailu)'}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            {item.voiceDraftId && (
                              <Link
                                to={`/wiadomosc-od-mikolaja/kreator?edytuj=${encodeURIComponent(item.id)}`}
                                className="text-sm text-christmas-green hover:text-christmas-gold underline underline-offset-2"
                              >
                                Edytuj
                              </Link>
                            )}
                            <p className="font-semibold text-christmas-green min-w-[4.5rem] text-right">
                              {formatPrice(unit)}
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
                        </div>
                        {canConvert && (
                          <button
                            type="button"
                            onClick={() => convertVoiceToAddon(item.id)}
                            className="mt-2 text-sm text-christmas-green hover:text-christmas-gold underline underline-offset-2"
                          >
                            Masz list w koszyku — dołącz wiadomość do listu za {formatPrice(addonPrice)}
                          </button>
                        )}
                      </li>
                    );
                  }

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

              {showUpsell && (
                <div className="cart-upsell">
                  <div className="flex items-start gap-3">
                    <i className="fas fa-microphone-alt text-christmas-gold text-xl mt-1" aria-hidden />
                    <div className="flex-1">
                      <p className="font-display text-lg font-semibold text-parchment-text">
                        Dodaj do listu wiadomość głosową od Mikołaja — {formatPrice(addonPrice)}
                      </p>
                      <p className="text-parchment-muted text-sm mt-1">
                        Mikołaj zwróci się do dziecka po imieniu i wspomni jego sukcesy. Link do nagrania przyjdzie na e-mail.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link
                          to="/wiadomosc-od-mikolaja/kreator?tryb=list"
                          onClick={() => trackSantaEvent('santa_product_cta_click', { cta_location: 'cart_upsell', purchase_mode: 'letter_addon' })}
                          className="btn-gold px-4 py-2 text-sm"
                        >
                          Stwórz wiadomość
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            trackSantaEvent('santa_addon_toggle', { checked: true, cta_location: 'cart_upsell' });
                            addVoiceMessage({ mode: 'letter_addon' });
                          }}
                          className="btn-outline-parchment px-4 py-2 text-sm"
                        >
                          Dodaj — uzupełnię po zakupie
                        </button>
                        <button type="button" onClick={dismissUpsell} className="px-3 py-2 text-sm text-parchment-muted hover:text-parchment-text">
                          Nie, dziękuję
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}


            </section>
            <form id="cart-contact" className="order-panel order-contact" onSubmit={continueOrder} noValidate>
              <p className="order-eyebrow">Kontakt do zamówienia</p><h2>Na jaki e-mail wysłać potwierdzenie?</h2>
              <p>Tu otrzymasz informacje o zamówieniu oraz linki do produktów cyfrowych.</p>
              <label htmlFor="cart-email">Adres e-mail <span aria-hidden="true">*</span></label>
              <input id="cart-email" type="email" name="email" autoComplete="email" required value={email}
                placeholder="twoj@email.pl" aria-invalid={Boolean(emailError)} aria-describedby="cart-email-help"
                onChange={event => { setEmail(event.target.value); saveCheckoutEmail(event.target.value); setEmailError(''); }} />
              <p id="cart-email-help" className={emailError ? 'order-field-error' : 'order-help'}>{emailError || 'Nie musisz tworzyć konta ani pamiętać hasła.'}</p>
              {hasRetiredProduct && <p role="alert" className="alert-error">W koszyku jest wycofany wariant kalendarza. Usuń go i wybierz aktualny format A3.</p>}
            </form>
            <Link to="/" className="order-back"><i className="fas fa-arrow-left" aria-hidden="true" /> Wróć do zakupów</Link>
          </div>
          <OrderSummary items={items} subtotal={totals.subtotal} total={priced.total} discount={priced.discount} hasPhysical={totals.hasPhysical} shippingPending={totals.hasPhysical} promo={promo}>
            <button type="submit" form="cart-contact" className="btn-green order-continue" disabled={checkoutBlocked || promo.checking}>Dostawa i płatność <i className="fas fa-arrow-right" aria-hidden="true" /></button>
            <p className="order-next-note">W następnym kroku {totals.hasPhysical ? 'wybierzesz dostawę i sposób płatności.' : 'wybierzesz sposób płatności.'}</p>
          </OrderSummary>
        </div>}
      </div></div>
    </>
  );
}
