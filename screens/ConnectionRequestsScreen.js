import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  FlatList, 
  TouchableOpacity, 
  SafeAreaView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { getRequestsBySeniorCode, acceptConnectionRequest, rejectConnectionRequest } from '../services/firestoreService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getItemWithLogging } from '../utils/AsyncStorageLogger';

const ConnectionRequestsScreen = ({ navigation }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [seniorProfile, setSeniorProfile] = useState(null);

  const loadRequests = async () => {
    try {
      console.log('Chargement du profil senior depuis AsyncStorage...');
      const seniorProfileJson = await getItemWithLogging('seniorProfile');
      const seniorProfile = seniorProfileJson ? JSON.parse(seniorProfileJson) : null;

      if (!seniorProfile || !seniorProfile.seniorCode) {
        console.error('Profil ou seniorCode non défini');
        Alert.alert('Erreur', 'Impossible de récupérer votre profil senior.');
        setLoading(false);
        return;
      }

      console.log('Profil senior chargé:', seniorProfile);
      setSeniorProfile(seniorProfile);

      console.log('Recherche des demandes dans Firestore pour le code:', seniorProfile.seniorCode);
      const result = await getRequestsBySeniorCode(seniorProfile.seniorCode);

      if (result.success) {
        console.log('Demandes trouvées dans Firestore:', result.requests);
        setRequests(result.requests);
      } else {
        console.error('Erreur lors de la récupération des demandes:', result.error);
        Alert.alert('Erreur', 'Impossible de récupérer les demandes de connexion.');
      }
    } catch (error) {
      console.error('Erreur lors du chargement des demandes:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors du chargement des demandes.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadRequests();
  };

  const handleAcceptRequest = async (request) => {
    try {
      console.log('Acceptation de la demande de connexion avec ID:', request.id);

      // Charger le profil senior depuis AsyncStorage
      const seniorProfileJson = await AsyncStorage.getItem('seniorProfile');
      const seniorProfile = seniorProfileJson ? JSON.parse(seniorProfileJson) : null;

      if (!seniorProfile || !seniorProfile.id) {
        throw new Error('Profil senior introuvable ou invalide.');
      }

      console.log('Profil senior chargé:', seniorProfile);

      // Transmettre les données nécessaires pour accepter la demande
      const result = await acceptConnectionRequest(request.id, seniorProfile, {
        familyId: request.familyId,
        familyName: request.familyName,
      });

      if (result.success) {
        Alert.alert('Succès', 'La demande de connexion a été acceptée.', [
          {
            text: 'OK',
            onPress: () => {
              // Recharger les demandes après l'acceptation
              loadRequests();
              // Ne pas rediriger vers un écran qui nécessite un profil familial
              // Rester sur l'écran actuel ou rediriger vers un écran senior
              navigation.navigate('SeniorHome');
            }
          }
        ]);
      } else {
        throw new Error(result.error || 'Erreur lors de l\'acceptation de la demande.');
      }
    } catch (error) {
      console.error('Erreur lors de l\'acceptation de la demande:', error);
      Alert.alert('Erreur', error.message || 'Une erreur est survenue.');
    }
  };

  const handleReject = async (request) => {
    if (!seniorProfile || !seniorProfile.seniorCode) {
      console.error('Profil ou seniorCode non défini');
      Alert.alert('Erreur', 'Impossible de traiter cette demande.');
      return;
    }

    Alert.alert(
      'Refuser la connexion',
      `Voulez-vous refuser la demande de ${request.familyName} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Refuser', 
          onPress: async () => {
            try {
              setLoading(true);
              const result = await rejectConnectionRequest(request.id);
              
              if (result.success) {
                Alert.alert('Demande refusée', `La demande de ${request.familyName} a été refusée`);
                loadRequests();
              } else {
                Alert.alert('Erreur', result.error || 'Une erreur est survenue');
              }
            } catch (error) {
              Alert.alert('Erreur', 'Une erreur est survenue');
              console.error(error);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const renderRequestItem = ({ item }) => (
    <View style={styles.requestItem}>
      <View style={styles.requestInfo}>
        <Text style={styles.familyName}>{item.familyName}</Text>
        <Text style={styles.requestDate}>
          Demande reçue le {new Date(item.createdAt.seconds * 1000).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.acceptButton]}
          onPress={() => handleAcceptRequest(item)}
        >
          <Text style={styles.actionButtonText}>Accepter</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => handleReject(item)}
        >
          <Text style={styles.actionButtonText}>Refuser</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4285F4" />
        <Text style={styles.loadingText}>Chargement des demandes...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Demandes de connexion</Text>
      
      {requests.length > 0 ? (
        <FlatList
          data={requests}
          renderItem={renderRequestItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            Vous n'avez aucune demande de connexion en attente.
          </Text>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={handleRefresh}
          >
            <Text style={styles.refreshButtonText}>Rafraîchir</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#4285F4',
  },
  listContent: {
    paddingBottom: 20,
  },
  requestItem: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  requestInfo: {
    marginBottom: 15,
  },
  familyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  requestDate: {
    fontSize: 14,
    color: '#666',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    padding: 10,
    borderRadius: 5,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#34A853',
  },
  rejectButton: {
    backgroundColor: '#EA4335',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  refreshButton: {
    backgroundColor: '#4285F4',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
    maxWidth: 200,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ConnectionRequestsScreen;
