import React, { useState, useEffect, useRef, useReducer } from 'react';
import { StyleSheet, Text, View, SafeAreaView, TextInput, TouchableOpacity, FlatList, ActivityIndicator, SectionList, ScrollView, Image, Alert } from 'react-native';
import { MaterialCommunityIcons, Entypo } from '@expo/vector-icons';
import { subscribeToMessages, sendMessage, setTypingStatus, subscribeToTypingStatus, getChatboxResponse, getWelcomeMessage, createConversation, updateUserContext, getUserContext, getConversationId } from '../services/chatService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { uploadImage, getLocalImage } from '../services/storageService';
import { saveToGallery, shareImage, handleImageAction } from '../services/imageService';
import * as FileSystem from 'expo-file-system'; // Import FileSystem pour gérer les URI
import { query, orderBy, limit,collection, getDocs,doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useIsFocused } from '@react-navigation/native';
import * as Location from 'expo-location';
import contextService from '../services/contextService';

// Définition du réducteur pour gérer l'état de la conversation
function conversationReducer(state, action) {
  switch (action.type) {
    case 'SET_MESSAGES':
      return {
        ...state,
        messages: action.payload
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };
    case 'SET_USER_ID':
      return {
        ...state,
        userId: action.payload
      };
    case 'SET_TYPING':
      return {
        ...state,
        isOtherTyping: action.payload
      };
    case 'SET_NEW_MESSAGE':
      return {
        ...state,
        newMessage: action.payload
      };
    case 'SET_USER_CONTEXT':
      return {
        ...state,
        userContext: action.payload
      };
    case 'TOGGLE_EMOJIS':
      return {
        ...state,
        showEmojis: !state.showEmojis,
        // Fermer les topics si on ouvre les emojis
        showTopics: state.showEmojis ? state.showTopics : false
      };
    case 'TOGGLE_TOPICS':
      return {
        ...state,
        showTopics: !state.showTopics,
        // Fermer les emojis si on ouvre les topics
        showEmojis: state.showTopics ? state.showEmojis : false
      };
    case 'RESET_UI_STATE':
      return {
        ...state,
        showEmojis: false,
        showTopics: false
      };
    default:
      return state;
  }
}

// État initial
const initialState = {
  messages: [],
  isLoading: true,
  userId: null,
  isOtherTyping: false,
  newMessage: '',
  userContext: null,
  showEmojis: false,
  showTopics: false
};

const getSafeUri = async (uri) => {
  try {
    // Vérifiez si l'URI est au format Base64
    if (uri.startsWith('data:image/')) {
      console.log('URI au format Base64 détectée.');
      return uri; // Retourner directement l'URI Base64 pour l'afficher
    }

    // Bloquer les URI non supportées
    if (uri.startsWith('local://') || uri.startsWith('Optional("')) {
      console.warn('Schéma URI non pris en charge ou URI invalide:', uri);
      return null;
    }

    // Vérifiez si l'URI est un fichier local
    const info = await FileSystem.getInfoAsync(uri);
    return info.exists ? info.uri : null;
  } catch (error) {
    console.error("Erreur lors de la conversion de l'URI:", error);
    return null;
  }
};

const parseCustomTimestamp = (timestamp) => {
  try {
    if (!timestamp) return null;

    // Cas 1: Timestamp Firebase classique
    if (timestamp._seconds) {
      return new Date(timestamp._seconds * 1000);
    }

    // Cas 2: Format spécial {_h, _i, _j, _k}
    if (timestamp._h !== undefined) {
      const year = timestamp._h || new Date().getFullYear();
      const month = (timestamp._i || 1) - 1; // Les mois commencent à 0
      const day = timestamp._j || 1;
      const hour = timestamp._k || 0;
      return new Date(year, month, day, hour);
    }

    // Cas 3: Timestamp Firestore avec toDate()
    if (typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }

    // Cas 4: Objet Date
    if (timestamp instanceof Date) {
      return timestamp;
    }

    // Cas 5: Timestamp en millisecondes ou string ISO
    return new Date(timestamp);
  } catch (error) {
    console.warn('Erreur parsing timestamp:', error, timestamp);
    return null;
  }
};

const formatMessageTime = (timestamp) => {
  if (!timestamp) return '';
  
  try {
    let date;
    // Cas 1: Format spécial {_h, _i, _j, _k}
    if (timestamp._h !== undefined) {
      const year = timestamp._h || new Date().getFullYear();
      const month = (timestamp._i || 1) - 1; // Les mois commencent à 0
      const day = timestamp._j || 1;
      const hour = timestamp._k || 0;
      date = new Date(year, month, day, hour);
    }
    // Cas 2: Timestamp Firestore
    else if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    }
    // Cas 3: Timestamp avec toDate()
    else if (typeof timestamp.toDate === 'function') {
      date = timestamp.toDate();
    }
    // Cas 4: Date standard
    else if (timestamp instanceof Date) {
      date = timestamp;
    }
    // Cas 5: String ou nombre
    else {
      date = new Date(timestamp);
    }

    // Vérifier si la date est valide
    if (isNaN(date.getTime())) {
      console.warn('Date invalide dans formatMessageTime:', timestamp);
      return '';
    }

    // Format: HH:mm
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } catch (error) {
    console.warn('Erreur lors du formatage de l\'heure:', error);
    return '';
  }
};

const ImageMessage = ({ item, userId, messageTime }) => {
  const [safeUri, setSafeUri] = React.useState(null);

  React.useEffect(() => {
    const processUri = async () => {
      try {
        const uri = await getSafeUri(item.content);
        if (!uri) {
          console.error('URI invalide ou inaccessible:', item.content);
          setSafeUri(null);
        } else {
          setSafeUri(uri);
        }
      } catch (error) {
        console.error('Erreur lors de la conversion de l\'URI:', error);
        setSafeUri(null);
      }
    };

    processUri();
  }, [item.content]);

  if (!safeUri) {
    return (
      <View style={[styles.messageContainer, styles.errorMessage]}>
        <Text style={styles.errorText}>Image non disponible</Text>
      </View>
    );
  }

  const handlePress = async () => {
    try {
      if (item.senderId === userId) return; // Ignorer nos propres images
      
      const result = await handleImageAction(item.content);
      if (!result.success) {
        Alert.alert('Erreur', 'Impossible de partager l\'image');
      }
    } catch (error) {
      console.error('Erreur:', error);
      Alert.alert('Erreur', 'Une erreur est survenue');
    }
  };

  return (
    <TouchableOpacity 
      onPress={handlePress}
      style={[
        styles.messageContainer,
        item.senderId === userId ? styles.sentMessage : styles.receivedMessage
      ]}>
      <Image 
        source={{ uri: safeUri }}
        style={styles.messageImage}
        resizeMode="contain"
      />
      <View style={styles.messageFooter}>
        <Text style={styles.messageTime}>{messageTime}</Text>
      </View>
    </TouchableOpacity>
  );
};

const ChatScreen = ({ route, navigation }) => {
  const { participantId, participantName } = route.params;
  // Utilisation de useReducer pour une gestion d'état plus robuste
  const [state, dispatch] = useReducer(conversationReducer, initialState);
  
  const isFocused = useIsFocused();
  
  // Références
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const unsubscribeRef = useRef(null);
  
  // Extraction des valeurs d'état pour faciliter l'accès
  const { 
    messages, 
    isLoading, 
    userId, 
    isOtherTyping, 
    newMessage, 
    userContext, 
    showEmojis, 
    showTopics 
  } = state;

  const conversationTopics = [
    { emoji: '🌞', text: 'Ma journée', prompt: "Racontez-moi comment s'est passée votre journée ?" },
    { emoji: '👨‍👩‍👧‍👦', text: 'Ma famille', prompt: "Voulez-vous parler de votre famille ?" },
    { emoji: '🎮', text: 'Jeux', prompt: "On fait un petit jeu ensemble ? Je connais des jeux de mots amusants !" },
    { emoji: '📝', text: 'Message', prompt: "Je peux vous aider à écrire un message si vous voulez." },
    { emoji: '🤗', text: 'Discussion', prompt: "De quoi aimeriez-vous discuter ?" }
  ];

  const quickEmojis = ['👋', '❤️', '😊', '👍', '🌞'];
  const quickMessages = ['Coucou !', 'Je pense à toi', 'Bonne journée', 'À bientôt'];

  const handleTopicSelect = (topic) => {
    handleSendMessage(topic.prompt);
    dispatch({ type: 'RESET_UI_STATE' });
  };

  const scrollToBottom = () => {
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };

  const validateMessage = (message) => {
    if (!message || typeof message !== 'object') return null;
    
    try {
      // Vérifier que les champs requis sont présents
      if (!message.content || !message.senderId) {
        console.warn('Message invalide - champs manquants:', message);
        return null;
      }
  
      // Normaliser le timestamp
      let timestamp;
      if (message.timestamp) {
        if (message.timestamp._h !== undefined) {
          timestamp = new Date(
            message.timestamp._h || new Date().getFullYear(),
            (message.timestamp._i || 1) - 1,
            message.timestamp._j || 1,
            message.timestamp._k || 0
          );
        } else if (message.timestamp.seconds) {
          timestamp = new Date(message.timestamp.seconds * 1000);
        } else if (typeof message.timestamp.toDate === 'function') {
          timestamp = message.timestamp.toDate();
        } else if (message.timestamp instanceof Date) {
          timestamp = message.timestamp;
        } else {
          timestamp = new Date(message.timestamp);
        }
  
        // Vérifier si le timestamp est valide
        if (isNaN(timestamp.getTime())) {
          console.warn('Timestamp invalide:', message.timestamp);
          timestamp = new Date(); // Fallback sur la date actuelle
        }
      } else {
        timestamp = new Date(); // Fallback sur la date actuelle
      }
  
      // Retourner un message normalisé
      return {
        ...message,
        timestamp,
        type: message.type || 'text'
      };
    } catch (error) {
      console.error('Erreur lors de la validation du message:', error);
      return null;
    }
  };

  useEffect(() => {
    const loadProfile = async () => {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const profileJson = await AsyncStorage.getItem('familyProfile') || await AsyncStorage.getItem('seniorProfile');
      const profile = JSON.parse(profileJson);
      dispatch({ type: 'SET_USER_ID', payload: profile?.profile?.userId });

      // Check if OpenAI API key is set
      const apiKey = await AsyncStorage.getItem('openai_api_key');
      if (!apiKey && participantId === 'chatbox') {
        Alert.alert(
          "Clé API manquante",
          "Pour utiliser le chatbot, vous devez configurer votre clé API OpenAI dans les paramètres.",
          [
            { text: "Plus tard" },
            { 
              text: "Configurer", 
              onPress: () => navigation.navigate('Settings')
            }
          ]
        );
      }

      dispatch({ type: 'SET_LOADING', payload: false });
    };

    loadProfile();
  }, [participantId, navigation]);

  useEffect(() => {
    const autoStartChatbox = async () => {
      try {
        const profileJson = await AsyncStorage.getItem('familyProfile') || await AsyncStorage.getItem('seniorProfile');
        const profile = JSON.parse(profileJson);
        const userId = profile?.profile?.userId;
        const conversationId = getConversationId(userId, 'chatbox');
  
        const messagesRef = collection(db, 'conversations', conversationId, 'messages');
        const snapshot = await getDocs(query(messagesRef, orderBy('timestamp', 'desc'), limit(1)));
  
        let shouldRelance = true;
  
        if (!snapshot.empty) {
          const lastMessage = snapshot.docs[0].data();
          const lastTimestamp = lastMessage.timestamp?.toDate?.() || new Date(lastMessage.timestamp);
          const now = new Date();
          const minutesSinceLast = (now - lastTimestamp) / 1000 / 60;
  
          const isClosureMessage =
            lastMessage.senderId === 'chatbox' &&
            lastMessage.content &&
            /au revoir|bonne journée|à bientôt|n'hésitez pas|bye/i.test(lastMessage.content);
  
          // Fix the contradiction here - if chatbot spoke recently, don't relaunch unless it was a closure
          if (lastMessage.senderId === 'chatbox' && minutesSinceLast < 30 && !isClosureMessage) {
            console.log('[DEBUG] La chatbox a déjà parlé récemment, on ne relance pas.');
            shouldRelance = false; // Don't relaunch if the chatbot spoke in the last 30 minutes
          } else if (isClosureMessage && minutesSinceLast >= 5) {
            console.log('[DEBUG] Dernier message était une fermeture, mais il date — on peut relancer !');
            shouldRelance = true;
          } else if (lastMessage.senderId !== 'chatbox') {
            console.log('[DEBUG] Dernier message vient de l\'utilisateur — relance possible');
            shouldRelance = true;
          }
        } else {
          console.log('[DEBUG] Aucun message précédent, première interaction — on lance');
        }
  
        if (shouldRelance) {
          console.log('[DEBUG] Relance automatique du chatbox avec un message chaleureux');
          
          // Load user context first to personalize the welcome message
          const context = await getUserContext(userId);
          
          // Get temporal context for better continuity
          const temporalAndLocationContext = await getTemporalAndLocationContext();
          
          const response = await getChatboxResponse("Commence la discussion naturellement", userId, temporalAndLocationContext);
          await sendMessage(conversationId, 'chatbox', response, 'text');
        }
  
      } catch (error) {
        console.error('[ERREUR] autoStartChatbox:', error);
      }
    };
  
    if (isFocused && participantId === 'chatbox') {
      autoStartChatbox();
    }
  }, [isFocused, participantId]);
  
  useEffect(() => {
    // Défiler vers le bas quand de nouveaux messages arrivent
    if (messages.length > 0) {
      setTimeout(scrollToBottom, 100);
    }
  }, [messages]);

  useEffect(() => {
    const loadUserContext = async () => {
      if (userId) {
        const context = await getUserContext(userId);
        dispatch({ type: 'SET_USER_CONTEXT', payload: context });
      }
    };
    loadUserContext();
  }, [userId]);

  useEffect(() => {
    const loadConversationContext = async () => {
      try {
        if (userId) {
          const conversationId = [userId, participantId].sort().join('-');
          // Charger le contexte de la conversation depuis Firestore
          const conversationRef = doc(db, 'conversations', conversationId);
          const conversationDoc = await getDoc(conversationRef);
          
          if (conversationDoc.exists()) {
            dispatch({ type: 'SET_USER_CONTEXT', payload: conversationDoc.data().context || {} });
          } else {
            // Créer un nouveau contexte si la conversation n'existe pas
            const newContext = {
              lastInteraction: new Date(),
              conversationHistory: [],
              preferences: {}
            };
            await setDoc(conversationRef, { context: newContext });
            dispatch({ type: 'SET_USER_CONTEXT', payload: newContext });
          }
        }
      } catch (error) {
        console.error('Erreur chargement contexte:', error);
      }
    };

    loadConversationContext();
  }, [userId, participantId]);

  const updateConversationContext = async (newContext) => {
    try {
      if (userId) {
        const conversationId = [userId, participantId].sort().join('-');
        const conversationRef = doc(db, 'conversations', conversationId);
        await updateDoc(conversationRef, {
          'context': { ...userContext, ...newContext },
          'lastUpdated': new Date()
        });
        dispatch({ type: 'SET_USER_CONTEXT', payload: { ...userContext, ...newContext } });
      }
    } catch (error) {
      console.error('Erreur mise à jour contexte:', error);
    }
  };

  const getTemporalAndLocationContext = async () => {
  try {
    // Utiliser le service amélioré pour obtenir un contexte riche
    return await contextService.getFullContextSummary();
  } catch (error) {
    console.error('[ERREUR] Récupération contexte:', error);
    
    // Fallback sur la méthode simplifiée
    const now = new Date();
    const dateString = now.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeString = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return `Nous sommes le ${dateString}, il est ${timeString}.`;
  }
};

  const onSend = async (messageToSend = newMessage) => {
    const messageText = typeof messageToSend === 'object' ? newMessage : messageToSend;
  
    if (!messageText.trim() || !userId || !participantId) {
      console.log('Invalid data:', { messageText, userId, participantId });
      return;
    }
  
    try {
      const conversationId = getConversationId(userId, participantId);
      const result = await sendMessage(conversationId, userId, messageText.trim(), 'text');
  
      if (result.success) {
        dispatch({ type: 'SET_NEW_MESSAGE', payload: '' });
        dispatch({ type: 'RESET_UI_STATE' });
        
        await updateUserContext(userId, {
          lastInteraction: new Date(),
          lastMessage: messageText.trim()
        });
  
        // Si c'est le chatbox, demander la réponse IA et l'ajouter à la conversation
        if (participantId === 'chatbox') {
          // Vérifier si c'est une réponse courte liée à la météo (comme "Et demain?")
          const isShortResponse = messageText.trim().length < 15; // Message court
          const contextualQuery = contextService.detectContextualQuery(messageText.trim());
          let response;
          
          // Traitement spécial pour les requêtes météo
          if ((contextualQuery.type === 'weather' && contextualQuery.entities?.forecast) || 
              (isShortResponse && /demain/i.test(messageText.trim()))) {
            
            // Pour les réponses courtes, vérifier si le contexte précédent est météo
            if (isShortResponse && /demain/i.test(messageText.trim())) {
              const recentMsgsQuery = query(
                collection(db, 'conversations', conversationId, 'messages'), 
                orderBy('timestamp', 'desc'), 
                limit(3)
              );
              const recentMsgsSnap = await getDocs(recentMsgsQuery);
              const recentMsgs = recentMsgsSnap.docs.map(doc => doc.data());
              
              // Vérifier si la conversation récente concernait la météo
              const isPreviousWeather = recentMsgs.some(msg => 
                msg.senderId === 'chatbox' && 
                msg.content && 
                typeof msg.content === 'string' && 
                /météo|température|temps|fait[-\s]il|°C|degrés|chaud|froid/i.test(msg.content)
              );
              
              if (isPreviousWeather) {
                console.log('[DEBUG] Contexte météo récent détecté pour requête courte, utilisation des prévisions');
                response = await contextService.getWeatherForecastForUser();
              } else {
                // Pas de contexte météo, traitement normal
                const temporalAndLocationContext = await getTemporalAndLocationContext();
                response = await getChatboxResponse(messageText.trim(), userId, temporalAndLocationContext);
              }
            } else {
              // Requête météo explicite pour demain
              console.log('[DEBUG] Requête météo pour demain détectée, utilisation directe du service météo');
              response = await contextService.getWeatherForecastForUser();
            }
          } else {
            // Pour les autres requêtes, utiliser le traitement normal
            const temporalAndLocationContext = await getTemporalAndLocationContext();
            response = await getChatboxResponse(messageText.trim(), userId, temporalAndLocationContext);
          }
          
          console.log('[DEBUG] Réponse IA:', response);
          if (response) {
            await sendMessage(conversationId, 'chatbox', response, 'text');
          }
        }
      } else {
        Alert.alert('Error', 'Message not sent');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Unable to send the message');
    }
  };

  const handleSendMessage = async (message, overrideSenderId = null) => {
    const timestamp = new Date();
    const messageSenderId = overrideSenderId || userId;
    const conversationId = [userId, participantId].sort().join('-');
  
    try {
      const result = await sendMessage(conversationId, messageSenderId, message.trim(), 'text');
      if (result.success) {
        dispatch({ type: 'SET_NEW_MESSAGE', payload: '' });
      } else {
        Alert.alert('Erreur', 'Message non envoyé');
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer le message');
    }
  };

  useEffect(() => {
    // Récupération des messages et abonnement aux mises à jour
    let isActive = true;

    if (userId && participantId) {
      const conversationId = getConversationId(userId, participantId);
      console.log(`[DEBUG] Configuration de l'abonnement aux messages pour ${conversationId}`);
      
      // Désabonner de l'abonnement précédent s'il existe
      if (unsubscribeRef.current) {
        console.log("[DEBUG] Désabonnement de l'abonnement précédent");
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      
      // Créer un nouvel abonnement et stocker l'objet de désabonnement
      unsubscribeRef.current = subscribeToMessages(conversationId, (newMessages) => {
        console.log(`[DEBUG] Nouveaux messages reçus (${newMessages.length})`);
        if (typeof newMessages === 'object' && Array.isArray(newMessages)) {
          dispatch({ type: 'SET_MESSAGES', payload: newMessages });
        } else {
          console.warn('Invalid messages received:', newMessages);
        }
      });
      
      // S'abonner au statut de frappe
      const typingUnsubscribe = subscribeToTypingStatus(
        conversationId,
        userId,
        (typing) => dispatch({ type: 'SET_TYPING', payload: typing })
      );
      
      // Combiner les fonctions de désabonnement
      const combinedUnsubscribe = () => {
        if (unsubscribeRef.current) unsubscribeRef.current();
        if (typingUnsubscribe) typingUnsubscribe();
      };
      
      unsubscribeRef.current = combinedUnsubscribe;
    }
    
    // Nettoyer l'abonnement lors du démontage du composant
    return () => {
      if (unsubscribeRef.current) {
        console.log("[DEBUG] Nettoyage de l'abonnement aux messages");
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [userId, participantId]); // Se réabonner uniquement si userId ou participantId change

  useEffect(() => {
    if (participantId === 'chatbox') {
      navigation.setOptions({
        headerRight: () => (
          <TouchableOpacity 
            onPress={() => navigation.navigate('Settings')}
            style={{ paddingRight: 15 }}
          >
            <MaterialCommunityIcons name="cog" size={24} color="#4285F4" />
          </TouchableOpacity>
        ),
      });
    }
  }, [navigation, participantId]);

  const handleTyping = () => {
    if (!userId) return;
    const conversationId = [userId, participantId].sort().join('-');
    
    // Mettre à jour le statut de frappe
    setTypingStatus(conversationId, userId, true);
    
    // Réinitialiser le timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Définir un nouveau timeout
    typingTimeoutRef.current = setTimeout(() => {
      setTypingStatus(conversationId, userId, false);
    }, 2000);
  };

  const handleImagePick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        quality: 0.3,
        base64: true,
        aspect: [4, 3],
      });
  
      if (!result.canceled && result.assets?.[0]) {
        const rawUri = result.assets[0].uri;
        const safeUri = await getSafeUri(rawUri); // Convertir l'URI si nécessaire

        if (!safeUri) {
          Alert.alert('Erreur', 'Fichier image inaccessible.');
          return;
        }

        const conversationId = [userId, participantId].sort().join('-');
        
        // Upload l'image d'abord
        const uploadResult = await uploadImage(safeUri);
        
        if (!uploadResult.success) {
          throw new Error('Échec upload image');
        }
  
        // Envoie l'URL de l'image uploadée
        await sendMessage(
          conversationId,
          userId,
          uploadResult.url, // Utilise l'URL de l'image uploadée
          'image'
        );
      }
    } catch (error) {
      console.error('Erreur sélection/upload image:', error);
      Alert.alert('Erreur', 'Impossible de partager l\'image');
    }
  };

  const renderDate = (timestamp) => {
    if (!timestamp) return '';
    
    let date;
    try {
      // Cas 1: Format spécial {_h, _i, _j, _k}
      if (timestamp._h !== undefined) {
        date = new Date(
          timestamp._h || new Date().getFullYear(),
          (timestamp._i || 1) - 1,
          timestamp._j || 1,
          timestamp._k || 0
        );
      }
      // Cas 2: Timestamp Firestore
      else if (timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
      }
      // Cas 3: Timestamp avec toDate()
      else if (typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      }
      // Cas 4: Date standard
      else if (timestamp instanceof Date) {
        date = timestamp;
      }
      // Cas 5: Timestamp en millisecondes
      else {
        date = new Date(timestamp);
      }
  
      // Vérifier si la date est valide
      if (isNaN(date.getTime())) {
        console.warn('Date invalide:', timestamp);
        return '';
      }
  
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
  
      if (date.toDateString() === today.toDateString()) {
        return "Aujourd'hui";
      } else if (date.toDateString() === yesterday.toDateString()) {
        return "Hier";
      }
      
      // Format: DD/MM/YYYY
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      console.warn('Erreur lors du traitement de la date:', error);
      return '';
    }
  };

  const groupMessagesByDate = (msgs) => {
    const groups = {};
    msgs.forEach(message => {
      try {
        if (!message.timestamp) {
          return;
        }
  
        const timestamp = typeof message.timestamp === 'object' && message.timestamp.toDate
          ? message.timestamp.toDate()
          : new Date(message.timestamp);
  
        const date = timestamp.toDateString();
        if (!groups[date]) {
          groups[date] = [];
        }
        groups[date].push(message);
      } catch (e) {
        console.warn('Timestamp invalide dans groupMessagesByDate:', message, e);
      }
    });
  
    return Object.entries(groups).map(([date, messages]) => ({
      date,
      data: messages,
      id: date,
    }));
  };

  const renderDateHeader = ({ section: { date } }) => (
    <View style={styles.dateHeaderContainer}>
      <Text style={styles.dateHeaderText}>
        {renderDate(new Date(date))}
      </Text>
    </View>
  );

  const renderMessage = ({ item }) => {
    // Vérifications de sécurité avec sortie rapide
    if (!item) return null;
    if ((!item.content && item.type !== 'image')) return null;
    
    try {
      // S'assurer que le contenu est une chaîne
      const messageContent = typeof item.content === 'object' 
        ? JSON.stringify(item.content)
        : String(item.content || '');
    
      const messageTime = formatMessageTime(item.timestamp);
    
      if (item.type === 'image') {
        return <ImageMessage item={item} userId={userId} messageTime={messageTime} />;
      }
    
      return (
        <View
          style={[
            styles.messageContainer,
            item.senderId === userId ? styles.sentMessage : styles.receivedMessage
          ]}
        >
          <Text
            style={[
              styles.messageText,
              item.senderId === userId ? styles.sentMessageText : styles.receivedMessageText
            ]}
            numberOfLines={0}
          >
            {messageContent}
          </Text>
          <View style={styles.messageFooter}>
            <Text style={styles.messageTime}>{messageTime}</Text>
            {item.senderId === userId && (
              <MaterialCommunityIcons
                name={item.read ? 'check-all' : 'check'}
                size={16}
                color={item.read ? '#4CAF50' : '#999'}
                style={styles.readIndicator}
              />
            )}
          </View>
        </View>
      );
    } catch (error) {
      console.error('[ERROR] Erreur de rendu du message:', error);
      return null; // Retourner null en cas d'erreur pour éviter le crash
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4285F4" />
          <Text style={styles.loadingText}>Chargement des messages...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#4285F4" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{participantName}</Text>
      </View>

      <View style={styles.chatContainer}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id || `msg-${Date.now()}-${Math.random()}`}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          style={styles.messageContainer}
          onContentSizeChange={scrollToBottom}
          onLayout={scrollToBottom}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews={true}
        />

        {isOtherTyping && (
          <View style={styles.typingContainer}>
            <Text style={styles.typingText}>{participantName} est en train d'écrire...</Text>
          </View>
        )}

        {showEmojis && (
          <View style={styles.quickActionsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {quickEmojis.map((emoji, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.quickButton}
                  onPress={() => onSend(emoji)}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={styles.mediaButton}
            onPress={handleImagePick}
          >
            <MaterialCommunityIcons name="image" size={24} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.emojiButton}
            onPress={() => dispatch({ type: 'TOGGLE_EMOJIS' })}
          >
            <Entypo name="emoji-happy" size={24} color="#666" />
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            value={newMessage}
            onChangeText={(text) => {
              dispatch({ type: 'SET_NEW_MESSAGE', payload: text });
              handleTyping();
            }}
            placeholder="Écrivez votre message..."
            placeholderTextColor="#999"
            returnKeyType="send" // Ajout du bouton "Envoyer" sur le clavier
            onSubmitEditing={() => onSend()} // Envoie le message lorsque l'utilisateur appuie sur "Envoyer"
          />
          <TouchableOpacity 
            style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
            onPress={onSend}
            disabled={!newMessage.trim()}
          >
            <MaterialCommunityIcons 
              name="send" 
              size={24} 
              color={newMessage.trim() ? "#4285F4" : "#CCC"} 
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.topicsButton}
            onPress={() => dispatch({ type: 'TOGGLE_TOPICS' })}
          >
            <MaterialCommunityIcons name="format-list-bulleted" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {showEmojis && (
          <View style={styles.quickMessagesContainer}>
            {quickMessages.map((msg, index) => (
              <TouchableOpacity
                key={index}
                style={styles.quickMessageButton}
                onPress={() => onSend(msg)}
              >
                <Text style={styles.quickMessageText}>{msg}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        
        {showTopics && (
          <View style={styles.quickMessagesContainer}>
            {conversationTopics.map((topic, index) => (
              <TouchableOpacity
                key={index}
                style={styles.quickMessageButton}
                onPress={() => handleTopicSelect(topic)}
              >
                <Text style={styles.quickMessageText}>
                  {topic.emoji} {topic.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 10,
    color: '#333',
  },
  messageContainer: {
    padding: 10,
    margin: 5,
    borderRadius: 10,
    width: 'auto', // Supprimer la contrainte de largeur fixe
    flex: 0, // Empêcher l'expansion
  },
  messageText: {
    fontSize: 16,
    color: '#333',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  input: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    fontSize: 16,
  },
  sendButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 44,
    height: 44,
  },
  sentMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#E3F2FD',
    maxWidth: '80%',
    marginLeft: 40,
  },
  receivedMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#F5F5F5',
    maxWidth: '80%',
    marginRight: 40,
  },
  messageTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  dateHeaderContainer: {
    alignItems: 'center',
    marginVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 15,
    alignSelf: 'center',
  },
  dateHeaderText: {
    fontSize: 12,
    color: '#666',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  readIndicator: {
    marginLeft: 4,
  },
  sentMessageText: {
    color: '#000',
  },
  receivedMessageText: {
    color: '#333',
  },
  typingContainer: {
    padding: 10,
    alignItems: 'center',
  },
  typingText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  messageList: {
    flexGrow: 1,
    width: '100%',
    padding: 10,
  },
  chatContainer: {
    flex: 1,
  },
  quickActionsContainer: {
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  quickButton: {
    padding: 10,
    marginHorizontal: 5,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
  },
  emojiText: {
    fontSize: 24,
  },
  emojiButton: {
    padding: 10,
  },
  quickMessagesContainer: {
    padding: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  quickMessageButton: {
    backgroundColor: '#E3F2FD',
    padding: 10,
    borderRadius: 15,
  },
  quickMessageText: {
    fontSize: 16,
    color: '#333',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
  },
  mediaButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 44,
    height: 44,
    marginRight: 10,
  },
  errorText: {
    color: '#666',
    fontStyle: 'italic',
    fontSize: 14,
    padding: 10,
  },
  saveButton: {
    position: 'absolute',
    right: 10,
    top: 10,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 20,
    padding: 5,
  },
  topicsContainer: {
    position: 'absolute',
    bottom: 70,
    left: 10,
    right: 10,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  topicButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    marginVertical: 5,
    backgroundColor: '#F0F0F0',
  },
  topicEmoji: {
    fontSize: 24,
    marginRight: 10,
  },
  topicText: {
    fontSize: 16,
    color: '#333',
  },
  topicsButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 44,
    height: 44,
    marginRight: 10
  }
});

export default ChatScreen;
