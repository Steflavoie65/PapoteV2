// Importer directement depuis le fichier Firebase centralisé
import { app, auth, db, storage, notifyDevice } from '../utils/Firebase';

// Re-exporter pour maintenir la compatibilité avec le code existant
export { app, auth, db, storage, notifyDevice };
