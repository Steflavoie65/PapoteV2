import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StyleSheet } from 'react-native';

import { AuthProvider } from './contexts/AuthContext';
import { auth } from './firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import ContactDetailScreen from './screens/ContactDetailScreen';
import SeniorDetailScreen from './screens/SeniorDetailScreen';
import SeniorProfileScreen from './screens/SeniorProfileScreen';
import FamilyProfileScreen from './screens/FamilyProfileScreen';
import SeniorSettingsScreen from './screens/SeniorSettingsScreen';
import FamilySettingsScreen from './screens/FamilySettingsScreen';
import ChatScreen from './screens/ChatScreen';
import FamilyCodeScreen from './screens/FamilyCodeScreen';

// Importer les écrans
import FirstChoiceScreen from './screens/FirstChoiceScreen';
import SeniorHomeScreen from './screens/SeniorHomeScreen';
import FamilyHomeScreen from './screens/FamilyHomeScreen';
import AddSeniorScreen from './screens/AddSeniorScreen';
import SeniorListScreen from './screens/SeniorListScreen';
import SeniorSetupScreen from './screens/SeniorSetupScreen';
import ConnectionRequestsScreen from './screens/ConnectionRequestsScreen';
import SeniorCodeScreen from './screens/SeniorCodeScreen';
import SeniorRequestsScreen from './screens/SeniorRequestsScreen';
import FamilyContactsScreen from './screens/FamilyContactsScreen';
import RegisterSeniorScreen from './screens/RegisterSeniorScreen';
import RegisterFamilyScreen from './screens/RegisterFamilyScreen';
import ConnectSeniorScreen from './screens/ConnectSeniorScreen';

import FamilyLoginScreen from './screens/FamilyLoginScreen';
import FamilyOptionsScreen from './screens/FamilyOptionsScreen';
import SeniorOptionsScreen from './screens/SeniorOptionsScreen';
import SeniorLoginScreen from './screens/SeniorLoginScreen';

import AppNavigator from './navigation/AppNavigator';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#4285F4',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
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
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#4285F4',
  },
  secondaryButtonText: {
    color: '#4285F4',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonSpacer: {
    height: 15,
  },
  infoContainer: {
    backgroundColor: '#e3f2fd',
    padding: 20,
    borderRadius: 8,
    width: '100%',
    maxWidth: 350,
    marginTop: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1976d2',
  },
  infoText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  }
});
