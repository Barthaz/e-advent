import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MUSIC_ENABLED_KEY = '@e_advent_music_enabled';
const soundSource = require('../assets/sound.mp3');

interface MusicContextType {
  isMusicEnabled: boolean;
  toggleMusic: () => void;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const [isMusicEnabled, setIsMusicEnabled] = useState(true);
  const [preferenceLoaded, setPreferenceLoaded] = useState(false);
  const player = useAudioPlayer(soundSource);

  useEffect(() => {
    const loadMusicPreference = async () => {
      try {
        const saved = await AsyncStorage.getItem(MUSIC_ENABLED_KEY);
        if (saved !== null) {
          setIsMusicEnabled(saved === 'true');
        }
        setPreferenceLoaded(true);
      } catch (error) {
        console.error('Error loading music preference:', error);
        setPreferenceLoaded(true);
      }
    };

    loadMusicPreference();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const configureAudio = async () => {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: true,
          interruptionMode: 'duckOthers',
        });

        if (cancelled) return;

        player.loop = true;
        player.volume = 0.5;
      } catch (error) {
        console.error('Error configuring audio:', error);
      }
    };

    configureAudio();

    return () => {
      cancelled = true;
    };
  }, [player]);

  useEffect(() => {
    if (!preferenceLoaded) return;

    try {
      if (isMusicEnabled) {
        player.play();
      } else {
        player.pause();
      }
    } catch (error) {
      console.error('Error controlling music:', error);
    }
  }, [isMusicEnabled, preferenceLoaded, player]);

  const toggleMusic = async () => {
    const newValue = !isMusicEnabled;
    setIsMusicEnabled(newValue);

    try {
      await AsyncStorage.setItem(MUSIC_ENABLED_KEY, String(newValue));
    } catch (error) {
      console.error('Error saving music preference:', error);
    }
  };

  return (
    <MusicContext.Provider value={{ isMusicEnabled, toggleMusic }}>
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  const context = useContext(MusicContext);
  if (context === undefined) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
}
