import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
  Image,
  ImageBackground,
  Animated,
  Easing,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import ChristmasCountdown from '../components/ChristmasCountdown';
import DecemberQuoteCard from '../components/DecemberQuoteCard';
import HomeFeatureCards from '../components/HomeFeatureCards';
import { useProfile } from '../contexts/ProfileContext';
import { getSharedTasks } from '../api/api';

const backgroundImage = require('@e-advent/assets/background.png');
const PRIVATE_TASKS_KEY = '@e_advent_my_tasks';

interface HomeScreenProps {
  navigation: any;
}

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { credentials, isLoggedIn } = useProfile();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [openTaskCount, setOpenTaskCount] = useState(0);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const refreshTaskCount = useCallback(async () => {
    let privateOpen = 0;
    try {
      const raw = await AsyncStorage.getItem(PRIVATE_TASKS_KEY);
      if (raw) {
        const tasks = JSON.parse(raw) as Array<{ done?: boolean }>;
        privateOpen = tasks.filter((t) => !t.done).length;
      }
    } catch {
      // ignore
    }

    let sharedOpen = 0;
    if (isLoggedIn && credentials) {
      try {
        const shared = await getSharedTasks(credentials);
        sharedOpen = shared.filter((t) => !t.done).length;
      } catch {
        // ignore — no collab or offline
      }
    }

    setOpenTaskCount(privateOpen + sharedOpen);
  }, [credentials, isLoggedIn]);

  useFocusEffect(
    useCallback(() => {
      refreshTaskCount();
    }, [refreshTaskCount])
  );

  const handlePressFeature = (key: 'tasks' | 'gifts' | 'shared' | 'surprise') => {
    if (key === 'tasks') {
      navigation.navigate('MyTasks');
      return;
    }
    if (key === 'gifts') {
      navigation.navigate('GiftIdeas');
      return;
    }
    if (key === 'shared') {
      navigation.navigate('SharedMode');
      return;
    }
    navigation.navigate('Surprise');
  };

  const tasksSubtitle =
    openTaskCount === 1
      ? '1 zadanie do zrobienia'
      : openTaskCount > 1 && openTaskCount < 5
        ? `${openTaskCount} zadania do zrobienia`
        : `${openTaskCount} zadań do zrobienia`;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      <ImageBackground source={backgroundImage} style={styles.backgroundImage} resizeMode="cover">
        <View style={styles.texturedOverlay} />

        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.topContent}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../assets/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <ChristmasCountdown />
          </View>

          <View style={styles.spacer} />
          <DecemberQuoteCard />
          <HomeFeatureCards
            onPressItem={handlePressFeature}
            tasksSubtitle={tasksSubtitle}
          />
        </Animated.View>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
  },
  texturedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.1,
    backgroundColor: '#0f5132',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    zIndex: 2,
  },
  topContent: {
    width: '100%',
  },
  spacer: {
    flex: 1,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  logo: {
    width: 180,
    height: 180,
  },
});
