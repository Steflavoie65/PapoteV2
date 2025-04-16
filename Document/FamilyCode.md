## Instructions pour implémenter le `familyCode`

Ces instructions expliquent comment implémenter le `familyCode` pour les membres de la famille, afin de leur permettre de se connecter facilement à leur compte existant.

### 1. Objectif

L'objectif est de permettre aux membres de la famille de se connecter à leur compte existant en utilisant un `familyCode` unique, similaire à la façon dont les seniors utilisent un `seniorCode`.

### 2. Étapes

#### 2.1. Modifier l'écran d'inscription pour les familles (`RegisterFamilyScreen.js`)

1.  **Ajouter un champ pour le nom de famille** : Si ce n'est pas déjà le cas, ajoutez un champ pour que l'utilisateur entre son nom de famille.
2.  **Générer un `familyCode` unique** :
    -   Dans la fonction `handleRegister`, ajoutez le code pour générer un `familyCode` unique lors de l'inscription d'un membre de la famille.
    -   Utilisez un format similaire au `seniorCode`, par exemple : `FM-${Math.random().toString(36).substr(2, 5).toUpperCase()}`.
3.  **Enregistrer le `familyCode` dans Firebase** :
    -   Assurez-vous que le `familyCode` est inclus dans l'objet `firestoreProfile` et enregistré dans la collection `users`.
4.  **Enregistrer le `familyCode` dans AsyncStorage** :
    -   Assurez-vous que le `familyCode` est inclus dans l'objet `profileForStorage` et enregistré dans `AsyncStorage`.

#### Exemple de code pour `RegisterFamilyScreen.js`

```javascript
// filepath: f:\Papote\screens\RegisterFamilyScreen.js
// ...existing code...
const handleRegister = async () => {
  // ...existing code...
  const userId = `family-${Date.now()}`;
  const familyCode = `FM-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
  console.log('Création profil famille:', { userId, familyCode, firstName, familyName });

  const firestoreProfile = {
    userId,
    firstName,
    familyName,
    familyCode, // Ajouter le familyCode
    userType: 'family',
    createdAt: new Date().toISOString(),
  };

  const result = await saveFamilyProfile(firestoreProfile);
  if (!result.success) {
    throw new Error(result.error || 'Erreur sauvegarde Firestore');
  }

  const profileForStorage = {
    profile: {
      userId,
      firstName,
      familyName,
      familyCode, // Ajouter le familyCode
      userType: 'family',
      interfacePreference: 'standard',
    },
    roles: {
      family: {
        createdAt: new Date().toISOString(),
      },
    },
  };

  await AsyncStorage.setItem('familyProfile', JSON.stringify(profileForStorage));
  // ...existing code...
};
// ...existing code...
```

#### 2.2. Mettre à jour l'écran "Mes Infos" pour les familles (`FamilySettingsScreen.js`)

1.  **Afficher le `familyCode`** :
    -   Ajoutez une section dans l'écran "Mes Infos" où l'utilisateur peut voir son `familyCode`.

2.  **Ajouter une option de partage** :
    -   Ajoutez un bouton ou une option pour permettre à l'utilisateur de partager facilement son `familyCode` avec d'autres personnes (par exemple, via SMS, e-mail ou une autre application).

#### Exemple de code pour `FamilySettingsScreen.js`

```javascript
// filepath: f:\Papote\screens\FamilySettingsScreen.js
// ...existing code...
<TouchableOpacity 
  style={styles.menuItem}
  onPress={() => navigation.navigate('FamilyCodeScreen')}
>
  <MaterialCommunityIcons name="share-variant" size={32} color="#4285F4" />
  <View style={styles.menuTextContainer}>
    <Text style={styles.menuTitle}>Partager mon code famille</Text>
    <Text style={styles.menuSubtitle}>Partagez votre code avec les membres de votre famille</Text>
  </View>
  <MaterialCommunityIcons name="chevron-right" size={24} color="#666" />
</TouchableOpacity>
// ...existing code...
```

### 2.3. Ajouter `FamilyCodeScreen` au système de navigation

1. **Créer ou vérifier l'existence de `FamilyCodeScreen`** :
   - Assurez-vous que le fichier `FamilyCodeScreen.js` existe et qu'il exporte un composant React valide.

2. **Enregistrer `FamilyCodeScreen` dans le système de navigation** :
   - Ajoutez l'écran dans le fichier `AppNavigator.js` ou `App.js`.
   - Exemple :

```javascript
import FamilyCodeScreen from '../screens/FamilyCodeScreen';

<Stack.Screen 
  name="FamilyCodeScreen" 
  component={FamilyCodeScreen} 
  options={{ title: 'Mon Code Famille' }} 
/>
```

3. **Naviguer vers `FamilyCodeScreen`** :
   - Dans `FamilySettingsScreen.js`, configurez le bouton "Partager mon code famille" pour naviguer vers `FamilyCodeScreen` :

```javascript
<TouchableOpacity 
  style={styles.menuItem}
  onPress={() => navigation.navigate('FamilyCodeScreen')}
>
  <MaterialCommunityIcons name="share-variant" size={32} color="#4285F4" />
  <View style={styles.menuTextContainer}>
    <Text style={styles.menuTitle}>Partager mon code famille</Text>
    <Text style={styles.menuSubtitle}>Partagez votre code avec les membres de votre famille</Text>
  </View>
  <MaterialCommunityIcons name="chevron-right" size={24} color="#666" />
</TouchableOpacity>
```

### 2.4. Afficher des informations supplémentaires dans `FamilyCodeScreen`

1. **Afficher le `userId`** :
   - Ajoutez une section pour afficher l'identifiant utilisateur (`userId`) dans `FamilyCodeScreen`.
   - Exemple :

```javascript
<View style={styles.codeContainer}>
  <Text style={styles.codeLabel}>Partagez ce code avec votre famille:</Text>
  <Text style={styles.codeText}>{familyData?.familyCode}</Text>
  <Text style={styles.codeInfo}>
    Votre famille aura également besoin de connaître votre nom, qui est <Text style={styles.nameText}>"{familyData?.familyName}"</Text>.
  </Text>
  <Text style={styles.codeLabel}>Votre identifiant utilisateur :</Text>
  <Text style={styles.codeText}>{familyData?.userId}</Text>
</View>

const styles = StyleSheet.create({
  nameText: {
    color: 'blue',
    fontWeight: 'bold',
  },
});
```

2. **Mettre en valeur le nom** :
   - Utilisez un style pour afficher le nom de la famille en bleu et en gras.

### 3. Points importants

*   **Collection Firebase** : Assurez-vous d'utiliser la bonne collection dans Firebase (soit `users`, soit `familyProfiles`).
*   **Sécurité** : Protégez les données sensibles et utilisez des règles de sécurité Firebase appropriées.
*   **Gestion des erreurs** : Gérez les erreurs potentielles (par exemple, problèmes de connexion réseau, données invalides) et affichez des messages d'erreur clairs à l'utilisateur.
*   **Tests** : Testez soigneusement toutes les fonctionnalités pour vous assurer qu'elles fonctionnent correctement.

En suivant ces instructions, vous devriez être en mesure d'implémenter le `familyCode` avec succès et de permettre aux membres de la famille de se connecter facilement à leur compte existant.