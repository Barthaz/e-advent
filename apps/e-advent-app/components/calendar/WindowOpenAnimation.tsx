import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { calendarTheme } from './calendarTheme';

const windowClose = require('../../assets/windows/close.png');

export const ZOOM_MS = 1050;
export const FLASH_DELAY = 520;
export const FLASH_MS = 360;
/** Popup starts while gold flash is already covering the screen */
export const PANEL_DELAY = FLASH_DELAY + 160;
export const PANEL_MS = 280;

export type OpenAnimMode = 'zoom' | 'fade';

export interface WindowRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface WindowOpenAnimationProps {
  visible: boolean;
  mode: OpenAnimMode | null;
  day: number | null;
  task: string;
  duration?: number;
  sourceRect: WindowRect | null;
  onRequestClose: () => void;
}

/**
 * Full-screen Modal sequence:
 * zoom from tapped window → golden glow → flash → centered task card.
 */
export default function WindowOpenAnimation({
  visible,
  mode,
  day,
  task,
  duration,
  sourceRect,
  onRequestClose,
}: WindowOpenAnimationProps) {
  const { width: screenW, height: screenH } = Dimensions.get('window');

  const diveProgress = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(0.2)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const panelOpacity = useRef(new Animated.Value(0)).current;
  const panelTranslate = useRef(new Animated.Value(16)).current;

  const startX = sourceRect?.x ?? screenW / 2 - 40;
  const startY = sourceRect?.y ?? screenH / 2 - 40;
  const startW = Math.max(sourceRect?.width ?? 80, 40);
  const startH = Math.max(sourceRect?.height ?? 80, 40);

  const targetSize = Math.min(screenW, screenH) * 1.35;
  const targetX = (screenW - targetSize) / 2;
  const targetY = (screenH - targetSize) / 2;

  useEffect(() => {
    if (!visible || !mode || day === null) {
      diveProgress.setValue(0);
      glowOpacity.setValue(0);
      glowScale.setValue(0.2);
      flashOpacity.setValue(0);
      panelOpacity.setValue(0);
      panelTranslate.setValue(16);
      return;
    }

    if (mode === 'fade') {
      diveProgress.setValue(1);
      flashOpacity.setValue(1);
      panelOpacity.setValue(0);
      panelTranslate.setValue(12);
      Animated.parallel([
        Animated.timing(panelOpacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(panelTranslate, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    diveProgress.setValue(0);
    glowOpacity.setValue(0);
    glowScale.setValue(0.35);
    flashOpacity.setValue(0);
    panelOpacity.setValue(0);
    panelTranslate.setValue(18);

    Animated.parallel([
      Animated.timing(diveProgress, {
        toValue: 1,
        duration: ZOOM_MS,
        easing: Easing.bezier(0.63, 0.06, 0.31, 1),
        useNativeDriver: false,
      }),
      Animated.timing(glowOpacity, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(glowScale, {
        toValue: 48,
        duration: ZOOM_MS,
        easing: Easing.bezier(0.45, 0, 0.35, 1),
        useNativeDriver: true,
      }),
    ]).start();

    const flashTimer = setTimeout(() => {
      Animated.timing(flashOpacity, {
        toValue: 1,
        duration: FLASH_MS,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    }, FLASH_DELAY);

    const panelTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(panelOpacity, {
          toValue: 1,
          duration: PANEL_MS,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(panelTranslate, {
          toValue: 0,
          duration: PANEL_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, PANEL_DELAY);

    return () => {
      clearTimeout(flashTimer);
      clearTimeout(panelTimer);
    };
  }, [visible, mode, day, diveProgress, glowOpacity, glowScale, flashOpacity, panelOpacity, panelTranslate]);

  if (!visible || !mode || day === null) {
    return null;
  }

  const durationLabel =
    duration && duration > 0
      ? `Masz ${duration} ${duration === 1 ? 'dzień' : 'dni'} na wykonanie zadania`
      : null;

  const animLeft = diveProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [startX, targetX],
  });
  const animTop = diveProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [startY, targetY],
  });
  const animWidth = diveProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [startW, targetSize],
  });
  const animHeight = diveProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [startH, targetSize],
  });

  const glowLeft = startX + startW / 2;
  const glowTop = startY + startH / 2;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onRequestClose}>
      <View style={styles.root}>
        <View style={styles.dim} />

        {mode === 'zoom' && (
          <>
            <Animated.View
              style={[
                styles.divingWindow,
                {
                  left: animLeft,
                  top: animTop,
                  width: animWidth,
                  height: animHeight,
                },
              ]}
            >
              <Image source={windowClose} style={styles.divingImage} resizeMode="contain" />
              <View style={styles.divingNumberWrap} pointerEvents="none">
                <Text style={styles.divingNumber} allowFontScaling={false}>
                  {day}
                </Text>
              </View>
            </Animated.View>

            <Animated.View
              pointerEvents="none"
              style={[
                styles.glow,
                {
                  left: glowLeft,
                  top: glowTop,
                  opacity: glowOpacity,
                  transform: [{ scale: glowScale }],
                },
              ]}
            >
              <LinearGradient
                colors={[
                  'rgba(255, 248, 220, 1)',
                  'rgba(246, 221, 158, 1)',
                  'rgba(211, 171, 104, 0.95)',
                  'rgba(211, 171, 104, 0.55)',
                ]}
                style={styles.glowGradient}
              />
            </Animated.View>
          </>
        )}

        {/* Solid gold wash — fully covers the screen before the task card */}
        <Animated.View pointerEvents="none" style={[styles.flash, { opacity: flashOpacity }]} />

        <Animated.View
          style={[
            styles.panelWrap,
            {
              opacity: panelOpacity,
              transform: [{ translateY: panelTranslate }],
            },
          ]}
          pointerEvents="box-none"
        >
          <TouchableOpacity
            style={styles.panelHit}
            activeOpacity={1}
            onPress={onRequestClose}
          />
          <View style={styles.quoteCard} pointerEvents="auto">
            <Text style={styles.quoteDay}>Dzień {day} grudnia</Text>
            <Text style={styles.quoteText}>{task || 'Brak zadania'}</Text>
            {!!durationLabel && <Text style={styles.quoteDuration}>{durationLabel}</Text>}
            <TouchableOpacity style={styles.closeBtn} onPress={onRequestClose} activeOpacity={0.85}>
              <Text style={styles.closeBtnText}>Wróć do kalendarza</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4, 15, 13, 0.35)',
  },
  divingWindow: {
    position: 'absolute',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  divingImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  divingNumberWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divingNumber: {
    fontSize: 48,
    fontWeight: '800',
    color: calendarTheme.goldBright,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.95)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
    includeFontPadding: false,
  },
  glow: {
    position: 'absolute',
    width: 96,
    height: 96,
    marginLeft: -48,
    marginTop: -48,
    borderRadius: 48,
    overflow: 'hidden',
  },
  glowGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 48,
  },
  flash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: calendarTheme.flash,
  },
  panelWrap: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  panelHit: {
    ...StyleSheet.absoluteFillObject,
  },
  quoteCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: calendarTheme.cream,
    borderRadius: 16,
    paddingVertical: 34,
    paddingHorizontal: 26,
    alignItems: 'center',
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 16,
  },
  quoteDay: {
    letterSpacing: 3,
    textTransform: 'uppercase',
    fontSize: 12,
    color: '#5e1c2a',
    marginBottom: 14,
    fontWeight: '600',
  },
  quoteText: {
    fontFamily: 'serif',
    fontStyle: 'italic',
    fontSize: 22,
    lineHeight: 32,
    color: calendarTheme.ink,
    textAlign: 'center',
    marginBottom: 18,
  },
  quoteDuration: {
    fontSize: 14,
    color: '#6e5131',
    fontStyle: 'italic',
    marginBottom: 18,
    textAlign: 'center',
  },
  closeBtn: {
    backgroundColor: calendarTheme.pine,
    paddingVertical: 12,
    paddingHorizontal: 26,
    borderRadius: 999,
  },
  closeBtnText: {
    color: calendarTheme.goldBright,
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
});
