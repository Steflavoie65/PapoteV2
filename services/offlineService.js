import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

/**
 * Vérifie si l'application est actuellement en mode hors ligne
 * @returns {Promise<boolean>} - True si en mode hors ligne
 */
export const isOfflineMode = async () => {
  try {
    // Vérifier le stockage local d'abord
    const offlineMode = await AsyncStorage.getItem('offline_mode');
    if (offlineMode === 'true') return true;
    
    // Puis vérifier la connectivité réseau
    const netInfo = await NetInfo.fetch();
    return !netInfo.isConnected;
  } catch (error) {
    console.warn('[AVERTISSEMENT] Erreur vérification mode hors ligne:', error);
    return false;
  }
};

/**
 * Récupère des données locales pour utilisation hors ligne
 * @param {string} key - Clé de stockage
 * @param {any} defaultValue - Valeur par défaut si rien n'est trouvé
 * @returns {Promise<any>} - Données récupérées
 */
export const getOfflineData = async (key, defaultValue = null) => {
  try {
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (error) {
    console.error('[ERREUR] Récupération données hors ligne:', error);
    return defaultValue;
  }
};

/**
 * Stocke des données pour utilisation hors ligne
 * @param {string} key - Clé de stockage
 * @param {any} data - Données à stocker
 * @returns {Promise<boolean>} - Succès du stockage
 */
export const storeOfflineData = async (key, data) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('[ERREUR] Stockage données hors ligne:', error);
    return false;
  }
};

/**
 * Synchronise les opérations en attente avec Firestore lorsque la connexion est rétablie
 * @returns {Promise<boolean>} - Succès de la synchronisation
 */
export const syncPendingOperations = async () => {
  try {
    // Vérifier si l'appareil est en ligne
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) return false;
    
    // Récupérer la liste des opérations en attente
    const pendingOps = await getOfflineData('pendingFirestoreOps', []);
    if (pendingOps.length === 0) return true;
    
    console.log(`[INFO] Tentative de synchronisation de ${pendingOps.length} opérations en attente`);
    
    // Mettre à jour le statut hors ligne
    await AsyncStorage.setItem('offline_mode', 'false');
    
    // Vider la liste des opérations en attente
    await AsyncStorage.removeItem('pendingFirestoreOps');
    
    return true;
  } catch (error) {
    console.error('[ERREUR] Synchronisation des opérations en attente:', error);
    return false;
  }
};

/**
 * Enregistre une opération pour synchronisation ultérieure
 * @param {Object} operation - Opération à enregistrer
 * @returns {Promise<boolean>} - Succès de l'enregistrement
 */
export const queuePendingOperation = async (operation) => {
  try {
    const pendingOps = await getOfflineData('pendingFirestoreOps', []);
    pendingOps.push({
      ...operation,
      timestamp: Date.now()
    });
    await storeOfflineData('pendingFirestoreOps', pendingOps);
    return true;
  } catch (error) {
    console.error('[ERREUR] Enregistrement opération en attente:', error);
    return false;
  }
};
