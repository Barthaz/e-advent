import React, { useState } from 'react';
import { Alert, Pressable, Text, View, StyleSheet } from 'react-native';
import type { OpenedCalendarWindow } from '@e-advent/types';
import { clearedFormProgress, isMobilePrintable, printableHint, resolveCardFormConfig } from '@e-advent/special-core';
import { calendarTheme } from '../components/calendar/calendarTheme';
import EngineRouter from './EngineRouter';
import { useSpecialProgress } from './useSpecialProgress';
import { exportSpecialPdf } from '../api/api';
import { resolvePack } from './contentPacks';

interface Props {
  calendarId: string;
  openedWindow: OpenedCalendarWindow;
}

export default function SpecialWindowShell({ calendarId, openedWindow }: Props) {
  const descriptor = openedWindow.special;
  const { progress, updatePayload, saveState, dateGate, sealProgress } = useSpecialProgress(
    calendarId,
    openedWindow.day,
    descriptor ?? null
  );
  const [exporting, setExporting] = useState(false);

  if (!descriptor) return null;

  const canPrint = isMobilePrintable(descriptor);
  const dateGateLocked = Boolean(descriptor.capabilities?.dateGate
    && (progress?.payload.dateGateLocked || (progress?.payload.sealed && !dateGate?.revealed)));

  const downloadPdf = async () => {
    if (!progress || dateGateLocked || exporting) return;
    try {
      setExporting(true);
      await exportSpecialPdf(calendarId, openedWindow.day, progress?.payload);
      const formConfig = resolveCardFormConfig(resolvePack(descriptor.contentKey));
      if (formConfig.clearOnPrint) {
        updatePayload(clearedFormProgress(formConfig));
      }
    } catch (err) {
      Alert.alert('PDF', err instanceof Error ? err.message : 'Nie udało się przygotować PDF.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <View style={styles.shell}>
      <Text style={styles.badge}>Okienko specjalne</Text>
      <Text style={styles.headline}>{descriptor.headline}</Text>
      {descriptor.description ? <Text style={styles.description}>{descriptor.description}</Text> : null}
      {canPrint ? <Text style={styles.hint}>{printableHint(descriptor)}</Text> : null}

      {!progress ? (
        <Text style={styles.hint}>{saveState === 'error' ? 'Nie udało się wczytać zadania. Otwórz je ponownie po odzyskaniu połączenia.' : 'Wczytywanie zadania…'}</Text>
      ) : dateGateLocked ? (
        <View>
          <Text style={styles.headline}>Treść zapieczętowana</Text>
          <Text style={styles.hint}>Otworzy się {dateGate?.revealAt ? new Date(dateGate.revealAt).toLocaleString('pl-PL') : 'we wskazanym terminie'}.</Text>
        </View>
      ) : <EngineRouter
        descriptor={descriptor}
        progress={progress}
        onUpdate={updatePayload}
        calendarId={calendarId}
        day={openedWindow.day}
      />}

      <View style={styles.footer}>
        <Text style={styles.save}>
          {saveState === 'saving'
            ? 'Zapisywanie…'
            : saveState === 'saved'
              ? 'Zapisano'
              : saveState === 'error'
                ? 'Nie udało się zsynchronizować postępu. Sprawdź połączenie.'
                : 'Postęp zapisuje się automatycznie'}
        </Text>
        {descriptor.capabilities?.dateGate && progress && !dateGateLocked && !dateGate?.revealed ? (
          <Pressable style={styles.goldBtn} onPress={sealProgress} disabled={saveState === 'saving' || exporting}>
            <Text style={styles.goldBtnText}>Zapieczętuj do terminu</Text>
          </Pressable>
        ) : null}
        {canPrint ? (
          <Pressable style={styles.goldBtn} onPress={downloadPdf} disabled={exporting || !progress || dateGateLocked}>
            <Text style={styles.goldBtnText}>{exporting ? 'Przygotowuję…' : 'Pobierz PDF'}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: calendarTheme.gold,
    backgroundColor: 'rgba(15, 81, 50, 0.95)',
    gap: 10,
  },
  badge: {
    color: calendarTheme.goldBright,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  headline: { color: calendarTheme.goldBright, fontSize: 20, fontWeight: '700' },
  description: { color: 'rgba(255,255,255,0.75)', fontSize: 14 },
  hint: { color: 'rgba(246,221,158,0.85)', fontSize: 13, lineHeight: 18 },
  footer: { marginTop: 8, gap: 8 },
  save: { color: 'rgba(255,255,255,0.45)', fontSize: 12 },
  goldBtn: {
    backgroundColor: calendarTheme.gold,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  goldBtnText: { color: '#0f5132', fontWeight: '700', fontSize: 15 },
});
