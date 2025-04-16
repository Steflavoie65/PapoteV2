import { db } from '../firebase/config';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  setDoc, 
  getDoc, 
  where, 
  getDocs, 
  serverTimestamp, 
  Timestamp,
  limit as firestoreLimit // Renommer l'import pour éviter les conflits
} from 'firebase/firestore';
import { processImage } from './imageService';
import { Alert } from 'react-native';
import { OPENAI_API_KEY } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns'; // Add this for formatting timestamps

// Constants
const LAST_CONVERSATION_DATE_KEY = 'lastConversationDate';
const CONVERSATION_TOPICS_KEY = 'conversationTopics';
const RECENT_MESSAGES_LIMIT = 10; // Nombre de messages à garder pour le contexte

// Garder un cache des messages récents par conversation
const conversationHistoryCache = new Map();

// Améliorer l'analyse des messages pour mieux détecter l'état émotionnel
export const analyzeMessage = (message) => {
  const health = {
    isSick: /malade|grippe|pas bien|souffr|mal|doctor|médecin|douleur|fatigue/i.test(message),
    symptoms: [],
    severity: 'unknown'
  };

  const situation = {
    isAlone: /seul|pas d'ami|pas de voisin|isolé|solitude/i.test(message),
    mobility: /pas d'auto|pas de voiture|peut pas me déplacer|difficile de bouger/i.test(message) ? 'limited' : 'unknown',
    support: /ami|famille|voisin|aide/i.test(message) ? 'has_support' : 'unknown'
  };

  const mood = {
    isNegative: /triste|seul|mal|inquiet|peur|anxieux|déprimé|pas bien|pas le moral/i.test(message),
    isPositive: /content|heureux|bien|mieux|meilleur|joyeux|sourire/i.test(message),
    intensity: message.match(/(très|beaucoup|tellement|vraiment)/i) ? 'high' : 'normal'
  };

  return { health, situation, mood };
};

// Extraire les sujets et informations importantes d'un message de façon plus détaillée
const extractKeyInformation = (message) => {
  const topics = {
    personnes: [],
    activites: [],
    evenements: [],
    sante: [],
    humeur: null,
    dates: [],
    lieux: []
  };

  // Extraction des personnes (noms courants et relations familiales)
  const personnesRegex = /\b(marie|jean|pierre|paul|sophie|thomas|marc|julie|david|famille|frère|soeur|mère|père|fils|fille|cousin|cousine|tante|oncle|ami|amie|voisin|voisine|petit-fils|petite-fille|grand-père|grand-mère)\b/gi;
  const personnesMatches = message.match(personnesRegex);
  if (personnesMatches) {
    topics.personnes = [...new Set(personnesMatches.map(p => p.toLowerCase()))];
  }

  // Extraction des activités
  const activitesRegex = /\b(jardinage|cuisine|lecture|marche|promenade|télévision|tv|sortie|shopping|course|repas|sieste|dormir|visite|jeu|sport|méditation|gymnastique)\b/gi;
  const activitesMatches = message.match(activitesRegex);
  if (activitesMatches) {
    topics.activites = [...new Set(activitesMatches.map(a => a.toLowerCase()))];
  }

  // Extraction des événements
  const evenementsRegex = /\b(rendez-vous|anniversaire|fête|vacances|visite|sortie|réunion|rencontre|déjeuner|dîner|opération)\b/gi;
  const evenementsMatches = message.match(evenementsRegex);
  if (evenementsMatches) {
    topics.evenements = [...new Set(evenementsMatches.map(e => e.toLowerCase()))];
  }

  // Extraction des problèmes de santé
  const santeRegex = /\b(docteur|médecin|hôpital|clinique|douleur|blessure|médicament|traitement|analyse|examen|tension|diabète|arthrite|arthrose|fatigue|vertige|migraine|mal|dos|tête|jambe|bras|coeur)\b/gi;
  const santeMatches = message.match(santeRegex);
  if (santeMatches) {
    topics.sante = [...new Set(santeMatches.map(s => s.toLowerCase()))];
  }

  // Extraction des dates et périodes
  const datesRegex = /\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre|matin|midi|soir|après-midi|demain|hier|aujourd'hui|semaine|weekend|mois)\b/gi;
  const datesMatches = message.match(datesRegex);
  if (datesMatches) {
    topics.dates = [...new Set(datesMatches.map(d => d.toLowerCase()))];
  }

  // Extraction des lieux
  const lieuxRegex = /\b(maison|jardin|parc|magasin|boutique|supermarché|restaurant|café|hôpital|pharmacie|ville|rue|quartier|centre-ville|église|cinéma|théâtre|musée)\b/gi;
  const lieuxMatches = message.match(lieuxRegex);
  if (lieuxMatches) {
    topics.lieux = [...new Set(lieuxMatches.map(l => l.toLowerCase()))];
  }

  // Humeur plus détaillée
  if (/triste|mal|fatigué|fatigue|déprimé|seul|solitude|inquiet|angoisse|stress|peur/i.test(message)) {
    topics.humeur = 'negative';
  } else if (/content|heureux|bien|mieux|joyeux|sourire|super|excellent|agréable|plaisir/i.test(message)) {
    topics.humeur = 'positive';
  } else if (/normal|comme d'habitude|habituel|ça va|tranquille/i.test(message)) {
    topics.humeur = 'neutral';
  }

  return topics;
};

// Résumer les conversations précédentes pour fournir un contexte
const generateConversationSummary = (messages, limit = 5) => {
  if (!messages || messages.length === 0) return "";
  
  // On prend les derniers messages (limités)
  const recentMessages = messages.slice(-limit);
  
  let summary = "Résumé des conversations récentes: ";
  
  // Générer un résumé structuré
  recentMessages.forEach((msg, index) => {
    if (msg.senderId === 'chatbox') {
      summary += `Vous avez dit: "${msg.content.substring(0, 50)}${msg.content.length > 50 ? '...' : ''}". `;
    } else {
      summary += `L'utilisateur a dit: "${msg.content.substring(0, 50)}${msg.content.length > 50 ? '...' : ''}". `;
    }
  });
  
  return summary;
};

// Fonction améliorée pour récupérer le contexte utilisateur
export const getUserContext = async (userId) => {
  try {
    // Récupérer le contexte depuis Firestore
    const userContextRef = doc(db, 'users', userId, 'context', 'chatbox');
    const contextDoc = await getDoc(userContextRef);
    const savedContext = contextDoc.exists() ? contextDoc.data() : null;

    // Récupérer aussi le contexte local
    const localContextJson = await AsyncStorage.getItem(`user_context_${userId}`);
    const localContext = localContextJson ? JSON.parse(localContextJson) : null;

    // Récupérer les conversations récentes
    const conversationId = getConversationId(userId, 'chatbox');
    let recentMessages = [];
    
    // Vérifier si nous avons des messages en cache
    if (conversationHistoryCache.has(conversationId)) {
      recentMessages = conversationHistoryCache.get(conversationId);
    } else {
      // Sinon récupérer depuis Firebase
      const messagesRef = collection(db, 'conversations', conversationId, 'messages');
      const q = query(
        messagesRef, 
        orderBy('timestamp', 'desc'), 
        firestoreLimit(RECENT_MESSAGES_LIMIT)
      );
      const snapshot = await getDocs(q);
      recentMessages = snapshot.docs.map(doc => doc.data()).reverse();
      
      // Mettre en cache
      conversationHistoryCache.set(conversationId, recentMessages);
    }

    // Générer un résumé des conversations récentes
    const conversationSummary = generateConversationSummary(recentMessages);

    // Fusionner les contextes avec priorité au plus récent
    return {
      lastInteraction: savedContext?.lastInteraction || localContext?.lastInteraction || null,
      health: savedContext?.health || localContext?.health || null,
      mood: savedContext?.mood || localContext?.mood || null,
      situation: savedContext?.situation || localContext?.situation || null,
      recentTopics: savedContext?.recentTopics || localContext?.recentTopics || [],
      importantInfo: savedContext?.importantInfo || localContext?.importantInfo || {},
      lastConversationSummary: conversationSummary || savedContext?.lastConversationSummary || localContext?.lastConversationSummary || null,
      recentMessages: recentMessages || []
    };
  } catch (error) {
    console.error('Erreur récupération contexte:', error);
    return null;
  }
};

// Mise à jour du contexte utilisateur
export const updateUserContext = async (userId, updates) => {
  try {
    const userContextRef = doc(db, 'users', userId, 'context', 'chatbox');

    // Merge updates with existing context
    const currentContext = await getUserContext(userId) || {};
    const updatedContext = {
      ...currentContext,
      ...updates,
      lastUpdated: serverTimestamp()
    };

    // Éviter de stocker les messages récents dans Firestore
    const { recentMessages, ...contextToSave } = updatedContext;

    // Save to Firestore
    await setDoc(userContextRef, contextToSave, { merge: true });

    // Mise à jour du cache local
    await AsyncStorage.setItem(`user_context_${userId}`, JSON.stringify(contextToSave));

    return true;
  } catch (error) {
    console.error('Error updating user context:', error);
    return false;
  }
};

export const initializeUserContext = async (userId, userName) => {
  try {
    const userContextRef = doc(db, 'users', userId, 'context', 'chatbox');
    const contextDoc = await getDoc(userContextRef);
    
    if (!contextDoc.exists()) {
      await setDoc(userContextRef, {
        lastInteraction: serverTimestamp(),
        health: {
          isSick: false,
          lastCheck: serverTimestamp(),
          symptoms: []
        },
        situation: {
          isAlone: false,
          lastCheck: serverTimestamp(),
          mobility: 'unknown',
          support: 'unknown'
        },
        mood: {
          current: 'unknown',
          lastCheck: serverTimestamp()
        },
        profile: {
          name: userName,
          lastUpdate: serverTimestamp()
        },
        messagesCount: 0
      });
    }
    return true;
  } catch (error) {
    console.error('Erreur initialisation contexte:', error);
    return false;
  }
};

// Updated createConversation to ensure proper Firestore structure
export const createConversation = async (familyId, seniorId, userName = null) => {
  try {
    const conversationId = [familyId, seniorId].sort().join('-');
    const conversationRef = doc(db, 'conversations', conversationId);

    if (userName) {
      await initializeUserContext(seniorId, userName);
    }

    await setDoc(conversationRef, {
      participants: [familyId, seniorId],
      createdAt: serverTimestamp(),
      lastMessage: null,
      lastMessageTime: null
    }, { merge: true });

    return { success: true, conversationId };
  } catch (error) {
    console.error('Error creating conversation:', error);
    return { success: false, error: error.message };
  }
};

// Formatage des timestamps pour affichage
const formatTimestamp = (timestamp) => {
  if (!timestamp) return null;

  const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};

// Fonction améliorée d'envoi de message
export const sendMessage = async (conversationId, senderId, content, type = 'text') => {
  try {
    if (!content) {
      return { success: false, error: 'Contenu invalide' };
    }

    // Vérifier si ce n'est pas un message en doublon
    if (senderId === 'chatbox') {
      const lastMessages = await getLastMessages(conversationId, 3);
      if (lastMessages.some(msg => msg.content === content)) {
        console.log('[DEBUG] Message doublon détecté, ignoré');
        return { success: false, error: 'Message doublon' };
      }
    }

    // Vérification et conversion du contenu
    if (content === null || content === undefined) {
      console.log('[DEBUG] Contenu null/undefined dans sendMessage');
      return { success: false, error: 'Contenu invalide' };
    }

    // Force la conversion en string et trim
    const messageContent = String(content).trim();
    
    if (!messageContent) {
      console.log('[DEBUG] Contenu vide après trim');
      return { success: false, error: 'Contenu vide' };
    }

    const clientSentAt = Date.now();
    const messageData = {
      content: messageContent,
      type,
      senderId: String(senderId),
      timestamp: serverTimestamp(),
      clientSentAt,
      displayTimestamp: new Date(clientSentAt).toISOString(),
      read: false,
      isPending: true
    };

    const messageRef = collection(db, 'conversations', conversationId, 'messages');
    const docRef = await addDoc(messageRef, messageData);

    const conversationRef = doc(db, 'conversations', conversationId);
    await setDoc(conversationRef, {
      lastMessage: content.trim(),
      lastMessageTime: serverTimestamp(),
      lastClientTime: clientSentAt
    }, { merge: true });

    // Mise à jour du cache des conversations
    if (conversationHistoryCache.has(conversationId)) {
      const currentCache = conversationHistoryCache.get(conversationId);
      currentCache.push(messageData);
      
      // Limiter la taille du cache
      if (currentCache.length > RECENT_MESSAGES_LIMIT) {
        conversationHistoryCache.set(conversationId, currentCache.slice(-RECENT_MESSAGES_LIMIT));
      } else {
        conversationHistoryCache.set(conversationId, currentCache);
      }
    }

    return { success: true, messageId: docRef.id };
  } catch (error) {
    console.error('[ERREUR] Erreur dans sendMessage:', error);
    return { success: false, error: String(error) };
  }
};

// Fonction améliorée d'abonnement aux messages
export const subscribeToMessages = (conversationId, callback = () => {}) => {
  if (!conversationId || typeof conversationId !== 'string') {
    console.error('[ERREUR] conversationId invalide dans subscribeToMessages:', conversationId);
    if (typeof callback === 'function') callback([]);
    return () => {};
  }
  
  const messagesRef = collection(db, 'conversations', conversationId, 'messages');
  // Modification ici pour ne renvoyer que les 2 derniers messages
  const q = query(messagesRef, orderBy('timestamp', 'desc'), firestoreLimit(2));

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => {
      const data = doc.data();
      const messageId = doc.id;
      let messageWithTimestamp = { id: messageId, ...data };

      if (!data.timestamp) {
        const fallbackTime = data.clientSentAt
          ? new Date(data.clientSentAt)
          : data.displayTimestamp
          ? new Date(data.displayTimestamp)
          : new Date();

        messageWithTimestamp.displayTime = fallbackTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        messageWithTimestamp.pendingServerTimestamp = true;
      } else {
        messageWithTimestamp.displayTime = formatTimestamp(data.timestamp);
        messageWithTimestamp.pendingServerTimestamp = false;
      }

      return messageWithTimestamp;
    }).reverse(); // Inverse l'ordre pour avoir le plus ancien en premier

    // Mise à jour du cache des conversations (sans limiter à 2)
    const fullMessagesRef = collection(db, 'conversations', conversationId, 'messages');
    const fullQ = query(fullMessagesRef, orderBy('timestamp', 'desc'), firestoreLimit(RECENT_MESSAGES_LIMIT));
    
    getDocs(fullQ).then(fullSnapshot => {
      const fullMessages = fullSnapshot.docs.map(doc => doc.data()).reverse();
      conversationHistoryCache.set(conversationId, fullMessages);
    }).catch(error => {
      console.error('[ERREUR] Erreur lors de la mise à jour du cache des messages:', error);
    });

    if (typeof callback === 'function') {
      callback(messages);
    }
  }, (error) => {
    console.error('[ERREUR] Erreur lors de l\'abonnement aux messages :', error);
  });
};

// Statut de frappe (typing)
export const setTypingStatus = async (conversationId, userId, isTyping) => {
  try {
    const typingRef = doc(db, 'conversations', conversationId, 'typing', userId);
    await setDoc(typingRef, {
      isTyping,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error('Erreur mise à jour statut frappe:', error);
  }
};

export const subscribeToTypingStatus = (conversationId, userId, callback) => {
  const typingRef = collection(db, 'conversations', conversationId, 'typing');
  return onSnapshot(typingRef, (snapshot) => {
    const typingUsers = [];
    snapshot.forEach(doc => {
      if (doc.id !== userId && doc.data().isTyping) {
        typingUsers.push(doc.id);
      }
    });
    callback(typingUsers.length > 0);
  });
};

// Fonction améliorée pour générer une réponse contextuelle
export const getChatboxResponse = async (message, userId, conversationId) => {
  try {
    // Récupérer le contexte utilisateur complet
    const userContext = await getUserContext(userId);
    
    // Analyser le message actuel
    const messageAnalysis = analyzeMessage(message);
    
    // Extraire les informations clés du message
    const extractedInfo = extractKeyInformation(message);
    
    // Construire le contexte pour l'API
    const systemContext = {
      role: 'system',
      content: `Tu es un assistant chaleureux, attentif et personnalisé pour personnes âgées. 
      Ton nom est "Chatbox" et tu dois garder tes réponses concises (maximum 3 phrases). 
      Adapte ton style en fonction du contexte émotionnel et fais référence aux sujets précédents 
      quand c'est pertinent. Évite absolument de te répéter ou de donner l'impression que tu n'as pas 
      de mémoire des conversations précédentes.`
    };

    // Construire un résumé de l'état actuel de l'utilisateur
    let currentUserState = "";
    
    if (userContext?.health?.isSick) {
      currentUserState += "L'utilisateur ne se sent pas bien. ";
    }
    
    if (userContext?.situation?.isAlone) {
      currentUserState += "L'utilisateur semble se sentir seul. ";
    }
    
    if (userContext?.mood?.current === 'negative') {
      currentUserState += "L'utilisateur semble avoir un moral bas. ";
    } else if (userContext?.mood?.current === 'positive') {
      currentUserState += "L'utilisateur semble avoir un bon moral. ";
    }
    
    // Ajouter les sujets récurrents
    let recurringTopics = "";
    if (userContext?.recentTopics && userContext.recentTopics.length > 0) {
      recurringTopics = "L'utilisateur parle souvent de: " + userContext.recentTopics.join(", ") + ". ";
    }

    // Créer un contexte historique avec les messages récents (max 5)
    const messageHistory = [];
    
    if (userContext?.recentMessages && userContext.recentMessages.length > 0) {
      // Limiter à 5 messages pour ne pas dépasser le contexte
      const historyLimit = Math.min(5, userContext.recentMessages.length);
      const relevantHistory = userContext.recentMessages.slice(-historyLimit);
      
      relevantHistory.forEach(msg => {
        if (msg.senderId === 'chatbox') {
          messageHistory.push({ 
            role: 'assistant', 
            content: msg.content 
          });
        } else {
          messageHistory.push({ 
            role: 'user', 
            content: msg.content 
          });
        }
      });
    }
    
    // Construire le contexte complet pour l'API
    const conversationContext = [
      systemContext,
      {
        role: 'system',
        content: `Contexte utilisateur: ${currentUserState} ${recurringTopics} ${userContext?.lastConversationSummary || ""}`
      },
      ...messageHistory,
      { role: 'user', content: message }
    ];
    
    // Appel à l'API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: conversationContext,
        temperature: 0.7,
        max_tokens: 150
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Erreur API: ${response.status}`);
    }
    
    const data = await response.json();
    const assistantResponse = data.choices[0].message.content;
    
    // Mettre à jour le contexte utilisateur avec les nouvelles informations
    const updatedTopics = extractedInfo;
    let topicsToSave = userContext?.recentTopics || [];
    
    // Combiner les sujets récurrents
    Object.values(updatedTopics).forEach(category => {
      if (Array.isArray(category)) {
        category.forEach(topic => {
          if (!topicsToSave.includes(topic) && topic) {
            topicsToSave.push(topic);
          }
        });
      }
    });
    
    // Limiter à 10 sujets maximum
    if (topicsToSave.length > 10) {
      topicsToSave = topicsToSave.slice(-10);
    }
    
    // Mettre à jour l'humeur si détectée
    let mood = userContext?.mood || {};
    if (messageAnalysis.mood.isPositive) {
      mood.current = 'positive';
    } else if (messageAnalysis.mood.isNegative) {
      mood.current = 'negative';
    }
    
    // Mettre à jour la santé si mentionnée
    let health = userContext?.health || {};
    if (messageAnalysis.health.isSick) {
      health.isSick = true;
      health.lastCheck = serverTimestamp();
    }
    
    // Mettre à jour la situation si mentionnée
    let situation = userContext?.situation || {};
    if (messageAnalysis.situation.isAlone) {
      situation.isAlone = true;
      situation.lastCheck = serverTimestamp();
    }
    
    // Enregistrer le contexte mis à jour
    await updateUserContext(userId, {
      lastInteraction: serverTimestamp(),
      recentTopics: topicsToSave,
      mood,
      health,
      situation
    });
    
    return assistantResponse;
  } catch (error) {
    console.error('Erreur avec le ChatBox:', error);
    return "Désolé, je ne peux pas répondre pour le moment. Un problème technique est survenu.";
  }
};

// Message d'accueil personnalisé
export const getWelcomeMessage = async (userName = 'cher ami') => {
  try {
    // Récupérer l'heure locale pour adapter le message
    const currentHour = new Date().getHours();
    let greeting = '';
    
    if (currentHour >= 5 && currentHour < 12) {
      greeting = 'Bonjour';
    } else if (currentHour >= 12 && currentHour < 18) {
      greeting = 'Bon après-midi';
    } else {
      greeting = 'Bonsoir';
    }
    
    // Récupérer la date de la dernière conversation si disponible
    const lastDateJson = await AsyncStorage.getItem(LAST_CONVERSATION_DATE_KEY);
    const lastDate = lastDateJson ? new Date(JSON.parse(lastDateJson)) : null;
    const currentDate = new Date();
    
    let welcomeMessage = '';
    let followUpMessage = null;
    
    // Si c'est la première conversation ou après plusieurs jours
    if (!lastDate || (currentDate - lastDate) > 86400000) { // Plus de 24h
      welcomeMessage = `${greeting} ${userName}! Comment allez-vous aujourd'hui?`;
      followUpMessage = "C'est un plaisir de vous revoir.";
    } else {
      // Si moins de 24h, on reprend la conversation
      welcomeMessage = `${greeting} ${userName}! Content de vous retrouver.`;
    }
    
    // Sauvegarder la date de cette conversation
    await AsyncStorage.setItem(LAST_CONVERSATION_DATE_KEY, JSON.stringify(currentDate));
    
    return {
      initial: welcomeMessage,
      followUp: followUpMessage
    };
  } catch (error) {
    console.error('Erreur génération message accueil:', error);
    return {
      initial: `Bonjour! Comment puis-je vous aider aujourd'hui?`,
      followUp: null
    };
  }
};

// Vérifier si un message d'accueil a déjà été envoyé
const isWelcomeMessageAlreadySent = async (conversationId) => {
  try {
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'desc'), firestoreLimit(1));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('Erreur vérification message accueil:', error);
    return false;
  }
};

// Fonction utilitaire pour obtenir l'ID utilisateur
const getUserId = async (userName) => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('firstName', '==', userName));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].id;
    }

    return null;
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'ID utilisateur:', error);
    return null;
  }
};

// Génère l'identifiant de conversation selon le type
export const getConversationId = (userId, participantId) => {
  if (participantId === 'chatbox') {
    return `${userId}-chatbox`;
  }
  return [userId, participantId].sort().join('-');
};

// Récupérer les derniers messages
const getLastMessages = async (conversationId, limitCount = 3) => {
  try {
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const q = query(
      messagesRef, 
      orderBy('timestamp', 'desc'), 
      firestoreLimit(limitCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.error('Erreur getLastMessages:', error);
    return [];
  }
};