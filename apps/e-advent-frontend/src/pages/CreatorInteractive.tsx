import { useNavigate } from 'react-router-dom';
import FestivePage from '../components/FestivePage';
import ParchmentCard from '../components/ParchmentCard';
import WizardShell from '../components/creator/WizardShell';
import StepBasicInfo from '../components/creator/StepBasicInfo';
import StepTasks from '../components/creator/StepTasks';
import StepOpeningMethod from '../components/creator/StepOpeningMethod';
import StepSummary from '../components/creator/StepSummary';
import { useCreatorWizard } from '../hooks/useCreatorWizard';
import { formatPrice, getProduct, getCheckoutCtaLabel } from '../config/products';

const STEPS = ['basic', 'tasks', 'opening', 'summary'];
const STEP_LABELS = ['Dane', 'Zadania', 'Otwieranie', 'Podsumowanie'];

export default function CreatorInteractive() {
  const navigate = useNavigate();
  const wizard = useCreatorWizard({ productType: 'interactive', steps: STEPS });

  const handleCheckout = () => {
    if (
      !wizard.validateBasicStep()
      || !wizard.validateTasksStep()
      || !wizard.validateOpeningStep()
    ) {
      return;
    }
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'proceed_to_checkout', {
        event_category: 'conversion',
        event_label: 'interactive',
        value: 9.0,
        currency: 'PLN',
      });
    }
    wizard.prepareCheckoutData();
    navigate('/platnosc');
  };

  const stepId = STEPS[wizard.currentStep];
  const product = getProduct('interactive');

  return (
    <FestivePage className="py-4">
      <ParchmentCard padding="lg">
        <WizardShell
          title="Kalendarz interaktywny"
          steps={STEPS}
          stepLabels={STEP_LABELS}
          currentStep={wizard.currentStep}
        >
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
              <button onClick={wizard.goBack} className="btn-outline-parchment px-6 py-3">
                <i className="fas fa-arrow-left mr-2" />Wstecz
              </button>
            )}
            {wizard.currentStep < STEPS.length - 1 ? (
              <button onClick={wizard.goNext} className="btn-green-full flex-1">
                Dalej<i className="fas fa-arrow-right ml-2" />
              </button>
            ) : (
              <button onClick={handleCheckout} className="btn-green-full flex-1">
                <i className="fas fa-credit-card mr-2" />
                {getCheckoutCtaLabel(formatPrice(product?.basePrice ?? 9), false)}
              </button>
            )}
          </div>
        </WizardShell>
      </ParchmentCard>
    </FestivePage>
  );
}
