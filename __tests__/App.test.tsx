/**
 * @format
 */

import * as React from 'react';
import { render } from '@testing-library/react-native';
import App from '../App';

// Add type declarations for jest mocks
declare const jest: any;
declare const describe: any;
declare const it: any;

jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }: { children: any }) => children,
}));

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({ children }: { children: any }) => children,
    Screen: () => null,
  }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: () => Promise.resolve(null),
}));

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);
  });
});
