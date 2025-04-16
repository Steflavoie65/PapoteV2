const admin = require('firebase-admin');

// Initialiser Firebase Admin SDK avec le fichier de clé de service
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const fixMessages = async () => {
  const messagesRef = db.collection('messages'); // Remplacez par le chemin correct
  const snapshot = await messagesRef.get();

  snapshot.forEach(async (doc) => {
    const data = doc.data();
    let updatedData = {};

    // Ajouter un timestamp si manquant
    if (!data.timestamp) {
      console.log(`Message sans timestamp trouvé : ${doc.id}`);
      updatedData.timestamp = admin.firestore.FieldValue.serverTimestamp();
    }

    // Vérifier et corriger les URI
    if (data.content && typeof data.content === 'string' && data.content.startsWith('local://')) {
      console.log(`Message avec URI non prise en charge : ${doc.id}`);
      updatedData.content = null; // Remplacez par une valeur par défaut si nécessaire
    }

    if (Object.keys(updatedData).length > 0) {
      await doc.ref.update(updatedData);
      console.log(`Message mis à jour : ${doc.id}`);
    }
  });

  console.log('Mise à jour terminée.');
};

fixMessages().catch((error) => {
  console.error('Erreur lors de la mise à jour des messages :', error);
});
