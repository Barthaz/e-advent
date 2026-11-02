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
  type TextInputInstance,
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
  const { isLoggedIn, email, calendar, isLoading, login, logout } = useProfile();
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [profileError, setProfileError] = useState('');
  const codeInputRefs = useRef<(TextInputInstance | null)[]>([]);

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
      subtitle="Profil z kalendarza i drobiazgi aplikacji"
      contentContainerStyle={styles.scrollContent}
    >
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <MaterialIcons name="calendar-month" size={18} color="#ead5b3" />
              </View>
              <Text style={styles.sectionTitle}>Profil kalendarza</Text>
            </View>
            {isLoggedIn ? (
              <>
                <View style={styles.profileHero}>
                  <Text style={styles.profileKicker}>Wczytany kalendarz</Text>
                  <Text style={styles.profileName}>{calendar?.title || 'Kalendarz adwentowy'}</Text>
                  <Text style={styles.profileEmail}>{email}</Text>
                </View>
                <Text style={styles.profileHint}>
                  To jest Twój profil w aplikacji — powstaje z wczytanego kalendarza i zostaje na tym urządzeniu.
                </Text>
                <TouchableOpacity
                  style={styles.outlineButton}
                  onPress={() => logout()}
                  activeOpacity={0.75}
                >
                  <MaterialIcons name="link-off" size={20} color="#5f4326" />
                  <Text style={styles.outlineButtonText}>Odłącz kalendarz</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.profileHint}>
                  Wczytaj kalendarz emailem i kodem dostępu. Na tej podstawie powstanie Twój profil.
                </Text>
                <Text style={styles.fieldLabel}>Adres email</Text>
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
                <Text style={styles.fieldLabel}>Kod dostępu</Text>
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
                  style={styles.primaryButton}
                  onPress={handleLogin}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#f6dd9e', '#d3ab68']}
                    style={styles.primaryButtonGradient}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#1c140f" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Wczytaj kalendarz</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => Linking.openURL(ORDER_CALENDAR_URL)}
                  style={styles.orderLink}
                >
                  <Text style={styles.orderLinkText}>Nie masz kalendarza? Zamów na stronie</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.settingItem}>
              <View style={styles.iconBadge}>
                <MaterialIcons
                  name={isMusicEnabled ? 'volume-up' : 'volume-off'}
                  size={20}
                  color="#5f4326"
                />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Muzyka w tle</Text>
                <Text style={styles.settingDescription}>Świąteczna melodia podczas korzystania z aplikacji</Text>
              </View>
              <Switch
                value={isMusicEnabled}
                onValueChange={toggleMusic}
                trackColor={{ false: '#c4b29a', true: '#d3ab68' }}
                thumbColor={isMusicEnabled ? '#123b32' : '#f3e8d2'}
                ios_backgroundColor="#c4b29a"
              />
            </View>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <MaterialIcons name="auto-awesome" size={18} color="#ead5b3" />
              </View>
              <Text style={styles.sectionTitle}>Informacje</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Wersja</Text>
              <Text style={styles.infoValue}>{version}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Twórca</Text>
              <Text style={styles.infoValue}>inTaz Bartosz Kuligowski</Text>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <MaterialIcons name="menu-book" size={18} color="#ead5b3" />
              </View>
              <Text style={styles.sectionTitle}>Dokumenty</Text>
            </View>
            <TouchableOpacity
              style={styles.docRow}
              onPress={() => setShowLicenseModal(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.docLabel}>Licencja</Text>
              <MaterialIcons name="chevron-right" size={22} color="#7c5633" />
            </TouchableOpacity>
            <View style={styles.infoDivider} />
            <TouchableOpacity
              style={styles.docRow}
              onPress={() => setShowTermsModal(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.docLabel}>Prawa użytkownika</Text>
              <MaterialIcons name="chevron-right" size={22} color="#7c5633" />
            </TouchableOpacity>
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
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    backgroundColor: 'rgba(243, 232, 210, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(130, 97, 58, 0.32)',
    borderLeftWidth: 3,
    borderLeftColor: '#c4a265',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#5f4326',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4f3720',
  },
  profileHero: {
    backgroundColor: 'rgba(255, 255, 255, 0.42)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(196, 162, 101, 0.45)',
  },
  profileKicker: {
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#7c5633',
    fontWeight: '700',
    marginBottom: 4,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3d2a16',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#6e5131',
  },
  profileHint: {
    fontSize: 14,
    color: '#6e5131',
    marginBottom: 14,
    lineHeight: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5f4326',
    marginBottom: 6,
  },
  profileInput: {
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(130, 97, 58, 0.28)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#3d2a16',
    marginBottom: 12,
    fontSize: 16,
  },
  codeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  codeBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(130, 97, 58, 0.28)',
    paddingVertical: 12,
    textAlign: 'center',
    color: '#3d2a16',
    fontSize: 18,
    fontWeight: '700',
  },
  profileError: {
    color: '#7a1f1f',
    marginBottom: 10,
    fontSize: 13,
  },
  primaryButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  primaryButtonGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: '#1c140f',
    fontSize: 16,
    fontWeight: '800',
  },
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(95, 67, 38, 0.45)',
    backgroundColor: 'rgba(255,255,255,0.35)',
    paddingVertical: 12,
  },
  outlineButtonText: {
    color: '#5f4326',
    fontSize: 15,
    fontWeight: '700',
  },
  orderLink: {
    marginTop: 12,
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
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(211, 171, 104, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4f3720',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: '#6e5131',
    lineHeight: 18,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 4,
  },
  infoDivider: {
    height: 1,
    backgroundColor: 'rgba(130, 97, 58, 0.18)',
    marginVertical: 10,
  },
  infoLabel: {
    fontSize: 14,
    color: '#7c5633',
    fontWeight: '600',
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: '#3d2a16',
    fontWeight: '700',
    textAlign: 'right',
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  docLabel: {
    fontSize: 16,
    color: '#3d2a16',
    fontWeight: '600',
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

