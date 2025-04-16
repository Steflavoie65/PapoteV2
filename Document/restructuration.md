Analyse de RegisterSeniorScreen.js
Fonctionnalité actuelle
Objectif : Ce fichier gère l'enregistrement d'un profil senior.
Étapes actuelles :
L'utilisateur entre son prénom.
Un objet seniorProfile est créé avec un id, un firstName et un seniorCode.
Le profil est sauvegardé dans Firestore via saveSeniorProfile.
Le profil est également sauvegardé localement dans AsyncStorage.
Une alerte de succès est affichée, et l'utilisateur est redirigé vers l'écran SeniorHome.
Points à modifier pour la nouvelle structure
Structure des données : Actuellement, le profil est sauvegardé avec un id, un firstName et un seniorCode. Avec la nouvelle structure centrée sur l'utilisateur, nous devons :

Ajouter les données dans la collection users/ sous un document correspondant à l'id de l'utilisateur.
Inclure les champs userType (par exemple, "senior") et interfacePreference (par exemple, "simple").
Organiser les données sous des sous-collections comme profile/ et roles/senior/.
Firestore Service : La fonction saveSeniorProfile devra être adaptée pour respecter la nouvelle structure.

AsyncStorage : Les données sauvegardées localement devront refléter la nouvelle structure pour rester cohérentes avec Firestore.

Navigation : Vérifier que la redirection vers SeniorHome fonctionne avec les nouvelles données.

Étapes pour modifier RegisterSeniorScreen.js
Adapter la création de l'objet seniorProfile :

Ajouter les champs nécessaires pour la nouvelle structure (userType, interfacePreference, etc.).
Organiser les données pour qu'elles correspondent à la structure Firestore.
Modifier l'appel à saveSeniorProfile :

Passer les données dans le format attendu par la nouvelle structure.
Vérifier que saveSeniorProfile est compatible avec la nouvelle organisation des données.
Mettre à jour AsyncStorage :

Sauvegarder les données dans un format cohérent avec Firestore.
Tester la navigation :

Vérifier que l'utilisateur est correctement redirigé après l'enregistrement.
Notes pour la modification
Je vais créer un document temporaire pour noter les changements nécessaires et les étapes à suivre. Cela nous permettra de garder une trace des décisions prises et de revenir en arrière si nécessaire.
