# Structure Firestore - Papote

## Collections Principales

### users
- Document ID: `{userId}` (ID unique de l'utilisateur)
  ```javascript
  {
    firstName: string,
    userId: string,
    userType: "senior" | "family",
    createdAt: timestamp,
    seniorCode?: string,     // Pour les seniors uniquement
    familyContacts?: [{      // Pour les seniors uniquement
      familyId: string,
      familyFirstName: string,
      familyName: string,
      dateAdded: timestamp
    }]
  }
  ```
  
  #### Sous-collections
  - `context/chatbox` : Contexte de conversation
    ```javascript
    {
      lastInteraction: timestamp,
      health: {
        isSick: boolean,
        lastCheck: timestamp,
        symptoms: array
      },
      situation: {
        isAlone: boolean,
        mobility: string,
        support: string
      },
      mood: {
        current: string,
        lastCheck: timestamp
      }
    }
    ```

### conversations
- Document ID: `{conversationId}` (Combinaison des IDs des participants)
  ```javascript
  {
    participants: [string, string],
    createdAt: timestamp,
    lastMessage: string,
    lastMessageTime: timestamp
  }
  ```

  #### Sous-collections
  - `messages` : Messages de la conversation
    ```javascript
    {
      content: string,
      type: "text" | "image",
      senderId: string,
      timestamp: timestamp,
      read: boolean
    }
    ```
  - `typing` : État de frappe des participants
    ```javascript
    {
      isTyping: boolean,
      timestamp: timestamp
    }
    ```

### familyRequests
- Document ID: auto-generated
  ```javascript
  {
    seniorId: string,
    familyId: string,
    status: "pending" | "accepted" | "rejected",
    createdAt: timestamp,
    processedAt: timestamp
  }
  ```
r
## Règles de Sécurité

Les règles Firestore sont configurées pour :
- Permettre aux utilisateurs de lire/écrire leurs propres données
- Permettre l'accès aux conversations uniquement aux participants
- Restreindre l'accès aux requêtes de connexion aux personnes concernées
- Protéger les données sensibles et contextuelles

## Indexes

Indexes requis :
- conversations/messages : `timestamp` (ASC/DESC)
- familyRequests : `seniorId, status`
- familyRequests : `familyId, status`
