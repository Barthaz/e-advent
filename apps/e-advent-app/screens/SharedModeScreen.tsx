import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import BasePergaminScreen from '../components/BasePergaminScreen';
import { useProfile } from '../contexts/ProfileContext';
import {
  getCollaboration,
  inviteCollaborator,
  removeCollaborator,
  type CollaborationMember,
} from '../api/api';

interface SharedModeScreenProps {
  navigation: any;
}

export default function SharedModeScreen({ navigation }: SharedModeScreenProps) {
  const { isLoggedIn, credentials, email: myEmail } = useProfile();
  const [inviteEmail, setInviteEmail] = useState('');
  const [members, setMembers] = useState<CollaborationMember[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!credentials) return;
    setLoading(true);
    setError('');
    try {
      const data = await getCollaboration(credentials);
      setMembers(data.members || []);
      setIsOwner(data.me?.role === 'owner');
    } catch (err: any) {
      setError(err?.message || 'Nie udało się pobrać współpracy');
    } finally {
      setLoading(false);
    }
  }, [credentials]);

  useFocusEffect(
    useCallback(() => {
      if (isLoggedIn) {
        load();
      }
    }, [isLoggedIn, load])
  );

  const handleInvite = async () => {
    if (!credentials) return;
    const trimmed = inviteEmail.trim().toLowerCase();
    if (!trimmed.includes('@')) {
      setError('Podaj poprawny adres email');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const data = await inviteCollaborator(credentials, trimmed);
      setMembers(data.members || []);
      setInviteEmail('');
    } catch (err: any) {
      setError(err?.message || 'Nie udało się zaprosić');
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = (memberEmail: string) => {
    if (!credentials) return;
    const isSelf = memberEmail.toLowerCase() === (myEmail || '').toLowerCase();
    Alert.alert(
      isSelf ? 'Opuść współpracę' : 'Usuń członka',
      isSelf
        ? 'Czy na pewno chcesz opuścić grupę współpracy?'
        : `Usunąć ${memberEmail} z grupy?`,
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: isSelf ? 'Opuść' : 'Usuń',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              const result = await removeCollaborator(credentials, memberEmail);
              if (result.dissolved) {
                setMembers([]);
                setIsOwner(false);
              } else {
                setMembers(result.members || []);
              }
            } catch (err: any) {
              setError(err?.message || 'Nie udało się usunąć');
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  if (!isLoggedIn) {
    return (
      <BasePergaminScreen
        title="Współpraca"
        subtitle="Zarządzaj osobami, z którymi dzielisz święta"
      >
        <LinearGradient
          colors={['#ead5b3', '#d6b182', '#b98f5f']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <Text style={styles.infoText}>
            Aby zapraszać do współpracy, zaloguj się profilem (email + kod dostępu kalendarza).
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.getParent()?.getParent()?.navigate('Ustawienia')}
          >
            <Text style={styles.buttonText}>Przejdź do ustawień</Text>
          </TouchableOpacity>
        </LinearGradient>
      </BasePergaminScreen>
    );
  }

  return (
    <BasePergaminScreen
      title="Współpraca"
      subtitle="Zapraszaj osoby i zarządzaj grupą. Zadania oraz prezenty znajdziesz na stronie głównej."
      contentContainerStyle={styles.content}
    >
      <LinearGradient
        colors={['#ead5b3', '#d6b182', '#b98f5f']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <Text style={styles.label}>Zaproś po adresie email</Text>
        <TextInput
          value={inviteEmail}
          onChangeText={setInviteEmail}
          placeholder="email@przyklad.pl"
          placeholderTextColor="#7a5d3d"
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
          editable={!busy}
        />
        <TouchableOpacity
          style={[styles.button, busy && styles.buttonDisabled]}
          onPress={handleInvite}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Zaproś</Text>
          )}
        </TouchableOpacity>
        {!!error && <Text style={styles.errorText}>{error}</Text>}
      </LinearGradient>

      <Text style={styles.sectionTitle}>Członkowie grupy</Text>
      {loading ? (
        <ActivityIndicator color="#ead5b3" style={{ marginTop: 16 }} />
      ) : members.length === 0 ? (
        <Text style={styles.emptyText}>
          Nikogo jeszcze nie zaprosiłeś. Dodaj email, aby zacząć współpracę.
        </Text>
      ) : (
        members.map((member) => {
          const isSelf = member.email.toLowerCase() === (myEmail || '').toLowerCase();
          const canRemove =
            isSelf || (isOwner && member.role !== 'owner');
          return (
            <LinearGradient
              key={member.email}
              colors={['#ead5b3', '#d6b182', '#b98f5f']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.memberCard}
            >
              <View style={styles.memberInfo}>
                <Text style={styles.memberEmail}>{member.email}</Text>
                <Text style={styles.memberMeta}>
                  {member.role === 'owner' ? 'Właściciel' : 'Członek'}
                  {' · '}
                  {member.status === 'active' ? 'Aktywny' : 'Oczekuje (brak konta)'}
                </Text>
              </View>
              {canRemove && (
                <TouchableOpacity onPress={() => handleRemove(member.email)}>
                  <Text style={styles.removeText}>{isSelf ? 'Opuść' : 'Usuń'}</Text>
                </TouchableOpacity>
              )}
            </LinearGradient>
          );
        })
      )}
    </BasePergaminScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 30,
  },
  card: {
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(130, 97, 58, 0.35)',
    marginBottom: 18,
  },
  label: {
    color: '#5f4326',
    marginBottom: 8,
    fontSize: 14,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#5f4326',
    marginBottom: 14,
  },
  button: {
    alignSelf: 'center',
    backgroundColor: '#7c5633',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    minWidth: 120,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
  },
  errorText: {
    marginTop: 10,
    color: '#7a1f1f',
    textAlign: 'center',
    fontSize: 13,
  },
  infoText: {
    color: '#4f3720',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  sectionTitle: {
    color: '#f3e0b8',
    fontSize: 16,
    marginBottom: 10,
    fontWeight: '600',
  },
  emptyText: {
    color: '#f3e0b8',
    textAlign: 'center',
    marginTop: 8,
    fontSize: 14,
  },
  memberCard: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberInfo: {
    flex: 1,
  },
  memberEmail: {
    color: '#4f3720',
    fontSize: 15,
    fontWeight: '600',
  },
  memberMeta: {
    color: '#6e5131',
    fontSize: 12,
    marginTop: 4,
  },
  removeText: {
    color: '#7a1f1f',
    fontSize: 13,
  },
});
