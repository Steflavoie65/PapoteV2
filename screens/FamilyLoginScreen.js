import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';

const FamilyLoginScreen = ({ navigation }) => {
  const [familyCode, setFamilyCode] = useState('');
  const [userId, setUserId] = useState('');

  const handleLogin = async () => {
    if (!familyCode.trim() || !userId.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre code famille et votre identifiant utilisateur.');
      return;
    }

    try {
      // Rechercher le document correspondant dans la collection "familyProfiles"
      const familyRef = doc(db, 'familyProfiles', userId);
      const familySnap = await getDoc(familyRef);

      if (familySnap.exists()) {
        const familyData = familySnap.data();
        // Vérifier si le familyCode correspond
        if (familyData.familyCode === familyCode) {
          console.log('Connexion réussie:', familyData);

          // Stocker les données dans AsyncStorage
          const profileForStorage = {
            profile: {
              userId: familyData.userId,
              firstName: familyData.firstName,
              familyName: familyData.familyName,
              familyCode: familyData.familyCode,
              userType: 'family',
            },
          };
          await AsyncStorage.setItem('familyProfile', JSON.stringify(profileForStorage));

          // Rediriger vers le tableau de bord
          navigation.navigate('FamilyHome');
        } else {
          console.log('Code famille incorrect:', {
            codeEntré: familyCode,
            codeFirebase: familyData.familyCode,
          });
          Alert.alert('Erreur', 'Le code famille est incorrect.');
        }
      } else {
        console.log('Aucun document trouvé pour userId:', userId);
        Alert.alert('Erreur', 'Aucun compte trouvé avec cet identifiant utilisateur.');
      }
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la connexion.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Connexion Famille</Text>
      <TextInput
        style={styles.input}
        placeholder="Entrez votre identifiant utilisateur"
        value={userId}
        onChangeText={setUserId}
        placeholderTextColor="#999"
      />
      <TextInput
        style={styles.input}
        placeholder="Entrez votre code famille"
        value={familyCode}
        onChangeText={setFamilyCode}
        placeholderTextColor="#999"
      />
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Se connecter</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#4285F4',
  },
  input: {
    width: '100%',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#4285F4',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default FamilyLoginScreen;
