import { db } from '../firebase';
import { 
  doc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  collection, 
  query, 
  where 
} from 'firebase/firestore';

// Service de gestion des utilisateurs

// Récupérer un profil utilisateur par ID
export const getUserProfile = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      return { success: false, error: "Utilisateur non trouvé" };
    }
    
    return { 
      success: true, 
      user: {
        id: userDoc.id,
        ...userDoc.data()
      }
    };
  } catch (error) {
    console.error("Erreur de récupération du profil:", error);
    return { success: false, error: error.message };
  }
};

// Récupérer les détails du profil senior
export const getSeniorProfile = async (userId) => {
  try {
    // Récupérer les données de base de l'utilisateur
    const userResult = await getUserProfile(userId);
    
    if (!userResult.success) {
      return userResult;
    }
    
    // Récupérer les données spécifiques du senior
    const seniorDoc = await getDoc(doc(db, 'seniors', userId));
    
    if (!seniorDoc.exists()) {
      return { success: false, error: "Profil senior non trouvé" };
    }
    
    return { 
      success: true, 
      senior: {
        ...userResult.user,
        ...seniorDoc.data()
      }
    };
  } catch (error) {
    console.error("Erreur de récupération du profil senior:", error);
    return { success: false, error: error.message };
  }
};

// Mettre à jour un profil utilisateur
export const updateUserProfile = async (userId, userData) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, userData);
    
    // Si c'est un senior, mettre à jour son profil senior également
    const userDoc = await getDoc(userRef);
    if (userDoc.exists() && userDoc.data().userType === 'senior') {
      // Ne mettre à jour que les champs pertinents comme firstName
      const seniorRef = doc(db, 'seniors', userId);
      if (userData.firstName) {
        await updateDoc(seniorRef, {
          firstName: userData.firstName
        });
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error("Erreur de mise à jour du profil:", error);
    return { success: false, error: error.message };
  }
};

// Rechercher un senior par code
export const findSeniorByCode = async (code) => {
  try {
    const seniorsRef = collection(db, 'seniors');
    const q = query(seniorsRef, where("code", "==", code));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return { success: false, error: "Senior non trouvé" };
    }
    
    const seniorDoc = querySnapshot.docs[0];
    const seniorId = seniorDoc.id;
    
    // Récupérer les informations utilisateur associées
    const userDoc = await getDoc(doc(db, 'users', seniorId));
    
    if (!userDoc.exists()) {
      return { success: false, error: "Utilisateur non trouvé" };
    }
    
    return { 
      success: true, 
      senior: {
        id: seniorDoc.id,
        ...seniorDoc.data(),
        ...userDoc.data()
      } 
    };
  } catch (error) {
    console.error("Erreur de recherche du senior:", error);
    return { success: false, error: error.message };
  }
};
