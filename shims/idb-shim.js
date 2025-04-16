// Shim pour remplacer idb dans l'environnement React Native
module.exports = {
  // Fournir une implémentation vide des fonctions idb
  // qui seront appelées par Firebase
  open: () => Promise.resolve(null),
  deleteDB: () => Promise.resolve(null),
  openDB: () => Promise.resolve({
    transaction: () => ({}),
    objectStoreNames: { contains: () => false },
    close: () => {}
  })
};