import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
// Remplacer l'importation de expo-sharing par une solution alternative
// import * as Sharing from 'expo-sharing';

// Exporter toutes les données de l'application
export const exportAppData = async () => {
  try {
    // Récupérer toutes les données pertinentes
    const seniors = await AsyncStorage.getItem('papote_seniors');
    const requests = await AsyncStorage.getItem('papote_connection_requests');
    const connections = await AsyncStorage.getItem('papote_connections');
    const profile = await AsyncStorage.getItem('seniorProfile');
    
    // Créer un objet avec toutes les données
    const appData = {
      version: 1,
      timestamp: new Date().toISOString(),
      data: {
        seniors: seniors ? JSON.parse(seniors) : [],
        requests: requests ? JSON.parse(requests) : [],
        connections: connections ? JSON.parse(connections) : [],
        profile: profile ? JSON.parse(profile) : null
      }
    };
    
    // Convertir en JSON
    const appDataJson = JSON.stringify(appData, null, 2);
    
    // Sauvegarder dans un fichier temporaire
    const filePath = `${FileSystem.cacheDirectory}papote_data.json`;
    await FileSystem.writeAsStringAsync(filePath, appDataJson);
    
    // Au lieu de partager le fichier, simplement afficher les données pour le debug
    console.log('Données exportées:', appDataJson);
    return { 
      success: true, 
      message: 'Données exportées dans la console', 
      data: appData 
    };
    
    /* Désactivé jusqu'à ce que expo-sharing soit installé
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'application/json',
        dialogTitle: 'Exporter les données Papote',
        UTI: 'public.json'
      });
      return { success: true };
    } else {
      return { success: false, error: 'Le partage n\'est pas disponible sur cet appareil' };
    }
    */
  } catch (error) {
    console.error('Erreur lors de l\'exportation des données:', error);
    return { success: false, error: error.message };
  }
};

// Créer un QR code contenant les données essentielles
export const createDataQRCode = async (data) => {
  try {
    // Cette fonction nécessiterait une bibliothèque de génération de QR code
    // Pour l'instant, nous retournons simplement les données formatées
    return { 
      success: true, 
      data: JSON.stringify(data)
    };
  } catch (error) {
    console.error('Erreur lors de la création du QR code:', error);
    return { success: false, error: error.message };
  }
};
