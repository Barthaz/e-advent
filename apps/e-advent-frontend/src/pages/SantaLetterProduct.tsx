import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import SEOHead from '../components/SEOHead';
import {
  formatPrice,
  getProduct,
  PRODUCT_FAMILIES,
  SANTA_CERTIFICATE_SKU,
} from '../config/products';
import { useCart } from '../context/useCart';
import { trackSantaEvent, trackViewItem } from '../utils/analytics';
import LetterPackComposer, { MAX_LETTER_QTY } from '../components/letter/LetterPackComposer';
import AddedToCartModal from '../components/AddedToCartModal';
import ProductHero from '../components/product-page/ProductHero';
import ProductGallery from '../components/product-page/ProductGallery';
import ProductIntro from '../components/product-page/ProductIntro';
import ProductCartAction from '../components/product-page/ProductCartAction';
import ProductHighlights from '../components/product-page/ProductHighlights';
import ProductSteps from '../components/product-page/ProductSteps';
import ProductStory from '../components/product-page/ProductStory';
import ProductCrossSell from '../components/product-page/ProductCrossSell';
import ProductFaq from '../components/product-page/ProductFaq';
import letter1 from '../assets/list/list_1.webp';
import letter2 from '../assets/list/list_2.webp';
import letter3 from '../assets/list/list_3.webp';
import letter1Thumb from '../assets/list/list_1-thumb.webp';
import letter2Thumb from '../assets/list/list_2-thumb.webp';
import letter3Thumb from '../assets/list/list_3-thumb.webp';

const SKU = 'santa-letter';
const CERTIFICATE_PRICE = getProduct(SANTA_CERTIFICATE_SKU)?.basePrice ?? 9;
const CALENDAR_PRICE = PRODUCT_FAMILIES.find((family) => family.type === 'interactive')?.priceFrom ?? 9;

const GALLERY = [
  { src: letter1, thumb: letter1Thumb, alt: 'Zestaw List do Świętego Mikołaja' },
  { src: letter2, thumb: letter2Thumb, alt: 'List do Świętego Mikołaja' },
  { src: letter3, thumb: letter3Thumb, alt: 'Koperta i naklejki świąteczne' },
];

const HIGHLIGHTS = [
  { icon: 'far fa-envelope', label: 'Koperta zaadresowana do Mikołaja' },
  { icon: 'fas fa-truck', label: 'Wysyłka InPost w 3–5 dni roboczych' },
  { icon: 'far fa-heart', label: 'Rytuał, który dzieci zapamiętają' },
];

const STEPS = [
  { title: 'Siadacie razem', text: 'Niech dziecko wpisze swoje życzenia i marzenia — rysunek też może być listem.' },
  { title: 'Ozdabiacie kopertę', text: 'Koperta jest już zaadresowana do Świętego Mikołaja. Ozdóbcie ją naklejkami i włóżcie list do środka.' },
  { title: 'Śledzicie Mikołaja', text: 'Niech ten list zostanie częścią Waszej świątecznej przygody, a 24 grudnia śledźcie razem Mikołaja na mapie.' },
];

const CONTENTS = [
  { title: '2 wersje listu', text: 'Dwa szablony — dziecko wybiera ulubiony lub wypełnia oba.' },
  { title: 'Opisana koperta', text: 'Gotowy adres do Świętego Mikołaja — wystarczy włożyć list.' },
  { title: 'Naklejki', text: 'Świąteczne naklejki do ozdobienia koperty i listu.' },
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
  const [cartAdded, setCartAdded] = useState(false);
  const [letterQty, setLetterQty] = useState(1);
  const [certNames, setCertNames] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const voiceAddonPrice = getProduct('voice-message-addon')!.basePrice;
  const voiceStandalonePrice = getProduct('voice-message')!.basePrice;
  const [withVoice, setWithVoice] = useState(() => searchParams.get('wiadomosc') === '1');

  const basePrice = product?.basePrice ?? 29;
  const faq = buildFaq(`+${formatPrice(CERTIFICATE_PRICE)}`);

  useEffect(() => {
    trackViewItem({
      sku: SKU,
      name: product?.name ?? 'List do Świętego Mikołaja',
      price: basePrice,
      category: 'letter',
    });
  }, [basePrice, product?.name]);

  const handleAddToCart = () => {
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
      withVoiceMessage: withVoice,
    });
    setWithVoice(false);

    setCartAdded(true);
  };

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
        <ProductHero media={<ProductGallery images={GALLERY} />}>
          <ProductIntro
            eyebrow="Prezent adwentowy"
            title="List do Świętego Mikołaja"
            description="Gotowy zestaw do wysyłki: dwie wersje listu, opisana koperta i naklejki świąteczne. Magiczny rytuał, który dzieci zapamiętają na lata."
            price={formatPrice(basePrice)}
            priceHint="+ dostawa"
            priceNote="Cena za jeden zestaw, bez dostawy"
            features={['2 wersje listu', 'Opisana koperta', 'Naklejki świąteczne', 'Wysyłka InPost']}
          />

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
            letterPrice={basePrice}
            certificatePrice={CERTIFICATE_PRICE}
            voicePrice={withVoice ? voiceAddonPrice : 0}
            error={formError}
          />

          <label className="mb-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-christmas-gold/40 bg-black/25 p-4 hover:border-christmas-gold/70 transition-colors">
            <input
              type="checkbox"
              checked={withVoice}
              onChange={(e) => {
                setWithVoice(e.target.checked);
                trackSantaEvent('santa_addon_toggle', { checked: e.target.checked, cta_location: 'letter_product' });
              }}
              className="mt-1 h-5 w-5 accent-[#d4af37] shrink-0"
            />
            <span className="text-sm text-white/85 leading-relaxed">
              <span className="block font-semibold text-christmas-gold-light">
                <i className="fas fa-microphone-alt mr-1.5" aria-hidden="true" />
                Dodaj wiadomość głosową od Mikołaja — {formatPrice(voiceAddonPrice)}
                <span className="ml-2 text-xs font-normal text-white/50 line-through">{formatPrice(voiceStandalonePrice)}</span>
              </span>
              Mikołaj zwróci się do dziecka po imieniu i wspomni jego sukcesy. Szczegóły uzupełnisz po zakupie —
              link do nagrania przyjdzie na e-mail.{' '}
              <Link to="/wiadomosc-od-mikolaja" className="underline underline-offset-2 hover:text-white">Posłuchaj przykładu</Link>
            </span>
          </label>

          <ProductCartAction onClick={handleAddToCart} />
        </ProductHero>

        <ProductHighlights items={HIGHLIGHTS} />
        <ProductSteps
          kicker="Mały świąteczny rytuał"
          title={<>List pełen<br /><em>marzeń.</em></>}
          steps={STEPS}
          footer={<Link to="/sledz-mikolaja">Śledź Świętego Mikołaja na żywo →</Link>}
        />
        <ProductStory
          kicker="Co jest w zestawie?"
          title={<>Wszystko, czego trzeba,<br /><em>żeby list wyruszył w drogę.</em></>}
          description="Gotowy zestaw do wysyłki — wystarczy usiąść razem i zacząć pisać."
          items={CONTENTS}
        />
        <ProductCrossSell
          kicker="Zanim przyjdzie Wigilia"
          title={<>List to początek.<br /><em>Odliczajcie razem dni.</em></>}
          text="Kalendarz adwentowy online albo fizyczna zdrapka ze złotymi okienkami. Jedno okienko, jeden mały powód, żeby pobyć razem — przez 24 grudniowe dni."
          price={`od ${formatPrice(CALENDAR_PRICE)}`}
          priceNote="kalendarz online lub zdrapka"
          cta={{ label: 'Zobacz kalendarze adwentowe', to: '/kalendarze-adwentowe' }}
        />
        <ProductFaq items={faq} />
      </div>

      <AddedToCartModal
        open={cartAdded}
        onContinue={() => setCartAdded(false)}
        onGoToCart={() => navigate('/koszyk')}
      />
    </>
  );
}
