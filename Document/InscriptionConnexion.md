## Instructions pour ajouter les boutons "S'inscrire" et "Se connecter"

Ces instructions expliquent comment ajouter les boutons "S'inscrire" et "Se connecter" dans les écrans appropriés pour les seniors et les familles.

### 1. Écran SeniorOptionsScreen

Cet écran est affiché lorsqu'un utilisateur clique sur "Je suis un senior" et qu'aucun profil senior n'est trouvé dans AsyncStorage. Il contient deux boutons :

- **S'inscrire** : Redirige vers l'écran `RegisterSeniorScreen` pour créer un nouveau compte.
- **Se connecter** : Redirige vers l'écran `SeniorLoginScreen` pour se connecter à un compte existant.

#### Code pour SeniorOptionsScreen.js

```javascript
import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from 'react-native';

const SeniorOptionsScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Options Senior</Text>
      <TouchableOpacity 
        style={styles.button}
        onPress={() => navigation.navigate('RegisterSenior')}
      >
        <Text style={styles.buttonText}>S'inscrire</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.button}
        onPress={() => navigation.navigate('SeniorLogin')}
      >
        <Text style={styles.buttonText}>Se connecter</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#4285F4',
  },
  button: {
    backgroundColor: '#4285F4',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
    width: '80%',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SeniorOptionsScreen;
```

### 2. Écran FamilyOptionsScreen

Cet écran est affiché lorsqu'un utilisateur clique sur "Je suis de la famille" et qu'aucun profil famille n'est trouvé dans AsyncStorage. Il contient deux boutons :

- **S'inscrire** : Redirige vers l'écran `RegisterFamilyScreen` pour créer un nouveau compte.
- **Se connecter** : Redirige vers l'écran `FamilyLoginScreen` pour se connecter à un compte existant.

#### Code pour FamilyOptionsScreen.js

```javascript
import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from 'react-native';

const FamilyOptionsScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Options Famille</Text>
      <TouchableOpacity 
        style={styles.button}
        onPress={() => navigation.navigate('RegisterFamily')}
      >
        <Text style={styles.buttonText}>S'inscrire</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.button}
        onPress={() => navigation.navigate('FamilyLogin')}
      >
        <Text style={styles.buttonText}>Se connecter</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#4285F4',
  },
  button: {
    backgroundColor: '#4285F4',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
    width: '80%',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default FamilyOptionsScreen;
```

### 3. Configuration de la navigation

Assurez-vous que ces écrans sont correctement enregistrés dans votre système de navigation (par exemple, dans `App.js`) :

```javascript
import SeniorOptionsScreen from './screens/SeniorOptionsScreen';
import FamilyOptionsScreen from './screens/FamilyOptionsScreen';
import SeniorLoginScreen from './screens/SeniorLoginScreen';
import FamilyLoginScreen from './screens/FamilyLoginScreen';

// ...

<Stack.Screen name="SeniorOptions" component={SeniorOptionsScreen} options={{ title: 'Options Senior' }} />
<Stack.Screen name="FamilyOptions" component={FamilyOptionsScreen} options={{ title: 'Options Famille' }} />
<Stack.Screen name="SeniorLogin" component={SeniorLoginScreen} options={{ title: 'Se connecter' }} />
<Stack.Screen name="FamilyLogin" component={FamilyLoginScreen} options={{ title: 'Se connecter' }} />
```

Ces instructions devraient vous aider à remettre en place les boutons "S'inscrire" et "Se connecter" dans les écrans appropriés. Si vous avez des questions, n'hésitez pas à me les poser. 😊
