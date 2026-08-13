import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BasePergaminScreen from '../components/BasePergaminScreen';

const DAILY_TASK_OPENED_KEY = '@e_advent_daily_task_opened_date_';

interface DailyTask {
  day: number;
  task: string;
}

const DAILY_TASKS: DailyTask[] = [
  { day: 1, task: 'Posłuchaj swojej ulubionej świątecznej piosenki' },
  { day: 2, task: 'Zapal świeczkę i ciesz się jej blaskiem' },
  { day: 3, task: 'Przeczytaj rozdział z ulubionej książki' },
  { day: 4, task: 'Zjedz coś, co naprawdę lubisz.' },
  { day: 5, task: 'Zrób sobie gorącą herbatę i odpocznij' },
  { day: 6, task: 'Zaobserwuj zachód słońca lub gwiazdy' },
  { day: 7, task: 'Zadzwoń do bliskiej osoby' },
  { day: 8, task: 'Obejrzyj ulubiony film świąteczny' },
  { day: 9, task: 'Medytuj przez 5 minut lub oddychaj głęboko' },
  { day: 10, task: 'Wypij ciepły napój przy oknie' },
  { day: 11, task: 'Posłuchaj audiobooka lub podcastu' },
  { day: 12, task: 'Zapisz 3 rzeczy, za które jesteś wdzięczny' },
  { day: 13, task: 'Poczytaj świąteczne opowiadanie' },
  { day: 14, task: 'Zrób sobie przerwę i idź na krótki spacer' },
  { day: 15, task: 'Zaobserwuj światło dzienne lub wieczorne' },
  { day: 16, task: 'Posłuchaj dźwięków natury lub świątecznej muzyki' },
  { day: 17, task: 'Zapisz ulubione wspomnienie z dzieciństwa' },
  { day: 18, task: 'Posłuchaj jednej piosenki w pełnym skupieniu.' },
  { day: 19, task: 'Obejrzyj krótki film na YouTube o świętach' },
  { day: 20, task: 'Przeczytaj poezję lub cytaty świąteczne' },
  { day: 21, task: 'Zadzwoń do przyjaciela i porozmawiaj' },
  { day: 22, task: 'Posłuchaj podcastu o magii świąt' },
  { day: 23, task: 'Zapisz życzenia na następny rok' },
  { day: 24, task: 'Ciesz się chwilą - święta są już tu!' },
];

export default function DailyFreeTaskScreen() {
  const [currentDay, setCurrentDay] = useState<number | null>(null);
  const [isOpened, setIsOpened] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<DailyTask | null>(null);

  useEffect(() => {
    checkDailyTask();
  }, []);

  const checkDailyTask = async () => {
    const now = new Date();
    const month = now.getMonth(); // 0-11, grudzień to 11
    const day = now.getDate();

    // Sprawdź czy jest grudzień i dzień jest między 1 a 24
    if (month === 11 && day >= 1 && day <= 24) {
      setCurrentDay(day);
      
      // Sprawdź czy zadanie na dzisiaj zostało już otwarte
      // Użyj lokalnej daty zamiast UTC
      const todayYear = now.getFullYear();
      const todayMonth = now.getMonth();
      const todayDate = now.getDate();
      const todayStr = `${todayYear}-${String(todayMonth + 1).padStart(2, '0')}-${String(todayDate).padStart(2, '0')}`;
      const openedKey = `${DAILY_TASK_OPENED_KEY}${todayStr}`;
      try {
        const opened = await AsyncStorage.getItem(openedKey);
        if (opened === 'true') {
          setIsOpened(true);
        } else {
          // Automatycznie otwórz dzisiejsze zadanie jeśli nie zostało jeszcze otwarte
          await autoOpenTodayTask(day, todayStr);
        }
      } catch (error) {
        console.error('Error checking daily task:', error);
      }
    } else {
      setCurrentDay(null);
    }
  };

  const autoOpenTodayTask = async (day: number, todayStr: string) => {
    const task = DAILY_TASKS.find(t => t.day === day);
    if (!task) return;

    const openedKey = `${DAILY_TASK_OPENED_KEY}${todayStr}`;
    
    try {
      await AsyncStorage.setItem(openedKey, 'true');
      setIsOpened(true);
      setSelectedTask(task);
      setShowTaskModal(true);
    } catch (error) {
      console.error('Error auto-opening daily task:', error);
    }
  };

  const handleOpenTask = async () => {
    if (currentDay === null || isOpened) return;

    const task = DAILY_TASKS.find(t => t.day === currentDay);
    if (!task) return;

    // Zapisz że zadanie zostało otwarte dzisiaj
    // Użyj lokalnej daty zamiast UTC
    const now = new Date();
    const todayYear = now.getFullYear();
    const todayMonth = now.getMonth();
    const todayDate = now.getDate();
    const todayStr = `${todayYear}-${String(todayMonth + 1).padStart(2, '0')}-${String(todayDate).padStart(2, '0')}`;
    const openedKey = `${DAILY_TASK_OPENED_KEY}${todayStr}`;
    
    try {
      await AsyncStorage.setItem(openedKey, 'true');
      setIsOpened(true);
      setSelectedTask(task);
      setShowTaskModal(true);
    } catch (error) {
      console.error('Error saving daily task:', error);
    }
  };

  const handleViewTask = () => {
    if (currentDay === null) return;
    const task = DAILY_TASKS.find(t => t.day === currentDay);
    if (task) {
      setSelectedTask(task);
      setShowTaskModal(true);
    }
  };

  const getCurrentTask = (): DailyTask | null => {
    if (currentDay === null) return null;
    return DAILY_TASKS.find(t => t.day === currentDay) || null;
  };

  const canOpenTask = (): boolean => {
    const now = new Date();
    const month = now.getMonth();
    const day = now.getDate();
    return month === 11 && day >= 1 && day <= 24;
  };

  const currentTask = getCurrentTask();

  return (
    <BasePergaminScreen
      title="Codzienne darmowe zadanie"
      subtitle="Otwórz dzisiejsze zadanie i buduj świąteczny nastrój"
      contentContainerStyle={styles.scrollContent}
    >

          {/* Zawartość */}
          <View style={styles.content}>
            {!canOpenTask() ? (
              <View style={styles.infoBox}>
                <Text style={styles.infoIcon}>⏰</Text>
                <Text style={styles.infoText}>
                  Codzienne zadania będą dostępne od 1 grudnia
                </Text>
              </View>
            ) : currentDay === null ? (
              <View style={styles.infoBox}>
                <Text style={styles.infoIcon}>📅</Text>
                <Text style={styles.infoText}>
                  Dzisiaj nie ma dostępnego zadania. Zadania są dostępne od 1 do 24 grudnia.
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.dayInfo}>
                  <Text style={styles.dayNumber}>{currentDay}</Text>
                  <Text style={styles.dayLabel}>grudnia</Text>
                </View>

                {isOpened ? (
                  <View style={styles.openedContainer}>
                    <Text style={styles.openedIcon}>✅</Text>
                    <Text style={styles.openedText}>
                      Dzisiejsze zadanie zostało już otwarte!
                    </Text>
                    <TouchableOpacity
                      style={styles.viewButton}
                      onPress={handleViewTask}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={['#f4d03f', '#d4af37']}
                        style={styles.viewButtonGradient}
                      >
                        <Text style={styles.viewButtonText}>Zobacz zadanie</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.taskContainer}>
                    <Text style={styles.taskPrompt}>
                      Kliknij poniżej, aby otworzyć dzisiejsze zadanie:
                    </Text>
                    <TouchableOpacity
                      style={styles.openButton}
                      onPress={handleOpenTask}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={['#c41e3a', '#a0172d']}
                        style={styles.openButtonGradient}
                      >
                        <Text style={styles.openButtonIcon}>🎁</Text>
                        <Text style={styles.openButtonText}>Otwórz zadanie</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>

          {/* Modal z zadaniem */}
          <Modal
            visible={showTaskModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowTaskModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                {selectedTask && (
                  <>
                    <Text style={styles.modalTitle}>
                      Dzień {selectedTask.day} grudnia
                    </Text>
                    <Text style={styles.modalTask}>{selectedTask.task}</Text>
                    <TouchableOpacity
                      style={styles.modalCloseButton}
                      onPress={() => setShowTaskModal(false)}
                    >
                      <LinearGradient
                        colors={['#f4d03f', '#d4af37']}
                        style={styles.modalCloseButtonGradient}
                      >
                        <Text style={styles.modalCloseButtonText}>Zamknij</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </Modal>
    </BasePergaminScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 42,
    paddingBottom: 40,
  },
  content: {
    alignItems: 'center',
    backgroundColor: 'rgba(234, 213, 179, 0.9)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(130, 97, 58, 0.35)',
  },
  infoBox: {
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(130, 97, 58, 0.35)',
    alignItems: 'center',
    width: '100%',
  },
  infoIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 16,
    color: '#6e5131',
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 24,
  },
  dayInfo: {
    alignItems: 'center',
    marginBottom: 30,
  },
  dayNumber: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#f4d03f',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  dayLabel: {
    fontSize: 24,
    color: '#6e5131',
    fontWeight: '600',
    marginTop: 8,
  },
  openedContainer: {
    alignItems: 'center',
    width: '100%',
  },
  openedIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  openedText: {
    fontSize: 18,
    color: '#6e5131',
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '600',
  },
  viewButton: {
    borderRadius: 16,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 300,
  },
  viewButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  viewButtonText: {
    color: '#0f5132',
    fontSize: 18,
    fontWeight: 'bold',
  },
  taskContainer: {
    alignItems: 'center',
    width: '100%',
  },
  taskPrompt: {
    fontSize: 18,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '500',
    lineHeight: 26,
  },
  openButton: {
    borderRadius: 16,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  openButtonGradient: {
    paddingVertical: 20,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  openButtonIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  openButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f5132',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalTask: {
    fontSize: 18,
    color: '#333',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 26,
  },
  modalCloseButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalCloseButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#0f5132',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

