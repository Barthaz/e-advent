import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageBackground from '../components/PageBackground';
import ParchmentCard from '../components/ParchmentCard';
import SEOHead from '../components/SEOHead';
import StepScratchTasks from '../components/creator/StepScratchTasks';
import CalendarWaitNotice from '../components/campaign/CalendarWaitNotice';
import { formatPrice, getProduct, isCalendarsOnSale } from '../config/products';
import { useCart } from '../context/useCart';
import scratchPresetsData from '../data/scratch-presets.json';
import {
  DEFAULT_SCRATCH_COLOR_ID,
  DEFAULT_SCRATCH_TITLE,
  SCRATCH_COLOR_OPTIONS,
  designFromScratchColor,
  scratchColorFromDesign,
  type ScratchColorId,
} from '../data/scratchColors';
import { SCRATCH_GALLERY } from '../data/scratchProductMedia';
import logo from '@e-advent/assets/brand/eadvent-logo.png';
import { trackViewItem } from '../utils/analytics';
import {
  loadDesign,
  loadScratchMode,
  loadScratchPreset,
  loadScratchShuffle,
  loadTasks,
  saveDesign,
  saveScratchMode,
  saveScratchPreset,
  saveScratchShuffle,
  saveTasks,
} from '../utils/creatorStorage';
import { prepareScratchCalendarForCart } from '../utils/prepareScratchForCart';
import AddedToCartModal from '../components/AddedToCartModal';
import { validateScratchTasksStep, type ScratchPreset } from '../utils/scratchCalendarGenerator';
import type { CalendarTaskInput, ScratchContentMode } from '../types/order';

const SKU = 'scratch-a3';
const PRESETS = scratchPresetsData as ScratchPreset[];

const FAQ = [
  {
    q: 'Czym różni się zdrapka od kalendarza interaktywnego?',
    a: 'Zdrapka to fizyczny kalendarz A3, który wysyłamy InPost. Interaktywny otwierasz online — tam podajesz imię, e-mail i tytuł, bo link trafia na skrzynkę.',
  },
  {
    q: 'Czy muszę podawać imię i e-mail na tej stronie?',
    a: 'Nie. Adres e-mail i dane do wysyłki uzupełnisz dopiero w koszyku, przy składaniu zamówienia.',
  },
  {
    q: 'Co jest pod złotymi okienkami?',
    a: 'Gotowa świąteczna przygoda (24 dni w stałej kolejności) albo Twoje własne zadania — jeśli wybierzesz własną przygodę, uzupełniasz okienka przed dodaniem do koszyka.',
  },
  {
    q: 'Jak wybrać wariant?',
    a: 'Kalendarz jest w trzech wariantach: Zielona Gwiazdka, Czerwony Mikołaj i Błękitna Noc. Wybierz opcję przy produkcie — grafika na zdjęciach pokazuje gotowy wygląd zdrapki.',
  },
  {
    q: 'Jak długo trwa wysyłka?',
    a: 'Przygotowanie i wysyłka InPost zwykle zajmują 3–5 dni roboczych od opłacenia zamówienia.',
  },
];

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'Kalendarz zdrapka A3',
  description:
    'Fizyczny kalendarz adwentowy A3 ze złotymi zdrapkami. Trzy warianty, gotowa przygoda albo własne zadania. Wysyłka InPost.',
  image: SCRATCH_GALLERY.map((g) => `https://e-advent.pl${g.src}`),
  brand: { '@type': 'Brand', name: 'e-Advent' },
  offers: {
    '@type': 'Offer',
    url: 'https://e-advent.pl/stworz-kalendarz/zdrapka',
    priceCurrency: 'PLN',
    price: '69.00',
    availability: isCalendarsOnSale() ? 'https://schema.org/InStock' : 'https://schema.org/PreOrder',
    availabilityStarts: '2026-11-01',
  },
};

export default function CreatorScratch() {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const product = getProduct(SKU);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [cartAdded, setCartAdded] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [colorId, setColorId] = useState<ScratchColorId>(DEFAULT_SCRATCH_COLOR_ID);
  const [mode, setMode] = useState<ScratchContentMode>('preset');
  const [selectedPreset, setSelectedPreset] = useState<number | null>(0);
  const [tasks, setTasks] = useState<CalendarTaskInput[]>([]);
  const [shuffleCustomTasks, setShuffleCustomTasks] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const basePrice = product?.basePrice ?? 69;
  const color = scratchColorFromDesign(designFromScratchColor(colorId));
  const active = SCRATCH_GALLERY[activeIndex];

  useEffect(() => {
    const savedDesign = loadDesign('scratch');
    const savedMode = loadScratchMode('scratch');
    const savedPreset = loadScratchPreset('scratch');
    setColorId(scratchColorFromDesign(savedDesign).id);
    setMode(savedMode);
    setSelectedPreset(savedMode === 'preset' ? savedPreset ?? 0 : null);
    setShuffleCustomTasks(loadScratchShuffle('scratch'));
    setTasks(loadTasks('scratch'));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveDesign('scratch', designFromScratchColor(colorId));
    saveScratchMode('scratch', mode);
    saveScratchPreset('scratch', selectedPreset);
    saveScratchShuffle('scratch', shuffleCustomTasks);
    saveTasks('scratch', tasks);
  }, [hydrated, colorId, mode, selectedPreset, shuffleCustomTasks, tasks]);

  useEffect(() => {
    trackViewItem({
      sku: SKU,
      name: product?.name ?? 'Kalendarz zdrapka',
      price: basePrice,
      category: 'scratch',
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

  const adventureLabel = useMemo(() => {
    if (mode === 'preset' && selectedPreset != null) {
      return PRESETS[selectedPreset]?.name ?? 'Gotowa przygoda';
    }
    return tasks.length ? `Własna przygoda (${tasks.length} zadań)` : 'Własna przygoda';
  }, [mode, selectedPreset, tasks.length]);

  const calendarsOnSale = isCalendarsOnSale();

  const handleAddToCart = async () => {
    if (!calendarsOnSale) return;
    const validation = validateScratchTasksStep({
      presets: PRESETS,
      mode,
      selectedPreset,
      customTasks: tasks,
    });
    if (!validation.valid) {
      setAddError(validation.error || 'Wybierz przygodę albo dodaj własne zadania.');
      return;
    }

    setIsAdding(true);
    setAddError(null);

    try {
      const design = designFromScratchColor(colorId);
      const { calendarId } = await prepareScratchCalendarForCart({
        calendarTitle: DEFAULT_SCRATCH_TITLE,
        tasks,
        scratchContentMode: mode,
        selectedScratchPreset: selectedPreset,
        shuffleCustomTasks,
        productType: 'scratch',
        sku: SKU,
        format: 'A3',
        design,
      });

      addItem({
        sku: SKU,
        quantity: 1,
        calendarId,
        label: `${product?.name ?? DEFAULT_SCRATCH_TITLE} · ${color.label} · ${adventureLabel}`,
        unitPrice: product?.basePrice,
        format: 'A3',
      });

      setCartAdded(true);
    } catch (err) {
      console.error('[CreatorScratch] Add to cart failed:', err);
      setAddError(err instanceof Error ? err.message : 'Nie udało się dodać do koszyka. Spróbuj ponownie.');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <>
      <SEOHead
        title="Kalendarz zdrapka A3 — złote okienka, 3 warianty | e-Advent"
        description="Fizyczny kalendarz adwentowy A3 ze złotymi zdrapkami. Wybierz wariant i przygodę — gotową historię albo własne zadania. Cena 69 zł + dostawa."
        keywords="kalendarz adwentowy zdrapka, kalendarz zdrapka A3, adwentowy kalendarz fizyczny, e-advent"
        canonical="https://e-advent.pl/stworz-kalendarz/zdrapka"
        ogImage={`https://e-advent.pl${SCRATCH_GALLERY[0].src}`}
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
                    className="w-full aspect-[4/3] object-contain bg-[#24150f]"
                    width={960}
                    height={1200}
                    decoding="async"
                  />
                </button>
                <div className="mt-3 grid grid-cols-5 gap-2">
                  {SCRATCH_GALLERY.map((img, i) => (
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

              <div className="text-white">
                <p className="text-christmas-gold text-sm tracking-[0.2em] uppercase mb-3">
                  Fizyczny prezent
                </p>
                <h1 className="font-display text-3xl md:text-5xl font-semibold text-christmas-gold-light mb-4 leading-tight">
                  Kalendarz zdrapka
                </h1>
                <p className="text-white/80 text-base md:text-lg leading-relaxed mb-6">
                  Świąteczny kalendarz A3 ze złotymi okienkami. Każdego dnia zdrapujesz pole
                  i odkrywasz zadanie — gotową przygodę albo własną historię, którą ułożysz tutaj.
                </p>

                {!calendarsOnSale && (
                  <div className="mb-6">
                    <CalendarWaitNotice tone="onDark" />
                  </div>
                )}

                <div className="mb-6">
                  <p className="font-display text-4xl font-semibold text-christmas-gold-light">
                    {formatPrice(basePrice)}
                  </p>
                  <p className="text-white/60 text-sm mt-2">
                    + dostawa
                  </p>
                </div>

                <ul className="space-y-2 mb-6 text-white/85 text-sm">
                  {['Format A3 (29,7 × 42 cm)', 'Złote okienka do zdrapania', '3 warianty', 'Wysyłka InPost'].map(
                    (f) => (
                      <li key={f} className="flex items-center gap-2">
                        <i className="fas fa-check text-christmas-gold text-xs" />
                        {f}
                      </li>
                    ),
                  )}
                </ul>

                <div className="mb-6 rounded-2xl border border-christmas-gold/35 bg-white/5 p-4 md:p-5 backdrop-blur-sm">
                  <p className="font-display text-[15px] sm:text-lg text-christmas-gold-light mb-3">
                    Wariant kalendarza
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {SCRATCH_COLOR_OPTIONS.map((option) => {
                      const selected = option.id === colorId;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setColorId(option.id)}
                          className={`rounded-xl border-2 px-1.5 py-3 text-center transition-colors ${
                            selected
                              ? 'border-christmas-gold bg-white/10 text-christmas-gold-light'
                              : 'border-white/20 text-white/80 hover:border-christmas-gold/50'
                          }`}
                          aria-pressed={selected}
                        >
                          <span
                            className="mx-auto mb-2 block h-6 w-6 rounded-full border border-white/30"
                            style={{ backgroundColor: option.swatch }}
                            aria-hidden
                          />
                          <span className="block text-[12px] sm:text-[13px] font-medium leading-tight">
                            {option.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mb-6 rounded-2xl border border-christmas-gold/35 bg-white/5 p-4 md:p-5 backdrop-blur-sm">
                  <p className="font-display text-[15px] sm:text-lg text-christmas-gold-light mb-3">
                    Przygoda pod okienkami
                  </p>
                  <StepScratchTasks
                    presets={PRESETS}
                    mode={mode}
                    setMode={setMode}
                    selectedPreset={selectedPreset}
                    setSelectedPreset={setSelectedPreset}
                    tasks={tasks}
                    setTasks={setTasks}
                    shuffleCustomTasks={shuffleCustomTasks}
                    setShuffleCustomTasks={setShuffleCustomTasks}
                    validationError={addError}
                    setValidationError={setAddError}
                    tone="onDark"
                    hideIntro
                  />
                </div>

                {addError && (
                  <p className="mb-4 text-sm text-red-200" role="alert">
                    <i className="fas fa-exclamation-circle mr-1.5" />
                    {addError}
                  </p>
                )}

                {calendarsOnSale ? (
                  <div className="mb-4">
                    <button
                      type="button"
                      onClick={() => void handleAddToCart()}
                      className="btn-gold px-8 py-3.5 text-lg"
                      disabled={isAdding}
                    >
                      <i className={`fas ${isAdding ? 'fa-spinner fa-spin' : 'fa-shopping-basket'}`} />
                      {isAdding ? 'Dodawanie…' : 'Dodaj do koszyka'}
                    </button>
                  </div>
                ) : (
                  <p className="mb-4 text-white/55 text-sm">Zdrapkę będzie można dodać do koszyka od 1 listopada.</p>
                )}
                <p className="text-white/45 text-xs">
                  Realizacja 3–5 dni roboczych · Bezpieczna płatność
                </p>
              </div>
            </div>
          </div>
        </PageBackground>

        <section className="section-cream py-16 md:py-20">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="section-title mb-4 text-center">Co jest w zestawie?</h2>
            <div className="gold-divider mb-10" />
            <div className="grid sm:grid-cols-3 gap-5">
              {[
                {
                  icon: 'fa-ruler-combined',
                  title: 'Kalendarz A3',
                  text: 'Duży, świąteczny plakat 29,7 × 42 cm — gotowy do powieszenia i zdrapywania.',
                },
                {
                  icon: 'fa-gem',
                  title: '24 złote okienka',
                  text: 'Każdego dnia zdrapujesz pole i odkrywasz zadanie albo cytat pod folią.',
                },
                {
                  icon: 'fa-palette',
                  title: 'Twój wariant',
                  text: 'Zielona Gwiazdka, Czerwony Mikołaj albo Błękitna Noc plus gotowa przygoda lub własne 24 dni.',
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

        <section className="bg-white py-16 md:py-20">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="section-title mb-4 text-center">Jak zamówić zdrapkę?</h2>
            <div className="gold-divider mb-10" />
            <ParchmentCard padding="lg">
              <ol className="space-y-4">
                {[
                  'Wybierz wariant kalendarza — Zielona Gwiazdka, Czerwony Mikołaj albo Błękitna Noc.',
                  'Wybierz gotową świąteczną przygodę albo ułóż własne zadania pod okienka.',
                  'Dodaj kalendarz do koszyka. Imię, e-mail i adres podasz dopiero przy płatności.',
                  'Po opłaceniu przygotujemy przesyłkę i wyślemy ją InPost w 3–5 dni roboczych.',
                ].map((step, i) => (
                  <li key={step} className="step-row">
                    <span className="step-badge">{i + 1}</span>
                    <p className="text-parchment-text leading-relaxed">{step}</p>
                  </li>
                ))}
              </ol>
              <div className="mt-6 pt-6 divider-parchment text-center">
                <Link to="/list-do-swietego-mikolaja" className="text-christmas-green hover:text-christmas-gold font-medium underline transition-colors">
                  Dołącz List do Świętego Mikołaja →
                </Link>
              </div>
            </ParchmentCard>
          </div>
        </section>

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
              <Link to="/stworz-kalendarz/interaktywny" className="btn-gold px-8 py-3">
                Wolisz kalendarz interaktywny?
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
      <AddedToCartModal
        open={cartAdded}
        onContinue={() => setCartAdded(false)}
        onGoToCart={() => navigate('/koszyk')}
      />
    </>
  );
}
