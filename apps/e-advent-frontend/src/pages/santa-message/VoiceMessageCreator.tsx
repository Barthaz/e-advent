import CreatorSteps from '../../components/creator/CreatorSteps';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import PageBackground from '../../components/PageBackground';
import ParchmentCard from '../../components/ParchmentCard';
import SEOHead from '../../components/SEOHead';
import AddedToCartModal from '../../components/AddedToCartModal';
import Logo from '../../components/Logo';
import { formatPrice, getProduct } from '../../config/products';
import { useCart } from '../../context/useCart';
import { useScrollStepIntoView } from '../../hooks/useScrollStepIntoView';
import { voiceAddonSlots } from '../../utils/cartStorage';
import { trackSantaEvent } from '../../utils/analytics';
import PersonalizationFields from '../../santa-message/PersonalizationFields';
import PersonalizationSummary from '../../santa-message/PersonalizationSummary';
import { createDraft, getDraft, SantaApiError, updateDraft } from '../../santa-message/api';
import { clearStoredDraft, loadStoredDraft, saveStoredDraft } from '../../santa-message/draftStore';
import {
  EMPTY_PERSONALIZATION,
  errorMessage,
  FIELD_RULES,
  normalizePersonalization,
  STEP_FIELDS,
  validateFields,
  type FieldErrors,
  type FieldName,
  type Personalization,
  type PurchaseMode,
} from '../../santa-message/validation';

type Step = 1 | 2 | 3;

const STEPS: Array<{ step: Step; label: string }> = [
  { step: 1, label: 'Dziecko' },
  { step: 2, label: 'Opowieść' },
  { step: 3, label: 'Podsumowanie' },
];

function formatDuration(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export default function VoiceMessageCreator() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { items, addVoiceMessage } = useCart();
  const editingItem = useMemo(() => {
    const id = params.get('edytuj');
    return id ? items.find((item) => item.id === id && item.voiceDraftId && item.voiceDraftKey) ?? null : null;
  }, [items, params]);

  const wantsAddon = params.get('tryb') === 'list' || editingItem?.sku === 'voice-message-addon';
  const mode: PurchaseMode = wantsAddon && (voiceAddonSlots(items) > 0 || Boolean(editingItem))
    ? 'letter_addon'
    : 'standalone';
  const price = getProduct(mode === 'letter_addon' ? 'voice-message-addon' : 'voice-message')!.basePrice;

  const [step, setStep] = useState<Step>(1);
  const [value, setValue] = useState<Personalization>(EMPTY_PERSONALIZATION);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [vocativeTouched, setVocativeTouched] = useState(false);
  const [draft, setDraft] = useState<{ id: string; key: string } | null>(null);
  const [preview, setPreview] = useState<{ estimatedSeconds: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const startedRef = useRef(false);
  const headingRef = useScrollStepIntoView<HTMLHeadingElement>(step);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    trackSantaEvent('santa_creator_start', { purchase_mode: mode });
  }, [mode]);

  // Resume an unfinished draft or edit a message already in the cart.
  useEffect(() => {
    const source = editingItem
      ? { id: editingItem.voiceDraftId!, key: editingItem.voiceDraftKey! }
      : params.get('nowa') === '1' ? null : loadStoredDraft();
    if (!source) return;
    let alive = true;
    getDraft(source.id, source.key)
      .then((loaded) => {
        if (!alive || loaded.status !== 'draft' || !loaded.personalization) return;
        setDraft(source);
        setValue({ ...EMPTY_PERSONALIZATION, ...loaded.personalization });
        setVocativeTouched(true);
      })
      .catch(() => {
        if (!editingItem) clearStoredDraft();
      });
    return () => {
      alive = false;
    };
  }, [editingItem, params]);

  const reportErrors = (found: FieldErrors) => {
    for (const field of Object.keys(found)) {
      trackSantaEvent('santa_creator_validation_error', { field_name: field, error_type: 'client' });
    }
  };

  const applyServerErrors = (error: SantaApiError): boolean => {
    if (!error.fieldErrors.length) return false;
    const mapped: FieldErrors = {};
    for (const fieldError of error.fieldErrors) {
      const field = fieldError.field as FieldName;
      if (field in EMPTY_PERSONALIZATION) {
        mapped[field] = errorMessage(fieldError.code, { min: fieldError.min, max: fieldError.max ?? FIELD_RULES[field]?.max });
      }
      trackSantaEvent('santa_creator_validation_error', { field_name: fieldError.field, error_type: fieldError.code.toLowerCase() });
    }
    if (error.fieldErrors.some((e) => e.field === 'script')) {
      setFormError('Wiadomość wyszła za długa. Skróć proszę któreś z pól.');
    }
    setErrors(mapped);
    const firstStep = Object.keys(mapped).some((f) => STEP_FIELDS[1].includes(f as FieldName)) ? 1 : 2;
    setStep(firstStep);
    return true;
  };

  const next = async () => {
    setFormError(null);
    if (step === 1 || step === 2) {
      const found = validateFields(value, STEP_FIELDS[step]);
      setErrors(found);
      if (Object.keys(found).length) {
        reportErrors(found);
        return;
      }
      trackSantaEvent('santa_creator_step_complete', { step, purchase_mode: mode });
      if (step === 1) {
        setStep(2);
        return;
      }
      setSaving(true);
      try {
        const clean = normalizePersonalization(value);
        const result = draft
          ? await updateDraft(draft.id, draft.key, mode, clean)
          : await createDraft(mode, clean);
        const saved = draft ?? { id: result.id, key: result.key! };
        setDraft(saved);
        if (!editingItem) saveStoredDraft({ ...saved, mode });
        setPreview(result.preview);
        setStep(3);
      } catch (error) {
        if (error instanceof SantaApiError && error.status === 404 && draft) {
          setDraft(null);
          clearStoredDraft();
          setFormError('Poprzednia wersja robocza wygasła. Kliknij „Dalej” jeszcze raz, aby zapisać nową.');
        } else if (!(error instanceof SantaApiError && applyServerErrors(error))) {
          setFormError(error instanceof Error ? error.message : 'Nie udało się zapisać. Spróbuj ponownie.');
        }
      } finally {
        setSaving(false);
      }
    }
  };

  const addToCart = () => {
    if (!draft) return;
    addVoiceMessage({ mode, voiceDraftId: draft.id, voiceDraftKey: draft.key });
    trackSantaEvent('santa_creator_step_complete', { step: 3, purchase_mode: mode });
    trackSantaEvent('santa_creator_submit', { purchase_mode: mode });
    clearStoredDraft();
    setAdded(true);
  };

  return (
    <>
      <SEOHead
        title="Kreator wiadomości od Świętego Mikołaja | e-Advent"
        description="Opowiedz Mikołajowi o dziecku — przygotujemy osobistą wiadomość głosową."
        canonical="https://e-advent.pl/wiadomosc-od-mikolaja/kreator"
        robots="noindex, follow"
      />
      <PageBackground className="py-8 md:py-12 min-h-screen" showSnow overlayOpacity="medium">
        <div className="container mx-auto px-4 max-w-3xl">
          <Logo className="mb-6" />

          <div className="text-center text-white mb-6">
            <p className="text-christmas-gold text-xs tracking-[0.25em] uppercase mb-2">Wiadomość od Świętego Mikołaja</p>
            <h1 ref={headingRef} tabIndex={-1} className="font-display text-3xl md:text-4xl font-semibold text-christmas-gold-light focus:outline-none scroll-mt-24">
              {step === 1 && 'Dla kogo jest wiadomość?'}
              {step === 2 && (value.addressForm === 'siblings' ? 'Opowiedz Mikołajowi o rodzeństwie' : 'Opowiedz Mikołajowi o dziecku')}
              {step === 3 && 'Wszystko gotowe dla Mikołaja'}
            </h1>
            <p className="text-white/70 text-sm mt-2">
              {formatPrice(price)} {mode === 'letter_addon' ? '· cena dodatku do listu' : ''}
            </p>
          </div>

          <CreatorSteps labels={STEPS.map(s => s.label)} current={step - 1} />

          <ParchmentCard padding="lg">
            {step < 3 && (
              <form
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  void next();
                }}
              >
                <PersonalizationFields
                  step={step as 1 | 2}
                  value={value}
                  errors={errors}
                  onChange={(nextValue) => {
                    setValue(nextValue);
                    if (Object.keys(errors).length) setErrors({});
                  }}
                  vocativeTouched={vocativeTouched}
                  onVocativeTouched={() => setVocativeTouched(true)}
                />
                {formError && <p className="mt-4 text-sm text-christmas-red" role="alert">{formError}</p>}
                <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
                  {step === 2 ? (
                    <button type="button" onClick={() => setStep(1)} className="btn-outline-parchment px-5 py-2.5">
                      <i className="fas fa-arrow-left" aria-hidden="true" /> Wstecz
                    </button>
                  ) : (
                    <Link to="/wiadomosc-od-mikolaja" className="text-sm text-parchment-muted underline underline-offset-4">
                      O produkcie
                    </Link>
                  )}
                  <button type="submit" disabled={saving} className="btn-gold px-7 py-3">
                    {saving ? (
                      <><i className="fas fa-circle-notch fa-spin" aria-hidden="true" /> Mikołaj czyta…</>
                    ) : (
                      <>Dalej <i className="fas fa-arrow-right" aria-hidden="true" /></>
                    )}
                  </button>
                </div>
              </form>
            )}

            {step === 3 && preview && (
              <div>
                <p className="text-parchment-text leading-relaxed mb-5">
                  Na podstawie tych informacji Święty Mikołaj nagra osobistą wiadomość
                  (ok. {formatDuration(preview.estimatedSeconds)} min). Sprawdź jeszcze imię i jego formę — to one
                  zabrzmią w nagraniu.
                </p>
                <PersonalizationSummary value={value} />

                <ul className="mt-5 space-y-2 text-sm text-parchment-muted">
                  <li><i className="fas fa-microphone-alt text-christmas-gold mr-2" aria-hidden="true" />To nagranie przygotowywane automatycznie głosem Mikołaja — nie rozmowa na żywo.</li>
                  <li><i className="fas fa-envelope text-christmas-gold mr-2" aria-hidden="true" />Link do odsłuchu i pobrania MP3 wyślemy na adres e-mail podany w zamówieniu.</li>
                </ul>

                <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setStep(1)} className="btn-outline-parchment px-4 py-2.5 text-sm">Popraw dane odbiorców</button>
                    <button type="button" onClick={() => setStep(2)} className="btn-outline-parchment px-4 py-2.5 text-sm">Popraw opowieść</button>
                  </div>
                  {editingItem ? (
                    <button type="button" onClick={() => navigate('/koszyk')} className="btn-gold px-7 py-3">
                      <i className="fas fa-check" aria-hidden="true" /> Zapisz zmiany
                    </button>
                  ) : (
                    <button type="button" onClick={addToCart} className="btn-gold px-7 py-3">
                      <i className="fas fa-shopping-basket" aria-hidden="true" /> Dodaj do koszyka · {formatPrice(price)}
                    </button>
                  )}
                </div>
              </div>
            )}
          </ParchmentCard>
        </div>
      </PageBackground>
      <AddedToCartModal open={added} onContinue={() => setAdded(false)} onGoToCart={() => navigate('/koszyk')} />
    </>
  );
}
