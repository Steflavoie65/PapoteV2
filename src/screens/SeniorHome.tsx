import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SeniorHome() {
  const [userCode, setUserCode] = useState<string>('');

  useEffect(() => {
    AsyncStorage.getItem('userCode').then(code => code && setUserCode(code));
  }, []);

  // ...existing UI code...
}
