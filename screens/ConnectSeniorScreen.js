import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendConnectionRequest } from '../services/firestoreService';

const ConnectSeniorScreen = ({ navigation }) => {
  const [seniorCode, setSeniorCode] = useState('');
  const [seniorName, setSeniorName] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConnect = async () => {
    if (!seniorCode.trim() || !seniorName.trim() || !message.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setIsSubmitting(true);
    try {
      // Récupérer le profil famille
      const familyProfile = await AsyncStorage.getItem('familyProfile');
      const { profile } = JSON.parse(familyProfile);

      const requestData = {
        seniorCode: seniorCode.toUpperCase(),
        seniorName: seniorName.trim(),
        message: message.trim(),
        familyId: profile.userId,
        familyName: profile.familyName,
        familyFirstName: profile.firstName,
        status: 'pending',
      };

      const result = await sendConnectionRequest(requestData);
      
      if (result.success) {
        Alert.alert(
          'Demande envoyée', 
          'Votre demande a été envoyée avec succès. Le senior doit maintenant l\'accepter.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Erreur', result.error || 'Senior non trouvé');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Une erreur est survenue lors de l\'envoi de la demande');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <MaterialCommunityIcons name="account-multiple-plus" size={64} color="#4285F4" />
        <Text style={styles.title}>Connexion Senior</Text>
        <Text style={styles.subtitle}>Envoyez une demande de connexion à votre proche</Text>
      </View>

      <View style={styles.formContainer}>
        <View style={styles.inputContainer}>
          <MaterialCommunityIcons name="key" size={24} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Code du senior (SR-XXXXX)"
            value={seniorCode}
            onChangeText={setSeniorCode}
            autoCapitalize="characters"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.inputContainer}>
          <MaterialCommunityIcons name="account" size={24} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Prénom du senior"
            value={seniorName}
            onChangeText={setSeniorName}
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.inputContainer}>
          <MaterialCommunityIcons name="message-text-outline" size={24} color="#666" style={styles.inputIcon} />
          <TextInput
            style={[styles.input, styles.messageInput]}
            placeholder="Votre message de présentation"
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={4}
            placeholderTextColor="#999"
          />
        </View>

        <TouchableOpacity 
          style={[styles.button, isSubmitting && { opacity: 0.7 }]}
          onPress={handleConnect}
          disabled={isSubmitting}
        >
          <Text style={styles.buttonText}>
            {isSubmitting ? 'Envoi...' : 'Envoyer la demande'}
          </Text>
          <MaterialCommunityIcons 
            name="arrow-right" 
            size={20} 
            color="white" 
          />
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
  messageInput: {
    minHeight: 100,
    textAlignVertical: 'top',
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

export default ConnectSeniorScreen;
