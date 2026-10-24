import { Link } from 'react-router-dom';
import PageBackground from '../components/PageBackground';
import SEOHead from '../components/SEOHead';
import ProductShowcase from '../components/products/ProductShowcase';
import SocialShare from '../components/SocialShare';
import CalendarWaitNotice from '../components/campaign/CalendarWaitNotice';
import { isCalendarsOnSale, PRODUCT_FAMILIES, formatPrice } from '../config/products';
import logo from '@e-advent/assets/brand/eadvent-logo.png';

const CALENDAR_FAMILIES = PRODUCT_FAMILIES.filter(
  (f) => f.type === 'interactive' || f.type === 'scratch',
);

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'Kalendarze adwentowe — e-Advent',
  description:
    'Personalizowane kalendarze adwentowe: interaktywny online od 9 zł lub fizyczna zdrapka od 69 zł.',
  url: 'https://e-advent.pl/kalendarze-adwentowe',
  isPartOf: { '@id': 'https://e-advent.pl/#website' },
  inLanguage: 'pl-PL',
  image: CALENDAR_FAMILIES.map((f) =>
    f.imageSrc ? `https://e-advent.pl${f.imageSrc}` : null,
  ).filter(Boolean),
};

export default function CalendarsHub() {
  const [primary, secondary] = CALENDAR_FAMILIES;
  const calendarsOnSale = isCalendarsOnSale();

  return (
    <>
      <SEOHead
        title="Kalendarze adwentowe — interaktywny i zdrapka | e-Advent"
        description="Stwórz personalizowany kalendarz adwentowy: interaktywny online od 9 zł lub fizyczna zdrapka A3 od 69 zł. Własne zadania, wysyłka InPost. Idealny prezent na święta!"
        keywords="kalendarz adwentowy, kalendarze adwentowe, interaktywny kalendarz adwentowy, kalendarz adwentowy zdrapka, personalizowany kalendarz adwentowy, e-advent"
        canonical="https://e-advent.pl/kalendarze-adwentowe"
        jsonLd={JSON_LD}
      />

      <div className="min-h-screen">
        {primary && (
          <PageBackground className="py-8 md:py-12" showSnow overlayOpacity="medium">
            <div className="container mx-auto px-4 max-w-6xl">
              <div className="mb-6 flex justify-center">
                <Link to="/">
                  <img
                    src={logo}
                    alt="e-Advent"
                    className="h-16 md:h-20 w-auto drop-shadow-xl"
                    width={240}
                    height={80}
                  />
                </Link>
              </div>

              {!calendarsOnSale && (
                <div className="mb-8 max-w-3xl mx-auto">
                  <CalendarWaitNotice tone="onDark" />
                </div>
              )}

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
                priceHint={calendarsOnSale ? 'Natychmiastowy dostęp po płatności · link na e-mail' : 'W sprzedaży od 1 listopada'}
                features={primary.features}
                cta={calendarsOnSale
                  ? { label: 'Stwórz kalendarz', to: primary.creatorRoute }
                  : { label: 'Zamów List do Mikołaja −20%', to: '/list-do-swietego-mikolaja' }}
                tone="onDark"
                headingLevel="h1"
              />
            </div>
          </PageBackground>
        )}

        {secondary && (
          <section className="section-cream py-16 md:py-24">
            <div className="container mx-auto px-4 max-w-6xl">
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
                priceHint={calendarsOnSale ? 'Wysyłka · realizacja 3–5 dni roboczych' : 'W sprzedaży od 1 listopada'}
                features={secondary.features}
                cta={calendarsOnSale
                  ? { label: 'Zobacz kalendarz', to: secondary.creatorRoute }
                  : { label: 'Zamów List do Mikołaja −20%', to: '/list-do-swietego-mikolaja' }}
                tone="onLight"
                headingLevel="h2"
              />
            </div>
          </section>
        )}

        <section className="bg-white py-16 md:py-20">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="prose prose-lg max-w-none">
              <h2 className="font-display text-2xl md:text-3xl font-semibold text-christmas-green mb-6 leading-snug tracking-wide">
                Personalizowany kalendarz adwentowy — e-Advent
              </h2>
              <p className="text-parchment-muted leading-relaxed mb-4">
                e-Advent to{' '}
                <Link
                  to="/stworz-kalendarz/interaktywny"
                  className="text-christmas-green hover:text-christmas-gold underline font-medium transition-colors"
                >
                  interaktywny kalendarz adwentowy online
                </Link>{' '}
                oraz fizyczna{' '}
                <Link
                  to="/stworz-kalendarz/zdrapka"
                  className="text-christmas-green hover:text-christmas-gold underline font-medium transition-colors"
                >
                  zdrapka adwentowa
                </Link>
                . Interaktywny kalendarz personalizujesz imieniem, tytułem i zadaniami; fizyczna
                zdrapka to gotowy plakat A3 — wybierasz wariant i przygodę, a dane do wysyłki podajesz
                przy zamówieniu.
              </p>
              <p className="text-parchment-muted leading-relaxed mb-4">
                Kalendarz adwentowy e-Advent to idealne rozwiązanie dla tych, którzy chcą stworzyć
                niezapomniane wspomnienia podczas adwentu.{' '}
                <Link
                  to="/stworz-kalendarz"
                  className="text-christmas-green hover:text-christmas-gold underline font-medium transition-colors"
                >
                  Stwórz swój kalendarz już dziś
                </Link>{' '}
                i odkryj magię świąt!
              </p>

              <h3 className="font-display text-2xl md:text-3xl font-semibold text-parchment-text mt-8 mb-4">
                Dlaczego warto wybrać kalendarz adwentowy online?
              </h3>
              <p className="text-parchment-muted leading-relaxed mb-4">
                Interaktywny kalendarz adwentowy e-Advent łączy klasyczną magię świąt z wygodą świata
                cyfrowego. Dostępny zawsze i wszędzie — wystarczy mieć dostęp do internetu. Po
                płatności natychmiast otrzymujesz prywatny link na e-mail.
              </p>
              <p className="text-parchment-muted leading-relaxed mb-4">
                Możesz dodać własne zadania adwentowe — od pieczenia pierników i dekorowania domu,
                przez czytanie świątecznych opowieści, aż po wspólne świąteczne aktywności.
              </p>

              <h3 className="font-display text-2xl md:text-3xl font-semibold text-parchment-text mt-8 mb-4">
                Fizyczna zdrapka adwentowa
              </h3>
              <p className="text-parchment-muted leading-relaxed mb-4">
                Preferujesz coś materialnego? Kalendarz zdrapka w formacie A3 to fizyczny
                prezent ze złotymi okienkami — trzy warianty i gotowa przygoda albo własne zadania.
                Realizacja 3–5 dni roboczych, wysyłka InPost.
              </p>

              <h3 className="font-display text-2xl md:text-3xl font-semibold text-parchment-text mt-8 mb-4">
                Jak działa spersonalizowany kalendarz adwentowy?
              </h3>
              <p className="text-parchment-muted leading-relaxed mb-4">
                Interaktywny kalendarz wypełniasz danymi i zadaniami, potem płacisz i dostajesz link.
                Zdrapkę konfigurujesz wariantem i przygodą, dodajesz do koszyka, a e-mail oraz adres
                podajesz dopiero przy płatności — potem wysyłamy kalendarz InPost.
              </p>
              <p className="text-parchment-muted leading-relaxed mb-6">
                Dołącz do tysięcy zadowolonych użytkowników. Przeczytaj naszą{' '}
                <Link
                  to="/polityka-prywatnosci"
                  className="text-christmas-green hover:text-christmas-gold underline transition-colors"
                >
                  politykę prywatności
                </Link>{' '}
                i{' '}
                <Link
                  to="/regulamin"
                  className="text-christmas-green hover:text-christmas-gold underline transition-colors"
                >
                  regulamin
                </Link>{' '}
                przed rozpoczęciem. Zobacz też{' '}
                <Link
                  to="/list-do-swietego-mikolaja"
                  className="text-christmas-green hover:text-christmas-gold underline font-medium transition-colors"
                >
                  List do Świętego Mikołaja
                </Link>{' '}
                oraz{' '}
                <Link
                  to="/sledz-mikolaja"
                  className="text-christmas-green hover:text-christmas-gold underline font-medium transition-colors"
                >
                  tracker Świętego Mikołaja
                </Link>
                .
              </p>
            </div>

            <div className="mt-8 pt-8 divider-parchment">
              <SocialShare />
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
