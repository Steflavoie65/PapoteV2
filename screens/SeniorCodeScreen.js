import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  SafeAreaView,
  ScrollView,
  Alert,
  Share
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createDataQRCode } from '../services/deviceSyncService';

const SeniorCodeScreen = ({ navigation }) => {
  const [seniorData, setSeniorData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSeniorData = async () => {
      try {
        const profileJson = await AsyncStorage.getItem('seniorProfile');
        const profile = profileJson ? JSON.parse(profileJson) : null;
        
        if (profile && profile.profile) { // Vérifier la structure correcte
          setSeniorData(profile.profile); // Stocker le sous-objet profile
        } else {
          Alert.alert('Erreur', 'Profil senior non trouvé');
          navigation.goBack();
        }
      } catch (error) {
        console.error('Erreur de chargement du profil:', error);
        Alert.alert('Erreur', 'Impossible de charger le profil senior');
      } finally {
        setLoading(false);
      }
    };
    
    loadSeniorData();
  }, [navigation]);

  const shareCode = async () => {
    if (!seniorData) return;
    
    try {
      await Share.share({
        message: `Bonjour, je suis ${seniorData.firstName}. Voici mon code Papote: ${seniorData.seniorCode}. Utilisez ce code pour vous connecter avec moi dans l'application Papote.`,
        title: 'Code Papote'
      });
    } catch (error) {
      console.error('Erreur de partage:', error);
      Alert.alert('Erreur', 'Impossible de partager le code');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Chargement...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Votre code de connexion</Text>
        
        <View style={styles.codeContainer}>
          <Text style={styles.codeLabel}>Partagez ce code avec votre famille:</Text>
          <Text style={styles.codeText}>{seniorData?.seniorCode}</Text>
          <Text style={styles.codeInfo}>
            Votre famille aura également besoin de connaître votre prénom, qui est <Text style={styles.nameText}>"{seniorData?.firstName}"</Text>.
          </Text>
          <Text style={styles.codeLabel}>Votre identifiant utilisateur :</Text>
          <Text style={styles.codeText}>{seniorData?.userId}</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.shareButton}
          onPress={shareCode}
        >
          <Text style={styles.shareButtonText}>Partager mon code</Text>
        </TouchableOpacity>
        
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Comment ça marche:</Text>
          <Text style={styles.infoText}>
            1. Partagez votre code et votre prénom avec les membres de votre famille.
          </Text>
          <Text style={styles.infoText}>
            2. Ils entrent ces informations dans leur application Papote.
          </Text>
          <Text style={styles.infoText}>
            3. Appuyez sur "Vérifier les nouvelles demandes" sur votre écran d'accueil pour voir et accepter leurs demandes de connexion.
          </Text>
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
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#4285F4',
    textAlign: 'center',
  },
  codeContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  codeLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  codeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4285F4',
    marginBottom: 15,
    letterSpacing: 1,
  },
  codeInfo: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  shareButton: {
    backgroundColor: '#4285F4',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  shareButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoCard: {
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    lineHeight: 20,
  },
  nameText: {
    color: 'blue',
    fontWeight: 'bold',
  },
});

export default SeniorCodeScreen;
