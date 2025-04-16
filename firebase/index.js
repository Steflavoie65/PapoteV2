import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Configuration Firebase simplifiée pour démarrer
const firebaseConfig = {
  apiKey: "AIzaSyBk3ogoJUb6YEbEPkvNv7GFXz_TAyVvDes",
  authDomain: "papote-31323.firebaseapp.com",
  projectId: "papote-31323",
  storageBucket: "papote-31323.firebasestorage.app",
  messagingSenderId: "124029227093",
  appId: "1:124029227093:web:d4054acf95deb667f9c4dc",
  measurementId: "G-RJQF4CQ4NW"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);

// Obtenir les instances des services Firebase
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };

// Fonctions utilitaires pour Firebase

// Exemple de fonction d'authentification par téléphone
export const signInWithPhoneNumber = async (phoneNumber) => {
  try {
    const confirmation = await auth.signInWithPhoneNumber(phoneNumber);
    return { success: true, confirmation };
  } catch (error) {
    console.error("Erreur lors de l'authentification par téléphone:", error);
    return { success: false, error };
  }
};

// Exemple de fonction pour créer un utilisateur senior
export const createSeniorProfile = async (userId, firstName, code) => {
  try {
    // Créer le document dans la collection users
    await db.collection('users').doc(userId).set({
      firstName,
      lastName: '',
      userType: 'senior',
      phoneNumber: '',
      email: '',
      createdAt: new Date()
    });
    
    // Créer le document dans la collection seniors
    await db.collection('seniors').doc(userId).set({
      firstName,
      code,
      createdAt: new Date()
    });
    
    return { success: true };
  } catch (error) {
    console.error("Erreur lors de la création du profil senior:", error);
    return { success: false, error };
  }
};

// Exemple de fonction pour créer une demande de connexion
export const createConnectionRequest = async (seniorCode, familyId, familyName, seniorNameGuess) => {
  try {
    await db.collection('connectionRequests').add({
      seniorCode,
      familyId,
      familyName,
      seniorNameGuess,
      status: 'pending',
      seen: false,
      createdAt: new Date()
    });
    
    return { success: true };
  } catch (error) {
    console.error("Erreur lors de la création de la demande de connexion:", error);
    return { success: false, error };
  }
};

// Exemple de fonction pour créer un profil famille
export const createFamilyProfile = async (userId, firstName, familyName, familyCode) => {
  try {
    // Créer le document dans la collection users
    await db.collection('users').doc(userId).set({
      firstName,
      familyName,
      familyCode,
      userType: 'family',
      createdAt: new Date()
    });

    return { success: true };
  } catch (error) {
    console.error("Erreur lors de la création du profil famille:", error);
    return { success: false, error };
  }
};
