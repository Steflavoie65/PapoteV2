import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, SafeAreaView, TextInput, TouchableOpacity, FlatList, ActivityIndicator, SectionList, ScrollView, Image, Alert } from 'react-native';
import { MaterialCommunityIcons, Entypo } from '@expo/vector-icons';
import { subscribeToMessages, sendMessage, setTypingStatus, subscribeToTypingStatus, getChatboxResponse, getWelcomeMessage, createConversation, updateUserContext, getUserContext, getConversationId } from '../services/chatService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { uploadImage, getLocalImage } from '../services/storageService';
import { saveToGallery, shareImage, handleImageAction } from '../services/imageService';
import * as FileSystem from 'expo-file-system'; // Import FileSystem pour gérer les URI
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

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
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [userId, setUserId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOtherTyping, setIsOtherTyping] = useState(false); // Une seule déclaration
  const [showEmojis, setShowEmojis] = useState(false);
  const [showTopics, setShowTopics] = useState(false);
  const [userContext, setUserContext] = useState(null);

  const conversationTopics = [
    { emoji: '🌞', text: 'Ma journée', prompt: "Comment s'est passée votre journée ? Avez-vous fait une promenade aujourd'hui ?" },
    { emoji: '💊', text: 'Ma santé', prompt: "Comment vous sentez-vous aujourd'hui ? Avez-vous bien dormi ?" },
    { emoji: '👨‍👩‍👧‍👦', text: 'Ma famille', prompt: "Voulez-vous me parler de votre famille ? Avez-vous eu des nouvelles récemment ?" },
    { emoji: '🎮', text: 'Jeux', prompt: "Que diriez-vous d'un petit jeu ? Je connais des jeux de mémoire et de mots amusants !" },
    { emoji: '📺', text: 'Loisirs', prompt: "Qu'aimez-vous faire pour vous divertir ? Avez-vous regardé une émission intéressante ?" }
  ];

  const handleTopicSelect = async (topic) => {
    // Envoyer le prompt comme message du senior
    await onSend(topic.prompt);
    setShowTopics(false);
  };

  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const quickEmojis = ['👋', '❤️', '😊', '👍', '🌞'];
  const quickMessages = [
    'Je vais bien aujourd\'hui',
    'J\'ai passé une bonne journée',
    'Je me sens un peu fatigué',
    'J\'aimerais parler un moment'
  ];

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
      setIsLoading(true);
      const profileJson = await AsyncStorage.getItem('familyProfile') || await AsyncStorage.getItem('seniorProfile');
      const profile = JSON.parse(profileJson);
      setUserId(profile?.profile?.userId);

      const conversationId = [profile?.profile?.userId, participantId].sort().join('-');

      const unsubscribe = subscribeToMessages(conversationId, (newMessages) => {
        if (typeof newMessages === 'object' && Array.isArray(newMessages)) {
          const validMessages = newMessages
            .map(validateMessage)
            .filter(msg => msg !== null)
            .sort((a, b) => a.timestamp - b.timestamp);
          setMessages(validMessages);
        } else {
          console.warn('Invalid messages received:', newMessages);
        }
      });

      const unsubscribeTyping = subscribeToTypingStatus(
        conversationId,
        profile?.profile?.userId,
        (typing) => setIsOtherTyping(typing)
      );

      setIsLoading(false);
      return () => {
        unsubscribe();
        unsubscribeTyping();
      };
    };

    loadProfile();
  }, [participantId]);

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
        setUserContext(context);
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
            setUserContext(conversationDoc.data().context || {});
          } else {
            // Créer un nouveau contexte si la conversation n'existe pas
            const newContext = {
              lastInteraction: new Date(),
              conversationHistory: [],
              preferences: {}
            };
            await setDoc(conversationRef, { context: newContext });
            setUserContext(newContext);
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
        setUserContext(prev => ({ ...prev, ...newContext }));
      }
    } catch (error) {
      console.error('Erreur mise à jour contexte:', error);
    }
  };

  const simulateTypingDelay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
        setNewMessage('');
        await updateUserContext(userId, {
          lastInteraction: new Date(),
          lastMessage: messageText.trim()
        });

        // Log le message envoyé
        console.log('[CONVERSATION LOG] Message sent:', messageText.trim());
        
        // Si c'est le chatbox, simule que le bot tape puis récupère la réponse et la log
        if (participantId === 'chatbox') {
          setIsOtherTyping(true);
          await simulateTypingDelay(1500); // Délai de 1,5 s avant réponse
          setIsOtherTyping(false);
          const iaResponse = await getChatboxResponse(messageText.trim(), userId);
          // Log de la réponse reçue du chatbot
          console.log('[CONVERSATION LOG] IA Response:', iaResponse);
          if (iaResponse) {
            await sendMessage(conversationId, 'chatbox', iaResponse, 'text');
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
        setNewMessage('');
      } else {
        Alert.alert('Erreur', 'Message non envoyé');
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer le message');
    }
  };

  useEffect(() => {
    if (!userId || !participantId) return;
    
    const conversationId = getConversationId(userId, participantId);
    
    // Envoyer immédiatement un message d'accueil si c'est le chatbox
    const sendWelcome = async () => {
      if (participantId === 'chatbox') {
        const profileJson = await AsyncStorage.getItem('seniorProfile');
        const profile = profileJson ? JSON.parse(profileJson) : null;
        const userName = profile?.profile?.firstName || 'cher ami';
        
        const welcome = await getWelcomeMessage(userName);
        // Envoie le message initial
        await sendMessage(conversationId, 'chatbox', welcome.initial, 'text');
        
        // Envoie le suivi après 2 secondes
        setTimeout(async () => {
          await sendMessage(conversationId, 'chatbox', welcome.followUp, 'text');
        }, 2000);
      }
    };

    // S'abonner aux messages
    const unsubscribe = subscribeToMessages(conversationId, (newMessages) => {
      if (Array.isArray(newMessages)) {
        const validMessages = newMessages
          .map(validateMessage)
          .filter(msg => msg !== null)
          .sort((a, b) => a.timestamp - b.timestamp);
        setMessages(validMessages);
        // Log la liste complète des messages reçus dans la conversation
        console.log('[CONVERSATION LOG] Messages received:', validMessages);
      }
    });

    // Envoyer le message d'accueil
    sendWelcome();

    return () => unsubscribe();
  }, [userId, participantId]);

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
    // Vérifications de sécurité
    if (!item) {
      console.warn('[DEBUG] Message invalide:', item);
      return null;
    }
  
    // S'assurer que le contenu existe et est une chaîne
    if (!item.content && item.type !== 'image') {
      console.warn('[DEBUG] Message sans contenu:', item);
      return null;
    }
  
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
          data={messages.sort((a, b) => {
            try {
              let timeA, timeB;
              
              // Gérer le timestamp A
              if (a.timestamp?._seconds) {
                timeA = new Date(a.timestamp._seconds * 1000);
              } else if (typeof a.timestamp?.toDate === 'function') {
                timeA = a.timestamp.toDate();
              } else if (a.timestamp instanceof Date) {
                timeA = a.timestamp;
              } else {
                timeA = new Date(a.timestamp);
              }
              
              // Gérer le timestamp B
              if (b.timestamp?._seconds) {
                timeB = new Date(b.timestamp._seconds * 1000);
              } else if (typeof b.timestamp?.toDate === 'function') {
                timeB = b.timestamp.toDate();
              } else if (b.timestamp instanceof Date) {
                timeB = b.timestamp;
              } else {
                timeB = new Date(b.timestamp);
              }
              
              return timeA.getTime() - timeB.getTime();
            } catch (error) {
              console.warn('Erreur de tri des messages:', error);
              return 0; // En cas d'erreur, ne pas modifier l'ordre
            }
          })}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          style={styles.messageContainer}
          onContentSizeChange={scrollToBottom}
          onLayout={scrollToBottom}
        />

        {participantId === 'chatbox' && isOtherTyping && (
          <View style={styles.typingContainer}>
            <Text style={styles.typingText}>Chatbox tape...</Text>
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
            onPress={() => setShowEmojis(!showEmojis)}
          >
            <Entypo name="emoji-happy" size={24} color="#666" />
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            value={newMessage}
            onChangeText={(text) => {
              setNewMessage(text);
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
            onPress={() => setShowTopics(!showTopics)}
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
          <View style={styles.topicsContainer}>
            {conversationTopics.map((topic, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.topicButton}
                onPress={() => handleTopicSelect(topic)}
              >
                <Text style={styles.topicEmoji}>{topic.emoji}</Text>
                <Text style={styles.topicText}>{topic.text}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {participantId === 'chatbox' && !messages.length && (
          <View style={{ alignItems: 'center', marginVertical: 20 }}>
            <TouchableOpacity
              style={{
                backgroundColor: '#4285F4',
                paddingVertical: 14,
                paddingHorizontal: 40,
                borderRadius: 30,
              }}
              onPress={async () => {
                // Forcer l'envoi du message d'accueil IA même si déjà envoyé
                const profileJson = await AsyncStorage.getItem('seniorProfile');
                const profile = profileJson ? JSON.parse(profileJson) : null;
                const userName = profile?.profile?.firstName || 'cher ami';
                const conversationId = getConversationId(userId, participantId);
                const welcome = await getWelcomeMessage(userName);
                await sendMessage(conversationId, 'chatbox', welcome, 'text');
              }}
            >
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>Parler</Text>
            </TouchableOpacity>
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
    fontSize: 18, // Plus grand pour meilleure lisibilité
    lineHeight: 24,
    color: '#000', // Meilleur contraste
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
    paddingVertical: 12, // Plus d'espace pour taper
    marginRight: 10,
    fontSize: 18,
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
    padding: 15, // Boutons plus grands
    marginHorizontal: 8,
    backgroundColor: '#E3F2FD',
    borderRadius: 25,
  },
  emojiText: {
    fontSize: 28, // Emojis plus grands
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
    marginRight: 10,
  },
});

export default ChatScreen;
