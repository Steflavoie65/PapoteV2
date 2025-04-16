import { doc, setDoc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs, serverTimestamp, collectionGroup, writeBatch, runTransaction } from 'firebase/firestore'; // Ajouter writeBatch et runTransaction
import { db } from '../firebase/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Sauvegarder le profil senior
export const saveSeniorProfile = async (seniorData) => {
  try {
    console.log('Sauvegarde profil senior:', seniorData);
    // Utiliser la collection 'users'
    const userRef = doc(db, 'users', seniorData.userId);
    // Assurer la cohérence des données sauvegardées
    const dataToSave = {
      ...seniorData,
      seniorCode: seniorData.seniorCode.trim().toUpperCase() // Assurer le format
    };
    await setDoc(userRef, dataToSave); // Sauvegarder directement dans le document utilisateur

    console.log('Profil senior sauvegardé dans Firestore (collection users):', dataToSave);
    // Vérification immédiate après sauvegarde
    const checkDoc = await getDoc(userRef);
    if (checkDoc.exists()) {
      console.log('Vérification post-sauvegarde OK:', checkDoc.data());
    } else {
      console.error('ERREUR: Document non trouvé immédiatement après sauvegarde!');
    }
    return { success: true };
  } catch (error) {
    console.error('Erreur sauvegarde Firestore:', error);
    return { success: false, error: error.message };
  }
};

// Sauvegarder le profil familial (MODIFIÉ)
export const saveFamilyProfile = async (familyData) => {
  try {
    console.log('Début sauvegarde profil famille:', familyData);

    if (!familyData || !familyData.id || !familyData.firstName || !familyData.familyName) {
      throw new Error('Données invalides pour la sauvegarde du profil');
    }

    const userId = familyData.id;
    // Structure simplifiée pour sauvegarde directe dans users/{userId}
    const profileToSave = {
      userId: familyData.id,
      firstName: familyData.firstName,
      familyName: familyData.familyName,
      familyCode: familyData.familyCode, // Ajout du champ familyCode
      userType: 'family',
      interfacePreference: 'standard', // Garder cette info si utile
      createdAt: serverTimestamp() // Utiliser serverTimestamp pour la création du doc principal
      // Ajouter d'autres champs si nécessaire
    };

    const userRef = doc(db, 'users', userId);

    // Sauvegarder directement dans le document utilisateur
    await setDoc(userRef, profileToSave);

    // Optionnel: Si les rôles sont toujours nécessaires séparément, on peut les garder
    // await setDoc(doc(userRef, 'roles', 'family'), { createdAt: new Date().toISOString() });

    console.log('Profil famille sauvegardé avec succès dans users/', userId);
    return { success: true };
  } catch (error) {
    console.error('Erreur détaillée sauvegarde famille:', error);
    return { success: false, error: error.message };
  }
};

// Sauvegarder une demande de connexion
export const saveConnectionRequest = async (request) => {
  try {
    // Ne pas recréer un nouvel objet ici, utiliser exactement ce qui est passé
    console.log('Enregistrement de la demande dans Firestore:', request);
    
    // IMPORTANT: s'assurer que l'objet request n'est pas modifié
    if (!request.familyId) {
      throw new Error('ID de famille manquant dans la demande');
    }
    
    // Vérifier si l'ID de famille existe déjà dans Firestore
    const familyRef = doc(db, 'families', request.familyId);
    const familySnap = await getDoc(familyRef);
    
    if (!familySnap.exists()) {
      console.warn('Attention: Famille non trouvée dans Firestore avec ID:', request.familyId);
    } else {
      console.log('Famille trouvée dans Firestore:', familySnap.data());
    }
    
    const requestRef = doc(collection(db, 'connectionRequests'));
    await setDoc(requestRef, {
      ...request, // Utiliser les données originales sans modification
      id: requestRef.id,
      status: 'pending',
      seen: false,
      createdAt: serverTimestamp(),
    });

    console.log('Demande enregistrée dans Firestore avec ID:', requestRef.id);
    return { success: true, id: requestRef.id };
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement de la demande:', error);
    return { success: false, error: error.message };
  }
};

// Récupérer les demandes par code senior
export const getRequestsBySeniorCode = async (seniorCode) => {
  try {
    if (!seniorCode) {
      console.log('Pas de code senior fourni, retourne une liste vide');
      return { success: true, requests: [] };
    }

    console.log('Recherche des demandes pour le code:', seniorCode);
    const q = query(
      collection(db, 'connectionRequests'),
      where('seniorCode', '==', seniorCode)
    );

    const querySnapshot = await getDocs(q);
    const requests = [];
    querySnapshot.forEach((doc) => {
      requests.push({ id: doc.id, ...doc.data() });
    });

    return { success: true, requests };
  } catch (error) {
    console.log('Erreur de récupération des demandes:', error);
    return { success: true, requests: [] }; // Retourner un succès avec liste vide
  }
};

// Accepter une demande de connexion (MODIFIÉ)
export const acceptConnectionRequest = async (requestId, seniorProfile) => {
  if (!requestId || !seniorProfile?.profile?.userId) {
      console.error("Données manquantes pour accepter la demande:", { requestId, seniorProfile });
      return { success: false, error: 'Données senior ou ID de demande manquants' };
  }

  const seniorId = seniorProfile.profile.userId;
  const requestRef = doc(db, 'connectionRequests', requestId);

  try {
    // Utiliser une date client pour les contacts dans les tableaux
    const clientTimestamp = new Date();

    await runTransaction(db, async (transaction) => {
      console.log('Début transaction acceptation pour demande:', requestId);

      // 1. Lire la demande
      const requestSnap = await transaction.get(requestRef);
      if (!requestSnap.exists()) {
        throw new Error('Demande de connexion non trouvée');
      }
      const requestData = requestSnap.data();
      const familyId = requestData.familyId;

      // 2. Lire le profil senior
      const seniorRef = doc(db, 'users', seniorId);
      const seniorSnap = await transaction.get(seniorRef);
      if (!seniorSnap.exists()) {
        throw new Error('Profil senior non trouvé');
      }
      const seniorData = seniorSnap.data();

      // 3. Lire le profil famille (maintenant directement depuis users/{familyId})
      const familyRef = doc(db, 'users', familyId);
      const familySnap = await transaction.get(familyRef);
      // On s'attend maintenant à le trouver ici
      if (!familySnap.exists()) {
         // Si toujours pas trouvé, c'est un problème plus profond (ex: famille supprimée?)
         console.error(`Profil famille non trouvé dans users/${familyId} lors de l'acceptation.`);
         throw new Error('Profil famille non trouvé');
      }
      const familyData = familySnap.data();

      // 4. Préparer les infos de contact avec date client
      const familyContactInfo = {
        familyId: familyId,
        familyName: requestData.familyName || "Famille",
        familyFirstName: requestData.familyFirstName || "",
        dateAdded: clientTimestamp // Utiliser date client
      };

      const seniorContactInfo = {
        seniorId: seniorId,
        firstName: seniorData.firstName,
        seniorCode: seniorData.seniorCode,
        dateAdded: clientTimestamp // Utiliser date client
      };

      // 5. Mettre à jour le profil senior
      const existingFamilyContacts = seniorData.familyContacts || [];
      if (!existingFamilyContacts.some(contact => contact.familyId === familyId)) {
        transaction.update(seniorRef, {
          familyContacts: [...existingFamilyContacts, familyContactInfo]
        });
        console.log('Contact famille ajouté au senior:', familyId);
        console.log('acceptConnectionRequest: Mise à jour du champ familyContacts pour le senior:', seniorId, 'avec les données:', familyContactInfo);
      } else {
        console.log('Contact famille déjà existant pour le senior:', familyId);
      }

      // 6. Mettre à jour le profil famille
      const existingSeniorContacts = familyData.seniorContacts || [];
      if (!existingSeniorContacts.some(contact => contact.seniorId === seniorId)) {
        transaction.update(familyRef, {
          seniorContacts: [...existingSeniorContacts, seniorContactInfo]
        });
        console.log('Contact senior ajouté à la famille:', seniorId);
        console.log('acceptConnectionRequest: Mise à jour du champ seniorContacts pour la famille:', familyId, 'avec les données:', seniorContactInfo);
      } else {
        console.log('Contact senior déjà existant pour la famille:', seniorId);
      }

      // 7. Supprimer la demande de connexion
      transaction.delete(requestRef);
      console.log('Demande de connexion supprimée:', requestId);
    });

    console.log('Transaction acceptation terminée avec succès pour demande:', requestId);
    return { success: true };

  } catch (error) {
    console.error('Erreur lors de l\'acceptation de la demande (transaction):', error);
    return { success: false, error: error.message };
  }
};

// Refuser une demande de connexion
export const rejectConnectionRequest = async (requestId) => {
  if (!requestId) {
    return { success: false, error: 'ID de demande manquant' };
  }
  try {
    const requestRef = doc(db, 'connectionRequests', requestId);
    await deleteDoc(requestRef);
    console.log('Demande de connexion refusée et supprimée:', requestId);
    return { success: true };
  } catch (error) {
    console.error('Erreur lors du refus de la demande:', error);
    return { success: false, error: error.message };
  }
};

// Récupérer les contacts familiaux d'un senior (MODIFIÉ)
export const getFamilyContacts = async (seniorId) => {
  try {
    if (!seniorId) {
      throw new Error('ID du senior manquant');
    }

    console.log('Récupération des contacts familiaux pour le senior ID:', seniorId);

    // Chercher dans la collection 'users'
    const seniorRef = doc(db, 'users', seniorId);
    const seniorSnap = await getDoc(seniorRef);

    if (!seniorSnap.exists()) {
      console.error('Profil senior non trouvé dans users pour getFamilyContacts:', seniorId);
      throw new Error('Profil senior non trouvé');
    }

    const seniorData = seniorSnap.data();
    console.log('getFamilyContacts: Lecture du document senior:', seniorSnap.data());
    // Accéder au tableau des contacts familiaux
    const familyContacts = seniorData.familyContacts || [];
    console.log('getFamilyContacts: Champ familyContacts:', familyContacts);

    console.log('Contacts familiaux récupérés:', familyContacts);
    return { success: true, familyContacts };
  } catch (error) {
    console.error('Erreur lors de la récupération des contacts familiaux:', error);
    return { success: false, error: error.message };
  }
};

// Récupérer les contacts senior d'une famille (VÉRIFICATION/CORRECTION)
export const getSeniorContacts = async (familyId) => {
  try {
    if (!familyId) {
      throw new Error('ID de la famille manquant');
    }

    console.log('Récupération des contacts seniors pour la famille ID:', familyId);

    // Chercher dans la collection 'users'
    const familyRef = doc(db, 'users', familyId);
    const familySnap = await getDoc(familyRef);

    if (!familySnap.exists()) {
       console.error('Profil famille non trouvé dans users pour getSeniorContacts:', familyId);
      throw new Error('Profil familial non trouvé');
    }

    const familyData = familySnap.data();
    // Accéder au tableau des contacts seniors
    const seniorContacts = familyData.seniorContacts || [];

    console.log('Contacts seniors récupérés:', seniorContacts);
    return { success: true, seniorContacts };
  } catch (error) {
    console.error('Erreur lors de la récupération des contacts seniors:', error);
    return { success: false, error: error.message };
  }
};

// Nouvelle fonction pour vérifier le profil local
export const checkLocalProfile = async () => {
  try {
    const storedProfile = await AsyncStorage.getItem('seniorProfile');
    if (storedProfile) {
      console.log('Profil trouvé dans AsyncStorage:', storedProfile);
      return { success: true, profile: JSON.parse(storedProfile) };
    }
    return { success: false, error: 'Aucun profil local trouvé' };
  } catch (error) {
    console.error('Erreur lors de la vérification du profil local:', error);
    return { success: false, error: error.message };
  }
};

// Modification de la fonction existante pour vérifier en local d'abord
export const getSeniorByCode = async (seniorCode) => {
  try {
    if (!seniorCode) {
      throw new Error('Code senior manquant');
    }
    console.log('Recherche du senior dans Firestore avec le code:', seniorCode);
    const q = query(
      collection(db, 'users'),
      where('seniorCode', '==', seniorCode)
    );
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return { success: false, error: 'Aucun senior trouvé avec ce code' };
    }
    const seniorData = querySnapshot.docs[0].data();
    return { success: true, senior: seniorData };
  } catch (error) {
    console.error('Erreur lors de la recherche du senior:', error);
    return { success: false, error: error.message };
  }
};

// Modification de checkSeniorProfile pour forcer la recherche dans Firestore uniquement
export const checkSeniorProfile = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const profileRef = collection(userRef, 'profile');
    const profileDoc = await getDoc(doc(profileRef, 'data'));
    if (profileDoc.exists()) {
      const profileData = profileDoc.data();
      return { success: true, profile: profileData };
    }
    return { success: false, error: 'Profile not found' };
  } catch (error) {
    console.error('Erreur lors de la vérification du profil:', error);
    return { success: false, error: error.message };
  }
};

export const sendConnectionRequest = async (requestData) => {
  try {
    console.log('=== DÉBUT RECHERCHE SENIOR ===');
    const codeToSearch = requestData.seniorCode.trim().toUpperCase();
    console.log('Code recherché (formaté):', `"${codeToSearch}"`);

    // Chercher dans la collection 'users' directement car saveSeniorProfile sauvegarde à la racine du document
    const usersRef = collection(db, 'users');
    console.log('Chemin collection:', usersRef.path);

    const q = query(usersRef,
      where('seniorCode', '==', codeToSearch),
      where('userType', '==', 'senior') // Ajouter ce filtre pour être sûr
    );
    console.log('Exécution de la requête Firestore...');

    const querySnapshot = await getDocs(q);

    console.log('Résultats trouvés:', querySnapshot.size);
    querySnapshot.forEach(doc => {
      console.log('Document ID:', doc.id);
      console.log('Document Data:', doc.data());
    });

    if (querySnapshot.empty) {
      console.log('=== AUCUN SENIOR TROUVÉ ===');
      return { success: false, error: 'Senior non trouvé avec ce code' };
    }

    const seniorDoc = querySnapshot.docs[0];
    const seniorData = seniorDoc.data();

    // Vérifier le prénom
    if (seniorData.firstName.toLowerCase() !== requestData.seniorName.toLowerCase()) {
      return { success: false, error: 'Le prénom ne correspond pas' };
    }

    // Créer la demande
    const requestRef = doc(collection(db, 'connectionRequests'));
    const request = {
      id: requestRef.id,
      seniorId: seniorData.userId, // Utiliser l'userId du document trouvé
      seniorCode: seniorData.seniorCode,
      seniorName: seniorData.firstName, // Utiliser le prénom du document trouvé
      familyId: requestData.familyId,
      familyName: requestData.familyName,
      familyFirstName: requestData.familyFirstName,
      message: requestData.message,
      status: 'pending',
      createdAt: serverTimestamp()
    };

    await setDoc(requestRef, request);
    console.log('Demande créée avec succès');

    // -> Sauvegarder la demande en local pour affichage "en attente"
    const pendingRequests = JSON.parse(await AsyncStorage.getItem('pendingRequests') || '[]');
    pendingRequests.push({
      id: request.id, // ID de la demande Firestore
      seniorName: request.seniorName, // Nom du senior
      status: 'pending', // Statut
      createdAt: new Date().toISOString() // Date de création locale
    });
    await AsyncStorage.setItem('pendingRequests', JSON.stringify(pendingRequests));
    console.log('Demande sauvegardée localement dans pendingRequests'); // Log de confirmation

    return { success: true, requestId: request.id };
  } catch (error) {
    console.error('=== ERREUR DÉTAILLÉE ===', error);
    return { success: false, error: 'Erreur lors de l\'envoi de la demande' };
  }
};

export const deleteFamilyAccount = async (familyId) => {
  try {
    // 1. Trouver tous les seniors qui ont cette famille dans leurs contacts
    const seniorsRef = collection(db, 'users');
    const seniorsSnapshot = await getDocs(seniorsRef);
    const seniorsToUpdate = [];

    seniorsSnapshot.forEach(doc => {
      const seniorData = doc.data();
      if (seniorData.familyContacts?.some(contact => contact.familyId === familyId)) {
        seniorsToUpdate.push({
          id: doc.id,
          familyContacts: seniorData.familyContacts
        });
      }
    });

    // 2. Transaction pour tout mettre à jour en même temps
    await runTransaction(db, async (transaction) => {
      // Mettre à jour chaque senior
      for (const senior of seniorsToUpdate) {
        const seniorRef = doc(db, 'users', senior.id);
        const updatedContacts = senior.familyContacts.filter(
          contact => contact.familyId !== familyId
        );
        transaction.update(seniorRef, { familyContacts: updatedContacts });
      }

      // Supprimer le compte famille
      const familyRef = doc(db, 'users', familyId);
      transaction.delete(familyRef);
    });

    return { success: true };
  } catch (error) {
    console.error('Erreur suppression compte famille:', error);
    return { success: false, error: error.message };
  }
};

export const deleteSeniorAccount = async (seniorId) => {
  try {
    // 1. Trouver toutes les familles qui ont ce senior dans leurs contacts
    const usersRef = collection(db, 'users');
    const familyQuery = query(usersRef, where('userType', '==', 'family'));
    const familiesSnapshot = await getDocs(familyQuery);
    const familiesToUpdate = [];

    familiesSnapshot.forEach(doc => {
      const familyData = doc.data();
      if (familyData.seniorContacts && familyData.seniorContacts.some(contact => contact.seniorId === seniorId)) {
        familiesToUpdate.push({
          id: doc.id,
          data: familyData
        });
      }
    });

    // 2. Transaction pour tout mettre à jour
    await runTransaction(db, async (transaction) => {
      // Mettre à jour chaque famille
      for (const family of familiesToUpdate) {
        const familyRef = doc(db, 'users', family.id);
        const updatedContacts = family.data.seniorContacts.filter(
          contact => contact.seniorId !== seniorId
        );
        transaction.update(familyRef, { seniorContacts: updatedContacts });
        console.log(`Suppression de la référence senior ${seniorId} pour la famille ${family.id}`);
      }

      // Supprimer les demandes de connexion
      const requestsRef = collection(db, 'connectionRequests');
      const requestsQuery = query(requestsRef, where('seniorId', '==', seniorId));
      const requestsSnapshot = await getDocs(requestsQuery);
      requestsSnapshot.forEach(request => {
        transaction.delete(doc(requestsRef, request.id));
      });

      // Supprimer le compte senior
      const seniorRef = doc(db, 'users', seniorId);
      transaction.delete(seniorRef);
    });

    console.log(`Compte senior ${seniorId} supprimé avec succès`);
    return { success: true };
  } catch (error) {
    console.error('Erreur suppression compte senior:', error);
    return { success: false, error: error.message };
  }
};
