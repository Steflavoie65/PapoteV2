import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'FirstChoice'>;

const FirstChoiceScreen: React.FC<Props> = ({ navigation }) => {
  const handleChoice = async (type: 'senior' | 'family') => {
    await AsyncStorage.setItem('userType', type);
    if (type === 'senior') {
      const uniqueCode = 'SR-' + Math.random().toString(36).substring(2, 7).toUpperCase();
      await AsyncStorage.setItem('userCode', uniqueCode);
      navigation.replace('SeniorHome');
    } else {
      navigation.replace('FamilyHome');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bienvenue sur Papote</Text>
      <Text style={styles.subtitle}>Je suis...</Text>
      
      <TouchableOpacity 
        style={styles.button}
        onPress={() => handleChoice('senior')}
      >
        <Text style={styles.buttonText}>Une personne senior</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.button}
        onPress={() => handleChoice('family')}
      >
        <Text style={styles.buttonText}>Un membre de la famille</Text>
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
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 30,
    color: '#666',
  },
  button: {
    backgroundColor: '#4285F4',
    padding: 15,
    borderRadius: 10,
    width: '100%',
    marginBottom: 15,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default FirstChoiceScreen;
