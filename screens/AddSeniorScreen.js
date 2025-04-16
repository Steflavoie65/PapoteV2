import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  SafeAreaView,
  ScrollView,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSeniorByCode, saveConnectionRequest } from '../services/firestoreService';

const AddSeniorScreen = ({ navigation }) => {
  const [seniorCode, setSeniorCode] = useState('');
  const [seniorName, setSeniorName] = useState('');
  const [loading, setLoading] = useState(false);

  // Ajouter cette fonction de débogage
  const debugAsyncStorage = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const result = await AsyncStorage.multiGet(keys);
      
      console.log('Contenu d\'AsyncStorage:');
      result.forEach(([key, value]) => {
        console.log(`${key}: ${value}`);
      });
    } catch (error) {
      console.error('Erreur lors de la lecture d\'AsyncStorage:', error);
    }
  };

  const handleConnect = async () => {
    if (!seniorCode || !seniorName) {
      Alert.alert('Attention', 'Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);

    try {
      console.log(`Vérification du senior avec le code ${seniorCode}...`);
      
      // Vérifier si le senior existe dans Firestore
      const seniorResult = await getSeniorByCode(seniorCode);
      
      if (!seniorResult.success) {
        Alert.alert('Erreur', 'Ce code senior n\'existe pas ou n\'a pas été trouvé dans notre base de données.');
        setLoading(false);
        return;
      }
      
      const senior = seniorResult.senior;
      
      // Vérifier si le prénom correspond
      if (senior.firstName.toLowerCase() !== seniorName.toLowerCase()) {
        Alert.alert('Erreur', 'Le prénom ne correspond pas au code senior fourni.');
        setLoading(false);
        return;
      }
      
      console.log(`Envoi d'une demande de connexion à ${seniorName} avec le code ${seniorCode}`);
      
      // Récupérer le profil familial depuis AsyncStorage
      const familyProfileJson = await AsyncStorage.getItem('familyProfile');
      console.log('Profil familial récupéré depuis AsyncStorage:', familyProfileJson);
      const familyProfile = familyProfileJson ? JSON.parse(familyProfileJson) : null;
      
      if (!familyProfile || !familyProfile.id) {
        Alert.alert('Erreur', 'Impossible de récupérer votre profil familial.');
        return;
      }
      
      console.log('Profil familial pour la demande:', familyProfile);
      
      // Créer l'objet de demande
      const request = {
        seniorCode: seniorCode,
        familyId: familyProfile.id, // Utiliser l'ID existant
        familyName: familyProfile.familyName || 'Famille', // Utiliser le vrai nom de famille
        seniorNameGuess: seniorName
      };
      
      console.log('Détails de la demande:', request);

      // Enregistrer la demande dans Firestore
      const result = await saveConnectionRequest(request);

      if (result.success) {
        Alert.alert(
          'Demande envoyée',
          `Votre demande de connexion à ${seniorName} a été envoyée. Vous serez notifié lorsqu'elle sera acceptée.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Erreur', 'Impossible d\'envoyer la demande: ' + result.error);
      }
    } catch (error) {
      console.error('Erreur:', error);
      Alert.alert('Erreur', 'Une erreur est survenue: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async () => {
    try {
      // Afficher le contenu d'AsyncStorage avant d'envoyer la demande
      await debugAsyncStorage();

      // Vérification du code senior
      if (!seniorCode) {
        Alert.alert('Erreur', 'Veuillez entrer un code senior.');
        return;
      }

      // Recherche du senior dans Firestore
      console.log('Vérification du senior avec le code', seniorCode, '...');
      const result = await getSeniorByCode(seniorCode);

      if (!result.success) {
        Alert.alert('Erreur', 'Senior non trouvé. Vérifiez le code et réessayez.');
        return;
      }

      const seniorData = result.senior;
      console.log('Senior trouvé dans Firestore:', seniorData);
      
      // Récupérer le profil familial depuis AsyncStorage
      const familyProfileJson = await AsyncStorage.getItem('familyProfile');
      console.log('Profil familial récupéré depuis AsyncStorage:', familyProfileJson);
      const familyProfile = familyProfileJson ? JSON.parse(familyProfileJson) : null;
      
      if (!familyProfile || !familyProfile.id) {
        Alert.alert('Erreur', 'Impossible de récupérer votre profil familial.');
        return;
      }
      
      console.log('Profil familial pour la demande:', familyProfile);
      
      // Vérifier que l'ID de la famille est bien récupéré
      const familyId = familyProfile.id;
      const familyName = familyProfile.familyName;
      
      console.log('ID famille à utiliser pour la demande:', familyId);
      console.log('Nom de famille à utiliser pour la demande:', familyName);
      
      // Créer l'objet de demande avec les bonnes informations
      const request = {
        seniorCode: seniorCode,
        seniorNameGuess: seniorData.firstName,
        familyId: familyId, // Utiliser l'ID existant de la famille
        familyName: familyName // Utiliser le vrai nom de famille
      };
      
      console.log('Envoi d\'une demande de connexion à', seniorData.firstName, 'avec le code', seniorCode);
      console.log('Détails finaux de la demande:', request);
      
      // Enregistrer la demande dans Firestore
      const saveResult = await saveConnectionRequest(request);
      
      if (!saveResult.success) {
        throw new Error(saveResult.error || 'Erreur lors de l\'enregistrement de la demande');
      }
      
      Alert.alert(
        'Succès', 
        `Demande envoyée à ${seniorData.firstName}. Vous recevrez une notification quand la demande sera acceptée.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Erreur:', error);
      Alert.alert('Erreur', error.message || 'Une erreur est survenue.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Connectez-vous à un senior</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Code du senior</Text>
          <TextInput
            style={styles.input}
            value={seniorCode}
            onChangeText={setSeniorCode}
            placeholder="Exemple: SR-12345"
            placeholderTextColor="#999"
          />
          
          <Text style={styles.label}>Prénom du senior</Text>
          <TextInput
            style={styles.input}
            value={seniorName}
            onChangeText={setSeniorName}
            placeholder="Entrez son prénom"
            placeholderTextColor="#999"
          />
          
          <Text style={styles.infoText}>
            Pour vous connecter, vous devez connaître le code unique du senior 
            ainsi que son prénom. Ces informations sont nécessaires pour des raisons de sécurité.
          </Text>
        </View>
        
        <TouchableOpacity 
          style={styles.button}
          onPress={handleConnect}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Envoi en cours...' : 'Envoyer la demande'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#4285F4',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    color: '#333',
  },
  input: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#4285F4',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AddSeniorScreen;
