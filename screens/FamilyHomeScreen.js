import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FamilyHomeScreen = ({ navigation }) => {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const storedProfile = await AsyncStorage.getItem('familyProfile');
        if (storedProfile) {
          setProfile(JSON.parse(storedProfile));
        }
      } catch (error) {
        console.log('Erreur chargement profil:', error);
      }
    };

    loadProfile();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerContainer}>
          <MaterialCommunityIcons name="account-group" size={64} color="#4285F4" />
          <Text style={styles.welcomeText}>
            Famille {profile?.profile?.familyName}
          </Text>
        </View>

        <View style={styles.menuContainer}>
          <TouchableOpacity 
            style={styles.menuCard}
            onPress={() => navigation.navigate('ConnectSenior')}
          >
            <MaterialCommunityIcons name="account-plus" size={32} color="#4285F4" />
            <Text style={styles.menuTitle}>Connecter un Senior</Text>
            <Text style={styles.menuSubtitle}>Ajoutez un membre de votre famille</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuCard}
            onPress={() => navigation.navigate('SeniorList')}  // Changer SeniorContacts en SeniorList
          >
            <MaterialCommunityIcons name="account-multiple" size={32} color="#4285F4" />
            <Text style={styles.menuTitle}>Mes Seniorsfff</Text>
            <Text style={styles.menuSubtitle}>Voir mes contacts seniors</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuCard}
            onPress={() => navigation.navigate('FamilySettings')}
          >
            <MaterialCommunityIcons name="account-cog" size={32} color="#4285F4" />
            <Text style={styles.menuTitle}>Mes Infos</Text>
            <Text style={styles.menuSubtitle}>Gérer mon compte</Text>
          </TouchableOpacity>
        </View>
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
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4285F4',
    marginTop: 10,
  },
  menuContainer: {
    width: '100%',
    maxWidth: 400,
  },
  menuCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4285F4',
    marginTop: 10,
  },
  menuSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
});

export default FamilyHomeScreen;
