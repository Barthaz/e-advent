import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  Switch,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Linking,
} from 'react-native';
// @ts-ignore - @expo/vector-icons is available in Expo
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMusic } from '../contexts/MusicContext';
import { useProfile } from '../contexts/ProfileContext';
import { ORDER_CALENDAR_URL } from '../api/api';
import appConfig from '../app.json';
import BasePergaminScreen from '../components/BasePergaminScreen';

interface SettingsScreenProps {
  navigation: any;
}

export default function SettingsScreen(_props: SettingsScreenProps) {
  const { isMusicEnabled, toggleMusic } = useMusic();
  const { isLoggedIn, email, isLoading, login, logout } = useProfile();
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [profileError, setProfileError] = useState('');
  const codeInputRefs = useRef<(TextInput | null)[]>([]);

  const version = appConfig.expo.version;

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) {
      const sanitized = value.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
      const newCode = ['', '', '', '', '', ''];
      for (let i = 0; i < 6 && i < sanitized.length; i++) {
        newCode[i] = sanitized[i];
      }
      setCode(newCode);
      return;
    }
    const sanitizedValue = value.replace(/[^0-9A-Za-z]/g, '').toUpperCase().slice(0, 1);
    const newCode = [...code];
    newCode[index] = sanitizedValue;
    setCode(newCode);
    if (sanitizedValue && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    }
  };

  const handleLogin = async () => {
    setProfileError('');
    if (!loginEmail.trim().includes('@')) {
      setProfileError('Podaj poprawny adres email');
      return;
    }
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      setProfileError('Kod dostępu musi mieć 6 znaków');
      return;
    }
    try {
      await login(loginEmail.trim(), fullCode);
      setLoginEmail('');
      setCode(['', '', '', '', '', '']);
    } catch (error: any) {
      setProfileError(error?.message || 'Nie udało się zalogować');
    }
  };

  return (
    <BasePergaminScreen
      title="Ustawienia"
      subtitle="Skonfiguruj aplikację po swojemu"
      contentContainerStyle={styles.scrollContent}
    >

          {/* Profil */}
          <View style={styles.sectionCard}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Profil</Text>
              {isLoggedIn ? (
                <>
                  <View style={styles.infoItem}>
                    <View style={styles.infoLabelContainer}>
                      <MaterialIcons name="person" size={18} color="#7c5633" style={styles.infoIcon} />
                      <Text style={styles.infoLabel}>Zalogowano jako</Text>
                    </View>
                    <Text style={styles.infoValue}>{email}</Text>
                    <Text style={styles.profileHint}>Połączono z kalendarzem adwentowym</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.documentButton}
                    onPress={() => logout()}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={['#7c5633', '#5f4326']}
                      style={styles.documentButtonGradient}
                    >
                      <MaterialIcons name="logout" size={24} color="#ead5b3" style={styles.documentButtonIcon} />
                      <Text style={styles.documentButtonText}>Wyloguj</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.profileHint}>
                    Zaloguj się emailem i kodem dostępu z zamówionego kalendarza.
                  </Text>
                  <TextInput
                    style={styles.profileInput}
                    value={loginEmail}
                    onChangeText={setLoginEmail}
                    placeholder="email@przyklad.pl"
                    placeholderTextColor="#7a5d3d"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!isLoading}
                  />
                  <View style={styles.codeRow}>
                    {code.map((digit, index) => (
                      <TextInput
                        key={index}
                        ref={(ref) => {
                          codeInputRefs.current[index] = ref;
                        }}
                        style={styles.codeBox}
                        value={digit}
                        onChangeText={(v) => handleCodeChange(index, v)}
                        autoCapitalize="characters"
                        maxLength={1}
                        editable={!isLoading}
                      />
                    ))}
                  </View>
                  {!!profileError && <Text style={styles.profileError}>{profileError}</Text>}
                  <TouchableOpacity
                    style={styles.documentButton}
                    onPress={handleLogin}
                    disabled={isLoading}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={['#7c5633', '#5f4326']}
                      style={styles.documentButtonGradient}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#ead5b3" />
                      ) : (
                        <>
                          <MaterialIcons name="login" size={24} color="#ead5b3" style={styles.documentButtonIcon} />
                          <Text style={styles.documentButtonText}>Zaloguj</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => Linking.openURL(ORDER_CALENDAR_URL)}
                    style={styles.orderLink}
                  >
                    <Text style={styles.orderLinkText}>Nie masz konta? Zamów kalendarz</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          {/* Sekcja ustawień */}
          <View style={styles.sectionCard}>
          <View style={styles.section}>
            {/* Przełącznik muzyki */}
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <MaterialIcons 
                  name={isMusicEnabled ? "volume-up" : "volume-off"} 
                  size={24} 
                  color="#7c5633" 
                  style={styles.settingIcon}
                />
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>Muzyka w tle</Text>
                  <Text style={styles.settingDescription}>
                    Włącz lub wyłącz świąteczną muzykę
                  </Text>
                </View>
              </View>
              <Switch
                value={isMusicEnabled}
                onValueChange={toggleMusic}
                trackColor={{ false: '#767577', true: '#f4d03f' }}
                thumbColor={isMusicEnabled ? '#0f5132' : '#f4f4f4'}
                ios_backgroundColor="#767577"
              />
            </View>
          </View>
          </View>

          {/* Sekcja informacji */}
          <View style={styles.sectionCard}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informacje</Text>
            
            {/* Wersja */}
            <View style={styles.infoItem}>
              <View style={styles.infoLabelContainer}>
                <MaterialIcons name="info" size={18} color="#7c5633" style={styles.infoIcon} />
                <Text style={styles.infoLabel}>Wersja aplikacji</Text>
              </View>
              <Text style={styles.infoValue}>{version}</Text>
            </View>

            {/* Autor aplikacji */}
            <View style={styles.infoItem}>
              <View style={styles.infoLabelContainer}>
                <MaterialIcons name="person" size={18} color="#7c5633" style={styles.infoIcon} />
                <Text style={styles.infoLabel}>Twórca</Text>
              </View>
              <Text style={styles.infoValue}>
                inTaz Bartosz Kuligowski
              </Text>
            </View>
          </View>
          </View>

          {/* Sekcja dokumentów */}
          <View style={styles.sectionCard}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dokumenty</Text>
            
            {/* Licencja */}
            <TouchableOpacity
              style={styles.documentButton}
              onPress={() => setShowLicenseModal(true)}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#7c5633', '#5f4326']}
                style={styles.documentButtonGradient}
              >
                <MaterialIcons name="description" size={24} color="#ead5b3" style={styles.documentButtonIcon} />
                <Text style={styles.documentButtonText}>Licencja</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Prawa użytkownika */}
            <TouchableOpacity
              style={styles.documentButton}
              onPress={() => setShowTermsModal(true)}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#7c5633', '#5f4326']}
                style={styles.documentButtonGradient}
              >
                <MaterialIcons name="article" size={24} color="#ead5b3" style={styles.documentButtonIcon} />
                <Text style={styles.documentButtonText}>Prawa użytkownika</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
          </View>
        {/* Modal licencji */}
        <Modal
          visible={showLicenseModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowLicenseModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Licencja</Text>
              <ScrollView style={styles.modalScrollView}>
                <Text style={styles.modalText}>
                  <Text style={styles.modalBold}>Licencja użytkowania aplikacji e-Advent</Text>
                  {'\n\n'}
                  Copyright © {new Date().getFullYear()} inTaz Bartosz Kuligowski
                  {'\n\n'}
                  Wszelkie prawa zastrzeżone.
                  {'\n\n'}
                  Niniejsza aplikacja oraz jej zawartość są chronione prawem autorskim. 
                  Zabronione jest kopiowanie, modyfikowanie, dystrybucja lub wykorzystywanie 
                  aplikacji w jakikolwiek sposób bez pisemnej zgody właściciela praw autorskich.
                  {'\n\n'}
                  <Text style={styles.modalBold}>Warunki użytkowania:</Text>
                  {'\n\n'}
                  1. Aplikacja jest przeznaczona wyłącznie do użytku osobistego.
                  {'\n\n'}
                  2. Użytkownik zobowiązuje się nie używać aplikacji w sposób niezgodny 
                  z prawem lub w celu naruszenia praw innych osób.
                  {'\n\n'}
                  3. Właściciel aplikacji nie ponosi odpowiedzialności za jakiekolwiek 
                  szkody wynikające z użytkowania aplikacji.
                  {'\n\n'}
                  4. Właściciel zastrzega sobie prawo do modyfikacji, aktualizacji lub 
                  wycofania aplikacji w dowolnym momencie.
                  {'\n\n'}
                  <Text style={styles.modalBold}>Kontakt:</Text>
                  {'\n'}
                  Administrator danych: inTaz Bartosz Kuligowski
                  {'\n'}
                  NIP: 7812010357
                </Text>
              </ScrollView>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowLicenseModal(false)}
              >
                <LinearGradient
                  colors={['#7c5633', '#5f4326']}
                  style={styles.modalCloseButtonGradient}
                >
                  <Text style={styles.modalCloseButtonText}>Zamknij</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Modal praw użytkownika */}
        <Modal
          visible={showTermsModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowTermsModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Prawa użytkownika</Text>
              <ScrollView style={styles.modalScrollView}>
                <Text style={styles.modalText}>
                  <Text style={styles.modalBold}>Regulamin użytkowania aplikacji e-Advent</Text>
                  {'\n\n'}
                  <Text style={styles.modalBold}>1. Postanowienia ogólne</Text>
                  {'\n\n'}
                  Niniejszy regulamin określa zasady korzystania z aplikacji mobilnej 
                  e-Advent (zwanej dalej "Aplikacją"). Korzystając z Aplikacji, użytkownik 
                  akceptuje postanowienia niniejszego regulaminu.
                  {'\n\n'}
                  <Text style={styles.modalBold}>2. Administrator danych</Text>
                  {'\n\n'}
                  Administratorem danych osobowych jest:
                  {'\n'}
                  inTaz Bartosz Kuligowski
                  {'\n'}
                  NIP: 7812010357
                  {'\n\n'}
                  <Text style={styles.modalBold}>3. Prawa użytkownika</Text>
                  {'\n\n'}
                  Użytkownik ma prawo do:
                  {'\n'}
                  • Dostępu do swoich danych osobowych
                  {'\n'}
                  • Sprostowania danych osobowych
                  {'\n'}
                  • Usunięcia danych osobowych
                  {'\n'}
                  • Ograniczenia przetwarzania danych
                  {'\n'}
                  • Przenoszenia danych
                  {'\n'}
                  • Sprzeciwu wobec przetwarzania danych
                  {'\n'}
                  • Wniesienia skargi do organu nadzorczego (UODO)
                  {'\n\n'}
                  <Text style={styles.modalBold}>4. Obowiązki użytkownika</Text>
                  {'\n\n'}
                  Użytkownik zobowiązuje się:
                  {'\n'}
                  • Używać Aplikacji zgodnie z jej przeznaczeniem
                  {'\n'}
                  • Nie naruszać praw autorskich i innych praw własności intelektualnej
                  {'\n'}
                  • Nie podejmować działań mogących zakłócić działanie Aplikacji
                  {'\n'}
                  • Nie udostępniać danych dostępowych osobom trzecim
                  {'\n\n'}
                  <Text style={styles.modalBold}>5. Ochrona danych osobowych</Text>
                  {'\n\n'}
                  Administrator przetwarza dane osobowe zgodnie z Rozporządzeniem 
                  Ogólnym o Ochronie Danych (RODO). Szczegółowe informacje dotyczące 
                  przetwarzania danych znajdują się w Polityce Prywatności.
                  {'\n\n'}
                  <Text style={styles.modalBold}>6. Odpowiedzialność</Text>
                  {'\n\n'}
                  Administrator nie ponosi odpowiedzialności za:
                  {'\n'}
                  • Szkody wynikające z nieprawidłowego użytkowania Aplikacji
                  {'\n'}
                  • Utratę danych spowodowaną działaniami użytkownika
                  {'\n'}
                  • Problemy techniczne wynikające z działania urządzenia użytkownika
                  {'\n\n'}
                  <Text style={styles.modalBold}>7. Zmiany regulaminu</Text>
                  {'\n\n'}
                  Administrator zastrzega sobie prawo do wprowadzania zmian w regulaminie. 
                  O zmianach użytkownicy będą informowani poprzez aktualizację Aplikacji.
                  {'\n\n'}
                  <Text style={styles.modalBold}>8. Postanowienia końcowe</Text>
                  {'\n\n'}
                  W sprawach nieuregulowanych niniejszym regulaminem mają zastosowanie 
                  przepisy prawa polskiego.
                </Text>
              </ScrollView>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowTermsModal(false)}
              >
                <LinearGradient
                  colors={['#7c5633', '#5f4326']}
                  style={styles.modalCloseButtonGradient}
                >
                  <Text style={styles.modalCloseButtonText}>Zamknij</Text>
                </LinearGradient>
              </TouchableOpacity>
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
  sectionCard: {
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    backgroundColor: 'rgba(234, 213, 179, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(130, 97, 58, 0.35)',
  },
  section: {
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#5f4326',
    marginBottom: 16,
  },
  profileHint: {
    fontSize: 14,
    color: '#6e5131',
    marginBottom: 12,
    lineHeight: 20,
  },
  profileInput: {
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#5f4326',
    marginBottom: 10,
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 12,
  },
  codeBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 8,
    paddingVertical: 10,
    textAlign: 'center',
    color: '#5f4326',
    fontSize: 16,
    fontWeight: '600',
  },
  profileError: {
    color: '#7a1f1f',
    marginBottom: 10,
    fontSize: 13,
  },
  orderLink: {
    marginTop: 8,
    alignItems: 'center',
  },
  orderLinkText: {
    color: '#7c5633',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  settingIcon: {
    marginRight: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4f3720',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#6e5131',
  },
  infoItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  infoLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoIcon: {
    marginRight: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#7c5633',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 16,
    color: '#4f3720',
    lineHeight: 24,
  },
  documentButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  documentButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  documentButtonIcon: {
    marginRight: 12,
  },
  documentButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'rgba(234, 213, 179, 0.96)',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: 'rgba(130, 97, 58, 0.35)',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#5f4326',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalScrollView: {
    maxHeight: 400,
    marginBottom: 20,
  },
  modalText: {
    fontSize: 14,
    color: '#4f3720',
    lineHeight: 22,
  },
  modalBold: {
    fontWeight: 'bold',
    color: '#5f4326',
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
    color: '#ead5b3',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

