import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { doc, getDoc } from 'firebase/firestore';

let app, db, auth, storage;
let isFirestoreAvailable = true;
let lastQuotaCheck = 0;

const firebaseConfig = {
  apiKey: "AIzaSyAWLYrVlQl8Sxlz9Z3XmoXiXE0N70HvEFo",
  authDomain: "papote-boutonal.firebaseapp.com",
  projectId: "papote-boutonal",
  storageBucket: "papote-boutonal.appspot.com",
  messagingSenderId: "357986409441",
  appId: "1:357986409441:web:e16415319a25cd463baa22"
};

// Use AsyncStorage to persist Auth initialization status
const initializeFirebase = async () => {
  try {
    const isAuthInitialized = await AsyncStorage.getItem('isAuthInitialized');

    if (getApps().length === 0) {
      console.log("Creating new Firebase app instance");
      app = initializeApp(firebaseConfig);

      // Initialize Auth with persistence only if it hasn't been initialized before
      if (isAuthInitialized !== 'true') {
        console.log("Initializing Auth with AsyncStorage persistence");
        auth = initializeAuth(app, {
          persistence: getReactNativePersistence(AsyncStorage)
        });
        await AsyncStorage.setItem('isAuthInitialized', 'true'); // Persist the initialization status
      } else {
        console.log("Auth already initialized (AsyncStorage), skipping persistence setup");
        auth = getAuth(app);
      }
    } else {
      console.log("Reusing existing Firebase app instance");
      app = getApp();
      auth = getAuth(app);
    }

    db = getFirestore(app);
    storage = getStorage(app);
    console.log("Firebase initialisé avec succès. Projet:", firebaseConfig.projectId);
    await AsyncStorage.setItem('firebase_initialized', 'true');
  } catch (error) {
    console.error("Erreur critique lors de l'initialisation de Firebase:", error);
    isFirestoreAvailable = false;
    await AsyncStorage.setItem('offline_mode', 'true');
  }
};

// Call the initialization function
initializeFirebase();

/**
 * Activer le mode hors ligne en cas de problème avec Firebase
 */
function enableOfflineMode() {
  console.log("Activation du mode hors ligne...");
  isFirestoreAvailable = false;
  // Notifier l'application que Firebase est indisponible
  AsyncStorage.setItem('offline_mode', 'true')
    .catch(err => console.error("Erreur lors de l'activation du mode hors ligne:", err));
}

/**
 * Wrapper pour les opérations Firestore avec gestion d'erreur
 */
export const safeFirestoreOperation = async (operation, fallbackKey, fallbackData = null) => {
  if (!isFirestoreAvailable) {
    console.log("Firebase indisponible, utilisation des données locales");
    // Tenter de récupérer depuis le stockage local
    if (fallbackKey) {
      try {
        const data = await AsyncStorage.getItem(fallbackKey);
        return data ? JSON.parse(data) : fallbackData;
      } catch (error) {
        console.error("Erreur lors de la récupération des données locales:", error);
        return fallbackData;
      }
    }
    return fallbackData;
  }
  
  try {
    return await operation();
  } catch (error) {
    console.error(`Erreur Firestore: ${error.message}`);
    
    // Si l'erreur est liée au quota ou à la connectivité
    if (error.message.includes('quota') || error.code === 'resource-exhausted' || 
        error.code === 'unavailable' || error.code === 'not-found') {
      console.warn("Problème de connectivité Firebase détecté, passage en mode local");
      isFirestoreAvailable = false;
      
      // Essayer de récupérer les données en local
      if (fallbackKey) {
        try {
          const cachedData = await AsyncStorage.getItem(fallbackKey);
          if (cachedData) {
            return JSON.parse(cachedData);
          }
        } catch (storageError) {
          console.error("Échec de la récupération locale:", storageError);
        }
      }
    }
    
    return fallbackData;
  }
};

/**
 * Vérifier si Firestore est disponible et si le quota n'est pas dépassé
 */
export const checkFirestoreAvailability = async () => {
  try {
    // Limiter la fréquence des vérifications (une fois par minute max)
    const now = Date.now();
    if (now - lastQuotaCheck < 60000) {
      return isFirestoreAvailable;
    }
    
    lastQuotaCheck = now;
    
    // Vérifier la connectivité réseau d'abord
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      console.log('Appareil hors ligne, utilisation du mode local');
      isFirestoreAvailable = false;
      return false;
    }
    
    // Effectuer un test léger sur Firestore
    if (db) {
      try {
        const systemRef = doc(db, 'system', 'status');
        await getDoc(systemRef);
        
        // Si on arrive ici, Firestore est disponible
        isFirestoreAvailable = true;
        return true;
      } catch (error) {
        console.warn("Erreur lors de la vérification Firestore:", error);
        isFirestoreAvailable = false;
        return false;
      }
    }
    
    return false;
  } catch (error) {
    console.error("Erreur lors de la vérification de Firebase:", error);
    isFirestoreAvailable = false;
    return false;
  }
};

// Exporter les variables nécessaires
export { db, auth, storage, app, isFirestoreAvailable };
