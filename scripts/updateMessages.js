const admin = require('firebase-admin');

// Initialiser Firebase Admin SDK avec le fichier de clé de service
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const updateMessages = async () => {
  const messagesRef = db.collection('messages'); // Remplacez par le chemin correct
  const snapshot = await messagesRef.get();

  snapshot.forEach(async (doc) => {
    const data = doc.data();
    if (!data.timestamp) {
      console.log(`Message sans timestamp trouvé : ${doc.id}`);
      await doc.ref.update({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`Timestamp ajouté au message : ${doc.id}`);
    }
  });

  console.log('Mise à jour terminée.');
};

updateMessages().catch((error) => {
  console.error('Erreur lors de la mise à jour des messages :', error);
});
