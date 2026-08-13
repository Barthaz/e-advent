import React from 'react';
import {
  ImageBackground,
  SafeAreaView,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';

const backgroundImage = require('@e-advent/assets/background.png');

interface BasePergaminScreenProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export default function BasePergaminScreen({
  title,
  subtitle,
  children,
  contentContainerStyle,
}: BasePergaminScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <ImageBackground source={backgroundImage} style={styles.backgroundImage} resizeMode="cover">
        <View style={styles.overlay} />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
        >
          <LinearGradient
            colors={['rgba(234, 213, 179, 0.96)', 'rgba(214, 177, 130, 0.9)', 'rgba(185, 143, 95, 0.88)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerCard}
          >
            <Text style={styles.title}>{title}</Text>
            {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </LinearGradient>
          {children}
        </ScrollView>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backgroundImage: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.32)',
  },
  scrollView: {
    flex: 1,
    zIndex: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 42,
    paddingBottom: 40,
  },
  headerCard: {
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(130, 97, 58, 0.35)',
  },
  title: {
    fontSize: 30,
    color: '#5f4326',
    textAlign: 'center',
    fontWeight: '600',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#6e5131',
    textAlign: 'center',
    lineHeight: 20,
  },
});
