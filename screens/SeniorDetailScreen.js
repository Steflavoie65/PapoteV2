import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, SafeAreaView, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const SeniorDetailScreen = ({ route, navigation }) => {
  const { seniorId, familyId } = route.params;
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [seniorDetails, setSeniorDetails] = useState(null);

  // États pour les champs modifiables
  const [relationship, setRelationship] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [seniorName, setSeniorName] = useState('');

  useEffect(() => {
    loadSeniorDetails();
  }, []);

  const loadSeniorDetails = async () => {
    try {
      const familyRef = doc(db, 'users', familyId);
      const familyDoc = await getDoc(familyRef);
      
      if (familyDoc.exists()) {
        const seniorContacts = familyDoc.data().seniorContacts || [];
        const senior = seniorContacts.find(s => s.seniorId === seniorId);
        
        if (senior) {
          setSeniorDetails(senior);
          setRelationship(senior.relationship || '');
          setPhone(senior.phone || '');
          setNotes(senior.notes || '');
        }
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger les détails');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const familyRef = doc(db, 'users', familyId);
      const familyDoc = await getDoc(familyRef);
      
      if (familyDoc.exists()) {
        const seniorContacts = familyDoc.data().seniorContacts || [];
        const updatedContacts = seniorContacts.map(contact => {
          if (contact.seniorId === seniorId) {
            return {
              ...contact,
              relationship: relationship.trim(),
              phone: phone.trim(),
              notes: notes.trim(),
              lastUpdated: new Date()
            };
          }
          return contact;
        });

        await updateDoc(familyRef, { seniorContacts: updatedContacts });
        Alert.alert('Succès', 'Informations mises à jour');
        setIsEditing(false);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sauvegarder les modifications');
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
          <MaterialCommunityIcons name="account-details" size={50} color="#4285F4" />
          <Text style={styles.name}>{seniorDetails?.firstName || 'Senior'}</Text>
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
                placeholder="Ex: Grand-père, Tante..."
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
    padding: 25,
  },
  header: {
    alignItems: 'center',
    marginBottom: 35,
    backgroundColor: '#f0f6ff',
    padding: 20,
    borderRadius: 15,
  },
  name: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2B2B2B',
    marginTop: 15,
    textAlign: 'center',
  },
  editButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 15,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  form: {
    gap: 25,
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
    fontSize: 20,
    color: '#4285F4',
    marginBottom: 10,
    fontWeight: '600',
  },
  value: {
    fontSize: 24,
    color: '#2B2B2B',
    lineHeight: 32,
  },
  input: {
    fontSize: 24,
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
  saveButtonDisabled: {
    backgroundColor: '#A5D6A7',
  },
});

export default SeniorDetailScreen;
