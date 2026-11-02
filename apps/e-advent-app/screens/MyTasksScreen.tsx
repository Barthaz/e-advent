import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BasePergaminScreen from '../components/BasePergaminScreen';

const STORAGE_KEY = '@e_advent_my_tasks';

type LocalTask = {
  id: string;
  text: string;
  done: boolean;
};

export default function MyTasksScreen() {
  const [tasks, setTasks] = useState<LocalTask[]>([]);
  const [newTaskText, setNewTaskText] = useState('');

  const persist = async (next: LocalTask[]) => {
    setTasks(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (err) {
      console.error('Error saving tasks:', err);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setTasks(JSON.parse(raw));
      } catch (err) {
        console.error('Error loading tasks:', err);
      }
    };
    load();
  }, []);

  const handleAddTask = async () => {
    const text = newTaskText.trim();
    if (!text) return;
    const next = [{ id: String(Date.now()), text, done: false }, ...tasks];
    setNewTaskText('');
    await persist(next);
  };

  const handleToggleTask = async (task: LocalTask) => {
    const next = tasks.map((item) =>
      item.id === task.id ? { ...item, done: !item.done } : item
    );
    await persist(next);
  };

  const handleDeleteTask = async (task: LocalTask) => {
    await persist(tasks.filter((item) => item.id !== task.id));
  };

  return (
    <BasePergaminScreen
      title="Moje zadania"
      subtitle="Lista rzeczy do zrobienia w tym sezonie"
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
        <TouchableOpacity style={styles.addButton} onPress={handleAddTask}>
          <Text style={styles.addButtonText}>Dodaj</Text>
        </TouchableOpacity>
      </LinearGradient>

      {tasks.map((task) => (
        <LinearGradient
          key={task.id}
          colors={['#ead5b3', '#d6b182', '#b98f5f']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.taskCard}
        >
          <TouchableOpacity onPress={() => handleToggleTask(task)} style={styles.checkbox}>
            <Text style={styles.checkboxMark}>{task.done ? '✓' : ''}</Text>
          </TouchableOpacity>
          <Text style={[styles.taskText, task.done && styles.taskTextDone]}>{task.text}</Text>
          <TouchableOpacity onPress={() => handleDeleteTask(task)}>
            <Text style={styles.deleteText}>Usuń</Text>
          </TouchableOpacity>
        </LinearGradient>
      ))}

      {tasks.length === 0 && (
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
  taskText: {
    flex: 1,
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
});
