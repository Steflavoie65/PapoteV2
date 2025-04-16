import { auth } from '../firebase/config';
import { signInWithEmailAndPassword, signOut, signInAnonymously } from 'firebase/auth';

// Version simplifiée sans dépendance Firebase

export const login = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    return { success: false, error: error.message };
  }
};

export const registerWithEmail = async (email, password) => {
  try {
    console.log(`Tentative d'inscription avec: ${email}`);
    // Simuler une inscription réussie
    return { 
      success: true, 
      user: { 
        uid: 'newUser123', 
        email: email 
      } 
    };
  } catch (error) {
    console.error("Erreur d'inscription:", error.message);
    return { success: false, error: "Erreur d'inscription" };
  }
};

// Observateur factice pour les changements d'état d'authentification
export const subscribeToAuthChanges = (callback) => {
  // Simuler un utilisateur non connecté
  callback(null);
  
  // Renvoyer une fonction de nettoyage
  return () => console.log('Auth subscription cleaned up');
};

export const logout = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error);
    return { success: false, error: error.message };
  }
};

export const ensureAuthenticated = async () => {
  try {
    if (!auth.currentUser) {
      console.log('Aucun utilisateur connecté. Connexion anonyme...');
      await signInAnonymously(auth);
      console.log('Utilisateur connecté anonymement:', auth.currentUser.uid);
    }
    return { success: true, user: auth.currentUser };
  } catch (error) {
    console.error('Erreur lors de l\'authentification:', error);
    return { success: false, error: error.message };
  }
};
