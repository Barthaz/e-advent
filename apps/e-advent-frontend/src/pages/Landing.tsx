import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import PageBackground from '../components/PageBackground';
import ParchmentCard from '../components/ParchmentCard';
import DemoCalendar from '../components/DemoCalendar';
import SocialShare from '../components/SocialShare';
import SEOHead from '../components/SEOHead';
import ProductCard from '../components/products/ProductCard';
import { PRODUCT_FAMILIES } from '../config/products';
import { getDaysUntilChristmas, formatCountdown } from '../utils/countdown';
import logo from '../assets/logo.png';

export default function Landing() {
  const [countdown, setCountdown] = useState(formatCountdown(getDaysUntilChristmas()));
  const [daysUntilChristmas, setDaysUntilChristmas] = useState(getDaysUntilChristmas());
  const [heroVisible, setHeroVisible] = useState(false);
  const scrollElementsRef = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setHeroVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    const observeElements = () => {
      scrollElementsRef.current.forEach((el) => {
        if (el && !el.classList.contains('visible')) {
          observer.observe(el);
        }
      });
    };

    observeElements();
    const t1 = setTimeout(observeElements, 100);
    const t2 = setTimeout(observeElements, 500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      scrollElementsRef.current.forEach((el) => {
        if (el) observer.unobserve(el);
      });
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(formatCountdown(getDaysUntilChristmas()));
      setDaysUntilChristmas(getDaysUntilChristmas());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const heroClass = (delay: string) =>
    `transition-all duration-1000 ease-out ${delay} ${
      heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
    }`;

  return (
    <>
      <SEOHead
        title="e-Advent — Niezapomniane chwile świąt | List do Mikołaja i kalendarze adwentowe"
        description="e-Advent pomaga przeżywać czas świąteczny w cieple: list do Świętego Mikołaja, personalizowane kalendarze adwentowe i śledzenie Mikołaja. Każde święta mogą być niezapomniane."
        keywords="e-advent, niezapomniane święta, list do świętego mikołaja, kalendarz adwentowy, okres oczekiwania na święta, magia adwentu"
        canonical="https://e-advent.pl/"
      />

      <div className="min-h-screen">
        {/* Hero */}
        <PageBackground
          className="min-h-screen flex flex-col justify-center py-16 md:py-24"
          showSnow
          overlayOpacity="medium"
        >
          <div className="container mx-auto px-4 text-center">
            <div className={`mb-8 flex justify-center ${heroClass('delay-0')}`}>
              <Link to="/" className="transition-transform hover:scale-[1.02] duration-500">
                <img
                  src={logo}
                  alt="e-Advent - Interaktywny Kalendarz Adwentowy Online"
                  className="h-36 md:h-44 w-auto drop-shadow-2xl"
                  width="300"
                  height="120"
                  loading="eager"
                  fetchPriority="high"
                />
              </Link>
            </div>

            <p className={`text-christmas-gold text-sm md:text-base tracking-[0.25em] uppercase mb-4 ${heroClass('delay-100')}`}>
              e-Advent
            </p>

            <h1 className={`font-display text-3xl md:text-5xl lg:text-6xl font-semibold mb-6 leading-tight text-christmas-gold-light ${heroClass('delay-200')}`}>
              Niezapomniane chwile świąt
            </h1>

            {/* Odliczanie — styl aplikacji */}
            <div className={`countdown-box max-w-lg mx-auto px-6 py-5 mb-8 ${heroClass('delay-300')}`}>
              <p className="text-christmas-gold-light text-sm md:text-base font-medium mb-4 tracking-wide">
                {daysUntilChristmas > 0
                  ? 'Do Bożego Narodzenia zostało już tylko'
                  : daysUntilChristmas === 0
                  ? 'Dziś są Święta!'
                  : `Święta za ${Math.abs(daysUntilChristmas)} dni!`}
              </p>
              {daysUntilChristmas > 0 && (
                <div className="flex items-center justify-center gap-3 md:gap-5">
                  {[
                    { value: countdown.days, label: 'dni' },
                    { value: countdown.hours, label: 'godz' },
                    { value: countdown.minutes, label: 'min' },
                  ].map((item, i) => (
                    <div key={item.label} className="flex items-center gap-3 md:gap-5">
                      {i > 0 && (
                        <span className="countdown-digit text-xl md:text-2xl font-bold opacity-60">:</span>
                      )}
                      <div className="text-center min-w-[3rem]">
                        <div className="countdown-digit text-2xl md:text-3xl font-bold">
                          {item.value}
                        </div>
                        <div className="text-christmas-gold-light/80 text-xs mt-1">{item.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cytat — karta pergaminowa */}
            <div className={`max-w-2xl mx-auto mb-8 ${heroClass('delay-400')}`}>
              <ParchmentCard padding="md">
                <p className="text-parchment-text text-base md:text-lg leading-relaxed italic text-center">
                  „Niech ten grudzień przyniesie Ci to, czego Twoje serce naprawdę pragnie."
                </p>
              </ParchmentCard>
            </div>

            <p className={`text-white/80 text-base md:text-lg max-w-2xl mx-auto mb-8 leading-relaxed ${heroClass('delay-500')}`}>
              List do Świętego Mikołaja, kalendarze adwentowe i magia oczekiwania — żeby grudzień przeżywać w cieple i miłej atmosferze.
            </p>

            <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 mb-6 ${heroClass('delay-600')}`}>
              <Link to="/list-do-swietego-mikolaja" className="btn-gold px-10 py-4 text-lg md:text-xl">
                <i className="fas fa-envelope" />
                List do Mikołaja
              </Link>
              <Link to="/kalendarze-adwentowe" className="btn-green px-8 py-4 text-lg">
                <i className="fas fa-calendar-alt" />
                Kalendarze adwentowe
              </Link>
              <Link to="/kalendarz" className="btn-outline-gold px-8 py-4 text-base md:text-lg">
                Otwórz swój kalendarz
                <i className="fas fa-arrow-right text-sm" />
              </Link>
            </div>

            <p className={`text-white/50 text-xs md:text-sm tracking-wide ${heroClass('delay-700')}`}>
              List od 29 zł &nbsp;·&nbsp; Kalendarze od 9 zł &nbsp;·&nbsp; Darmowa wysyłka od 100 zł
            </p>
          </div>
        </PageBackground>

        {/* Wybierz produkt */}
        <section className="section-cream py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="section-title mb-4">
                Świąteczne produkty e-Advent
              </h2>
              <div className="gold-divider mb-6" />
              <p className="text-parchment-muted text-base md:text-lg max-w-3xl mx-auto">
                List do Mikołaja, kalendarze adwentowe i wspólne oczekiwanie na święta — wybierz to, co najlepiej pasuje do Twojego grudnia.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {PRODUCT_FAMILIES.map((product) => (
                <ProductCard key={product.type} product={product} featured={product.type === 'interactive'} />
              ))}
            </div>
          </div>
        </section>

        {/* Dla istniejących użytkowników */}
        <section className="bg-white py-16 md:py-20">
          <div
            ref={(el) => { scrollElementsRef.current[0] = el; }}
            className="fade-in-scroll container mx-auto px-4 text-center"
          >
            <div className="max-w-2xl mx-auto">
              <h2 className="section-title mb-4">
                Masz już swój kalendarz?
              </h2>
              <div className="gold-divider mb-6" />
              <p className="text-parchment-muted text-lg md:text-xl mb-8 leading-relaxed">
                Zacznij otwieranie okienek i odkrywaj magiczne zadania każdego dnia grudnia
              </p>
              <Link to="/kalendarz" className="btn-gold px-8 py-4 text-lg">
                <i className="fas fa-gift" />
                Otwórz swój kalendarz
              </Link>
            </div>
          </div>
        </section>

        {/* Co to jest? */}
        <section className="section-cream py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div
              ref={(el) => { scrollElementsRef.current[1] = el; }}
              className="fade-in-scroll text-center mb-14"
            >
              <h2 className="section-title mb-4">
                Co to jest e-Advent?
              </h2>
              <div className="gold-divider mb-6" />
              <p className="text-parchment-muted text-base md:text-lg max-w-3xl mx-auto leading-relaxed mb-4">
                e-Advent to personalizowany kalendarz adwentowy w dwóch formach: interaktywny online
                lub fizyczna zdrapka. Dodaj własne zadania i twórz wyjątkowe wspomnienia przez cały grudzień.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-10 max-w-5xl mx-auto items-start">
              <div
                ref={(el) => { scrollElementsRef.current[2] = el; }}
                className="fade-in-scroll space-y-5"
              >
                {[
                  {
                    icon: 'fa-bullseye',
                    title: 'Własne zadania',
                    text: 'Dodaj 24 unikalne zadania dla każdego dnia grudnia. Piecz pierniki, czytaj opowieści, dekoruj dom — to Ty decydujesz!',
                  },
                  {
                    icon: 'fa-palette',
                    title: 'Pełna personalizacja',
                    text: 'Nadaj kalendarzowi własny tytuł, dodaj zadania lub wylosuj z gotowych świątecznych zestawów.',
                  },
                  {
                    icon: 'fa-lock',
                    title: 'Bezpieczny dostęp',
                    text: 'Otrzymasz unikalny, prywatny link do swojego kalendarza. Udostępnij link bliskim albo zachowaj dla siebie.',
                  },
                ].map((feature) => (
                  <ParchmentCard key={feature.title} padding="sm">
                    <div className="flex items-start gap-4">
                      <div className="icon-circle">
                        <i className={`fas ${feature.icon} text-parchment-text`} />
                      </div>
                      <div>
                        <h3 className="font-display text-xl font-semibold text-parchment-text mb-1">
                          {feature.title}
                        </h3>
                        <p className="text-parchment-muted text-sm leading-relaxed">{feature.text}</p>
                      </div>
                    </div>
                  </ParchmentCard>
                ))}
              </div>

              <div
                ref={(el) => { scrollElementsRef.current[3] = el; }}
                className="fade-in-scroll"
              >
                <ParchmentCard padding="lg">
                  <h3 className="font-display text-2xl md:text-3xl font-semibold text-parchment-text text-center mb-6">
                    Jak to działa?
                  </h3>
                  <div className="space-y-4">
                    {[
                      { step: '1', title: 'Stwórz kalendarz', desc: 'Wypełnij formularz w 2 minuty' },
                      { step: '2', title: 'Zapłać bezpiecznie', desc: 'Tylko 9 zł — jednorazowa płatność' },
                      { step: '3', title: 'Otrzymaj link', desc: 'Natychmiast na Twój e-mail' },
                      { step: '4', title: 'Otwieraj codziennie', desc: '24 dni magii i radości!' },
                    ].map((item) => (
                      <div key={item.step} className="step-row">
                        <span className="step-badge">{item.step}</span>
                        <div>
                          <p className="font-semibold text-parchment-text">{item.title}</p>
                          <p className="text-parchment-muted text-sm">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ParchmentCard>
              </div>
            </div>
          </div>
        </section>

        {/* Demo Calendar */}
        <PageBackground className="py-16 md:py-24" showSnow overlayOpacity="medium">
          <div className="container mx-auto px-4">
            <div
              ref={(el) => { scrollElementsRef.current[4] = el; }}
              className="fade-in-scroll text-center mb-10"
            >
              <h2 className="section-title-light mb-4">
                Darmowy Kalendarz od e-Advent
              </h2>
              <div className="gold-divider mb-6" />
              <p className="text-white/80 text-base md:text-lg max-w-3xl mx-auto leading-relaxed">
                Kalendarz z gotowymi zadaniami, dostępny dla wszystkich. Otwieraj okienka codziennie
                i ciesz się magiczną chwilą — Twój postęp jest automatycznie zapisywany.
              </p>
            </div>

            <div
              ref={(el) => { scrollElementsRef.current[5] = el; }}
              className="fade-in-scroll max-w-5xl mx-auto"
            >
              <DemoCalendar />
            </div>

            <div
              ref={(el) => { scrollElementsRef.current[6] = el; }}
              className="fade-in-scroll text-center mt-12"
            >
              <p className="text-white/70 mb-6">
                Chcesz stworzyć swój własny kalendarz z personalizowanymi zadaniami?
              </p>
              <Link to="/stworz-kalendarz" className="btn-gold px-8 py-4 text-lg">
                <i className="fas fa-gift" />
                Stwórz swój kalendarz teraz
              </Link>
            </div>
          </div>
        </PageBackground>

        {/* Dlaczego warto */}
        <section className="section-cream py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div
              ref={(el) => { scrollElementsRef.current[7] = el; }}
              className="fade-in-scroll text-center mb-12"
            >
              <h2 className="section-title mb-4">
                Dlaczego warto wybrać e-Advent?
              </h2>
              <div className="gold-divider mb-6" />
              <p className="text-parchment-muted text-base md:text-lg max-w-2xl mx-auto">
                Pomagamy przeżywać święta w cieple — dzień po dniu, przez cały grudzień
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {[
                { icon: 'fa-magic', title: 'Magia każdego dnia', text: 'Budź się z ekscytacją na otwarcie nowego okienka. Każdy dzień grudnia to nowa przygoda!' },
                { icon: 'fa-gift', title: 'Idealny prezent', text: 'Podaruj bliskiej osobie kalendarz pełen osobistych zadań. Prezent, który tworzy się przez cały miesiąc!' },
                { icon: 'fa-mobile-alt', title: 'Dostęp wszędzie', text: 'Otwieraj kalendarz na telefonie, tablecie lub komputerze. Postęp synchronizowany na wszystkich urządzeniach!', hasApp: true },
                { icon: 'fa-palette', title: 'Nieograniczona kreatywność', text: 'Dodaj tyle zadań, ile chcesz. Wypełnij wszystkie 24 dni lub tylko wybrane — całkowita swoboda!' },
                { icon: 'fa-rocket', title: 'Natychmiastowy dostęp', text: 'Po płatności natychmiast otrzymasz link do kalendarza. Nie musisz czekać!' },
                { icon: 'fa-heart', title: 'Razem przez grudzień', text: 'Udostępnij link. Otwierajcie okienka razem i cieszcie się magią dnia po dniu!' },
              ].map((feature, index) => (
                <div
                  key={feature.title}
                  ref={(el) => { scrollElementsRef.current[8 + index] = el; }}
                  className="fade-in-scroll"
                >
                  <ParchmentCard padding="md" className="h-full">
                    <div className="text-center">
                      <div className="icon-circle-lg">
                        <i className={`fas ${feature.icon} text-parchment-text text-xl`} />
                      </div>
                      <h3 className="font-display text-xl font-semibold text-parchment-text mb-3">
                        {feature.title}
                      </h3>
                      <p className="text-parchment-muted text-sm leading-relaxed">{feature.text}</p>
                      {feature.hasApp && (
                        <div className="mt-4 pt-4 divider-parchment">
                          <a
                            href="https://e-advent.pl/download/e-advent.apk"
                            className="btn-gold px-4 py-2 text-sm"
                            onClick={() => {
                              if (typeof window !== 'undefined' && window.gtag) {
                                window.gtag('event', 'android_app_downloaded', {
                                  event_category: 'engagement',
                                  event_label: 'landing_page',
                                });
                              }
                            }}
                          >
                            <i className="fab fa-android" />
                            Pobierz na Androida
                          </a>
                        </div>
                      )}
                    </div>
                  </ParchmentCard>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-white py-16 md:py-24">
          <div
            ref={(el) => { scrollElementsRef.current[14] = el; }}
            className="fade-in-scroll container mx-auto px-4 text-center"
          >
            <h2 className="section-title mb-5">
              Gotowy na niezapomniane święta?
            </h2>
            <div className="gold-divider mb-6" />
            <p className="text-parchment-muted text-lg md:text-xl mb-8 max-w-2xl mx-auto">
              Wybierz interaktywny kalendarz od{' '}
              <span className="text-christmas-green font-semibold">9 zł</span>
              {' '}lub fizyczną zdrapkę od{' '}
              <span className="text-christmas-green font-semibold">49 zł</span>
            </p>
            <Link to="/stworz-kalendarz" className="btn-gold px-12 py-5 text-xl md:text-2xl">
              <i className="fas fa-gift" />
              Rozpocznij magię grudnia
            </Link>
            <p className="mt-8 text-parchment-muted/60 text-sm">
              Natychmiastowy dostęp &nbsp;·&nbsp; 100% bezpieczna płatność &nbsp;·&nbsp; Satysfakcja gwarantowana
            </p>
          </div>
        </section>

        {/* SEO Content */}
        <section className="section-cream py-16 md:py-20">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="prose prose-lg max-w-none">
              <h2 className="font-display text-2xl md:text-3xl font-semibold text-christmas-green mb-6 leading-snug tracking-wide">
                Interaktywny Kalendarz Adwentowy Online — e-Advent
              </h2>
              <p className="text-parchment-muted leading-relaxed mb-4">
                e-Advent to innowacyjny,{' '}
                <Link to="/stworz-kalendarz" className="text-christmas-green hover:text-christmas-gold underline font-medium transition-colors">
                  interaktywny kalendarz adwentowy online
                </Link>
                , który pozwala na pełną personalizację doświadczenia świątecznego. W przeciwieństwie do tradycyjnych kalendarzy
                adwentowych, nasz wirtualny kalendarz oferuje nieograniczone możliwości dostosowania do Twoich potrzeb.
              </p>
              <p className="text-parchment-muted leading-relaxed mb-4">
                Kalendarz adwentowy e-Advent to idealne rozwiązanie dla wszystkich, którzy chcą stworzyć wyjątkowe wspomnienia
                podczas adwentu.{' '}
                <Link to="/stworz-kalendarz" className="text-christmas-green hover:text-christmas-gold underline font-medium transition-colors">
                  Stwórz swój kalendarz już dziś
                </Link>{' '}
                i odkryj magię świąt!
              </p>
              <h3 className="font-display text-2xl md:text-3xl font-semibold text-parchment-text mt-8 mb-4">
                Dlaczego warto wybrać kalendarz adwentowy online?
              </h3>
              <p className="text-parchment-muted leading-relaxed mb-4">
                Interaktywny kalendarz adwentowy e-Advent to połączenie klasycznej magii świąt z wygodą świata cyfrowego.
                Dostępny zawsze i wszędzie — wystarczy mieć dostęp do internetu.
              </p>
              <p className="text-parchment-muted leading-relaxed mb-4">
                Kalendarz bożonarodzeniowy e-Advent pozwala na dodanie własnych zadań adwentowych — od gotowania pierników
                i dekorowania domu, przez czytanie świątecznych opowieści, aż po wspólne świąteczne aktywności.
              </p>
              <h3 className="font-display text-2xl md:text-3xl font-semibold text-parchment-text mt-8 mb-4">
                Jak działa spersonalizowany kalendarz adwentowy?
              </h3>
              <p className="text-parchment-muted leading-relaxed mb-4">
                Wystarczy wypełnić krótki formularz, dodać własne zadania lub pozwolić systemowi wylosować je automatycznie,
                dokonać bezpiecznej płatności i natychmiast otrzymać unikalny link do swojego kalendarza.
              </p>
              <p className="text-parchment-muted leading-relaxed mb-4">
                Każdego dnia grudnia możesz otworzyć jedno okienko i odkryć zadanie na dany dzień.
                System automatycznie zapisuje Twój postęp.
              </p>
              <h3 className="font-display text-2xl md:text-3xl font-semibold text-parchment-text mt-8 mb-4">
                Idealny prezent na święta Bożego Narodzenia
              </h3>
              <p className="text-parchment-muted leading-relaxed mb-4">
                Kalendarz adwentowy e-Advent to wyjątkowy prezent, który można podarować bliskim na święta.
                Doświadczenie, które będzie trwać przez cały grudzień.
              </p>
              <p className="text-parchment-muted leading-relaxed mb-6">
                Dołącz do tysięcy zadowolonych użytkowników i{' '}
                <Link to="/stworz-kalendarz" className="text-christmas-green hover:text-christmas-gold underline font-medium transition-colors">
                  stwórz swój własny interaktywny kalendarz adwentowy już dziś
                </Link>
                ! Przeczytaj naszą{' '}
                <Link to="/polityka-prywatnosci" className="text-christmas-green hover:text-christmas-gold underline transition-colors">
                  politykę prywatności
                </Link>{' '}
                i{' '}
                <Link to="/regulamin" className="text-christmas-green hover:text-christmas-gold underline transition-colors">
                  regulamin
                </Link>{' '}
                przed rozpoczęciem.
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
