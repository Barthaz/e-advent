import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FestivePage from '../components/FestivePage';
import ParchmentCard from '../components/ParchmentCard';
import WizardShell from '../components/creator/WizardShell';
import StepBasicInfo from '../components/creator/StepBasicInfo';
import StepTasks from '../components/creator/StepTasks';
import StepDesign from '../components/creator/StepDesign';
import StepSummary from '../components/creator/StepSummary';
import { useCreatorWizard } from '../hooks/useCreatorWizard';
import {
  formatPrice,
  getProduct,
  getCheckoutCtaLabel,
  PHYSICAL_ADD_TO_CART_HINT,
} from '../config/products';
import { useCart } from '../context/CartContext';
import { prepareScratchCalendarForCart } from '../utils/prepareScratchForCart';
import { trackViewItem } from '../utils/analytics';

const STEPS = ['design', 'basic', 'tasks', 'summary'];
const STEP_LABELS = ['Grafika i format', 'Dane', 'Zadania', 'Podsumowanie'];

export default function CreatorScratch() {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const wizard = useCreatorWizard({ productType: 'scratch', steps: STEPS, requiresDesign: true });
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const sku = wizard.getSku();
  const product = getProduct(sku);

  useEffect(() => {
    trackViewItem({
      sku,
      name: product?.name ?? 'Kalendarz zdrapka',
      price: product?.basePrice ?? 0,
      category: 'scratch',
    });
  }, [sku, product?.name, product?.basePrice]);

  const handleAddToCart = async () => {
    if (!wizard.validateBasicStep() || !wizard.validateTasksStep() || !wizard.validateDesignStep()) return;
    if (!wizard.design?.imageUrl) {
      setAddError('Wybierz grafikę kalendarza.');
      return;
    }

    setIsAdding(true);
    setAddError(null);

    try {
      wizard.prepareCheckoutData();
      const cartSku = wizard.getSku();
      const cartProduct = getProduct(cartSku);
      const { calendarId } = await prepareScratchCalendarForCart({
        name: wizard.name,
        email: wizard.email,
        calendarTitle: wizard.calendarTitle,
        tasks: wizard.tasks,
        selectedExampleSets: wizard.selectedExampleSets,
        dailyEmailReminders: wizard.dailyEmailReminders,
        productType: 'scratch',
        sku: cartSku,
        format: wizard.format,
        design: wizard.design,
      });

      addItem({
        sku: cartSku,
        quantity: 1,
        calendarId,
        label: cartProduct?.name ?? 'Kalendarz zdrapka',
        unitPrice: cartProduct?.basePrice,
        customerEmail: wizard.email.trim(),
        customerName: wizard.name.trim(),
        format: wizard.format,
      });

      navigate('/koszyk');
    } catch (err) {
      console.error('[CreatorScratch] Add to cart failed:', err);
      setAddError(err instanceof Error ? err.message : 'Nie udało się dodać do koszyka. Spróbuj ponownie.');
      setIsAdding(false);
    }
  };

  const stepId = STEPS[wizard.currentStep];

  return (
    <FestivePage className="py-4">
      <ParchmentCard padding="lg">
        <WizardShell title="Kalendarz zdrapka" steps={STEPS} stepLabels={STEP_LABELS} currentStep={wizard.currentStep}>
          {stepId === 'basic' && (
            <StepBasicInfo name={wizard.name} setName={wizard.setName} email={wizard.email} setEmail={wizard.setEmail} calendarTitle={wizard.calendarTitle} setCalendarTitle={wizard.setCalendarTitle} />
          )}
          {stepId === 'tasks' && (
            <StepTasks tasks={wizard.tasks} setTasks={wizard.setTasks} selectedExampleSets={wizard.selectedExampleSets} setSelectedExampleSets={wizard.setSelectedExampleSets} examples={wizard.examples} validationError={wizard.validationError} setValidationError={wizard.setValidationError} productType="scratch" />
          )}
          {stepId === 'design' && (
            <StepDesign productType="scratch" format={wizard.format} setFormat={wizard.setFormat} design={wizard.design} setDesign={wizard.setDesign} validationError={wizard.validationError} setValidationError={wizard.setValidationError} />
          )}
          {stepId === 'summary' && (
            <StepSummary productType="scratch" sku={sku} name={wizard.name} email={wizard.email} calendarTitle={wizard.calendarTitle} tasksCount={wizard.tasks.length} format={wizard.format} design={wizard.design} />
          )}

          {addError && (
            <div className="alert-error mt-4">
              <p>{addError}</p>
            </div>
          )}

          <div className="flex flex-col gap-3 mt-8">
            <div className="flex gap-4">
              {wizard.currentStep > 0 && (
                <button type="button" onClick={wizard.goBack} className="btn-outline-parchment px-6 py-3" disabled={isAdding}>
                  <i className="fas fa-arrow-left mr-2" />Wstecz
                </button>
              )}
              {wizard.currentStep < STEPS.length - 1 ? (
                <button type="button" onClick={wizard.goNext} className="btn-green-full flex-1">Dalej<i className="fas fa-arrow-right ml-2" /></button>
              ) : (
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="btn-green-full flex-1"
                  disabled={isAdding}
                >
                  {isAdding ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2" />
                      Dodawanie do koszyka…
                    </>
                  ) : (
                    <>
                      <i className="fas fa-shopping-basket mr-2" />
                      {getCheckoutCtaLabel(formatPrice(product?.basePrice ?? 0), true)}
                    </>
                  )}
                </button>
              )}
            </div>
            {stepId === 'summary' && (
              <p className="text-sm text-parchment-muted text-center">
                <i className="fas fa-info-circle mr-1 text-christmas-green" />
                {PHYSICAL_ADD_TO_CART_HINT}
              </p>
            )}
          </div>
        </WizardShell>
      </ParchmentCard>
    </FestivePage>
  );
}
