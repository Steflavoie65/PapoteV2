import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  updateDoc,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';

// Service de gestion des connexions entre seniors et familles

// Créer une demande de connexion
export const createConnectionRequest = async (seniorCode, familyId, familyName, seniorNameGuess) => {
  try {
    // Vérifier si le code senior existe
    const seniorsRef = collection(db, 'seniors');
    const q = query(seniorsRef, where("code", "==", seniorCode));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return { success: false, error: "Code senior invalide" };
    }
    
    // Obtenir l'ID du senior
    const seniorData = querySnapshot.docs[0].data();
    const seniorId = querySnapshot.docs[0].id;
    
    // Vérifier si la connexion existe déjà
    const connectionsRef = collection(db, 'connections');
    const connectionsQuery = query(
      connectionsRef, 
      where("seniorId", "==", seniorId),
      where("familyId", "==", familyId)
    );
    const connectionsSnapshot = await getDocs(connectionsQuery);
    
    if (!connectionsSnapshot.empty) {
      return { success: false, error: "Connexion déjà existante" };
    }
    
    // Vérifier si le prénom est correct
    if (seniorNameGuess.toLowerCase() !== seniorData.firstName.toLowerCase()) {
      return { success: false, error: "Le prénom ne correspond pas" };
    }
    
    // Créer la demande de connexion
    await addDoc(collection(db, 'connectionRequests'), {
      seniorCode,
      seniorId,
      familyId,
      familyName,
      seniorNameGuess,
      status: 'pending',
      seen: false,
      createdAt: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error("Erreur de création de demande de connexion:", error);
    return { success: false, error: error.message };
  }
};

// Accepter une demande de connexion
export const acceptConnectionRequest = async (requestId) => {
  try {
    // Récupérer la demande
    const requestRef = doc(db, 'connectionRequests', requestId);
    const requestSnap = await getDoc(requestRef);
    
    if (!requestSnap.exists()) {
      return { success: false, error: "Demande non trouvée" };
    }
    
    const requestData = requestSnap.data();
    
    // Mettre à jour le statut de la demande
    await updateDoc(requestRef, {
      status: 'accepted',
      seen: true
    });
    
    // Créer la connexion
    await addDoc(collection(db, 'connections'), {
      seniorId: requestData.seniorId,
      familyId: requestData.familyId,
      status: 'accepted',
      createdAt: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error("Erreur d'acceptation de demande:", error);
    return { success: false, error: error.message };
  }
};

// Rejeter une demande de connexion
export const rejectConnectionRequest = async (requestId) => {
  try {
    const requestRef = doc(db, 'connectionRequests', requestId);
    await updateDoc(requestRef, {
      status: 'rejected',
      seen: true
    });
    
    return { success: true };
  } catch (error) {
    console.error("Erreur de rejet de demande:", error);
    return { success: false, error: error.message };
  }
};

// Obtenir les demandes de connexion pour un senior
export const getSeniorConnectionRequests = async (seniorId) => {
  try {
    const q = query(
      collection(db, 'connectionRequests'), 
      where("seniorId", "==", seniorId)
    );
    
    const querySnapshot = await getDocs(q);
    const requests = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return { success: true, requests };
  } catch (error) {
    console.error("Erreur de récupération des demandes:", error);
    return { success: false, error: error.message };
  }
};

// Obtenir les connexions d'un utilisateur (senior ou famille)
export const getUserConnections = async (userId, userType) => {
  try {
    const q = query(
      collection(db, 'connections'),
      where(userType === 'senior' ? 'seniorId' : 'familyId', "==", userId),
      where("status", "==", "accepted")
    );
    
    const querySnapshot = await getDocs(q);
    const connections = [];
    
    // Pour chaque connexion, récupérer les détails de l'autre utilisateur
    for (const docRef of querySnapshot.docs) {
      const connectionData = docRef.data();
      const otherUserId = userType === 'senior' ? connectionData.familyId : connectionData.seniorId;
      
      const otherUserDoc = await getDoc(doc(db, 'users', otherUserId));
      
      if (otherUserDoc.exists()) {
        connections.push({
          id: docRef.id,
          connectionId: docRef.id,
          userId: otherUserId,
          ...otherUserDoc.data(),
          createdAt: connectionData.createdAt
        });
      }
    }
    
    return { success: true, connections };
  } catch (error) {
    console.error("Erreur de récupération des connexions:", error);
    return { success: false, error: error.message };
  }
};

// Écouter les nouvelles demandes de connexion en temps réel
export const listenToConnectionRequests = (seniorId, callback) => {
  const q = query(
    collection(db, 'connectionRequests'),
    where("seniorId", "==", seniorId),
    where("seen", "==", false)
  );
  
  return onSnapshot(q, (querySnapshot) => {
    const requests = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(requests);
  });
};
