import { productSchema } from '../seo/product';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ParchmentCard from '../components/ParchmentCard';
import PageBackground from '../components/PageBackground';
import AddedToCartModal from '../components/AddedToCartModal';
import { useCart } from '../context/useCart';
import { createCalendar } from '../api/api';
import { loadGeneratedCalendar } from '../utils/creatorStorage';
import CreatorSteps from '../components/creator/CreatorSteps';
import StepBasicInfo from '../components/creator/StepBasicInfo';
import StepTasks from '../components/creator/StepTasks';
import StepOpeningMethod from '../components/creator/StepOpeningMethod';
import StepSummary from '../components/creator/StepSummary';
import ProductHero from '../components/product-page/ProductHero';
import ProductGallery from '../components/product-page/ProductGallery';
import ProductIntro from '../components/product-page/ProductIntro';
import ProductHighlights from '../components/product-page/ProductHighlights';
import ProductSteps from '../components/product-page/ProductSteps';
import ProductStory from '../components/product-page/ProductStory';
import ProductCrossSell from '../components/product-page/ProductCrossSell';
import { useCreatorWizard } from '../hooks/useCreatorWizard';
import { formatPrice, getProduct, PRODUCT_FAMILIES } from '../config/products';
import { trackViewItem } from '../utils/analytics';
import SEOHead from '../components/SEOHead';

const STEPS = ['basic', 'tasks', 'opening', 'summary'];
const STEP_LABELS = ['Dane', 'Zadania', 'Otwieranie', 'Podsumowanie'];
const STEP_TITLES = ['Dla kogo jest kalendarz?', 'Co znajdzie się w okienkach?', 'Jak chcesz otwierać okienka?', 'Twój kalendarz jest gotowy do zamówienia'];
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
  const navigate = useNavigate();
  const { addItem } = useCart();
  const adding = useRef(false);
  const [saving, setSaving] = useState(false);
  const [added, setAdded] = useState(false);
  const wizard = useCreatorWizard({ productType: 'interactive', steps: STEPS });
  const product = getProduct('interactive');

  useEffect(() => {
    trackViewItem({
      sku: 'interactive',
      name: product?.name ?? 'Kalendarz online',
      price: product?.basePrice ?? 9,
      category: 'interactive',
    });
  }, [product?.name, product?.basePrice]);

  const addCalendar = async () => {
    if (adding.current || !wizard.validateBasicStep() || !wizard.validateTasksStep() || !wizard.validateOpeningStep()) return;
    adding.current = true;
    setSaving(true);
    try {
      const tasks = loadGeneratedCalendar('interactive');
      if (!Array.isArray(tasks) || tasks.length !== 24) throw new Error('Wróć do zadań i wybierz zestaw na 24 dni.');
      const email = wizard.email.trim();
      const title = wizard.calendarTitle.trim() || 'Mój kalendarz adwentowy';
      const result = await createCalendar({
        name: wizard.name.trim(),
        email,
        calendarTitle: title,
        tasks,
        sku: 'interactive',
        productType: 'interactive',
        openingMethod: wizard.openingMethod ?? undefined,
        dailyEmailReminders: wizard.openingMethod === 'email',
        dailyContentEmail: wizard.openingMethod === 'email' ? wizard.dailyContentEmail.trim() || email : undefined,
      }, undefined, false);
      if (!result.editToken || !localStorage.getItem('e-advent-edit-token:' + result.calendar.id)) {
        throw new Error('Nie udało się zapisać kalendarza w tej przeglądarce. Włącz pamięć witryny i spróbuj ponownie.');
      }
      addItem({
        sku: 'interactive',
        calendarId: result.calendar.id,
        quantity: 1,
        label: 'Kalendarz online · ' + title,
        customerEmail: email,
        customerName: wizard.name.trim(),
        unitPrice: product?.basePrice,
      });
      setAdded(true);
    } catch (error) {
      wizard.setValidationError(error instanceof Error ? error.message : 'Nie udało się dodać kalendarza do koszyka. Spróbuj ponownie.');
    } finally {
      adding.current = false;
      setSaving(false);
    }
  };

  const stepId = STEPS[wizard.currentStep];
  const family = PRODUCT_FAMILIES.find((item) => item.type === 'interactive');
  const price = product?.basePrice ?? 9;
  const images = family?.imageSrc ? [{ src: family.imageSrc, alt: family.imageAlt ?? 'Kalendarz adwentowy online' }] : [];

  return (
    <div className="min-h-screen">
      <SEOHead jsonLd={JSON_LD} title="Kalendarz adwentowy online — kreator | e-Advent" description="Stwórz kalendarz adwentowy online z własnymi zadaniami. Personalizacja i prywatny link na e-mail po opłaceniu zamówienia." canonical="https://e-advent.pl/stworz-kalendarz/interaktywny" />
      <ProductHero media={<ProductGallery images={images} />}>
        <ProductIntro
          eyebrow={family?.eyebrow ?? 'Online'}
          title="Kalendarz adwentowy online z własnymi zadaniami"
          description="Prywatna strona z 24 okienkami. Podajesz imię, tytuł i zadania, a po płatności link przychodzi na e-mail."
          price={formatPrice(price)}
          priceHint="Produkt cyfrowy — bez kosztów dostawy"
          features={family?.features ?? ['Dostęp online 24/7', 'Własne zadania', 'Link na e-mail']}
        />

        <a className="btn-gold inline-flex justify-center px-7 py-3" href="#kreator">Spersonalizuj kalendarz</a>
      </ProductHero>
      <PageBackground className="py-8 md:py-12" showSnow overlayOpacity="medium">
        <section id="kreator" className="container mx-auto max-w-3xl px-4 scroll-mt-24" aria-label="Kreator kalendarza online">
          <header className="text-center mb-6">
            <p className="text-christmas-gold text-xs tracking-[0.25em] uppercase mb-2">Kreator kalendarza online</p>
            <h2 className="font-display text-3xl md:text-4xl font-semibold text-christmas-gold-light">{STEP_TITLES[wizard.currentStep]}</h2>
          </header>
          <CreatorSteps labels={STEP_LABELS} current={wizard.currentStep} />
          <ParchmentCard padding="lg">
            {stepId === 'basic' && (
              <StepBasicInfo
                name={wizard.name}
                setName={wizard.setName}
                email={wizard.email}
                setEmail={wizard.setEmail}
                calendarTitle={wizard.calendarTitle}
                setCalendarTitle={wizard.setCalendarTitle}
              />
            )}
            {stepId === 'tasks' && (
              <StepTasks
                tasks={wizard.tasks}
                setTasks={wizard.setTasks}
                selectedExampleSets={wizard.selectedExampleSets}
                setSelectedExampleSets={wizard.setSelectedExampleSets}
                examples={wizard.examples}
                validationError={wizard.validationError}
                setValidationError={wizard.setValidationError}
                productType="interactive"
              />
            )}
            {stepId === 'opening' && (
              <StepOpeningMethod
                openingMethod={wizard.openingMethod}
                setOpeningMethod={wizard.setOpeningMethod}
                dailyContentEmail={wizard.dailyContentEmail}
                setDailyContentEmail={wizard.setDailyContentEmail}
                buyerEmail={wizard.email}
              />
            )}
            {stepId === 'summary' && (
              <StepSummary
                productType="interactive"
                sku="interactive"
                name={wizard.name}
                email={wizard.email}
                calendarTitle={wizard.calendarTitle}
                tasksCount={wizard.tasks.length}
                openingMethod={wizard.openingMethod}
                dailyContentEmail={wizard.dailyContentEmail}
              />
            )}

            {wizard.validationError && stepId !== 'tasks' && (
              <div className="alert-error mt-4"><p>{wizard.validationError}</p></div>
            )}

            <div className="flex gap-4 mt-8">
              {wizard.currentStep > 0 && (
                <button onClick={wizard.goBack} disabled={saving} className="btn-outline-parchment px-6 py-3">
                  <i className="fas fa-arrow-left mr-2" />Wstecz
                </button>
              )}
              {wizard.currentStep < STEPS.length - 1 ? (
                <button onClick={wizard.goNext} className="btn-gold px-7 py-3 ml-auto">
                  Dalej<i className="fas fa-arrow-right ml-2" />
                </button>
              ) : (
                <button onClick={addCalendar} disabled={saving} className="btn-gold px-7 py-3 ml-auto">
                  <i className="fas fa-shopping-basket mr-2" aria-hidden="true" />
                  {saving ? 'Dodajemy kalendarz…' : 'Dodaj do koszyka'}
                </button>
              )}
            </div>
          </ParchmentCard>
        </section>
      </PageBackground>
      <AddedToCartModal open={added} onContinue={() => navigate('/#rozdzialy')} onGoToCart={() => navigate('/koszyk')} />

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
