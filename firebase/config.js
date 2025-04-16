import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBk3ogoJUb6YEbEPkv7GFXz_TAyVvDes",
  authDomain: "papote-31323.firebaseapp.com",
  projectId: "papote-31323",
  storageBucket: "papote-31323.firebasestorage.app",  // URL corrigée pour Firebase Storage
  messagingSenderId: "124029227093",
  appId: "1:124029227093:web:d4054acf95deb667f9c4dc",
  measurementId: "G-RJQF4CQ4NW"
};

// Vérifiez si une instance Firebase existe déjà
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
export const storage = getStorage(app);

// Ajouter un log pour déboguer
console.log('Firebase Storage initialized with bucket:', storage.app.options.storageBucket);

export { app };

// Fonction pour notifier l'autre appareil (simulation)
export const notifyDevice = async (targetCode, message) => {
  console.log(`Notification pour ${targetCode}: ${message}`);
  
  try {
    const notificationsJson = await AsyncStorage.getItem('papote_notifications');
    const notifications = notificationsJson ? JSON.parse(notificationsJson) : [];
    
    notifications.push({
      id: Date.now().toString(),
      targetCode,
      message,
      createdAt: new Date().toISOString(),
      read: false
    });
    
    await AsyncStorage.setItem('papote_notifications', JSON.stringify(notifications));
  } catch (error) {
    console.error('Erreur de notification:', error);
  }
};
