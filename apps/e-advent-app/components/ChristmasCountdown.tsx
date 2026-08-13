import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
}

export default function ChristmasCountdown() {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({
    days: 0,
    hours: 0,
    minutes: 0,
  });

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date();
      const currentYear = now.getFullYear();
      
      // Ustaw datę Bożego Narodzenia na 25 grudnia bieżącego roku
      let christmas = new Date(currentYear, 11, 25, 0, 0, 0, 0); // 11 = grudzień (0-indexed)
      
      // Jeśli już minęło Boże Narodzenie w tym roku, ustaw na następny rok
      if (now > christmas) {
        christmas = new Date(currentYear + 1, 11, 25, 0, 0, 0, 0);
      }

      const difference = christmas.getTime() - now.getTime();

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

        setTimeRemaining({ days, hours, minutes });
      } else {
        setTimeRemaining({ days: 0, hours: 0, minutes: 0 });
      }
    };

    // Oblicz od razu
    calculateTimeRemaining();

    // Aktualizuj co sekundę
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatNumber = (num: number): string => {
    return num.toString().padStart(2, '0');
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(244, 208, 63, 0.15)', 'rgba(244, 208, 63, 0.08)']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.title}>Do Bożego Narodzenia zostało już tylko</Text>
        <View style={styles.timeContainer}>
          <View style={styles.timeBlock}>
            <Text style={styles.timeValue}>{timeRemaining.days}</Text>
            <Text style={styles.timeLabel}>
              {timeRemaining.days === 1 ? 'dzień' : timeRemaining.days < 5 ? 'dni' : 'dni'}
            </Text>
          </View>
          <Text style={styles.separator}>:</Text>
          <View style={styles.timeBlock}>
            <Text style={styles.timeValue}>{formatNumber(timeRemaining.hours)}</Text>
            <Text style={styles.timeLabel}>godz</Text>
          </View>
          <Text style={styles.separator}>:</Text>
          <View style={styles.timeBlock}>
            <Text style={styles.timeValue}>{formatNumber(timeRemaining.minutes)}</Text>
            <Text style={styles.timeLabel}>min</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    marginBottom: 10,
    borderRadius: 16,
    overflow: 'hidden',
  },
  gradient: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(244, 208, 63, 0.3)',
  },
  title: {
    fontSize: 15,
    color: '#f4d03f',
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '600',
    opacity: 0.95,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  timeBlock: {
    alignItems: 'center',
    minWidth: 50,
  },
  timeValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f4d03f',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  timeLabel: {
    fontSize: 11,
    color: '#f4d03f',
    opacity: 0.85,
    marginTop: 2,
    fontWeight: '500',
  },
  separator: {
    fontSize: 20,
    color: '#f4d03f',
    opacity: 0.6,
    fontWeight: 'bold',
    marginBottom: 8,
  },
});

