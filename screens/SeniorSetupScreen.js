import React, { useState } from 'react';
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
import { saveSeniorProfile } from '../services/firestoreService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const REQUESTS_KEY = 'requests';

const SeniorSetupScreen = ({ navigation }) => {
  const [firstName, setFirstName] = useState('');
  const [loading, setLoading] = useState(false);
  const [seniorCode, setSeniorCode] = useState('');
  const [setupComplete, setSetupComplete] = useState(false);

  const generateSeniorCode = () => {
    // Générer un code unique pour le senior (format SR-XXXXX)
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'SR-';
    for (let i = 0; i < 5; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
  };

  const handleSetup = async () => {
    if (!firstName.trim()) {
      Alert.alert('Attention', 'Veuillez entrer votre prénom');
      return;
    }

    setLoading(true);

    try {
      // Générer le code senior
      const generatedCode = generateSeniorCode();
      console.log('Code senior généré:', generatedCode);
      
      // Créer le profil
      const seniorProfile = {
        id: 'senior-' + Date.now(),
        firstName,
        seniorCode: generatedCode
      };
      
      console.log('Enregistrement du profil dans Firestore...');
      
      // Enregistrer dans Firestore
      const result = await saveSeniorProfile(seniorProfile);
      
      if (result.success) {
        // Enregistrer aussi localement pour l'usage dans l'app
        await AsyncStorage.setItem('seniorProfile', JSON.stringify(seniorProfile));
        console.log('Profil enregistré localement:', seniorProfile);
        
        setSeniorCode(generatedCode);
        setSetupComplete(true);
      } else {
        Alert.alert('Erreur', 'Impossible d\'enregistrer votre profil: ' + result.error);
      }
    } catch (error) {
      console.error('Erreur:', error);
      Alert.alert('Erreur', 'Impossible de créer votre profil: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    navigation.navigate('SeniorHome', { firstName, seniorCode });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {!setupComplete ? (
          <>
            <Text style={styles.title}>Configuration de votre profil</Text>
            <Text style={styles.subtitle}>Nous avons besoin de quelques informations pour vous aider à rester connecté avec votre famille.</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Votre prénom</Text>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Entrez votre prénom"
                placeholderTextColor="#999"
              />
            </View>
            
            <TouchableOpacity 
              style={styles.button}
              onPress={handleSetup}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Chargement...' : 'Continuer'}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.title}>Configuration terminée</Text>
            <Text style={styles.subtitle}>Bonjour {firstName}, votre profil a été créé avec succès!</Text>
            
            <View style={styles.codeContainer}>
              <Text style={styles.codeLabel}>Votre code unique:</Text>
              <Text style={styles.codeText}>{seniorCode}</Text>
              <Text style={styles.codeInfo}>
                Partagez ce code avec les membres de votre famille pour qu'ils puissent se connecter avec vous.
              </Text>
            </View>
            
            <TouchableOpacity 
              style={styles.button}
              onPress={handleContinue}
            >
              <Text style={styles.buttonText}>Continuer</Text>
            </TouchableOpacity>
          </>
        )}
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
    flexGrow: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#4285F4',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 30,
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
    fontSize: 18,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  button: {
    backgroundColor: '#4285F4',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  codeContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  codeLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  codeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4285F4',
    marginBottom: 15,
    letterSpacing: 1,
  },
  codeInfo: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default SeniorSetupScreen;
