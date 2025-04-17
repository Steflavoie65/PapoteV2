// Importer depuis notre fichier centralisé pour éviter les multiples initialisations
import { app, auth, db, notifyDevice } from '../utils/Firebase';

// Re-exporter pour maintenir la compatibilité
export { app, auth, db, notifyDevice };

// Fonctions utilitaires Firebase (réutilisons les existantes)
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
    // Mise à jour pour utiliser l'API moderne de Firestore
    await db.collection('users').doc(userId).set({
      firstName,
      lastName: '',
      userType: 'senior',
      phoneNumber: '',
      email: '',
      createdAt: new Date()
    });
    
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
