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

const STORAGE_KEY = '@e_advent_gift_ideas';

type LocalIdea = {
  id: string;
  text: string;
};

export default function GiftIdeasScreen() {
  const [ideas, setIdeas] = useState<LocalIdea[]>([]);
  const [newText, setNewText] = useState('');

  const persist = async (next: LocalIdea[]) => {
    setIdeas(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (err) {
      console.error('Error saving gift ideas:', err);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setIdeas(JSON.parse(raw));
      } catch (err) {
        console.error('Error loading gift ideas:', err);
      }
    };
    load();
  }, []);

  const handleAdd = async () => {
    const text = newText.trim();
    if (!text) return;
    const next = [{ id: String(Date.now()), text }, ...ideas];
    setNewText('');
    await persist(next);
  };

  const handleDelete = async (idea: LocalIdea) => {
    await persist(ideas.filter((item) => item.id !== idea.id));
  };

  return (
    <BasePergaminScreen
      title="Lista prezentów"
      subtitle="Pomysły na prezent"
      contentContainerStyle={styles.content}
    >
      <LinearGradient
        colors={['#ead5b3', '#d6b182', '#b98f5f']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.inputCard}
      >
        <TextInput
          value={newText}
          onChangeText={setNewText}
          placeholder="Dodaj pomysł na prezent..."
          placeholderTextColor="#7a5d3d"
          style={styles.input}
        />
        <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
          <Text style={styles.addButtonText}>Dodaj</Text>
        </TouchableOpacity>
      </LinearGradient>

      {ideas.map((idea) => (
        <LinearGradient
          key={idea.id}
          colors={['#ead5b3', '#d6b182', '#b98f5f']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.ideaCard}
        >
          <Text style={styles.ideaText}>{idea.text}</Text>
          <TouchableOpacity onPress={() => handleDelete(idea)}>
            <Text style={styles.deleteText}>Usuń</Text>
          </TouchableOpacity>
        </LinearGradient>
      ))}

      {ideas.length === 0 && (
        <Text style={styles.emptyText}>Brak pomysłów. Dodaj pierwszy prezent.</Text>
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
  ideaCard: {
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ideaText: {
    flex: 1,
    color: '#4f3720',
    fontSize: 15,
    marginRight: 12,
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
