import React from 'react';
import { StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMusic } from '../contexts/MusicContext';

export default function MusicToggleButton() {
  const { isMusicEnabled, toggleMusic } = useMusic();
  const insets = useSafeAreaInsets();

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          top: insets.top + 10,
          right: 20,
        },
      ]}
      onPress={toggleMusic}
      activeOpacity={0.7}
    >
      <Text style={styles.icon}>
        {isMusicEnabled ? '🔊' : '🔇'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(15, 81, 50, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    borderWidth: 2,
    borderColor: '#f4d03f',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  icon: {
    fontSize: 24,
  },
});

