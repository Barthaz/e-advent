import React, { forwardRef } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { calendarTheme } from './calendarTheme';

const windowClose = require('../../assets/windows/close.png');
const windowOpen = require('../../assets/windows/open.png');
const windowShine = require('../../assets/windows/shine_overlay.png');

export interface CalendarWindowProps {
  day: number;
  isOpened: boolean;
  canOpen: boolean;
  isOpening?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

const CalendarWindow = forwardRef<View, CalendarWindowProps>(function CalendarWindow(
  { day, isOpened, canOpen, isOpening = false, disabled = false, onPress },
  ref
) {
  const shouldShine = !isOpened && canOpen;

  return (
    <View ref={ref} collapsable={false} style={styles.wrapper}>
      <TouchableOpacity
        style={styles.button}
        onPress={onPress}
        disabled={disabled || isOpening || (!canOpen && !isOpened)}
        activeOpacity={0.85}
      >
        <ImageBackground
          source={isOpened ? windowOpen : windowClose}
          style={styles.fill}
          imageStyle={styles.imageStyle}
          resizeMode="cover"
        >
          {/* Number under shine — shows through transparent center (Android-safe) */}
          <View style={styles.numberLayer} pointerEvents="none">
            <Text
              style={[
                styles.number,
                isOpened && styles.numberOpened,
                !canOpen && !isOpened && styles.numberLocked,
              ]}
              allowFontScaling={false}
            >
              {day}
            </Text>
          </View>

          {shouldShine && (
            <Image
              source={windowShine}
              style={styles.shine}
              resizeMode="cover"
              pointerEvents="none"
            />
          )}

          {isOpening && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="small" color={calendarTheme.goldBright} />
            </View>
          )}
        </ImageBackground>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: calendarTheme.bgDeep2,
  },
  button: {
    flex: 1,
  },
  fill: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  imageStyle: {
    borderRadius: 12,
  },
  numberLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: {
    fontSize: 30,
    fontWeight: '800',
    color: calendarTheme.goldBright,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.95)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 5,
    includeFontPadding: false,
    transform: [{ translateY: 22 }],
  },
  numberOpened: {
    transform: [
      { perspective: 350 },
      { translateY: 22 },
      { translateX: -9 },
      { rotateY: '44deg' },
    ],
  },
  numberLocked: {
    opacity: 0.78,
  },
  shine: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    // Nudge shine up to align with close.png frame
    transform: [{ translateY: -35 }],
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 26, 23, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CalendarWindow;
