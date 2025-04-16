import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Sharing from 'expo-sharing';

export const processImage = async (uri) => {
  try {
    // Compresser plus agressivement
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 800 } }],
      {
        compress: 0.3, // Compression plus agressive
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true
      }
    );

    const base64Image = `data:image/jpeg;base64,${manipResult.base64}`;
    
    // Vérifier la taille
    if (base64Image.length > 900000) {
      throw new Error('Image trop grande après compression');
    }

    return {
      success: true,
      base64: base64Image
    };
  } catch (error) {
    console.error('Erreur traitement image:', error);
    return { success: false, error: error.message };
  }
};

export const handleImageAction = async (base64Image) => {
  try {
    // Créer un fichier temporaire pour le partage
    const tempFile = `${FileSystem.cacheDirectory}temp_${Date.now()}.jpg`;
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    
    await FileSystem.writeAsStringAsync(tempFile, base64Data, {
      encoding: FileSystem.EncodingType.Base64
    });

    // Ouvrir le menu de partage
    await Sharing.shareAsync(tempFile, {
      mimeType: 'image/jpeg',
      dialogTitle: 'Enregistrer ou partager l\'image'
    });

    // Nettoyer
    await FileSystem.deleteAsync(tempFile, { idempotent: true });
    
    return { success: true };
  } catch (error) {
    console.error('Erreur de partage:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
};
