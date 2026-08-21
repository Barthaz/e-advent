import React from 'react';
import type { SpecialEngineType, SpecialWindowDescriptor } from '@e-advent/types';
import type { SpecialWindowProgress } from '@e-advent/types';
import {
  bingoBoardStatus,
  composeLetterWish,
  emptyFormCard,
  formatQuizResult,
  formatRandomizerProgress,
  formatOptionSelections,
  nextUniqueDraw,
  nextTurnLetter,
  pickQuizSession,
  readFormCards,
  readQuizSession,
  resolveCardFormConfig,
  resolveQuizConfig,
  resolveRandomizerConfig,
  resolveOptionConfiguratorConfig,
  resolveTemplatePersonalizerConfig,
  resolveTurnBasedGameConfig,
  splitSetDraw,
  resolveImageCardConfig,
  photoSrc,
  resolveScoreHuntConfig,
  readScoreHouses,
  scoreHuntTotal,
  scoreHuntTitle,
} from '@e-advent/special-core';
import PromptTimer from './PromptTimer';
import { resolvePack } from './contentPacks';
import { uploadSpecialImage } from '../api/api';
import { blobToDataUrl, compressImageFile } from '../utils/compressImage';
import { isPreviewCalendarId } from './previewCalendar';

type EngineProps = {
  descriptor: SpecialWindowDescriptor;
  progress: SpecialWindowProgress | null;
  onUpdate: (patch: Record<string, unknown>) => void;
  calendarId: string;
  day: number;
};

function QuizEngine({ descriptor, progress, onUpdate }: EngineProps) {
  const pack = resolvePack(descriptor.contentKey);
  const config = resolveQuizConfig(pack);
  const session = readQuizSession(
    progress?.payload?.sessionQuestions,
    config.questions.slice(0, config.questionsPerSession)
  );
  const currentIndex = (progress?.payload?.currentIndex as number) ?? 0;
  const score = (progress?.payload?.score as number) ?? 0;
  const q = session[currentIndex];

  const replay = () => {
    onUpdate({
      currentIndex: 0,
      score: 0,
      lastFact: '',
      sessionQuestions: pickQuizSession(config.questions, config.questionsPerSession, `replay-${Date.now()}`),
      finished: true,
    });
  };

  if (!config.questions.length) {
    return <p className="p-4 text-center text-white/70">Brak pytań w konfiguracji</p>;
  }

  if (!q) {
    return (
      <div className="flex flex-col items-center gap-4 p-4 text-center">
        <p className="font-display text-2xl text-christmas-gold-light">
          {formatQuizResult(config.resultLabel, score, session.length)}
        </p>
        <button type="button" className="btn-gold px-7 py-2.5 text-sm md:text-base" onClick={replay}>
          {config.replayLabel}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-2">
      <p className="text-sm text-white/70">
        Pytanie {currentIndex + 1}/{session.length}
      </p>
      <p className="text-lg font-medium text-white">{q.text}</p>
      <div className="grid gap-2">
        {q.options.map((opt, i) => (
          <button
            key={opt}
            type="button"
            className="rounded-lg border border-christmas-gold/40 bg-white/10 px-4 py-2 text-left text-white hover:bg-white/20"
            onClick={() => {
              const nextIndex = currentIndex + 1;
              onUpdate({
                currentIndex: nextIndex,
                score: score + (i === q.correctIndex ? 1 : 0),
                lastFact: q.fact,
                sessionQuestions: session,
                finished: nextIndex >= session.length,
              });
            }}
          >
            {opt}
          </button>
        ))}
      </div>
      {progress?.payload?.lastFact ? (
        <p className="text-sm italic text-christmas-gold-light">{String(progress.payload.lastFact)}</p>
      ) : null}
    </div>
  );
}

function ChecklistEngine(props: EngineProps) {
  if (props.descriptor.variant === 'BINGO') {
    return <BingoEngine {...props} />;
  }
  if (props.descriptor.variant === 'SCORE') {
    return <ScoreHuntEngine {...props} />;
  }

  const { descriptor, progress, onUpdate } = props;
  const pack = resolvePack(descriptor.contentKey);
  const items = (progress?.payload?.items as string[]) || (pack?.items as string[]) || [];
  const checked = (progress?.payload?.checked as Record<string, boolean>) || {};

  return (
    <div className="space-y-2 max-h-[50vh] overflow-y-auto p-1">
      {items.map((item) => (
        <label key={item} className="flex items-center gap-3 text-white cursor-pointer">
          <input
            type="checkbox"
            checked={!!checked[item]}
            onChange={(e) => onUpdate({ items, checked: { ...checked, [item]: e.target.checked } })}
            className="h-5 w-5"
          />
          <span>{item}</span>
        </label>
      ))}
    </div>
  );
}

function ScoreHuntEngine({ descriptor, progress, onUpdate }: EngineProps) {
  const pack = resolvePack(descriptor.contentKey);
  const config = resolveScoreHuntConfig(pack);
  const houses = readScoreHouses(progress?.payload, config.houseCount);
  const total = scoreHuntTotal(houses);
  const rankTitle = scoreHuntTitle(config.titles, total);
  const points = Array.from({ length: config.maxPoints }, (_, i) => i + 1);

  const persist = (next: typeof houses) => onUpdate({ houses: next, started: true });

  return (
    <div className="space-y-4 p-2">
      {config.notes.map((note) => (
        <p key={note} className="text-sm leading-relaxed text-christmas-gold-light/90">
          {note}
        </p>
      ))}
      <div className="flex flex-wrap gap-2">
        {config.legend.map((item) => (
          <span
            key={`${item.points}-${item.label}`}
            className="rounded-full border border-christmas-gold/35 bg-christmas-gold/10 px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-christmas-gold-light"
          >
            {item.points} pkt · {item.label}
          </span>
        ))}
      </div>
      {houses.map((house, index) => (
        <div
          key={`house-${index}`}
          className="rounded-xl border border-christmas-gold/25 bg-black/15 px-3 py-3"
        >
          <div className="mb-2 flex items-center gap-3">
            <span className="font-display text-lg leading-none text-christmas-gold-light">{index + 1}</span>
            <input
              className="min-w-0 flex-1 rounded-lg border border-white/20 bg-white/10 p-2 text-white"
              value={house.name}
              placeholder={`${config.houseNoun} ${index + 1}`}
              onChange={(e) =>
                persist(houses.map((row, i) => (i === index ? { ...row, name: e.target.value } : row)))
              }
            />
          </div>
          <p className="mb-2 text-[11px] uppercase tracking-[0.12em] text-white/55">{config.pointsLabel}</p>
          <div className="flex flex-wrap gap-1.5">
            {points.map((n) => {
              const on = house.points === n;
              return (
                <button
                  key={n}
                  type="button"
                  aria-pressed={on}
                  className={`h-9 w-9 rounded-full border text-sm ${
                    on
                      ? 'border-christmas-gold bg-christmas-gold text-[#0f5132]'
                      : 'border-christmas-gold/35 bg-white/10 text-white hover:bg-white/16'
                  }`}
                  onClick={() =>
                    persist(
                      houses.map((row, i) =>
                        i === index ? { ...row, points: on ? 0 : n } : row
                      )
                    )
                  }
                >
                  {n}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div className="rounded-xl border border-christmas-gold/40 bg-christmas-gold/10 px-4 py-3 text-center">
        <p className="font-display text-2xl text-christmas-gold-light">{rankTitle}</p>
        <p className="mt-1 text-sm text-white/80">
          {config.totalLabel}: {total} pkt
        </p>
      </div>
    </div>
  );
}

function BingoEngine({ descriptor, progress, onUpdate }: EngineProps) {
  const pack = resolvePack(descriptor.contentKey);
  const size = Number(pack?.columns || pack?.rows || 3) || 3;
  const source = ((progress?.payload?.items as string[]) || (pack?.items as string[]) || []).slice(0, size * size);
  const items = [...source];
  while (items.length < size * size) items.push(`Pole ${items.length + 1}`);
  const checked = (progress?.payload?.checked as Record<string, boolean>) || {};
  const { hasLine, blackout } = bingoBoardStatus(items, checked, size);

  return (
    <div className="flex flex-col items-center gap-4 p-1">
      <p className="max-w-md text-center text-sm text-white/70">
        Zaznacz to, co udało Ci się znaleźć. Wystarczy jeden rząd — albo cała plansza, jeśli masz ochotę.
      </p>
      <div
        className="grid w-full max-w-[22rem] gap-2"
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const on = !!checked[item];
          return (
            <button
              key={item}
              type="button"
              aria-pressed={on}
              onClick={() => {
                const next = { ...checked, [item]: !on };
                const status = bingoBoardStatus(items, next, size);
                onUpdate({
                  items,
                  checked: next,
                  bingoLine: status.hasLine,
                  bingoFull: status.blackout,
                  started: true,
                });
              }}
              className={`aspect-square rounded-xl border-2 px-2 py-2 text-sm md:text-base font-display leading-snug transition-colors ${
                on
                  ? 'border-christmas-gold bg-christmas-gold/30 text-christmas-gold-light'
                  : 'border-christmas-gold/40 bg-white/10 text-white hover:bg-white/16'
              }`}
            >
              {on ? <span className="mb-0.5 block text-lg leading-none">✓</span> : null}
              {item}
            </button>
          );
        })}
      </div>
      {blackout ? (
        <p className="font-display text-lg text-christmas-gold-light">Pełna plansza — bingo kompletne!</p>
      ) : hasLine ? (
        <p className="font-display text-christmas-gold-light">
          Bingo! Masz rząd. Możesz skończyć albo zbierać dalej.
        </p>
      ) : null}
    </div>
  );
}

function CardFormEngine({ descriptor, progress, onUpdate }: EngineProps) {
  const pack = resolvePack(descriptor.contentKey);
  const config = resolveCardFormConfig(pack);
  const cards = readFormCards(progress?.payload, config);
  const isLetter = !!config.letterGreeting;
  const isRoster = config.entryLayout === 'roster';
  const showCardChrome = config.allowMultipleCards && !isRoster;
  const fieldCaption = (label: string) =>
    config.fieldsOptional && config.optionalLabel ? `${label} (${config.optionalLabel})` : label;

  const persist = (next: typeof cards) => {
    if (config.allowMultipleCards) {
      onUpdate({ cards: next, started: true });
      return;
    }
    onUpdate({ fields: next[0]?.fields || {}, name: next[0]?.name || '', started: true });
  };

  const updateCard = (index: number, patch: Partial<(typeof cards)[number]>) => {
    persist(cards.map((card, i) => (i === index ? { ...card, ...patch } : card)));
  };

  return (
    <div className="space-y-4 p-2">
      {config.notes.length ? (
        <div className="rounded-xl border border-christmas-gold/30 bg-christmas-gold/10 px-4 py-3 text-left">
          {config.notes.map((note) => (
            <p key={note} className="text-sm leading-relaxed text-christmas-gold-light/90">
              {note}
            </p>
          ))}
        </div>
      ) : null}

      {isLetter ? (
        <div className="rounded-xl border border-christmas-gold/30 bg-white/5 px-4 py-3 text-left">
          <p className="font-display text-2xl text-christmas-gold-light">{config.letterGreeting}</p>
          {config.letterIntro ? (
            <p className="mt-2 text-sm leading-relaxed text-white/75">{config.letterIntro}</p>
          ) : null}
        </div>
      ) : null}

      {cards.map((card, index) =>
        isRoster ? (
          <div
            key={`card-${index}`}
            className="flex flex-col gap-2 rounded-xl border border-christmas-gold/25 bg-black/15 px-3 py-3 sm:flex-row sm:items-end"
          >
            <span className="font-display text-lg leading-none text-christmas-gold-light sm:mb-2 sm:w-7">
              {index + 1}
            </span>
            {config.nameField ? (
              <div className="min-w-0 flex-1">
                <label className="mb-1 block text-xs uppercase tracking-[0.12em] text-white/55">
                  {config.nameField}
                </label>
                <input
                  className="w-full rounded-lg border border-white/20 bg-white/10 p-2 text-white"
                  value={card.name}
                  placeholder="np. Ania"
                  onChange={(e) => updateCard(index, { name: e.target.value })}
                />
              </div>
            ) : null}
            {config.fields.map((label) => (
              <div key={label} className="min-w-0 flex-[1.4]">
                <label className="mb-1 block text-xs uppercase tracking-[0.12em] text-white/55">
                  {fieldCaption(label)}
                </label>
                <input
                  className="w-full rounded-lg border border-white/20 bg-white/10 p-2 text-white"
                  value={card.fields[label] || ''}
                  placeholder="na co stawia"
                  onChange={(e) =>
                    updateCard(index, { fields: { ...card.fields, [label]: e.target.value } })
                  }
                />
              </div>
            ))}
            {cards.length > 1 ? (
              <button
                type="button"
                className="shrink-0 text-xs text-white/55 hover:text-white sm:mb-2"
                onClick={() => persist(cards.filter((_, i) => i !== index))}
              >
                {config.removeCardLabel}
              </button>
            ) : null}
          </div>
        ) : (
          <div
            key={`card-${index}`}
            className={
              showCardChrome
                ? 'space-y-3 rounded-xl border border-christmas-gold/25 bg-black/15 px-4 py-3'
                : 'space-y-3'
            }
          >
            {showCardChrome ? (
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-christmas-gold-light/80">
                  {config.cardNoun} {index + 1}
                </p>
                {config.allowMultipleCards && cards.length > 1 ? (
                  <button
                    type="button"
                    className="text-xs text-white/55 hover:text-white"
                    onClick={() => persist(cards.filter((_, i) => i !== index))}
                  >
                    {config.removeCardLabel}
                  </button>
                ) : null}
              </div>
            ) : null}

            {config.nameField ? (
              <div>
                <label className="mb-1 block text-sm text-white/80">{config.nameField}</label>
                <input
                  className="w-full rounded-lg border border-white/20 bg-white/10 p-2 text-white"
                  value={card.name}
                  onChange={(e) => updateCard(index, { name: e.target.value })}
                />
              </div>
            ) : null}

            {config.fields.map((label) => (
              <div key={label}>
                <label className="mb-1 block text-sm text-white/80">{fieldCaption(label)}</label>
                <textarea
                  className="min-h-[60px] w-full rounded-lg border border-white/20 bg-white/10 p-2 text-white"
                  value={card.fields[label] || ''}
                  onChange={(e) =>
                    updateCard(index, { fields: { ...card.fields, [label]: e.target.value } })
                  }
                />
              </div>
            ))}
          </div>
        )
      )}

      {config.allowMultipleCards && cards.length < config.maxCards ? (
        <button
          type="button"
          className="rounded-lg border border-christmas-gold/40 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/16"
          onClick={() => persist([...cards, emptyFormCard(config.fields)])}
        >
          {config.addCardLabel}
          <span className="ml-2 text-white/45">
            {cards.length}/{config.maxCards}
          </span>
        </button>
      ) : config.allowMultipleCards ? (
        <p className="text-xs text-white/45">Maksymalnie {config.maxCards} osób.</p>
      ) : null}

      {isLetter ? (
        <div className="space-y-2 rounded-xl border border-christmas-gold/20 bg-black/20 px-4 py-3 text-left">
          <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">Tak będzie wyglądał list</p>
          <p className="font-display text-xl text-christmas-gold-light">{config.letterGreeting}</p>
          {config.letterIntro ? (
            <p className="text-sm leading-relaxed text-white/75">{config.letterIntro}</p>
          ) : null}
          {config.fields.map((label, index) => {
            const value = String(cards[0]?.fields[label] || '').trim();
            const lead = String(config.letterLeads[index] || label).trim();
            const text = composeLetterWish(lead, value);
            return (
              <p key={label} className={`text-sm leading-relaxed ${value ? 'text-white/90' : 'text-white/40'}`}>
                {text}
              </p>
            );
          })}
          {config.letterOutro ? (
            <p className="text-sm italic text-christmas-gold-light/80">{config.letterOutro}</p>
          ) : null}
        </div>
      ) : config.letterOutro ? (
        <p className="text-sm italic text-christmas-gold-light/80">{config.letterOutro}</p>
      ) : null}
    </div>
  );
}

function pickOne<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function RandomizerTimerEngine({ descriptor, progress, onUpdate }: EngineProps) {
  const pack = resolvePack(descriptor.contentKey);
  const config = resolveRandomizerConfig(pack);
  const { pool, uniqueDraw, timerSeconds, successTarget, markGuessed, copy, nameField } = config;
  const isSetDraw = config.sets.length > 0;
  const current = typeof progress?.payload?.draw === 'string' ? progress.payload.draw : undefined;
  const used = (progress?.payload?.used as string[]) || [];
  const guessedCount = Number(progress?.payload?.guessedCount || 0);
  const recipient = String(progress?.payload?.name || '');
  const checked =
    progress?.payload?.checked && typeof progress.payload.checked === 'object'
      ? (progress.payload.checked as Record<string, boolean>)
      : {};
  const setItems = isSetDraw ? splitSetDraw(current) : [];
  const setComplete = setItems.length > 0 && setItems.every((item) => !!checked[item]);
  const won = progress?.payload?.won === true || (successTarget > 0 && guessedCount >= successTarget);
  const timerStartedAt =
    typeof progress?.payload?.timerStartedAt === 'string' ? progress.payload.timerStartedAt : undefined;
  const total = pool.length;
  const drawnCount = uniqueDraw ? used.length : current ? 1 : 0;
  const remaining = uniqueDraw ? Math.max(0, total - used.length) : 0;
  const exhausted = uniqueDraw && used.length > 0 && remaining === 0;
  const awaitingStart = !!copy.startLabel && !current && !won;
  const roundOver = won || exhausted;
  const showTimer = timerSeconds > 0 && !!current && !roundOver;
  const emptyPool = pool.length === 0;
  const showPromptCard = !awaitingStart && !isSetDraw;
  const showSuccess = (won || setComplete) && !!(copy.successTitle || copy.successLabel);

  const timerPatch = (now: string) =>
    timerSeconds > 0 ? { timerStartedAt: now, timerSeconds } : {};

  const applyDraw = (reset = false) => {
    if (emptyPool) return;
    const now = new Date().toISOString();
    if (uniqueDraw) {
      const next = nextUniqueDraw(pool, reset ? [] : used);
      if (!next.item) return;
      onUpdate({
        draw: next.item,
        used: next.used,
        guessedCount: reset ? 0 : guessedCount,
        won: false,
        checked: {},
        ...timerPatch(now),
        started: true,
      });
      return;
    }
    onUpdate({
      draw: pickOne(pool),
      guessedCount: reset ? 0 : guessedCount,
      won: false,
      checked: {},
      started: true,
      ...timerPatch(now),
    });
  };

  const restart = () => {
    if (copy.startLabel) {
      onUpdate({
        draw: null,
        used: [],
        guessedCount: 0,
        won: false,
        timerStartedAt: null,
        started: true,
      });
      return;
    }
    applyDraw(true);
  };

  const resolveRound = (guessed: boolean) => {
    const nextGuessed = guessed ? guessedCount + 1 : guessedCount;
    const reached = successTarget > 0 && nextGuessed >= successTarget;
    if (reached) {
      onUpdate({
        guessedCount: nextGuessed,
        won: true,
        started: true,
        timerStartedAt: null,
      });
      return;
    }
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = {
      guessedCount: nextGuessed,
      won: false,
      started: true,
    };
    if (uniqueDraw) {
      const next = nextUniqueDraw(pool, used);
      if (next.item) {
        patch.draw = next.item;
        patch.used = next.used;
        Object.assign(patch, timerPatch(now));
      }
    } else {
      patch.draw = pickOne(pool);
      Object.assign(patch, timerPatch(now));
    }
    onUpdate(patch);
  };

  const primaryLabel = awaitingStart
    ? copy.startLabel
    : roundOver
      ? copy.newRoundLabel
      : !current
        ? copy.drawLabel
        : copy.nextLabel;

  return (
    <div className="flex flex-col items-center gap-4 p-2 text-center">
      {copy.modeLabel ? (
        <span className="inline-flex rounded-full border border-christmas-gold/40 bg-christmas-gold/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-christmas-gold-light">
          {copy.modeLabel}
        </span>
      ) : null}
      {copy.hint ? <p className="max-w-md text-sm leading-relaxed text-white/70">{copy.hint}</p> : null}

      {nameField ? (
        <div className="w-full max-w-md text-left">
          <label className="mb-1 block text-sm text-white/80">{nameField}</label>
          <input
            className="w-full rounded-lg border border-white/20 bg-white/10 p-2 text-white"
            value={recipient}
            placeholder="np. Ania"
            onChange={(e) => onUpdate({ name: e.target.value })}
          />
        </div>
      ) : null}

      {successTarget > 0 ? (
        <div className="flex flex-col items-center gap-1">
          <div
            className="flex gap-2"
            aria-label={`Odgadnięte ${Math.min(guessedCount, successTarget)} z ${successTarget}`}
          >
            {Array.from({ length: successTarget }, (_, i) => (
              <span
                key={i}
                className={`h-3 w-3 rounded-full ${
                  i < guessedCount
                    ? 'bg-christmas-gold-light'
                    : 'border border-christmas-gold/50 bg-transparent'
                }`}
              />
            ))}
          </div>
          <p className="text-xs tabular-nums text-christmas-gold-light/80">
            Odgadnięte {Math.min(guessedCount, successTarget)}/{successTarget}
          </p>
        </div>
      ) : null}

      {showSuccess ? (
        <div className="w-full max-w-md rounded-xl border border-christmas-gold/50 bg-christmas-gold/15 px-4 py-3">
          {copy.successTitle ? (
            <p className="font-display text-xl text-christmas-gold-light">{copy.successTitle}</p>
          ) : null}
          {copy.successLabel ? <p className="mt-1 text-sm text-white/80">{copy.successLabel}</p> : null}
        </div>
      ) : null}

      {uniqueDraw && total > 0 && !awaitingStart ? (
        <p className="text-sm tabular-nums tracking-wide text-christmas-gold-light/80">
          {formatRandomizerProgress(copy.itemNoun, drawnCount, total)}
        </p>
      ) : null}

      {showTimer ? (
        <PromptTimer
          startedAt={timerStartedAt}
          duration={timerSeconds}
          runningLabel={copy.timerLabel}
          doneLabel={copy.timerDoneLabel}
        />
      ) : null}

      {showPromptCard ? (
        <div className="flex min-h-[7.5rem] w-full max-w-md items-center justify-center rounded-2xl border-2 border-christmas-gold/45 bg-black/20 px-5 py-6 shadow-[inset_0_0_0_1px_rgba(244,208,63,0.08)]">
          <p className="font-display text-2xl leading-snug text-christmas-gold-light md:text-3xl">
            {emptyPool ? 'Brak haseł w konfiguracji' : current || copy.emptyLabel}
          </p>
        </div>
      ) : null}

      {isSetDraw && !awaitingStart ? (
        <div className="w-full max-w-md space-y-2 text-left">
          {setItems.length ? (
            setItems.map((item) => (
              <label
                key={item}
                className="flex items-start gap-3 rounded-xl border border-christmas-gold/25 bg-black/15 px-3 py-3 text-white"
              >
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={!!checked[item]}
                  onChange={() => onUpdate({ checked: { ...checked, [item]: !checked[item] } })}
                />
                <span className={checked[item] ? 'text-white/55 line-through' : ''}>{item}</span>
              </label>
            ))
          ) : (
            <p className="rounded-xl border border-christmas-gold/25 bg-black/15 px-4 py-6 text-center text-sm text-white/65">
              {copy.emptyLabel}
            </p>
          )}
        </div>
      ) : null}

      {exhausted && !won ? <p className="text-sm text-white/65">{copy.exhaustedLabel}</p> : null}

      {emptyPool ? null : awaitingStart || roundOver || !markGuessed || !current ? (
        <button
          type="button"
          className="btn-gold px-7 py-2.5 text-sm md:text-base"
          onClick={() => (roundOver ? restart() : applyDraw(exhausted))}
        >
          {primaryLabel}
        </button>
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            className="btn-gold px-7 py-2.5 text-sm md:text-base"
            onClick={() => resolveRound(true)}
          >
            {copy.guessedLabel}
          </button>
          <button
            type="button"
            className="rounded-lg border border-christmas-gold/40 bg-white/10 px-7 py-2.5 text-sm text-white md:text-base hover:bg-white/16"
            onClick={() => resolveRound(false)}
          >
            {copy.skipLabel}
          </button>
        </div>
      )}
    </div>
  );
}

function PlannerEngine({ descriptor, progress, onUpdate }: EngineProps) {
  const pack = resolvePack(descriptor.contentKey);
  const columns = (pack?.columns as string[]) || ['Osoba', 'Pomysł', 'Budżet'];
  const rows = (progress?.payload?.rows as string[][]) || [['', '', '']];

  return (
    <div className="overflow-x-auto p-2">
      <table className="w-full text-sm text-white">
        <thead>
          <tr>{columns.map((c) => <th key={c} className="p-1 text-left">{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {columns.map((_, ci) => (
                <td key={ci} className="p-1">
                  <input
                    className="w-full rounded bg-white/10 border border-white/20 p-1"
                    value={row[ci] || ''}
                    onChange={(e) => {
                      const next = rows.map((r) => [...r]);
                      next[ri][ci] = e.target.value;
                      onUpdate({ rows: next, columns });
                    }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type="button"
        className="btn-secondary mt-2 text-sm"
        onClick={() => onUpdate({ rows: [...rows, columns.map(() => '')], columns })}
      >
        + Dodaj wiersz
      </button>
    </div>
  );
}

function ScorecardEngine({ descriptor, progress, onUpdate }: EngineProps) {
  const pack = resolvePack(descriptor.contentKey);
  const samples = (pack?.samples as string[]) || ['Próbka 1', 'Próbka 2'];
  const scores = (progress?.payload?.scores as Record<string, number>) || {};

  return (
    <div className="space-y-3 p-2">
      {samples.map((name) => (
        <div key={name} className="flex items-center justify-between gap-2 text-white">
          <span>{name}</span>
          <select
            className="rounded bg-white/10 border border-white/20 p-1"
            value={scores[name] ?? ''}
            onChange={(e) => onUpdate({ scores: { ...scores, [name]: Number(e.target.value) } })}
          >
            <option value="">—</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}

function SortableListEngine({ descriptor, progress, onUpdate }: EngineProps) {
  const pack = resolvePack(descriptor.contentKey, descriptor.document?.templateId);
  const starter = Array.isArray(pack?.items)
    ? (pack.items as string[]).map((item) => String(item ?? ''))
    : ['', '', '', '', ''];
  const items = (progress?.payload?.items as string[]) || starter;
  const notes = Array.isArray(pack?.notes) ? (pack.notes as string[]) : [];

  return (
    <div className="space-y-2 p-2">
      {notes.map((note) => (
        <p key={note} className="text-sm text-christmas-gold-light/90">
          {note}
        </p>
      ))}
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <span className="text-christmas-gold-light w-6">{i + 1}.</span>
          <input
            className="flex-1 rounded bg-white/10 border border-white/20 p-2 text-white"
            placeholder={`Pozycja ${i + 1}`}
            value={item}
            onChange={(e) => {
              const next = [...items];
              next[i] = e.target.value;
              onUpdate({ items: next, started: true });
            }}
          />
        </div>
      ))}
    </div>
  );
}

function RecipeEngine({ descriptor, progress, onUpdate }: EngineProps) {
  const pack = resolvePack(descriptor.contentKey);
  const title = String(pack?.title || descriptor.headline);
  const steps = (pack?.steps as string[]) || [];

  return (
    <div className="p-2 text-white space-y-2">
      <h4 className="font-bold text-christmas-gold-light">{title}</h4>
      <ul className="list-disc pl-5 text-sm">
        {steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
      <label className="flex items-center gap-2 mt-4">
        <input type="checkbox" onChange={(e) => onUpdate({ recipeDone: e.target.checked, started: true })} />
        Przepis wykonany
      </label>
    </div>
  );
}

function DocumentEngine({ descriptor, progress, onUpdate }: EngineProps) {
  const pack = resolvePack(descriptor.contentKey, descriptor.document?.templateId);
  const steps = Array.isArray(pack?.steps) ? (pack.steps as string[]) : [];
  const notes = Array.isArray(pack?.notes) ? (pack.notes as string[]) : [];
  const printHint = typeof pack?.printHint === 'string' ? pack.printHint : '';

  React.useEffect(() => {
    if (!progress?.payload?.started) {
      onUpdate({ started: true });
    }
  }, []);

  return (
    <div className="space-y-3 p-4 text-center text-white">
      <p>{descriptor.description || String(pack?.intro || 'Materiał do pobrania i wydruku')}</p>
      {notes.map((note) => (
        <p key={note} className="text-sm text-christmas-gold-light/85">
          {note}
        </p>
      ))}
      {steps.length ? (
        <ol className="list-decimal space-y-1 pl-5 text-left text-sm text-white/85">
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      ) : null}
      {printHint ? <p className="text-xs text-white/50">{printHint}</p> : null}
      <p className="text-xs text-white/50">Układ i PDF znajdziesz na dole karty.</p>
    </div>
  );
}

function OptionConfiguratorEngine({ descriptor, progress, onUpdate }: EngineProps) {
  const pack = resolvePack(descriptor.contentKey);
  const config = resolveOptionConfiguratorConfig(pack);
  const selections = (progress?.payload?.selections as Record<string, unknown>) || {};

  const setSelection = (sectionId: string, value: string | string[]) => {
    const next = { ...selections, [sectionId]: value };
    onUpdate({
      selections: next,
      result: formatOptionSelections(config, next),
      started: true,
    });
  };

  if (!config.sections.length) {
    return <p className="p-4 text-center text-white/70">Brak opcji w konfiguracji</p>;
  }

  const summary = formatOptionSelections(config, selections);

  return (
    <div className="space-y-4 p-2 text-white">
      {config.notes.map((note) => (
        <p key={note} className="text-sm text-christmas-gold-light/90">
          {note}
        </p>
      ))}
      {config.sections.map((section) => {
        const current = selections[section.id];
        const selected = Array.isArray(current)
          ? current.map(String)
          : current
            ? [String(current)]
            : [];
        return (
          <div key={section.id} className="space-y-2">
            <p className="text-sm font-medium text-christmas-gold-light">{section.label}</p>
            <div className="flex flex-wrap gap-2">
              {section.options.map((option) => {
                const active = selected.includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    className={`rounded-lg border px-3 py-1.5 text-sm ${
                      active
                        ? 'border-christmas-gold bg-christmas-gold/25 text-christmas-gold-light'
                        : 'border-white/20 bg-white/5 text-white/85 hover:bg-white/10'
                    }`}
                    onClick={() => {
                      if (section.multi) {
                        setSelection(
                          section.id,
                          active ? selected.filter((item) => item !== option) : [...selected, option]
                        );
                      } else {
                        setSelection(section.id, option);
                      }
                    }}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      {summary.length ? (
        <div className="rounded-xl border border-christmas-gold/30 bg-white/5 px-4 py-3 text-left">
          <p className="mb-1 text-xs uppercase tracking-wide text-christmas-gold-light/70">
            {config.resultLabel}
          </p>
          {summary.map((line) => (
            <p key={line} className="text-sm text-white/90">
              {line}
            </p>
          ))}
        </div>
      ) : (
        <p className="text-sm text-white/50">{config.emptyLabel}</p>
      )}
    </div>
  );
}

function TemplatePersonalizerEngine({ descriptor, progress, onUpdate }: EngineProps) {
  const pack = resolvePack(descriptor.contentKey, descriptor.document?.templateId);
  const config = resolveTemplatePersonalizerConfig(pack);
  const fields =
    (progress?.payload?.fields as Record<string, string>) ||
    Object.fromEntries(config.fields.map((label) => [label, '']));
  const theme = String(progress?.payload?.theme || '');

  return (
    <div className="space-y-4 p-2 text-white">
      {config.notes.map((note) => (
        <p key={note} className="text-sm text-christmas-gold-light/90">
          {note}
        </p>
      ))}
      {config.themeOptions.length ? (
        <div>
          <label className="mb-1 block text-sm text-white/80">{config.themeLabel}</label>
          <div className="flex flex-wrap gap-2">
            {config.themeOptions.map((option) => (
              <button
                key={option}
                type="button"
                className={`rounded-lg border px-3 py-1.5 text-sm ${
                  theme === option
                    ? 'border-christmas-gold bg-christmas-gold/25 text-christmas-gold-light'
                    : 'border-white/20 bg-white/5'
                }`}
                onClick={() => onUpdate({ fields, theme: option, started: true })}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {config.fields.map((label) => (
        <div key={label}>
          <label className="mb-1 block text-sm text-white/80">{label}</label>
          <input
            className="w-full rounded-lg border border-white/20 bg-white/10 p-2 text-white"
            value={fields[label] || ''}
            onChange={(e) =>
              onUpdate({ fields: { ...fields, [label]: e.target.value }, theme, started: true })
            }
          />
        </div>
      ))}
      <p className="text-xs text-white/50">{config.previewLabel} — PDF na dole karty.</p>
    </div>
  );
}

function TurnBasedGameEngine({ descriptor, progress, onUpdate }: EngineProps) {
  const pack = resolvePack(descriptor.contentKey);
  const config = resolveTurnBasedGameConfig(pack);
  const letterIndex = Number(progress?.payload?.letterIndex ?? 0) || 0;
  const scores =
    (progress?.payload?.scores as Record<string, number>) ||
    Object.fromEntries(config.playerNames.map((name) => [name, 0]));
  const currentPlayer = Number(progress?.payload?.currentPlayer ?? 0) || 0;
  const roundFinished = progress?.payload?.roundFinished === true;
  const timerStartedAt = String(progress?.payload?.timerStartedAt || '');
  const current = nextTurnLetter(config.letters, letterIndex);

  const startRound = () => {
    onUpdate({
      started: true,
      letterIndex: 0,
      currentPlayer: 0,
      scores: Object.fromEntries(config.playerNames.map((name) => [name, 0])),
      roundFinished: false,
      timerStartedAt: new Date().toISOString(),
    });
  };

  const resolveTurn = (scored: boolean) => {
    const playerName = config.playerNames[currentPlayer % config.playerNames.length];
    const nextScores = {
      ...scores,
      [playerName]: (scores[playerName] || 0) + (scored ? 1 : 0),
    };
    const next = nextTurnLetter(config.letters, letterIndex + 1);
    if (next.finished) {
      onUpdate({
        scores: nextScores,
        letterIndex: config.letters.length,
        roundFinished: true,
        finished: true,
        timerStartedAt: '',
      });
      return;
    }
    onUpdate({
      scores: nextScores,
      letterIndex: letterIndex + 1,
      currentPlayer: (currentPlayer + 1) % config.playerNames.length,
      timerStartedAt: new Date().toISOString(),
    });
  };

  if (!progress?.payload?.started && !roundFinished) {
    return (
      <div className="space-y-4 p-4 text-center text-white">
        {config.notes.map((note) => (
          <p key={note} className="text-sm text-christmas-gold-light/90">
            {note}
          </p>
        ))}
        <button type="button" className="btn-gold px-7 py-2.5" onClick={startRound}>
          {config.ctaLabel}
        </button>
      </div>
    );
  }

  if (roundFinished || current.finished) {
    return (
      <div className="space-y-4 p-4 text-center text-white">
        <p className="font-display text-2xl text-christmas-gold-light">{config.finishLabel}</p>
        {config.playerNames.map((name) => (
          <p key={name}>
            {name}: {scores[name] || 0}
          </p>
        ))}
        <button type="button" className="btn-gold px-7 py-2.5" onClick={startRound}>
          {config.replayLabel}
        </button>
      </div>
    );
  }

  const playerName = config.playerNames[currentPlayer % config.playerNames.length];

  return (
    <div className="space-y-4 p-4 text-center text-white">
      <p className="text-sm text-white/70">
        {playerName} · litera {letterIndex + 1}/{config.letters.length}
      </p>
      <p className="font-display text-6xl text-christmas-gold-light">{current.letter}</p>
      {timerStartedAt ? (
        <PromptTimer startedAt={timerStartedAt} duration={config.timerSeconds} />
      ) : null}
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" className="btn-gold px-5 py-2" onClick={() => resolveTurn(true)}>
          {config.scoredLabel}
        </button>
        <button
          type="button"
          className="rounded-lg border border-white/30 px-5 py-2 text-white/85"
          onClick={() => resolveTurn(false)}
        >
          {config.missLabel}
        </button>
      </div>
    </div>
  );
}

function ImageCardEngine({ descriptor, progress, onUpdate, calendarId, day }: EngineProps) {
  const pack = resolvePack(descriptor.contentKey, descriptor.document?.templateId);
  const config = resolveImageCardConfig(pack);
  const photos = (progress?.payload?.photos as Record<string, unknown>) || {};
  const caption = String(progress?.payload?.caption || '');
  const [busySlot, setBusySlot] = React.useState<string | null>(null);
  const [error, setError] = React.useState('');

  const pickPhoto = async (slotId: string, file: File | undefined) => {
    if (!file) return;
    setBusySlot(slotId);
    setError('');
    try {
      const blob = await compressImageFile(file);
      if (isPreviewCalendarId(calendarId)) {
        const dataUrl = await blobToDataUrl(blob);
        onUpdate({ photos: { ...photos, [slotId]: { dataUrl } }, started: true });
        return;
      }
      const uploaded = await uploadSpecialImage(calendarId, day, slotId, blob, `${slotId}.jpg`);
      onUpdate({
        photos: { ...photos, [slotId]: { url: uploaded.imageUrl, key: uploaded.imageKey } },
        started: true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się dodać zdjęcia.');
    } finally {
      setBusySlot(null);
    }
  };

  return (
    <div className="space-y-4 p-2">
      {config.notes.map((note) => (
        <p key={note} className="text-sm leading-relaxed text-christmas-gold-light/90">
          {note}
        </p>
      ))}
      <p className="text-xs text-white/55">{config.formatsHint}</p>

      <div className={`grid gap-3 ${config.slots.length > 1 ? 'md:grid-cols-2' : ''}`}>
        {config.slots.map((slot) => {
          const src = photoSrc(photos, slot.id);
          return (
            <label
              key={slot.id}
              className="flex cursor-pointer flex-col overflow-hidden rounded-2xl border-2 border-christmas-gold/40 bg-black/20"
            >
              <span className="px-3 pt-3 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-christmas-gold-light">
                {slot.label}
              </span>
              <span className="relative mx-3 mt-2 mb-3 flex min-h-[180px] items-center justify-center overflow-hidden rounded-xl border border-christmas-gold/30 bg-black/25">
                {src ? (
                  <img src={src} alt={slot.label} className="h-full max-h-64 w-full object-cover" />
                ) : (
                  <span className="px-4 text-center text-sm text-white/55">
                    {busySlot === slot.id ? 'Wysyłam zdjęcie…' : 'Kliknij i wczytaj JPG, PNG, WEBP lub GIF'}
                  </span>
                )}
              </span>
              <input
                type="file"
                accept={config.accept}
                className="sr-only"
                disabled={busySlot === slot.id}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  void pickPhoto(slot.id, file);
                }}
              />
            </label>
          );
        })}
      </div>

      {config.captionField ? (
        <div>
          <label className="mb-1 block text-sm text-white/80">{config.captionField}</label>
          <input
            className="w-full rounded-lg border border-white/20 bg-white/10 p-2 text-white"
            value={caption}
            placeholder="np. grudzień 2016 i grudzień 2026"
            onChange={(e) => onUpdate({ caption: e.target.value, started: true })}
          />
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-200">{error}</p> : null}
    </div>
  );
}

function GenericEngine({ descriptor, onUpdate }: EngineProps) {
  return (
    <div className="p-4 text-white text-center">
      <p className="mb-4">{descriptor.description || 'Rozpocznij interaktywny dodatek'}</p>
      <button type="button" className="btn-primary" onClick={() => onUpdate({ started: true })}>
        Rozpocznij
      </button>
    </div>
  );
}

const ENGINE_MAP: Partial<Record<SpecialEngineType, React.ComponentType<EngineProps>>> = {
  QUIZ: QuizEngine,
  CHECKLIST: ChecklistEngine,
  CARD_FORM: CardFormEngine,
  RANDOMIZER_TIMER: RandomizerTimerEngine,
  PLANNER: PlannerEngine,
  MONTH_PLANNER: PlannerEngine,
  SCORECARD: ScorecardEngine,
  SORTABLE_LIST: SortableListEngine,
  RECIPE: RecipeEngine,
  DOCUMENT: DocumentEngine,
  IMAGE_CARD: ImageCardEngine,
  OPTION_CONFIGURATOR: OptionConfiguratorEngine,
  TURN_BASED_GAME: TurnBasedGameEngine,
  TEMPLATE_PERSONALIZER: TemplatePersonalizerEngine,
};

export default function EngineRouter(props: EngineProps) {
  const Component = ENGINE_MAP[props.descriptor.engine] || GenericEngine;
  return <Component {...props} />;
}
