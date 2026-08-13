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
  createGiftIdea,
  deleteGiftIdea,
  getCollaboration,
  getGiftIdeas,
  type GiftIdea,
} from '../api/api';

const STORAGE_KEY = '@e_advent_gift_ideas';

type LocalIdea = {
  id: string;
  text: string;
};

type DisplayIdea = {
  id: string;
  text: string;
  shared: boolean;
  authorEmail?: string;
};

export default function GiftIdeasScreen() {
  const { isLoggedIn, credentials } = useProfile();
  const [privateIdeas, setPrivateIdeas] = useState<LocalIdea[]>([]);
  const [sharedIdeas, setSharedIdeas] = useState<GiftIdea[]>([]);
  const [hasActiveCollab, setHasActiveCollab] = useState(false);
  const [newText, setNewText] = useState('');
  const [shareMode, setShareMode] = useState<'private' | 'shared'>('private');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const persistPrivate = async (next: LocalIdea[]) => {
    setPrivateIdeas(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (err) {
      console.error('Error saving gift ideas:', err);
    }
  };

  const loadPrivate = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) setPrivateIdeas(JSON.parse(raw));
    } catch (err) {
      console.error('Error loading gift ideas:', err);
    }
  };

  const loadShared = useCallback(async () => {
    if (!credentials || !isLoggedIn) {
      setSharedIdeas([]);
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
        setSharedIdeas(await getGiftIdeas(credentials));
      } else {
        setSharedIdeas([]);
      }
    } catch (err: any) {
      setSharedIdeas([]);
      setHasActiveCollab(false);
      setError(err?.message || 'Nie udało się pobrać pomysłów');
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

  const displayIdeas: DisplayIdea[] = useMemo(() => {
    const local: DisplayIdea[] = privateIdeas.map((i) => ({
      id: i.id,
      text: i.text,
      shared: false,
    }));
    const shared: DisplayIdea[] = sharedIdeas.map((i) => ({
      id: i.id,
      text: i.text,
      shared: true,
      authorEmail: i.authorEmail,
    }));
    return [...shared, ...local];
  }, [privateIdeas, sharedIdeas]);

  const handleAdd = async () => {
    const text = newText.trim();
    if (!text) return;

    if (shareMode === 'shared') {
      if (!credentials || !hasActiveCollab) return;
      try {
        const idea = await createGiftIdea(credentials, text);
        setSharedIdeas((prev) => [idea, ...prev]);
        setNewText('');
      } catch (err: any) {
        setError(err?.message || 'Nie udało się dodać pomysłu');
      }
      return;
    }

    const next = [{ id: String(Date.now()), text }, ...privateIdeas];
    setNewText('');
    await persistPrivate(next);
  };

  const handleDelete = async (idea: DisplayIdea) => {
    if (idea.shared) {
      if (!credentials) return;
      try {
        await deleteGiftIdea(credentials, idea.id);
        setSharedIdeas((prev) => prev.filter((i) => i.id !== idea.id));
      } catch (err: any) {
        setError(err?.message || 'Nie udało się usunąć');
      }
      return;
    }
    await persistPrivate(privateIdeas.filter((i) => i.id !== idea.id));
  };

  return (
    <BasePergaminScreen
      title="Lista prezentów"
      subtitle="Pomysły na prezent — prywatne lub wspólne"
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
        <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
          <Text style={styles.addButtonText}>Dodaj</Text>
        </TouchableOpacity>
      </LinearGradient>

      {loading && <ActivityIndicator color="#ead5b3" style={{ marginBottom: 12 }} />}
      {!!error && <Text style={styles.errorText}>{error}</Text>}

      {displayIdeas.map((idea) => (
        <LinearGradient
          key={`${idea.shared ? 's' : 'p'}-${idea.id}`}
          colors={['#ead5b3', '#d6b182', '#b98f5f']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.ideaCard, idea.shared && styles.ideaCardShared]}
        >
          <View style={styles.ideaBody}>
            <View style={styles.badgeRow}>
              <MaterialIcons
                name={idea.shared ? 'group' : 'lock'}
                size={12}
                color="#6e5131"
              />
              <Text style={styles.badgeText}>
                {idea.shared ? 'Wspólne' : 'Prywatne'}
                {idea.shared && idea.authorEmail ? ` · ${idea.authorEmail}` : ''}
              </Text>
            </View>
            <Text style={styles.ideaText}>{idea.text}</Text>
          </View>
          <TouchableOpacity onPress={() => handleDelete(idea)}>
            <Text style={styles.deleteText}>Usuń</Text>
          </TouchableOpacity>
        </LinearGradient>
      ))}

      {displayIdeas.length === 0 && !loading && (
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
  ideaCard: {
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ideaCardShared: {
    borderWidth: 1.5,
    borderColor: '#5a7a4a',
  },
  ideaBody: {
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
  ideaText: {
    color: '#4f3720',
    fontSize: 15,
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
