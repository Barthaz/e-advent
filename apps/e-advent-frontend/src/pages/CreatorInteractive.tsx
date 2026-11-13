import { productSchema } from '../seo/product';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import ProductHero from '../components/product-page/ProductHero';
import ProductGallery from '../components/product-page/ProductGallery';
import ProductIntro from '../components/product-page/ProductIntro';
import ProductHighlights from '../components/product-page/ProductHighlights';
import ProductSteps from '../components/product-page/ProductSteps';
import ProductStory from '../components/product-page/ProductStory';
import ProductCrossSell from '../components/product-page/ProductCrossSell';
import { formatPrice, getProduct, PRODUCT_FAMILIES } from '../config/products';
import { trackViewItem } from '../utils/analytics';
import SEOHead from '../components/SEOHead';

const SCRATCH_PRICE = getProduct('scratch-a3')?.basePrice ?? 69;

const HIGHLIGHTS = [
  { icon: 'fas fa-door-open', label: '24 okienka na cały grudzień' },
  { icon: 'far fa-envelope', label: 'Prywatny link na e-mail po płatności' },
  { icon: 'fas fa-bolt', label: 'Bez wysyłki — gotowy od razu' },
];

const HOW_IT_WORKS = [
  { title: 'Podajesz dane', text: 'Imię, e-mail i tytuł kalendarza.' },
  { title: 'Układasz zadania', text: 'Zadania na 24 dni albo gotowy zestaw do wyboru.' },
  { title: 'Wybierasz otwieranie', text: 'Decydujesz, jak okienka mają się otwierać, i dodajesz gotowy kalendarz do koszyka.' },
  { title: 'Dostajesz link', text: 'Po opłaceniu przychodzi prywatny link. Kalendarz jest od razu gotowy.' },
];

const CONTENTS = [
  { title: '24 okienka', text: 'Każdego dnia w grudniu otwieracie jedno okienko i odkrywacie zadanie na ten dzień.' },
  { title: 'Wasza historia', text: 'Imię, tytuł i zadania układacie sami albo sięgacie po gotowe zestawy.' },
  { title: 'Prywatny link', text: 'Po płatności link do kalendarza przychodzi na e-mail. Bez wysyłki.' },
];

const JSON_LD = productSchema('interactive', 'Kalendarz adwentowy online',
  'Kreator kalendarza z własnymi zadaniami i prywatnym linkiem.', '/stworz-kalendarz/interaktywny',
  PRODUCT_FAMILIES.filter(product => product.type === 'interactive').flatMap(product => product.imageSrc ? [product.imageSrc] : []));

export default function CreatorInteractive() {
  const product = getProduct('interactive');
  const family = PRODUCT_FAMILIES.find((item) => item.type === 'interactive');
  const price = product?.basePrice ?? 9;
  const images = family?.imageSrc ? [{ src: family.imageSrc, alt: family.imageAlt ?? 'Kalendarz adwentowy online' }] : [];

  useEffect(() => {
    trackViewItem({
      sku: 'interactive',
      name: product?.name ?? 'Kalendarz online',
      price: product?.basePrice ?? 9,
      category: 'interactive',
    });
  }, [product?.name, product?.basePrice]);

  return (
    <div className="min-h-screen">
      <SEOHead
        jsonLd={JSON_LD}
        title="Kalendarz adwentowy online z własnymi zadaniami | e-Advent"
        description="Stwórz kalendarz adwentowy online z własnymi zadaniami. Personalizacja i prywatny link na e-mail po opłaceniu zamówienia."
        canonical="https://e-advent.pl/stworz-kalendarz/interaktywny"
      />
      <ProductHero media={<ProductGallery images={images} />}>
        <ProductIntro
          eyebrow={family?.eyebrow ?? 'Online'}
          title="Kalendarz adwentowy online z własnymi zadaniami"
          description="Prywatna strona z 24 okienkami. Podajesz imię, tytuł i zadania, a po płatności link przychodzi na e-mail."
          price={formatPrice(price)}
          priceHint="Produkt cyfrowy — bez kosztów dostawy"
          features={family?.features ?? ['Dostęp online 24/7', 'Własne zadania', 'Link na e-mail']}
        />
        <div className="mb-4">
          <Link to="/stworz-kalendarz/interaktywny/kreator" className="btn-gold px-8 py-3.5 text-lg">
            Spersonalizuj kalendarz <i className="fas fa-arrow-right" aria-hidden="true" />
          </Link>
        </div>
        <p className="text-white/45 text-xs">Po personalizacji dodasz kalendarz do koszyka i opłacisz zamówienie.</p>
      </ProductHero>

      <ProductHighlights items={HIGHLIGHTS} />
      <ProductSteps kicker="Od pomysłu do linku" title={<>Jak powstaje<br /><em>kalendarz?</em></>} steps={HOW_IT_WORKS} />
      <ProductStory
        kicker="Co dostajesz?"
        title={<>24 okienka<br /><em>na Wasz grudzień.</em></>}
        description="Prywatna strona z kalendarzem — bez wysyłki, gotowa zaraz po płatności."
        items={CONTENTS}
      />
      <ProductCrossSell
        kicker="Wolisz papierowy prezent?"
        title={<>Kalendarz zdrapka.<br /><em>Złote okienka w domu.</em></>}
        text="Fizyczny kalendarz A3 ze złotymi zdrapkami. Trzy warianty, gotowa przygoda albo własne zadania. Wysyłka InPost."
        price={formatPrice(SCRATCH_PRICE)}
        priceNote="+ koszt dostawy"
        cta={{ label: 'Zobacz kalendarz zdrapka', to: '/stworz-kalendarz/zdrapka' }}
      />
    </div>
  );
}
