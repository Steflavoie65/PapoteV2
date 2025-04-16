import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert 
} from 'react-native';
import { loginWithEmail, registerWithEmail } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { currentUser } = useAuth();
  
  // Si l'utilisateur est déjà connecté, rediriger vers l'écran principal
  if (currentUser) {
    navigation.replace('Home');
    return null;
  }
  
  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }
    
    if (!isLogin && (!firstName || !lastName)) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }
    
    setLoading(true);
    
    try {
      let result;
      
      if (isLogin) {
        // Tentative de connexion
        result = await loginWithEmail(email, password);
      } else {
        // Tentative d'inscription
        result = await registerWithEmail(email, password, firstName, lastName);
      }
      
      if (result.success) {
        // La connexion/inscription a réussi, la redirection sera gérée par useAuth
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
      <Text style={styles.title}>{isLogin ? 'Connexion' : 'Inscription'}</Text>
      
      {!isLogin && (
        <>
          <TextInput
            style={styles.input}
            placeholder="Prénom"
            value={firstName}
            onChangeText={setFirstName}
          />
          <TextInput
            style={styles.input}
            placeholder="Nom"
            value={lastName}
            onChangeText={setLastName}
          />
        </>
      )}
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Mot de passe"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <TouchableOpacity 
        style={styles.button}
        onPress={handleAuth}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading 
            ? 'Chargement...' 
            : isLogin ? 'Se connecter' : 'S\'inscrire'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        onPress={() => setIsLogin(!isLogin)}
        style={styles.toggleButton}
      >
        <Text style={styles.toggleText}>
          {isLogin 
            ? 'Pas encore de compte ? S\'inscrire' 
            : 'Déjà un compte ? Se connecter'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        onPress={() => navigation.navigate('PhoneLogin')}
        style={styles.toggleButton}
      >
        <Text style={styles.toggleText}>
          Se connecter avec un numéro de téléphone
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
  toggleButton: {
    marginTop: 20,
  },
  toggleText: {
    color: '#4285F4',
    fontSize: 14,
  },
});

export default LoginScreen;
