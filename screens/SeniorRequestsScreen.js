import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert // Ajouter Alert
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getRequestsBySeniorCode, acceptConnectionRequest, rejectConnectionRequest } from '../services/firestoreService';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Ajouter AsyncStorage

const SeniorRequestsScreen = ({ route }) => {
  const { seniorCode } = route.params || {};
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [seniorProfile, setSeniorProfile] = useState(null); // Ajouter l'état pour le profil senior

  // Charger le profil senior au montage
  useEffect(() => {
    const loadProfile = async () => {
      const profileJson = await AsyncStorage.getItem('seniorProfile');
      if (profileJson) {
        setSeniorProfile(JSON.parse(profileJson));
        console.log("Profil senior chargé dans SeniorRequestsScreen");
      } else {
        console.error("Profil senior non trouvé dans AsyncStorage pour SeniorRequestsScreen");
        // Gérer l'erreur, peut-être afficher un message ou rediriger
        Alert.alert("Erreur", "Impossible de charger votre profil. Veuillez vous reconnecter.");
      }
    };
    loadProfile();
  }, []);

  useEffect(() => {
    if (!seniorCode) {
      console.error('Code senior non reçu dans les paramètres');
      setIsLoading(false);
      return;
    }

    const fetchRequests = async () => {
      setIsLoading(true);
      console.log('Recherche des demandes pour le code:', seniorCode);
      const result = await getRequestsBySeniorCode(seniorCode);

      if (result.success) {
        // Filtrer pour ne garder que les demandes en attente
        const pending = result.requests.filter(r => r.status === 'pending');
        console.log('Demandes en attente récupérées:', pending);
        setRequests(pending);
      } else {
        console.error('Erreur lors de la récupération des demandes:', result.error);
      }
      setIsLoading(false);
    };

    fetchRequests();
  }, [seniorCode]);

  // Fonctions pour gérer l'acceptation et le refus
  const handleAccept = async (request) => {
    if (!seniorProfile) {
      Alert.alert("Erreur", "Votre profil n'est pas chargé.");
      return;
    }
    setProcessingId(request.id);
    console.log("Tentative d'acceptation demande:", request.id, "avec profil senior:", seniorProfile);
    // Passer le profil senior complet à la fonction
    const result = await acceptConnectionRequest(request.id, seniorProfile);
    setProcessingId(null);
    if (result.success) {
      Alert.alert("Succès", "Connexion acceptée !");
      // Retirer la demande de la liste affichée
      setRequests(prev => prev.filter(r => r.id !== request.id));
      // Optionnel: Mettre à jour la liste des contacts locaux si nécessaire
    } else {
      console.error("Erreur acceptation:", result.error);
      Alert.alert("Erreur", `Impossible d'accepter la demande: ${result.error}`);
    }
  };

  const handleReject = async (request) => {
    setProcessingId(request.id);
    console.log("Tentative de refus demande:", request.id);
    const result = await rejectConnectionRequest(request.id);
    setProcessingId(null);
    if (result.success) {
      Alert.alert("Refusé", "La demande a été refusée.");
      // Retirer la demande de la liste affichée
      setRequests(prev => prev.filter(r => r.id !== request.id));
    } else {
      console.error("Erreur refus:", result.error);
      Alert.alert("Erreur", `Impossible de refuser la demande: ${result.error}`);
    }
  };

  // Affichage de chaque demande
  const renderItem = ({ item }) => (
    <View style={styles.requestItem}>
      <View style={styles.requestHeader}>
        <MaterialCommunityIcons name="account-question" size={24} color="#4285F4" />
        <Text style={styles.requestTitle}>
          {/* Afficher Prénom et Nom */}
          Demande de {item.familyFirstName || ''} {item.familyName || 'Famille'}
        </Text>
      </View>
      {/* Afficher le message s'il existe */}
      {item.message && (
        <Text style={styles.requestMessage}>"{item.message}"</Text>
      )}
      {/* Afficher la date (optionnel) */}
      <Text style={styles.requestDate}>
        Reçu le: {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : 'Date inconnue'}
      </Text>

      {/* Boutons Accepter/Refuser */}
      <View style={styles.buttonContainer}>
        {processingId === item.id ? (
          <ActivityIndicator color="#4CAF50" />
        ) : (
          <>
            <TouchableOpacity
              style={[styles.button, styles.rejectButton]}
              onPress={() => handleReject(item)}
              disabled={!!processingId} // Désactiver si une autre action est en cours
            >
              <MaterialCommunityIcons name="close-circle-outline" size={20} color="white" />
              <Text style={styles.buttonText}>Refuser</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.acceptButton]}
              onPress={() => handleAccept(item)}
              disabled={!!processingId} // Désactiver si une autre action est en cours
            >
              <MaterialCommunityIcons name="check-circle-outline" size={20} color="white" />
              <Text style={styles.buttonText}>Accepter</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );

  // Affichage pendant le chargement
  if (isLoading || !seniorProfile) { // Attendre aussi le chargement du profil
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4285F4" />
        <Text>Chargement des demandes...</Text>
      </SafeAreaView>
    );
  }

  // Affichage principal
  return (
    <SafeAreaView style={styles.container}>
      {/* Enlever ScrollView si FlatList est le seul élément scrollable */}
      <Text style={styles.title}>Demandes de connexion</Text>
      {requests.length === 0 ? (
        <Text style={styles.noRequestsText}>Aucune demande de connexion en attente</Text>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={renderItem} // Utiliser la fonction renderItem définie ci-dessus
          contentContainerStyle={styles.listContent} // Ajouter un padding pour la liste
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // ... (styles container, title, errorText, noRequestsText) ...
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  listContent: {
    paddingHorizontal: 15, // Ajouter du padding horizontal à la liste
    paddingBottom: 20,
  },
  requestItem: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 15, // Augmenter l'espacement
    borderRadius: 10, // Arrondir un peu plus
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, // Ombre plus subtile
    shadowRadius: 3,
    elevation: 2,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  requestTitle: {
    fontSize: 17, // Légèrement plus grand
    fontWeight: '600', // Semi-bold
    color: '#333',
    marginLeft: 10,
    flex: 1, // Pour prendre l'espace restant
  },
  requestMessage: {
    fontSize: 15,
    color: '#555',
    fontStyle: 'italic',
    marginBottom: 8,
    marginLeft: 34, // Aligner avec le titre
  },
  requestDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 15, // Espace avant les boutons
    marginLeft: 34, // Aligner avec le titre
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end', // Aligner les boutons à droite
    marginTop: 10,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20, // Boutons arrondis
    marginLeft: 10, // Espace entre les boutons
  },
  acceptButton: {
    backgroundColor: '#4CAF50', // Vert
  },
  rejectButton: {
    backgroundColor: '#F44336', // Rouge
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  container: { // Assurer que ces styles existent
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 20, // Ajouter margin vertical
    color: '#4285F4',
    textAlign: 'center',
  },
  noRequestsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 50, // Ajouter de l'espace si vide
  },
});

export default SeniorRequestsScreen;
