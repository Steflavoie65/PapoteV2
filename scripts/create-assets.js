const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '..', 'assets');

// Créer le dossier assets s'il n'existe pas
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir);
}

// Fonction pour copier un fichier d'image par défaut
function copyDefaultImage(targetFileName) {
  // Utiliser une image par défaut d'Expo si elle existe
  const defaultImage = path.join(__dirname, '..', 'node_modules', 'expo', 'assets', 'images', 'splash.png');
  
  if (fs.existsSync(defaultImage)) {
    fs.copyFileSync(defaultImage, path.join(assetsDir, targetFileName));
    console.log(`Créé ${targetFileName}`);
  } else {
    console.log(`Impossible de trouver une image par défaut. Créez manuellement ${targetFileName}`);
  }
}

// Créer les fichiers d'images requis
copyDefaultImage('icon.png');
copyDefaultImage('splash.png');
copyDefaultImage('adaptive-icon.png');

console.log('Terminé! Dossier assets créé avec des images par défaut.');
