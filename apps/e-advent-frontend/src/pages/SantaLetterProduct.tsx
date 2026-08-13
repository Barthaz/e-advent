import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageBackground from '../components/PageBackground';
import ParchmentCard from '../components/ParchmentCard';
import SEOHead from '../components/SEOHead';
import {
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_COST,
  formatPrice,
  getProduct,
  getProductPrice,
} from '../config/products';
import { useCart } from '../context/CartContext';
import { trackViewItem } from '../utils/analytics';
import logo from '../assets/logo.png';

const SKU = 'santa-letter';

const GALLERY = [
  { src: '/products/santa-letter/letter-1.svg', alt: 'Zestaw List do Świętego Mikołaja' },
  { src: '/products/santa-letter/letter-2.svg', alt: 'List — wersja do wypełnienia' },
  { src: '/products/santa-letter/letter-3.svg', alt: 'Opisana koperta do Mikołaja' },
  { src: '/products/santa-letter/letter-4.svg', alt: 'Naklejki świąteczne' },
];

const FAQ = [
  {
    q: 'Co dokładnie jest w zestawie?',
    a: 'Dwie wersje listu (do wyboru lub wypełnienia obu), opisana koperta adresowana do Świętego Mikołaja oraz naklejki świąteczne do ozdobienia.',
  },
  {
    q: 'Jak długo trwa wysyłka?',
    a: 'Przygotowanie i wysyłka Pocztą Polską zwykle zajmują 3–5 dni roboczych od opłacenia zamówienia.',
  },
  {
    q: 'Czy mogę zamówić kilka zestawów?',
    a: 'Tak — dodaj więcej sztuk do koszyka. Przy produktach fizycznych o wartości od 100 zł wysyłka jest gratis.',
  },
  {
    q: 'Czy list jest personalizowany online?',
    a: 'Nie — to gotowy fizyczny zestaw. Dziecko samo wypełnia list i ozdabia kopertę naklejkami.',
  },
];

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'List do Świętego Mikołaja',
  description:
    'Gotowy zestaw: 2 wersje listu, opisana koperta i naklejki świąteczne. Wysyłka Pocztą Polską.',
  image: GALLERY.map((g) => `https://e-advent.pl${g.src}`),
  brand: { '@type': 'Brand', name: 'e-Advent' },
  offers: {
    '@type': 'Offer',
    url: 'https://e-advent.pl/list-do-swietego-mikolaja',
    priceCurrency: 'PLN',
    price: '29.00',
    availability: 'https://schema.org/InStock',
    shippingDetails: {
      '@type': 'OfferShippingDetails',
      shippingRate: {
        '@type': 'MonetaryAmount',
        value: String(SHIPPING_COST),
        currency: 'PLN',
      },
      shippingDestination: {
        '@type': 'DefinedRegion',
        addressCountry: 'PL',
      },
    },
  },
};

export default function SantaLetterProduct() {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const product = getProduct(SKU);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [addedFlash, setAddedFlash] = useState(false);

  const basePrice = product?.basePrice ?? 29;
  const standaloneTotal = getProductPrice(SKU) ?? basePrice + SHIPPING_COST;

  useEffect(() => {
    trackViewItem({
      sku: SKU,
      name: product?.name ?? 'List do Świętego Mikołaja',
      price: basePrice,
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

  const handleAddToCart = () => {
    addItem({ sku: SKU, quantity: 1, label: product?.name });
    setAddedFlash(true);
    window.setTimeout(() => setAddedFlash(false), 2000);
  };

  const handleBuyNow = () => {
    addItem({ sku: SKU, quantity: 1, label: product?.name });
    navigate('/koszyk');
  };

  const active = GALLERY[activeIndex];

  return (
    <>
      <SEOHead
        title="List do Świętego Mikołaja — zestaw listów, koperta i naklejki | e-Advent"
        description="Gotowy zestaw List do Świętego Mikołaja: 2 wersje listu, opisana koperta i naklejki. Cena 29 zł + wysyłka 5 zł Pocztą Polską (gratis od 100 zł). Idealny prezent adwentowy dla dzieci."
        keywords="list do świętego mikołaja, list do mikołaja, zestaw list mikołaj, koperta do mikołaja, prezent adwentowy, e-advent"
        canonical="https://e-advent.pl/list-do-swietego-mikolaja"
        ogImage="https://e-advent.pl/products/santa-letter/letter-1.svg"
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
              <div>
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
                    width={800}
                    height={1000}
                  />
                </button>
                <div className="mt-3 grid grid-cols-4 gap-2">
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
                      <img src={img.src} alt="" className="w-full aspect-square object-cover" />
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

                <div className="mb-6">
                  <p className="font-display text-4xl font-semibold text-christmas-gold-light">
                    {formatPrice(basePrice)}
                  </p>
                  <p className="text-white/60 text-sm mt-2">
                    + wysyłka {formatPrice(SHIPPING_COST)} Pocztą Polską
                    {` · darmowa od ${FREE_SHIPPING_THRESHOLD} zł`}
                  </p>
                  <p className="text-white/50 text-xs mt-1">
                    Jedna sztuka z wysyłką: {formatPrice(standaloneTotal)}
                  </p>
                </div>

                <ul className="space-y-2 mb-8 text-white/85 text-sm">
                  {['2 wersje listu', 'Opisana koperta', 'Naklejki świąteczne', 'Wysyłka Pocztą Polską'].map(
                    (f) => (
                      <li key={f} className="flex items-center gap-2">
                        <i className="fas fa-check text-christmas-gold text-xs" />
                        {f}
                      </li>
                    ),
                  )}
                </ul>

                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <button type="button" onClick={handleAddToCart} className="btn-gold px-8 py-3.5 text-lg">
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
              {FAQ.map((item) => (
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
