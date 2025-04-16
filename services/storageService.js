import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImageManipulator from 'expo-image-manipulator';

const CHUNK_SIZE = 900000; // ~900KB par chunk

// Service de stockage local utilisant AsyncStorage au lieu de Firebase
export const storeUserType = async (userType) => {
  try {
    await AsyncStorage.setItem('userType', userType);
    return { success: true };
  } catch (error) {
    console.error('Error storing user type:', error);
    return { success: false, error };
  }
};

export const getUserType = async () => {
  try {
    const userType = await AsyncStorage.getItem('userType');
    return { success: true, userType };
  } catch (error) {
    console.error('Error getting user type:', error);
    return { success: false, error };
  }
};

// Pour les seniors
export const storeSeniorData = async (seniorData) => {
  try {
    await AsyncStorage.setItem('seniorData', JSON.stringify(seniorData));
    return { success: true };
  } catch (error) {
    console.error('Error storing senior data:', error);
    return { success: false, error };
  }
};

export const getSeniorData = async () => {
  try {
    const seniorData = await AsyncStorage.getItem('seniorData');
    return { success: true, seniorData: seniorData ? JSON.parse(seniorData) : null };
  } catch (error) {
    console.error('Error getting senior data:', error);
    return { success: false, error };
  }
};

// Pour les familles
export const storeFamilyData = async (familyData) => {
  try {
    await AsyncStorage.setItem('familyData', JSON.stringify(familyData));
    return { success: true };
  } catch (error) {
    console.error('Error storing family data:', error);
    return { success: false, error };
  }
};

export const getFamilyData = async () => {
  try {
    const familyData = await AsyncStorage.getItem('familyData');
    return { success: true, familyData: familyData ? JSON.parse(familyData) : null };
  } catch (error) {
    console.error('Error getting family data:', error);
    return { success: false, error };
  }
};

// Enregistrer une demande de connexion
export const saveConnectionRequest = async (request) => {
  try {
    // Obtenir les demandes existantes
    const existingRequestsJson = await AsyncStorage.getItem('connectionRequests');
    const existingRequests = existingRequestsJson ? JSON.parse(existingRequestsJson) : [];
    
    // Ajouter la nouvelle demande avec ID unique et timestamp
    const newRequest = {
      ...request,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    
    // Sauvegarder la liste mise à jour
    await AsyncStorage.setItem('connectionRequests', JSON.stringify([...existingRequests, newRequest]));
    
    console.log('Demande sauvegardée:', newRequest);
    return { success: true, request: newRequest };
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la demande:', error);
    return { success: false, error };
  }
};

// Obtenir toutes les demandes de connexion
export const getConnectionRequests = async () => {
  try {
    const requestsJson = await AsyncStorage.getItem('connectionRequests');
    const requests = requestsJson ? JSON.parse(requestsJson) : [];
    return { success: true, requests };
  } catch (error) {
    console.error('Erreur lors de la récupération des demandes:', error);
    return { success: false, error };
  }
};

// Obtenir les demandes pour un code senior spécifique
export const getRequestsBySeniorCode = async (seniorCode) => {
  try {
    const { success, requests } = await getConnectionRequests();
    
    if (!success) {
      throw new Error('Impossible de récupérer les demandes');
    }
    
    const filteredRequests = requests.filter(req => req.seniorCode === seniorCode);
    return { success: true, requests: filteredRequests };
  } catch (error) {
    console.error('Erreur lors de la récupération des demandes pour le senior:', error);
    return { success: false, error };
  }
};

// Sauvegarder le profil senior
export const saveSeniorProfile = async (profile) => {
  try {
    await AsyncStorage.setItem('seniorProfile', JSON.stringify(profile));
    return { success: true };
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du profil senior:', error);
    return { success: false, error };
  }
};

// Récupérer le profil senior
export const getSeniorProfile = async () => {
  try {
    const profileJson = await AsyncStorage.getItem('seniorProfile');
    const profile = profileJson ? JSON.parse(profileJson) : null;
    return { success: true, profile };
  } catch (error) {
    console.error('Erreur lors de la récupération du profil senior:', error);
    return { success: false, error };
  }
};

// Upload image en base64
export const uploadImage = async (uri) => {
  try {
    // Compresser l'image d'abord
    const compressed = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 800 } }],
      { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
    );

    const imageResponse = await fetch(compressed.uri);
    const blob = await imageResponse.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve({ success: true, url: reader.result });
      };
      reader.onerror = () => {
        reject({ success: false, error: 'Erreur conversion base64' });
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Erreur upload image:', error);
    return { success: false, error: error.message };
  }
};

export const compressAndStoreImage = async (uri) => {
  try {
    // Compresser l'image
    const compressed = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1024 } }],
      { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
    );

    const response = await fetch(compressed.uri);
    const blob = await response.blob();
    const base64data = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });

    // Stocker en chunks si nécessaire
    const imageId = `local-image-${Date.now()}`;
    if (base64data.length > CHUNK_SIZE) {
      const chunks = Math.ceil(base64data.length / CHUNK_SIZE);
      for (let i = 0; i < chunks; i++) {
        await AsyncStorage.setItem(
          `${imageId}_chunk_${i}`,
          base64data.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
        );
      }
      await AsyncStorage.setItem(`${imageId}_info`, JSON.stringify({ chunks }));
    } else {
      await AsyncStorage.setItem(imageId, base64data);
    }
    return { success: true, imageId: `local://${imageId}` };
  } catch (error) {
    console.error('Error in compressAndStoreImage:', error);
    return { success: false, error: error.message };
  }
};

export const getLocalImage = async (localUri) => {
  try {
    const imageId = localUri.replace('local://', '');
    const info = await AsyncStorage.getItem(`${imageId}_info`);
    
    if (info) {
      // Image en chunks
      const { chunks } = JSON.parse(info);
      let fullImage = '';
      for (let i = 0; i < chunks; i++) {
        const chunk = await AsyncStorage.getItem(`${imageId}_chunk_${i}`);
        if (chunk) fullImage += chunk;
      }
      return fullImage;
    }
    return await AsyncStorage.getItem(imageId);
  } catch (error) {
    console.error('Error getting local image:', error);
    return null;
  }
};
