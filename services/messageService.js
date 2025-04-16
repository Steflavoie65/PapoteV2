import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';

// Service pour la gestion des messages entre utilisateurs

// Envoyer un message
export const sendMessage = async (senderId, receiverId, messageContent, messageType = 'text') => {
  try {
    // Créer le message dans Firestore
    const messageData = {
      senderId,
      receiverId,
      content: messageContent,
      type: messageType, // 'text', 'image', 'audio', etc.
      status: 'sent',
      createdAt: serverTimestamp(),
      readAt: null
    };
    
    const docRef = await addDoc(collection(db, 'messages'), messageData);
    
    return { success: true, messageId: docRef.id };
  } catch (error) {
    console.error("Erreur d'envoi de message:", error);
    return { success: false, error: error.message };
  }
};

// Récupérer les messages entre deux utilisateurs
export const getMessages = async (userId1, userId2, limit = 50) => {
  try {
    // Créer une requête pour récupérer les messages dans les deux sens
    const q = query(
      collection(db, 'messages'),
      where('senderId', 'in', [userId1, userId2]),
      where('receiverId', 'in', [userId1, userId2]),
      orderBy('createdAt', 'desc'),
      limit(limit)
    );
    
    const querySnapshot = await getDocs(q);
    
    // Transformer les résultats en tableau de messages
    const messages = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() // Convertir le timestamp en Date
    }));
    
    // Marquer les messages non lus comme lus
    const unreadMessages = messages.filter(
      msg => msg.receiverId === userId1 && !msg.readAt
    );
    
    for (const msg of unreadMessages) {
      await updateDoc(doc(db, 'messages', msg.id), {
        status: 'read',
        readAt: serverTimestamp()
      });
    }
    
    // Trier les messages du plus ancien au plus récent
    messages.sort((a, b) => a.createdAt - b.createdAt);
    
    return { success: true, messages };
  } catch (error) {
    console.error("Erreur de récupération des messages:", error);
    return { success: false, error: error.message };
  }
};

// Écouter les nouveaux messages en temps réel
export const listenToMessages = (userId1, userId2, callback) => {
  const q = query(
    collection(db, 'messages'),
    where('senderId', 'in', [userId1, userId2]),
    where('receiverId', 'in', [userId1, userId2]),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  
  // Créer un écouteur pour les mises à jour en temps réel
  return onSnapshot(q, (querySnapshot) => {
    const messages = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate()
    }));
    
    // Trier les messages du plus ancien au plus récent
    messages.sort((a, b) => a.createdAt - b.createdAt);
    
    // Appeler le callback avec les messages mis à jour
    callback(messages);
  });
};

// Compter les messages non lus
export const getUnreadMessagesCount = async (userId) => {
  try {
    const q = query(
      collection(db, 'messages'),
      where('receiverId', '==', userId),
      where('status', '==', 'sent')
    );
    
    const querySnapshot = await getDocs(q);
    
    return { 
      success: true, 
      count: querySnapshot.size 
    };
  } catch (error) {
    console.error("Erreur de comptage des messages non lus:", error);
    return { success: false, error: error.message };
  }
};
