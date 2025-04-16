import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveFamilyProfile } from '../services/firestoreService';

const RegisterFamilyScreen = ({ navigation }) => {
  const [firstName, setFirstName] = useState('');
  const [familyName, setFamilyName] = useState('');

  const handleRegister = async () => {
    if (!firstName.trim() || !familyName.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs.');
      return;
    }

    try {
      const userId = `family-${Date.now()}`;
      const familyCode = `FM-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      console.log('Création profil famille:', { userId, familyCode, firstName, familyName });

      const firestoreProfile = {
        id: userId, // Correction : utiliser 'id' au lieu de 'userId'
        firstName,
        familyName,
        familyCode, // Ajouter le familyCode
        userType: 'family',
        createdAt: new Date().toISOString(),
      };

      const result = await saveFamilyProfile(firestoreProfile);
      if (!result.success) {
        throw new Error(result.error || 'Erreur sauvegarde Firestore');
      }

      const profileForStorage = {
        profile: {
          userId,
          firstName,
          familyName,
          familyCode, // Ajouter le familyCode
          userType: 'family',
          interfacePreference: 'standard',
        },
        roles: {
          family: {
            createdAt: new Date().toISOString(),
          },
        },
      };

      await AsyncStorage.setItem('familyProfile', JSON.stringify(profileForStorage));
      console.log('Profil famille enregistré localement:', await AsyncStorage.getItem('familyProfile'));
      Alert.alert('Succès', 'Votre profil a été enregistré avec succès.', [
        { text: 'OK', onPress: () => navigation.navigate('FamilyHome') }
      ]);
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de l\'enregistrement.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <MaterialCommunityIcons name="account-multiple" size={64} color="#4285F4" />
        <Text style={styles.title}>Inscription Famille</Text>
        <Text style={styles.subtitle}>Connectez-vous avec vos proches</Text>
      </View>

      <View style={styles.formContainer}>
        <View style={styles.inputContainer}>
          <MaterialCommunityIcons name="account" size={24} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Votre prénom"
            value={firstName}
            onChangeText={setFirstName}
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.inputContainer}>
          <MaterialCommunityIcons name="home" size={24} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Nom de famille"
            value={familyName}
            onChangeText={setFamilyName}
            placeholderTextColor="#999"
          />
        </View>

        <TouchableOpacity style={styles.button} onPress={handleRegister}>
          <Text style={styles.buttonText}>M'inscrire</Text>
          <MaterialCommunityIcons name="arrow-right" size={20} color="white" />
        </TouchableOpacity>
      </View>
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
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4285F4',
    marginVertical: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  formContainer: {
    padding: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 15,
    color: '#333',
  },
  button: {
    backgroundColor: '#4285F4',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 10,
  },
});

export default RegisterFamilyScreen;
