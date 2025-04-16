import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const ContactDetailScreen = ({ route, navigation }) => {
  const { familyId, seniorId } = route.params;
  const [contactDetails, setContactDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // États pour les champs modifiables
  const [relationship, setRelationship] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadContactDetails();
  }, []);

  const loadContactDetails = async () => {
    if (!seniorId || !familyId) {
      Alert.alert("Erreur", "Informations manquantes");
      navigation.goBack();
      return;
    }

    try {
      const seniorRef = doc(db, 'users', seniorId);
      const seniorSnap = await getDoc(seniorRef);

      if (seniorSnap.exists()) {
        const seniorData = seniorSnap.data();
        const contact = (seniorData.familyContacts || [])
          .find(c => c.familyId === familyId);

        if (contact) {
          setContactDetails(contact);
          setRelationship(contact.relationship || '');
          setPhone(contact.phone || '');
          setNotes(contact.notes || '');
        }
      }
    } catch (error) {
      console.error("Erreur chargement contact:", error);
      Alert.alert("Erreur", "Impossible de charger les détails");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (isLoading || isSaving) return;
    setIsSaving(true);

    try {
      const seniorRef = doc(db, 'users', seniorId);
      const seniorSnap = await getDoc(seniorRef);

      if (!seniorSnap.exists()) throw new Error("Senior non trouvé");

      const seniorData = seniorSnap.data();
      const contacts = seniorData.familyContacts || [];
      const contactIndex = contacts.findIndex(c => c.familyId === familyId);

      if (contactIndex === -1) throw new Error("Contact non trouvé");

      // Mettre à jour le contact
      contacts[contactIndex] = {
        ...contacts[contactIndex],
        relationship: relationship.trim(),
        phone: phone.trim(),
        notes: notes.trim(),
        lastUpdated: new Date()
      };

      await updateDoc(seniorRef, { familyContacts: contacts });
      setContactDetails(contacts[contactIndex]);
      setIsEditing(false);
      Alert.alert("Succès", "Contact mis à jour");
    } catch (error) {
      console.error("Erreur sauvegarde:", error);
      Alert.alert("Erreur", "Impossible de sauvegarder les modifications");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#4285F4" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <MaterialCommunityIcons 
            name="account-circle" 
            size={64} 
            color="#4285F4" 
          />
          <Text style={styles.name}>
            {contactDetails?.familyFirstName} {contactDetails?.familyName}
          </Text>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => setIsEditing(!isEditing)}
          >
            <MaterialCommunityIcons 
              name={isEditing ? "close" : "pencil"} 
              size={24} 
              color={isEditing ? "#FF4444" : "#4285F4"} 
            />
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Lien de parenté</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={relationship}
                onChangeText={setRelationship}
                placeholder="Ex: Fille, Cousin..."
              />
            ) : (
              <Text style={styles.value}>{relationship || '(Non défini)'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Téléphone</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Numéro de téléphone"
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.value}>{phone || '(Non défini)'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Notes</Text>
            {isEditing ? (
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Notes personnelles..."
                multiline
                numberOfLines={4}
              />
            ) : (
              <Text style={styles.value}>{notes || '(Aucune note)'}</Text>
            )}
          </View>

          {isEditing && (
            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.saveButtonText}>Enregistrer</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 25, // Plus d'espace
  },
  header: {
    alignItems: 'center',
    marginBottom: 35,
    backgroundColor: '#f0f6ff', // Fond légèrement bleuté
    padding: 20,
    borderRadius: 15,
  },
  name: {
    fontSize: 32, // Plus grand
    fontWeight: 'bold',
    color: '#2B2B2B',
    marginTop: 15,
    textAlign: 'center',
  },
  editButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 15, // Zone de toucher plus grande
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  form: {
    gap: 25, // Plus d'espace entre les champs
  },
  field: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#e1e1e1',
    marginBottom: 15,
  },
  label: {
    fontSize: 20, // Plus grand
    color: '#4285F4',
    marginBottom: 10,
    fontWeight: '600',
  },
  value: {
    fontSize: 24, // Encore plus grand pour la lecture
    color: '#2B2B2B',
    lineHeight: 32,
  },
  input: {
    fontSize: 24, // Cohérent avec value
    color: '#2B2B2B',
    borderBottomWidth: 2,
    borderBottomColor: '#4285F4',
    paddingVertical: 10,
    marginTop: 5,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 30,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export default ContactDetailScreen;
