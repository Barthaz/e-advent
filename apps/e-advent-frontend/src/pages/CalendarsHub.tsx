import { Link } from 'react-router-dom';
import SEOHead from '../components/SEOHead';
import ProductShowcase from '../components/products/ProductShowcase';
import ProductHero from '../components/product-page/ProductHero';
import ProductSection from '../components/product-page/ProductSection';
import { PRODUCT_FAMILIES, formatPrice } from '../config/products';

const CALENDAR_FAMILIES = PRODUCT_FAMILIES.filter(
  (f) => f.type === 'interactive' || f.type === 'scratch',
);

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'Kalendarze adwentowe — e-Advent',
  description:
    'Personalizowane kalendarze adwentowe: kalendarz online od 9 zł lub fizyczna zdrapka od 69 zł.',
  url: 'https://e-advent.pl/kalendarze-adwentowe',
  isPartOf: { '@id': 'https://e-advent.pl/#website' },
  inLanguage: 'pl-PL',
  image: CALENDAR_FAMILIES.map((f) =>
    f.imageSrc ? `https://e-advent.pl${f.imageSrc}` : null,
  ).filter(Boolean),
};

export default function CalendarsHub() {
  const [primary, secondary] = CALENDAR_FAMILIES;

  return (
    <>
      <SEOHead
        title="Kalendarze adwentowe — online i zdrapka | e-Advent"
        description="Stwórz personalizowany kalendarz adwentowy: kalendarz online od 9 zł lub kalendarz zdrapka od 69 zł. Własne zadania, wysyłka InPost. Idealny prezent na święta!"
        keywords="kalendarz adwentowy, kalendarze adwentowe, kalendarz adwentowy online, kalendarz adwentowy zdrapka, personalizowany kalendarz adwentowy, e-advent"
        canonical="https://e-advent.pl/kalendarze-adwentowe"
        jsonLd={JSON_LD}
      />

      <div className="min-h-screen">
        {primary && (
          <ProductHero>
            <ProductShowcase
              images={[
                {
                  src: primary.imageSrc!,
                  alt: primary.imageAlt ?? primary.name,
                },
              ]}
              eyebrow={primary.eyebrow ?? 'Magia grudnia'}
              title={primary.name}
              description={primary.shortDescription}
              priceLabel={`od ${formatPrice(primary.priceFrom)}`}
              priceHint="Natychmiastowy dostęp po płatności · link na e-mail"
              features={primary.features}
              cta={{ label: 'Stwórz kalendarz', to: primary.creatorRoute }}
              tone="onDark"
              headingLevel="h1"
            />
          </ProductHero>
        )}

        {secondary && (
          <ProductSection tinted>
            <ProductShowcase
              images={[
                {
                  src: secondary.imageSrc!,
                  alt: secondary.imageAlt ?? secondary.name,
                },
              ]}
              eyebrow={secondary.eyebrow ?? 'Fizyczny prezent'}
              title={secondary.name}
              description={secondary.shortDescription}
              priceLabel={`od ${formatPrice(secondary.priceFrom)}`}
              priceHint="Wysyłka · realizacja 3–5 dni roboczych"
              features={secondary.features}
              cta={{ label: 'Zobacz kalendarz', to: secondary.creatorRoute }}
              tone="onLight"
              headingLevel="h2"
            />
          </ProductSection>
        )}

        <ProductSection
          kicker="Kilka słów o e-Advent"
          title={<>Personalizowany kalendarz<br /><em>adwentowy e-Advent.</em></>}
        >
          <div className="pdp-prose">
            <p>
              e-Advent to <Link to="/stworz-kalendarz/interaktywny">kalendarz adwentowy online</Link> oraz{' '}
              <Link to="/stworz-kalendarz/zdrapka">kalendarz zdrapka</Link>. Kalendarz online personalizujesz
              imieniem, tytułem i zadaniami; kalendarz zdrapka to fizyczny prezent — wybierasz wariant i
              przygodę, a dane do wysyłki podajesz przy zamówieniu.
            </p>
            <p>
              Kalendarz adwentowy e-Advent to idealne rozwiązanie dla tych, którzy chcą stworzyć
              niezapomniane wspomnienia podczas adwentu.{' '}
              <Link to="/stworz-kalendarz">Stwórz swój kalendarz już dziś</Link> i odkryj magię świąt!
            </p>

            <h3>Dlaczego warto wybrać kalendarz adwentowy online?</h3>
            <p>
              Kalendarz adwentowy online e-Advent łączy klasyczną magię świąt z wygodą świata
              cyfrowego. Dostępny zawsze i wszędzie — wystarczy mieć dostęp do internetu. Po
              płatności natychmiast otrzymujesz prywatny link na e-mail.
            </p>
            <p>
              Możesz dodać własne zadania adwentowe — od pieczenia pierników i dekorowania domu,
              przez czytanie świątecznych opowieści, aż po wspólne świąteczne aktywności.
            </p>

            <h3>Kalendarz zdrapka</h3>
            <p>
              Preferujesz coś materialnego? Kalendarz zdrapka to fizyczny prezent ze złotymi
              okienkami — trzy warianty i gotowa przygoda albo własne zadania.
              Realizacja 3–5 dni roboczych, wysyłka InPost.
            </p>

            <h3>Jak działa spersonalizowany kalendarz adwentowy?</h3>
            <p>
              Kalendarz online wypełniasz danymi i zadaniami, potem płacisz i dostajesz link.
              Zdrapkę konfigurujesz wariantem i przygodą, dodajesz do koszyka, a e-mail oraz adres
              podajesz dopiero przy płatności — potem wysyłamy kalendarz InPost.
            </p>
            <p>
              Dołącz do tysięcy zadowolonych użytkowników. Przeczytaj naszą{' '}
              <Link to="/polityka-prywatnosci">politykę prywatności</Link> i{' '}
              <Link to="/regulamin">regulamin</Link> przed rozpoczęciem. Zobacz też{' '}
              <Link to="/list-do-swietego-mikolaja">List do Świętego Mikołaja</Link> oraz{' '}
              <Link to="/sledz-mikolaja">tracker Świętego Mikołaja</Link>.
            </p>
          </div>
        </ProductSection>
      </div>
    </>
  );
}
