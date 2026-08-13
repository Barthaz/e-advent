import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import BasePergaminScreen from '../components/BasePergaminScreen';

export default function SurpriseScreen() {
  const [isModalVisible, setIsModalVisible] = useState(true);

  useEffect(() => {
    setIsModalVisible(true);
  }, []);

  return (
    <BasePergaminScreen
      title="Niespodzianka"
      subtitle="Odkryj dzisiejszą niespodziankę"
    >
      <View style={styles.placeholder} />

      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <LinearGradient
            colors={['#ead5b3', '#d6b182', '#b98f5f']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.paperModal}
          >
            <Text style={styles.title}>Twoja niespodzianka</Text>
            <Text style={styles.message}>To miejsce na codzienną niespodziankę. Wkrótce podłączymy pobieranie treści.</Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => setIsModalVisible(false)}
            >
              <Text style={styles.buttonText}>Zamknij</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </Modal>
    </BasePergaminScreen>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    height: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  paperModal: {
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(130, 97, 58, 0.35)',
  },
  title: {
    fontSize: 30,
    color: '#5f4326',
    textAlign: 'center',
    marginBottom: 10,
  },
  message: {
    fontSize: 16,
    color: '#6e5131',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 18,
  },
  button: {
    alignSelf: 'center',
    backgroundColor: '#7c5633',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
  },
});
