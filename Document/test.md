# Documentation Complète de l'Application Papote

## Table des matières
1. [Présentation de l'Application](#1-présentation-de-lapplication)
2. [Objectifs et Public Cible](#2-objectifs-et-public-cible)
3. [Architecture Technique](#3-architecture-technique)
4. [Structure de la Base de Données](#4-structure-de-la-base-de-données)
5. [Fonctionnalités Principales](#5-fonctionnalités-principales)
6. [Interface Utilisateur](#6-interface-utilisateur)
7. [Workflow Utilisateur](#7-workflow-utilisateur)
8. [Guide d'Implémentation](#8-guide-dimplémentation)
9. [Considérations de Sécurité](#9-considérations-de-sécurité)
10. [Plan de Déploiement](#10-plan-de-déploiement)

## 1. Présentation de l'Application

### 1.1 Qu'est-ce que Papote?

Papote est une application mobile conçue pour faciliter la communication et l'engagement social des personnes âgées avec leur famille, amis et diverses organisations communautaires. Son nom "Papote" évoque la conversation amicale et informelle, reflétant l'objectif principal de l'application : maintenir et renforcer les liens sociaux des seniors, tout en leur offrant des outils adaptés pour améliorer leur qualité de vie quotidienne.

### 1.2 Vision et Mission

**Vision** : Créer un monde où l'âge n'est pas un obstacle à la connexion sociale et où la technologie est un pont entre les générations, non une barrière.

**Mission** : Papote vise à réduire l'isolement des personnes âgées en leur offrant une plateforme numérique accessible qui:
- Facilite la communication avec leurs proches
- Stimule l'engagement social et communautaire
- Fournit des outils adaptés à leurs besoins spécifiques
- Valorise leur rôle et leur contribution à la société

## 2. Objectifs et Public Cible

### 2.1 Objectifs Principaux

1. **Lutter contre l'isolement social** des seniors en facilitant les interactions régulières avec leurs proches
2. **Simplifier l'usage de la technologie** avec une interface conçue spécifiquement pour les seniors (grands caractères, navigation intuitive, etc.)
3. **Fournir des outils pratiques** adaptés au quotidien des personnes âgées (rappels de médicaments, agenda simplifié, etc.)
4. **Encourager la participation sociale** via des opportunités de bénévolat et d'engagement communautaire
5. **Stimuler les capacités cognitives** à travers des activités adaptées
6. **Créer un pont intergénérationnel** favorisant les échanges et le partage entre les seniors et leurs familles

### 2.2 Public Cible

L'application s'adresse à trois catégories d'utilisateurs principaux:

1. **Seniors** (65 ans et plus):
   - Tous niveaux d'aisance technologique
   - Vivant à domicile ou en résidence
   - Avec ou sans limitations physiques ou cognitives légères

2. **Famille et amis**:
   - Enfants, petits-enfants, proches
   - Personnes souhaitant maintenir un lien avec les seniors
   - Aidants familiaux

3. **Organisations**:
   - Centres communautaires et associations
   - Services d'aide aux personnes âgées
   - Structures de bénévolat

## 3. Architecture Technique

### 3.1 Stack Technologique

- **Frontend**: React Native (via Expo)
- **Backend**: Firebase (Serverless)
- **Base de données**: Cloud Firestore
- **Authentification**: Firebase Authentication
- **Stockage**: Firebase Storage
- **Notifications**: Firebase Cloud Messaging
- **Analytics**: Firebase Analytics

### 3.2 Structure du Projet

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

### 3.3 Approche de Développement

- **Architecture**: Centrée sur l'utilisateur (User-Centric)
- **UI/UX**: Adaptative selon le type d'utilisateur et leurs préférences
- **État**: Gestion via React Context API et hooks personnalisés
- **Style**: Styling adaptatif avec accessibilité prioritaire
- **Testing**: Jest pour les tests unitaires et d'intégration

## 4. Structure de la Base de Données

La base de données Firestore est organisée selon une structure centrée sur l'utilisateur:

### 4.1 Structure Générale

```
users/
  user123/
    profile/ 
      - userId
      - phoneNumber
      - email (optionnel)
      - deviceId
      - createdAt
      - lastLoginAt
      - userType ["senior", "family", "organization", "multiple"]
      - interfacePreference ["simple", "standard", "advanced"]
    roles/
      senior/
        - seniorCode
        - firstName
        - lastName
        - birthDate
        - preferences
        - emergencyContact
        - accessibility
        - createdAt
      family/
        - familyName
        - createdAt
    contacts/
      - seniorContacts: [
          {
            seniorId: "user456",
            seniorName: "Jean",
            relationship: "Grand-père",
            addedAt: timestamp
          }
        ]
      - familyContacts: [
          {
            familyId: "user789",
            familyName: "Dupont",
            relationship: "Fils",
            addedAt: timestamp
          }
        ]
    requests/
      outgoing: [
        {
          id: "req123",
          targetUserId: "user456",
          type: "senior_connection",
          status: "pending", 
          createdAt: timestamp
        }
      ]
      incoming: [
        {
          id: "req456",
          fromUserId: "user789",
          type: "family_connection",
          status: "pending",
          createdAt: timestamp
        }
      ]
```

### 4.2 Module Outils Seniors

```
users/
  user123/
    tools/
      medications/
        - entries: [
            {
              name: "Médicament A",
              dosage: "1 comprimé",
              frequency: "matin et soir",
              reminderTime: ["08:00", "20:00"],
              startDate: timestamp,
              endDate: timestamp,
              notes: "À prendre avec un repas"
            }
          ]
      calendar/
        - events: [
            {
              title: "Rendez-vous médecin",
              date: timestamp,
              location: "Cabinet Dr. Martin",
              reminderTime: -30,  // 30 minutes avant
              notes: "Apporter carnet de santé"
            }
          ]
      memory/
        - memories: [
            {
              title: "Anniversaire 80 ans",
              date: timestamp,
              photos: ["url1", "url2"],
              description: "Fête avec toute la famille",
              people: ["Marie", "Pierre", "Julie"],
              location: "Maison familiale"
            }
          ]
        - exercises: [
            {
              type: "association",
              lastCompleted: timestamp,
              difficulty: "medium",
              score: 85,
              frequency: "daily"
            }
          ]
```

### 4.3 Module Bénévolat et Activités Sociales

```
users/
  user123/
    tools/
      volunteering/
        - preferences: {
            availability: ["lundi", "jeudi"],
            preferredHours: ["matin", "après-midi"],
            interests: ["lecture aux enfants", "aide alimentaire", "artisanat"],
            mobility: "autonome",
            experience: ["enseignement", "cuisine"]
          }
        - opportunities: [
            {
              organizationId: "org123",
              organizationName: "Centre communautaire St-Michel",
              title: "Lecture aux enfants",
              description: "Lire des histoires aux enfants de 4-6 ans",
              schedule: {
                day: "jeudi",
                startTime: "14:00",
                endTime: "16:00",
                recurring: true,
                frequency: "weekly"
              },
              location: "Bibliothèque municipale",
              skills: ["patience", "lecture"],
              transportation: "disponible sur demande",
              contact: {
                name: "Marie Tremblay",
                phone: "514-555-1234"
              }
            }
          ]
        - commitments: [
            {
              opportunityId: "opp456",
              status: "confirmed",
              dates: ["2023-11-02", "2023-11-09"],
              notes: "Apporter lunettes de lecture",
              reminderSet: true,
              feedback: {
                rating: 5,
                comments: "Expérience enrichissante",
                date: timestamp
              }
            }
          ]
        - impact: {
            totalHours: 24,
            peopleHelped: 15,
            achievements: ["Certificat de reconnaissance"],
            badges: ["Lecteur assidu", "Bénévole du mois"]
          }
```

### 4.4 Module Quotidien et Bien-être

```
users/
  user123/
    tools/
      dailyRoutines/
        - routines: [
            {
              name: "Matin",
              time: "08:00",
              tasks: ["Prendre médicaments", "Petit-déjeuner", "Lecture journal"],
              completed: false
            }
          ]
      nutrition/
        - waterReminders: {
            active: true,
            interval: 120, // minutes
            startTime: "08:00",
            endTime: "20:00",
            lastDrink: timestamp
          }
        - meals: [
            {
              date: timestamp,
              type: "déjeuner",
              items: ["Soupe", "Poulet", "Légumes"],
              notes: "Bien mangé aujourd'hui"
            }
          ]
```

### 4.5 Module Divertissement et Cognitive

```
users/
  user123/
    tools/
      entertainment/
        - games: {
            favorites: ["Memory", "Mots croisés"],
            scores: {...}
          }
        - audioBooks: [
            {
              title: "Les Misérables",
              author: "Victor Hugo",
              currentPosition: 1250, // secondes
              favorite: true
            }
          ]
        - tv: {
            favorites: ["Journal de 13h", "Questions pour un champion"],
            reminders: [
              {
                program: "Journal de 20h",
                channel: "France 2",
                days: ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"],
                time: "20:00"
              }
            ]
          }
```

### 4.6 Module Interactions et Assistance

```
users/
  user123/
    interactions/
      messages: [
        {
          with: "user789",
          lastMessage: "Bonjour mamie !",
          timestamp: timestamp,
          unread: 2
        }
      ]
      calls: [
        {
          with: "user456",
          duration: 125,  // en secondes
          timestamp: timestamp,
          missed: false
        }
      ]
    tools/
      socialActivity/
        - interactions: {
            lastContact: timestamp,
            weeklyContacts: 5,
            reminderIfNoContactDays: 3,
            preferredContactMethod: "video"
          }
        - events: [
            {
              type: "appel vidéo",
              with: "Famille Dupont",
              date: timestamp,
              duration: 1800,
              mood: "heureux"
            }
          ]
      assistance/
        - tutorials: [
            {
              feature: "appel vidéo",
              completed: true,
              lastViewed: timestamp
            }
          ]
        - helpRequests: [
            {
              type: "technique",
              description: "Comment changer la taille du texte",
              date: timestamp,
              status: "resolved",
              resolvedBy: "user789"
            }
          ]
```

### 4.7 Organisation des Messages

La collection messages sera gérée séparément pour stocker les conversations:

```
messages/
  conversation123/ // ID unique pour chaque conversation
    - participants: ["user123", "user456"]
    - lastUpdated: timestamp
    - messages: [
        {
          sender: "user123",
          content: "Bonjour, comment vas-tu aujourd'hui?",
          timestamp: timestamp,
          read: true
        },
        {
          sender: "user456",
          content: "Très bien merci! Et toi?",
          timestamp: timestamp,
          read: false
        }
      ]
```

## 5. Fonctionnalités Principales

### 5.1 Système d'authentification adaptative
- **Authentification par SMS** pour les seniors (simplifié)
- **Authentification standard** pour les familles et organisations
- **Détection du type d'utilisateur** et redirection vers l'interface adaptée
- **Lien entre comptes** pour gérer les relations senior-famille

### 5.2 Communication
- **Messagerie simplifiée** avec texte, photos, et emojis
- **Appels audio/vidéo** intégrés avec interface senior-friendly
- **Statut de disponibilité** pour savoir quand contacter le senior
- **Partage de médias** facile et intuitif

### 5.3 Gestion de la santé
- **Rappels de médicaments** avec notifications
- **Suivi de l'hydratation** et rappels pour boire
- **Agenda médical** avec rappels de rendez-vous
- **Journal de santé** simple à compléter

### 5.4 Stimulation cognitive
- **Jeux adaptés** aux seniors (mémoire, logique, etc.)
- **Albums photos** avec identification des personnes
- **Activités quotidiennes** stimulantes

### 5.5 Engagement social
- **Opportunités de bénévolat** adaptées aux capacités
- **Événements sociaux** à proximité
- **Réseautage intergénérationnel**

### 5.6 Assistance et support
- **Tutoriels intégrés** pour chaque fonctionnalité
- **Système d'aide contextuelle**
- **Assistance à distance** par la famille ou le support technique

## 6. Interface Utilisateur

### 6.1 Principes de Design

- **Accessibilité** : Interface adaptée aux seniors avec options d'agrandissement, contraste élevé
- **Simplicité** : Navigation intuitive avec minimum de clics/taps
- **Adaptabilité** : Interface qui s'ajuste selon le profil utilisateur et ses préférences
- **Cohérence** : Design homogène et prévisible
- **Feedback** : Confirmation visuelle et sonore des actions

### 6.2 Interfaces Spécifiques

#### 6.2.1 Interface Seniors
- Grands boutons et textes
- Navigation simplifiée par icônes explicites
- Écrans non surchargés
- Options d'accessibilité avancées (lecture à voix haute)
- Aide contextuelle

#### 6.2.2 Interface Famille
- Interface standard mais optimisée mobile
- Tableau de bord de suivi des seniors
- Outils de gestion et planification
- Paramètres avancés

#### 6.2.3 Interface Organisations
- Gestion d'événements et opportunités
- Suivi des participants
- Tableaux de bord statistiques
- Fonctionnalités administratives

## 7. Workflow Utilisateur

### 7.1 Parcours Senior

1. **Onboarding**:
   - Inscription simplifiée (SMS + prénom)
   - Tutoriel interactif
   - Configuration des préférences d'interface

2. **Connexion avec la famille**:
   - Génération d'un code unique
   - Acceptation des demandes de connexion

3. **Utilisation quotidienne**:
   - Vérification des messages
   - Suivi des rappels de médicaments/événements
   - Activités stimulantes
   - Communication avec les proches

### 7.2 Parcours Famille

1. **Inscription**:
   - Création de compte standard
   - Configuration du profil familial

2. **Connexion avec senior**:
   - Saisie du code senior ou envoi d'invitation
   - Personnalisation de la relation

3. **Utilisation quotidienne**:
   - Suivi de l'activité du senior
   - Communications régulières
   - Gestion des rappels et événements
   - Configuration d'aide

### 7.3 Parcours Organisation

1. **Inscription et vérification**:
   - Création de compte organisation
   - Vérification d'authenticité

2. **Publication d'opportunités**:
   - Création d'événements et activités
   - Définition des critères et horaires

3. **Gestion des participants**:
   - Suivi des inscriptions
   - Communications groupées
   - Feedback et évaluation

## 8. Guide d'Implémentation

### 8.1 Configuration Firebase

1. **Création du projet Firebase**:
   ```
   Accéder à la console Firebase: https://console.firebase.google.com/
   Créer un nouveau projet: "PapoteApp"
   Activer Firestore, Authentication, Storage, et Functions
   ```

2. **Configuration de l'authentification**:
   ```
   Activer l'authentification par téléphone
   Configurer OAuth pour Google/Apple si nécessaire
   Définir les règles de sécurité
   ```

3. **Configuration de Firestore**:
   ```
   Créer la base de données en mode Production
   Configurer les règles de sécurité selon le modèle:
   
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Authentification requise pour toutes les opérations
       match /{document=**} {
         allow read, write: if request.auth != null;
       }
       
       // Règles spécifiques pour les utilisateurs
       match /users/{userId} {
         allow read: if request.auth.uid == userId;
         allow write: if request.auth.uid == userId;
         
         // Sous-collections de l'utilisateur
         match /{subcollection}/{document=**} {
           allow read: if request.auth.uid == userId;
           allow write: if request.auth.uid == userId;
         }
       }
       
       // Règles pour les messages
       match /messages/{conversationId} {
         allow read: if request.auth.uid in resource.data.participants;
         allow create: if request.auth.uid in request.resource.data.participants;
         allow update: if request.auth.uid in resource.data.participants;
       }
     }
   }
   ```

### 8.2 Étapes de Développement

1. **Phase 1: Structure de base et authentification**
   - Configurer le projet React Native/Expo
   - Mettre en place l'authentification Firebase
   - Créer la structure de base des écrans
   - Implémenter le système de navigation

2. **Phase 2: Profils et connexions**
   - Développer la gestion de profil utilisateur
   - Implémenter le système de connexion senior-famille
   - Créer les écrans de contacts

3. **Phase 3: Communication**
   - Développer le système de messagerie
   - Implémenter les appels audio/vidéo
   - Créer le partage de photos/vidéos

4. **Phase 4: Outils seniors**
   - Développer les rappels de médicaments
   - Implémenter le calendrier
   - Créer les jeux et activités cognitives

5. **Phase 5: Module de bénévolat**
   - Développer le système d'opportunités
   - Implémenter les inscriptions et confirmations
   - Créer les tableaux de bord d'impact

### 8.3 Implémentation des Fonctionnalités Clés

#### 8.3.1 Système d'authentification

```javascript
// Exemple d'implémentation de l'authentification par SMS
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { PhoneAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../services/firebase/config';

const phoneSignIn = async (phoneNumber, recaptchaVerifier) => {
  try {
    const phoneProvider = new PhoneAuthProvider(auth);
    const verificationId = await phoneProvider.verifyPhoneNumber(
      phoneNumber,
      recaptchaVerifier.current
    );
    
    // Stocker verificationId pour la vérification de code
    setVerificationId(verificationId);
    setStep('VERIFY_CODE');
  } catch (error) {
    console.error('Erreur d\'envoi de code:', error);
    Alert.alert('Erreur', 'Impossible d\'envoyer le code de vérification.');
  }
};

const confirmCode = async (verificationId, code) => {
  try {
    const credential = PhoneAuthProvider.credential(verificationId, code);
    const result = await signInWithCredential(auth, credential);
    
    // Utilisateur authentifié
    const user = result.user;
    
    // Vérifier si l'utilisateur existe ou est nouveau
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    if (!userDoc.exists()) {
      // Nouvel utilisateur
      navigation.navigate('OnboardingScreen');
    } else {
      // Utilisateur existant
      navigation.navigate('HomeScreen');
    }
  } catch (error) {
    console.error('Erreur de vérification:', error);
    Alert.alert('Erreur', 'Code invalide. Veuillez réessayer.');
  }
};
```

#### 8.3.2 Système de rappels de médicaments

```javascript
// Exemple d'implémentation du système de rappels
import * as Notifications from 'expo-notifications';

// Configurer les notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Ajouter un rappel de médicament
const addMedicationReminder = async (userId, medicationData) => {
  try {
    // Stocker dans Firestore
    const userRef = doc(db, 'users', userId);
    const medicationRef = collection(userRef, 'tools', 'medications', 'entries');
    
    await addDoc(medicationRef, {
      ...medicationData,
      createdAt: serverTimestamp(),
    });
    
    // Planifier des notifications locales
    for (const time of medicationData.reminderTime) {
      const [hour, minute] = time.split(':');
      const trigger = new Date();
      
      trigger.setHours(parseInt(hour, 10));
      trigger.setMinutes(parseInt(minute, 10));
      trigger.setSeconds(0);
      
      // Si l'heure est déjà passée aujourd'hui, programmer pour demain
      if (trigger <= new Date()) {
        trigger.setDate(trigger.getDate() + 1);
      }
      
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Rappel de médicament',
          body: `C'est l'heure de prendre ${medicationData.name} (${medicationData.dosage})`,
          sound: true,
          priority: 'high',
          data: { medicationId: medicationData.id },
        },
        trigger: {
          hour: parseInt(hour, 10),
          minute: parseInt(minute, 10),
          repeats: true,
        },
      });
      
      // Stocker l'identifiant de notification pour pouvoir l'annuler plus tard
      await updateDoc(doc(medicationRef, medicationData.id), {
        notificationIds: arrayUnion(identifier),
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Erreur lors de la création du rappel:', error);
    return { success: false, error: error.message };
  }
};
```

## 9. Considérations de Sécurité

### 9.1 Protection des Données Sensibles
- **Chiffrement des données sensibles**
- **Transmission sécurisée** (HTTPS)
- **Règles de sécurité Firebase** strictes
- **Politique de rétention** des données

### 9.2 Authentification et Autorisation
- **Authentification multi-facteurs** optionnelle
- **Délégation d'accès contrôlée** (famille/aidants)
- **Sessions sécurisées**
- **Alertes de connexion inhabituelles**

### 9.3 Conformité et Protection de la Vie Privée
- **Conformité RGPD/GDPR**
- **Politique de confidentialité** claire
- **Contrôle des données** par l'utilisateur
- **Portabilité des données**

## 10. Plan de Déploiement

### 10.1 Phase de Test

1. **Tests internes**
   - Test des fonctionnalités de base
   - Debug et optimisations
   
2. **Bêta fermée**
   - Groupe test de 10-20 seniors et leurs familles
   - Retour d'expérience et ajustements

3. **Bêta ouverte**
   - Déploiement limité sur Play Store/App Store
   - Collecte de métriques et feedback utilisateur

### 10.2 Lancement

1. **Déploiement initial**
   - Publication sur Play Store et App Store
   - Campagne de communication ciblée
   
2. **Expansion progressive**
   - Partenariats avec organisations pour seniors
   - Programme d'ambassadeurs seniors

### 10.3 Stratégie de Croissance

1. **Développement guidé par les utilisateurs**
   - Forum de suggestions
   - Roadmap publique
   
2. **Partenariats stratégiques**
   - Services de soins à domicile
   - Résidences seniors
   - Services municipaux pour aînés

3. **Modèle économique durable**
   - Version de base gratuite
   - Fonctionnalités premium pour la famille
   - Licences pour organisations

---

Cette documentation complète fournit toutes les informations nécessaires pour comprendre, développer, et déployer l'application Papote. Elle est conçue pour servir de référence exhaustive et de guide pour tous les membres de l'équipe de développement ainsi que pour les parties prenantes du projet.
```

Ce document complet donne une vision exhaustive de l'application Papote, incluant tous les aspects techniques, fonctionnels et stratégiques. Il permettra à toute personne ou IA qui le lit de comprendre précisément le projet et de pouvoir contribuer à son développement.

Made changes.