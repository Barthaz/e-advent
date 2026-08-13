import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import PageBackground from '../components/PageBackground';
import ParchmentCard from '../components/ParchmentCard';
import SEOHead from '../components/SEOHead';
import SantaMap from '../components/santa/SantaMap';
import SantaControls from '../components/santa/SantaControls';
import SantaStatusPanel from '../components/santa/SantaStatusPanel';
import SantaDebugPanel from '../components/santa/SantaDebugPanel';
import SantaGateMessage from '../components/santa/SantaGateMessage';
import { useSantaCities, useCitySearch } from '../hooks/useCitySearch';
import { useSantaSchedule } from '../hooks/useSantaSchedule';
import { useSantaDebug } from '../hooks/useSantaDebug';
import { computePosition, buildSchedule } from '../utils/santa/schedule';
import {
  trackSantaCitySelected,
  trackSantaTrackerPageView,
  trackSantaTrackingReset,
  trackSantaTrackingStarted,
} from '../utils/santa/analytics';
import logo from '../assets/logo.png';

const SANTA_JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': 'https://e-advent.pl/sledz-mikolaja#webpage',
      url: 'https://e-advent.pl/sledz-mikolaja',
      name: 'Śledź Świętego Mikołaja na żywo | Tracker e-Advent',
      description:
        'Pokaż dzieciom na mapie, gdzie właśnie jest Święty Mikołaj. Zaplanuj godzinę przyjazdu do Waszego domu i śledźcie trasę na żywo — 24 grudnia.',
      isPartOf: { '@id': 'https://e-advent.pl/#website' },
      inLanguage: 'pl-PL',
    },
    {
      '@type': 'Event',
      name: 'Trasa Świętego Mikołaja — Wigilia',
      description:
        'Śledzenie na żywo trasy Świętego Mikołaja na mapie świata — wspólna magia Wigilii dla rodziców i dzieci.',
      eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
      eventStatus: 'https://schema.org/EventScheduled',
      startDate: '2026-12-24',
      endDate: '2026-12-25',
      location: {
        '@type': 'VirtualLocation',
        url: 'https://e-advent.pl/sledz-mikolaja',
      },
      organizer: {
        '@type': 'Organization',
        name: 'e-Advent',
        url: 'https://e-advent.pl',
      },
    },
  ],
};

export default function SantaTracker() {
  const location = useLocation();
  const { cities, loading, error } = useSantaCities();
  const { enabled: debug, speed, setSpeed } = useSantaDebug();
  const { query, setQuery, selected, selectCity, results } = useCitySearch(cities);

  const [arrivalHour, setArrivalHour] = useState(18);
  const [arrivalMinute, setArrivalMinute] = useState(0);
  const [tracking, setTracking] = useState(false);

  useEffect(() => {
    trackSantaTrackerPageView(debug);
  }, [debug]);

  const userCityIndex = tracking && selected ? selected.index : null;

  const scheduleState = useSantaSchedule({
    cities,
    userCityIndex: userCityIndex ?? (selected?.index ?? null),
    arrivalHour,
    arrivalMinute,
    speed: tracking ? speed : 1,
    search: location.search,
    forceLive: debug ? true : tracking ? undefined : false,
    debugMode: debug && tracking,
    active: tracking && !!selected,
  });

  const idlePosition = useMemo(() => {
    if (!cities.length) {
      return computePosition([], { tStart: 0, tEnd: 0, tArrival: 0, fraction: 0 }, 0);
    }
    const idx = selected?.index ?? 0;
    const schedule = buildSchedule({
      cities,
      userCityIndex: idx,
      arrivalHour,
      arrivalMinute,
    });
    return computePosition(cities, schedule, schedule.tStart - 1);
  }, [cities, selected, arrivalHour, arrivalMinute]);

  const mapPosition = tracking && selected ? scheduleState.position : idlePosition;
  const statusState =
    tracking && selected
      ? scheduleState
      : {
          ...scheduleState,
          position: idlePosition,
          progressPct: 0,
          visitedLabel: `0 / ${cities.length}`,
          currentCity: cities[0] ?? null,
          nextCity: cities[1] ?? null,
        };

  const cityCountLabel = useMemo(() => {
    if (!cities.length) return '';
    let pl = 0;
    for (const c of cities) {
      if (c.country === 'Polska') pl += 1;
    }
    return `${cities.length.toLocaleString('pl-PL')} punktów trasy · ${pl.toLocaleString('pl-PL')} miejscowości w Polsce`;
  }, [cities]);

  /** Hard navigation — SPA navigate was starved by tracker update loops */
  const goHome = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.location.assign('/');
  };

  return (
    <>
      <SEOHead
        title="Śledź Świętego Mikołaja na żywo | Tracker e-Advent"
        description="Pokaż dzieciom, gdzie właśnie jest Święty Mikołaj. Zaplanuj przyjazd do Waszego domu i śledźcie trasę na mapie świata — na żywo 24 grudnia."
        keywords="śledź mikołaja, tracker świętego mikołaja, gdzie jest mikołaj, trasa mikołaja dla dzieci, mapa mikołaja na żywo, mikołaj 24 grudnia, e-advent"
        canonical="https://e-advent.pl/sledz-mikolaja"
        jsonLd={SANTA_JSON_LD}
      />

      <div className="min-h-screen">
        {/* Hero — te same style co Landing */}
        <PageBackground className="py-12 md:py-16" showSnow overlayOpacity="medium">
          <div className="container mx-auto px-4 text-center max-w-4xl">
            <div className="mb-8 flex justify-center">
              <Link to="/" onClick={goHome} className="transition-transform hover:scale-[1.02] duration-500">
                <img
                  src={logo}
                  alt="e-Advent - Interaktywny Kalendarz Adwentowy Online"
                  className="h-28 md:h-36 w-auto drop-shadow-2xl"
                  width="260"
                  height="104"
                  loading="eager"
                  fetchPriority="high"
                />
              </Link>
            </div>

            <p className="text-christmas-gold text-sm md:text-base tracking-[0.25em] uppercase mb-4">
              Magia Świąt
            </p>

            <h1 className="font-display text-3xl md:text-5xl lg:text-6xl font-semibold mb-6 leading-tight text-christmas-gold-light">
              Śledź Świętego Mikołaja
            </h1>

            <p className="text-white/80 text-base md:text-lg max-w-2xl mx-auto mb-6 leading-relaxed">
              Zaplanuj przyjazd do Waszego domu i pokaż dzieciom na mapie, gdzie właśnie jest Święty Mikołaj —
              wspólna magia Wigilii w czasie rzeczywistym.
            </p>

            <Link
              to="/"
              onClick={goHome}
              className="btn-outline-gold px-6 py-2.5 text-sm inline-flex items-center gap-2"
            >
              <i className="fas fa-arrow-left text-xs" />
              Wróć na stronę główną
            </Link>
          </div>
        </PageBackground>

        {debug && (
          <div className="bg-white border-b border-bronze/15">
            <div className="container mx-auto px-4 py-3 max-w-7xl">
              <SantaDebugPanel speed={speed} onSpeedChange={setSpeed} />
            </div>
          </div>
        )}

        {/* Tracker — cream jak sekcje Landing */}
        <section className="section-cream py-12 md:py-20">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="text-center mb-10">
              <h2 className="section-title mb-4">Live tracker</h2>
              <div className="gold-divider mb-6" />
              <p className="text-parchment-muted text-base md:text-lg max-w-3xl mx-auto leading-relaxed">
                Wybierz Wasze miasto, ustaw godzinę przyjazdu i pokaż dzieciom, jak Mikołaj zbliża się do domu.
              </p>
            </div>

            <ParchmentCard padding="lg">
              {loading ? (
                <div className="py-16 text-center">
                  <div className="spinner mx-auto mb-4" />
                  <p className="text-parchment-muted text-base md:text-lg">Wczytywanie mapy i miast świata…</p>
                </div>
              ) : error ? (
                <p className="text-center text-christmas-red py-8">{error}</p>
              ) : (
                <div className="space-y-6">
                  {!scheduleState.liveAllowed && !debug && <SantaGateMessage />}

                  <SantaControls
                    query={query}
                    onQueryChange={(v) => {
                      setQuery(v);
                      setTracking(false);
                    }}
                    results={results}
                    selected={selected}
                    onSelect={(city) => {
                      selectCity(city);
                      setTracking(false);
                      trackSantaCitySelected(city.name, city.country);
                    }}
                    arrivalHour={arrivalHour}
                    arrivalMinute={arrivalMinute}
                    onArrivalChange={(h, m) => {
                      setArrivalHour(h);
                      setArrivalMinute(m);
                    }}
                  />

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button
                      type="button"
                      disabled={!selected}
                      onClick={() => {
                        if (!selected) return;
                        setTracking(true);
                        trackSantaTrackingStarted({
                          cityName: selected.name,
                          arrivalHour,
                          arrivalMinute,
                          debug,
                        });
                      }}
                      className="btn-gold px-8 py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <i className="fas fa-globe-europe" />
                      {tracking ? 'Śledzenie aktywne' : 'Śledź Mikołaja'}
                    </button>
                    {debug && tracking && (
                      <button
                        type="button"
                        onClick={() => {
                          setTracking(false);
                          trackSantaTrackingReset();
                        }}
                        className="btn-red px-6 py-3 text-base"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  <SantaStatusPanel state={statusState} tracking={tracking && !!selected} />

                  <div className="w-full md:-mx-2 lg:-mx-4">
                    <SantaMap
                      cities={cities}
                      position={mapPosition}
                      userCityIndex={selected?.index ?? null}
                      showRoute={tracking && !!selected && (scheduleState.liveAllowed || debug)}
                    />
                  </div>

                  {cityCountLabel && (
                    <p className="text-center text-xs md:text-sm text-parchment-muted tracking-wide">
                      {cityCountLabel}
                    </p>
                  )}
                </div>
              )}
            </ParchmentCard>
          </div>
        </section>

        {/* SEO — ten sam wzorzec co Landing */}
        <section className="bg-white py-16 md:py-20">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="prose prose-lg max-w-none">
              <h2 className="font-display text-2xl md:text-3xl font-semibold text-christmas-green mb-6 leading-snug tracking-wide">
                Tracker pozycji Świętego Mikołaja
              </h2>
              <p className="text-parchment-muted leading-relaxed mb-4">
                Wigilia to magiczny wieczór — a jeszcze piękniej, gdy możesz usiąść z dziećmi przy mapie
                i razem śledzić, gdzie w tej chwili jest Święty Mikołaj. Wybierz Wasze miasto lub wieś,
                ustaw godzinę przyjazdu i pokaż maluchom, jak sanie lecą przez świat wprost do Waszego domu.
              </p>
              <p className="text-parchment-muted leading-relaxed mb-4">
                Cała trasa trwa dokładnie 24 godziny. 24 grudnia mapa ożywa automatycznie — wtedy wystarczy
                otworzyć tracker i wspólnie odliczać, aż Mikołaj będzie u Was. Poza tym dniem możesz już
                zaplanować godzinę przyjazdu, żeby w Wigilię wszystko było gotowe na wspólne śledzenie.
              </p>
              <p className="text-parchment-muted leading-relaxed mb-4">
                To świąteczne uzupełnienie{' '}
                <Link
                  to="/stworz-kalendarz"
                  className="text-christmas-green hover:text-christmas-gold underline font-medium transition-colors"
                >
                  personalizowanych kalendarzy adwentowych
                </Link>{' '}
                e-Advent — magia grudnia pełna ciepła, nie tylko w okienkach.
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
