import AsyncStorage from '@react-native-async-storage/async-storage';

export const debugAsyncStorage = async () => {
  try {
    // Lister toutes les clés
    const allKeys = await AsyncStorage.getAllKeys();
    console.log('Toutes les clés dans AsyncStorage:', allKeys);
    
    // Afficher le contenu de chaque clé
    for (const key of allKeys) {
      const value = await AsyncStorage.getItem(key);
      console.log(`Clé: ${key}, Valeur:`, value);
    }
    
    // Vérifier spécifiquement la clé des demandes
    const requestsKey = 'papote_connection_requests';
    const requests = await AsyncStorage.getItem(requestsKey);
    console.log(`Contenu spécifique de ${requestsKey}:`, requests);
    
    return {
      success: true,
      keys: allKeys,
      requestsData: requests
    };
  } catch (error) {
    console.error('Erreur lors du débogage d\'AsyncStorage:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export const resetAsyncStorage = async () => {
  try {
    await AsyncStorage.clear();
    console.log('AsyncStorage a été complètement réinitialisé');
    return { success: true };
  } catch (error) {
    console.error('Erreur lors de la réinitialisation d\'AsyncStorage:', error);
    return { success: false, error: error.message };
  }
};
