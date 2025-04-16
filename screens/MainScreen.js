import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MainScreen = ({ navigation }) => {
  const handleSeniorButtonPress = async () => {
    try {
      const storedProfile = await AsyncStorage.getItem('seniorProfile');
      console.log('Vérification du profil stocké:', storedProfile);
      
      if (storedProfile) {
        const profile = JSON.parse(storedProfile);
        // Vérifier que le profil a la bonne structure
        if (profile && profile.profile && profile.profile.userId) {
          console.log('Profil senior trouvé, redirection vers dashboard');
          navigation.navigate('SeniorHome');
          return;
        }
      }
      
      console.log('Aucun profil valide trouvé, redirection vers inscription');
      navigation.navigate('RegisterSenior');
    } catch (error) {
      console.error('Erreur lors de la vérification du profil:', error);
      navigation.navigate('RegisterSenior');
    }
  };

  const handleResetStorage = async () => {
    try {
      await AsyncStorage.clear();
      console.log('AsyncStorage réinitialisé avec succès');
      alert('AsyncStorage réinitialisé');
    } catch (error) {
      console.error('Erreur lors de la réinitialisation:', error);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.resetButton}
        onPress={handleResetStorage}
      >
        <Text style={styles.resetButtonText}>Reset Storage</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Bienvenue sur Papote</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={handleSeniorButtonPress}
      >
        <Text style={styles.buttonText}>Je suis un Senior</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('RegisterFamily')}
      >
        <Text style={styles.buttonText}>Je suis une Famille</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 40,
    color: '#4285F4',
  },
  button: {
    backgroundColor: '#4285F4',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    width: '80%',
    marginVertical: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resetButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: '#FF4444',
    padding: 8,
    borderRadius: 5,
    zIndex: 1,
  },
  resetButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default MainScreen;
