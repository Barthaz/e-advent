import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import BasePergaminScreen from '../components/BasePergaminScreen';
import { useProfile } from '../contexts/ProfileContext';
import {
  createSharedTask,
  deleteSharedTask,
  getCollaboration,
  getSharedTasks,
  updateSharedTask,
  type SharedTask,
} from '../api/api';

const STORAGE_KEY = '@e_advent_my_tasks';

type LocalTask = {
  id: string;
  text: string;
  done: boolean;
};

type DisplayTask = {
  id: string;
  text: string;
  done: boolean;
  shared: boolean;
  authorEmail?: string;
};

export default function MyTasksScreen() {
  const { isLoggedIn, credentials } = useProfile();
  const [privateTasks, setPrivateTasks] = useState<LocalTask[]>([]);
  const [sharedTasks, setSharedTasks] = useState<SharedTask[]>([]);
  const [hasActiveCollab, setHasActiveCollab] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [shareMode, setShareMode] = useState<'private' | 'shared'>('private');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const persistPrivate = async (next: LocalTask[]) => {
    setPrivateTasks(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (err) {
      console.error('Error saving tasks:', err);
    }
  };

  const loadPrivate = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) setPrivateTasks(JSON.parse(raw));
    } catch (err) {
      console.error('Error loading tasks:', err);
    }
  };

  const loadShared = useCallback(async () => {
    if (!credentials || !isLoggedIn) {
      setSharedTasks([]);
      setHasActiveCollab(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const collab = await getCollaboration(credentials);
      const canShare = !!collab.collaboration && collab.me?.status === 'active';
      setHasActiveCollab(canShare);

      if (canShare) {
        const tasks = await getSharedTasks(credentials);
        setSharedTasks(tasks);
      } else {
        setSharedTasks([]);
      }
    } catch (err: any) {
      setSharedTasks([]);
      setHasActiveCollab(false);
      setError(err?.message || 'Nie udało się pobrać wspólnych zadań');
    } finally {
      setLoading(false);
    }
  }, [credentials, isLoggedIn]);

  useEffect(() => {
    loadPrivate();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadShared();
    }, [loadShared])
  );

  useEffect(() => {
    if (shareMode === 'shared' && !hasActiveCollab) {
      setShareMode('private');
    }
  }, [hasActiveCollab, shareMode]);

  const displayTasks: DisplayTask[] = useMemo(() => {
    const local: DisplayTask[] = privateTasks.map((t) => ({
      id: t.id,
      text: t.text,
      done: t.done,
      shared: false,
    }));
    const shared: DisplayTask[] = sharedTasks.map((t) => ({
      id: t.id,
      text: t.text,
      done: t.done,
      shared: true,
      authorEmail: t.authorEmail,
    }));
    return [...shared, ...local];
  }, [privateTasks, sharedTasks]);

  const handleAddTask = async () => {
    const text = newTaskText.trim();
    if (!text) return;

    if (shareMode === 'shared') {
      if (!credentials || !hasActiveCollab) return;
      try {
        const task = await createSharedTask(credentials, text);
        setSharedTasks((prev) => [task, ...prev]);
        setNewTaskText('');
      } catch (err: any) {
        setError(err?.message || 'Nie udało się dodać zadania');
      }
      return;
    }

    const next = [{ id: String(Date.now()), text, done: false }, ...privateTasks];
    setNewTaskText('');
    await persistPrivate(next);
  };

  const handleToggleTask = async (task: DisplayTask) => {
    if (task.shared) {
      if (!credentials) return;
      try {
        const updated = await updateSharedTask(credentials, task.id, { done: !task.done });
        setSharedTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      } catch (err: any) {
        setError(err?.message || 'Nie udało się zaktualizować');
      }
      return;
    }
    const next = privateTasks.map((t) =>
      t.id === task.id ? { ...t, done: !t.done } : t
    );
    await persistPrivate(next);
  };

  const handleDeleteTask = async (task: DisplayTask) => {
    if (task.shared) {
      if (!credentials) return;
      try {
        await deleteSharedTask(credentials, task.id);
        setSharedTasks((prev) => prev.filter((t) => t.id !== task.id));
      } catch (err: any) {
        setError(err?.message || 'Nie udało się usunąć');
      }
      return;
    }
    await persistPrivate(privateTasks.filter((t) => t.id !== task.id));
  };

  return (
    <BasePergaminScreen
      title="Moje zadania"
      subtitle="Prywatne na urządzeniu oraz wspólne z współpracy"
      contentContainerStyle={styles.content}
    >
      <LinearGradient
        colors={['#ead5b3', '#d6b182', '#b98f5f']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.inputCard}
      >
        <TextInput
          value={newTaskText}
          onChangeText={setNewTaskText}
          placeholder="Dodaj nowe zadanie..."
          placeholderTextColor="#7a5d3d"
          style={styles.input}
        />
        <View style={styles.shareRow}>
          <TouchableOpacity
            style={[styles.shareChip, shareMode === 'private' && styles.shareChipActive]}
            onPress={() => setShareMode('private')}
          >
            <MaterialIcons name="lock" size={14} color={shareMode === 'private' ? '#fff' : '#5f4326'} />
            <Text style={[styles.shareChipText, shareMode === 'private' && styles.shareChipTextActive]}>
              Prywatne
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.shareChip,
              shareMode === 'shared' && styles.shareChipActive,
              !hasActiveCollab && styles.shareChipDisabled,
            ]}
            onPress={() => hasActiveCollab && setShareMode('shared')}
            disabled={!hasActiveCollab}
          >
            <MaterialIcons
              name="group"
              size={14}
              color={shareMode === 'shared' ? '#fff' : '#5f4326'}
            />
            <Text style={[styles.shareChipText, shareMode === 'shared' && styles.shareChipTextActive]}>
              Udostępnione
            </Text>
          </TouchableOpacity>
        </View>
        {!hasActiveCollab && (
          <Text style={styles.hint}>
            Udostępnianie wymaga aktywnej współpracy (zakładka Współpraca).
          </Text>
        )}
        <TouchableOpacity style={styles.addButton} onPress={handleAddTask}>
          <Text style={styles.addButtonText}>Dodaj</Text>
        </TouchableOpacity>
      </LinearGradient>

      {loading && <ActivityIndicator color="#ead5b3" style={{ marginBottom: 12 }} />}
      {!!error && <Text style={styles.errorText}>{error}</Text>}

      {displayTasks.map((task) => (
        <LinearGradient
          key={`${task.shared ? 's' : 'p'}-${task.id}`}
          colors={['#ead5b3', '#d6b182', '#b98f5f']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.taskCard, task.shared && styles.taskCardShared]}
        >
          <TouchableOpacity onPress={() => handleToggleTask(task)} style={styles.checkbox}>
            <Text style={styles.checkboxMark}>{task.done ? '✓' : ''}</Text>
          </TouchableOpacity>
          <View style={styles.taskBody}>
            <View style={styles.badgeRow}>
              <MaterialIcons
                name={task.shared ? 'group' : 'lock'}
                size={12}
                color="#6e5131"
              />
              <Text style={styles.badgeText}>
                {task.shared ? 'Wspólne' : 'Prywatne'}
                {task.shared && task.authorEmail ? ` · ${task.authorEmail}` : ''}
              </Text>
            </View>
            <Text style={[styles.taskText, task.done && styles.taskTextDone]}>{task.text}</Text>
          </View>
          <TouchableOpacity onPress={() => handleDeleteTask(task)}>
            <Text style={styles.deleteText}>Usuń</Text>
          </TouchableOpacity>
        </LinearGradient>
      ))}

      {displayTasks.length === 0 && !loading && (
        <Text style={styles.emptyText}>Brak zadań. Dodaj pierwsze zadanie.</Text>
      )}
    </BasePergaminScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 30,
  },
  inputCard: {
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#5f4326',
    marginBottom: 10,
  },
  shareRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  shareChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  shareChipActive: {
    backgroundColor: '#7c5633',
  },
  shareChipDisabled: {
    opacity: 0.45,
  },
  shareChipText: {
    color: '#5f4326',
    fontSize: 12,
  },
  shareChipTextActive: {
    color: '#fff',
  },
  hint: {
    fontSize: 12,
    color: '#6e5131',
    marginBottom: 8,
  },
  addButton: {
    alignSelf: 'flex-end',
    backgroundColor: '#7c5633',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  taskCard: {
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskCardShared: {
    borderWidth: 1.5,
    borderColor: '#5a7a4a',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#7c5633',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  checkboxMark: {
    color: '#5f4326',
    fontSize: 13,
  },
  taskBody: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  badgeText: {
    fontSize: 11,
    color: '#6e5131',
  },
  taskText: {
    color: '#4f3720',
    fontSize: 15,
  },
  taskTextDone: {
    textDecorationLine: 'line-through',
    opacity: 0.7,
  },
  deleteText: {
    color: '#7a1f1f',
    fontSize: 13,
  },
  emptyText: {
    color: '#f3e0b8',
    textAlign: 'center',
    marginTop: 18,
    fontSize: 14,
  },
  errorText: {
    color: '#f3c1c1',
    textAlign: 'center',
    marginBottom: 10,
    fontSize: 13,
  },
});
