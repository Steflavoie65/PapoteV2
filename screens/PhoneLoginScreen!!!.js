import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert 
} from 'react-native';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { app } from '../firebase';
import { verifyPhoneNumber, confirmVerificationCode } from '../services/authService';

const PhoneLoginScreen = ({ navigation }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationId, setVerificationId] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Référence pour le captcha Firebase
  const recaptchaVerifier = useRef(null);
  
  const handleSendCode = async () => {
    if (!phoneNumber) {
      Alert.alert('Erreur', 'Veuillez saisir un numéro de téléphone');
      return;
    }
    
    // Assurer que le numéro commence par +
    const formattedPhoneNumber = phoneNumber.startsWith('+') 
      ? phoneNumber 
      : `+${phoneNumber}`;
    
    setLoading(true);
    
    try {
      const result = await verifyPhoneNumber(
        formattedPhoneNumber, 
        recaptchaVerifier.current
      );
      
      if (result.success) {
        setVerificationId(result.verificationId);
        Alert.alert('Succès', 'Un code de vérification a été envoyé au numéro indiqué');
      } else {
        Alert.alert('Erreur', result.error);
      }
    } catch (error) {
      Alert.alert('Erreur', error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleVerifyCode = async () => {
    if (!verificationCode) {
      Alert.alert('Erreur', 'Veuillez saisir le code de vérification');
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await confirmVerificationCode(verificationId, verificationCode);
      
      if (result.success) {
        // Vérifier si c'est un nouvel utilisateur (pas encore de profil senior)
        // Si c'est un nouvel utilisateur, rediriger vers la création de profil
        // Sinon, rediriger vers l'écran principal
        navigation.replace('SeniorSetup', { uid: result.user.uid });
      } else {
        Alert.alert('Erreur', result.error);
      }
    } catch (error) {
      Alert.alert('Erreur', error.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <View style={styles.container}>
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={app.options}
      />
      
      <Text style={styles.title}>Connexion par téléphone</Text>
      
      {!verificationId ? (
        <>
          <Text style={styles.label}>Numéro de téléphone:</Text>
          <TextInput
            style={styles.input}
            placeholder="+33612345678"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            autoCompleteType="tel"
          />
          
          <TouchableOpacity 
            style={styles.button}
            onPress={handleSendCode}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Envoi en cours...' : 'Envoyer le code'}
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.label}>Code de vérification:</Text>
          <TextInput
            style={styles.input}
            placeholder="123456"
            value={verificationCode}
            onChangeText={setVerificationCode}
            keyboardType="number-pad"
          />
          
          <TouchableOpacity 
            style={styles.button}
            onPress={handleVerifyCode}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Vérification...' : 'Vérifier le code'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={() => setVerificationId(null)}
          >
            <Text style={styles.secondaryButtonText}>
              Modifier le numéro
            </Text>
          </TouchableOpacity>
        </>
      )}
      
      <TouchableOpacity 
        onPress={() => navigation.goBack()}
        style={styles.toggleButton}
      >
        <Text style={styles.toggleText}>
          Retour à la connexion par email
        </Text>
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
    marginBottom: 20,
  },
  label: {
    alignSelf: 'flex-start',
    marginLeft: 10,
    marginBottom: 5,
    fontSize: 16,
  },
  input: {
    width: '100%',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 5,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  button: {
    width: '100%',
    backgroundColor: '#4285F4',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  secondaryButton: {
    width: '100%',
    backgroundColor: 'transparent',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#4285F4',
  },
  secondaryButtonText: {
    color: '#4285F4',
    fontWeight: 'bold',
    fontSize: 16,
  },
  toggleButton: {
    marginTop: 20,
  },
  toggleText: {
    color: '#4285F4',
    fontSize: 14,
  },
});

export default PhoneLoginScreen;
