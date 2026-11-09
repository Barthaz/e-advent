import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PageBackground from '../../components/PageBackground';
import ParchmentCard from '../../components/ParchmentCard';
import SEOHead from '../../components/SEOHead';
import Logo from '../../components/Logo';
import { trackSantaEvent } from '../../utils/analytics';
import PersonalizationFields from '../../santa-message/PersonalizationFields';
import { approveActivation, getActivation, SantaApiError, submitActivation, type ActivationView } from '../../santa-message/api';
import {
  EMPTY_PERSONALIZATION,
  errorMessage,
  normalizePersonalization,
  STEP_FIELDS,
  validateFields,
  type FieldErrors,
  type FieldName,
  type Personalization,
} from '../../santa-message/validation';

const IN_PROGRESS = ['TTS_QUEUED', 'TTS_PROCESSING', 'AUDIO_READY', 'NEEDS_ATTENTION'];

export default function VoiceMessagePersonalize() {
  const { token = '' } = useParams();
  const [view, setView] = useState<ActivationView | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [value, setValue] = useState<Personalization>(EMPTY_PERSONALIZATION);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    let alive = true;
    getActivation(token)
      .then((loaded) => {
        if (!alive) return;
        setView(loaded);
        setValue({ ...EMPTY_PERSONALIZATION, ...(loaded.personalization ?? {}) });
        setEditing(loaded.status === 'AWAITING_PERSONALIZATION');
      })
      .catch((error) => alive && setLoadError(error instanceof SantaApiError ? error.message : 'Nie udało się wczytać zamówienia.'));
    return () => {
      alive = false;
    };
  }, [token]);

  useEffect(() => {
    if (!editing || !view || startedRef.current) return;
    startedRef.current = true;
    trackSantaEvent('santa_creator_start', { purchase_mode: view.mode });
  }, [editing, view]);

  const submit = async () => {
    if (!view) return;
    const found = validateFields(value, STEP_FIELDS[step]);
    setErrors(found);
    if (Object.keys(found).length) {
      for (const field of Object.keys(found)) trackSantaEvent('santa_creator_validation_error', { field_name: field, error_type: 'client' });
      return;
    }
    trackSantaEvent('santa_creator_step_complete', { step, purchase_mode: view.mode });
    if (step === 1) {
      setStep(2);
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      const updated = await submitActivation(token, normalizePersonalization(value));
      trackSantaEvent('santa_creator_submit', { purchase_mode: view.mode });
      setView(updated);
      setEditing(false);
      setStep(1);
    } catch (error) {
      if (error instanceof SantaApiError && error.fieldErrors.length) {
        const mapped: FieldErrors = {};
        for (const fe of error.fieldErrors) {
          if (fe.field in EMPTY_PERSONALIZATION) mapped[fe.field as FieldName] = errorMessage(fe.code, fe);
        }
        setErrors(mapped);
        setStep(Object.keys(mapped).some((f) => STEP_FIELDS[1].includes(f as FieldName)) ? 1 : 2);
        setActionError(error.fieldErrors.some((fe) => fe.field === 'script') ? 'Wiadomość wyszła za długa — skróć któreś z pól.' : null);
      } else {
        setActionError(error instanceof Error ? error.message : 'Nie udało się zapisać.');
      }
    } finally {
      setBusy(false);
    }
  };

  const approve = async () => {
    if (!view) return;
    setBusy(true);
    setActionError(null);
    try {
      const updated = await approveActivation(token);
      trackSantaEvent('santa_script_approved', { purchase_mode: view.mode });
      setView(updated);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Nie udało się zatwierdzić.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <SEOHead
        title="Personalizacja wiadomości od Świętego Mikołaja | e-Advent"
        description="Uzupełnij personalizację wiadomości od Świętego Mikołaja."
        canonical="https://e-advent.pl/wiadomosc-od-mikolaja"
        robots="noindex, nofollow"
      />
      <PageBackground className="py-8 md:py-12 min-h-screen" showSnow overlayOpacity="medium">
        <div className="container mx-auto px-4 max-w-3xl">
          <Logo className="mb-6" />

          {!view && !loadError && (
            <p className="text-center text-white/80 py-20" role="status">
              <i className="fas fa-snowflake fa-spin mr-2" aria-hidden="true" /> Wczytywanie…
            </p>
          )}

          {loadError && (
            <ParchmentCard padding="lg" className="text-center">
              <h1 className="font-display text-3xl text-parchment-text mb-3">Link nie działa</h1>
              <p className="text-parchment-muted mb-6">{loadError} Jeśli potrzebujesz pomocy, napisz: kontakt@e-advent.pl.</p>
              <Link to="/" className="btn-gold px-6 py-3">Strona główna</Link>
            </ParchmentCard>
          )}

          {view && (
            <>
              <div className="text-center text-white mb-6">
                <p className="text-christmas-gold text-xs tracking-[0.25em] uppercase mb-2">
                  Wiadomość od Świętego Mikołaja{view.orderNumber ? ` · zamówienie ${view.orderNumber}` : ''}
                </p>
                <h1 className="font-display text-3xl md:text-4xl font-semibold text-christmas-gold-light">
                  {editing && 'Opowiedz Mikołajowi o dziecku'}
                  {!editing && view.status === 'SCRIPT_READY' && 'Sprawdź tekst wiadomości'}
                  {!editing && IN_PROGRESS.includes(view.status) && 'Mikołaj nagrywa wiadomość'}
                  {!editing && view.status === 'DELIVERED' && 'Wiadomość jest gotowa!'}
                </h1>
              </div>

              <ParchmentCard padding="lg">
                {editing && (
                  <form noValidate onSubmit={(e) => { e.preventDefault(); void submit(); }}>
                    <p className="text-xs text-parchment-muted mb-4">Krok {step} z 2</p>
                    <PersonalizationFields
                      step={step}
                      value={value}
                      errors={errors}
                      onChange={(next) => { setValue(next); if (Object.keys(errors).length) setErrors({}); }}
                      vocativeTouched={Boolean(view.personalization)}
                    />
                    {actionError && <p className="mt-4 text-sm text-christmas-red" role="alert">{actionError}</p>}
                    <div className="mt-8 flex flex-wrap justify-between gap-3">
                      {step === 2 ? (
                        <button type="button" onClick={() => setStep(1)} className="btn-outline-parchment px-5 py-2.5">
                          <i className="fas fa-arrow-left" aria-hidden="true" /> Wstecz
                        </button>
                      ) : view.status === 'SCRIPT_READY' ? (
                        <button type="button" onClick={() => setEditing(false)} className="btn-outline-parchment px-5 py-2.5">Anuluj</button>
                      ) : <span />}
                      <button type="submit" disabled={busy} className="btn-gold px-7 py-3">
                        {busy ? <><i className="fas fa-circle-notch fa-spin" aria-hidden="true" /> Zapisywanie…</> : step === 1 ? 'Dalej' : 'Przygotuj tekst'}
                      </button>
                    </div>
                  </form>
                )}

                {!editing && view.status === 'SCRIPT_READY' && view.script && (
                  <div>
                    <p className="text-sm text-parchment-muted mb-3">
                      Przeczytaj tekst. Po zatwierdzeniu Święty Mikołaj nagra wiadomość (ok. {Math.ceil(view.script.estimatedSeconds / 10) * 10} s),
                      a link wyślemy na {view.email || 'adres z zamówienia'}.
                    </p>
                    <div className="rounded-2xl border border-christmas-gold/40 bg-[#fffaf0] p-5 text-parchment-text leading-relaxed whitespace-pre-line max-h-[28rem] overflow-y-auto">
                      {view.script.text}
                    </div>
                    {actionError && <p className="mt-4 text-sm text-christmas-red" role="alert">{actionError}</p>}
                    <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                      {view.canEdit ? (
                        <button type="button" onClick={() => { setEditing(true); setStep(1); }} className="btn-outline-parchment px-5 py-2.5">
                          Popraw dane {view.remainingEdits <= 1 ? '(ostatnia poprawka)' : ''}
                        </button>
                      ) : <span className="text-xs text-parchment-muted">Limit poprawek wykorzystany.</span>}
                      <button type="button" onClick={() => void approve()} disabled={busy} className="btn-gold px-7 py-3">
                        {busy ? <><i className="fas fa-circle-notch fa-spin" aria-hidden="true" /> Mikołaj nagrywa…</> : <><i className="fas fa-check" aria-hidden="true" /> Akceptuję i przygotuj nagranie</>}
                      </button>
                    </div>
                  </div>
                )}

                {!editing && IN_PROGRESS.includes(view.status) && (
                  <div className="text-center py-6">
                    <div className="icon-circle-lg mx-auto mb-4"><i className="fas fa-microphone-alt text-parchment-text" aria-hidden="true" /></div>
                    <p className="text-parchment-text leading-relaxed">
                      Dziękujemy! Tekst jest zatwierdzony, a Święty Mikołaj przygotowuje nagranie.
                      Link do odsłuchu wyślemy na <strong>{view.email || 'adres z zamówienia'}</strong> — zwykle w ciągu 24 godzin.
                    </p>
                  </div>
                )}

                {!editing && view.status === 'DELIVERED' && (
                  <div className="text-center py-6">
                    <p className="text-parchment-text leading-relaxed">
                      Nagranie zostało wysłane na <strong>{view.email || 'adres z zamówienia'}</strong>. Sprawdź skrzynkę (także folder spam).
                    </p>
                  </div>
                )}
              </ParchmentCard>
            </>
          )}
        </div>
      </PageBackground>
    </>
  );
}
