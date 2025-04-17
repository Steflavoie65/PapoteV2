import { db } from '../firebase/config';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  getDoc, 
  where, 
  getDocs, 
  serverTimestamp, 
  Timestamp,
  limit 
} from 'firebase/firestore';
import { OPENAI_API_KEY } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMessages } from './messageService';

// Cache mémoire temporaire pour contextes et mémoires
const memoryCache = {
  userContexts: {},
  userMemories: {},
  lastFetch: {}
};

/**
 * Récupère le contexte utilisateur avec cache optimisé
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<Object>} - Contexte utilisateur
 */
export const getUserContext = async (userId) => {
  try {
    if (!userId) {
      console.error('[ERREUR] userId manquant dans getUserContext');
      return null;
    }
    
    // Vérifier si on a une version en cache récente (moins de 5 minutes)
    const now = Date.now();
    if (memoryCache.userContexts[userId] && 
        memoryCache.lastFetch[`context_${userId}`] && 
        now - memoryCache.lastFetch[`context_${userId}`] < 300000) {
      return memoryCache.userContexts[userId];
    }
    
    // Essayer d'abord AsyncStorage pour réponse rapide
    try {
      const contextJson = await AsyncStorage.getItem(`user_context_${userId}`);
      if (contextJson) {
        const parsedContext = JSON.parse(contextJson);
        memoryCache.userContexts[userId] = parsedContext;
        memoryCache.lastFetch[`context_${userId}`] = now;
        
        // Récupérer depuis Firestore en background pour mise à jour éventuelle
        getContextFromFirestore(userId).then(firestoreContext => {
          if (firestoreContext) {
            memoryCache.userContexts[userId] = firestoreContext;
            memoryCache.lastFetch[`context_${userId}`] = now;
            AsyncStorage.setItem(`user_context_${userId}`, JSON.stringify(firestoreContext));
          }
        });
        
        return parsedContext;
      }
    } catch (storageError) {
      console.warn('[AVERTISSEMENT] Erreur AsyncStorage dans getUserContext:', storageError);
    }
    
    // Si pas dans AsyncStorage, chercher dans Firestore
    const firestoreContext = await getContextFromFirestore(userId);
    
    if (firestoreContext) {
      memoryCache.userContexts[userId] = firestoreContext;
      memoryCache.lastFetch[`context_${userId}`] = now;
      AsyncStorage.setItem(`user_context_${userId}`, JSON.stringify(firestoreContext));
      return firestoreContext;
    }
    
    // Si rien n'est trouvé, créer un contexte vide
    const emptyContext = {
      health: {},
      situation: {},
      mood: { current: 'unknown' },
      createdAt: new Date().toISOString()
    };
    
    memoryCache.userContexts[userId] = emptyContext;
    memoryCache.lastFetch[`context_${userId}`] = now;
    
    // Sauvegarder ce contexte vide en background
    updateUserContext(userId, emptyContext);
    
    return emptyContext;
  } catch (error) {
    console.error('[ERREUR] Exception dans getUserContext:', error);
    return null;
  }
};

/**
 * Helper interne pour récupérer le contexte depuis Firestore
 */
const getContextFromFirestore = async (userId) => {
  const userContextRef = doc(db, 'users', userId, 'context', 'chatbox');
  const contextDoc = await getDoc(userContextRef);
  
  if (contextDoc.exists()) {
    return contextDoc.data();
  }
  return null;
};

/**
 * Récupère les mémoires utilisateur avec cache optimisé et synchronisation Firestore améliorée
 */
const getUserMemories = async (userId) => {
  try {
    if (!userId) return [];
    
    // Vérifier si on a une version en cache récente (moins de 2 minutes)
    const now = Date.now();
    if (memoryCache.userMemories[userId] && 
        memoryCache.lastFetch[`memories_${userId}`] && 
        now - memoryCache.lastFetch[`memories_${userId}`] < 120000) {
      return memoryCache.userMemories[userId];
    }
    
    console.log('[DEBUG] Récupération des mémoires pour', userId);
    
    // Récupérer depuis Firestore en priorité
    try {
      // Collection des mémoires de l'utilisateur
      const userMemoriesRef = collection(db, 'users', userId, 'memories');
      
      // Simplifier la requête pour éviter l'erreur d'index
      const memoriesQuery = query(
        userMemoriesRef,
        orderBy('timestamp', 'desc'),
        limit(20)
      );
      
      const memoriesSnapshot = await getDocs(memoriesQuery);
      
      if (!memoriesSnapshot.empty) {
        const memories = memoriesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().timestamp?.toDate?.() || new Date()
        }));
        
        // Trier côté client par importance si nécessaire
        memories.sort((a, b) => {
          // D'abord par importance décroissante
          const importanceDiff = (b.importance || 0) - (a.importance || 0);
          if (importanceDiff !== 0) return importanceDiff;
          
          // Puis par date décroissante (plus récent en premier)
          const dateA = new Date(a.createdAt);
          const dateB = new Date(b.createdAt);
          return dateB - dateA;
        });
        
        // Mettre à jour le cache et AsyncStorage
        memoryCache.userMemories[userId] = memories;
        memoryCache.lastFetch[`memories_${userId}`] = now;
        
        await AsyncStorage.setItem(`user_memories_${userId}`, JSON.stringify(memories));
        console.log(`[DEBUG] ${memories.length} mémoires récupérées depuis Firestore`);
        return memories;
      }
    } catch (firestoreError) {
      console.error('[ERREUR] Récupération des mémoires Firestore:', firestoreError);
    }
    
    // Si Firestore échoue, essayer AsyncStorage
    try {
      const memoriesJson = await AsyncStorage.getItem(`user_memories_${userId}`);
      if (memoriesJson) {
        const memories = JSON.parse(memoriesJson);
        memoryCache.userMemories[userId] = memories;
        memoryCache.lastFetch[`memories_${userId}`] = now;
        console.log(`[DEBUG] ${memories.length} mémoires récupérées depuis AsyncStorage`);
        return memories;
      }
    } catch (storageError) {
      console.warn('[AVERTISSEMENT] Erreur AsyncStorage pour mémoires:', storageError);
    }
    
    console.log('[DEBUG] Aucune mémoire trouvée pour', userId);
    return [];
  } catch (error) {
    console.error('[ERREUR] Exception dans getUserMemories:', error);
    return [];
  }
};

// Version optimisée et simplifiée de l'analyse de messages
function analyzeMessage(message) {
  if (!message || typeof message !== 'string') {
    return {
      health: { isSick: false },
      situation: { isAlone: false },
      mood: { isPositive: false, isNegative: false },
      lifeEvents: { isBirth: false, isWedding: false, isDeath: false },
      relationship: { mentionsCousine: false }
    };
  }
  
  const lowerMessage = message.toLowerCase();
  
  // Version optimisée avec des expressions régulières pour recherche plus rapide
  const healthPattern = /malade|douleur|mal|souffr|médecin|docteur|hopital|clinique|santé/;
  const lonelinessPattern = /seul|solitude|isolé|manque|visite|personne ne|abandonné/;
  const negativePattern = /triste|déprim|malheureu|souffr|inquiet|angoiss|peur|stress|anxieu|mal/;
  const positivePattern = /content|heureu|joyeu|bien|génial|super|excell|formidable|agréable|plaisir/;
  
  return {
    health: { isSick: healthPattern.test(lowerMessage) },
    situation: { isAlone: lonelinessPattern.test(lowerMessage) },
    mood: { 
      isPositive: positivePattern.test(lowerMessage),
      isNegative: negativePattern.test(lowerMessage)
    },
    lifeEvents: { 
      isBirth: /naissance|bébé|accouch/.test(lowerMessage),
      isWedding: /mariage|fianc|marié/.test(lowerMessage),
      isDeath: /décès|mort|enterrement/.test(lowerMessage) 
    },
    relationship: { 
      mentionsCousine: lowerMessage.includes("cousine") 
    }
  };
}

// Version optimisée du calcul d'importance de mémoire
function calculateMemoryImportance(message) {
  const text = message.toLowerCase();
  
  // Utilisation de Map pour recherche plus rapide
  const topicScores = new Map([
    [/naissance|bébé|accouch/, { score: 10, topic: "la naissance du bébé" }],
    [/mariage|fianc|marié/, { score: 10, topic: "le mariage dans votre famille" }],
    [/décès|enterrement|mort|funérailles/, { score: 10, topic: "le décès dans votre famille" }],
    [/anniversaire|fête|noël|nouvel an/, { score: 8, topic: "un événement important" }],
    [/petit-(fils|fille|enfant)/, { score: 9, topic: "vos petits-enfants" }],
    [/fils|fille|enfant/, { score: 8, topic: "vos enfants" }],
    [/cousine?/, { score: 7, topic: "votre cousine" }],
    [/famille/, { score: 7, topic: "votre famille" }],
    [/maladie|opération|hospital/, { score: 9, topic: "votre santé" }],
    [/médecin|docteur/, { score: 7, topic: "votre rendez-vous médical" }],
    [/voyage|vacances/, { score: 8, topic: "votre voyage" }],
    [/sortie|visite/, { score: 6, topic: "votre sortie" }],
    [/triste|déprim|seul/, { score: 7, topic: "vos sentiments" }],
    [/content|heureu|joie/, { score: 6, topic: "votre bonheur" }]
  ]);
  
  // Trouver le meilleur match
  for (const [pattern, data] of topicScores) {
    if (pattern.test(text)) {
      return data;
    }
  }
  
  return { score: 0, topic: "notre conversation" };
}

/**
 * Détecte les activités mentionnées et leur temporalité
 * @param {string} message - Le message à analyser
 * @returns {Object} - Les activités classées par temporalité
 */
function detectActivitiesAndTiming(message) {
  if (!message || typeof message !== 'string') return null;
  
  const lowerMessage = message.toLowerCase();
  
  // Structure pour stocker les activités par temporalité
  const activities = {
    future: [],
    past: [],
    present: []
  };
  
  // Patterns temporels
  const futurePatterns = [
    /demain/i, 
    /dans (quelques|[0-9]+) (jour|semaine|mois)/i,
    /la semaine prochaine/i,
    /prochain/i,
    /bientôt/i,
    /va (aller|partir|faire)/i,
    /vais/i,
    /prévu/i
  ];
  
  const pastPatterns = [
    /hier/i,
    /la semaine (passée|dernière)/i,
    /(j'ai|on a) (fait|été)/i,
    /est allé/i,
    /suis allé/i,
    /était/i,
    /terminé/i,
    /fini/i
  ];
  
  const presentPatterns = [
    /aujourd'hui/i,
    /en ce moment/i,
    /actuellement/i,
    /maintenant/i,
    /présentement/i
  ];
  
  // Activités à surveiller
  const activitiesToDetect = [
    { name: "randonnée", patterns: [/randonn/i, /marche/i, /rando/i] },
    { name: "visite au Vatican", patterns: [/vatican/i, /rome/i, /italie/i] },
    { name: "visite à la cousine", patterns: [/cousine/i, /visit/i, /voir/i] },
    { name: "visite à l'hôpital", patterns: [/hopital/i, /hôpital/i, /clinique/i] },
    { name: "naissance du bébé", patterns: [/bébé/i, /naissance/i, /accouche/i] }
  ];
  
  // Détection du temps verbal global du message
  let globalTiming = 'unknown';
  
  for (const pattern of futurePatterns) {
    if (pattern.test(lowerMessage)) {
      globalTiming = 'future';
      break;
    }
  }
  
  if (globalTiming === 'unknown') {
    for (const pattern of pastPatterns) {
      if (pattern.test(lowerMessage)) {
        globalTiming = 'past';
        break;
      }
    }
  }
  
  if (globalTiming === 'unknown') {
    for (const pattern of presentPatterns) {
      if (pattern.test(lowerMessage)) {
        globalTiming = 'present';
        break;
      }
    }
  }
  
  // Détection des activités
  for (const activity of activitiesToDetect) {
    // Vérifier si l'activité est mentionnée
    const isActivityMentioned = activity.patterns.some(pattern => pattern.test(lowerMessage));
    
    if (isActivityMentioned) {
      // Détecter la temporalité spécifique à cette activité
      let activityTiming = globalTiming;
      
      // Si la temporalité n'est pas déterminée par le contexte global, chercher des indices spécifiques
      if (activityTiming === 'unknown') {
        // Chercher des indices de temps futur proches de l'activité
        for (const pattern of activity.patterns) {
          const matchIndex = lowerMessage.search(pattern);
          if (matchIndex >= 0) {
            // Analyser une fenêtre de 20 caractères avant et après la mention
            const windowStart = Math.max(0, matchIndex - 20);
            const windowEnd = Math.min(lowerMessage.length, matchIndex + 20);
            const contextWindow = lowerMessage.substring(windowStart, windowEnd);
            
            // Vérifier la temporalité dans la fenêtre contextuelle
            if (futurePatterns.some(p => p.test(contextWindow))) {
              activityTiming = 'future';
              break;
            } else if (pastPatterns.some(p => p.test(contextWindow))) {
              activityTiming = 'past';
              break;
            } else if (presentPatterns.some(p => p.test(contextWindow))) {
              activityTiming = 'present';
              break;
            }
          }
        }
      }
      
      // Si toujours indéterminé, considérer comme futur par défaut pour les activités
      if (activityTiming === 'unknown') {
        activityTiming = 'future';
      }
      
      // Ajouter l'activité à la liste correspondante
      activities[activityTiming].push(activity.name);
    }
  }
  
  return activities;
}

// Stockage des activités par temporalité (persistance entre les appels)
const userActivitiesTimeline = {};

/**
 * Met à jour le calendrier d'activités d'un utilisateur
 */
async function updateUserActivitiesTimeline(userId, message) {
  if (!userId || !message) return;
  
  // Détecter les activités dans le message
  const detectedActivities = detectActivitiesAndTiming(message);
  if (!detectedActivities) return;
  
  // Initialiser le calendrier si nécessaire
  if (!userActivitiesTimeline[userId]) {
    userActivitiesTimeline[userId] = {
      future: new Set(),
      past: new Set(),
      present: new Set(),
      lastUpdated: new Date()
    };
    
    // Essayer de charger depuis AsyncStorage
    try {
      const storedTimeline = await AsyncStorage.getItem(`user_activities_${userId}`);
      if (storedTimeline) {
        const parsed = JSON.parse(storedTimeline);
        userActivitiesTimeline[userId] = {
          future: new Set(parsed.future || []),
          past: new Set(parsed.past || []),
          present: new Set(parsed.present || []),
          lastUpdated: new Date(parsed.lastUpdated || Date.now())
        };
      }
    } catch (e) {
      console.warn('[AVERTISSEMENT] Erreur chargement timeline activités:', e);
    }
  }
  
  // Mettre à jour les activités détectées
  detectedActivities.future.forEach(activity => {
    userActivitiesTimeline[userId].future.add(activity);
    // Supprimer des autres catégories si présent
    userActivitiesTimeline[userId].past.delete(activity);
    userActivitiesTimeline[userId].present.delete(activity);
  });
  
  detectedActivities.past.forEach(activity => {
    userActivitiesTimeline[userId].past.add(activity);
    // Supprimer des autres catégories si présent
    userActivitiesTimeline[userId].future.delete(activity);
    userActivitiesTimeline[userId].present.delete(activity);
  });
  
  detectedActivities.present.forEach(activity => {
    userActivitiesTimeline[userId].present.add(activity);
    // Supprimer des autres catégories si présent
    userActivitiesTimeline[userId].future.delete(activity);
    userActivitiesTimeline[userId].past.delete(activity);
  });
  
  userActivitiesTimeline[userId].lastUpdated = new Date();
  
  // Sauvegarder dans AsyncStorage
  try {
    await AsyncStorage.setItem(`user_activities_${userId}`, JSON.stringify({
      future: Array.from(userActivitiesTimeline[userId].future),
      past: Array.from(userActivitiesTimeline[userId].past),
      present: Array.from(userActivitiesTimeline[userId].present),
      lastUpdated: userActivitiesTimeline[userId].lastUpdated
    }));
  } catch (e) {
    console.warn('[AVERTISSEMENT] Erreur sauvegarde timeline activités:', e);
  }
  
  console.log('[DEBUG] Timeline activités mise à jour pour', userId, {
    future: Array.from(userActivitiesTimeline[userId].future),
    past: Array.from(userActivitiesTimeline[userId].past),
    present: Array.from(userActivitiesTimeline[userId].present)
  });
}

/**
 * Fonction pour générer la réponse du chatbox avec meilleure gestion mémoire et format
 */
export const getChatboxResponse = async (message, userId = null, temporalAndLocationContext = null) => {
  try {
    console.log('[DEBUG] Traitement de message:', message);
    const memoryScore = calculateMemoryImportance(message);
    const messageAnalysis = analyzeMessage(message);
    
    // Initialiser la variable conversationHistory ici
    let conversationHistory = [];
    // Initialiser le prompt contextuel
    let contextualizedPrompt = "";

    // Mettre à jour la timeline des activités (AJOUT)
    if (userId) {
      await updateUserActivitiesTimeline(userId, message);
      await collectGlobalMemories(userId);
    }
    
    const [userContext, existingMemories] = await Promise.all([
      getUserContext(userId),
      getUserMemories(userId)
    ]);
    
    // HISTORIQUE
    if (userId) {
      const conversationId = getConversationId(userId, 'chatbox');
      console.log(`[DEBUG] Récupération de l'historique pour ${conversationId}`);
      const messagesRef = collection(db, 'conversations', conversationId, 'messages');
      const historyQuery = query(messagesRef, orderBy('timestamp', 'asc'), limit(200));
      const historySnapshot = await getDocs(historyQuery);
      conversationHistory = historySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log(`[DEBUG] Historique récupéré (${conversationHistory.length} messages)`);

      if (conversationHistory.length > 0) {
        const historyText = conversationHistory.map(m => {
          const role = m.senderId === 'chatbox' ? 'Assistant' : (userContext?.firstName || 'Utilisateur');
          return `- ${role}: "${m.content}"`;
        }).join('\n');

        contextualizedPrompt = `Historique de la conversation:\n${historyText}\n\nNouvelle demande: "${message}"`;
        console.log('[DEBUG] Prompt contextualisé avec historique');
      } else {
        // fallback messages depuis root (optionnel)
        const { success, messages: rootHistory } = await getMessages(userId, 'chatbox', 10);
        if (success && rootHistory.length > 0) {
          const fallbackText = rootHistory.map(m => {
            const role = m.senderId === 'chatbox' ? 'Assistant' : (userContext?.firstName || 'Utilisateur');
            return `- ${role}: "${m.content}"`;
          }).join('\n');
          contextualizedPrompt = `Historique (root):\n${fallbackText}\n\nNouvelle demande: "${message}"`;
        }
      }
    }

    // ➕ Cas spécial : Lancement automatique du chat
    if (message === 'Commence la discussion naturellement') {
      const conversationId = getConversationId(userId, 'chatbox');
      const messagesRef = collection(db, 'conversations', conversationId, 'messages');
      const historyQuery = query(messagesRef, orderBy('timestamp', 'desc'), limit(5));
      const historySnapshot = await getDocs(historyQuery);
      const recentMsgs = historySnapshot.docs.map(doc => doc.data()).reverse();

      const lines = recentMsgs.map(m => {
        const who = m.senderId === 'chatbox' ? 'Moi' : (userContext?.firstName || 'Vous');
        return `- ${who} : "${m.content}"`;
      }).join('\n');

      contextualizedPrompt = `
Tu es un assistant amical pour ${userContext?.firstName || 'l’utilisateur'}.
Voici les derniers échanges :
${lines}

Relance la conversation comme un ami : rappelle un sujet récent, pose une question, sois chaleureux.
Ne redis pas juste "Bonjour, comment puis-je vous aider ?"
`.trim();
    }

    // Créer un prompt pour l'API OpenAI - passer conversationHistory et userActivitiesTimeline
    const optimizedPrompt = await createOptimizedPrompt(
      contextualizedPrompt,
      userContext,
      messageAnalysis,
      [],
      temporalAndLocationContext,
      conversationHistory,
      userId ? userActivitiesTimeline[userId] : null // Ajouter la timeline
    );
    
    
    try {
      // Appel à l'API avec timeout pour éviter les blocages trop longs
      const response = await Promise.race([
        generateOpenAIResponse(optimizedPrompt),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout API')), 8000)
        )
      ]);
      
      // IMPORTANT: Retourner directement le contenu de la réponse
      return response;
    } catch (apiError) {
      console.error('[ERREUR] API ou timeout:', apiError);
      
      // Générer une réponse de secours plus sophistiquée en cas d'échec API
      if (userContext?.firstName) {
        // Retourner directement la réponse de secours sans wrapper JSON
        return createFallbackResponse(message, userContext, memoryScore);
      }
      
      return `Je suis désolé, mais j'ai du mal à vous répondre pour le moment. Comment puis-je vous aider autrement ?`;
    }
  } catch (error) {
    console.error('[ERREUR] Exception dans getChatboxResponse:', error);
    return "Je suis vraiment désolé, je n'ai pas pu traiter votre message. Pouvez-vous reformuler ?";
  }
};

/**
 * Génère une réponse immédiate temporaire pour certains types de messages
 * @param {string} message - Message à analyser
 * @returns {string|null} - Réponse rapide ou null
 */
function getQuickResponse(message) {
  if (!message) return null;
  
  const lowerMsg = message.toLowerCase().trim();
  
  // Map de réponses rapides pour les messages courants
  const quickResponses = {
    'bonjour': 'Bonjour ! Comment allez-vous aujourd\'hui ?',
    'salut': 'Salut ! Comment puis-je vous aider ?',
    'ça va': 'Je vais bien, merci ! Et vous, comment allez-vous ?',
    'merci': 'Avec plaisir ! Y a-t-il autre chose que je puisse faire pour vous ?',
    'au revoir': 'Au revoir ! Passez une excellente journée !',
    'bonsoir': 'Bonsoir ! Comment se passe votre soirée ?'
  };
  
  // Rechercher une correspondance exacte
  if (quickResponses[lowerMsg]) {
    return quickResponses[lowerMsg];
  }
  
  // Pour les messages très courts (1-3 mots), donner une réponse générique
  if (lowerMsg.split(/\s+/).length <= 3) {
    for (const [key, value] of Object.entries(quickResponses)) {
      if (lowerMsg.includes(key)) {
        return value;
      }
    }
  }
  
  return null;
}

/**
 * Crée un prompt optimisé pour l'API OpenAI avec meilleure intégration mémoire
 */
async function createOptimizedPrompt(message, userContext, messageAnalysis, relatedMemories = [], temporalAndLocationContext = null, conversationHistory = [], activitiesTimeline = null) {
  // Enrichir avec le prénom si disponible
  const firstName = userContext?.firstName || 'Henri';
  
  // Ajouter des éléments de contexte pertinents
  let contextElements = [];
  
  if (userContext?.recentImportantEvent) {
    contextElements.push(`Événement récent important: ${userContext.recentImportantEvent.context} - "${userContext.recentImportantEvent.content}"`);
  }
  
  if (userContext?.health?.conditions) {
    contextElements.push(`Santé: ${userContext.health.conditions}`);
  }
  
  if (userContext?.situation?.living) {
    contextElements.push(`Situation: ${userContext.situation.living}`);
  }
  
  // AJOUT : Inclure le contexte temporel et de localisation en tête du prompt
  let temporalLocationString = '';
  if (temporalAndLocationContext) {
    temporalLocationString = `${temporalAndLocationContext}\n\n`;
  }

  // AJOUT : filtrer les souvenirs déjà traités récemment (7 jours)
  const currentDate = new Date();
  const sevenDaysAgo = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Charger les mémoires récentes si non fournies
  let recentMemories = relatedMemories;
  if (!recentMemories || recentMemories.length === 0) {
    if (userContext?.userId) {
      try {
        const memoriesJson = await AsyncStorage.getItem(`user_memories_${userContext.userId}`);
        if (memoriesJson) {
          recentMemories = JSON.parse(memoriesJson);
        }
      } catch (e) {
        // ignore
      }
    }
  }

  // Filtrer les souvenirs déjà évoqués dans les 7 derniers jours
  const filteredMemories = (recentMemories || []).filter(mem => {
    if (!mem.createdAt) return false;
    const memDate = new Date(mem.createdAt);
    return memDate > sevenDaysAgo;
  });

  // Ne pas rappeler les sujets déjà évoqués récemment
  // Ajout : n'ajouter qu'un souvenir important qui n'est pas dans filteredMemories
  if (relatedMemories.length > 0 && contextElements.length < 2) {
    const importantMemory = relatedMemories
      .filter(mem => {
        // Exclure les topics déjà évoqués récemment
        return !filteredMemories.some(fm => fm.topic === mem.topic);
      })
      .sort((a, b) => b.importance - a.importance)[0];
    if (importantMemory) {
      contextElements.push(`Souvenir important: ${importantMemory.topic} - "${importantMemory.content}"`);
    }
  }
  
  // Filtrer les souvenirs avec des délais non atteints
  const now = new Date();
  const filteredByReminderMemories = (recentMemories || []).filter(mem => {
    if (!mem.createdAt) return false;
    if (mem.remindAfter) {
      const remindDate = new Date(mem.remindAfter);
      return now >= remindDate; // N'inclure que si la date de rappel est passée
    }
    return true;
  });

  // Ajouter une instruction explicite pour éviter certains sujets
  let avoidTopics = [];
  (recentMemories || []).forEach(mem => {
    if (mem.remindAfter) {
      const remindDate = new Date(mem.remindAfter);
      if (now < remindDate) {
        avoidTopics.push(mem.topic);
      }
    }
  });

  // Amélioration de l'extraction des sujets avec la temporalité
  let recentMessagesForTopic = [];
  const recentMessages = conversationHistory?.slice(-15) || [];
  let activeContextTopics = [];

  // Construire les listes d'activités par temporalité
  let futureActivities = [];
  let pastActivities = [];
  let presentActivities = [];
  
  // Utiliser la timeline d'activités si disponible
  if (activitiesTimeline) {
    futureActivities = Array.from(activitiesTimeline.future || []);
    pastActivities = Array.from(activitiesTimeline.past || []);
    presentActivities = Array.from(activitiesTimeline.present || []);
  }

  // Extraire les sujets explicitement mentionnés (pas d'invention)
  recentMessages.filter(msg => msg.senderId !== 'chatbox').forEach(msg => {
    if (msg.content && typeof msg.content === 'string') {
      const topic = calculateMemoryImportance(msg.content);
      if (topic.score > 3) {
        activeContextTopics.push({
          topic: topic.topic,
          content: msg.content,
          score: topic.score
        });
      }
      recentMessagesForTopic.push(msg.content);
    }
  });

  // Construire la liste des sujets actifs
  const activeContext = activeContextTopics.length > 0
    ? activeContextTopics.sort((a, b) => b.score - a.score)[0].topic
    : 'conversation générale';

  // Construire la liste des sujets à éviter
  const topicsToAvoid = [];
  (recentMemories || []).forEach(mem => {
    if (mem.remindAfter) {
      const remindDate = new Date(mem.remindAfter);
      if (now < remindDate) {
        topicsToAvoid.push(`${mem.topic} (jusqu'au ${remindDate.toLocaleDateString()})`);
      }
    }
  });

  // Créer un prompt final avec un accent encore plus fort sur la temporalité
  const finalPrompt = `${temporalLocationString}Tu es un assistant chaleureux et amical pour ${firstName}.

Instructions critiques:
1. Appelle-le TOUJOURS "${firstName}" dans chaque réponse
2. Utilise le vouvoiement ("vous", pas "tu")
3. Sois chaleureux, compréhensif et empathique
4. Réponds de façon brève et simple (max 1-2 phrases)

5. ⚠️ ATTENTION À LA TEMPORALITÉ ⚠️
ACTIVITÉS STRICTEMENT FUTURES (À VENIR): ${futureActivities.length > 0 ? futureActivities.join(', ') : 'aucune'} 
ACTIVITÉS PASSÉES (DÉJÀ RÉALISÉES): ${pastActivities.length > 0 ? pastActivities.join(', ') : 'aucune'}
ACTIVITÉS EN COURS: ${presentActivities.length > 0 ? presentActivities.join(', ') : 'aucune'}

6. Tu dois ABSOLUMENT respecter la chronologie: NE JAMAIS parler d'une activité future comme si elle avait déjà eu lieu
7. Pour les activités futures, utilise "allez-vous", "prévoyez-vous", "avez-vous hâte de", "vous préparez-vous à"
8. Pour les activités passées, utilise "comment s'est passé", "avez-vous apprécié"
9. Ne JAMAIS inventer de détails ou de faits non mentionnés par ${firstName}
10. Reste cohérent avec le contexte actuel: ${futureActivities.includes('randonnée') ? "randonnée prévue, pas encore réalisée" : 
                                           pastActivities.includes('randonnée') ? "randonnée déjà effectuée" : 
                                           "conversation générale"}

${topicsToAvoid.length > 0 ? `11. IMPORTANT: Ne parle PAS des sujets suivants : ${topicsToAvoid.join(', ')}` : ""}
${messageAnalysis.health.isSick ? "12. La personne a mentionné des problèmes de santé, sois attentif" : ""}
${messageAnalysis.mood.isNegative ? "13. La personne exprime des sentiments négatifs, montre de l'empathie" : ""}

${recentMessagesForTopic.length > 0 ? 'Derniers messages de l\'utilisateur:\n- ' + recentMessagesForTopic.slice(-5).join('\n- ') + '\n' : ''}
${contextElements.length > 0 ? 'Contexte important:\n' + contextElements.join('\n') : ''}`;

  return {
    system: finalPrompt,
    user: message
  };
}

/**
 * Génère une réponse via l'API OpenAI avec corrections de format
 */
const generateOpenAIResponse = async (prompt) => {
  try {
    if (!OPENAI_API_KEY) {
      throw new Error('Clé API OpenAI non définie');
    }
    
    // Préparation des messages pour l'API avec structure minimale
    const messages = [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user }
    ];
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: messages,
        temperature: 0.6,  // Température plus basse pour plus de cohérence
        max_tokens: 150,  // Réduit pour réponses plus courtes et rapides
        presence_penalty: 0.7,  // Augmenté pour réduire les répétitions
        frequency_penalty: 0.7   // Augmenté pour réduire les répétitions
      })
    });
    
    if (!response.ok) {
      throw new Error(`Erreur API: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Réponse API invalide');
    }
    
    // Traitement du texte de réponse pour s'assurer qu'il ne contient pas de JSON
    const responseText = data.choices[0].message.content.trim();
    
    // Vérifier si la réponse contient du JSON et l'extraire si nécessaire
    if (responseText.includes('{"content":') || responseText.includes('{"isPartial":')) {
      try {
        const jsonMatch = responseText.match(/\{.*\}/s);
        if (jsonMatch) {
          const jsonObj = JSON.parse(jsonMatch[0]);
          return jsonObj.content || responseText;
        }
      } catch (e) {
        // Si l'extraction échoue, utiliser le texte brut
        console.warn('[AVERTISSEMENT] Échec extraction JSON de réponse:', e);
      }
    }
    
    console.log('[DEBUG] Réponse IA:', responseText);
    return responseText;
  } catch (error) {
    console.error('[ERREUR] API OpenAI:', error);
    throw error;
  }
};

/**
 * Crée une réponse de secours en cas d'échec de l'API
 */
function createFallbackResponse(message, userContext, memoryScore) {
  const firstName = userContext?.firstName || 'Henri';
  const isBirthday = message.toLowerCase().includes('anniversaire');
  const isHealth = message.toLowerCase().includes('santé') || message.toLowerCase().includes('médecin');
  const isFamily = memoryScore.topic.includes('famille') || message.toLowerCase().includes('famille');
  
  // Réponses de secours personnalisées selon le contexte
  if (isBirthday) {
    return `Cher ${firstName}, je vous souhaite un très joyeux anniversaire ! Passez une merveilleuse journée !`;
  } else if (isHealth) {
    return `${firstName}, je comprends que votre santé est importante. Comment vous sentez-vous aujourd'hui ?`;
  } else if (isFamily) {
    return `${firstName}, votre famille est ce qu'il y a de plus précieux. Comment vont vos proches ?`;
  }
  
  // Réponse générique avec le prénom
  return `Cher ${firstName}, je suis là pour discuter avec vous. Comment se passe votre journée ?`;
}

/**
 * Version améliorée du stockage de mémoire utilisateur
 * Stocke systématiquement dans Firestore et AsyncStorage
 */
export const storeUserMemory = async (userId, topic, content, importance = 5) => {
  try {
    if (!userId || !content) {
      console.error('[ERREUR] Paramètres invalides dans storeUserMemory');
      return false;
    }

    // --- AJOUT : Vérification de doublon temporel (7 jours) ---
    const currentTime = new Date(); // Renommé 'now' en 'currentTime'
    const sevenDaysAgo = new Date(currentTime.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Charger les mémoires existantes (depuis cache ou Firestore)
    let existingMemories = [];
    try {
      const memoriesJson = await AsyncStorage.getItem(`user_memories_${userId}`);
      if (memoriesJson) {
        existingMemories = JSON.parse(memoriesJson);
      }
    } catch (e) {
      // ignore
    }

    // Vérifier si un souvenir du même topic existe dans les 7 derniers jours
    const hasRecentSimilar = existingMemories.some(mem => {
      if (!mem.topic || !mem.createdAt) return false;
      if (mem.topic !== topic) return false;
      const memDate = new Date(mem.createdAt);
      return memDate > sevenDaysAgo;
    });

    if (hasRecentSimilar) {
      console.log(`[DEBUG] Souvenir "${topic}" déjà enregistré récemment, on ignore pour éviter la répétition.`);
      return false;
    }
    // --- FIN AJOUT ---

    console.log(`[DEBUG] Stockage mémoire: "${topic}" (importance: ${importance})`);
    
    // Analyse simplifiée pour mémoire
    const messageAnalysis = analyzeMessage(content);
    
    // Déterminer le contexte rapidement
    let context = "Conversation générale";
    if (messageAnalysis.lifeEvents.isBirth) {
      context = "Naissance dans la famille";
      importance = Math.max(importance, 10);
    } else if (messageAnalysis.lifeEvents.isWedding) {
      context = "Mariage dans la famille";
      importance = Math.max(importance, 10);
    } else if (messageAnalysis.lifeEvents.isDeath) {
      context = "Décès dans la famille";
      importance = Math.max(importance, 10);
    } else if (topic.includes("santé")) {
      context = "Santé";
      importance = Math.max(importance, 8);
    } else if (topic.includes("famille")) {
      context = "Famille";
      importance = Math.max(importance, 7);
    }
    
    // AJOUT : Détecter les délais mentionnés dans le contenu
    const delays = {
      week: /dans (une |1 )?semaine|la semaine prochaine/i,
      days: /dans (\d+) jours/i,
      tomorrow: /demain|lendemain/i
    };

    let remindAfter = null;
    // Utiliser currentTime au lieu de créer un nouveau 'now'
    
    // Analyse du contenu pour trouver des délais
    if (delays.week.test(content)) {
      remindAfter = new Date(currentTime.getTime() + 7 * 24 * 60 * 60 * 1000);
    } else if (delays.tomorrow.test(content)) {
      remindAfter = new Date(currentTime.getTime() + 24 * 60 * 60 * 1000);
    } else {
      const daysMatch = content.match(delays.days);
      if (daysMatch && daysMatch[1]) {
        const days = parseInt(daysMatch[1]);
        remindAfter = new Date(currentTime.getTime() + days * 24 * 60 * 60 * 1000);
      }
    }

    // Création de la mémoire avec le délai
    const memory = {
      topic,
      content,
      context,
      importance,
      mood: messageAnalysis.mood.isPositive ? "positive" : messageAnalysis.mood.isNegative ? "negative" : "neutral",
      timestamp: currentTime,
      createdAt: currentTime.toISOString(),
      remindAfter: remindAfter?.toISOString() || null
    };
    
    // Stocker dans Firestore TOUS les souvenirs (pas seulement importants)
    try {
      const userMemoriesRef = collection(db, 'users', userId, 'memories');
      await addDoc(userMemoriesRef, {
        ...memory,
        timestamp: serverTimestamp()
      });
      console.log('[DEBUG] Mémoire stockée dans Firestore');
    } catch (firestoreError) {
      console.error('[ERREUR] Stockage mémoire Firestore:', firestoreError);
    }
    
    // Mettre à jour également la cache locale et AsyncStorage
    const memoriesJson = await AsyncStorage.getItem(`user_memories_${userId}`);
    const memories = memoriesJson ? JSON.parse(memoriesJson) : [];
    
    memories.push(memory);
    
    // Trier par importance et limiter à 20 mémoires
    memories.sort((a, b) => b.importance - a.importance);
    if (memories.length > 20) {
      memories.splice(20);
    }
    
    // Mettre à jour cache en mémoire
    memoryCache.userMemories[userId] = memories;
    memoryCache.lastFetch[`memories_${userId}`] = Date.now();
    
    // Stocker en AsyncStorage
    await AsyncStorage.setItem(`user_memories_${userId}`, JSON.stringify(memories));
    
    // Si événement très important, mettre à jour aussi le contexte
    if (importance >= 8) {
      updateUserContext(userId, {
        recentImportantEvent: {
          context,
          content,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    return true;
  } catch (error) {
    console.error('[ERREUR] Exception dans storeUserMemory:', error);
    return false;
  }
};

/**
 * Met à jour le contexte utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @param {Object} contextUpdates - Mises à jour à apporter au contexte
 * @returns {Promise<boolean>} - Succès de l'opération
 */
const updateUserContext = async (userId, contextUpdates) => {
  try {
    if (!userId || !contextUpdates) {
      console.error('[ERREUR] Paramètres invalides dans updateUserContext:', { userId, hasContextUpdates: !!contextUpdates });
      return false;
    }
    
    // Mettre à jour le cache mémoire
    const now = Date.now();
    const currentContext = memoryCache.userContexts[userId] || {};
    const updatedContext = { ...currentContext, ...contextUpdates };
    
    memoryCache.userContexts[userId] = updatedContext;
    memoryCache.lastFetch[`context_${userId}`] = now;
    
    // Mise à jour dans AsyncStorage pour utilisation hors ligne
    try {
      const contextJson = await AsyncStorage.getItem(`user_context_${userId}`);
      const existingContext = contextJson ? JSON.parse(contextJson) : {};
      
      await AsyncStorage.setItem(`user_context_${userId}`, JSON.stringify({
        ...existingContext,
        ...contextUpdates,
        lastUpdated: new Date().toISOString()
      }));
    } catch (storageError) {
      console.warn('[AVERTISSEMENT] Erreur AsyncStorage dans updateUserContext:', storageError);
    }
    
    // Mise à jour dans Firestore (non bloquante)
    const userContextRef = doc(db, 'users', userId, 'context', 'chatbox');
    
    // Envoyer mise à jour en arrière-plan
    setDoc(userContextRef, {
      ...contextUpdates,
      lastUpdated: serverTimestamp()
    }, { merge: true })
    .catch(error => console.error('Erreur mise à jour Firestore:', error));
    
    return true;
  } catch (error) {
    console.error('[ERREUR] Exception dans updateUserContext:', error);
    return false;
  }
};

/**
 * Génère un ID de conversation cohérent à partir de deux ID utilisateurs
 * @param {string} userId1 - Premier ID utilisateur
 * @param {string} userId2 - Second ID utilisateur
 * @returns {string} - ID de conversation triés alphabétiquement et joints avec un tiret
 */
export const getConversationId = (userId1, userId2) => {
  if (!userId1 || !userId2) {
    console.error('[ERREUR] IDs utilisateurs invalides:', { userId1, userId2 });
    return null;
  }
  
  // Tri alphabétique pour assurer la cohérence
  return [userId1, userId2].sort().join('-');
};

/**
 * S'abonne aux messages d'une conversation
 * @param {string} conversationId - ID de la conversation
 * @param {function} callback - Fonction appelée avec les nouveaux messages
 * @returns {function} - Fonction pour se désabonner
 */
export const subscribeToMessages = (conversationId, callback) => {
  try {
    if (!conversationId) {
      console.error('[ERREUR] conversationId manquant dans subscribeToMessages');
      return () => {};
    }

    console.log('[DEBUG] Abonnement aux messages pour la conversation:', conversationId);
    
    // Référence à la collection de messages
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    
    // Créer une requête triée par timestamp
    const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));
    
    // S'abonner aux changements
    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      try {
        const messages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        callback(messages);
      } catch (error) {
        console.error('[ERREUR] Traitement des messages:', error);
        callback([]);
      }
    }, (error) => {
      console.error('[ERREUR] Abonnement aux messages:', error);
      callback([]);
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('[ERREUR] Exception dans subscribeToMessages:', error);
    return () => {};
  }
};

/**
 * Envoie un message dans une conversation
 * @param {string} conversationId - ID de la conversation
 * @param {string} senderId - ID de l'expéditeur
 * @param {string} content - Contenu du message
 * @param {string} type - Type de message ('text', 'image', etc.)
 * @returns {Promise<Object>} - Résultat de l'opération
 */
export const sendMessage = async (conversationId, senderId, content, type = 'text') => {
  try {
    if (!conversationId || !senderId || !content) {
      console.error('[ERREUR] Paramètres invalides dans sendMessage:', 
        { hasConversationId: !!conversationId, hasSenderId: !!senderId, hasContent: !!content });
      return { success: false, error: 'Paramètres invalides' };
    }
    
    // Référence à la collection de messages
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    
    // Créer un nouveau message
    const message = {
      senderId,
      content,
      type,
      timestamp: serverTimestamp(),
      read: false
    };
    
    // Ajouter le message à la collection
    const docRef = await addDoc(messagesRef, message);
    
    // Mettre à jour la dernière activité de la conversation
    const conversationRef = doc(db, 'conversations', conversationId);
    await setDoc(conversationRef, {
      lastMessage: {
        content: type === 'text' ? content : `[${type}]`,
        senderId,
        timestamp: serverTimestamp()
      },
      participants: [],  // Sera mis à jour par un trigger Cloud Function
      updatedAt: serverTimestamp()
    }, { merge: true });
    
    return { success: true, messageId: docRef.id };
  } catch (error) {
    console.error('[ERREUR] Exception dans sendMessage:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Met à jour le statut de frappe d'un utilisateur
 * @param {string} conversationId - ID de la conversation
 * @param {string} userId - ID de l'utilisateur
 * @param {boolean} isTyping - Statut de frappe
 */
export const setTypingStatus = async (conversationId, userId, isTyping) => {
  try {
    if (!conversationId || !userId) {
      console.error('[ERREUR] Paramètres invalides dans setTypingStatus');
      return;
    }
    
    // Référence au document de statut de frappe
    const typingRef = doc(db, 'conversations', conversationId, 'typing', userId);
    
    // Mettre à jour le statut
    await setDoc(typingRef, {
      isTyping,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error('[ERREUR] Exception dans setTypingStatus:', error);
  }
};

/**
 * S'abonne au statut de frappe des autres utilisateurs
 * @param {string} conversationId - ID de la conversation
 * @param {string} currentUserId - ID de l'utilisateur actuel
 * @param {function} callback - Fonction appelée avec le statut de frappe
 * @returns {function} - Fonction pour se désabonner
 */
export const subscribeToTypingStatus = (conversationId, currentUserId, callback) => {
  try {
    if (!conversationId || !currentUserId) {
      console.error('[ERREUR] Paramètres invalides dans subscribeToTypingStatus');
      return () => {};
    }
    
    // Référence à la collection de statuts de frappe
    const typingRef = collection(db, 'conversations', conversationId, 'typing');
    
    // Créer une requête pour exclure l'utilisateur actuel
    const typingQuery = query(typingRef, where('__name__', '!=', currentUserId));
    
    // S'abonner aux changements
    const unsubscribe = onSnapshot(typingQuery, (snapshot) => {
      try {
        // Vérifier si quelqu'un est en train de taper
        const isAnyoneTyping = snapshot.docs.some(doc => {
          const data = doc.data();
          // Vérifier si le statut est récent (moins de 10 secondes)
          if (!data.timestamp) return false;
          
          const timestamp = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
          const now = new Date();
          const diff = now - timestamp;
          
          return data.isTyping && diff < 10000; // 10 secondes
        });
        
        callback(isAnyoneTyping);
      } catch (error) {
        console.error('[ERREUR] Traitement des statuts de frappe:', error);
        callback(false);
      }
    }, (error) => {
      console.error('[ERREUR] Abonnement aux statuts de frappe:', error);
      callback(false);
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('[ERREUR] Exception dans subscribeToTypingStatus:', error);
    return () => {};
  }
};

/**
 * Récupère le message de bienvenue pour l'utilisateur
 * @param {string} firstName - Prénom de l'utilisateur
 * @returns {Promise<string>} - Message de bienvenue
 */
export const getWelcomeMessage = async (firstName) => {
  try {
    const now = new Date();
    const hour = now.getHours();
    
    let greeting;
    if (hour < 12) {
      greeting = "Bonjour";
    } else if (hour < 18) {
      greeting = "Bon après-midi";
    } else {
      greeting = "Bonsoir";
    }
    
    // Récupérer la date depuis AsyncStorage si elle existe
    let lastWelcomeDate;
    try {
      lastWelcomeDate = await AsyncStorage.getItem('lastWelcomeDate');
    } catch (error) {
      console.warn('[AVERTISSEMENT] Erreur AsyncStorage dans getWelcomeMessage:', error);
    }
    
    // Si c'est la première fois aujourd'hui
    const today = now.toDateString();
    if (!lastWelcomeDate || lastWelcomeDate !== today) {
      // Sauvegarder la date actuelle
      AsyncStorage.setItem('lastWelcomeDate', today).catch(error => 
        console.warn('[AVERTISSEMENT] Erreur AsyncStorage dans getWelcomeMessage (setItem):', error)
      );
      
      // Message complet pour la première fois de la journée
      return `${greeting} ${firstName || ''}! Comment allez-vous aujourd'hui ? Je suis là pour discuter avec vous.`;
    }
    
    // Message plus court pour les visites suivantes
    return `${greeting} ${firstName || ''}! Ravi de vous revoir. De quoi souhaitez-vous parler ?`;
  } catch (error) {
    console.error('[ERREUR] Exception dans getWelcomeMessage:', error);
    return `Bonjour! Comment puis-je vous aider aujourd'hui ?`;
  }
};

/**
 * Crée une nouvelle conversation
 * @param {string} userId1 - Premier participant
 * @param {string} userId2 - Second participant
 * @returns {Promise<Object>} - Résultat de la création
 */
export const createConversation = async (userId1, userId2) => {
  try {
    if (!userId1 || !userId2) {
      console.error('[ERREUR] Paramètres invalides dans createConversation');
      return { success: false, error: 'Paramètres invalides' };
    }
    
    // Générer l'ID de conversation
    const conversationId = [userId1, userId2].sort().join('-');
    
    // Référence à la conversation
    const conversationRef = doc(db, 'conversations', conversationId);
    
    // Vérifier si la conversation existe déjà
    const conversationDoc = await getDoc(conversationRef);
    
    if (conversationDoc.exists()) {
      return { success: true, conversationId, existing: true };
    }
    
    // Créer la conversation
    await setDoc(conversationRef, {
      participants: [userId1, userId2],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return { success: true, conversationId, existing: false };
  } catch (error) {
    console.error('[ERREUR] Exception dans createConversation:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Scanne toutes les conversations d’un utilisateur (famille + chatbox)
 * Extrait les messages importants et les stocke dans les souvenirs
 * @param {string} userId - ID de l’utilisateur senior
 */
export const collectGlobalMemories = async (userId) => {
  try {
    if (!userId) {
      console.error('[ERREUR] collectGlobalMemories: userId manquant');
      return;
    }

    console.log(`[DEBUG] Scan de toutes les conversations pour ${userId}`);

    // Charger toutes les conversations de l’utilisateur
    const conversationsRef = collection(db, 'conversations');
    const snapshot = await getDocs(conversationsRef);

    for (const docSnap of snapshot.docs) {
      const conversationId = docSnap.id;

      // Vérifie que l’utilisateur est bien concerné
      if (!conversationId.includes(userId)) continue;

      const messagesRef = collection(db, 'conversations', conversationId, 'messages');
      const recentMessagesQuery = query(messagesRef, orderBy('timestamp', 'desc'), limit(20));
      const messagesSnap = await getDocs(recentMessagesQuery);

      for (const msgDoc of messagesSnap.docs) {
        const msg = msgDoc.data();

        // Filtrer uniquement les messages texte pertinents
        if (msg.type !== 'text' || !msg.content || typeof msg.content !== 'string') continue;
        if (msg.senderId === 'chatbox') continue; // Ignore les messages générés par le bot

        const importanceData = calculateMemoryImportance(msg.content);
        const score = importanceData.score;

        if (score > 5) {
          console.log(`[DEBUG] Souvenir détecté (${score}) :`, msg.content);

          // Enregistrer dans la mémoire
          await storeUserMemory(userId, importanceData.topic, msg.content, score);
        }
      }
    }

    console.log('[DEBUG] collectGlobalMemories terminé ✅');
  } catch (error) {
    console.error('[ERREUR] collectGlobalMemories:', error);
  }
};


// Exporter les fonctions nécessaires
export {
  analyzeMessage,
  calculateMemoryImportance,
  getUserMemories,
  updateUserContext,
};