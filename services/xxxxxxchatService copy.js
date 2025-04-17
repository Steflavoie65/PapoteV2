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
  Timestamp 
} from 'firebase/firestore';
import { processImage } from './imageService';
import { Alert } from 'react-native';
import { OPENAI_API_KEY } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns'; // Pour formatter les timestamps
import { getMessages } from './messageService';

// Détection améliorée d'événements marquants
function calculateMemoryImportance(message) {
  const text = message.toLowerCase();
  let score = 0;
  let topic = "";
  
  // Événements de vie majeurs - priorité maximale
  if (text.includes("naissance") || text.includes("bébé") || text.includes("accoucher") || text.includes("accouchement")) {
    score += 10; // Score maximal pour une naissance
    topic = "la naissance du bébé de votre cousine";
  } else if (text.includes("mariage") || text.includes("fiançailles") || text.includes("marié")) {
    score += 10;
    topic = "le mariage dans votre famille";
  } else if (text.includes("décès") || text.includes("enterrement") || text.includes("mort") || text.includes("funérailles")) {
    score += 10;
    topic = "le décès dans votre famille";
  }
  // Événements importants
  else if (text.includes("anniversaire") || text.includes("fête") || text.includes("noël") || text.includes("nouvel an")) {
    score += 8;
    topic = "un événement important";
  }
  
  // Famille
  else if (text.includes("petit-fils") || text.includes("petite-fille") || text.includes("petit-enfant")) {
    score += 9;
    topic = "vos petits-enfants";
  } else if (text.includes("fils") || text.includes("fille") || text.includes("enfant")) {
    score += 8;
    topic = "vos enfants";
  } else if (text.includes("cousine") || text.includes("cousin")) {
    score += 7;
    topic = "votre cousine";
  } else if (text.includes("famille")) {
    score += 7;
    topic = "votre famille";
  }
  
  // Santé
  else if (text.includes("maladie") || text.includes("opération") || text.includes("hospital")) {
    score += 9;
    topic = "votre santé";
  } else if (text.includes("médecin") || text.includes("docteur")) {
    score += 7;
    topic = "votre rendez-vous médical";
  }
  
  // Voyages
  else if (text.includes("voyage") || text.includes("vacances")) {
    score += 8;
    topic = "votre voyage";
  } else if (text.includes("sortie") || text.includes("visite")) {
    score += 6;
    topic = "votre sortie";
  }
  
  // Messages émotionnels
  else if (text.includes("triste") || text.includes("déprimé") || text.includes("seul")) {
    score += 7;
    topic = "vos sentiments";
  } else if (text.includes("content") || text.includes("heureux") || text.includes("joie")) {
    score += 6;
    topic = "votre bonheur";
  }
  
  return { score, topic: topic || "notre conversation" };
}

// Fonction pour générer la réponse du chatbox
export const getChatboxResponse = async (message, userId = null) => {
  try {
    console.log('[DEBUG] Début de getChatboxResponse avec message:', message);
    const userContext = userId ? await getUserContext(userId) : null;
    const messageAnalysis = analyzeMessage(message);
    
    // Détecter si le message contient un sujet important
    const memoryScore = calculateMemoryImportance(message);

    // Récupérer les mémoires existantes pour enrichir le contexte
    const memoriesJson = await AsyncStorage.getItem(`user_memories_${userId}`);
    const existingMemories = memoriesJson ? JSON.parse(memoriesJson) : [];
    
    // Chercher le contexte spécifique si le message est court et fait référence à un sujet
    const shortMessageWithContext = message.trim().split(/\s+/).length <= 7;
    let contextualizedPrompt = message;
    let relatedMemory = null;
    
    if (shortMessageWithContext) {
      // Rechercher une mémoire liée au message court actuel
      const lowerMessage = message.toLowerCase();
      
      // Détection de questions sur la mémoire et les souvenirs
      if (lowerMessage.includes('rappelle') || lowerMessage.includes('souviens') || 
          lowerMessage.includes('dit') || lowerMessage.includes('parlé')) {
        
        console.log('[DEBUG] Détection d\'une demande de rappel de mémoire');
        
        // Récupérer toutes les mémoires récentes et les trier par date
        const recentMemories = existingMemories
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5);
          
        if (recentMemories.length > 0) {
          // Utiliser la mémoire la plus récente pour le contexte
          relatedMemory = recentMemories[0];
          contextualizedPrompt = `Le sujet dont nous parlions récemment était: "${relatedMemory.topic}". 
          Le contenu spécifique était: "${relatedMemory.content}". 
          Ma dernière réponse parlait de cela.
          L'utilisateur me demande maintenant: "${message}".
          Je dois montrer que je me souviens parfaitement du contexte récent.`;
          
          console.log('[DEBUG] Message enrichi avec contexte de rappel:', contextualizedPrompt);
        }
      }
      // Chercher des mots-clés spécifiques
      else if (lowerMessage.includes('cousine') || lowerMessage.includes('cousin')) {
        const familyMemories = existingMemories.filter(m => 
          m.topic.includes('cousine') || 
          m.content.toLowerCase().includes('cousine') ||
          m.context.includes('famille')
        );
        
        if (familyMemories.length > 0) {
          // Trier par importance et récence
          familyMemories.sort((a, b) => {
            if (b.importance !== a.importance) return b.importance - a.importance;
            return new Date(b.createdAt) - new Date(a.createdAt);
          });
          
          relatedMemory = familyMemories[0];
          contextualizedPrompt = `En référence à ce dont nous avons parlé précédemment au sujet de ${relatedMemory.topic} (${relatedMemory.content}), voici ma question/commentaire actuel: ${message}`;
          console.log('[DEBUG] Message enrichi avec contexte:', contextualizedPrompt);
        }
      }
      
      // Chercher d'autres mots-clés (bébé, santé, etc.)
      if (!relatedMemory && (lowerMessage.includes('bébé') || lowerMessage.includes('naissance'))) {
        const birthMemories = existingMemories.filter(m => 
          m.context?.includes('Naissance') || 
          m.content?.toLowerCase().includes('bébé') ||
          m.content?.toLowerCase().includes('accouch')
        );
        
        if (birthMemories.length > 0) {
          birthMemories.sort((a, b) => b.importance - a.importance);
          relatedMemory = birthMemories[0];
          contextualizedPrompt = `En référence à la naissance dont nous avons parlé précédemment (${relatedMemory.content}), voici ma question/commentaire: ${message}`;
          console.log('[DEBUG] Message enrichi avec contexte de naissance:', contextualizedPrompt);
        }
      }
    }
    
    // Enregistrer cette mémoire si elle est suffisamment importante
    if (memoryScore.score > 6 && userId) {
      try {
        await storeUserMemory(userId, memoryScore.topic, message, memoryScore.score);
      } catch (error) {
        console.error('Erreur stockage mémoire:', error);
      }
    }
    
    // Mise à jour du contexte utilisateur
    if (userId && userContext) {
      try {
        const contextUpdates = {
          lastInteraction: serverTimestamp(),
          health: messageAnalysis.health.isSick ? {
            ...userContext.health,
            isSick: true,
            lastReported: serverTimestamp()
          } : userContext.health,
          situation: messageAnalysis.situation.isAlone ? {
            ...userContext.situation,
            isAlone: true,
            lastReported: serverTimestamp()
          } : userContext.situation,
          mood: {
            ...userContext.mood,
            current: messageAnalysis.mood.isNegative ? 'negative' : 
                    messageAnalysis.mood.isPositive ? 'positive' : 
                    userContext?.mood?.current || 'unknown',
            lastUpdated: serverTimestamp()
          }
        };
        await updateUserContext(userId, contextUpdates);
      } catch (error) {
        console.error('Erreur mise à jour contexte:', error);
      }
    }

    // Récupérer les résumés et sujets pour enrichir le contexte
    let globalSummary = '';
    let keyTopics = [];
    try {
      if (userId) {
        globalSummary = await getUserGlobalSummary(userId) || '';
        keyTopics = await getUserKeyTopics(userId) || [];
      }
    } catch (error) {
      console.error('Erreur récupération résumé/sujets:', error);
    }

    // Générer la réponse en utilisant l'API OpenAI
    try {
      const response = await generateOpenAIResponse(
        contextualizedPrompt, 
        userContext, 
        messageAnalysis
      );
      
      return response;
    } catch (error) {
      console.error('Erreur lors de la génération de la réponse:', error);
      return "Je suis désolé, je n'ai pas pu traiter votre message. Pouvez-vous reformuler votre question ?";
    }
  } catch (error) {
    console.error('Erreur avec le ChatBox:', error);
    return '';
  }
};

/**
 * Stocke une mémoire importante pour l'utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @param {string} topic - Sujet de la mémoire
 * @param {string} content - Contenu de la mémoire
 * @param {number} importance - Niveau d'importance (1-10)
 * @returns {boolean} - Succès de l'opération
 */
export const storeUserMemory = async (userId, topic, content, importance = 5) => {
  try {
    const memoriesJson = await AsyncStorage.getItem(`user_memories_${userId}`);
    const memories = memoriesJson ? JSON.parse(memoriesJson) : [];
    
    // Analyse détaillée pour créer des questions et contextes plus personnalisés
    const messageAnalysis = analyzeMessage(content);
    
    // Générer une question de suivi plus spécifique
    let followupQuestion = "";
    let context = "";
    
    // Questions spécifiques pour événements marquants
    if (messageAnalysis.lifeEvents.isBirth) {
      followupQuestion = "Comment se porte le bébé et la maman ? Avez-vous pu leur rendre visite ?";
      context = "Naissance dans la famille";
      importance = Math.max(importance, 10); // Importance maximale
    } else if (messageAnalysis.lifeEvents.isWedding) {
      followupQuestion = "Comment s'est passée la cérémonie ? Avez-vous pris des photos ?";
      context = "Mariage dans la famille";
      importance = Math.max(importance, 10);
    } else if (messageAnalysis.lifeEvents.isDeath) {
      followupQuestion = "Comment vous sentez-vous ? Avez-vous besoin de parler ?";
      context = "Décès dans la famille";
      importance = Math.max(importance, 10);
    }
    // Autres types de sujets
    else if (topic.includes("voyage") || topic.includes("sortie")) {
      followupQuestion = "Comment s'est passé votre voyage ? Avez-vous pris des photos ?";
      context = "Voyage ou sortie";
    } else if (topic.includes("famille") || topic.includes("enfant") || topic.includes("petit-enfant")) {
      followupQuestion = "Comment vont vos proches ? Les avez-vous vus récemment ?";
      context = "Visite familiale";
    } else if (topic.includes("santé") || topic.includes("médecin")) {
      followupQuestion = "Comment vous sentez-vous maintenant ? Suivez-vous bien votre traitement ?";
      context = "Santé";
    } else if (topic.includes("anniversaire") || topic.includes("fête")) {
      followupQuestion = "Avez-vous passé un bon moment ? Qui était présent à cette occasion ?";
      context = "Célébration";
    } else {
      followupQuestion = "Comment cela s'est-il passé finalement ?";
      context = "Conversation générale";
    }
    
    // Ajouter la nouvelle mémoire avec plus de structure
    memories.push({
      topic,
      content,
      followupQuestion,
      context,
      importance,
      lifeEvent: messageAnalysis.lifeEvents.isBirth || messageAnalysis.lifeEvents.isWedding || messageAnalysis.lifeEvents.isDeath,
      mood: messageAnalysis.mood.isPositive ? "positive" : messageAnalysis.mood.isNegative ? "negative" : "neutral",
      createdAt: new Date().toISOString()
    });
    
    // Limiter à 20 mémoires, en gardant les plus importantes
    if (memories.length > 20) {
      memories.sort((a, b) => b.importance - a.importance);
      memories.splice(20);
    }
    
    await AsyncStorage.setItem(`user_memories_${userId}`, JSON.stringify(memories));
    
    // Si c'est un événement majeur, mettre à jour aussi le contexte utilisateur
    if (messageAnalysis.lifeEvents.isBirth || messageAnalysis.lifeEvents.isWedding || messageAnalysis.lifeEvents.isDeath) {
      try {
        const userContextRef = doc(db, 'users', userId, 'context', 'chatbox');
        const contextDoc = await getDoc(userContextRef);
        const currentContext = contextDoc.exists() ? contextDoc.data() : {};
        
        await setDoc(userContextRef, {
          ...currentContext,
          importantEvents: {
            ...(currentContext.importantEvents || {}),
            [context]: {
              content,
              timestamp: serverTimestamp(),
              importance: 10
            }
          },
          lastUpdated: serverTimestamp()
        }, { merge: true });
      } catch (error) {
        console.error('Erreur mise à jour contexte Firestore:', error);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Erreur lors du stockage de la mémoire:', error);
    return false;
  }
};

/**
 * Récupère un résumé global des conversations de l'utilisateur
 * @param {string} userId - L'identifiant de l'utilisateur
 * @returns {string} - Un résumé des conversations passées
 */
export const getUserGlobalSummary = async (userId) => {
  try {
    // Essayer d'abord de récupérer depuis Firestore
    const userContextRef = doc(db, 'users', userId, 'context', 'chatbox');
    const contextDoc = await getDoc(userContextRef);
    
    if (contextDoc.exists() && contextDoc.data().summary) {
      return contextDoc.data().summary;
    }
    
    // Sinon, essayer AsyncStorage
    const summaryJson = await AsyncStorage.getItem(`user_summary_${userId}`);
    if (summaryJson) {
      return JSON.parse(summaryJson);
    }
    
    // Si rien n'est trouvé, créer un résumé basique
    const { success, messages } = await getMessages(userId, 'chatbox', 100);
    if (!success || !messages || messages.length === 0) {
      return '';
    }
    
    // Générer un résumé basique
    const importantMessages = messages
      .filter(m => m.content && m.content.length > 20)
      .slice(-10);
    
    if (importantMessages.length === 0) {
      return '';
    }
    
    // Sauvegarder le résumé
    const summary = "L'utilisateur a parlé de " + 
      importantMessages
        .map(m => m.content.split(' ').slice(0, 3).join(' '))
        .join(', ');
    
    await AsyncStorage.setItem(`user_summary_${userId}`, JSON.stringify(summary));
    
    return summary;
  } catch (error) {
    console.error('Erreur récupération résumé global:', error);
    return '';
  }
};

/**
 * Génère une réponse en utilisant l'API OpenAI
 * @param {string} prompt - Le message de l'utilisateur
 * @param {Object} userContext - Le contexte de l'utilisateur
 * @param {Object} messageAnalysis - L'analyse du message
 * @returns {string} - La réponse générée
 */
const generateOpenAIResponse = async (prompt, userContext, messageAnalysis) => {
  try {
    console.log('[DEBUG] OPENAI_API_KEY:', OPENAI_API_KEY?.substring(0, 10) + '...' || 'non définie');
    console.log('[DEBUG] Contexte utilisateur reçu:', JSON.stringify(userContext || {}));
    
    if (!OPENAI_API_KEY) {
      console.warn('Clé API OpenAI non définie');
      return "Je suis désolé, je ne peux pas vous répondre pour le moment. Veuillez réessayer plus tard.";
    }
    
    // Si le contexte utilisateur est incomplet, essayer de l'enrichir
    let enrichedUserContext = userContext || {};
    if (!enrichedUserContext.firstName) {
      try {
        // Essayer de récupérer le profil depuis AsyncStorage
        const profileJson = await AsyncStorage.getItem('seniorProfile');
        if (profileJson) {
          const profile = JSON.parse(profileJson);
          if (profile?.profile?.firstName) {
            enrichedUserContext.firstName = profile.profile.firstName;
            enrichedUserContext.userId = profile.profile.userId;
          }
        }
      } catch (error) {
        console.error('Erreur récupération profil:', error);
      }
    }
    
    // Récupérer les 5 derniers messages pour le contexte
    let recentMessages = [];
    try {
      const memoriesJson = await AsyncStorage.getItem(`user_memories_${enrichedUserContext?.userId}`);
      const memories = memoriesJson ? JSON.parse(memoriesJson) : [];
      recentMessages = memories
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);
      
      console.log('[DEBUG] Mémoires récentes récupérées:', recentMessages.length);
    } catch (error) {
      console.error('Erreur récupération mémoires:', error);
    }
    
    // Construire le contexte système pour l'IA avec plus d'instructions sur le ton
    const systemContent = `Tu es un assistant virtuel chaleureux et attentionné qui s'adresse à une personne senior nommée ${enrichedUserContext?.firstName || 'Henri'}.
    
    IMPORTANT : Utilise toujours son prénom "${enrichedUserContext?.firstName || 'Henri'}" dans chaque réponse pour une touche personnelle.
    
    Tu dois absolument:
    - Commencer ta réponse en t'adressant à la personne par son prénom
    - Utiliser "vous" par respect
    - Être particulièrement chaleureux, empathique et bienveillant
    - Montrer de l'intérêt sincère pour la personne, sa famille, ses activités
    - Poser des questions de suivi sur les sujets importants mentionnés précédemment
    - Faire référence aux conversations passées de façon naturelle
    - Parler comme un ami ou un membre de la famille attentionné, pas comme un robot
    - Adapter ton langage: phrases courtes, mots simples, ton chaleureux
    - Éviter complètement le jargon technique
    - Formuler des questions ouvertes pour encourager la conversation
    
    TRÈS IMPORTANT: Tu dois toujours donner la priorité au maintien d'une conversation chaleureuse et amicale. Ne sonne jamais comme un chatbot automatisé.`;
    
    // Ajouter le contexte utilisateur enrichi
    let fullSystemPrompt = systemContent;
    if (enrichedUserContext) {
      const contextNotes = `
      Informations importantes sur ${enrichedUserContext.firstName || 'Henri'}:
      ${enrichedUserContext.health?.isSick ? "- A mentionné des problèmes de santé récemment." : ""}
      ${enrichedUserContext.situation?.isAlone ? "- Se sent souvent seul(e)." : ""}
      ${enrichedUserContext.mood?.current === 'negative' ? "- A exprimé des sentiments négatifs récemment." : ""}
      ${enrichedUserContext.mood?.current === 'positive' ? "- Était de bonne humeur lors des dernières conversations." : ""}
      - Est en contact avec sa famille, notamment Julie Nadeau.
      
      Souvenirs de conversations précédentes:`;
      
      fullSystemPrompt += contextNotes;
      
      // Ajouter les mémoires récentes pour contextualiser la conversation
      if (recentMessages.length > 0) {
        const conversationMemories = recentMessages.map(mem => 
          `- Thème: "${mem.topic}". ${mem.content}. Importance: ${mem.importance}/10.`
        ).join('\n');
        fullSystemPrompt += '\n' + conversationMemories;
      } else {
        fullSystemPrompt += '\n- Aucun souvenir précis disponible, mais reste chaleureux et personnel.';
      }
    }
    
    // Ajouter l'analyse du message actuel avec plus d'instructions
    if (messageAnalysis) {
      const analysisNotes = `
      Analyse du message actuel:
      ${messageAnalysis.health.isSick ? "- Mentionne des problèmes de santé." : ""}
      ${messageAnalysis.situation.isAlone ? "- Exprime un sentiment de solitude." : ""}
      ${messageAnalysis.mood.isNegative ? "- Ton négatif ou inquiet -> montre de l'empathie." : ""}
      ${messageAnalysis.mood.isPositive ? "- Ton positif ou enthousiaste -> partage son enthousiasme." : ""}
      ${messageAnalysis.lifeEvents.isBirth ? "- Parle d'une naissance -> sujet très important!" : ""}
      ${messageAnalysis.relationship.mentionsCousine ? "- Mentionne sa cousine -> sujet important." : ""}
      
      Instructions pour cette réponse spécifique:
      - Message très court = sois chaleureux et pose des questions pour approfondir la conversation
      - Utilise TOUJOURS le prénom de la personne pour personnaliser ta réponse
      - Si le message est négatif, montre de l'empathie et propose du réconfort
      - Si la personne dit simplement "Bien" ou un mot court, renforce la connexion personnelle et pose des questions ouvertes
      - Commence ta réponse par une salutation chaleureuse avec son prénom
      `;
      fullSystemPrompt += analysisNotes;
    }
    
    // Ajout de sujets de secours si la conversation stagne
    fullSystemPrompt += `
    Exemples de réponses chaleureuses et personnelles:
    - "Bonjour Henri ! Comment allez-vous aujourd'hui ? Avez-vous pu voir Julie récemment ?"
    - "Henri, c'est toujours un plaisir de discuter avec vous. Comment s'est passée votre journée ?"
    - "Cher Henri, je suis content de vous retrouver. Avez-vous fait quelque chose d'agréable aujourd'hui ?"
    
    Sujets de conversation à explorer:
    - Sa famille, en particulier Julie
    - Sa journée et ses activités récentes
    - Sa santé et son bien-être
    - Les événements à venir qu'il attend avec impatience
    - Ses centres d'intérêt, hobbies ou souvenirs
    `;
    
    // Préparation des messages pour l'API avec instructions de ton plus spécifiques
    const messages = [
      { role: 'system', content: fullSystemPrompt },
      { role: 'user', content: prompt }
    ];
    
    // Appel à l'API OpenAI
    try {
      console.log('[DEBUG] Envoi prompt à OpenAI avec données utilisateur:', enrichedUserContext?.firstName || 'inconnu');
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: messages,
          temperature: 0.85, // Légèrement plus élevé pour des réponses plus variées et chaleureuses
          max_tokens: 350,
          presence_penalty: 0.7, // Encourager la variété dans les réponses
          frequency_penalty: 0.6 // Réduire les répétitions
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[DEBUG] Erreur API OpenAI:', errorText);
        throw new Error(`Erreur API OpenAI: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
        console.error('[DEBUG] Réponse API OpenAI invalide:', data);
        throw new Error('Réponse API OpenAI invalide');
      }
      
      const responseText = data.choices[0].message.content.trim();
      console.log('[DEBUG] Réponse IA:', responseText);
      
      // Si la réponse ne contient pas le prénom, l'ajouter au début
      if (!responseText.includes(enrichedUserContext?.firstName || 'Henri')) {
        return `Cher ${enrichedUserContext?.firstName || 'Henri'}, ${responseText}`;
      }
      
      return responseText;
    } catch (apiError) {
      console.error('Erreur API OpenAI:', apiError);
      
      // Réponse de secours plus chaleureuse et personnelle
      return `Cher ${enrichedUserContext?.firstName || 'Henri'}, je suis vraiment désolé, mais j'ai du mal à vous répondre pour le moment. Comment allez-vous aujourd'hui ? J'aimerais savoir si vous avez pu passer du temps avec Julie récemment ?`;
    }
  } catch (error) {
    console.error('Erreur générale lors de la génération de réponse:', error);
    return "Cher Henri, je suis sincèrement désolé, mais je rencontre quelques difficultés techniques. Comment se passe votre journée ? Avez-vous des projets intéressants pour cette semaine ?";
  }
};

/**
 * Génère un ID de conversation standardisé à partir de deux IDs utilisateur
 * @param {string} userId1 - Premier ID utilisateur
 * @param {string} userId2 - Deuxième ID utilisateur
 * @returns {string} - ID de conversation standardisé (alphabétiquement trié)
 */
export const getConversationId = (userId1, userId2) => {
  if (!userId1 || !userId2) {
    console.error('IDs utilisateur invalides pour getConversationId:', { userId1, userId2 });
    return null;
  }
  // Trier les IDs alphabétiquement pour garantir un ID cohérent 
  // quelle que soit l'ordre des participants
  return [userId1, userId2].sort().join('-');
};

/**
 * S'abonne aux messages d'une conversation et appelle le callback avec les nouveaux messages
 * @param {string} conversationId - ID de la conversation
 * @param {Function} callback - Fonction à appeler avec les nouveaux messages
 * @returns {Function} - Fonction de désabonnement
 */
export const subscribeToMessages = (conversationId, callback) => {
  if (!conversationId || typeof conversationId !== 'string') {
    console.error('[ERREUR] conversationId invalide dans subscribeToMessages:', conversationId);
    if (typeof callback === 'function') callback([]);
    return () => {};
  }
  
  try {
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

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
      });

      if (typeof callback === 'function') {
        callback(messages);
      }
    }, (error) => {
      console.error('[ERREUR] Erreur lors de l\'abonnement aux messages :', error);
    });
  } catch (error) {
    console.error('[ERREUR] Exception dans subscribeToMessages:', error);
    if (typeof callback === 'function') callback([]);
    return () => {};
  }
};

/**
 * Formatte un timestamp Firestore en heure lisible
 * @param {Object} timestamp - Timestamp Firestore
 * @returns {string} - Heure formatée (HH:MM)
 */
const formatTimestamp = (timestamp) => {
  if (!timestamp) return null;

  try {
    const date = timestamp instanceof Timestamp ? 
      timestamp.toDate() : 
      timestamp.seconds ? 
        new Date(timestamp.seconds * 1000) : 
        new Date(timestamp);
    
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } catch (error) {
    console.error('Erreur de formatage timestamp:', error);
    return '';
  }
};

/**
 * Génère un message de bienvenue personnalisé pour l'utilisateur
 * @param {string} userName - Prénom de l'utilisateur
 * @returns {string} - Message de bienvenue personnalisé
 */
export const getWelcomeMessage = async (userName) => {
  const hour = new Date().getHours();
  let greeting;
  if (hour >= 5 && hour < 12) {
    greeting = "Bonjour";
  } else if (hour >= 12 && hour < 18) {
    greeting = "Bon après-midi";
  } else {
    greeting = "Bonsoir";
  }

  try {
    // Récupérer l'ID utilisateur pour contextualiser le message
    const userId = await getUserId(userName);
    const userContext = userId ? await getUserContext(userId) : null;

    // Vérifications de contexte spécifiques
    if (userContext && userContext.lastInteraction) {
      let lastInteractionDate;
      
      if (userContext.lastInteraction instanceof Date) {
        lastInteractionDate = userContext.lastInteraction;
      } else if (userContext.lastInteraction instanceof Timestamp) {
        lastInteractionDate = userContext.lastInteraction.toDate();
      } else if (userContext.lastInteraction.seconds && userContext.lastInteraction.nanoseconds) {
        lastInteractionDate = new Timestamp(
          userContext.lastInteraction.seconds,
          userContext.lastInteraction.nanoseconds
        ).toDate();
      } else if (typeof userContext.lastInteraction === 'string') {
        lastInteractionDate = new Date(userContext.lastInteraction);
      } else {
        lastInteractionDate = null;
      }

      if (lastInteractionDate && !isNaN(lastInteractionDate.getTime())) {
        const now = new Date();
        const timeDiff = (now - lastInteractionDate) / (1000 * 60 * 60);

        if (userContext.health?.isSick && timeDiff < 24) {
          return `${greeting} ${userName}. Comment vous sentez-vous aujourd'hui ? J'espère que vous allez mieux depuis notre dernière conversation.`;
        }

        if (userContext.situation?.isAlone && timeDiff > 12) {
          return `${greeting} ${userName}. Je pensais à vous. Comment allez-vous aujourd'hui ? Avez-vous eu de la visite récemment ?`;
        }

        if (userContext.mood?.current === 'negative' && timeDiff < 48) {
          return `${greeting} ${userName}. J'espère que votre journée se passe mieux aujourd'hui. Que puis-je faire pour vous remonter le moral ?`;
        }
      }
    }

    // Si aucun contexte spécifique, message générique
    return `${greeting} ${userName} ! Comment puis-je vous aider aujourd'hui ?`;
  } catch (error) {
    console.error('Erreur lors de la génération du message de bienvenue:', error);
    return `${greeting} ${userName} ! Comment puis-je vous aider aujourd'hui ?`;
  }
};

/**
 * Récupère l'ID utilisateur à partir du nom d'utilisateur
 * Fonction utilitaire pour getWelcomeMessage
 */
export const getUserId = async (userName) => {
  try {
    // Essayer de récupérer depuis AsyncStorage
    const profileJson = await AsyncStorage.getItem('seniorProfile');
    if (profileJson) {
      const profile = JSON.parse(profileJson);
      if (profile?.profile?.userId) {
        return profile.profile.userId;
      }
    }
    
    // Si pas trouvé dans AsyncStorage, rechercher dans Firestore
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('firstName', '==', userName));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].id;
    }
    
    return null;
  } catch (error) {
    console.error('Erreur de récupération ID utilisateur:', error);
    return null;
  }
};

/**
 * S'abonne au statut de saisie d'un utilisateur dans une conversation
 * @param {string} conversationId - ID de la conversation
 * @param {string} currentUserId - ID de l'utilisateur actuel (pour ignorer ses propres statuts)
 * @param {Function} callback - Fonction à appeler quand le statut change
 * @returns {Function} - Fonction de désabonnement
 */
export const subscribeToTypingStatus = (conversationId, currentUserId, callback) => {
  if (!conversationId || !currentUserId || typeof callback !== 'function') {
    console.error('[ERREUR] Paramètres invalides dans subscribeToTypingStatus');
    return () => {};
  }
  
  try {
    const typingRef = doc(db, 'conversations', conversationId, 'status', 'typing');
    
    const unsubscribe = onSnapshot(typingRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const otherUserTyping = Object.keys(data)
          .filter(userId => userId !== currentUserId)
          .some(userId => data[userId]?.isTyping === true);
        
        callback(otherUserTyping);
      } else {
        callback(false);
      }
    }, (error) => {
      console.error('[ERREUR] Erreur lors de l\'abonnement au statut de saisie :', error);
      callback(false);
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('[ERREUR] Exception dans subscribeToTypingStatus:', error);
    callback(false);
    return () => {};
  }
};

/**
 * Met à jour le statut de saisie d'un utilisateur dans une conversation
 * @param {string} conversationId - ID de la conversation
 * @param {string} userId - ID de l'utilisateur qui tape
 * @param {boolean} isTyping - État de saisie (true = en train de taper)
 * @returns {Promise<boolean>} - Succès de l'opération
 */
export const setTypingStatus = async (conversationId, userId, isTyping) => {
  if (!conversationId || !userId) {
    console.error('[ERREUR] Paramètres invalides dans setTypingStatus:', { conversationId, userId });
    return false;
  }
  
  try {
    const typingRef = doc(db, 'conversations', conversationId, 'status', 'typing');
    
    // Créer un objet avec la syntaxe de champ dynamique
    const update = {};
    update[`${userId}.isTyping`] = isTyping;
    update[`${userId}.timestamp`] = serverTimestamp();
    
    await setDoc(typingRef, update, { merge: true });
    return true;
  } catch (error) {
    console.error('[ERREUR] Exception dans setTypingStatus:', error);
    return false;
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
      console.error('[ERREUR] Paramètres invalides dans sendMessage:', { conversationId, senderId, contentLength: content?.length });
      return { success: false, error: 'Paramètres invalides' };
    }
    
    // Vérifier si la conversation existe déjà
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationDoc = await getDoc(conversationRef);
    
    // Si la conversation n'existe pas, la créer
    if (!conversationDoc.exists()) {
      await createConversation(conversationId);
    }
    
    // Créer le message avec clientSentAt pour avoir un timestamp même si serverTimestamp est retardé
    const messageData = {
      senderId,
      content,
      type,
      read: false,
      timestamp: serverTimestamp(),
      clientSentAt: new Date().toISOString()
    };
    
    // Ajouter le message à la collection messages
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const messageRef = await addDoc(messagesRef, messageData);
    
    // Mettre à jour les derniers messages de la conversation
    await updateDoc(conversationRef, {
      lastMessage: content.slice(0, 50) + (content.length > 50 ? '...' : ''),
      lastMessageTime: serverTimestamp(),
      lastMessageSender: senderId,
      updatedAt: serverTimestamp()
    });
    
    return { success: true, messageId: messageRef.id };
  } catch (error) {
    console.error('[ERREUR] Erreur lors de l\'envoi du message :', error);
    return { success: false, error: error.message };
  }
};

/**
 * Crée une nouvelle conversation
 * @param {string} conversationId - ID de la conversation (généralement composé des IDs des participants)
 * @param {Object} metadata - Métadonnées de la conversation (optionnel)
 * @returns {Promise<boolean>} - Succès de l'opération
 */
export const createConversation = async (conversationId, metadata = {}) => {
  try {
    if (!conversationId) {
      console.error('[ERREUR] conversationId manquant dans createConversation');
      return false;
    }
    
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationDoc = await getDoc(conversationRef);
    
    // Si la conversation existe déjà, ne rien faire
    if (conversationDoc.exists()) {
      return true;
    }
    
    // Extraire les IDs des participants à partir de conversationId (supposant format: "userId1-userId2")
    const participantIds = conversationId.split('-');
    
    // Créer la conversation avec les métadonnées
    await setDoc(conversationRef, {
      participants: participantIds,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessage: '',
      lastMessageTime: null,
      lastMessageSender: null,
      ...metadata
    });
    
    return true;
  } catch (error) {
    console.error('[ERREUR] Exception dans createConversation:', error);
    return false;
  }
};

/**
 * Met à jour le contexte utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @param {Object} contextUpdates - Mises à jour à apporter au contexte
 * @returns {Promise<boolean>} - Succès de l'opération
 */
export const updateUserContext = async (userId, contextUpdates) => {
  try {
    if (!userId || !contextUpdates) {
      console.error('[ERREUR] Paramètres invalides dans updateUserContext:', { userId, hasContextUpdates: !!contextUpdates });
      return false;
    }
    
    const userContextRef = doc(db, 'users', userId, 'context', 'chatbox');
    
    // Vérifier si le document de contexte existe déjà
    const contextDoc = await getDoc(userContextRef);
    
    if (contextDoc.exists()) {
      // Fusionner avec le contexte existant
      await updateDoc(userContextRef, {
        ...contextUpdates,
        lastUpdated: serverTimestamp()
      });
    } else {
      // Créer un nouveau document de contexte
      await setDoc(userContextRef, {
        ...contextUpdates,
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp()
      });
    }
    
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
    
    return true;
  } catch (error) {
    console.error('[ERREUR] Exception dans updateUserContext:', error);
    return false;
  }
};

/**
 * Récupère le contexte utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<Object>} - Contexte utilisateur
 */
export const getUserContext = async (userId) => {
  try {
    if (!userId) {
      console.error('[ERREUR] userId manquant dans getUserContext');
      return null;
    }
    
    // Essayer d'abord de récupérer depuis Firestore
    const userContextRef = doc(db, 'users', userId, 'context', 'chatbox');
    const contextDoc = await getDoc(userContextRef);
    
    if (contextDoc.exists()) {
      return contextDoc.data();
    }
    
    // Si pas trouvé dans Firestore, essayer AsyncStorage
    try {
      const contextJson = await AsyncStorage.getItem(`user_context_${userId}`);
      if (contextJson) {
        return JSON.parse(contextJson);
      }
    } catch (storageError) {
      console.warn('[AVERTISSEMENT] Erreur AsyncStorage dans getUserContext:', storageError);
    }
    
    // Si rien n'est trouvé, créer un contexte vide
    const emptyContext = {
      health: {},
      situation: {},
      mood: { current: 'unknown' },
      createdAt: new Date().toISOString()
    };
    
    // Sauvegarder ce contexte vide
    await updateUserContext(userId, emptyContext);
    
    return emptyContext;
  } catch (error) {
    console.error('[ERREUR] Exception dans getUserContext:', error);
    return null;
  }
};

/**
 * Analyse un message pour en extraire des informations contextuelles
 * @param {string} message - Message à analyser
 * @returns {Object} - Analyse du message
 */
export const analyzeMessage = (message) => {
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
  
  // Analyse de santé
  const healthTerms = [
    "malade", "douleur", "mal", "souffr", "médecin", 
    "docteur", "hopital", "clinique", "santé"
  ];
  const isSick = healthTerms.some(term => lowerMessage.includes(term));
  
  // Analyse de solitude
  const lonelinessTerms = [
    "seul", "solitude", "isolé", "manque", "visite", 
    "personne ne", "abandonné"
  ];
  const isAlone = lonelinessTerms.some(term => lowerMessage.includes(term));
  
  // Analyse d'humeur
  const negativeTerms = [
    "triste", "déprimé", "malheureu", "souffr", "inquiet", 
    "angoissé", "peur", "stress", "anxieux", "mal"
  ];
  const positiveTerms = [
    "content", "heureu", "joyeu", "bien", "génial", 
    "super", "excell", "formidable", "agréable", "plaisir"
  ];
  const isNegative = negativeTerms.some(term => lowerMessage.includes(term));
  const isPositive = positiveTerms.some(term => lowerMessage.includes(term));
  
  // Événements de vie majeurs
  const isBirth = lowerMessage.includes("naissance") || 
    lowerMessage.includes("bébé") || 
    lowerMessage.includes("accouche");
  
  const isWedding = lowerMessage.includes("mariage") || 
    lowerMessage.includes("fiancé") || 
    lowerMessage.includes("marié");
  
  const isDeath = lowerMessage.includes("décès") || 
    lowerMessage.includes("mort") || 
    lowerMessage.includes("enterrement");
  
  // Relations spécifiques
  const mentionsCousine = lowerMessage.includes("cousine");
  
  return {
    health: { isSick },
    situation: { isAlone },
    mood: { isPositive, isNegative },
    lifeEvents: { isBirth, isWedding, isDeath },
    relationship: { mentionsCousine }
  };
};

/**
 * Récupère les sujets clés des conversations d'un utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<Array>} - Tableau des sujets clés
 */
export const getUserKeyTopics = async (userId) => {
  try {
    if (!userId) return [];
    
    // Essayer d'abord de récupérer depuis Firestore
    const userContextRef = doc(db, 'users', userId, 'context', 'topics');
    const topicsDoc = await getDoc(userContextRef);
    
    if (topicsDoc.exists() && topicsDoc.data().topics) {
      return topicsDoc.data().topics;
    }
    
    // Sinon, essayer AsyncStorage
    const topicsJson = await AsyncStorage.getItem(`user_topics_${userId}`);
    if (topicsJson) {
      return JSON.parse(topicsJson);
    }
    
    return [];
  } catch (error) {
    console.error('Erreur récupération topics:', error);
    return [];
  }
};