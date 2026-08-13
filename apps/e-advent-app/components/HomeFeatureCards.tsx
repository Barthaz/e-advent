import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

type FeatureKey = 'tasks' | 'gifts' | 'shared' | 'surprise';

interface HomeFeatureCardsProps {
  onPressItem: (key: FeatureKey) => void;
  tasksSubtitle?: string;
}

const featureItems: {
  key: FeatureKey;
  title: string;
  subtitle: string;
  icon: any;
}[] = [
  {
    key: 'tasks',
    title: 'Moje zadania',
    subtitle: '0 zadań do zrobienia',
    icon: require('../assets/icons/gift.png'),
  },
  {
    key: 'gifts',
    title: 'Lista prezentów',
    subtitle: 'Pomysły na prezent',
    icon: require('../assets/icons/book.png'),
  },
  {
    key: 'shared',
    title: 'Współpraca',
    subtitle: 'Wspólnie przeżyj Święta',
    icon: require('../assets/icons/duo.png'),
  },
  {
    key: 'surprise',
    title: 'Niespodzianka',
    subtitle: 'Odkryj dzisiejszą niespodziankę',
    icon: require('../assets/icons/star.png'),
  },
];

export default function HomeFeatureCards({
  onPressItem,
  tasksSubtitle,
}: HomeFeatureCardsProps) {
  return (
    <View style={styles.row}>
      {featureItems.map((item) => (
        <TouchableOpacity
          key={item.title}
          style={styles.cardTouchable}
          activeOpacity={0.85}
          onPress={() => onPressItem(item.key)}
        >
          <LinearGradient
            colors={['#ead5b3', '#d6b182', '#b98f5f']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            <Image source={item.icon} style={styles.icon} resizeMode="contain" />
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>
              {item.key === 'tasks' && tasksSubtitle ? tasksSubtitle : item.subtitle}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  cardTouchable: {
    width: '23.5%',
  },
  card: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(130, 97, 58, 0.35)',
    minHeight: 110,
  },
  icon: {
    width: 28,
    height: 28,
    marginBottom: 6,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4f3720',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 9,
    color: '#6e5131',
    textAlign: 'center',
    marginTop: 4,
  },
});
