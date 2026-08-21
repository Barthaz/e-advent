import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { OpenedCalendarWindow } from '@e-advent/types';
import { clearedFormProgress, resolveCardFormConfig } from '@e-advent/special-core';
import EngineRouter from './EngineRouter';
import { useSpecialProgress } from './useSpecialProgress';
import { exportSpecialPdf } from '../api/api';
import { specialCtaLabel, specialPrintableHint, specialResumeLabel } from './specialCta';
import { defaultPdfLayout, type PdfLayout } from './pdfLayout';
import { downloadBlob } from '../utils/downloadBlob';
import ambientPortrait from '@e-advent/assets/backgrounds/christmas-ambient-portrait.webp';
import { resolvePack } from './contentPacks';

interface SpecialWindowShellProps {
  calendarId: string;
  openedWindow: OpenedCalendarWindow;
  onClose?: () => void;
  /** Skip the task teaser and open the engine overlay immediately (email deep-link). */
  autoOpenStage?: boolean;
}

export default function SpecialWindowShell({
  calendarId,
  openedWindow,
  onClose,
  autoOpenStage = false,
}: SpecialWindowShellProps) {
  const [teaserVisible, setTeaserVisible] = useState(false);
  const [stageOpen, setStageOpen] = useState(autoOpenStage);
  const [pdfLayout, setPdfLayout] = useState<PdfLayout>(() =>
    defaultPdfLayout(openedWindow.special?.document?.templateId)
  );
  const descriptor = openedWindow.special;

  const { progress, updatePayload, saveState } = useSpecialProgress(
    calendarId,
    openedWindow.day,
    descriptor ?? null
  );

  useEffect(() => {
    if (autoOpenStage) return;
    const t = setTimeout(() => setTeaserVisible(true), 280);
    return () => clearTimeout(t);
  }, [autoOpenStage]);

  const closeStage = () => {
    setStageOpen(false);
    if (autoOpenStage) onClose?.();
  };

  useEffect(() => {
    if (!stageOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setStageOpen(false);
        if (autoOpenStage) onClose?.();
      }
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [stageOpen, autoOpenStage, onClose]);

  if (!descriptor) return null;

  const started = progress?.status === 'IN_PROGRESS' || progress?.status === 'COMPLETED';
  const cta = started ? specialResumeLabel(descriptor) : specialCtaLabel(descriptor);
  const printableHint = specialPrintableHint(descriptor);
  const canPrint = !!descriptor.capabilities?.canPrint && !!descriptor.document;
  const lockedPdfLayout: PdfLayout | null =
    descriptor.document?.templateId === 'then-now-v1' ? 'LANDSCAPE' : null;

  const openStage = () => {
    updatePayload({ started: true });
    setStageOpen(true);
  };

  const teaser = (
    <div
      className={`mt-4 flex flex-col items-center gap-2.5 transition-all duration-500 ${
        teaserVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
      }`}
    >
      <span className="inline-flex items-center gap-1.5 rounded-full border border-christmas-gold-light/50 bg-christmas-gold/15 px-3 py-1 text-[11px] font-semibold tracking-[0.14em] uppercase text-christmas-gold-light">
        Okienko specjalne
      </span>
      <p className="max-w-md text-sm md:text-base text-christmas-gold-light/90 font-display">
        {descriptor.headline}
      </p>
      <button type="button" className="btn-gold px-7 py-2.5 text-sm md:text-base" onClick={openStage}>
        {cta}
      </button>
    </div>
  );

  const stage = stageOpen
    ? createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 md:p-6">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${ambientPortrait})` }}
          />
          <div className="absolute inset-0 bg-[#04120e]/70 backdrop-blur-[2px]" />

          <article
            className="relative z-10 flex w-full max-w-2xl max-h-[92vh] flex-col overflow-hidden rounded-2xl border-2 border-christmas-gold/60 shadow-[0_20px_80px_rgba(0,0,0,0.45),inset_0_0_0_1px_rgba(244,208,63,0.15)]"
            style={{ background: 'linear-gradient(180deg, rgba(15,81,50,0.94) 0%, rgba(8,36,28,0.96) 100%)' }}
          >
            <header className="flex items-start justify-between gap-3 border-b border-christmas-gold/20 px-5 py-4 md:px-7">
              <div className="min-w-0 text-left">
                <p className="mb-1 text-[11px] font-semibold tracking-[0.16em] uppercase text-christmas-gold-light/80">
                  Dzień {openedWindow.day} · Okienko specjalne
                </p>
                <h3 className="font-display text-2xl md:text-3xl text-christmas-gold-light leading-tight">
                  {descriptor.headline}
                </h3>
                {descriptor.description && (
                  <p className="mt-1 text-sm text-white/70">{descriptor.description}</p>
                )}
                {printableHint && (
                  <p className="mt-2 text-sm leading-relaxed text-christmas-gold-light/80">
                    {printableHint}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={closeStage}
                className="shrink-0 rounded-full text-3xl leading-none text-white/70 hover:text-white px-2"
                aria-label="Zamknij dodatek"
              >
                ×
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-7 md:py-5">
              <EngineRouter
                descriptor={descriptor}
                progress={progress}
                onUpdate={updatePayload}
                calendarId={calendarId}
                day={openedWindow.day}
              />
            </div>

            <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-christmas-gold/20 px-5 py-3 md:px-7">
              <span className="text-xs text-white/45">
                {saveState === 'saving' && 'Zapisywanie…'}
                {saveState === 'saved' && 'Zapisano'}
                {saveState === 'idle' && 'Postęp zapisuje się automatycznie'}
                {saveState === 'error' && 'Zapis lokalny — spróbuj ponownie później'}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {canPrint && (
                  <>
                    {!lockedPdfLayout ? (
                    <div className="flex overflow-hidden rounded-lg border border-christmas-gold/40">
                      {(
                        [
                          ['PORTRAIT', 'Pion'],
                          ['LANDSCAPE', 'Poziom'],
                          ['SQUARE', 'Kwadrat'],
                        ] as const
                      ).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          className={`px-2.5 py-1.5 text-[11px] tracking-wide ${
                            pdfLayout === value
                              ? 'bg-christmas-gold/25 text-christmas-gold-light'
                              : 'text-white/55 hover:text-white/85'
                          }`}
                          aria-pressed={pdfLayout === value}
                          onClick={() => setPdfLayout(value)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    ) : null}
                    <button
                      type="button"
                      className="btn-gold px-4 py-2 text-sm"
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        try {
                          const blob = await exportSpecialPdf(
                            calendarId,
                            openedWindow.day,
                            'COLOR',
                            progress?.payload,
                            lockedPdfLayout || pdfLayout
                          );
                          const safeName = descriptor.headline.replace(/[<>:"/\\|?*]/g, '').trim() || 'okienko';
                          downloadBlob(blob, `e-Advent ${safeName}.pdf`);
                          const formConfig = resolveCardFormConfig(resolvePack(descriptor.contentKey));
                          if (formConfig.clearOnPrint) {
                            updatePayload(clearedFormProgress(formConfig));
                          }
                        } catch (err) {
                          const message =
                            err instanceof Error
                              ? err.message
                              : 'Nie udało się wygenerować PDF. Spróbuj ponownie.';
                          alert(message);
                        }
                      }}
                    >
                      Pobierz PDF
                    </button>
                  </>
                )}
              </div>
            </footer>
          </article>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      {!autoOpenStage && teaser}
      {stage}
    </>
  );
}
