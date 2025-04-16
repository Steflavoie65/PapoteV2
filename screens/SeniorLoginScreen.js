import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../firebase/config'; // Assurez-vous que Firebase est configuré
import { doc, getDoc } from 'firebase/firestore';

const SeniorLoginScreen = ({ navigation }) => {
  const [seniorCode, setSeniorCode] = useState('');
  const [userId, setUserId] = useState('');

  const handleLogin = async () => {
    if (!seniorCode.trim() || !userId.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre code senior et votre identifiant utilisateur.');
      return;
    }

    try {
      // Rechercher le document correspondant dans la collection "users"
      const seniorRef = doc(db, 'users', userId); // Remplacez "seniors" par "users"
      const seniorSnap = await getDoc(seniorRef);

      if (seniorSnap.exists()) {
        const seniorData = seniorSnap.data();
        console.log('Données récupérées depuis Firebase:', seniorData);

        // Vérifier si le seniorCode correspond
        if (seniorData.seniorCode === seniorCode) {
          console.log('Connexion réussie:', seniorData);

          // Stocker les données dans AsyncStorage
          const profileForStorage = {
            profile: {
              userId: seniorData.userId,
              firstName: seniorData.firstName,
              seniorCode: seniorData.seniorCode,
              userType: 'senior',
            },
          };
          await AsyncStorage.setItem('seniorProfile', JSON.stringify(profileForStorage));

          // Rediriger vers le tableau de bord
          navigation.navigate('SeniorHome');
        } else {
          console.log('Code senior incorrect:', {
            codeEntré: seniorCode,
            codeFirebase: seniorData.seniorCode,
          });
          Alert.alert('Erreur', 'Le code senior est incorrect.');
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
      <Text style={styles.title}>Connexion Senior</Text>
      <TextInput
        style={styles.input}
        placeholder="Entrez votre identifiant utilisateur"
        value={userId}
        onChangeText={setUserId}
        placeholderTextColor="#999"
      />
      <TextInput
        style={styles.input}
        placeholder="Entrez votre code senior"
        value={seniorCode}
        onChangeText={setSeniorCode}
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

export default SeniorLoginScreen;
