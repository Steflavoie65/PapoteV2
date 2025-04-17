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

// Récupérer les messages entre deux utilisateurs - Version simplifiée en attendant la création de l'index
export const getMessages = async (userId1, userId2, messageLimit = 50) => {
  try {
    // Version simplifiée sans 'in' ni tri pour fonctionner sans index composite
    console.log("Tentative de récupération des messages avec requête simplifiée");
    const q = query(
      collection(db, 'messages'),
      where('senderId', '==', userId1),
      where('receiverId', '==', userId2)
    );
    
    const q2 = query(
      collection(db, 'messages'),
      where('senderId', '==', userId2),
      where('receiverId', '==', userId1)
    );
    
    const [snapshot1, snapshot2] = await Promise.all([
      getDocs(q),
      getDocs(q2)
    ]);
    
    // Fusionner les résultats des deux requêtes
    const messages = [
      ...snapshot1.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      })),
      ...snapshot2.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }))
    ];
    
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
    
    // Trier manuellement les messages du plus ancien au plus récent
    messages.sort((a, b) => {
      if (!a.createdAt) return -1;
      if (!b.createdAt) return 1;
      return a.createdAt - b.createdAt;
    });
    
    // Limiter le nombre de messages
    const limitedMessages = messages.slice(-messageLimit);
    
    return { success: true, messages: limitedMessages };
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
