import React from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { deleteContact } from '../services/contactService'; // Assurez-vous d'avoir une fonction pour supprimer un contact dans votre backend

const ContactsScreen = ({ contacts, refreshContacts }) => {
  const handleDeleteContact = (contactId) => {
    Alert.alert(
      'Confirmation',
      'Êtes-vous sûr de vouloir supprimer ce contact ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteContact(contactId); // Supprime le contact dans la base de données
              refreshContacts(); // Rafraîchit la liste des contacts après suppression
            } catch (error) {
              console.error('Erreur lors de la suppression du contact:', error);
              Alert.alert('Erreur', 'Impossible de supprimer le contact.');
            }
          },
        },
      ]
    );
  };

  const renderContact = ({ item }) => (
    <View style={styles.contactItem}>
      <Text style={styles.contactName}>{item.name}</Text>
      <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteContact(item.id)}>
        <MaterialCommunityIcons name="delete" size={24} color="red" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={contacts}
        keyExtractor={(item) => item.id}
        renderItem={renderContact}
        contentContainerStyle={styles.list}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  list: {
    padding: 10,
  },
  contactItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  contactName: {
    fontSize: 16,
    color: '#333',
  },
  deleteButton: {
    padding: 5, // Ajout d'un padding pour éviter que l'icône soit masquée
  },
});

export default ContactsScreen;
