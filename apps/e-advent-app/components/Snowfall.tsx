import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Animated, Dimensions, Text, Easing } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Snowflake {
  id: number;
  left: number;
  size: number;
  duration: number;
  drift: number;
  opacity: number;
  delay: number;
}

export default function Snowfall() {
  const [snowflakes] = useState<Snowflake[]>(() => {
    const flakes: Snowflake[] = [];
    const numberOfFlakes = 50;

    for (let i = 0; i < numberOfFlakes; i++) {
      flakes.push({
        id: i,
        left: Math.random() * SCREEN_WIDTH,
        size: 8 + Math.random() * 12,
        duration: 10000 + Math.random() * 15000, // 10-25 sekund
        drift: (Math.random() - 0.5) * 80, // Kołysanie boczne
        opacity: 0.9 + Math.random() * 0.1,
        delay: Math.random() * 20, // Różne opóźnienia dla ciągłego strumienia
      });
    }
    return flakes;
  });

  return (
    <View style={styles.container} pointerEvents="none">
      {snowflakes.map((flake) => (
        <SnowflakeComponent key={flake.id} flake={flake} />
      ))}
    </View>
  );
}

function SnowflakeComponent({ flake }: { flake: Snowflake }) {
  const translateY = new Animated.Value(-30);
  const translateX = new Animated.Value(0);
  const rotate = new Animated.Value(0);
  const opacity = new Animated.Value(0);

  useEffect(() => {
    // Opóźnienie startu animacji
    const startDelay = setTimeout(() => {
      opacity.setValue(flake.opacity);
    }, flake.delay * 1000);

    // Animacja spadania z płynnym easing
    const fallAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT + 30,
          duration: flake.duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -30,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    // Animacja rotacji (360 stopni podczas spadania)
    const rotateAnimation = Animated.loop(
      Animated.timing(rotate, {
        toValue: 1,
        duration: flake.duration,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    // Animacja kołysania bocznego (sinusoidalna)
    const driftAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(translateX, {
          toValue: flake.drift,
          duration: flake.duration / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: -flake.drift,
          duration: flake.duration / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    // Animacja zmiany opacity podczas spadania
    const opacityAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: flake.opacity,
          duration: flake.duration * 0.3,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: flake.opacity * 0.8,
          duration: flake.duration * 0.4,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: flake.opacity * 0.2,
          duration: flake.duration * 0.3,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    fallAnimation.start();
    rotateAnimation.start();
    driftAnimation.start();
    opacityAnimation.start();

    return () => {
      clearTimeout(startDelay);
      fallAnimation.stop();
      rotateAnimation.stop();
      driftAnimation.stop();
      opacityAnimation.stop();
    };
  }, []);

  const rotation = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.snowflake,
        {
          left: flake.left,
          transform: [
            { translateY },
            { translateX },
            { rotate: rotation },
          ],
          opacity,
        },
      ]}
    >
      <Text style={[styles.snowflakeText, { fontSize: flake.size }]}>❄</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
    pointerEvents: 'none',
  },
  snowflake: {
    position: 'absolute',
  },
  snowflakeText: {
    color: '#ffffff',
    textShadowColor: 'rgba(255, 255, 255, 1)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 3,
  },
});
