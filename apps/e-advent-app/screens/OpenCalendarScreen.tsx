import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { openCalendarDay, ORDER_CALENDAR_URL } from '../api/api';
import type { OpenedCalendarWindow } from '@e-advent/types';
import { useProfile } from '../contexts/ProfileContext';
import CalendarGrid from '../components/calendar/CalendarGrid';
import WindowOpenAnimation, {
  type OpenAnimMode,
  type WindowRect,
} from '../components/calendar/WindowOpenAnimation';
import { calendarTheme } from '../components/calendar/calendarTheme';
import SpecialWindowShell from '../special-windows/SpecialWindowShell';

const logo = require('../assets/eadvent-logo.png');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { STORAGE_KEYS } = require('../utils/accessSession');

interface CalendarDay {
  day: number;
  task: string;
  isOpened: boolean;
  date: string;
  duration?: number;
}

interface OpenCalendarScreenProps {
  navigation: any;
}

function buildDaysFromCalendar(tasks: Array<{ day: number; title: string; status: string; duration?: number }>): CalendarDay[] {
  const currentYear = new Date().getFullYear();
  const calendarDays: CalendarDay[] = [];
  for (let i = 1; i <= 24; i++) {
    const apiTask = tasks.find((t) => t.day === i);
    calendarDays.push({
      day: i,
      task: apiTask?.title || '',
      isOpened: apiTask?.status === 'opened',
      date: new Date(currentYear, 11, i).toISOString(),
      duration: apiTask?.duration,
    });
  }
  return calendarDays;
}

export default function OpenCalendarScreen(_props: OpenCalendarScreenProps) {
  const {
    isLoggedIn,
    isBootstrapping,
    isLoading: isProfileLoading,
    calendar,
    accessCode,
    login,
    logout,
    refreshCalendar,
  } = useProfile();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [openingDay, setOpeningDay] = useState<number | null>(null);
  const [openedWindows, setOpenedWindows] = useState<Record<number, OpenedCalendarWindow>>({});
  const [showUnlinkModal, setShowUnlinkModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');
  const codeInputRefs = useRef<(TextInput | null)[]>([]);

  const [animMode, setAnimMode] = useState<OpenAnimMode | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [sourceRect, setSourceRect] = useState<WindowRect | null>(null);

  useEffect(() => {
    if (calendar?.tasks) {
      setDays(buildDaysFromCalendar(calendar.tasks));
      const hydrated: Record<number, OpenedCalendarWindow> = {};
      for (const apiTask of calendar.tasks) {
        if (apiTask.status === 'opened' && apiTask.isSpecial && apiTask.special) {
          hydrated[apiTask.day] = {
            taskId: apiTask.catalogTaskId || '',
            day: apiTask.day,
            state: 'OPENED',
            title: apiTask.title,
            text: apiTask.title,
            isSpecial: true,
            special: apiTask.special,
          };
        }
      }
      setOpenedWindows((prev) => ({ ...hydrated, ...prev }));
    } else if (!isLoggedIn) {
      setDays([]);
      setOpenedWindows({});
    }
  }, [calendar, isLoggedIn]);

  useEffect(() => {
    if (!isBootstrapping && !isLoggedIn && codeInputRefs.current[0]) {
      setTimeout(() => {
        codeInputRefs.current[0]?.focus();
      }, 100);
    }
  }, [isBootstrapping, isLoggedIn]);

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) {
      handleCodePaste(value);
      return;
    }

    const sanitizedValue = value.replace(/[^0-9A-Za-z]/g, '').toUpperCase().slice(0, 1);
    const newCode = [...code];
    newCode[index] = sanitizedValue;
    setCode(newCode);
    setErrorMessage('');

    if (sanitizedValue && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodePaste = (pastedText: string) => {
    const sanitized = pastedText.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
    if (sanitized.length === 0) return;

    const newCode = ['', '', '', '', '', ''];
    for (let i = 0; i < 6; i++) {
      if (i < sanitized.length) {
        newCode[i] = sanitized[i];
      }
    }

    setCode(newCode);
    setErrorMessage('');

    const nextFocusIndex = Math.min(sanitized.length - 1, 5);
    setTimeout(() => {
      codeInputRefs.current[nextFocusIndex]?.focus();
    }, 0);
  };

  const handleKeyDown = (index: number, e: any) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  const handleLoadCalendar = async () => {
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Proszę wprowadzić poprawny adres email');
      setShowErrorModal(true);
      return;
    }

    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      setErrorMessage('Kod dostępu musi składać się z 6 znaków');
      setShowErrorModal(true);
      return;
    }

    try {
      await login(email.trim(), fullCode);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Nie udało się pobrać kalendarza');
      setShowErrorModal(true);
      setCode(['', '', '', '', '', '']);
    }
  };

  const canOpenDay = (day: number, dateStr: string): boolean => {
    const dayData = days.find((d) => d.day === day);
    if (dayData?.isOpened) {
      return false;
    }

    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      for (let prev = 1; prev < day; prev++) {
        const prevDay = days.find((d) => d.day === prev);
        if (!prevDay?.isOpened) {
          return false;
        }
      }
      return true;
    }

    const today = new Date();
    const dayDate = new Date(dateStr);

    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();

    const dayYear = dayDate.getFullYear();
    const dayMonth = dayDate.getMonth();
    const dayDateNum = dayDate.getDate();

    if (dayYear < todayYear) return true;
    if (dayYear > todayYear) return false;
    if (dayMonth < todayMonth) return true;
    if (dayMonth > todayMonth) return false;
    return dayDateNum <= todayDate;
  };

  const isBeforeDecember = (): boolean => {
    const today = new Date();
    return today.getMonth() < 11;
  };

  const saveOpenedDays = async (openedDays: number[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.openedDays, JSON.stringify(openedDays));
    } catch (error) {
      console.error('Error saving opened days:', error);
    }
  };

  const confirmUnlinkCalendar = async () => {
    try {
      await logout();
      setEmail('');
      setCode(['', '', '', '', '', '']);
      setDays([]);
      setShowUnlinkModal(false);
    } catch (error) {
      console.error('Error unlinking calendar:', error);
      setErrorMessage('Nie udało się odepiąć kalendarza');
      setShowErrorModal(true);
    }
  };

  const markDayOpened = (day: number) => {
    setDays((prevDays) => {
      const updated = prevDays.map((d) => (d.day === day ? { ...d, isOpened: true } : d));
      const openedDays = updated.filter((d) => d.isOpened).map((d) => d.day);
      saveOpenedDays(openedDays);
      return updated;
    });
  };

  const openTaskPresentation = (day: number, mode: OpenAnimMode, rect: WindowRect | null) => {
    setSourceRect(rect);
    setSelectedDay(day);
    setAnimMode(mode);
    setIsAnimating(true);
  };

  const handleCloseTaskPanel = () => {
    setSelectedDay(null);
    setAnimMode(null);
    setSourceRect(null);
    setIsAnimating(false);
    setOpeningDay(null);
  };

  const handleWindowPress = async (day: number, windowRect: WindowRect) => {
    if (!calendar || isAnimating) return;

    const dayData = days.find((d) => d.day === day);
    if (!dayData) return;

    const rect =
      windowRect.width > 0
        ? windowRect
        : { x: 40, y: 180, width: 72, height: 72 };

    if (dayData.isOpened) {
      openTaskPresentation(day, 'fade', rect);
      return;
    }

    if (!canOpenDay(day, dayData.date)) {
      const message =
        typeof __DEV__ !== 'undefined' && __DEV__
          ? 'W trybie testowym otwieraj okienka po kolei — najpierw poprzednie.'
          : 'To okienko będzie dostępne w odpowiednim dniu grudnia';
      setInfoMessage(message);
      setShowInfoModal(true);
      return;
    }

    setOpeningDay(day);
    setIsAnimating(true);

    try {
      const res = await openCalendarDay(calendar.id, day, accessCode || undefined);
      if (res.openedWindow) {
        setOpenedWindows((prev) => ({ ...prev, [day]: res.openedWindow! }));
      }
      markDayOpened(day);
      setOpeningDay(null);
      openTaskPresentation(day, 'zoom', rect);
      refreshCalendar().catch(() => {});
    } catch (error: any) {
      const message = error?.message || 'Nie udało się otworzyć okienka';
      setErrorMessage(message);
      setShowErrorModal(true);
      setIsAnimating(false);
      setOpeningDay(null);
      setAnimMode(null);
      setSelectedDay(null);
      setSourceRect(null);
    }
  };

  const selectedDayData = selectedDay !== null ? days.find((d) => d.day === selectedDay) : null;
  const isBusy = isProfileLoading || isBootstrapping;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[calendarTheme.bgDeep2, calendarTheme.bgDeep, '#040f0d']}
        style={styles.background}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={!isAnimating}
        >
          <View style={styles.header}>
            <Text style={styles.eyebrow}>Grudzień</Text>
            <Text style={styles.title}>
              {calendar?.title || 'Kalendarz Adwentowy'}
            </Text>
            {!!calendar?.author && (
              <Text style={styles.author}>Autor: {calendar.author}</Text>
            )}
            {!isLoggedIn && (
              <Text style={styles.subtitle}>
                Połącz się z profilem — podaj email i kod dostępu do kalendarza
              </Text>
            )}
          </View>

          {isBootstrapping && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={calendarTheme.goldBright} />
              <Text style={styles.loadingText}>Ładowanie kalendarza...</Text>
            </View>
          )}

          {!isLoggedIn && !isBootstrapping && (
            <View style={styles.formCard}>
              <Text style={styles.formLabel}>Adres email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  setErrorMessage('');
                }}
                placeholder="twoj@email.pl"
                placeholderTextColor="rgba(243,232,210,0.35)"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoComplete="email"
                editable={!isBusy}
              />

              <Text style={[styles.formLabel, { marginTop: 18 }]}>Kod dostępu (6 znaków)</Text>
              <View style={styles.codeContainer}>
                {code.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => {
                      codeInputRefs.current[index] = ref;
                    }}
                    style={styles.codeInput}
                    value={digit}
                    onChangeText={(value) => handleCodeChange(index, value)}
                    onKeyPress={(e) => handleKeyDown(index, e)}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    editable={!isBusy}
                    selectTextOnFocus
                  />
                ))}
              </View>

              <TouchableOpacity
                style={[styles.loadButton, isBusy && styles.loadButtonDisabled]}
                onPress={handleLoadCalendar}
                disabled={isBusy}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[calendarTheme.goldBright, calendarTheme.gold]}
                  style={styles.loadButtonGradient}
                >
                  {isProfileLoading ? (
                    <ActivityIndicator color={calendarTheme.pine} />
                  ) : (
                    <Text style={styles.loadButtonText}>Połącz profil</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.purchaseContainer}>
                <Text style={styles.purchaseText}>Nie masz konta?</Text>
                <TouchableOpacity
                  onPress={() => Linking.openURL(ORDER_CALENDAR_URL)}
                  style={styles.purchaseButton}
                  activeOpacity={0.85}
                >
                  <Text style={styles.purchaseButtonText}>Zamów kalendarz na stronie</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {isLoggedIn && calendar && !isBootstrapping && (
            <View style={styles.calendarSection}>
              {isBeforeDecember() && (
                <View style={styles.beforeDecemberInfo}>
                  <Image source={logo} style={styles.beforeDecemberLogo} resizeMode="contain" />
                  <Text style={styles.beforeDecemberTitle}>Magia świąt dopiero się zaczyna</Text>
                  <Text style={styles.beforeDecemberText}>
                    Kalendarz adwentowy rozpocznie się{' '}
                    <Text style={styles.beforeDecemberHighlight}>1 grudnia</Text>. Wróć wtedy, aby
                    otworzyć pierwsze okienko.
                  </Text>
                </View>
              )}

              <CalendarGrid
                days={days}
                openingDay={openingDay}
                canOpenDay={canOpenDay}
                disabled={isAnimating}
                onWindowPress={handleWindowPress}
              />

              <TouchableOpacity
                style={styles.unlinkButton}
                onPress={() => setShowUnlinkModal(true)}
                activeOpacity={0.8}
                disabled={isAnimating}
              >
                <Text style={styles.unlinkButtonText}>Wyloguj / odepnij profil</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        <WindowOpenAnimation
          visible={selectedDay !== null && animMode !== null}
          mode={animMode}
          day={selectedDay}
          task={selectedDayData?.task || ''}
          duration={selectedDayData?.duration}
          sourceRect={sourceRect}
          onRequestClose={handleCloseTaskPanel}
          specialContent={
            selectedDay !== null && calendar && openedWindows[selectedDay]?.isSpecial ? (
              <SpecialWindowShell
                calendarId={calendar.id}
                openedWindow={openedWindows[selectedDay]}
              />
            ) : null
          }
        />

        <Modal
          visible={showUnlinkModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowUnlinkModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Wyloguj profil</Text>
              <Text style={styles.modalTask}>
                Czy na pewno chcesz się wylogować? Będziesz musiał ponownie wpisać email i kod
                dostępu.
              </Text>
              <View style={styles.modalButtonsContainer}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setShowUnlinkModal(false)}
                >
                  <Text style={styles.modalCancelButtonText}>Anuluj</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalConfirmButton} onPress={confirmUnlinkCalendar}>
                  <Text style={styles.modalConfirmButtonText}>Wyloguj</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showErrorModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowErrorModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Błąd</Text>
              <Text style={styles.modalTask}>{errorMessage}</Text>
              <TouchableOpacity
                style={styles.modalSingleButton}
                onPress={() => setShowErrorModal(false)}
              >
                <Text style={styles.modalConfirmButtonText}>Zamknij</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showInfoModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowInfoModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Informacja</Text>
              <Text style={styles.modalTask}>{infoMessage}</Text>
              <TouchableOpacity
                style={styles.modalSingleButton}
                onPress={() => setShowInfoModal(false)}
              >
                <Text style={styles.modalConfirmButtonText}>Zamknij</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: calendarTheme.bgDeep,
  },
  background: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  eyebrow: {
    letterSpacing: 4,
    textTransform: 'uppercase',
    fontSize: 11,
    color: calendarTheme.gold,
    opacity: 0.85,
    marginBottom: 6,
  },
  title: {
    fontFamily: 'serif',
    fontWeight: '600',
    fontSize: 28,
    color: calendarTheme.goldBright,
    textAlign: 'center',
  },
  author: {
    marginTop: 8,
    fontSize: 14,
    color: 'rgba(243,232,210,0.7)',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: 'rgba(243,232,210,0.65)',
    textAlign: 'center',
  },
  loadingContainer: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 14,
    color: calendarTheme.gold,
    fontSize: 15,
  },
  formCard: {
    backgroundColor: 'rgba(18, 59, 50, 0.72)',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(211,171,104,0.28)',
  },
  formLabel: {
    fontSize: 14,
    color: calendarTheme.goldBright,
    marginBottom: 10,
    letterSpacing: 0.4,
  },
  input: {
    backgroundColor: 'rgba(8,26,23,0.55)',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: calendarTheme.cream,
    borderWidth: 1,
    borderColor: 'rgba(211,171,104,0.22)',
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 20,
  },
  codeInput: {
    flex: 1,
    backgroundColor: 'rgba(8,26,23,0.55)',
    borderRadius: 12,
    paddingVertical: 14,
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    color: calendarTheme.goldBright,
    borderWidth: 1,
    borderColor: 'rgba(211,171,104,0.28)',
    minWidth: 44,
  },
  loadButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  loadButtonDisabled: {
    opacity: 0.6,
  },
  loadButtonGradient: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  loadButtonText: {
    color: calendarTheme.pine,
    fontSize: 17,
    fontWeight: '700',
  },
  purchaseContainer: {
    marginTop: 26,
    alignItems: 'center',
  },
  purchaseText: {
    fontSize: 14,
    color: 'rgba(243,232,210,0.65)',
    marginBottom: 10,
  },
  purchaseButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: calendarTheme.gold,
    paddingVertical: 10,
    paddingHorizontal: 22,
  },
  purchaseButtonText: {
    color: calendarTheme.goldBright,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  calendarSection: {
    gap: 18,
  },
  beforeDecemberInfo: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  beforeDecemberLogo: {
    width: 88,
    height: 88,
    marginBottom: 12,
  },
  beforeDecemberTitle: {
    fontFamily: 'serif',
    fontSize: 20,
    color: calendarTheme.goldBright,
    textAlign: 'center',
    marginBottom: 10,
  },
  beforeDecemberText: {
    fontSize: 15,
    color: 'rgba(243,232,210,0.75)',
    textAlign: 'center',
    lineHeight: 22,
  },
  beforeDecemberHighlight: {
    color: calendarTheme.goldBright,
    fontWeight: '700',
  },
  unlinkButton: {
    alignSelf: 'center',
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(211,171,104,0.45)',
  },
  unlinkButtonText: {
    color: calendarTheme.gold,
    fontSize: 13,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(4, 15, 13, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: calendarTheme.cream,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontFamily: 'serif',
    fontSize: 22,
    fontWeight: '600',
    color: calendarTheme.ink,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalTask: {
    fontSize: 16,
    color: calendarTheme.ink,
    marginBottom: 22,
    textAlign: 'center',
    lineHeight: 24,
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(28,20,15,0.2)',
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: calendarTheme.ink,
    fontSize: 15,
    fontWeight: '600',
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: calendarTheme.pine,
    alignItems: 'center',
  },
  modalSingleButton: {
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: calendarTheme.pine,
    alignItems: 'center',
  },
  modalConfirmButtonText: {
    color: calendarTheme.goldBright,
    fontSize: 15,
    fontWeight: '700',
  },
});
