import AsyncStorage from '@react-native-async-storage/async-storage';

export const getItemWithLogging = async (key) => {
  console.log(`Tentative de récupération de la clé AsyncStorage: ${key}`);
  const value = await AsyncStorage.getItem(key);
  console.log(`Valeur récupérée pour la clé ${key}:`, value);
  return value;
};
