// Single Firebase instance for the entire application
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Firebase config - use the same values as in your firebase/config.js
const firebaseConfig = {
  apiKey: "AIzaSyBk3ogoJUb6YEbEPkv7GFXz_TAyVvDes",
  authDomain: "papote-31323.firebaseapp.com",
  projectId: "papote-31323",
  storageBucket: "papote-31323.firebasestorage.app",
  messagingSenderId: "124029227093",
  appId: "1:124029227093:web:d4054acf95deb667f9c4dc",
  measurementId: "G-RJQF4CQ4NW"
};

// Initialize Firebase ONLY if no apps exist
let firebaseApp;
if (getApps().length === 0) {
  console.log('Creating new Firebase app instance');
  firebaseApp = initializeApp(firebaseConfig);
} else {
  console.log('Reusing existing Firebase app instance');
  firebaseApp = getApps()[0];
}

// Initialize Auth with AsyncStorage - version simplifiée mais sûre
console.log('Initializing Auth with AsyncStorage persistence');
const firebaseAuth = initializeAuth(firebaseApp, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Initialize Firestore and Storage
const firestore = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);

console.log('Firebase utils initialized successfully');

// Export everything needed
export { firebaseApp as app, firebaseAuth as auth, firestore as db, storage };

// Helper functions (add your notifyDevice function here)
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