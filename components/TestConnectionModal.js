import React, { useState } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

export const TestConnectionModal = ({ visible, onClose, onAccept, seniorCode, seniorName }) => {
  const [contactName, setContactName] = useState('');
  
  const handleAccept = () => {
    if (!contactName.trim()) {
      alert('Veuillez entrer un nom');
      return;
    }
    onAccept(contactName);
    setContactName('');
  };
  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>Mode développement</Text>
          
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>Code: <Text style={styles.valueText}>{seniorCode}</Text></Text>
            <Text style={styles.infoText}>Prénom: <Text style={styles.valueText}>{seniorName}</Text></Text>
          </View>
          
          <TextInput
            style={styles.input}
            placeholder="Nom du contact à ajouter"
            value={contactName}
            onChangeText={setContactName}
          />
          
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.acceptButton]}
              onPress={handleAccept}
            >
              <Text style={styles.acceptButtonText}>Ajouter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    width: '100%',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  infoContainer: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    width: '100%',
    marginBottom: 20,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 5,
  },
  valueText: {
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  button: {
    padding: 15,
    borderRadius: 10,
    width: '48%',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: 'bold',
  },
  acceptButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
