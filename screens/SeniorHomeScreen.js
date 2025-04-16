import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRequestsBySeniorCode } from '../services/firestoreService';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Constante pour la clé de stockage des demandes
const REQUESTS_KEY = 'papote_connection_requests';

const SeniorHomeScreen = ({ navigation }) => {
  const [profile, setProfile] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);

  const loadProfileAndRequests = async () => {
    try {
      console.log("SeniorHomeScreen: Chargement profil et demandes...");
      const storedProfile = await AsyncStorage.getItem('seniorProfile');
      if (storedProfile) {
        const profileData = JSON.parse(storedProfile);
        // Mise à jour du profil (peut rester optimisée)
        if (JSON.stringify(profileData) !== JSON.stringify(profile)) {
          setProfile(profileData);
        }

        const seniorCode = profileData?.profile?.seniorCode;
        if (seniorCode) {
          console.log("SeniorHomeScreen: Récupération des demandes pour", seniorCode);
          const result = await getRequestsBySeniorCode(seniorCode);
          if (result.success) {
            const pending = result.requests.filter(r => r.status === 'pending');
            // Simplification: Toujours mettre à jour l'état des demandes.
            // React est assez intelligent pour ne pas re-rendre si la valeur est identique.
            setPendingRequests(pending);
            console.log("SeniorHomeScreen: Nombre de demandes en attente défini:", pending.length);
          } else {
            console.error("SeniorHomeScreen: Erreur getRequestsBySeniorCode:", result.error);
            setPendingRequests([]); // Vider en cas d'erreur
          }
        } else {
          console.error("SeniorHomeScreen: seniorCode non trouvé dans le profil local.");
          setPendingRequests([]);
        }
      } else {
        console.error("SeniorHomeScreen: Profil senior local non trouvé.");
        setProfile(null);
        setPendingRequests([]);
      }
    } catch (error) {
      console.error('SeniorHomeScreen: Erreur loadProfileAndRequests:', error);
      setProfile(null);
      setPendingRequests([]);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadProfileAndRequests();
    }, [])
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerContainer}>
          <MaterialCommunityIcons name="account-circle" size={64} color="#4285F4" />
          <Text style={styles.welcomeText}>
            Bienvenue {profile?.profile?.firstName}
          </Text>
        </View>

        <View style={styles.menuContainer}>
          <TouchableOpacity 
            style={styles.menuCard}
            onPress={() => {
              const seniorCode = profile?.profile?.seniorCode;
              if (seniorCode) {
                console.log('Navigation vers SeniorRequestsScreen avec code:', seniorCode);
                navigation.navigate('SeniorRequestsScreen', { seniorCode: seniorCode });
              } else {
                console.error('Impossible de naviguer: seniorCode non trouvé dans le profil', profile);
                Alert.alert("Erreur", "Votre profil n'est pas chargé correctement. Essayez de redémarrer l'application.");
              }
            }}
          >
            <MaterialCommunityIcons name="account-multiple-plus" size={32} color="#4285F4" />
            <Text style={styles.menuTitle}>Demandes de connexion</Text>
            <Text style={styles.menuSubtitle}>Gérez vos connexions familiales</Text>

            {pendingRequests.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingRequests.length}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuCard}
            onPress={() => navigation.navigate('FamilyContacts')} // Corrected screen name
          >
            <MaterialCommunityIcons name="account-group" size={32} color="#4285F4" />
            <Text style={styles.menuTitle}>Ma Famille</Text>
            <Text style={styles.menuSubtitle}>Voir mes contacts familiaux</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuCard}
            onPress={() => navigation.navigate('SeniorSettings')}
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
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    padding: 20,
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4285F4',
    marginTop: 10,
  },
  menuContainer: {
    gap: 15,
  },
  menuCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  menuSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#FF4444',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default SeniorHomeScreen;
