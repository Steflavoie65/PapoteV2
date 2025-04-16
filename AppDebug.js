import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, Platform } from 'react-native';

export default function AppDebug() {
  const [error, setError] = useState(null);
  const [info, setInfo] = useState({
    platform: Platform.OS,
    version: Platform.Version,
    time: new Date().toISOString()
  });

  useEffect(() => {
    // Capture les erreurs non gérées
    const errorHandler = (error) => {
      setError(error.message);
      return true;
    };

    // Ajoute le gestionnaire d'erreurs
    const subscription = global.ErrorUtils.setGlobalHandler(errorHandler);

    return () => {
      // Nettoie lors du démontage
      global.ErrorUtils.setGlobalHandler(subscription);
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Papote - Debug</Text>
        
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Erreur détectée:</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <Text style={styles.subtitle}>Aucune erreur détectée</Text>
        )}

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>Informations:</Text>
          <Text>Plateforme: {info.platform}</Text>
          <Text>Version: {info.version}</Text>
          <Text>Heure: {info.time}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#4285F4',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 15,
    borderRadius: 8,
    marginVertical: 20,
    width: '100%',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 8,
  },
  errorText: {
    color: '#d32f2f',
  },
  infoContainer: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    width: '100%',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 8,
  },
});
