import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SeniorSettingsScreen = ({ navigation }) => {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const profileJson = await AsyncStorage.getItem('seniorProfile');
      if (profileJson) {
        setProfile(JSON.parse(profileJson));
      }
    } catch (error) {
      console.error('Erreur chargement profil:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="cog" size={64} color="#4285F4" />
        <Text style={styles.headerTitle}>Mes Infos</Text>
      </View>

      <View style={styles.menuSection}>
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => navigation.navigate('SeniorCode')} // Ensure this matches the registered name
        >
          <MaterialCommunityIcons name="qrcode" size={32} color="#4285F4" />
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>Mon Code Senior</Text>
            <Text style={styles.menuSubtitle}>Voir mon code de connexion</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => navigation.navigate('SeniorAccount')} // Verify if 'SeniorAccount' is registered
        >
          <MaterialCommunityIcons name="account-cog" size={32} color="#4285F4" />
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>Mon Compte</Text>
            <Text style={styles.menuSubtitle}>Gérer mon compte</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#666" />
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
  header: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#f0f6ff',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
  },
  menuSection: {
    padding: 20,
    gap: 15,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#e1e1e1',
  },
  menuTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  menuTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  menuSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
});

export default SeniorSettingsScreen;
