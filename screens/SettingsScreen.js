import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Alert,
  ScrollView,
  Switch,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const SettingsScreen = ({ navigation }) => {
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const savedApiKey = await AsyncStorage.getItem('openai_api_key');
      if (savedApiKey) {
        setApiKey(savedApiKey);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveApiKey = async () => {
    if (!apiKey.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer une clé API valide');
      return;
    }

    if (!apiKey.trim().startsWith('sk-')) {
      Alert.alert(
        'Clé API invalide', 
        'La clé API OpenAI doit commencer par "sk-". Veuillez vérifier votre clé.'
      );
      return;
    }

    setIsLoading(true);
    try {
      await AsyncStorage.setItem('openai_api_key', apiKey.trim());
      Alert.alert('Succès', 'Clé API OpenAI sauvegardée avec succès! Le chatbot pourra maintenant répondre à vos messages.');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la clé API:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder la clé API');
    } finally {
      setIsLoading(false);
    }
  };

  const testApiKey = async () => {
    if (!apiKey.trim()) {
      Alert.alert('Erreur', 'Veuillez d\'abord entrer une clé API');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        Alert.alert('Succès', 'Votre clé API OpenAI est valide!');
        await AsyncStorage.setItem('openai_api_key', apiKey.trim());
      } else {
        const error = await response.json().catch(() => ({ error: { message: 'Erreur inconnue' } }));
        Alert.alert(
          'Clé API invalide',
          `Erreur: ${error?.error?.message || 'Vérifiez votre clé API'}`
        );
      }
    } catch (error) {
      console.error('Erreur lors du test de la clé API:', error);
      Alert.alert('Erreur', 'Impossible de tester la clé API. Vérifiez votre connexion Internet.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configuration du Chatbot</Text>
          
          <Text style={styles.label}>Clé API OpenAI</Text>
          <View style={styles.apiKeyContainer}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={apiKey}
              onChangeText={setApiKey}
              placeholder="sk-..."
              secureTextEntry={!showApiKey}
              autoCapitalize="none"
            />
            <TouchableOpacity 
              onPress={() => setShowApiKey(!showApiKey)}
              style={styles.visibilityButton}
            >
              <MaterialCommunityIcons 
                name={showApiKey ? "eye-off" : "eye"} 
                size={24} 
                color="#666" 
              />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.helpText}>
            Pour utiliser la fonction de chat IA, vous devez fournir votre propre clé API OpenAI.
            Vous pouvez en obtenir une sur: {'\n'}
            https://platform.openai.com/api-keys
          </Text>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, styles.testButton]} 
              onPress={testApiKey}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Tester</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.saveButton]} 
              onPress={saveApiKey}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Sauvegarder</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  scrollContent: {
    padding: 15,
  },
  section: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    color: '#555',
  },
  input: {
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
  },
  apiKeyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  visibilityButton: {
    padding: 10,
    marginLeft: 5,
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
  },
  testButton: {
    backgroundColor: '#4CAF50',
  },
  saveButton: {
    backgroundColor: '#4285F4',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SettingsScreen;
