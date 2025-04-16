// Corriger le chemin d'importation du fichier temporaire
import { db, auth } from '../firebase-temp';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Clés pour le stockage local
export const REQUESTS_KEY = 'papote_connection_requests';
export const SENIORS_KEY = 'papote_seniors';
export const CONNECTIONS_KEY = 'papote_connections';

// Fonction utilitaire pour générer un ID unique
const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 9);

// Fonction utilitaire pour obtenir un timestamp
const serverTimestamp = () => new Date().toISOString();

// Enregistrer une demande de connexion
export const saveConnectionRequest = async (request) => {
  try {
    // Récupérer les demandes existantes
    const requestsJson = await AsyncStorage.getItem(REQUESTS_KEY);
    console.log('Demandes existantes:', requestsJson);
    
    const requests = requestsJson ? JSON.parse(requestsJson) : [];
    
    // Créer une nouvelle demande avec ID
    const newRequest = {
      ...request,
      id: generateId(),
      status: 'pending',
      seen: false,
      createdAt: serverTimestamp()
    };
    
    // Ajouter la demande et sauvegarder
    requests.push(newRequest);
    await AsyncStorage.setItem(REQUESTS_KEY, JSON.stringify(requests));
    
    // Vérifier que la demande a bien été enregistrée
    const updatedRequestsJson = await AsyncStorage.getItem(REQUESTS_KEY);
    console.log('Demandes après ajout:', updatedRequestsJson);
    
    console.log('Demande enregistrée avec ID:', newRequest.id);
    return { success: true, id: newRequest.id };
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement de la demande:', error);
    return { success: false, error: error.message };
  }
};

// Récupérer les demandes pour un code senior
export const getRequestsBySeniorCode = async (seniorCode) => {
  try {
    console.log('Recherche des demandes pour le code:', seniorCode);
    
    const requestsJson = await AsyncStorage.getItem(REQUESTS_KEY);
    console.log('Données brutes des demandes:', requestsJson);
    
    const requests = requestsJson ? JSON.parse(requestsJson) : [];
    console.log('Toutes les demandes:', requests);
    
    const filteredRequests = requests.filter(request => request.seniorCode === seniorCode);
    
    console.log('Demandes filtrées pour ce senior:', filteredRequests);
    return { success: true, requests: filteredRequests };
  } catch (error) {
    console.error('Erreur lors de la récupération des demandes:', error);
    return { success: false, error: error.message };
  }
};

// Créer ou mettre à jour un profil senior
export const saveSeniorProfile = async (userId, firstName, code) => {
  try {
    const seniorsJson = await AsyncStorage.getItem(SENIORS_KEY);
    const seniors = seniorsJson ? JSON.parse(seniorsJson) : {};
    
    seniors[userId] = {
      firstName,
      code,
      updatedAt: serverTimestamp()
    };
    
    await AsyncStorage.setItem(SENIORS_KEY, JSON.stringify(seniors));
    
    return { success: true };
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement du profil:', error);
    return { success: false, error: error.message };
  }
};

// Accepter une demande de connexion
export const acceptConnectionRequest = async (requestId) => {
  try {
    const requestsJson = await AsyncStorage.getItem(REQUESTS_KEY);
    const requests = requestsJson ? JSON.parse(requestsJson) : [];
    
    const requestIndex = requests.findIndex(request => request.id === requestId);
    if (requestIndex === -1) {
      return { success: false, error: 'Demande non trouvée' };
    }
    
    const requestData = requests[requestIndex];
    requests[requestIndex] = {
      ...requestData,
      status: 'accepted',
      seen: true,
      updatedAt: serverTimestamp()
    };
    
    await AsyncStorage.setItem(REQUESTS_KEY, JSON.stringify(requests));
    
    const seniorsJson = await AsyncStorage.getItem(SENIORS_KEY);
    const seniors = seniorsJson ? JSON.parse(seniorsJson) : {};
    
    const seniorId = Object.keys(seniors).find(id => seniors[id].code === requestData.seniorCode);
    if (!seniorId) {
      return { success: false, error: 'Senior non trouvé' };
    }
    
    const connectionsJson = await AsyncStorage.getItem(CONNECTIONS_KEY);
    const connections = connectionsJson ? JSON.parse(connectionsJson) : [];
    
    const newConnection = {
      seniorId,
      familyId: requestData.familyId,
      status: 'accepted',
      createdAt: serverTimestamp()
    };
    
    connections.push(newConnection);
    await AsyncStorage.setItem(CONNECTIONS_KEY, JSON.stringify(connections));
    
    return { success: true };
  } catch (error) {
    console.error('Erreur lors de l\'acceptation de la demande:', error);
    return { success: false, error: error.message };
  }
};

// Refuser une demande de connexion
export const rejectConnectionRequest = async (requestId) => {
  try {
    const requestsJson = await AsyncStorage.getItem(REQUESTS_KEY);
    const requests = requestsJson ? JSON.parse(requestsJson) : [];
    
    const requestIndex = requests.findIndex(request => request.id === requestId);
    if (requestIndex === -1) {
      return { success: false, error: 'Demande non trouvée' };
    }
    
    requests[requestIndex] = {
      ...requests[requestIndex],
      status: 'rejected',
      seen: true,
      updatedAt: serverTimestamp()
    };
    
    await AsyncStorage.setItem(REQUESTS_KEY, JSON.stringify(requests));
    
    return { success: true };
  } catch (error) {
    console.error('Erreur lors du rejet de la demande:', error);
    return { success: false, error: error.message };
  }
};
