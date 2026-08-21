import React from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { SpecialEngineType, SpecialWindowDescriptor, SpecialWindowProgress } from '@e-advent/types';
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
import { calendarTheme } from '../components/calendar/calendarTheme';
import * as ImagePicker from 'expo-image-picker';
import PromptTimer from './PromptTimer';
import { resolvePack } from './contentPacks';
import { uploadSpecialImage } from '../api/api';

type EngineProps = {
  descriptor: SpecialWindowDescriptor;
  progress: SpecialWindowProgress | null;
  onUpdate: (patch: Record<string, unknown>) => void;
  calendarId?: string;
  day?: number;
};

function pickOne<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

const goldBtn = {
  backgroundColor: calendarTheme.gold,
  borderRadius: 10,
  paddingVertical: 12,
  paddingHorizontal: 20,
  alignItems: 'center' as const,
};
const goldBtnText = { color: '#0f5132', fontWeight: '700' as const, fontSize: 16 };
const field = {
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.2)',
  borderRadius: 10,
  padding: 10,
  color: '#fff',
  minHeight: 56,
  textAlignVertical: 'top' as const,
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
      sessionQuestions: pickQuizSession(
        config.questions,
        config.questionsPerSession,
        `replay-${Date.now()}`
      ),
      finished: true,
    });
  };

  if (!config.questions.length) {
    return <Text style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>Brak pytań w konfiguracji</Text>;
  }

  if (!q) {
    return (
      <View style={{ alignItems: 'center', gap: 16 }}>
        <Text style={{ color: calendarTheme.goldBright, fontSize: 22, textAlign: 'center', fontWeight: '700' }}>
          {formatQuizResult(config.resultLabel, score, session.length)}
        </Text>
        <Pressable style={goldBtn} onPress={replay}>
          <Text style={goldBtnText}>{config.replayLabel}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: 'rgba(255,255,255,0.7)' }}>
        Pytanie {currentIndex + 1}/{session.length}
      </Text>
      <Text style={{ color: '#fff', fontSize: 16 }}>{q.text}</Text>
      {q.options.map((opt, i) => (
        <Pressable
          key={opt}
          onPress={() => {
            const nextIndex = currentIndex + 1;
            onUpdate({
              currentIndex: nextIndex,
              score: score + (i === q.correctIndex ? 1 : 0),
              lastFact: q.fact,
              sessionQuestions: session,
              finished: nextIndex >= session.length,
            });
          }}
          style={{ borderWidth: 1, borderColor: 'rgba(211,171,104,0.4)', borderRadius: 10, padding: 12 }}
        >
          <Text style={{ color: '#fff' }}>{opt}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function ChecklistEngine(props: EngineProps) {
  if (props.descriptor.variant === 'BINGO') return <BingoEngine {...props} />;
  if (props.descriptor.variant === 'SCORE') return <ScoreHuntEngine {...props} />;
  const pack = resolvePack(props.descriptor.contentKey);
  const items = (props.progress?.payload?.items as string[]) || (pack?.items as string[]) || [];
  const checked = (props.progress?.payload?.checked as Record<string, boolean>) || {};
  return (
    <View style={{ gap: 8 }}>
      {items.map((item) => (
        <Pressable
          key={item}
          onPress={() =>
            props.onUpdate({ items, checked: { ...checked, [item]: !checked[item] } })
          }
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
        >
          <Text style={{ color: calendarTheme.goldBright, fontSize: 18 }}>{checked[item] ? '☑' : '☐'}</Text>
          <Text style={{ color: '#fff', flex: 1 }}>{item}</Text>
        </Pressable>
      ))}
    </View>
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
    <View style={{ gap: 12 }}>
      {config.notes.map((note) => (
        <Text key={note} style={{ color: 'rgba(246,221,158,0.9)', lineHeight: 20 }}>
          {note}
        </Text>
      ))}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {config.legend.map((item) => (
          <Text
            key={`${item.points}-${item.label}`}
            style={{
              color: calendarTheme.goldBright,
              fontSize: 11,
              borderWidth: 1,
              borderColor: 'rgba(244,208,63,0.35)',
              borderRadius: 12,
              paddingHorizontal: 10,
              paddingVertical: 4,
              overflow: 'hidden',
            }}
          >
            {item.points} pkt · {item.label}
          </Text>
        ))}
      </View>
      {houses.map((house, index) => (
        <View
          key={`house-${index}`}
          style={{
            gap: 8,
            borderWidth: 1,
            borderColor: 'rgba(244,208,63,0.25)',
            backgroundColor: 'rgba(0,0,0,0.15)',
            borderRadius: 12,
            padding: 12,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ color: calendarTheme.goldBright, fontSize: 18, fontWeight: '700' }}>
              {index + 1}
            </Text>
            <TextInput
              value={house.name}
              placeholder={`${config.houseNoun} ${index + 1}`}
              placeholderTextColor="rgba(255,255,255,0.35)"
              onChangeText={(value) =>
                persist(houses.map((row, i) => (i === index ? { ...row, name: value } : row)))
              }
              style={{ ...field, flex: 1, minHeight: 44 }}
            />
          </View>
          <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11 }}>{config.pointsLabel}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {points.map((n) => {
              const on = house.points === n;
              return (
                <Pressable
                  key={n}
                  onPress={() =>
                    persist(
                      houses.map((row, i) => (i === index ? { ...row, points: on ? 0 : n } : row))
                    )
                  }
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: on ? calendarTheme.gold : 'rgba(255,255,255,0.12)',
                  }}
                >
                  <Text style={{ color: on ? '#0f5132' : '#fff', fontWeight: '700' }}>{n}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
      <View
        style={{
          borderWidth: 1,
          borderColor: 'rgba(244,208,63,0.4)',
          backgroundColor: 'rgba(244,208,63,0.1)',
          borderRadius: 12,
          padding: 14,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: calendarTheme.goldBright, fontSize: 22, fontWeight: '700' }}>{rankTitle}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>
          {config.totalLabel}: {total} pkt
        </Text>
      </View>
    </View>
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
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {items.map((item) => {
          const on = !!checked[item];
          return (
            <Pressable
              key={item}
              onPress={() => {
                const next = { ...checked, [item]: !on };
                const status = bingoBoardStatus(items, next, size);
                onUpdate({ items, checked: next, bingoLine: status.hasLine, bingoFull: status.blackout, started: true });
              }}
              style={{
                width: '30%',
                aspectRatio: 1,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: calendarTheme.gold,
                backgroundColor: on ? 'rgba(211,171,104,0.3)' : 'rgba(255,255,255,0.08)',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 6,
              }}
            >
              <Text style={{ color: on ? calendarTheme.goldBright : '#fff', textAlign: 'center', fontSize: 12 }}>
                {on ? '✓ ' : ''}
                {item}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {blackout ? (
        <Text style={{ color: calendarTheme.goldBright, textAlign: 'center' }}>Pełna plansza — bingo kompletne!</Text>
      ) : hasLine ? (
        <Text style={{ color: calendarTheme.goldBright, textAlign: 'center' }}>Bingo! Masz rząd.</Text>
      ) : null}
    </View>
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
    <View style={{ gap: 12 }}>
      {config.notes.length ? (
        <View
          style={{
            borderWidth: 1,
            borderColor: 'rgba(244,208,63,0.3)',
            backgroundColor: 'rgba(244,208,63,0.1)',
            borderRadius: 12,
            padding: 12,
            gap: 6,
          }}
        >
          {config.notes.map((note) => (
            <Text key={note} style={{ color: 'rgba(246,221,158,0.9)', lineHeight: 20 }}>
              {note}
            </Text>
          ))}
        </View>
      ) : null}

      {isLetter ? (
        <View style={{ borderWidth: 1, borderColor: 'rgba(211,171,104,0.3)', borderRadius: 12, padding: 12 }}>
          <Text style={{ color: calendarTheme.goldBright, fontSize: 22 }}>{config.letterGreeting}</Text>
          {config.letterIntro ? (
            <Text style={{ color: 'rgba(255,255,255,0.75)', marginTop: 8, lineHeight: 20 }}>
              {config.letterIntro}
            </Text>
          ) : null}
        </View>
      ) : null}

      {cards.map((card, index) =>
        isRoster ? (
          <View
            key={`card-${index}`}
            style={{
              gap: 10,
              borderWidth: 1,
              borderColor: 'rgba(244,208,63,0.25)',
              backgroundColor: 'rgba(0,0,0,0.15)',
              borderRadius: 12,
              padding: 12,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: calendarTheme.goldBright, fontSize: 18, fontWeight: '700' }}>
                {index + 1}
              </Text>
              {cards.length > 1 ? (
                <Pressable onPress={() => persist(cards.filter((_, i) => i !== index))}>
                  <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12 }}>{config.removeCardLabel}</Text>
                </Pressable>
              ) : null}
            </View>
            {config.nameField ? (
              <View>
                <Text style={{ color: 'rgba(255,255,255,0.55)', marginBottom: 4, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' }}>
                  {config.nameField}
                </Text>
                <TextInput
                  value={card.name}
                  onChangeText={(value) => updateCard(index, { name: value })}
                  placeholder="np. Ania"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  style={{ ...field, minHeight: 44 }}
                />
              </View>
            ) : null}
            {config.fields.map((label) => (
              <View key={label}>
                <Text style={{ color: 'rgba(255,255,255,0.55)', marginBottom: 4, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' }}>
                  {fieldCaption(label)}
                </Text>
                <TextInput
                  value={card.fields[label] || ''}
                  onChangeText={(value) =>
                    updateCard(index, { fields: { ...card.fields, [label]: value } })
                  }
                  placeholder="na co stawia"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  style={{ ...field, minHeight: 44 }}
                />
              </View>
            ))}
          </View>
        ) : (
          <View
            key={`card-${index}`}
            style={
              showCardChrome
                ? {
                    gap: 10,
                    borderWidth: 1,
                    borderColor: 'rgba(244,208,63,0.25)',
                    backgroundColor: 'rgba(0,0,0,0.15)',
                    borderRadius: 12,
                    padding: 12,
                  }
                : { gap: 10 }
            }
          >
            {showCardChrome ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text
                  style={{
                    color: 'rgba(246,221,158,0.85)',
                    fontSize: 11,
                    fontWeight: '700',
                    letterSpacing: 1.4,
                    textTransform: 'uppercase',
                  }}
                >
                  {config.cardNoun} {index + 1}
                </Text>
                {config.allowMultipleCards && cards.length > 1 ? (
                  <Pressable onPress={() => persist(cards.filter((_, i) => i !== index))}>
                    <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12 }}>{config.removeCardLabel}</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {config.nameField ? (
              <View>
                <Text style={{ color: 'rgba(255,255,255,0.8)', marginBottom: 4 }}>{config.nameField}</Text>
                <TextInput
                  value={card.name}
                  onChangeText={(value) => updateCard(index, { name: value })}
                  style={{ ...field, minHeight: 44 }}
                  placeholderTextColor="rgba(255,255,255,0.35)"
                />
              </View>
            ) : null}

            {config.fields.map((label) => (
              <View key={label}>
                <Text style={{ color: 'rgba(255,255,255,0.8)', marginBottom: 4 }}>{fieldCaption(label)}</Text>
                <TextInput
                  multiline
                  value={card.fields[label] || ''}
                  onChangeText={(value) =>
                    updateCard(index, { fields: { ...card.fields, [label]: value } })
                  }
                  style={field}
                  placeholderTextColor="rgba(255,255,255,0.35)"
                />
              </View>
            ))}
          </View>
        )
      )}

      {config.allowMultipleCards && cards.length < config.maxCards ? (
        <Pressable
          onPress={() => persist([...cards, emptyFormCard(config.fields)])}
          style={{
            borderRadius: 10,
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderWidth: 1,
            borderColor: 'rgba(244,208,63,0.4)',
            backgroundColor: 'rgba(255,255,255,0.1)',
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>
            {config.addCardLabel}  {cards.length}/{config.maxCards}
          </Text>
        </Pressable>
      ) : config.allowMultipleCards ? (
        <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>Maksymalnie {config.maxCards} osób.</Text>
      ) : null}

      {isLetter ? (
        <View style={{ borderWidth: 1, borderColor: 'rgba(211,171,104,0.2)', borderRadius: 12, padding: 12, gap: 8 }}>
          <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' }}>
            Tak będzie wyglądał list
          </Text>
          <Text style={{ color: calendarTheme.goldBright, fontSize: 20 }}>{config.letterGreeting}</Text>
          {config.letterIntro ? (
            <Text style={{ color: 'rgba(255,255,255,0.75)', lineHeight: 20 }}>{config.letterIntro}</Text>
          ) : null}
          {config.fields.map((label, index) => {
            const value = String(cards[0]?.fields[label] || '').trim();
            const lead = String(config.letterLeads[index] || label).trim();
            const text = composeLetterWish(lead, value);
            return (
              <Text
                key={label}
                style={{ color: value ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)', lineHeight: 20 }}
              >
                {text}
              </Text>
            );
          })}
          {config.letterOutro ? (
            <Text style={{ color: 'rgba(246,221,158,0.85)', fontStyle: 'italic' }}>{config.letterOutro}</Text>
          ) : null}
        </View>
      ) : config.letterOutro ? (
        <Text style={{ color: 'rgba(246,221,158,0.85)', fontStyle: 'italic' }}>{config.letterOutro}</Text>
      ) : null}
    </View>
  );
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
    <View style={{ alignItems: 'center', gap: 12 }}>
      {copy.modeLabel ? (
        <View
          style={{
            borderWidth: 1,
            borderColor: 'rgba(244,208,63,0.4)',
            backgroundColor: 'rgba(244,208,63,0.12)',
            paddingHorizontal: 12,
            paddingVertical: 4,
            borderRadius: 999,
          }}
        >
          <Text
            style={{
              color: calendarTheme.goldBright,
              fontSize: 11,
              fontWeight: '700',
              letterSpacing: 1.4,
              textTransform: 'uppercase',
            }}
          >
            {copy.modeLabel}
          </Text>
        </View>
      ) : null}
      {copy.hint ? (
        <Text style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 20 }}>{copy.hint}</Text>
      ) : null}

      {nameField ? (
        <View style={{ width: '100%' }}>
          <Text style={{ color: 'rgba(255,255,255,0.8)', marginBottom: 4 }}>{nameField}</Text>
          <TextInput
            value={recipient}
            onChangeText={(value) => onUpdate({ name: value })}
            placeholder="np. Ania"
            placeholderTextColor="rgba(255,255,255,0.35)"
            style={{ ...field, minHeight: 44 }}
          />
        </View>
      ) : null}

      {successTarget > 0 ? (
        <View style={{ alignItems: 'center', gap: 6 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {Array.from({ length: successTarget }, (_, i) => (
              <View
                key={i}
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: i < guessedCount ? calendarTheme.goldBright : 'transparent',
                  borderWidth: 1,
                  borderColor: 'rgba(244,208,63,0.55)',
                }}
              />
            ))}
          </View>
          <Text style={{ color: 'rgba(246,221,158,0.85)', fontSize: 12 }}>
            Odgadnięte {Math.min(guessedCount, successTarget)}/{successTarget}
          </Text>
        </View>
      ) : null}

      {showSuccess ? (
        <View
          style={{
            width: '100%',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: 'rgba(244,208,63,0.5)',
            backgroundColor: 'rgba(244,208,63,0.15)',
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}
        >
          {copy.successTitle ? (
            <Text style={{ color: calendarTheme.goldBright, fontSize: 20, fontWeight: '700', textAlign: 'center' }}>
              {copy.successTitle}
            </Text>
          ) : null}
          {copy.successLabel ? (
            <Text style={{ color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: 4 }}>
              {copy.successLabel}
            </Text>
          ) : null}
        </View>
      ) : null}

      {uniqueDraw && total > 0 && !awaitingStart ? (
        <Text style={{ color: 'rgba(246,221,158,0.85)', fontSize: 14 }}>
          {formatRandomizerProgress(copy.itemNoun, drawnCount, total)}
        </Text>
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
        <View
          style={{
            width: '100%',
            minHeight: 110,
            borderRadius: 16,
            borderWidth: 2,
            borderColor: 'rgba(244,208,63,0.45)',
            backgroundColor: 'rgba(0,0,0,0.2)',
            paddingHorizontal: 16,
            paddingVertical: 20,
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: calendarTheme.goldBright, fontSize: 24, textAlign: 'center', fontWeight: '700' }}>
            {emptyPool ? 'Brak haseł w konfiguracji' : current || copy.emptyLabel}
          </Text>
        </View>
      ) : null}

      {isSetDraw && !awaitingStart ? (
        <View style={{ width: '100%', gap: 8 }}>
          {setItems.length ? (
            setItems.map((item) => (
              <Pressable
                key={item}
                onPress={() => onUpdate({ checked: { ...checked, [item]: !checked[item] } })}
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 10,
                  borderWidth: 1,
                  borderColor: 'rgba(244,208,63,0.25)',
                  backgroundColor: 'rgba(0,0,0,0.15)',
                  borderRadius: 12,
                  padding: 12,
                }}
              >
                <View
                  style={{
                    width: 18,
                    height: 18,
                    marginTop: 2,
                    borderRadius: 4,
                    borderWidth: 1,
                    borderColor: calendarTheme.gold,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: checked[item] ? calendarTheme.gold : 'transparent',
                  }}
                >
                  {checked[item] ? (
                    <Text style={{ color: '#0f5132', fontSize: 12, fontWeight: '700' }}>✓</Text>
                  ) : null}
                </View>
                <Text
                  style={{
                    color: checked[item] ? 'rgba(255,255,255,0.55)' : '#fff',
                    flex: 1,
                    textDecorationLine: checked[item] ? 'line-through' : 'none',
                    lineHeight: 20,
                  }}
                >
                  {item}
                </Text>
              </Pressable>
            ))
          ) : (
            <Text style={{ color: 'rgba(255,255,255,0.65)', textAlign: 'center', paddingVertical: 16 }}>
              {copy.emptyLabel}
            </Text>
          )}
        </View>
      ) : null}

      {exhausted && !won ? (
        <Text style={{ color: 'rgba(255,255,255,0.65)', textAlign: 'center' }}>{copy.exhaustedLabel}</Text>
      ) : null}

      {emptyPool ? null : awaitingStart || roundOver || !markGuessed || !current ? (
        <Pressable style={goldBtn} onPress={() => (roundOver ? restart() : applyDraw(exhausted))}>
          <Text style={goldBtnText}>{primaryLabel}</Text>
        </Pressable>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
          <Pressable style={goldBtn} onPress={() => resolveRound(true)}>
            <Text style={goldBtnText}>{copy.guessedLabel}</Text>
          </Pressable>
          <Pressable
            style={{
              borderRadius: 10,
              paddingVertical: 12,
              paddingHorizontal: 20,
              borderWidth: 1,
              borderColor: 'rgba(244,208,63,0.4)',
              backgroundColor: 'rgba(255,255,255,0.1)',
            }}
            onPress={() => resolveRound(false)}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{copy.skipLabel}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function PlannerEngine({ descriptor, progress, onUpdate }: EngineProps) {
  const pack = resolvePack(descriptor.contentKey);
  const columns = (pack?.columns as string[]) || ['Osoba', 'Pomysł', 'Budżet'];
  const rows = (progress?.payload?.rows as string[][]) || [['', '', '']];
  return (
    <View style={{ gap: 8 }}>
      {rows.map((row, ri) => (
        <View key={ri} style={{ gap: 6, marginBottom: 8 }}>
          {columns.map((col, ci) => (
            <TextInput
              key={col}
              placeholder={col}
              placeholderTextColor="rgba(255,255,255,0.35)"
              value={row[ci] || ''}
              onChangeText={(value) => {
                const next = rows.map((r) => [...r]);
                next[ri][ci] = value;
                onUpdate({ rows: next, columns });
              }}
              style={field}
            />
          ))}
        </View>
      ))}
      <Pressable
        style={goldBtn}
        onPress={() => onUpdate({ rows: [...rows, columns.map(() => '')], columns })}
      >
        <Text style={goldBtnText}>+ Dodaj wiersz</Text>
      </Pressable>
    </View>
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
    <View style={{ gap: 8 }}>
      {notes.map((note) => (
        <Text key={note} style={{ color: 'rgba(246,221,158,0.9)', lineHeight: 20 }}>
          {note}
        </Text>
      ))}
      {items.map((item, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ color: calendarTheme.goldBright, width: 24 }}>{i + 1}.</Text>
          <TextInput
            style={[field, { flex: 1, minHeight: 44 }]}
            value={item}
            onChangeText={(value) => {
              const next = [...items];
              next[i] = value;
              onUpdate({ items: next, started: true });
            }}
          />
        </View>
      ))}
    </View>
  );
}

function RecipeEngine({ descriptor }: EngineProps) {
  const pack = resolvePack(descriptor.contentKey);
  const title = String(pack?.title || descriptor.headline);
  const steps = (pack?.steps as string[]) || [];
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: calendarTheme.goldBright, fontSize: 18, fontWeight: '700' }}>{title}</Text>
      {steps.map((s) => (
        <Text key={s} style={{ color: '#fff' }}>
          • {s}
        </Text>
      ))}
    </View>
  );
}

function ScorecardEngine({ descriptor, progress, onUpdate }: EngineProps) {
  const pack = resolvePack(descriptor.contentKey);
  const samples = (pack?.samples as string[]) || ['Próbka 1', 'Próbka 2'];
  const scores = (progress?.payload?.scores as Record<string, number>) || {};
  return (
    <View style={{ gap: 10 }}>
      {samples.map((name) => (
        <View key={name} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: '#fff', flex: 1 }}>{name}</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable
                key={n}
                onPress={() => onUpdate({ scores: { ...scores, [name]: n } })}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: scores[name] === n ? calendarTheme.gold : 'rgba(255,255,255,0.12)',
                }}
              >
                <Text style={{ color: scores[name] === n ? '#0f5132' : '#fff' }}>{n}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function ImageCardEngine({ descriptor, progress, onUpdate, calendarId, day }: EngineProps) {
  const pack = resolvePack(descriptor.contentKey, descriptor.document?.templateId);
  const config = resolveImageCardConfig(pack);
  const photos = (progress?.payload?.photos as Record<string, unknown>) || {};
  const caption = String(progress?.payload?.caption || '');
  const [busySlot, setBusySlot] = React.useState<string | null>(null);

  const pickPhoto = async (slotId: string) => {
    if (!calendarId || day == null) {
      Alert.alert('Zdjęcie', 'Nie można teraz wgrać zdjęcia.');
      return;
    }
    setBusySlot(slotId);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Zdjęcie', 'Potrzebny jest dostęp do galerii.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: true,
        preferredAssetRepresentationMode: 'compatible',
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      const asset = result.assets[0];
      const mimeType = String(asset.mimeType || '').toLowerCase();
      if (mimeType.includes('heic') || mimeType.includes('heif')) {
        Alert.alert(
          'Zdjęcie',
          'Zdjęcia HEIC z iPhone’a nie są obsługiwane. Zapisz je jako JPG lub PNG i wczytaj ponownie.'
        );
        return;
      }
      const uploaded = await uploadSpecialImage(
        calendarId,
        day,
        slotId,
        asset.uri,
        mimeType.includes('png') ? 'image/png' : mimeType.includes('webp') ? 'image/webp' : mimeType.includes('gif') ? 'image/gif' : 'image/jpeg'
      );
      onUpdate({
        photos: { ...photos, [slotId]: { url: uploaded.imageUrl, key: uploaded.imageKey } },
        started: true,
      });
    } catch (err) {
      Alert.alert('Zdjęcie', err instanceof Error ? err.message : 'Nie udało się dodać zdjęcia.');
    } finally {
      setBusySlot(null);
    }
  };

  return (
    <View style={{ gap: 12 }}>
      {config.notes.map((note) => (
        <Text key={note} style={{ color: 'rgba(246,221,158,0.9)', lineHeight: 20 }}>
          {note}
        </Text>
      ))}
      <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, lineHeight: 18 }}>
        {config.formatsHint}
      </Text>
      <View style={{ gap: 10 }}>
        {config.slots.map((slot) => {
          const src = photoSrc(photos, slot.id);
          return (
            <Pressable
              key={slot.id}
              onPress={() => void pickPhoto(slot.id)}
              style={{
                borderWidth: 2,
                borderColor: 'rgba(244,208,63,0.4)',
                borderRadius: 16,
                overflow: 'hidden',
                backgroundColor: 'rgba(0,0,0,0.2)',
              }}
            >
              <Text
                style={{
                  color: calendarTheme.goldBright,
                  textAlign: 'center',
                  paddingTop: 10,
                  fontSize: 11,
                  fontWeight: '700',
                  letterSpacing: 1.6,
                  textTransform: 'uppercase',
                }}
              >
                {slot.label}
              </Text>
              {src ? (
                <Image source={{ uri: src }} style={{ height: 180, margin: 10, borderRadius: 12 }} />
              ) : (
                <Text style={{ color: 'rgba(255,255,255,0.55)', textAlign: 'center', paddingVertical: 48 }}>
                  {busySlot === slot.id ? 'Wysyłam zdjęcie…' : 'Dotknij i wczytaj JPG, PNG, WEBP lub GIF'}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>
      {config.captionField ? (
        <View>
          <Text style={{ color: 'rgba(255,255,255,0.8)', marginBottom: 4 }}>{config.captionField}</Text>
          <TextInput
            value={caption}
            onChangeText={(value) => onUpdate({ caption: value, started: true })}
            placeholder="np. grudzień 2016 i grudzień 2026"
            placeholderTextColor="rgba(255,255,255,0.35)"
            style={{ ...field, minHeight: 44 }}
          />
        </View>
      ) : null}
    </View>
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
    <View style={{ alignItems: 'center', gap: 12 }}>
      <Text style={{ color: '#fff', textAlign: 'center' }}>
        {descriptor.description || String(pack?.intro || 'Materiał do pobrania i wydruku')}
      </Text>
      {notes.map((note) => (
        <Text key={note} style={{ color: 'rgba(246,221,158,0.85)', textAlign: 'center', lineHeight: 20 }}>
          {note}
        </Text>
      ))}
      {steps.length ? (
        <View style={{ alignSelf: 'stretch', gap: 6 }}>
          {steps.map((step, index) => (
            <Text key={step} style={{ color: 'rgba(255,255,255,0.85)', lineHeight: 20 }}>
              {index + 1}. {step}
            </Text>
          ))}
        </View>
      ) : null}
      {printHint ? (
        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'center' }}>{printHint}</Text>
      ) : null}
      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'center' }}>
        Układ i PDF znajdziesz na dole karty.
      </Text>
    </View>
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
    return (
      <Text style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>Brak opcji w konfiguracji</Text>
    );
  }

  const summary = formatOptionSelections(config, selections);

  return (
    <View style={{ gap: 14 }}>
      {config.notes.map((note) => (
        <Text key={note} style={{ color: 'rgba(246,221,158,0.9)', lineHeight: 20 }}>
          {note}
        </Text>
      ))}
      {config.sections.map((section) => {
        const current = selections[section.id];
        const selected = Array.isArray(current)
          ? current.map(String)
          : current
            ? [String(current)]
            : [];
        return (
          <View key={section.id} style={{ gap: 8 }}>
            <Text style={{ color: calendarTheme.goldBright, fontWeight: '600' }}>{section.label}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {section.options.map((option) => {
                const active = selected.includes(option);
                return (
                  <Pressable
                    key={option}
                    onPress={() => {
                      if (section.multi) {
                        setSelection(
                          section.id,
                          active ? selected.filter((item) => item !== option) : [...selected, option]
                        );
                      } else {
                        setSelection(section.id, option);
                      }
                    }}
                    style={{
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: active ? calendarTheme.gold : 'rgba(255,255,255,0.2)',
                      backgroundColor: active ? 'rgba(244,208,63,0.25)' : 'rgba(255,255,255,0.05)',
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                    }}
                  >
                    <Text style={{ color: active ? calendarTheme.goldBright : 'rgba(255,255,255,0.85)' }}>
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}
      {summary.length ? (
        <View
          style={{
            borderWidth: 1,
            borderColor: 'rgba(244,208,63,0.3)',
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderRadius: 12,
            padding: 12,
            gap: 4,
          }}
        >
          <Text
            style={{
              color: 'rgba(246,221,158,0.7)',
              fontSize: 11,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            {config.resultLabel}
          </Text>
          {summary.map((line) => (
            <Text key={line} style={{ color: 'rgba(255,255,255,0.9)', lineHeight: 20 }}>
              {line}
            </Text>
          ))}
        </View>
      ) : (
        <Text style={{ color: 'rgba(255,255,255,0.5)' }}>{config.emptyLabel}</Text>
      )}
    </View>
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
    <View style={{ gap: 12 }}>
      {config.notes.map((note) => (
        <Text key={note} style={{ color: 'rgba(246,221,158,0.9)', lineHeight: 20 }}>
          {note}
        </Text>
      ))}
      {config.themeOptions.length ? (
        <View>
          <Text style={{ color: 'rgba(255,255,255,0.8)', marginBottom: 6 }}>{config.themeLabel}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {config.themeOptions.map((option) => (
              <Pressable
                key={option}
                onPress={() => onUpdate({ fields, theme: option, started: true })}
                style={{
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: theme === option ? calendarTheme.gold : 'rgba(255,255,255,0.2)',
                  backgroundColor: theme === option ? 'rgba(244,208,63,0.25)' : 'rgba(255,255,255,0.05)',
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                }}
              >
                <Text style={{ color: theme === option ? calendarTheme.goldBright : '#fff' }}>{option}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
      {config.fields.map((label) => (
        <View key={label}>
          <Text style={{ color: 'rgba(255,255,255,0.8)', marginBottom: 4 }}>{label}</Text>
          <TextInput
            value={fields[label] || ''}
            onChangeText={(value) =>
              onUpdate({ fields: { ...fields, [label]: value }, theme, started: true })
            }
            style={{ ...field, minHeight: 44 }}
            placeholderTextColor="rgba(255,255,255,0.35)"
          />
        </View>
      ))}
      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
        {config.previewLabel} — PDF na dole karty.
      </Text>
    </View>
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
      <View style={{ alignItems: 'center', gap: 14 }}>
        {config.notes.map((note) => (
          <Text key={note} style={{ color: 'rgba(246,221,158,0.9)', textAlign: 'center', lineHeight: 20 }}>
            {note}
          </Text>
        ))}
        <Pressable style={goldBtn} onPress={startRound}>
          <Text style={goldBtnText}>{config.ctaLabel}</Text>
        </Pressable>
      </View>
    );
  }

  if (roundFinished || current.finished) {
    return (
      <View style={{ alignItems: 'center', gap: 12 }}>
        <Text style={{ color: calendarTheme.goldBright, fontSize: 22, fontWeight: '700', textAlign: 'center' }}>
          {config.finishLabel}
        </Text>
        {config.playerNames.map((name) => (
          <Text key={name} style={{ color: '#fff' }}>
            {name}: {scores[name] || 0}
          </Text>
        ))}
        <Pressable style={goldBtn} onPress={startRound}>
          <Text style={goldBtnText}>{config.replayLabel}</Text>
        </Pressable>
      </View>
    );
  }

  const playerName = config.playerNames[currentPlayer % config.playerNames.length];

  return (
    <View style={{ alignItems: 'center', gap: 14 }}>
      <Text style={{ color: 'rgba(255,255,255,0.7)' }}>
        {playerName} · litera {letterIndex + 1}/{config.letters.length}
      </Text>
      <Text style={{ color: calendarTheme.goldBright, fontSize: 56, fontWeight: '700' }}>{current.letter}</Text>
      {timerStartedAt ? <PromptTimer startedAt={timerStartedAt} duration={config.timerSeconds} /> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
        <Pressable style={goldBtn} onPress={() => resolveTurn(true)}>
          <Text style={goldBtnText}>{config.scoredLabel}</Text>
        </Pressable>
        <Pressable
          style={{
            borderRadius: 10,
            paddingVertical: 12,
            paddingHorizontal: 20,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.3)',
          }}
          onPress={() => resolveTurn(false)}
        >
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontWeight: '700', fontSize: 16 }}>
            {config.missLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function GenericEngine({ descriptor, onUpdate }: EngineProps) {
  return (
    <View style={{ alignItems: 'center', gap: 12 }}>
      <Text style={{ color: '#fff', textAlign: 'center' }}>
        {descriptor.description || 'Rozpocznij interaktywny dodatek'}
      </Text>
      <Pressable style={goldBtn} onPress={() => onUpdate({ started: true })}>
        <Text style={goldBtnText}>Rozpocznij</Text>
      </Pressable>
    </View>
  );
}

const ENGINE_MAP: Partial<Record<SpecialEngineType, React.ComponentType<EngineProps>>> = {
  QUIZ: QuizEngine,
  CHECKLIST: ChecklistEngine,
  RANDOMIZER_TIMER: RandomizerTimerEngine,
  CARD_FORM: CardFormEngine,
  PLANNER: PlannerEngine,
  MONTH_PLANNER: PlannerEngine,
  SORTABLE_LIST: SortableListEngine,
  RECIPE: RecipeEngine,
  SCORECARD: ScorecardEngine,
  DOCUMENT: DocumentEngine,
  IMAGE_CARD: ImageCardEngine,
  OPTION_CONFIGURATOR: OptionConfiguratorEngine,
  TURN_BASED_GAME: TurnBasedGameEngine,
  TEMPLATE_PERSONALIZER: TemplatePersonalizerEngine,
};

export default function EngineRouter(props: EngineProps) {
  const Component = ENGINE_MAP[props.descriptor.engine] || GenericEngine;
  return (
    <ScrollView style={{ maxHeight: 420 }} nestedScrollEnabled>
      <Component {...props} />
    </ScrollView>
  );
}
