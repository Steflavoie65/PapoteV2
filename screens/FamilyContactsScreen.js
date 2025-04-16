import React, { useState, useEffect } from 'react';
// Ajouter TouchableOpacity
import { StyleSheet, Text, View, SafeAreaView, FlatList, ActivityIndicator, Alert, TouchableOpacity, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFamilyContacts } from '../services/firestoreService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
// Ajouter useNavigation
import { useFocusEffect, useNavigation } from '@react-navigation/native';

const FamilyContactsScreen = () => {
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [seniorProfile, setSeniorProfile] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [animation] = useState(new Animated.Value(0));
  const navigation = useNavigation(); // Hook de navigation

  const chatBoxContact = {
    id: 'chatbox',
    name: 'ChatBox (Assistant Virtuel)', // Ajout d'un nom descriptif
    type: 'virtual',
  };

  // Charger le profil senior au focus de l'écran
  useFocusEffect(
    React.useCallback(() => {
      const loadProfile = async () => {
        console.log("FamilyContactsScreen: Tentative de chargement du profil senior...");
        setIsLoading(true); // Mettre en chargement pendant la lecture du profil
        const profileJson = await AsyncStorage.getItem('seniorProfile');
        if (profileJson) {
          const profile = JSON.parse(profileJson);
          setSeniorProfile(profile);
          console.log("FamilyContactsScreen: Profil senior chargé:", profile?.profile?.userId);
          // Charger les contacts seulement si le profil est chargé
          if (profile?.profile?.userId) {
            loadContacts(profile.profile.userId);
          } else {
             console.error("FamilyContactsScreen: userId non trouvé dans le profil chargé.");
             Alert.alert("Erreur", "Impossible de lire votre identifiant.");
             setIsLoading(false);
          }
        } else {
          console.error("FamilyContactsScreen: Aucun profil senior trouvé dans AsyncStorage.");
          Alert.alert("Erreur", "Impossible de charger votre profil. Veuillez vous reconnecter.");
          setIsLoading(false);
        }
      };
      loadProfile();
    }, [])
  );

  // Fonction pour charger les contacts
  const loadContacts = async (seniorId) => {
    if (!seniorId) return; // Sécurité
    console.log("FamilyContactsScreen: Chargement des contacts pour seniorId:", seniorId);
    setIsLoading(true);
    try {
      const result = await getFamilyContacts(seniorId);
      if (result.success) {
        console.log("FamilyContactsScreen: Contacts reçus:", result.familyContacts);
        console.log("Contacts récupérés :", result.familyContacts); // Log pour vérifier les données récupérées
        const contacts = [chatBoxContact, ...result.familyContacts]; // Ajouter ChatBox au début de la liste des contacts
        setContacts(contacts);
      } else {
        console.error("FamilyContactsScreen: Erreur chargement contacts:", result.error);
        Alert.alert("Erreur", "Impossible de charger les contacts familiaux.");
        setContacts([]); // Vider les contacts en cas d'erreur
      }
    } catch (error) {
       console.error("FamilyContactsScreen: Exception chargement contacts:", error);
       Alert.alert("Erreur", "Une exception s'est produite lors du chargement des contacts.");
       setContacts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCard = (familyId) => {
    if (expandedId === familyId) {
      // Fermer la carte
      Animated.timing(animation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false
      }).start();
      setExpandedId(null);
    } else {
      // Ouvrir la carte
      setExpandedId(familyId);
      Animated.timing(animation, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false
      }).start();
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
              refreshContacts(); // Rafraîchit la liste des contacts après suppression
            } catch (error) {
              console.error('Erreur lors de la suppression du contact:', error);
              Alert.alert('Erreur', 'Impossible de supprimer le contact.');
            }
          },
        },
      ]
    );
  };

  const renderContactItem = ({ item }) => {
    const isExpanded = expandedId === item.familyId;

    return (
      <TouchableOpacity
        style={[
          styles.contactCard,
          isExpanded && styles.contactCardExpanded
        ]}
        onPress={() => toggleCard(item.familyId)}
      >
        <View style={styles.contactMain}>
          <MaterialCommunityIcons 
            name="account-heart" 
            size={40} 
            color="#4285F4" 
            style={styles.contactIcon}
          />
          <View style={styles.contactTextContainer}>
            <Text style={styles.contactFirstName}>{item.familyFirstName || "ChatBox"}</Text>
            <Text style={styles.contactLastName}>{item.familyName || "Ami Virtuel"}</Text>
          </View>
          <TouchableOpacity onPress={() => handleDeleteContact(item.familyId)}>
            <MaterialCommunityIcons name="delete" size={24} color="red" />
          </TouchableOpacity>
        </View>
        {isExpanded && (
          <Animated.View 
            style={[
              styles.actionsContainer,
              {
                opacity: animation,
                transform: [{
                  translateY: animation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0]
                  })
                }]
              }
            ]}
          >
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => {
                if (item.id === 'chatbox') {
                  navigation.navigate('Chat', {
                    participantId: 'chatbox',
                    participantName: 'ChatBox (Assistant Virtuel)',
                    isVirtual: true, // Indicateur pour un chat virtuel
                  });
                } else {
                  navigation.navigate('Chat', {
                    participantId: item.familyId,
                    participantName: `${item.familyFirstName} ${item.familyName}`,
                    isVirtual: false, // Indicateur pour un vrai contact
                  });
                }
              }}
            >
              <MaterialCommunityIcons name="message-text" size={32} color="#4CAF50" />
              <Text style={styles.actionText}>Parler</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => {
                if (seniorProfile?.profile?.userId) {
                  navigation.navigate('ContactDetail', {
                    familyId: item.familyId,
                    seniorId: seniorProfile.profile.userId,
                  });
                }
              }}
            >
              <MaterialCommunityIcons name="information" size={32} color="#4285F4" />
              <Text style={styles.actionText}>Détails</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4285F4" />
        <Text>Chargement...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Ma Famille</Text>
      {contacts.length === 0 ? (
        <Text style={styles.emptyText}>Aucun contact familial pour le moment.</Text>
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(item) => item.familyId || item.id}
          renderItem={renderContactItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 20,
    color: '#4285F4',
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 15,
  },
  contactCard: {
    backgroundColor: 'white',
    padding: 5,           // Réduit à 5
    marginVertical: 6,    // Réduit à 6
    marginHorizontal: 16,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    transform: [{ scale: 0.95 }],
    height: 50,          // Réduit à 50
  },
  contactCardExpanded: {
    transform: [{ scale: 1 }],
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
    height: 150,         // Réduit à 150
  },
  contactMain: {
    flexDirection: 'row',  // Changé en row
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  contactIcon: {
    marginRight: 15,
  },
  contactTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  contactFirstName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  contactLastName: {
    fontSize: 14,
    color: '#666666',
  },
  relationshipText: {
    fontSize: 18,       // Police plus grande pour la relation
    color: '#666666',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    paddingTop: 10,       // Réduit de 15 à 10
    marginTop: 10,        // Réduit de 15 à 10
  },
  actionButton: {
    alignItems: 'center',
    padding: 10,        // Zone de toucher plus grande
    minWidth: 100,      // Largeur minimale pour les boutons
  },
  actionText: {
    fontSize: 16,       // Texte lisible
    color: '#333333',   // Bon contraste
    marginTop: 5,       // Espace après l'icône
  },
  contactDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 50,
  },
  contactDetail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
});

export default FamilyContactsScreen;
