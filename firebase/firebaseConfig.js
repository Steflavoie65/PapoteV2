import {
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID
} from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuration par défaut à utiliser si .env n'est pas disponible
export const defaultFirebaseConfig = {
  apiKey: "AIzaSyAWLYrVlQl8Sxlz9Z3XmoXiXE0N70HvEFo",
  authDomain: "papote-boutonal.firebaseapp.com",
  projectId: "papote-boutonal",
  storageBucket: "papote-boutonal.appspot.com",
  messagingSenderId: "357986409441",
  appId: "1:357986409441:web:e16415319a25cd463baa22"
};

// Charger la configuration Firebase
export const loadFirebaseConfig = async () => {
  // Essayer d'abord de charger depuis les variables d'environnement
  let firebaseConfig = {
    apiKey: FIREBASE_API_KEY,
    authDomain: FIREBASE_AUTH_DOMAIN,
    projectId: FIREBASE_PROJECT_ID,
    storageBucket: FIREBASE_STORAGE_BUCKET,
    messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
    appId: FIREBASE_APP_ID
  };

  // Vérifier si la configuration est valide (projectId est obligatoire)
  const isConfigValid = !!firebaseConfig.projectId;

  if (!isConfigValid) {
    console.warn("Configuration Firebase incomplète dans les variables d'environnement");
    
    try {
      // Tenter de charger depuis le stockage local
      const savedConfig = await AsyncStorage.getItem('firebase_config');
      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig);
        if (parsedConfig.projectId) {
          console.log("Configuration Firebase chargée depuis le stockage local");
          firebaseConfig = parsedConfig;
        }
      } else {
        // Si pas de config dans le stockage local, utiliser la config par défaut
        firebaseConfig = defaultFirebaseConfig;
        console.log("Utilisation de la configuration Firebase par défaut");
      }
    } catch (error) {
      console.error("Erreur lors de la récupération de la configuration Firebase:", error);
      // Utiliser la configuration par défaut en cas d'erreur
      firebaseConfig = defaultFirebaseConfig;
    }
  } else {
    // Sauvegarder la configuration valide pour une utilisation hors ligne
    try {
      await AsyncStorage.setItem('firebase_config', JSON.stringify(firebaseConfig));
    } catch (error) {
      console.warn("Impossible de sauvegarder la configuration Firebase:", error);
    }
  }

  return firebaseConfig;
};
