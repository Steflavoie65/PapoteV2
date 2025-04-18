import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

let firebaseInstance = null;
let authInstance = null;

class Firebase {
  constructor() {
    if (firebaseInstance) {
      return firebaseInstance;
    }

    const firebaseConfig = {
      apiKey: "AIzaSyAWLYrVlQl8Sxlz9Z3XmoXiXE0N70HvEFo",
      authDomain: "papote-boutonal.firebaseapp.com",
      projectId: "papote-boutonal",
      storageBucket: "papote-boutonal.appspot.com",
      messagingSenderId: "357986409441",
      appId: "1:357986409441:web:e16415319a25cd463baa22"
    };

    // Initialize Firebase only if no apps exist
    if (getApps().length === 0) {
      console.log("Creating new Firebase app instance");
      this.app = initializeApp(firebaseConfig);
      
      // Initialize Auth with AsyncStorage persistence
      try {
        console.log("Initializing Auth with AsyncStorage persistence");
        authInstance = initializeAuth(this.app, {
          persistence: getReactNativePersistence(AsyncStorage)
        });
      } catch (error) {
        if (error.code !== 'auth/already-initialized') {
          console.error("Auth initialization error:", error);
        }
        // If auth is already initialized, get the existing instance
        authInstance = getAuth(this.app);
      }
    } else {
      console.log("Reusing existing Firebase app instance");
      this.app = getApps()[0];
      authInstance = getAuth(this.app);
    }

    this.auth = authInstance;
    this.db = getFirestore(this.app);
    this.storage = getStorage(this.app);

    firebaseInstance = this;
    console.log("Firebase initialisé avec succès. Projet:", firebaseConfig.projectId);

    return firebaseInstance;
  }

  // Static method to get the instance
  static getInstance() {
    if (!firebaseInstance) {
      firebaseInstance = new Firebase();
    }
    return firebaseInstance;
  }
}

export default Firebase;
