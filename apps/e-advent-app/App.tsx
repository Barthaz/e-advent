import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, SafeAreaView, Image, ImageBackground, Animated, Easing, Modal, TouchableOpacity, Platform, Linking, BackHandler, NativeModules } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Asset } from 'expo-asset';
import * as SplashScreen from 'expo-splash-screen';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MusicProvider } from './contexts/MusicContext';
import { ProfileProvider } from './contexts/ProfileContext';
import HomeScreen from './screens/HomeScreen';
import OpenCalendarScreen from './screens/OpenCalendarScreen';
import DailyFreeTaskScreen from './screens/DailyFreeTaskScreen';
import SettingsScreen from './screens/SettingsScreen';
import SecretSantaScreen from './screens/SecretSantaScreen';
import MyTasksScreen from './screens/MyTasksScreen';
import GiftIdeasScreen from './screens/GiftIdeasScreen';
import SharedModeScreen from './screens/SharedModeScreen';
import SurpriseScreen from './screens/SurpriseScreen';
import { getMinVersion } from './api/api';
import { isVersionCompatible } from './utils/version';
import appConfig from './app.json';

// Zapobiegaj automatycznemu ukryciu splash screen
SplashScreen.preventAutoHideAsync();

if (!Text.defaultProps) {
  Text.defaultProps = {};
}

Text.defaultProps.style = [{ fontFamily: 'serif' }, Text.defaultProps.style];

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();

// Import obrazków
const logo = require('./assets/logo.png');
const appLogo = require('./assets/app_logo.png');
const backgroundImage = require('@e-advent/assets/background.png');
const windowClose = require('./assets/windows/close.png');
const windowOpen = require('./assets/windows/open.png');
const windowShine = require('./assets/windows/shine_overlay.png');

// Świąteczne wiadomości
const holidayMessages = [
  'Przygotowujemy magiczne chwile...',
  'Ładujemy świąteczne okienka...',
  'Tworzymy kalendarz adwentowy...',
  'Czekaj na niespodzianki...',
  'Święta tuż, tuż...',
];

function LoadingScreen() {
  const [loadingMessage, setLoadingMessage] = useState(holidayMessages[0]);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [rotateAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Animacja fade-in dla logo
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();

    // Animacja obrotu dla kręciołka
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Zmiana wiadomości podczas ładowania
    const messageInterval = setInterval(() => {
      setLoadingMessage((prev) => {
        const currentIndex = holidayMessages.indexOf(prev);
        const nextIndex = (currentIndex + 1) % holidayMessages.length;
        return holidayMessages[nextIndex];
      });
    }, 2000);

    return () => {
      clearInterval(messageInterval);
    };
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <SafeAreaView style={styles.loadingContainer}>
      <StatusBar style="light" />
      <ImageBackground source={backgroundImage} style={styles.loadingBackgroundImage} resizeMode="cover">
        <View style={styles.loadingOverlay} />
        {/* Logo */}
        <Animated.View style={[styles.logoContainer, { opacity: fadeAnim }]}>
          <Image 
            source={logo} 
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Treści świąteczne */}
        <View style={styles.contentContainer}>
          <Animated.Text style={[styles.holidayMessage, { opacity: fadeAnim }]}>
            {loadingMessage}
          </Animated.Text>
          
          {/* Kręciołek ładowania */}
          <Animated.View
            style={[
              styles.spinnerContainer,
              { transform: [{ rotate: spin }] },
            ]}
          >
            <View style={styles.spinnerOuter}>
              <View style={styles.spinnerInner} />
            </View>
          </Animated.View>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0f5132' },
      }}
    >
      <HomeStack.Screen name="HomeMain" component={HomeScreen} />
      <HomeStack.Screen name="DailyFreeTask" component={DailyFreeTaskScreen} />
      <HomeStack.Screen name="MyTasks" component={MyTasksScreen} />
      <HomeStack.Screen name="GiftIdeas" component={GiftIdeasScreen} />
      <HomeStack.Screen name="SharedMode" component={SharedModeScreen} />
      <HomeStack.Screen name="Surprise" component={SurpriseScreen} />
    </HomeStack.Navigator>
  );
}

function MainTabsNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#d4af37',
        tabBarInactiveTintColor: '#b08d57',
        tabBarStyle: {
          backgroundColor: '#090909',
          borderTopColor: '#c0c0c0',
          borderTopWidth: 1,
          height: 72,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: 'serif',
          fontWeight: '400',
          letterSpacing: 0.3,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: React.ComponentProps<typeof MaterialCommunityIcons>['name'] = 'home-outline';

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Kalendarz') {
            iconName = focused ? 'calendar-month' : 'calendar-month-outline';
          } else if (route.name === 'Twój Mikołaj') {
            iconName = focused ? 'gift' : 'gift-outline';
          } else if (route.name === 'Ustawienia') {
            iconName = focused ? 'cog' : 'cog-outline';
          }

          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStackNavigator} />
      <Tab.Screen name="Kalendarz" component={OpenCalendarScreen} />
      <Tab.Screen name="Twój Mikołaj" component={SecretSantaScreen} />
      <Tab.Screen name="Ustawienia" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');
  const [updateUrl, setUpdateUrl] = useState<string | null>(null);

  useEffect(() => {
    // Preload wszystkich obrazków i sprawdź wersję
    const preloadImages = async () => {
      try {
        const imagesToLoad = [
          logo,
          appLogo,
          windowClose,
          windowOpen,
          windowShine,
        ];

        const cacheImages = imagesToLoad.map((image) => {
          return Asset.fromModule(image).downloadAsync();
        });

        await Promise.all(cacheImages);
        
        // Symulacja minimalnego czasu ładowania dla lepszego UX
        await new Promise((resolve) => setTimeout(resolve, 1500));
        
        // Sprawdź wersję aplikacji
        await checkAppVersion();
        
        setIsLoading(false);
        await SplashScreen.hideAsync();
      } catch (error) {
        console.error('Error loading images:', error);
        setIsLoading(false);
        await SplashScreen.hideAsync();
      }
    };

    preloadImages();
  }, []);

  const checkAppVersion = async () => {
    try {
      const currentVersion = appConfig.expo.version;
      console.log('[App] Aktualna wersja aplikacji:', currentVersion);
      
      const minVersionData = await getMinVersion();
      const minVersion = minVersionData.minVersion;
      console.log('[App] Minimalna wymagana wersja:', minVersion);
      
      if (!isVersionCompatible(currentVersion, minVersion)) {
        console.log('[App] Wersja aplikacji jest za stara, wymagana aktualizacja');
        setUpdateMessage(minVersionData.message || `Wymagana jest aktualizacja aplikacji do wersji ${minVersion} lub nowszej.`);
        setUpdateUrl(minVersionData.updateUrl || null);
        setShowUpdateModal(true);
      } else {
        console.log('[App] Wersja aplikacji jest zgodna');
      }
    } catch (error) {
      console.error('[App] Błąd podczas sprawdzania wersji:', error);
      // W przypadku błędu, nie blokuj aplikacji - pozwól działać
    }
  };

  const handleDownloadUpdate = async () => {
    const apkUrl = 'https://e-advent.pl/download/e-advent.apk';
    try {
      const canOpen = await Linking.canOpenURL(apkUrl);
      if (canOpen) {
        await Linking.openURL(apkUrl);
      } else {
        console.error('[App] Nie można otworzyć linku do APK');
      }
    } catch (error) {
      console.error('[App] Błąd podczas otwierania linku do APK:', error);
    }
  };

  const handleCloseApp = () => {
    if (Platform.OS === 'android') {
      // Wymuś całkowite zamknięcie aplikacji używając natywnego modułu
      try {
        const { ExitApp } = NativeModules;
        if (ExitApp && ExitApp.exitApp) {
          ExitApp.exitApp()
            .then(() => {
              console.log('[App] Aplikacja zamknięta');
            })
            .catch((error: any) => {
              console.error('[App] Błąd podczas zamykania aplikacji:', error);
              // Fallback do BackHandler.exitApp()
              BackHandler.exitApp();
            });
        } else {
          // Fallback do BackHandler.exitApp() jeśli moduł nie jest dostępny
          BackHandler.exitApp();
        }
      } catch (error) {
        console.error('[App] Błąd podczas zamykania aplikacji:', error);
        // Fallback do BackHandler.exitApp()
        BackHandler.exitApp();
      }
    } else {
      // Dla iOS nie ma oficjalnego sposobu na zamknięcie aplikacji
      // Apple nie zaleca zamykania aplikacji programowo
      // W tym przypadku użytkownik musi zamknąć aplikację ręcznie
      console.log('[App] Na iOS aplikacja nie może być zamknięta programowo');
      alert('Aby zamknąć aplikację, użyj gestu zamknięcia systemu iOS (przesuń w górę z dolnej krawędzi ekranu).');
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <MusicProvider>
      <ProfileProvider>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#0f5132' },
          }}
        >
          <Stack.Screen name="MainTabs" component={MainTabsNavigator} />
        </Stack.Navigator>
      </NavigationContainer>

      {/* Modal aktualizacji */}
      <Modal
        visible={showUpdateModal}
        transparent
        animationType="fade"
        onRequestClose={() => {}} // Nie pozwól zamknąć modalu - aktualizacja jest wymagana
      >
        <View style={styles.updateModalOverlay}>
          <View style={styles.updateModalContent}>
            <Text style={styles.updateModalTitle}>🔄 Wymagana aktualizacja</Text>
            <Text style={styles.updateModalMessage}>{updateMessage}</Text>
            
            {/* Główny przycisk CTA */}
            <TouchableOpacity
              style={styles.updateModalButton}
              onPress={handleDownloadUpdate}
            >
              <LinearGradient
                colors={['#f4d03f', '#d4af37']}
                style={styles.updateModalButtonGradient}
              >
                <Text style={styles.updateModalButtonText}>Pobierz aktualizację</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Mniejszy przycisk Zamknij */}
            <TouchableOpacity
              style={styles.updateModalCloseButton}
              onPress={handleCloseApp}
            >
              <Text style={styles.updateModalCloseButtonText}>Zamknij</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      </ProfileProvider>
    </MusicProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#050505',
  },
  loadingBackgroundImage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  logoContainer: {
    marginBottom: 40,
  },
  logo: {
    width: 200,
    height: 200,
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  holidayMessage: {
    fontSize: 20,
    color: '#f4d03f',
    fontWeight: '600',
    marginBottom: 30,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  spinnerContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinnerOuter: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 4,
    borderColor: '#f4d03f',
    borderTopColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinnerInner: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 3,
    borderColor: 'transparent',
    borderRightColor: '#d4af37',
  },
  updateModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  updateModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  updateModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f5132',
    marginBottom: 16,
    textAlign: 'center',
  },
  updateModalMessage: {
    fontSize: 18,
    color: '#333',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 26,
  },
  updateModalButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  updateModalButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  updateModalButtonText: {
    color: '#0f5132',
    fontSize: 16,
    fontWeight: 'bold',
  },
  updateModalCloseButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  updateModalCloseButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
});
