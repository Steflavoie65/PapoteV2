import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// ... autres imports d'écrans ...
import RegisterSeniorScreen from '../screens/RegisterSeniorScreen';
import SeniorHomeScreen from '../screens/SeniorHomeScreen';
import SeniorCodeScreen from '../screens/SeniorCodeScreen';
import SeniorRequestsScreen from '../screens/SeniorRequestsScreen';
import FamilyContactsScreen from '../screens/FamilyContactsScreen';
import ContactDetailScreen from '../screens/ContactDetailScreen'; // <-- Importer le nouvel écran
import SeniorDetailScreen from '../screens/SeniorDetailScreen'; // <-- Importer le nouvel écran
import FamilyCodeScreen from '../screens/FamilyCodeScreen'; // <-- Importer le nouvel écran
import ChatScreen from '../screens/ChatScreen'; // <-- Importer le nouvel écran
import SeniorSettingsScreen from '../screens/SeniorSettingsScreen'; // <-- Importer le nouvel écran
import SeniorProfileScreen from '../screens/SeniorProfileScreen'; // <-- Importer le nouvel écran
import SeniorOptionsScreen from '../screens/SeniorOptionsScreen'; // <-- Importer le nouvel écran
// ... imports écrans Famille ...
import RegisterFamilyScreen from '../screens/RegisterFamilyScreen';
import FamilyHomeScreen from '../screens/FamilyHomeScreen';
import ConnectSeniorScreen from '../screens/ConnectSeniorScreen';
import SeniorListScreen from '../screens/SeniorListScreen';
import FamilyProfileScreen from '../screens/FamilyProfileScreen'; // <-- Importer le nouvel écran
import FirstChoiceScreen from '../screens/FirstChoiceScreen'; // <-- Importer le nouvel écran
import FamilySettingsScreen from '../screens/FamilySettingsScreen'; // <-- Importer le nouvel écran
import FamilyOptionsScreen from '../screens/FamilyOptionsScreen'; // <-- Importer le nouvel écran


const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  return (
    <Stack.Navigator initialRouteName="FirstChoice">
      <Stack.Screen name="FirstChoice" component={FirstChoiceScreen} options={{ title: 'Choix Initial' }} />
      {/* Flux Senior */}
      <Stack.Screen name="RegisterSenior" component={RegisterSeniorScreen} options={{ title: 'Inscription Senior' }} />
      <Stack.Screen name="SeniorHome" component={SeniorHomeScreen} options={{ title: 'Accueil Senior', headerShown: false }} />
      <Stack.Screen name="SeniorCode" component={SeniorCodeScreen} options={{ title: 'Mon Code' }} />
      <Stack.Screen name="SeniorRequestsScreen" component={SeniorRequestsScreen} options={{ title: 'Demandes de Connexion' }} />
      <Stack.Screen name="FamilyContacts" component={FamilyContactsScreen} options={{ title: 'Ma Famille' }} />
      {/* Ajouter le nouvel écran ici */}
      <Stack.Screen
         name="ContactDetail"
         component={ContactDetailScreen}
         options={({ route }) => ({
           // Optionnel: Mettre le nom du contact dans le titre
           title: 'Détails du Contact', // Titre par défaut
           // Vous pourriez essayer de passer le nom via params pour un titre dynamique,
           // mais cela nécessite de passer le nom depuis FamilyContactsScreen
           // title: route.params?.contactName || 'Détails du Contact',
           // Animation de transition plus douce
           animation: 'slide_from_right',
           headerBackTitle: 'Retour'
         })}
      />
      <Stack.Screen 
        name="SeniorDetail" 
        component={SeniorDetailScreen}
        options={{ 
          title: 'Détails du Senior',
          headerBackTitle: 'Retour'
        }}
      />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ title: 'Chat' }} />
      <Stack.Screen name="SeniorSettings" component={SeniorSettingsScreen} options={{ title: 'Paramètres Senior' }} />
      <Stack.Screen name="SeniorAccount" component={SeniorProfileScreen} options={{ title: 'Mon Compte Senior' }} />
      <Stack.Screen name="SeniorOptions" component={SeniorOptionsScreen} options={{ title: 'Options Senior' }} />


      {/* Flux Famille */}
      <Stack.Screen name="RegisterFamily" component={RegisterFamilyScreen} options={{ title: 'Inscription Famille' }} />
      <Stack.Screen name="FamilyHome" component={FamilyHomeScreen} options={{ title: 'Accueil Famille', headerShown: false }} />
      <Stack.Screen name="ConnectSenior" component={ConnectSeniorScreen} options={{ title: 'Connecter un Senior' }} />
      <Stack.Screen name="SeniorList" component={SeniorListScreen} options={{ title: 'Mes Seniors' }} />
      <Stack.Screen name="FamilyCodeScreen" component={FamilyCodeScreen} options={{ title: 'Mon Code Famille' }} />
      <Stack.Screen name="FamilyAccount" component={FamilyProfileScreen} options={{ title: 'Mon Compte Famille' }} />
      <Stack.Screen name="FamilySettings" component={FamilySettingsScreen} options={{ title: 'Paramètres Famille' }} />
      <Stack.Screen name="FamilyOptions" component={FamilyOptionsScreen} options={{ title: 'Options Famille' }} />

      {/* Écrans communs (Messages, Photos) pourraient être ici ou dans des Tab Navigators */}
      {/* <Stack.Screen name="Messages" component={MessagesScreen} /> */}
      {/* <Stack.Screen name="Photos" component={PhotosScreen} /> */}

    </Stack.Navigator>
  );
};

export default AppNavigator;
