import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, Animated } from 'react-native'; // Ajout RefreshControl
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native'; // Importer useFocusEffect
import { getSeniorContacts } from '../services/firestoreService'; // Importer pour vérifier les contacts réels
import { doc, getDoc } from 'firebase/firestore'; // Importer pour vérifier si une demande existe encore
import { db } from '../firebase/config'; // Importer db

const SeniorListScreen = ({ navigation }) => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [connectedSeniors, setConnectedSeniors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [familyProfile, setFamilyProfile] = useState(null); // Pour stocker le profil famille
  const [isRefreshing, setIsRefreshing] = useState(false); // État pour le refresh control
  const [expandedId, setExpandedId] = useState(null);
  const [animation] = useState(new Animated.Value(0));

  // Charger le profil famille au montage (une seule fois)
  useEffect(() => {
    const loadFamilyProfile = async () => {
      const profileJson = await AsyncStorage.getItem('familyProfile');
      if (profileJson) {
        setFamilyProfile(JSON.parse(profileJson));
        console.log("SeniorListScreen: Profil famille chargé.");
      } else {
        console.error("SeniorListScreen: Profil famille non trouvé localement.");
        // Gérer l'erreur si nécessaire
      }
    };
    loadFamilyProfile();
  }, []);


  // Utiliser useFocusEffect pour recharger et synchroniser les données quand l'écran est affiché
  useFocusEffect(
    React.useCallback(() => {
      if (familyProfile?.profile?.userId) {
        synchronizeSeniors(familyProfile.profile.userId);
      } else if (familyProfile === null) {
         // Profil pas encore chargé, attendre le useEffect initial
         console.log("SeniorListScreen: Attente chargement profil famille pour synchro...");
      } else {
         console.error("SeniorListScreen: Impossible de synchroniser sans familyId.");
         setIsLoading(false); // Arrêter le chargement si pas d'ID
      }
    }, [familyProfile]) // Déclencher quand familyProfile change (après chargement initial)
  );

  const synchronizeSeniors = async (familyId) => {
    if (!isRefreshing) {
        setIsLoading(true);
    }
    try {
      // 1. Charger les données locales
      const localPendingJson = await AsyncStorage.getItem('pendingRequests');
      let localPending = localPendingJson ? JSON.parse(localPendingJson) : [];
      const localConnectedJson = await AsyncStorage.getItem('connectedSeniors');
      let localConnected = localConnectedJson ? JSON.parse(localConnectedJson) : [];

      // 2. Charger les contacts réels depuis Firestore
      const firestoreContactsResult = await getSeniorContacts(familyId);
      if (!firestoreContactsResult.success) {
        throw new Error(firestoreContactsResult.error || "Impossible de récupérer les contacts Firestore.");
      }
      const firestoreSeniorContacts = firestoreContactsResult.seniorContacts || [];

      // 3. Nettoyer les demandes en attente qui n'existent plus dans Firestore
      const updatedPending = [];
      for (const pending of localPending) {
        const requestRef = doc(db, 'connectionRequests', pending.id);
        const requestSnap = await getDoc(requestRef);
        if (requestSnap.exists()) {
          updatedPending.push(pending);
        }
        // Si la demande n'existe plus, elle n'est pas ajoutée à updatedPending
      }

      // 4. Mettre à jour AsyncStorage avec les données nettoyées
      await AsyncStorage.setItem('pendingRequests', JSON.stringify(updatedPending));
      await AsyncStorage.setItem('connectedSeniors', JSON.stringify(firestoreSeniorContacts));

      // 5. Mettre à jour l'état
      setPendingRequests(updatedPending);
      setConnectedSeniors(firestoreSeniorContacts);

    } catch (error) {
      console.error('SeniorListScreen: Erreur synchronisation:', error);
      Alert.alert("Erreur", "Impossible de synchroniser vos contacts.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Fonction appelée par le RefreshControl
  const onRefresh = React.useCallback(() => {
    if (familyProfile?.profile?.userId) {
      setIsRefreshing(true); // Indiquer que le rafraîchissement manuel est en cours
      synchronizeSeniors(familyProfile.profile.userId);
    } else {
      // Si pas de profil, arrêter le rafraîchissement immédiatement
      setIsRefreshing(false);
      console.log("SeniorListScreen: Impossible de rafraîchir sans profil famille.");
    }
  }, [familyProfile]); // Dépendance au profil famille

  const toggleCard = (id) => {
    if (expandedId === id) {
      Animated.timing(animation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false
      }).start();
      setExpandedId(null);
    } else {
      setExpandedId(id);
      Animated.timing(animation, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false
      }).start();
    }
  };

  const renderSeniorItem = ({ item }) => {
    const itemId = item.status === 'pending' ? item.seniorId : (item.seniorId || item.id);
    const seniorName = item.firstName || item.seniorName;
    const isExpanded = expandedId === itemId;

    const handleChatNavigation = () => {
      if (!itemId) {
        console.error("ID du senior manquant:", item);
        Alert.alert(
          "Erreur",
          "Impossible d'accéder à la conversation",
          [{ text: "OK" }]
        );
        return;
      }

      if (!seniorName) {
        console.error("Nom du senior manquant:", item);
        Alert.alert(
          "Erreur",
          "Informations du contact incomplètes",
          [{ text: "OK" }]
        );
        return;
      }

      console.log("Navigation vers Chat avec:", {
        participantId: itemId,
        participantName: seniorName,
        itemDetails: item
      });

      try {
        navigation.navigate("Chat", {
          participantId: itemId,
          participantName: seniorName
        });
      } catch (error) {
        console.error("Erreur de navigation:", error);
        Alert.alert(
          "Erreur",
          "Impossible d'ouvrir la conversation",
          [{ text: "OK" }]
        );
      }
    };

    const handleDeleteContact = (contactId) => {
      Alert.alert(
        'Confirmation',
        'Êtes-vous sûr de vouloir supprimer ce contact ?',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Supprimer',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteContact(contactId); // Supprime le contact dans la base de données
                synchronizeSeniors(familyProfile.profile.userId); // Rafraîchit la liste des contacts après suppression
              } catch (error) {
                console.error('Erreur lors de la suppression du contact :', error);
                Alert.alert('Erreur', 'Impossible de supprimer le contact.');
              }
            },
          },
        ]
      );
    };

    return (
      <TouchableOpacity
        style={[styles.seniorCard, isExpanded && styles.seniorCardExpanded]}
        onPress={() => toggleCard(itemId)}
      >
        <View style={styles.seniorMain}>
          <MaterialCommunityIcons 
            name={item.status === 'pending' ? 'clock-outline' : 'account-check'}
            size={40}
            color={item.status === 'pending' ? '#FFA726' : '#4CAF50'}
            style={styles.seniorIcon}
          />
          <View style={styles.seniorTextContainer}>
            <Text style={styles.seniorName}>{seniorName}</Text>
            <Text style={styles.statusText}>
              {item.status === 'pending' ? 'En attente' : 'Connecté'}
            </Text>
          </View>
          <TouchableOpacity onPress={() => handleDeleteContact(itemId)}>
            <MaterialCommunityIcons name="delete" size={24} color="red" />
          </TouchableOpacity>
        </View>

        {isExpanded && (
          <Animated.View style={[styles.actionsContainer, {
            opacity: animation,
            transform: [{
              translateY: animation.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0]
              })
            }]
          }]}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleChatNavigation}
            >
              <MaterialCommunityIcons name="message-text" size={32} color="#4CAF50" />
              <Text style={styles.actionText}>Parler</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <MaterialCommunityIcons name="information" size={32} color="#4285F4" />
              <Text style={styles.actionText}>Détails</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    // ... loading indicator ...
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.screenTitle}>Mes Seniors</Text>
        <Text style={styles.headerSubtitle}>
          {pendingRequests.length > 0 
            ? `${pendingRequests.length} demande${pendingRequests.length > 1 ? 's' : ''} en attente`
            : 'Gérez vos contacts seniors'
          }
        </Text>
      </View>

      <FlatList
        data={[...pendingRequests, ...connectedSeniors].sort((a, b) => {
           // Trier pour mettre les pending en premier, puis par date
           if (a.status === 'pending' && b.status !== 'pending') return -1;
           if (a.status !== 'pending' && b.status === 'pending') return 1;
           const dateA = new Date(a.createdAt || a.dateAdded || 0);
           const dateB = new Date(b.createdAt || b.dateAdded || 0);
           return dateB - dateA; // Plus récent en premier
        })}
        renderItem={renderSeniorItem}
        keyExtractor={item => {
          // Assurer une clé unique en fonction du type d'item
          return item.status === 'pending' ? 
            `pending-${item.id}` : 
            `connected-${item.seniorId}`;
        }}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aucun senior dans votre liste</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => navigation.navigate('AddSenior')}
            >
              <Text style={styles.addButtonText}>Ajouter un senior</Text>
              <MaterialCommunityIcons name="plus" size={20} color="white" />
            </TouchableOpacity>
          </View>
        }
        // Ajouter un refresh control si besoin
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={["#4285F4"]} // Optionnel: couleur de l'indicateur
            tintColor={"#4285F4"} // Optionnel (pour iOS)
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerContainer: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    backgroundColor: 'white',
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4285F4',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginTop: 5,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4285F4',
    marginTop: 10,
  },
  seniorCard: {
    backgroundColor: 'white',
    padding: 5,
    marginVertical: 6,
    marginHorizontal: 16,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    transform: [{ scale: 0.95 }],
    height: 50,
  },
  seniorCardExpanded: {
    transform: [{ scale: 1 }],
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
    height: 150,
  },
  seniorMain: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  seniorIcon: {
    marginRight: 15,
  },
  seniorTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  seniorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  statusText: {
    fontSize: 14,
    color: '#666666',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    paddingTop: 10,
    marginTop: 10,
  },
  actionButton: {
    alignItems: 'center',
    padding: 10,
    minWidth: 100,
  },
  actionText: {
    fontSize: 16,
    color: '#333333',
    marginTop: 5,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#4285F4',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  dateText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
});

export default SeniorListScreen;
