import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageBackground from '../components/PageBackground';
import ParchmentCard from '../components/ParchmentCard';
import AddedToCartModal from '../components/AddedToCartModal';
import Logo from '../components/Logo';
import CreatorSteps from '../components/creator/CreatorSteps';
import StepBasicInfo from '../components/creator/StepBasicInfo';
import StepTasks from '../components/creator/StepTasks';
import StepOpeningMethod from '../components/creator/StepOpeningMethod';
import StepSummary from '../components/creator/StepSummary';
import { useCart } from '../context/useCart';
import { createCalendar } from '../api/api';
import { loadGeneratedCalendar } from '../utils/creatorStorage';
import { useCreatorWizard } from '../hooks/useCreatorWizard';
import { useScrollStepIntoView } from '../hooks/useScrollStepIntoView';
import { formatPrice, getProduct } from '../config/products';
import SEOHead from '../components/SEOHead';

const STEPS = ['basic', 'tasks', 'opening', 'summary'];
const STEP_LABELS = ['Dane', 'Zadania', 'Otwieranie', 'Podsumowanie'];
const STEP_TITLES = [
  'Dla kogo jest kalendarz?',
  'Co znajdzie się w okienkach?',
  'Jak chcesz otwierać okienka?',
  'Twój kalendarz jest gotowy do zamówienia',
];

export default function InteractiveCreator() {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const adding = useRef(false);
  const [saving, setSaving] = useState(false);
  const [added, setAdded] = useState(false);
  const wizard = useCreatorWizard({ productType: 'interactive', steps: STEPS });
  const headingRef = useScrollStepIntoView<HTMLHeadingElement>(wizard.currentStep);
  const product = getProduct('interactive');
  const stepId = STEPS[wizard.currentStep];
  const price = product?.basePrice ?? 9;

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

  return (
    <>
      <SEOHead
        title="Kreator kalendarza adwentowego online | e-Advent"
        description="Spersonalizuj kalendarz adwentowy online — imię, zadania i sposób otwierania okienek."
        canonical="https://e-advent.pl/stworz-kalendarz/interaktywny/kreator"
        robots="noindex, follow"
      />
      <PageBackground className="py-8 md:py-12 min-h-screen" showSnow overlayOpacity="medium">
        <div className="container mx-auto px-4 max-w-3xl">
          <Logo className="mb-6" />
          <div className="text-center text-white mb-6">
            <p className="text-christmas-gold text-xs tracking-[0.25em] uppercase mb-2">Kreator kalendarza online</p>
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="font-display text-3xl md:text-4xl font-semibold text-christmas-gold-light focus:outline-none scroll-mt-24"
            >
              {STEP_TITLES[wizard.currentStep]}
            </h1>
            <p className="text-white/70 text-sm mt-2">{formatPrice(price)} · bez kosztów dostawy</p>
          </div>

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

            <div className="flex flex-wrap items-center justify-between gap-3 mt-8">
              {wizard.currentStep > 0 ? (
                <button type="button" onClick={wizard.goBack} disabled={saving} className="btn-outline-parchment px-5 py-2.5">
                  <i className="fas fa-arrow-left mr-2" aria-hidden="true" />Wstecz
                </button>
              ) : (
                <Link to="/stworz-kalendarz/interaktywny" className="text-sm text-parchment-muted underline underline-offset-4">
                  O produkcie
                </Link>
              )}
              {wizard.currentStep < STEPS.length - 1 ? (
                <button type="button" onClick={wizard.goNext} className="btn-gold px-7 py-3">
                  Dalej <i className="fas fa-arrow-right ml-2" aria-hidden="true" />
                </button>
              ) : (
                <button type="button" onClick={addCalendar} disabled={saving} className="btn-gold px-7 py-3">
                  <i className="fas fa-shopping-basket mr-2" aria-hidden="true" />
                  {saving ? 'Dodajemy kalendarz…' : 'Dodaj do koszyka'}
                </button>
              )}
            </div>
          </ParchmentCard>
        </div>
      </PageBackground>
      <AddedToCartModal open={added} onContinue={() => setAdded(false)} onGoToCart={() => navigate('/koszyk')} />
    </>
  );
}
