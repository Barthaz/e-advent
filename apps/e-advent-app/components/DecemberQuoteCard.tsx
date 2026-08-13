import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const cupIcon = require('../assets/icons/cup.png');

export default function DecemberQuoteCard() {
  return (
    <View style={styles.wrapper}>
      <LinearGradient
        colors={['#ead5b3', '#d6b182', '#b98f5f']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.quoteContainer}>
          <MaterialCommunityIcons name="format-quote-open" size={22} color="#7a5633" style={styles.quoteIcon} />
          <Text style={styles.quote}>
            "Niech ten grudzień przyniesie Ci to, czego Twoje serce naprawdę pragnie."
          </Text>
        </View>
        <Image source={cupIcon} style={styles.icon} resizeMode="contain" />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    marginTop: 20,
  },
  card: {
    width: '100%',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(130, 97, 58, 0.35)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  quoteContainer: {
    flex: 1,
    marginRight: 12,
    paddingBottom: 14,
  },
  quoteIcon: {
    marginBottom: 4,
  },
  quote: {
    color: '#5f4326',
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'serif',
  },
  icon: {
    width: 92,
    height: 92,
  },
});
