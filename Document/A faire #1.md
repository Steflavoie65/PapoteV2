# Feuille de route pour le développement de Papote

## 1. Architecture de base (Déjà implémenté)
- Interface de choix utilisateur (Senior/Famille)
- Configuration du profil senior avec code unique
- Système de demande de connexion avec vérification du prénom

## 2. Prochaines fonctionnalités à développer

### Étape immédiate : Mise en place de Firebase
- Création du projet Firebase pour Papote
- Configuration de Firebase Authentication pour la gestion des utilisateurs
- Implémentation de Firestore pour stocker les profils et les demandes de connexion
- Mise en place des règles de sécurité Firebase
- Adaptation du code existant pour utiliser Firebase au lieu d'AsyncStorage

### Configuration Firebase complétée

Les identifiants Firebase ont été configurés avec succès:

#### Android:
- Nom du package: `com.steflavoie65.papote` *(noter que le package dans app.json doit correspondre exactement à cette valeur)*
- ID de l'application: `1:124029227093:android:17974ba93d19868ef9c4dc`
- Empreinte SHA-1: `96:2a:84:23:74:a0:ce:90:65:e1:25:c4:d0:5f:1c:1d:c4:16:fb:12` ✓

#### iOS:
- Bundle identifier: `com.steflavoie.papote`

### Progression actuelle et prochaines tâches

#### Étapes complétées :
- ✅ Configuration des identifiants Firebase (projet créé, applications enregistrées)
- ✅ Génération et ajout de l'empreinte SHA-1 pour Android
- ✅ Configuration des fichiers de base (`eas.json`)
- ✅ Télécharger les fichiers de configuration depuis la console Firebase
- ✅ Mettre à jour `app.json` avec les configurations correctes
- ✅ Installer les packages Firebase nécessaires
- ✅ Créer le fichier de configuration Firebase (`firebase/index.js`)

### Prochaines étapes - Migration vers Firebase :

1. **Adaption des services d'authentification :**
   - Créer un service d'authentification utilisant Firebase Auth
   - Implémenter les méthodes de connexion (téléphone pour seniors, email/mot de passe pour familles)
   - Tester le flux d'authentification complet

2. **Migration des données vers Firestore :**
   - Créer des services pour interagir avec chaque collection Firestore (`users`, `seniors`, etc.)
   - Migrer les fonctions qui utilisent AsyncStorage vers Firestore
   - Mettre en place la gestion des relations entre collections (seniors-familles)

3. **Mise en place de la synchronisation en temps réel :**
   - Implémenter les listeners Firestore pour les mises à jour en temps réel
   - Créer un système de notification pour les nouvelles demandes de connexion
   - Tester la synchronisation entre plusieurs appareils

4. **Sécurité et règles Firestore :**
   - Définir les règles de sécurité dans la console Firebase
   - Assurer que seuls les utilisateurs autorisés peuvent accéder à certaines données
   - Implémenter la validation des données côté serveur

Une fois ces étapes de migration terminées, vous pourrez passer à l'implémentation des fonctionnalités de communication avancées comme les appels WebRTC, le partage de photos, et les systèmes de rappels.

### Communication multi-canaux
- **Appels via Internet** (WebRTC) quand les deux ont une connexion
- **Appels téléphoniques** pour les seniors sans Internet
- **Système de SMS** comme canal de secours
- Détection intelligente du meilleur canal disponible

### Partage de photos et médias
- Interface simplifiée pour visualiser des photos
- Option d'envoi de photos par la famille
- Album photo organisé par membre de famille
- Possibilité d'ajouter des descriptions audio pour chaque photo

### Système de rappels et d'événements
- Rappels pour médicaments configurés par la famille
- Notifications d'anniversaires et événements importants
- Calendrier simplifié avec rappels vocaux

### Fonctionnalités de bien-être
- Bouton d'urgence avec notification à tous les contacts famille
- Vérifications quotidiennes optionnelles ("Comment allez-vous aujourd'hui?")
- Détection d'activité minimale pour alerter la famille

## 3. Améliorations d'interface utilisateur

### Pour les seniors
- Texte de grande taille et contraste élevé
- Boutons larges avec icônes claires
- Instructions vocales pour accompagner chaque action
- Mode simplifié limitant les options à l'essentiel

### Pour la famille
- Tableau de bord montrant l'état des seniors connectés
- Outils de planification des rappels et événements
- Options avancées de personnalisation

## 4. Infrastructure technique

### Synchronisation et disponibilité
- **Firebase** pour les utilisateurs avec Internet
- Mode hors ligne avec synchronisation différée
- Fallback vers SMS/appels téléphoniques

### Sécurité et confidentialité
- Vérification en deux étapes pour les connexions importantes
- Authentification par téléphone pour les seniors (configuration complétée)
- Permissions claires pour le partage de localisation
- Protections contre les tentatives d'hameçonnage
- Documentation des étapes de configuration d'authentification Firebase

### Configuration Firebase (étapes réalisées)
- Création du projet Firebase "Papote"
- Activation de l'authentification Email/Mot de passe
- Activation de l'authentification par téléphone pour les seniors
- Préparation pour l'intégration de Firestore

### Étapes restantes pour l'authentification par téléphone

#### Limitations importantes:
- Les nouveaux projets Firebase ont un quota quotidien de **10 SMS** par jour
- Pour augmenter cette limite, il est nécessaire d'ajouter un compte de facturation au projet
- Procédure pour ajouter la facturation:
  1. Dans la console Firebase > "Paramètres" > "Utilisation et facturation"
  2. Sélectionner "Détails et paramètres" > "Modifier le plan"
  3. Passer du plan Spark (gratuit) au plan Blaze (pay as you go)
  4. Ajouter une méthode de paiement (carte bancaire requise)
  5. Possibilité de définir des alertes budgétaires pour contrôler les coûts

### Structure de la base de données Firestore à créer

Créer les collections suivantes dans Firestore:

#### Collection `users`
- Documents ID: userId (automatiquement généré par Firebase Auth)
- Champs:
  - `firstName`: string
  - `lastName`: string
  - `userType`: string (valeurs: "senior" ou "family")
  - `phoneNumber`: string
  - `email`: string
  - `createdAt`: timestamp

#### Collection `seniors`
- Documents ID: userId (même ID que dans la collection users)
- Champs:
  - `firstName`: string
  - `code`: string (ex: "SR-ABCDE")
  - `createdAt`: timestamp

#### Collection `connections`
- Documents ID: auto-generated
- Champs:
  - `seniorId`: string (référence à un document de la collection seniors)
  - `familyId`: string (référence à un utilisateur famille)
  - `status`: string (valeurs: "pending", "accepted", "rejected")
  - `createdAt`: timestamp

#### Collection `connectionRequests`
- Documents ID: auto-generated
- Champs:
  - `seniorCode`: string
  - `familyId`: string
  - `familyName`: string
  - `seniorNameGuess`: string
  - `status`: string (valeurs: "pending", "accepted", "rejected")
  - `seen`: boolean
  - `createdAt`: timestamp

Pour créer cette structure dans la console Firebase:
1. Accéder à Firestore Database dans la console
2. Cliquer sur "Créer une collection"
3. Saisir le nom de la collection (ex: "users")
4. Ajouter un premier document avec les champs mentionnés
5. Répéter l'opération pour chaque collection

### Guide étape par étape pour créer la structure Firestore

#### Création de la collection `users`

1. Allez sur [console.firebase.google.com](https://console.firebase.google.com/) et sélectionnez votre projet Papote
2. Dans le menu de gauche, cliquez sur "Firestore Database"
3. S'il s'agit de votre première collection, cliquez sur "Créer une base de données", sinon cliquez sur "Démarrer une collection"
4. Saisissez `users` comme nom de collection
5. Pour votre premier document:
   - Laissez l'ID généré automatiquement ou saisissez un ID de test (par exemple "test_user_1")
   - Ajoutez les champs suivants en cliquant sur "Ajouter un champ" pour chacun:
     - `firstName` (type: string) → valeur: "Jean"
     - `lastName` (type: string) → valeur: "Dupont"
     - `userType` (type: string) → valeur: "senior"
     - `phoneNumber` (type: string) → valeur: "+33600000000"
     - `email` (type: string) → valeur: "test@example.com"
     - `createdAt` (type: timestamp) → valeur: [Aujourd'hui]
6. Cliquez sur "Enregistrer"

#### Création de la collection `seniors`

1. Dans Firestore, cliquez sur "Démarrer une collection"
2. Saisissez `seniors` comme nom de collection
3. Pour votre premier document:
   - Si vous avez créé un utilisateur de test, utilisez le même ID ("test_user_1")
   - Sinon, utilisez un ID généré automatiquement
   - Ajoutez les champs suivants:
     - `firstName` (type: string) → valeur: "Jean"
     - `code` (type: string) → valeur: "SR-TEST1"
     - `createdAt` (type: timestamp) → valeur: [Aujourd'hui]
4. Cliquez sur "Enregistrer"

#### Création de la collection `connections`

1. Cliquez sur "Démarrer une collection"
2. Saisissez `connections` comme nom de collection
3. Pour votre premier document:
   - Laissez l'ID généré automatiquement
   - Ajoutez les champs suivants:
     - `seniorId` (type: string) → valeur: [ID du document senior créé]
     - `familyId` (type: string) → valeur: "test_family_1"
     - `status` (type: string) → valeur: "pending"
     - `createdAt` (type: timestamp) → valeur: [Aujourd'hui]
4. Cliquez sur "Enregistrer"

#### Création de la collection `connectionRequests`

1. Cliquez sur "Démarrer une collection"
2. Saisissez `connectionRequests` comme nom de collection
3. Pour votre premier document:
   - Laissez l'ID généré automatiquement
   - Ajoutez les champs suivants:
     - `seniorCode` (type: string) → valeur: "SR-TEST1"
     - `familyId` (type: string) → valeur: "test_family_1"
     - `familyName` (type: string) → valeur: "Marie Dupont"
     - `seniorNameGuess` (type: string) → valeur: "Jean"
     - `status` (type: string) → valeur: "pending"
     - `seen` (type: boolean) → valeur: false
     - `createdAt` (type: timestamp) → valeur: [Aujourd'hui]
4. Cliquez sur "Enregistrer"

Vous aurez ainsi créé la structure de base de données nécessaire pour votre application Papote.

#### Pour Android:
1. Obtenir l'empreinte SHA-1 de votre application:
   ```bash
   cd android && ./gradlew signingReport
   ```
   
   Pour Expo, vous devez d'abord configurer EAS:
   ```
   npx eas credentials
   ```
   
   Lorsque le message suivant apparaît:
   ```
   EAS project not configured.
   ? Would you like to automatically create an EAS project for @steflavoie/papote? » (Y/n)
   ```
   
   Répondez "Y" pour créer un projet EAS.
   
   **Configuration du fichier eas.json:**
   Après la création du projet EAS, vous verrez probablement ce message:
   ```
   eas.json could not be found at F:\Papote\eas.json
   ```
   
   Vous devez créer ce fichier de configuration:
   
   1. Créez un fichier nommé `eas.json` à la racine de votre projet avec le contenu suivant:
   ```json
   {
     "cli": {
       "version": ">= 5.4.0"
     },
     "build": {
       "development": {
         "developmentClient": true,
         "distribution": "internal"
       },
       "preview": {
         "distribution": "internal"
       },
       "production": {}
     },
     "submit": {
       "production": {}
     }
   }
   ```
   
   2. Créez ou modifiez votre fichier `app.json` pour spécifier le package Android:
   ```json
   {
     "expo": {
       "name": "Papote",
       "slug": "papote",
       "version": "1.0.0",
       "android": {
         "adaptiveIcon": {
           "foregroundImage": "./assets/adaptive-icon.png",
           "backgroundColor": "#ffffff"
         },
         "package": "com.votreusername.papote"
       }
     }
   }
   ```
   
   3. Ensuite, exécutez à nouveau:
   ```
   npx eas credentials
   ```
   
   4. Quand vous voyez le message sur la mise à jour de EAS CLI, vous pouvez continuer avec la version actuelle:
   ```
   ★ eas-cli@16.2.1 is now available.
   To upgrade, run:
   npm install -g eas-cli
   Proceeding with outdated version.
   ```
   
   5. Sélectionnez "Android" comme plateforme
   
   6. Choisissez le profil de build à configurer (recommandé: "development"):
   ```
   ? Which build profile do you want to configure? » 
   >   development
       preview
       production
   ```
   
   7. Vous devriez voir un message indiquant qu'aucun identifiant n'est configuré:
   ```
   Android Credentials     
   Project                 papote
   Application Identifier  com.steflavoie.papote
   No credentials set up yet!  
   ```
   
   8. À l'invite "What do you want to do?", sélectionnez "Keystore: Manage everything needed to build your project"
   
   9. Dans le menu qui s'affiche, sélectionnez "Set up a new keystore"
   
   10. On vous demandera d'attribuer un nom à vos identifiants:
   ```
   ? Assign a name to your build credentials: » Build Credentials QAPVwvo5Ld
   ```
   Vous pouvez accepter le nom généré automatiquement ou entrer un nom plus descriptif comme "Papote Development Keystore".
   
   11. EAS vous demandera si vous souhaitez générer un nouveau keystore Android:
   ```
   ? Generate a new Android Keystore? » (Y/n)
   ```
   Répondez "Y" pour générer un nouveau keystore.
   
   12. Si vous n'avez pas keytool installé localement, EAS générera le keystore dans le cloud:
   ```
   Detected that you do not have keytool installed locally.
   ✔ Generating keystore in the cloud...
   ✔ Created keystore
   ✔ Created Android build credentials Build Credentials QAPVwvo5Ld
   ```
   
   13. Une fois terminé, vous verrez les informations du keystore, incluant l'empreinte SHA-1:
   ```
   Android Credentials     
   Project                 papote
   Application Identifier  com.steflavoie.papote

   Push Notifications (FCM Legacy)
     None assigned yet

   Push Notifications (FCM V1): Google Service Account Key For FCM V1
     None assigned yet

   Submissions: Google Service Account Key for Play Store Submissions
     None assigned yet

   Configuration: Build Credentials QAPVwvo5Ld (Default)
   Keystore
   Type                JKS
   Key Alias           74c835a8b4adeb4fb608e809755c232f
   MD5 Fingerprint     AB:EE:0F:07:70:9F:F8:C6:13:EC:00:BA:59:7C:F9:4E
   SHA1 Fingerprint    96:2A:84:23:74:A0:CE:90:65:E1:25:C4:D0:5F:1C:1D:C4:16:FB:12
   SHA256 Fingerprint  5F:56:92:F0:B7:93:06:04:75:ED:3E:FF:CA:0F:F2:16:A8:EB:53:0A:09:74:A1:3D:18:E1:26:A0:1B:C5:52:27
   ```
   
   14. **Notez cette empreinte SHA-1**: `96:2A:84:23:74:A0:CE:90:65:E1:25:C4:D0:5F:1C:1D:C4:16:FB:12`
       C'est cette valeur (sans les deux-points) que vous devrez ajouter à Firebase.
   
   15. Vous pouvez maintenant sélectionner "Go back" ou appuyer sur la touche Entrée pour revenir au menu principal.
   
   16. Pour vérifier votre keystore après sa création, vous pouvez revenir au menu credentials et sélectionner "Download existing keystore" pour obtenir une copie locale de sauvegarde.

2. Ajouter cette empreinte SHA-1 à votre projet Firebase:
   - Dans la console Firebase > Paramètres du projet > Général
   - Descendre à "Empreintes de certificats SHA" et ajouter l'empreinte
3. Dans le fichier `app.json`, ajouter la configuration Google:
   ```json
   "android": {
     "googleServicesFile": "./google-services.json",
     "package": "com.steflavoie65.papote"
   }
   ```

### Explication détaillée de l'empreinte SHA-1 pour Firebase

L'empreinte SHA-1 est un certificat de sécurité nécessaire pour que Firebase puisse vérifier l'authenticité de votre application Android. C'est particulièrement important pour l'authentification par téléphone.

#### Pourquoi est-ce nécessaire?
Firebase utilise cette empreinte pour créer un lien de confiance entre votre application et ses services. Sans cette empreinte, certaines fonctionnalités d'authentification (notamment par téléphone) ne fonctionneront pas sur Android.

#### Comment obtenir l'empreinte SHA-1 avec Expo:

1. Si vous utilisez Expo, exécutez plutôt cette commande dans PowerShell ou dans le terminal:
   ```
   npx eas credentials
   ```
   
   Note: La commande `expo fetch:android:hashes` est obsolète et a été remplacée par EAS (Expo Application Services).
   
2. Suivez les instructions à l'écran:
   - Sélectionnez votre projet si demandé
   - Choisissez l'option pour Android
   - Sélectionnez "List credentials"
   - Vous verrez l'empreinte SHA-1 dans les résultats

3. Copiez cette valeur (sans les deux-points).

#### Comment ajouter l'empreinte à Firebase:

1. Rendez-vous sur la [console Firebase](https://console.firebase.google.com/) et sélectionnez votre projet
2. Cliquez sur l'icône d'engrenage (⚙️) à côté de "Vue d'ensemble du projet" et sélectionnez "Paramètres du projet"
3. Dans l'onglet "Général", faites défiler jusqu'à la section "Vos applications"
4. Sélectionnez votre application Android
5. Faites défiler jusqu'à "Empreintes de certificats SHA"
6. Cliquez sur "Ajouter une empreinte"
7. Collez votre empreinte SHA-1 (sans les deux-points)
8. Cliquez sur "Enregistrer"

#### Exemple visuel:
L'emplacement dans la console Firebase ressemble à ceci:

#### Pour iOS:
1. Télécharger le fichier `GoogleService-Info.plist`
2. Placer ce fichier à la racine du projet
3. Dans le fichier `app.json`, ajouter:
   ```json
   "ios": {
     "googleServicesFile": "./GoogleService-Info.plist",
     "bundleIdentifier": "com.votreusername.papote"
   }
   ```

#### Pour Expo:
1. Installer les packages nécessaires:
   ```bash
   npx expo install expo-dev-client
   ```
2. Créer une version de développement:
   ```bash
   eas build --profile development --platform android
   ```
   ```bash
   eas build --profile development --platform ios
   ```
3. Une fois l'application construite, télécharger et installer sur les appareils de test

## 5. Fonctionnalités communautaires

### Cercle de confiance élargi
- Possibilité d'ajouter des amis, voisins ou aides à domicile
- Différents niveaux d'autorisation selon la relation
- Système d'approbation par la famille pour les nouveaux contacts

### Groupes et partage
- Conversations de groupe simplifiées
- Partage de photos à plusieurs membres de famille
- Événements familiaux coordonnés (anniversaires, réunions)

## Approche recommandée
1. Commencer par solidifier la **communication de base** entre senior et famille
2. Ajouter le partage de **photos et messages simples**
3. Implémenter les **rappels et événements**
4. Développer les fonctionnalités avancées de **bien-être et sécurité**

Cette approche progressive garantit que les fonctionnalités essentielles sont robustes avant d'ajouter des options plus complexes, tout en maintenant l'objectif de simplicité pour les utilisateurs seniors.