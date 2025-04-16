import { sendConnectionRequest } from '../services/firestoreService';

const handleSendRequest = async () => {
  const request = {
    seniorCode: 'SR-BBXDT', // Code du senior
    familyId: 'family-12345', // ID de la famille
    familyName: 'Famille Test', // Nom de la famille
    seniorNameGuess: 'Roland', // Nom supposé du senior
  };

  const result = await sendConnectionRequest(request);

  if (result.success) {
    console.log('Demande envoyée avec succès:', result.id);
  } else {
    console.error('Erreur lors de l\'envoi de la demande:', result.error);
  }
};
