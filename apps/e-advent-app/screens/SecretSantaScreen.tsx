import React, { useMemo, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import BasePergaminScreen from '../components/BasePergaminScreen';

export default function SecretSantaScreen() {
  const [nameInput, setNameInput] = useState('');
  const [participants, setParticipants] = useState<string[]>([]);
  const [drawOrder, setDrawOrder] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealVisible, setIsRevealVisible] = useState(false);
  const [isAssignmentVisible, setIsAssignmentVisible] = useState(false);

  const canDraw = participants.length >= 2;

  const shuffledParticipants = useMemo(() => {
    return [...participants];
  }, [participants]);

  const handleAddParticipant = () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    if (participants.includes(trimmed)) {
      setNameInput('');
      return;
    }
    setParticipants((prev) => [...prev, trimmed]);
    setNameInput('');
  };

  const handleRemoveParticipant = (name: string) => {
    setParticipants((prev) => prev.filter((p) => p !== name));
  };

  const createDerangement = (names: string[]) => {
    if (names.length < 2) return null;

    for (let attempt = 0; attempt < 200; attempt += 1) {
      const targets = [...names];
      for (let i = targets.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [targets[i], targets[j]] = [targets[j], targets[i]];
      }

      let valid = true;
      for (let i = 0; i < names.length; i += 1) {
        if (names[i] === targets[i]) {
          valid = false;
          break;
        }
      }

      if (valid) {
        const map: Record<string, string> = {};
        for (let i = 0; i < names.length; i += 1) {
          map[names[i]] = targets[i];
        }
        return map;
      }
    }

    return null;
  };

  const handleDraw = () => {
    const drawNames = [...shuffledParticipants];
    const result = createDerangement(drawNames);
    if (!result) return;

    setAssignments(result);
    setDrawOrder(drawNames);
    setCurrentIndex(0);
    setIsAssignmentVisible(false);
    setIsRevealVisible(true);
  };

  const handleShowAssignment = () => {
    setIsAssignmentVisible(true);
  };

  const handleNextReveal = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= drawOrder.length) {
      setIsRevealVisible(false);
      setIsAssignmentVisible(false);
      return;
    }
    setCurrentIndex(nextIndex);
    setIsAssignmentVisible(false);
  };

  const currentPerson = drawOrder[currentIndex];

  return (
    <BasePergaminScreen
      title="Twój Mikołaj"
      subtitle="Dodaj uczestników i kliknij losowanie. Każdy wylosuje jedną osobę, bez powtórzeń i bez siebie."
      contentContainerStyle={styles.content}
    >
      <View style={styles.card}>
        <View style={styles.inputRow}>
          <TextInput
            value={nameInput}
            onChangeText={setNameInput}
            placeholder="Wpisz imię uczestnika"
            placeholderTextColor="#7a5d3d"
            style={styles.input}
          />
          <TouchableOpacity style={styles.addButton} onPress={handleAddParticipant}>
            <Text style={styles.addButtonText}>Dodaj</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.listBox}>
          {participants.map((name) => (
            <View key={name} style={styles.participantRow}>
              <Text style={styles.participantName}>{name}</Text>
              <TouchableOpacity onPress={() => handleRemoveParticipant(name)}>
                <Text style={styles.removeText}>Usuń</Text>
              </TouchableOpacity>
            </View>
          ))}
          {participants.length === 0 && (
            <Text style={styles.emptyText}>Dodaj min. 2 osoby do losowania.</Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.drawButton, !canDraw && styles.drawButtonDisabled]}
          onPress={handleDraw}
          disabled={!canDraw}
        >
          <Text style={styles.drawButtonText}>Rozlosuj Mikołaja</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={isRevealVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalPaper}>
            {!isAssignmentVisible ? (
              <>
                <Text style={styles.modalTitle}>Teraz sprawdź czyim jesteś Mikołajem:</Text>
                <Text style={styles.modalName}>{currentPerson}</Text>
                <TouchableOpacity style={styles.modalButton} onPress={handleShowAssignment}>
                  <Text style={styles.modalButtonText}>Zobacz</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>Jesteś Mikołajem dla:</Text>
                <Text style={styles.modalName}>{assignments[currentPerson]}</Text>
                <TouchableOpacity style={styles.modalButton} onPress={handleNextReveal}>
                  <Text style={styles.modalButtonText}>OK</Text>
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
  content: {
    paddingHorizontal: 20,
    paddingTop: 42,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: 'rgba(234, 213, 179, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(130, 97, 58, 0.35)',
    borderRadius: 18,
    padding: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    color: '#5f4326',
  },
  addButton: {
    backgroundColor: '#7c5633',
    borderRadius: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  listBox: {
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  participantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(95, 67, 38, 0.3)',
  },
  participantName: {
    color: '#4f3720',
    fontSize: 16,
  },
  removeText: {
    color: '#7a1f1f',
    fontSize: 13,
  },
  emptyText: {
    color: '#6e5131',
    textAlign: 'center',
    paddingVertical: 8,
    fontSize: 13,
  },
  drawButton: {
    backgroundColor: '#7c5633',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  drawButtonDisabled: {
    opacity: 0.5,
  },
  drawButtonText: {
    color: '#fff',
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 24,
  },
  modalPaper: {
    width: '100%',
    backgroundColor: '#ead5b3',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(130, 97, 58, 0.35)',
    alignItems: 'center',
  },
  modalTitle: {
    color: '#5f4326',
    fontSize: 22,
    textAlign: 'center',
    marginBottom: 10,
  },
  modalName: {
    color: '#4f3720',
    fontSize: 34,
    marginBottom: 18,
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: '#7c5633',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 15,
  },
});
