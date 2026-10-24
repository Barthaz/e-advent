import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageBackground from '../components/PageBackground';
import ParchmentCard from '../components/ParchmentCard';
import SEOHead from '../components/SEOHead';
import {
  formatPrice,
  getProduct,
  isLetterPromoActive,
  LETTER_PROMO_CODE,
  letterPromoPrice,
  SANTA_CERTIFICATE_SKU,
} from '../config/products';
import { useCart } from '../context/useCart';
import { trackViewItem } from '../utils/analytics';
import logo from '@e-advent/assets/brand/eadvent-logo.png';
import LetterPromoNotice from '../components/campaign/LetterPromoNotice';
import LetterPackComposer, { MAX_LETTER_QTY } from '../components/letter/LetterPackComposer';
import letter1 from '../assets/list/list_1.webp';
import letter2 from '../assets/list/list_2.webp';
import letter3 from '../assets/list/list_3.webp';
import letter1Thumb from '../assets/list/list_1-thumb.webp';
import letter2Thumb from '../assets/list/list_2-thumb.webp';
import letter3Thumb from '../assets/list/list_3-thumb.webp';

const SKU = 'santa-letter';
const CERTIFICATE_PRICE = getProduct(SANTA_CERTIFICATE_SKU)?.basePrice ?? 9;

const GALLERY = [
  { src: letter1, thumb: letter1Thumb, alt: 'Zestaw List do Świętego Mikołaja' },
  { src: letter2, thumb: letter2Thumb, alt: 'List do Świętego Mikołaja' },
  { src: letter3, thumb: letter3Thumb, alt: 'Koperta i naklejki świąteczne' },
];

function buildFaq(certificatePriceNote: string) {
  return [
    {
      q: 'Co dokładnie jest w zestawie?',
      a: 'Dwie wersje listu (do wyboru lub wypełnienia obu), opisana koperta adresowana do Świętego Mikołaja oraz naklejki świąteczne do ozdobienia.',
    },
    {
      q: 'Jak długo trwa wysyłka?',
      a: 'Przygotowanie i wysyłka InPost zwykle zajmują 3–5 dni roboczych od opłacenia zamówienia.',
    },
    {
      q: 'Czym jest Certyfikat Grzecznego Dziecka?',
      a: `To opcjonalny dodatek (${certificatePriceNote}) — elegancki dokument od Świętego Mikołaja z imieniem dziecka. Idealny do wręczenia razem z listem. Dostępny wyłącznie przy zamówieniu listu.`,
    },
    {
      q: 'Czy mogę zamówić kilka zestawów?',
      a: 'Tak — na stronie produktu ustaw liczbę listów i dopisz imiona tylko do tych dzieci, które mają dostać certyfikat. Cały pakiet trafia do koszyka jednym kliknięciem. Koszt dostawy InPost zależy od zawartości koszyka i wybranej metody dostawy.',
    },
    {
      q: 'Czy list jest personalizowany online?',
      a: 'Nie — to gotowy fizyczny zestaw. Dziecko samo wypełnia list i ozdabia kopertę naklejkami.',
    },
  ];
}

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'List do Świętego Mikołaja',
  description:
    'Gotowy zestaw: 2 wersje listu, opisana koperta i naklejki świąteczne. Wysyłka InPost.',
  image: GALLERY.map((g) => `https://e-advent.pl${g.src}`),
  brand: { '@type': 'Brand', name: 'e-Advent' },
  offers: {
    '@type': 'Offer',
    url: 'https://e-advent.pl/list-do-swietego-mikolaja',
    priceCurrency: 'PLN',
    price: '29.00',
    availability: 'https://schema.org/InStock',
  },
};

export default function SantaLetterProduct() {
  const navigate = useNavigate();
  const { addSantaLetterBundle } = useCart();
  const product = getProduct(SKU);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [addedFlash, setAddedFlash] = useState(false);
  const [letterQty, setLetterQty] = useState(1);
  const [certNames, setCertNames] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const basePrice = product?.basePrice ?? 29;
  const letterPromo = isLetterPromoActive();
  const displayLetterPrice = letterPromo ? letterPromoPrice(basePrice) : basePrice;
  const displayCertPrice = letterPromo ? letterPromoPrice(CERTIFICATE_PRICE) : CERTIFICATE_PRICE;
  const faq = buildFaq(
    letterPromo
      ? `+${formatPrice(displayCertPrice)} z kodem ${LETTER_PROMO_CODE} zamiast ${formatPrice(CERTIFICATE_PRICE)}`
      : `+${formatPrice(CERTIFICATE_PRICE)}`,
  );

  useEffect(() => {
    trackViewItem({
      sku: SKU,
      name: product?.name ?? 'List do Świętego Mikołaja',
      price: basePrice,
      category: 'letter',
    });
  }, [basePrice, product?.name]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxOpen]);

  const handleAddToCart = (goToCart = false) => {
    setFormError(null);
    const trimmedNames = certNames.map((name) => name.replace(/\s+/g, ' ').trim());
    if (trimmedNames.some((name) => name.length > 0 && name.length < 2)) {
      setFormError('Każde imię na certyfikacie musi mieć co najmniej 2 znaki.');
      return;
    }
    if (trimmedNames.some((name) => name.length === 0)) {
      setFormError('Dopisz imię albo usuń puste pole certyfikatu.');
      return;
    }
    if (trimmedNames.length > letterQty) {
      setFormError('Liczba certyfikatów nie może przekraczać liczby listów.');
      return;
    }

    addSantaLetterBundle({
      letterLabel: product?.name,
      letterQuantity: Math.min(MAX_LETTER_QTY, Math.max(1, letterQty)),
      childNames: trimmedNames,
    });

    setAddedFlash(true);
    window.setTimeout(() => setAddedFlash(false), 2000);
    if (goToCart) navigate('/koszyk');
  };

  const handleBuyNow = () => handleAddToCart(true);

  const active = GALLERY[activeIndex];

  return (
    <>
      <SEOHead
        title="List do Świętego Mikołaja — zestaw listów, koperta i naklejki | e-Advent"
        description="Gotowy zestaw List do Świętego Mikołaja: 2 wersje listu, opisana koperta i naklejki. Cena od 29 zł + dostawa. Idealny prezent adwentowy dla dzieci."
        keywords="list do świętego mikołaja, list do mikołaja, zestaw list mikołaj, koperta do mikołaja, prezent adwentowy, e-advent"
        canonical="https://e-advent.pl/list-do-swietego-mikolaja"
        ogImage={`https://e-advent.pl${GALLERY[0].src}`}
        jsonLd={JSON_LD}
      />

      <div className="min-h-screen">
        <PageBackground className="py-8 md:py-12" showSnow overlayOpacity="medium">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="mb-6 flex justify-center">
              <Link to="/">
                <img src={logo} alt="e-Advent" className="h-16 md:h-20 w-auto drop-shadow-xl" />
              </Link>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
              {/* Gallery */}
              <div className="product-gallery-pin">
                <button
                  type="button"
                  onClick={() => setLightboxOpen(true)}
                  className="block w-full rounded-2xl overflow-hidden border border-christmas-gold/30 bg-cream shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-christmas-gold"
                  aria-label="Powiększ zdjęcie"
                >
                  <img
                    src={active.src}
                    alt={active.alt}
                    className="w-full aspect-[4/5] object-cover"
                    width={960}
                    height={1200}
                    decoding="async"
                  />
                </button>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {GALLERY.map((img, i) => (
                    <button
                      key={img.src}
                      type="button"
                      onClick={() => setActiveIndex(i)}
                      className={`rounded-xl overflow-hidden border-2 transition-colors ${
                        i === activeIndex
                          ? 'border-christmas-gold'
                          : 'border-transparent opacity-80 hover:opacity-100'
                      }`}
                      aria-label={img.alt}
                      aria-current={i === activeIndex}
                    >
                      <img
                        src={img.thumb}
                        alt=""
                        className="w-full aspect-square object-cover"
                        width={180}
                        height={180}
                        decoding="async"
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Product info */}
              <div className="text-white">
                <p className="text-christmas-gold text-sm tracking-[0.2em] uppercase mb-3">
                  Prezent adwentowy
                </p>
                <h1 className="font-display text-3xl md:text-5xl font-semibold text-christmas-gold-light mb-4 leading-tight">
                  List do Świętego Mikołaja
                </h1>
                <p className="text-white/80 text-base md:text-lg leading-relaxed mb-6">
                  Gotowy zestaw do wysyłki: dwie wersje listu, opisana koperta i naklejki świąteczne.
                  Magiczny rytuał, który dzieci zapamiętają na lata.
                </p>

                {letterPromo && (
                  <div className="mb-6">
                    <LetterPromoNotice tone="onDark" />
                  </div>
                )}

                <div className="mb-6">
                  <p className="font-display text-4xl font-semibold text-christmas-gold-light">
                    {letterPromo ? (
                      <>
                        <span className="mr-3 text-white/45 line-through decoration-white/40 text-2xl md:text-3xl">
                          {formatPrice(basePrice)}
                        </span>
                        {formatPrice(displayLetterPrice)}
                      </>
                    ) : (
                      formatPrice(basePrice)
                    )}
                  </p>
                  <p className="text-white/60 text-sm mt-2">
                    + dostawa
                  </p>
                  <p className="text-white/50 text-xs mt-1">
                    {letterPromo
                      ? `Cena za jeden zestaw z kodem ${LETTER_PROMO_CODE}, bez dostawy`
                      : 'Cena za jeden zestaw, bez dostawy'}
                  </p>
                </div>

                <ul className="space-y-2 mb-6 text-white/85 text-sm">
                  {['2 wersje listu', 'Opisana koperta', 'Naklejki świąteczne', 'Wysyłka InPost'].map(
                    (f) => (
                      <li key={f} className="flex items-center gap-2">
                        <i className="fas fa-check text-christmas-gold text-xs" />
                        {f}
                      </li>
                    ),
                  )}
                </ul>

                <LetterPackComposer
                  letterQty={letterQty}
                  onLetterQtyChange={(qty) => {
                    setLetterQty(qty);
                    setFormError(null);
                  }}
                  certNames={certNames}
                  onCertNamesChange={(names) => {
                    setCertNames(names);
                    setFormError(null);
                  }}
                  letterPrice={displayLetterPrice}
                  certificatePrice={displayCertPrice}
                  letterCompareAt={letterPromo ? basePrice : undefined}
                  certificateCompareAt={letterPromo ? CERTIFICATE_PRICE : undefined}
                  error={formError}
                />

                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <button type="button" onClick={() => handleAddToCart(false)} className="btn-gold px-8 py-3.5 text-lg">
                    <i className="fas fa-shopping-basket" />
                    {addedFlash ? 'Dodano do koszyka!' : 'Dodaj do koszyka'}
                  </button>
                  <button
                    type="button"
                    onClick={handleBuyNow}
                    className="btn-outline-gold px-8 py-3.5 text-lg"
                  >
                    Dodaj i idź do koszyka
                  </button>
                </div>
                <p className="text-white/45 text-xs">
                  Realizacja 3–5 dni roboczych · Bezpieczna płatność
                </p>
              </div>
            </div>
          </div>
        </PageBackground>

        {/* Zestaw */}
        <section className="section-cream py-16 md:py-20">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="section-title mb-4 text-center">Co jest w zestawie?</h2>
            <div className="gold-divider mb-10" />
            <div className="grid sm:grid-cols-3 gap-5">
              {[
                {
                  icon: 'fa-envelope-open-text',
                  title: '2 wersje listu',
                  text: 'Dwa szablony — dziecko wybiera ulubiony lub wypełnia oba.',
                },
                {
                  icon: 'fa-mail-bulk',
                  title: 'Opisana koperta',
                  text: 'Gotowy adres do Świętego Mikołaja — wystarczy włożyć list.',
                },
                {
                  icon: 'fa-sticky-note',
                  title: 'Naklejki',
                  text: 'Świąteczne naklejki do ozdobienia koperty i listu.',
                },
              ].map((card) => (
                <ParchmentCard key={card.title} padding="md" className="h-full text-center">
                  <div className="icon-circle mx-auto mb-3">
                    <i className={`fas ${card.icon} text-parchment-text`} />
                  </div>
                  <h3 className="font-display text-xl font-semibold text-parchment-text mb-2">
                    {card.title}
                  </h3>
                  <p className="text-parchment-muted text-sm leading-relaxed">{card.text}</p>
                </ParchmentCard>
              ))}
            </div>
          </div>
        </section>

        {/* Jak wysłać */}
        <section className="bg-white py-16 md:py-20">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="section-title mb-4 text-center">Jak wysłać list?</h2>
            <div className="gold-divider mb-10" />
            <ParchmentCard padding="lg">
              <ol className="space-y-4">
                {[
                  'Wypełnij list razem z dzieckiem — życzenia, rysunki, obietnice.',
                  'Ozdób kopertę naklejkami i włóż list do środka.',
                  'Wrzuć do skrzynki pocztowej lub zanieś na pocztę — koperta jest już opisana.',
                  'Czekajcie na magię grudnia a 24 grudnia śledźcie Mikołaja na mapie e-Advent!',
                ].map((step, i) => (
                  <li key={step} className="step-row">
                    <span className="step-badge">{i + 1}</span>
                    <p className="text-parchment-text leading-relaxed">{step}</p>
                  </li>
                ))}
              </ol>
              <div className="mt-6 pt-6 divider-parchment text-center">
                <Link to="/sledz-mikolaja" className="text-christmas-green hover:text-christmas-gold font-medium underline transition-colors">
                  Śledź Świętego Mikołaja na żywo →
                </Link>
              </div>
            </ParchmentCard>
          </div>
        </section>

        {/* FAQ */}
        <section className="section-cream py-16 md:py-20">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="section-title mb-4 text-center">Najczęstsze pytania</h2>
            <div className="gold-divider mb-10" />
            <div className="space-y-4">
              {faq.map((item) => (
                <ParchmentCard key={item.q} padding="md">
                  <h3 className="font-display text-lg md:text-xl font-semibold text-parchment-text mb-2">
                    {item.q}
                  </h3>
                  <p className="text-parchment-muted text-sm leading-relaxed">{item.a}</p>
                </ParchmentCard>
              ))}
            </div>
            <div className="text-center mt-10">
              <Link to="/kalendarze-adwentowe" className="btn-gold px-8 py-3">
                Zobacz też kalendarze adwentowe
              </Link>
            </div>
          </div>
        </section>
      </div>

      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Powiększone zdjęcie"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl p-2"
            aria-label="Zamknij"
            onClick={() => setLightboxOpen(false)}
          >
            <i className="fas fa-times" />
          </button>
          <img
            src={active.src}
            alt={active.alt}
            className="max-h-[90vh] max-w-full rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
