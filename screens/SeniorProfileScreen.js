import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteSeniorAccount } from '../services/firestoreService';

const SeniorProfileScreen = ({ navigation }) => {
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
      Alert.alert("Erreur", "Impossible de charger votre profil");
    }
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      "Supprimer le compte",
      "Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.",
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Supprimer", 
          style: "destructive",
          onPress: async () => {
            try {
              const result = await deleteSeniorAccount(profile?.profile?.userId);
              if (result.success) {
                await AsyncStorage.clear();
                Alert.alert(
                  "Compte supprimé", 
                  "Votre compte a été supprimé avec succès.",
                  [
                    {
                      text: "OK",
                      onPress: () => {
                        navigation.popToTop();
                      }
                    }
                  ]
                );
              } else {
                Alert.alert("Erreur", "Impossible de supprimer le compte: " + result.error);
              }
            } catch (error) {
              console.error('Erreur suppression:', error);
              Alert.alert("Erreur", "Une erreur est survenue lors de la suppression.");
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="account-circle" size={80} color="#4285F4" />
        <Text style={styles.name}>{profile?.profile?.firstName || 'Utilisateur'}</Text>
        <Text style={styles.userType}>Compte Senior</Text>
      </View>

      <View style={styles.infoSection}>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Code Senior :</Text>
          <Text style={styles.value}>{profile?.profile?.seniorCode}</Text>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.deleteButton}
        onPress={handleDeleteAccount}
      >
        <MaterialCommunityIcons name="account-remove" size={24} color="white" />
        <Text style={styles.deleteButtonText}>Supprimer mon compte</Text>
      </TouchableOpacity>
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
  name: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
  },
  userType: {
    fontSize: 18,
    color: '#666',
    marginTop: 5,
  },
  infoSection: {
    padding: 20,
  },
  infoRow: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#e1e1e1',
  },
  label: {
    fontSize: 20,
    color: '#4285F4',
    marginBottom: 10,
  },
  value: {
    fontSize: 24,
    color: '#333',
  },
  deleteButton: {
    backgroundColor: '#FF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    margin: 20,
    borderRadius: 15,
    gap: 10,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export default SeniorProfileScreen;
