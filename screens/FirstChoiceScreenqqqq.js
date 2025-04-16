import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from 'react-native';

const FirstChoiceScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.title}>Papote</Text>
      <Text style={styles.subtitle}>Restez connecté avec vos proches</Text>
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => navigation.navigate('SeniorSetup')}
        >
          <Text style={styles.buttonText}>Je suis un senior</Text>
        </TouchableOpacity>
        
        <View style={styles.buttonSpacer} />
        
        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]}
          onPress={() => navigation.navigate('FamilyHome')}
        >
          <Text style={styles.secondaryButtonText}>Je suis un membre de la famille</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

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
  }
});

export default FirstChoiceScreen;
