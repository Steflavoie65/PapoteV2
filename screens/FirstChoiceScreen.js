import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const FirstChoiceScreen = ({ navigation }) => {
  const handleResetStorage = async () => {
    try {
      await AsyncStorage.clear();
      console.log('AsyncStorage réinitialisé avec succès');
      alert('AsyncStorage réinitialisé');
    } catch (error) {
      console.error('Erreur lors de la réinitialisation:', error);
    }
  };

  const handleSeniorChoice = async () => {
    try {
      const storedProfile = await AsyncStorage.getItem('seniorProfile');
      console.log('Vérification profil stocké:', storedProfile);
      
      if (storedProfile) {
        const profile = JSON.parse(storedProfile);
        // Vérifier la structure complète du profil
        if (profile?.profile?.userId && profile?.profile?.firstName) {
          console.log('Profil senior valide trouvé:', profile.profile.firstName);
          navigation.navigate('SeniorHome');
          return;
        }
      }
      console.log('Aucun profil valide, redirection inscription');
      //navigation.navigate('RegisterSenior');
      navigation.navigate('SeniorOptions'); // Correction du nom de l'écran

    } catch (error) {
      console.error('Erreur vérification profil:', error);
      //navigation.navigate('RegisterSenior');
      navigation.navigate('SeniorOptions'); // Correction du nom de l'écran
    }
  };

  const handleFamilyChoice = async () => {
    try {
      const storedProfile = await AsyncStorage.getItem('familyProfile');
      console.log('Vérification profil famille stocké:', storedProfile);
      
      if (storedProfile) {
        const profile = JSON.parse(storedProfile);
        // Vérifier la structure complète du profil
        if (profile?.profile?.userId && profile?.profile?.familyName) {
          console.log('Profil famille trouvé:', profile.profile.familyName);
          navigation.navigate('FamilyHome');
          return;
        }
      }
      console.log('Aucun profil famille trouvé, redirection inscription');
      //navigation.navigate('RegisterFamily');
      navigation.navigate('FamilyOptions'); // Correction du nom de l'écran
    } catch (error) {
      console.error('Erreur vérification profil:', error);
      //navigation.navigate('RegisterFamily');
      navigation.navigate('FamilyOptions'); // Correction du nom de l'écran
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity 
        style={styles.resetButton}
        onPress={handleResetStorage}
      >
        <Text style={styles.resetButtonText}>Reset Storage</Text>
      </TouchableOpacity>

      <View style={styles.headerContainer}>
        <MaterialCommunityIcons name="chat-processing" size={64} color="#4285F4" />
        <Text style={styles.logo}>Papote</Text>
        <Text style={styles.subtitle}>Gardez le contact avec vos proches</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.seniorButton]}
          onPress={handleSeniorChoice}
        >
          <MaterialCommunityIcons 
            name="account-heart" 
            size={40} 
            color="#4285F4"
          />
          <View style={styles.buttonTextContainer}>
            <Text style={[styles.buttonTitle, { color: '#4285F4' }]}>Je suis un Senior</Text>
            <Text style={styles.buttonSubtitle}>Restez connecté avec votre famille</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.familyButton]}
          onPress={handleFamilyChoice}
        >
          <MaterialCommunityIcons 
            name="account-group" 
            size={40} 
            color="white"
          />
          <View style={styles.buttonTextContainer}>
            <Text style={[styles.buttonTitle, { color: 'white' }]}>Je suis de la Famille</Text>
            <Text style={[styles.buttonSubtitle, { color: 'white' }]}>Gardez le contact avec vos aînés</Text>
          </View>
        </TouchableOpacity>
      </View>

      <Text style={styles.footerText}>Version 1.0</Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  logo: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#4285F4',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#666666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  buttonContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  seniorButton: {
    borderColor: '#4285F4',
    borderWidth: 2,
  },
  familyButton: {
    backgroundColor: '#4285F4',
  },
  buttonIcon: {
    width: 40,
    height: 40,
    marginRight: 15,
  },
  buttonTextContainer: {
    flex: 1,
  },
  buttonTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  buttonSubtitle: {
    fontSize: 14,
    color: '#666666',
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
  footerText: {
    textAlign: 'center',
    color: '#999999',
    marginBottom: 20,
  }
});

export default FirstChoiceScreen;
