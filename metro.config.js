// Metro configuration for React Native
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const defaultConfig = getDefaultConfig(__dirname);
const { resolver: { sourceExts, assetExts } } = defaultConfig;

module.exports = {
  ...defaultConfig,
  resolver: {
    ...defaultConfig.resolver,
    sourceExts,
    assetExts,
    extraNodeModules: {
      // Fournir des fallbacks pour les modules web
      'idb': path.resolve(__dirname, './shims/idb-shim.js'),
    }
  }
};
