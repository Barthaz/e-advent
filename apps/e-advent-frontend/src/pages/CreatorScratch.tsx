import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SEOHead from '../components/SEOHead';
import StepScratchTasks from '../components/creator/StepScratchTasks';
import ProductHero from '../components/product-page/ProductHero';
import ProductGallery from '../components/product-page/ProductGallery';
import ProductIntro from '../components/product-page/ProductIntro';
import ProductPanel from '../components/product-page/ProductPanel';
import ProductCartAction from '../components/product-page/ProductCartAction';
import ProductHighlights from '../components/product-page/ProductHighlights';
import ProductSteps from '../components/product-page/ProductSteps';
import ProductStory from '../components/product-page/ProductStory';
import ProductCrossSell from '../components/product-page/ProductCrossSell';
import ProductFaq from '../components/product-page/ProductFaq';
import { formatPrice, getProduct } from '../config/products';
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
const ONLINE_PRICE = getProduct('interactive')?.basePrice ?? 9;

const HIGHLIGHTS = [
  { icon: 'fas fa-ruler-combined', label: 'Duży format A3 · 29,7 × 42 cm' },
  { icon: 'fas fa-gem', label: '24 złote okienka do zdrapania' },
  { icon: 'fas fa-truck', label: 'Wysyłka InPost w 3–5 dni roboczych' },
];

const STEPS = [
  { title: 'Wybierasz wariant', text: 'Zielona Gwiazdka, Czerwony Mikołaj albo Błękitna Noc.' },
  { title: 'Wybierasz przygodę', text: 'Gotowa świąteczna przygoda albo własne zadania pod okienka.' },
  { title: 'Dodajesz do koszyka', text: 'Imię, e-mail i adres podasz dopiero przy płatności.' },
  { title: 'Wysyłamy InPost', text: 'Po opłaceniu przygotujemy przesyłkę i wyślemy ją w 3–5 dni roboczych.' },
];

const CONTENTS = [
  { title: 'Kalendarz A3', text: 'Duży, świąteczny plakat 29,7 × 42 cm — gotowy do powieszenia i zdrapywania.' },
  { title: '24 złote okienka', text: 'Każdego dnia zdrapujesz pole i odkrywasz zadanie albo cytat pod folią.' },
  { title: 'Twój wariant', text: 'Zielona Gwiazdka, Czerwony Mikołaj albo Błękitna Noc plus gotowa przygoda lub własne 24 dni.' },
];

const FAQ = [
  {
    q: 'Czym różni się zdrapka od kalendarza online?',
    a: 'Kalendarz zdrapka to fizyczny prezent, który wysyłamy InPost. Kalendarz online otwierasz w przeglądarce — tam podajesz imię, e-mail i tytuł, bo link trafia na skrzynkę.',
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
  name: 'Kalendarz zdrapka',
  description:
    'Fizyczny kalendarz adwentowy ze złotymi zdrapkami. Trzy warianty, gotowa przygoda albo własne zadania. Wysyłka InPost.',
  image: SCRATCH_GALLERY.map((g) => `https://e-advent.pl${g.src}`),
  brand: { '@type': 'Brand', name: 'e-Advent' },
  offers: {
    '@type': 'Offer',
    url: 'https://e-advent.pl/stworz-kalendarz/zdrapka',
    priceCurrency: 'PLN',
    price: '69.00',
    availability: 'https://schema.org/InStock',
  },
};

export default function CreatorScratch() {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const product = getProduct(SKU);
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

  const adventureLabel = useMemo(() => {
    if (mode === 'preset' && selectedPreset != null) {
      return PRESETS[selectedPreset]?.name ?? 'Gotowa przygoda';
    }
    return tasks.length ? `Własna przygoda (${tasks.length} zadań)` : 'Własna przygoda';
  }, [mode, selectedPreset, tasks.length]);

  const handleAddToCart = async () => {
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
        title="Kalendarz zdrapka — złote okienka, 3 warianty | e-Advent"
        description="Fizyczny kalendarz adwentowy ze złotymi zdrapkami. Wybierz wariant i przygodę — gotową historię albo własne zadania. Cena 69 zł + dostawa."
        keywords="kalendarz adwentowy zdrapka, kalendarz zdrapka A3, adwentowy kalendarz fizyczny, e-advent"
        canonical="https://e-advent.pl/stworz-kalendarz/zdrapka"
        ogImage={`https://e-advent.pl${SCRATCH_GALLERY[0].src}`}
        jsonLd={JSON_LD}
      />

      <div className="min-h-screen">
        <ProductHero media={<ProductGallery images={SCRATCH_GALLERY} fit="contain" />}>
          <ProductIntro
            eyebrow="Fizyczny prezent"
            title="Kalendarz zdrapka"
            description="Świąteczny kalendarz zdrapka ze złotymi okienkami. Każdego dnia zdrapujesz pole i odkrywasz zadanie — gotową przygodę albo własną historię, którą ułożysz tutaj."
            price={formatPrice(basePrice)}
            priceHint="+ dostawa"
            features={['Format A3 (29,7 × 42 cm)', 'Złote okienka do zdrapania', '3 warianty', 'Wysyłka InPost']}
          />

          <ProductPanel title="Wariant kalendarza">
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
          </ProductPanel>

          <ProductPanel title="Przygoda pod okienkami">
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
          </ProductPanel>

          {addError && (
            <p className="mb-4 text-sm text-red-200" role="alert">
              <i className="fas fa-exclamation-circle mr-1.5" />
              {addError}
            </p>
          )}

          <ProductCartAction onClick={() => void handleAddToCart()} busy={isAdding} />
        </ProductHero>

        <ProductHighlights items={HIGHLIGHTS} />
        <ProductSteps
          kicker="Od wyboru do paczki"
          title={<>Jak zamówić<br /><em>zdrapkę?</em></>}
          steps={STEPS}
          footer={<Link to="/list-do-swietego-mikolaja">Dołącz List do Świętego Mikołaja →</Link>}
        />
        <ProductStory
          kicker="Co jest w zestawie?"
          title={<>Kalendarz A3<br /><em>ze złotymi okienkami.</em></>}
          description="Gotowa przygoda albo Wasza własna historia — po jednym okienku na każdy grudniowy dzień."
          items={CONTENTS}
        />
        <ProductCrossSell
          kicker="Wolisz bez wysyłki?"
          title={<>Kalendarz online.<br /><em>Gotowy od razu.</em></>}
          text="Prywatna strona z 24 okienkami. Podajesz imię, tytuł i zadania, a po płatności link przychodzi na e-mail."
          price={formatPrice(ONLINE_PRICE)}
          priceNote={<>produkt cyfrowy<br /><small>bez kosztów dostawy</small></>}
          cta={{ label: 'Stwórz kalendarz online', to: '/stworz-kalendarz/interaktywny' }}
        />
        <ProductFaq items={FAQ} />
      </div>

      <AddedToCartModal
        open={cartAdded}
        onContinue={() => setCartAdded(false)}
        onGoToCart={() => navigate('/koszyk')}
      />
    </>
  );
}
