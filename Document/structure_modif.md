# Étapes pour modifier la structure de la base de données Firestore

Voici les grandes étapes pour passer d'une structure basée sur les rôles (seniors/families) à une structure centrée sur l'utilisateur, sans code :

## 1. Planification du nouveau modèle de données

- **Définir la nouvelle structure** : Concevoir la hiérarchie des collections et documents avec "users" comme collection principale

users/
  user123/
    profile/

- **Établir les relations** : Déterminer comment les connexions entre utilisateurs seront représentées
- **Documenter le schéma** : Créer un diagramme ou document décrivant la nouvelle structure

## 2. Adaptation des services Firebase

- **Identifier tous les services** qui interagissent avec Firestore (firestoreService.js, etc.)
- **Lister les fonctions à modifier** : saveSeniorProfile, saveFamilyProfile, etc.
- **Planifier les nouvelles signatures** des fonctions pour qu'elles travaillent avec le modèle centré sur l'utilisateur

## 3. Mise à jour de l'authentification

- **Évaluer le système d'authentification actuel** et comment il s'intégrera avec le modèle utilisateur unique
- **Planifier les modifications** nécessaires au processus d'enregistrement/connexion

## 4. Mises à jour des écrans

- **Identifier tous les écrans** qui lisent ou écrivent dans Firestore
- **Déterminer les changements requis** pour chaque écran afin d'utiliser la nouvelle structure

## 5. Gestion du stockage local

- **Adapter AsyncStorage** pour stocker des informations sur l'utilisateur plutôt que sur les rôles spécifiques
- **Planifier la transition** des clés de stockage

## 6. Procédure de test

- **Créer un plan de test** pour valider chaque fonctionnalité avec la nouvelle structure
- **Définir les critères de succès** pour la migration

## 7. Implémentation et déploiement

- **Commencer par les services de base** (Firebase/Firestore)
- **Progresser vers les couches supérieures** (écrans)
- **Tester régulièrement** pendant le développement

Cette approche méthodique vous permettra de réorganiser votre base de données de manière structurée, en minimisant les risques d'erreurs ou d'incohérences.

## 8. Plan de démarrage pour la nouvelle application

Pour commencer le développement de la nouvelle version sans toucher à l'application existante, voici les étapes initiales à suivre:

1. **Mise en place de l'environnement**
   - Créer un nouveau dossier pour le projet (`f:\PapoteV2`)
   - Initialiser un nouveau projet React Native/Expo
      ```bash
      # Commandes pour initialiser le nouveau projet
      npx create-expo-app PapoteV2
      cd PapoteV2
      
      # Si problème de connexion avec npm, essayez ces alternatives:
      
      # Option 1: Utiliser un autre registre npm
      npm set registry https://registry.npmjs.com/
      npx expo install firebase react-native-async-storage/async-storage
      
      # Option 2: Nettoyer le cache npm et réessayer
      npm cache clean --force
      npx expo install firebase react-native-async-storage/async-storage
      
      # Option 3: Utiliser yarn à la place de npm
      npm install -g yarn
      yarn add firebase @react-native-async-storage/async-storage
      
      # Option 4: Installation manuelle sans expo
      npm install --save firebase@9.22.0 @react-native-async-storage/async-storage
      ```
   - Configurer un nouveau projet Firebase avec une nouvelle base de données Firestore
      - Créer un projet dans la console Firebase (https://console.firebase.google.com/)
      - Activer Authentication, Firestore et Storage
      - Télécharger les fichiers de configuration (google-services.json et GoogleService-Info.plist)

2. **Documentation de l'architecture**
   - Finaliser la structure de données utilisateur centrée
   - Créer un document expliquant l'architecture des dossiers:
      ```
      /PapoteV2
        /src
          /components      # Composants UI réutilisables
            /core          # Composants de base (boutons, inputs, etc.)
            /senior        # Composants spécifiques aux seniors
            /family        # Composants spécifiques aux familles
            /shared        # Composants partagés entre rôles
          /screens         # Écrans de l'application
            /auth          # Écrans d'authentification
            /onboarding    # Écrans d'accueil et tutoriels
            /profile       # Gestion de profil
            /connections   # Gestion des contacts
            /messaging     # Communication
          /services        # Services d'accès aux données
            /firebase      # Services Firebase
            /api           # Autres services externes
          /hooks           # Custom hooks
          /contexts        # Contextes React (auth, theme, etc.)
          /navigation      # Configuration de navigation
          /utils           # Utilitaires
          /styles          # Styles globaux et thèmes
          /assets          # Images, polices, etc.
      ```

3. **Développer le Core system**
   - Créer la structure de base du projet
   - Mettre en place l'intégration Firebase
   - Concevoir un système d'authentification adaptatif
   - Implémenter les services de base Firebase pour les opérations CRUD
   - Développer un système de navigation adaptative selon le type d'utilisateur

4. **Prototype d'interface**
   - Créer des composants UI de base avec haute accessibilité
   - Développer les écrans d'onboarding et de profil
   - Implémenter la fonctionnalité de bascule entre interfaces (simple/standard/avancée)

5. **Premier module fonctionnel**
   - Commencer par le module de connexion entre utilisateurs
   - Implémenter le système de contacts et demandes
   - Créer les fonctionnalités de messagerie basique

Cette approche permet de construire une base solide avant d'ajouter progressivement toutes les fonctionnalités spécialisées que nous avons définies dans la structure de données.