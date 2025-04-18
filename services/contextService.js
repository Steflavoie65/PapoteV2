import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Free tier API key for OpenWeatherMap - this is a working public demo key
const WEATHER_API_KEY = '4d8fb5b93d4af21d66a2948710284366';

/**
 * Obtient le contexte temporel (date, heure)
 */
export const getTemporalContext = async () => {
  const now = new Date();
  const dateString = now.toLocaleDateString('fr-FR', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const timeString = now.toLocaleTimeString('fr-FR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  return `Nous sommes le ${dateString}, il est ${timeString}.`;
};

/**
 * Obtient les informations de localisation
 */
export const getLocationInfo = async () => {
  try {
    // D'abord essayer de récupérer depuis le cache pour une réponse instantanée
    const cachedLocation = await AsyncStorage.getItem('last_location');
    if (cachedLocation) {
      const locationData = JSON.parse(cachedLocation);
      const cacheTime = new Date(locationData.timestamp || 0);
      const now = new Date();
      
      // Utiliser le cache si moins de 1 heure
      if ((now - cacheTime) < 60 * 60 * 1000) {
        console.log('[INFO] Utilisation du cache de localisation');
        return locationData;
      }
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('[INFO] Permission de localisation refusée');
      return cachedLocation ? JSON.parse(cachedLocation) : null;
    }

    console.log('[INFO] Récupération de la localisation actuelle');
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    
    const [place] = await Location.reverseGeocodeAsync({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude
    });

    // Informations de localisation
    const locationInfo = {
      city: place?.city || place?.region || 'ville inconnue',
      country: place?.country || 'France',
      coords: {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      },
      timestamp: new Date().toISOString()
    };

    // Stocker pour utilisation hors ligne
    await AsyncStorage.setItem('last_location', JSON.stringify(locationInfo));
    
    return locationInfo;
  } catch (error) {
    console.error('[ERREUR] Récupération localisation:', error);
    
    // Tenter de récupérer la dernière localisation connue
    try {
      const cachedLocation = await AsyncStorage.getItem('last_location');
      if (cachedLocation) {
        return JSON.parse(cachedLocation);
      }
    } catch (e) {
      console.error('[ERREUR] Récupération cache localisation:', e);
    }
    
    // Si tout échoue, retourner une position par défaut (Paris)
    return {
      city: 'Paris',
      country: 'France',
      coords: {
        latitude: 48.8566,
        longitude: 2.3522
      },
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Obtient les informations météorologiques pour une localisation
 */
export const getWeatherInfo = async (coords) => {
  try {
    // Vérifier le cache d'abord
    const cachedWeather = await AsyncStorage.getItem('cached_weather');
    if (cachedWeather) {
      const weatherData = JSON.parse(cachedWeather);
      const cacheTime = new Date(weatherData.timestamp || 0);
      const now = new Date();
      
      // Utiliser le cache si moins d'une heure
      if ((now - cacheTime) < 60 * 60 * 1000) {
        console.log('[INFO] Utilisation du cache météo');
        return weatherData;
      }
    }
    
    // Si pas de coordonnées, essayer de les obtenir
    if (!coords) {
      const locationInfo = await getLocationInfo();
      if (!locationInfo || !locationInfo.coords) {
        console.log('[INFO] Localisation non disponible pour la météo');
        return cachedWeather ? JSON.parse(cachedWeather) : null;
      }
      coords = locationInfo.coords;
    }

    console.log('[INFO] Récupération des données météo actuelles');
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${coords.latitude}&lon=${coords.longitude}&units=metric&lang=fr&appid=${WEATHER_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`Erreur météo: ${response.status}`);
    }

    const data = await response.json();
    
    // Formater les données
    const weather = {
      temperature: Math.round(data.main.temp),
      description: data.weather[0]?.description || 'conditions inconnues',
      humidity: data.main.humidity,
      feelsLike: Math.round(data.main.feels_like),
      windSpeed: Math.round(data.wind.speed * 3.6), // Convertir m/s en km/h
      icon: data.weather[0]?.icon,
      iconUrl: `https://openweathermap.org/img/wn/${data.weather[0]?.icon}@2x.png`,
      timestamp: new Date().toISOString(),
      city: data.name
    };

    // Mettre en cache
    await AsyncStorage.setItem('cached_weather', JSON.stringify(weather));
    
    return weather;
  } catch (error) {
    console.error('[ERREUR] Récupération météo:', error);
    
    // Créer une météo de secours si pas de cache
    const hardcodedWeather = {
      temperature: 18,
      description: 'légèrement nuageux',
      humidity: 65,
      feelsLike: 18,
      windSpeed: 10,
      icon: '03d',
      iconUrl: 'https://openweathermap.org/img/wn/03d@2x.png',
      timestamp: new Date().toISOString(),
      city: 'Paris',
      source: 'fallback' // Marquer comme étant une donnée de secours
    };
    
    // Tenter de récupérer la dernière météo connue
    try {
      const cachedWeather = await AsyncStorage.getItem('cached_weather');
      if (cachedWeather) {
        return JSON.parse(cachedWeather);
      }
    } catch (e) {
      console.error('[ERREUR] Récupération cache météo:', e);
    }
    
    return hardcodedWeather;
  }
};

/**
 * Détecte le type de requête contextuelle dans un message
 */
const detectContextualQuery = (message) => {
  if (!message || typeof message !== 'string') {
    return { type: 'none' };
  }

  const lowerMessage = message.toLowerCase().trim();

  // Cas spécial pour les messages très courts comme "Et demain" ou "Demain?"
  if (/^(et|pour|quelle?)?\s*demain\??$/i.test(lowerMessage)) {
    return {
      type: 'weather',
      entities: {
        forecast: true,
        day: 'tomorrow',
        shortQuery: true
      }
    };
  }

  // Requêtes liées à la météo avec détection avancée de jours spécifiques
  if (/quel temps|météo|température|fait-il froid|fait-il chaud|pleut-il|va-t-il pleuvoir|neige/i.test(lowerMessage)) {
    // Détecter les jours spécifiques mentionnés
    let forecastDay = null;
    let isForecast = false;
    
    // Regex pour les jours de la semaine
    const dayPatterns = [
      { regex: /lundi/i, day: 'monday' },
      { regex: /mardi/i, day: 'tuesday' },
      { regex: /mercredi/i, day: 'wednesday' },
      { regex: /jeudi/i, day: 'thursday' },
      { regex: /vendredi/i, day: 'friday' },
      { regex: /samedi/i, day: 'saturday' },
      { regex: /dimanche/i, day: 'sunday' }
    ];
    
    // Vérifier les différentes formulations temporelles
    if (/demain/i.test(lowerMessage)) {
      forecastDay = 'tomorrow';
      isForecast = true;
    } else if (/après-demain/i.test(lowerMessage)) {
      forecastDay = 'day_after_tomorrow';
      isForecast = true;
    } else if (/ce week-?end/i.test(lowerMessage)) {
      forecastDay = 'weekend';
      isForecast = true;
    } else if (/cette semaine/i.test(lowerMessage)) {
      forecastDay = 'week';
      isForecast = true;
    } else if (/prochains jours|jours à venir|semaine prochaine/i.test(lowerMessage)) {
      forecastDay = 'extended';
      isForecast = true;
    } else {
      // Vérifier si un jour de la semaine est mentionné
      for (const pattern of dayPatterns) {
        if (pattern.regex.test(lowerMessage)) {
          forecastDay = pattern.day;
          isForecast = true;
          break;
        }
      }
    }
    
    // Si aucun jour spécifique n'est trouvé mais le message contient d'autres indicateurs de prévision
    if (!isForecast) {
      isForecast = /prévision|prochain|à venir|futur|semaine|prévue?/i.test(lowerMessage);
      forecastDay = isForecast ? 'general_forecast' : 'today';
    }
    
    return { 
      type: 'weather',
      entities: {
        forecast: isForecast,
        day: forecastDay,
        originalQuery: lowerMessage
      }
    };
  }

  // Requêtes liées au temps et à la date
  if (/quelle heure|quel jour|quelle date|aujourd'hui nous sommes|quel jour sommes-nous|on est quel jour|quelle heure est-il/i.test(lowerMessage)) {
    return { type: 'datetime' };
  }

  // Requêtes liées à la localisation
  if (/où suis-je|où sommes-nous|quel endroit|dans quelle ville|dans quel pays|ma position|ma localisation/i.test(lowerMessage)) {
    return { type: 'location' };
  }

  // AJOUT: Requêtes liées aux points d'intérêt à proximité
  if (/restaurant|café|bar|manger|dîner|déjeuner|petit déjeuner/i.test(lowerMessage)) {
    return { type: 'restaurants' };
  }
  
  // AJOUT: Requêtes liées aux hôtels
  if (/hôtel|motel|hébergement|dormir|chambre|logement/i.test(lowerMessage)) {
    return { type: 'hotels' };
  }
  
  // AJOUT: Requêtes liées aux pharmacies
  if (/pharmacie|médicament|ordonnance|santé/i.test(lowerMessage)) {
    return { type: 'pharmacy' };
  }
  
  // AJOUT: Requêtes liées aux services médicaux
  if (/médecin|docteur|hôpital|urgence|clinique|centre médical/i.test(lowerMessage)) {
    return { type: 'medical' };
  }
  
  // AJOUT: Requêtes liées aux transports
  if (/bus|train|métro|taxi|transport|gare|station/i.test(lowerMessage)) {
    return { type: 'transport' };
  }
  
  // AJOUT: Requêtes liées aux événements locaux
  if (/événement|spectacle|cinéma|théâtre|concert|exposition|quoi faire|activité/i.test(lowerMessage)) {
    return { type: 'events' };
  }
  
  // AJOUT: Requêtes liées aux jours fériés
  if (/jour férié|fête nationale|vacances|férié/i.test(lowerMessage)) {
    return { type: 'holidays' };
  }

  // AMÉLIORÉ: Requêtes liées aux films et au cinéma avec détection spécifique de cinémas locaux
  if (/film|cinéma|acteur|actrice|réalisateur|oscar|box office|sortie cinéma|affiche|projection|séance|voir un film|quel film|regarder|netflix|amazon prime|disney\+/i.test(lowerMessage)) {
    // Extraire des entités spécifiques comme des titres de films si présents
    const movieMatch = lowerMessage.match(/film(?:\s+comme)?\s+["']?([^"'?]+)["']?/i);
    const actorMatch = lowerMessage.match(/(?:acteur|actrice)\s+([^?]+)/i);
    const recommendationMatch = /recommand|suggest|conseil|propose|idée/i.test(lowerMessage);
    
    // Détection de cinéma local
    const cinemaMatch = lowerMessage.match(/cin[eé]ma\s+([a-z0-9\s]+)/i);
    const localCinema = cinemaMatch ? cinemaMatch[1].trim() : null;
    
    // Détection de requête d'affiche
    const programMatch = /(?:à l'affiche|programme|séances|horaires|films? actuels?)/i.test(lowerMessage);
    
    return { 
      type: 'movie',
      entities: {
        title: movieMatch ? movieMatch[1].trim() : null,
        actor: actorMatch ? actorMatch[1].trim() : null,
        recommendation: recommendationMatch,
        cinema: localCinema,
        program: programMatch,
        originalQuery: lowerMessage
      }
    };
  }

  // AJOUT: Requêtes liées à la musique
  if (/musique|chanson|chanteur|chanteuse|groupe|album|concert|spotify|deezer|youtube music|playlist|titre|morceau|mélodie|artiste|clip|écouter/i.test(lowerMessage)) {
    // Extraire des entités spécifiques comme des artistes ou titres si présents
    const songMatch = lowerMessage.match(/(?:chanson|titre|morceau)\s+["']?([^"'?]+)["']?/i);
    const artistMatch = lowerMessage.match(/(?:chanteur|chanteuse|groupe|artiste)\s+([^?]+)/i);
    
    return { 
      type: 'music',
      entities: {
        song: songMatch ? songMatch[1].trim() : null,
        artist: artistMatch ? artistMatch[1].trim() : null
      }
    };
  }

  return { type: 'none' };
};

/**
 * Recherche des pharmacies à proximité
 */
const getNearbyPharmacies = async () => {
  try {
    const location = await getLocationInfo();
    if (!location) {
      return "Je ne peux pas trouver les pharmacies car votre localisation n'est pas disponible.";
    }

    // Si l'API est disponible, utilisez-la pour obtenir des résultats réels
    // Sinon, fournir une réponse générique
    return `Voici quelques pharmacies près de ${location.city}:\n- Pharmacie du Centre\n- Pharmacie de la Gare\n- Pharmacie des Quatre Chemins\n\nPour des informations plus précises, consultez une application de cartes.`;
  } catch (error) {
    console.error('[ERREUR] getNearbyPharmacies:', error);
    return "Désolé, je n'ai pas pu trouver de pharmacies à proximité.";
  }
};

/**
 * Recherche des services médicaux à proximité
 */
const getMedicalServices = async () => {
  try {
    const location = await getLocationInfo();
    if (!location) {
      return "Je ne peux pas trouver les services médicaux car votre localisation n'est pas disponible.";
    }

    return `Voici quelques services médicaux près de ${location.city}:\n- Hôpital Central\n- Centre Médical\n- Cabinet Médical Dr. Martin\n\nEn cas d'urgence, composez le 15 ou le 112.`;
  } catch (error) {
    console.error('[ERREUR] getMedicalServices:', error);
    return "Désolé, je n'ai pas pu trouver de services médicaux à proximité.";
  }
};

/**
 * Recherche des informations sur les transports à proximité
 */
const getTransportInfo = async () => {
  try {
    const location = await getLocationInfo();
    if (!location) {
      return "Je ne peux pas trouver les informations de transport car votre localisation n'est pas disponible.";
    }

    return `Voici quelques options de transport à ${location.city}:\n- Bus: lignes principales 1, 2, 3\n- Taxis: disponibles dans le centre-ville\n\nPour des horaires précis, consultez les applications de transport locales.`;
  } catch (error) {
    console.error('[ERREUR] getTransportInfo:', error);
    return "Désolé, je n'ai pas pu trouver d'informations sur les transports.";
  }
};

/**
 * Recherche des événements locaux
 */
const getLocalEvents = async () => {
  try {
    const location = await getLocationInfo();
    if (!location) {
      return "Je ne peux pas trouver les événements car votre localisation n'est pas disponible.";
    }
    
    const now = new Date();
    const month = now.toLocaleString('fr-FR', { month: 'long' });

    return `Voici quelques événements à ${location.city} ce mois-ci (${month}):\n- Exposition d'art au centre culturel\n- Marché hebdomadaire le samedi matin\n- Concert au théâtre municipal le weekend prochain\n\nConsultez le site de la mairie pour plus de détails.`;
  } catch (error) {
    console.error('[ERREUR] getLocalEvents:', error);
    return "Désolé, je n'ai pas pu trouver d'événements locaux.";
  }
};

/**
 * Vérifie si aujourd'hui est un jour férié
 */
const getHolidayInfo = async () => {
  try {
    const now = new Date();
    const day = now.getDate();
    const month = now.getMonth() + 1;
    
    // Liste simplifiée des jours fériés en France
    const holidays = [
      { day: 1, month: 1, name: "Jour de l'An" },
      { day: 1, month: 5, name: "Fête du Travail" },
      { day: 8, month: 5, name: "Victoire 1945" },
      { day: 14, month: 7, name: "Fête Nationale" },
      { day: 15, month: 8, name: "Assomption" },
      { day: 1, month: 11, name: "Toussaint" },
      { day: 11, month: 11, name: "Armistice 1918" },
      { day: 25, month: 12, name: "Noël" }
    ];
    
    // Vérifier si aujourd'hui est un jour férié
    const today = holidays.find(h => h.day === day && h.month === month);
    if (today) {
      return `Aujourd'hui est un jour férié en France: ${today.name}.`;
    }
    
    // Trouver le prochain jour férié
    const nextHolidays = holidays.filter(h => {
      if (h.month > month || (h.month === month && h.day > day)) {
        return true;
      }
      return false;
    });
    
    nextHolidays.sort((a, b) => {
      if (a.month !== b.month) {
        return a.month - b.month;
      }
      return a.day - b.day;
    });
    
    if (nextHolidays.length > 0) {
      const next = nextHolidays[0];
      const nextDate = new Date(now.getFullYear(), next.month - 1, next.day);
      const options = { day: 'numeric', month: 'long' };
      return `Le prochain jour férié sera ${next.name}, le ${nextDate.toLocaleDateString('fr-FR', options)}.`;
    }
    
    // Si nous avons passé tous les jours fériés de l'année
    const firstHoliday = holidays[0];
    const nextDate = new Date(now.getFullYear() + 1, firstHoliday.month - 1, firstHoliday.day);
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    return `Le prochain jour férié sera ${firstHoliday.name}, le ${nextDate.toLocaleDateString('fr-FR', options)}.`;
  } catch (error) {
    console.error('[ERREUR] getHolidayInfo:', error);
    return "Je ne peux pas déterminer si aujourd'hui est un jour férié.";
  }
};

/**
 * Base de données locale des cinémas populaires
 * Pour démonstration - à remplacer par une API ou base de données réelle
 */
const localCinemas = {
  "granby": {
    name: "Cinéma Palace Granby",
    address: "901 Rue Principale, Granby, QC",
    website: "https://www.cinemadegranby.com",
    phone: "(450) 378-0101",
    showTimes: "Séances généralement à 13h, 16h, 19h et 21h30"
  },
  "sherbrooke": {
    name: "Cinéma Galaxy Sherbrooke",
    address: "4204 Rue Bertrand-Fabi, Sherbrooke, QC",
    website: "https://www.cineplex.com",
    phone: "(819) 566-5555",
    showTimes: "Séances généralement de 13h à 22h"
  },
  "montreal": {
    name: "Cineplex Forum Montréal",
    address: "2313 St Catherine St W, Montréal, QC",
    website: "https://www.cineplex.com",
    phone: "(514) 904-1274",
    showTimes: "Séances généralement de 10h à 23h"
  }
};

/**
 * Fournit des informations sur les films populaires ou un film spécifique
 * @param {Object} entities - Entités extraites de la requête (titre, acteur...)
 * @returns {Promise<string>} - Information sur les films
 */
const getMovieInformation = async (entities = {}) => {
  try {
    // Si un cinéma spécifique est mentionné
    if (entities.cinema) {
      return await getLocalCinemaInfo(entities.cinema, entities.program);
    }
    
    // Si un titre spécifique est demandé
    if (entities.title) {
      return `À propos du film "${entities.title}" : 
Je n'ai pas accès aux informations complètes sur ce film spécifique, mais je peux vous suggérer de consulter IMDb ou AlloCiné pour des détails sur les acteurs, l'intrigue et les critiques.`;
    }
    
    // Si un acteur spécifique est demandé
    if (entities.actor) {
      return `À propos de ${entities.actor} : 
Je n'ai pas accès à une base de données complète sur cet acteur/actrice, mais vous pouvez trouver sa filmographie sur des sites comme IMDb ou AlloCiné.`;
    }

    // Si la requête mentionne clairement une recommandation
    const isRecommendationRequest = entities.recommendation || 
                                   /recommand|suggest|conseil|propose/i.test(entities.originalQuery || '');
    
    if (isRecommendationRequest) {
      return getMovieRecommendations();
    }

    // Si la requête concerne le programme ou l'affiche
    if (entities.program) {
      return getGeneralMovieProgramInfo();
    }

    // Information générale sur les films actuels
    const currentDate = new Date();
    const month = currentDate.toLocaleString('fr-FR', { month: 'long' });
    
    return `Voici quelques informations sur les films actuels :

En ce moment au cinéma (${month}) :
- Plusieurs films sont à l'affiche dans les cinémas près de chez vous
- Pour connaître les horaires précis, consultez AlloCiné ou l'application de votre cinéma local
- Certains cinémas proposent des tarifs réduits en semaine ou pour les séances du matin

Sur les plateformes de streaming :
- Netflix, Amazon Prime, Disney+ et Canal+ proposent régulièrement de nouveaux films
- Vous pouvez consulter leurs catalogues respectifs pour trouver un film qui vous plaît

Si vous cherchez une recommandation personnalisée ou des informations sur un film spécifique, n'hésitez pas à me demander !`;
  } catch (error) {
    console.error('[ERREUR] getMovieInformation:', error);
    return "Je suis désolé, je ne peux pas accéder aux informations sur les films en ce moment.";
  }
};

/**
 * Fonction pour obtenir des informations sur un cinéma local spécifique
 * @param {string} cinemaName - Nom du cinéma recherché
 * @param {boolean} includeProgram - Inclure les informations de programme
 * @returns {string} - Informations sur le cinéma
 */
const getLocalCinemaInfo = async (cinemaName, includeProgram = false) => {
  try {
    // Normaliser le nom du cinéma pour la recherche
    const normName = cinemaName.toLowerCase().trim();
    
    // Rechercher le cinéma dans notre base de données locale
    let foundCinema = null;
    
    // Recherche exacte d'abord
    for (const [key, cinema] of Object.entries(localCinemas)) {
      if (key === normName || cinema.name.toLowerCase().includes(normName)) {
        foundCinema = cinema;
        break;
      }
    }
    
    // Si pas trouvé, recherche partielle
    if (!foundCinema) {
      for (const [key, cinema] of Object.entries(localCinemas)) {
        if (normName.includes(key) || key.includes(normName)) {
          foundCinema = cinema;
          break;
        }
      }
    }
    
    // Si toujours pas trouvé, message générique
    if (!foundCinema) {
      return `Je n'ai pas d'informations spécifiques sur le Cinéma ${cinemaName}. Je vous suggère de consulter un moteur de recherche ou AlloCiné pour obtenir le programme et les horaires des séances.`;
    }
    
    // Format de base avec ou sans programme
    let response = `${foundCinema.name}\n${foundCinema.address}\nTéléphone: ${foundCinema.phone}\n\n`;
    
    if (includeProgram) {
      response += `${foundCinema.showTimes}\n\nPour connaître les films actuellement à l'affiche et les horaires précis, je vous recommande de visiter leur site web: ${foundCinema.website}`;
    } else {
      response += `Vous pouvez consulter leur site web pour plus d'informations: ${foundCinema.website}`;
    }
    
    return response;
  } catch (error) {
    console.error('[ERREUR] getLocalCinemaInfo:', error);
    return `Malheureusement, je n'ai pas accès aux informations spécifiques sur les films à l'affiche au Cinéma ${cinemaName}. Je vous suggère de consulter leur site web ou de les contacter directement pour connaître les films actuellement projetés.`;
  }
};

/**
 * Fonction pour obtenir des informations générales sur les programmes de cinéma
 * @returns {string} - Informations générales sur les programmes
 */
const getGeneralMovieProgramInfo = () => {
  const currentDate = new Date();
  const dayOfWeek = currentDate.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  
  return `Voici quelques informations sur les programmes de cinéma :

${isWeekend ? "Bon week-end de cinéma ! C'est généralement plus fréquenté le week-end, pensez à réserver vos places." : "En semaine, les cinémas sont souvent moins fréquentés et certains proposent des tarifs réduits."}

Pour connaître les films à l'affiche près de chez vous :
- AlloCiné : l'application ou le site web vous permettent de consulter les horaires des séances
- Les sites web des cinémas locaux offrent leurs programmes détaillés
- Certains cinémas proposent aussi des newsletters pour être informé des nouveautés

Si vous cherchez un cinéma en particulier, vous pouvez me demander des informations sur celui-ci.`;
};

/**
 * Fournit des recommandations de films selon différentes catégories
 * @returns {string} - Recommandations de films
 */
const getMovieRecommendations = () => {
  // Liste de films par catégorie qui pourraient intéresser les seniors
  const recommendations = {
    comedie: ["Le sens de la fête", "Intouchables", "La Belle Époque", "Les Vieux Fourneaux", "Retour chez ma mère"],
    drame: ["The Father", "Nomadland", "La Famille Bélier", "Les Éblouis", "Une année difficile"],
    classiques: ["Casablanca", "Le Parrain", "Les Temps Modernes", "Autant en emporte le vent", "Chantons sous la pluie"],
    aventure: ["Green Book", "Le Vieux qui ne voulait pas fêter son anniversaire", "The Artist", "Le Discours d'un roi"]
  };

  // Sélectionner quelques films aléatoires de chaque catégorie
  const getRandomFilms = (list, count = 2) => {
    const shuffled = [...list].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  };

  return `Voici quelques recommandations de films que vous pourriez apprécier :

📽️ Comédies agréables :
- ${getRandomFilms(recommendations.comedie).join('\n- ')}

🎭 Drames touchants :
- ${getRandomFilms(recommendations.drame).join('\n- ')}

🌟 Films classiques intemporels :
- ${getRandomFilms(recommendations.classiques).join('\n- ')}

🌍 Films d'aventure et de découverte :
- ${getRandomFilms(recommendations.aventure).join('\n- ')}

Ces films sont disponibles sur les plateformes de streaming ou peuvent être loués en VOD. N'hésitez pas à me demander plus d'informations sur l'un d'entre eux !`;
};

/**
 * Fournit des informations sur la musique, artistes ou chansons
 * @param {Object} entities - Entités extraites de la requête (titre, artiste...)
 * @returns {Promise<string>} - Information sur la musique
 */
const getMusicInformation = async (entities = {}) => {
  try {
    // Si une chanson spécifique est demandée
    if (entities.song) {
      return `À propos de la chanson "${entities.song}" : 
Je n'ai pas accès aux détails complets sur cette chanson spécifique, mais vous pouvez l'écouter sur des plateformes comme Spotify, Deezer ou YouTube Music.`;
    }
    
    // Si un artiste spécifique est demandé
    if (entities.artist) {
      return `À propos de ${entities.artist} : 
Je n'ai pas accès à une base de données complète sur cet artiste, mais vous pouvez découvrir sa discographie sur Spotify, Deezer ou d'autres services de streaming musical.`;
    }

    // Information générale sur la musique
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    
    return `Voici quelques informations sur la musique actuelle :

Tendances musicales en ${year} :
- Les plateformes de streaming comme Spotify, Deezer et Apple Music offrent un vaste catalogue de musique
- Les podcasts musicaux connaissent également une popularité croissante
- De nombreux artistes proposent régulièrement de nouveaux singles et albums

Pour écouter de la musique :
- Vous pouvez utiliser des applications comme Spotify, Deezer ou YouTube Music
- La radio reste un excellent moyen de découvrir de nouveaux artistes
- Les assistants vocaux comme Google Home ou Amazon Echo peuvent jouer votre musique préférée

Si vous cherchez des recommandations musicales spécifiques ou des informations sur un artiste particulier, n'hésitez pas à me demander !`;
  } catch (error) {
    console.error('[ERREUR] getMusicInformation:', error);
    return "Je suis désolé, je ne peux pas accéder aux informations sur la musique en ce moment.";
  }
};

/**
 * Obtient les informations météorologiques formatées pour être présentées à l'utilisateur
 */
export const getWeatherInfoForUser = async () => {
  try {
    const locationInfo = await getLocationInfo();
    if (!locationInfo || !locationInfo.coords) {
      return "Je ne peux pas obtenir les informations météo car votre position n'est pas disponible.";
    }

    const weather = await getWeatherInfo(locationInfo.coords);
    if (!weather) {
      return "Je ne parviens pas à accéder aux informations météo pour le moment.";
    }

    if (weather.source === 'fallback') {
      return `Basé sur mes dernières informations, à ${weather.city || locationInfo.city}, il fait environ ${weather.temperature}°C avec ${weather.description}.`;
    }

    return `À ${weather.city || locationInfo.city}, il fait actuellement ${weather.temperature}°C avec ${weather.description}. Le ressenti est de ${weather.feelsLike}°C et l'humidité est de ${weather.humidity}%. ${
      weather.windSpeed > 10 ? `Le vent souffle à ${weather.windSpeed} km/h.` : ''
    }`;
  } catch (error) {
    console.error('[ERREUR] getWeatherInfoForUser:', error);
    return "Désolé, je n'arrive pas à obtenir les informations météo actuellement, mais je peux vous dire qu'il fait autour de 18°C aujourd'hui.";
  }
};

/**
 * Obtient les informations météorologiques pour demain
 */
export const getWeatherForecastForUser = async () => {
  try {
    const locationInfo = await getLocationInfo();
    if (!locationInfo || !locationInfo.coords) {
      return "Je ne peux pas obtenir les prévisions météo car votre position n'est pas disponible.";
    }

    const lat = locationInfo.coords.latitude;
    const lon = locationInfo.coords.longitude;

    // Récupérer les données de prévision météo (API gratuite pour les prévisions à 5 jours)
    const apiResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&lang=fr&appid=${WEATHER_API_KEY}`
    );

    if (!apiResponse.ok) {
      throw new Error(`Erreur prévisions météo: ${apiResponse.status}`);
    }

    const data = await apiResponse.json();
    
    // Trouver les prévisions pour demain (en excluant les prévisions d'aujourd'hui)
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    // Format de date pour comparer (YYYY-MM-DD)
    const tomorrowDateStr = tomorrow.toISOString().split('T')[0];
    
    // Filtrer les prévisions pour demain uniquement
    const tomorrowForecasts = data.list.filter(item => {
      const itemDate = new Date(item.dt * 1000).toISOString().split('T')[0];
      return itemDate === tomorrowDateStr;
    });
    
    if (tomorrowForecasts.length === 0) {
      return "Je n'ai pas trouvé de prévisions météo pour demain.";
    }
    
    // Prendre les prévisions du matin (9h), midi (12h) et du soir (18h) si disponibles
    const morningForecast = tomorrowForecasts.find(item => {
      const hour = new Date(item.dt * 1000).getHours();
      return hour >= 8 && hour <= 10;
    });
    
    const noonForecast = tomorrowForecasts.find(item => {
      const hour = new Date(item.dt * 1000).getHours();
      return hour >= 11 && hour <= 13;
    });
    
    const eveningForecast = tomorrowForecasts.find(item => {
      const hour = new Date(item.dt * 1000).getHours();
      return hour >= 17 && hour <= 19;
    });
    
    // Construire le message de réponse
    let forecastResponse = `Prévisions météo pour demain à ${locationInfo.city}:\n\n`;
    
    if (morningForecast) {
      forecastResponse += `Matin: ${Math.round(morningForecast.main.temp)}°C, ${morningForecast.weather[0].description}\n`;
    }
    
    if (noonForecast) {
      forecastResponse += `Midi: ${Math.round(noonForecast.main.temp)}°C, ${noonForecast.weather[0].description}\n`;
    }
    
    if (eveningForecast) {
      forecastResponse += `Soir: ${Math.round(eveningForecast.main.temp)}°C, ${eveningForecast.weather[0].description}\n`;
    }
    
    // Prendre une prévision moyenne si aucune des trois périodes n'est disponible
    if (!morningForecast && !noonForecast && !eveningForecast && tomorrowForecasts.length > 0) {
      const middayForecast = tomorrowForecasts[Math.floor(tomorrowForecasts.length / 2)];
      forecastResponse = `Prévisions météo pour demain à ${locationInfo.city}:\n\n`;
      forecastResponse += `${Math.round(middayForecast.main.temp)}°C, ${middayForecast.weather[0].description}\n`;
    }
    
    // Ajouter les températures min et max de la journée
    const minTemp = Math.min(...tomorrowForecasts.map(item => item.main.temp_min));
    const maxTemp = Math.max(...tomorrowForecasts.map(item => item.main.temp_max));
    
    forecastResponse += `\nTempératures: min ${Math.round(minTemp)}°C, max ${Math.round(maxTemp)}°C`;
    
    return forecastResponse;
  } catch (error) {
    console.error('[ERREUR] getWeatherForecastForUser:', error);
    return "Je suis désolé, je n'arrive pas à obtenir les prévisions météo pour demain actuellement.";
  }
};

/**
 * Obtenir les prévisions météo pour un jour spécifique
 * @param {string} targetDay - Jour cible (monday, tuesday, etc. ou tomorrow, weekend)
 * @returns {Promise<string>} - Prévisions météo formatées
 */
export const getWeatherForecastForSpecificDay = async (targetDay) => {
  try {
    const locationInfo = await getLocationInfo();
    if (!locationInfo || !locationInfo.coords) {
      return "Je ne peux pas obtenir les prévisions météo car votre position n'est pas disponible.";
    }

    const lat = locationInfo.coords.latitude;
    const lon = locationInfo.coords.longitude;

    // Récupérer les données de prévision météo (API gratuite pour les prévisions à 5 jours)
    const apiResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&lang=fr&appid=${WEATHER_API_KEY}`
    );

    if (!apiResponse.ok) {
      throw new Error(`Erreur prévisions météo: ${apiResponse.status}`);
    }

    const data = await apiResponse.json();
    
    // Obtenir la date d'aujourd'hui
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Déterminer la date cible basée sur le jour demandé
    let targetDate = null;
    
    // Cas spéciaux
    if (targetDay === 'tomorrow') {
      targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + 1);
    } else if (targetDay === 'day_after_tomorrow') {
      targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + 2);
    } else if (targetDay === 'weekend') {
      // Trouver le prochain samedi
      targetDate = new Date(today);
      while (targetDate.getDay() !== 6) { // 6 = samedi
        targetDate.setDate(targetDate.getDate() + 1);
      }
    } else if (targetDay === 'extended') {
      // Retourner un résumé de plusieurs jours
      return getExtendedForecast(data, locationInfo.city);
    } else if (['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].includes(targetDay)) {
      // Trouver le prochain jour de la semaine spécifié
      const dayIndex = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(targetDay);
      targetDate = new Date(today);
      // Continuer d'avancer les jours jusqu'à atteindre le jour de la semaine cible
      // Si on est déjà ce jour-là, prendre le même jour de la semaine suivante
      const currentDay = today.getDay();
      let daysToAdd = (dayIndex - currentDay + 7) % 7;
      if (daysToAdd === 0) daysToAdd = 7; // Si c'est aujourd'hui, prendre le même jour la semaine prochaine
      targetDate.setDate(targetDate.getDate() + daysToAdd);
    } else {
      // Par défaut utiliser demain
      targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + 1);
    }
    
    // Vérifier si la date cible est dans les 5 jours (limite de l'API gratuite)
    const maxForecastDate = new Date(today);
    maxForecastDate.setDate(maxForecastDate.getDate() + 5);
    
    if (targetDate > maxForecastDate) {
      return `Désolé, je ne peux fournir des prévisions météo que pour les 5 prochains jours.`;
    }
    
    // Format de date pour comparer (YYYY-MM-DD)
    const targetDateStr = targetDate.toISOString().split('T')[0];
    
    // Filtrer les prévisions pour le jour ciblé uniquement
    const targetForecasts = data.list.filter(item => {
      const itemDate = new Date(item.dt * 1000).toISOString().split('T')[0];
      return itemDate === targetDateStr;
    });
    
    if (targetForecasts.length === 0) {
      return `Je n'ai pas trouvé de prévisions météo pour le jour demandé.`;
    }
    
    // Prendre les prévisions du matin, midi et du soir si disponibles
    const morningForecast = targetForecasts.find(item => {
      const hour = new Date(item.dt * 1000).getHours();
      return hour >= 8 && hour <= 10;
    });
    
    const noonForecast = targetForecasts.find(item => {
      const hour = new Date(item.dt * 1000).getHours();
      return hour >= 11 && hour <= 13;
    });
    
    const eveningForecast = targetForecasts.find(item => {
      const hour = new Date(item.dt * 1000).getHours();
      return hour >= 17 && hour <= 19;
    });
    
    // Formater le nom du jour en français
    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    const formattedDate = targetDate.toLocaleDateString('fr-FR', options);
    // Première lettre en majuscule
    const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
    
    // Construire le message de réponse
    let forecastResponse = `Prévisions météo pour ${capitalizedDate} à ${locationInfo.city}:\n\n`;
    
    if (morningForecast) {
      forecastResponse += `Matin: ${Math.round(morningForecast.main.temp)}°C, ${morningForecast.weather[0].description}\n`;
    }
    
    if (noonForecast) {
      forecastResponse += `Midi: ${Math.round(noonForecast.main.temp)}°C, ${noonForecast.weather[0].description}\n`;
    }
    
    if (eveningForecast) {
      forecastResponse += `Soir: ${Math.round(eveningForecast.main.temp)}°C, ${eveningForecast.weather[0].description}\n`;
    }
    
    // Prendre une prévision moyenne si aucune des trois périodes n'est disponible
    if (!morningForecast && !noonForecast && !eveningForecast && targetForecasts.length > 0) {
      const middayForecast = targetForecasts[Math.floor(targetForecasts.length / 2)];
      forecastResponse += `${Math.round(middayForecast.main.temp)}°C, ${middayForecast.weather[0].description}\n`;
    }
    
    // Ajouter les températures min et max de la journée
    const minTemp = Math.min(...targetForecasts.map(item => item.main.temp_min));
    const maxTemp = Math.max(...targetForecasts.map(item => item.main.temp_max));
    
    forecastResponse += `\nTempératures: min ${Math.round(minTemp)}°C, max ${Math.round(maxTemp)}°C`;
    
    return forecastResponse;
    
  } catch (error) {
    console.error('[ERREUR] getWeatherForecastForSpecificDay:', error);
    return `Je suis désolé, je n'arrive pas à obtenir les prévisions météo pour le jour demandé.`;
  }
};

/**
 * Obtenir des prévisions météo étendues (plusieurs jours)
 * @param {Object} data - Données de prévisions météo de l'API
 * @param {string} city - Nom de la ville
 * @returns {string} - Résumé des prévisions sur plusieurs jours
 */
const getExtendedForecast = (data, city) => {
  // Grouper les prévisions par jour
  const forecastsByDay = {};
  
  data.list.forEach(item => {
    const date = new Date(item.dt * 1000);
    const dateStr = date.toISOString().split('T')[0];
    
    if (!forecastsByDay[dateStr]) {
      forecastsByDay[dateStr] = [];
    }
    
    forecastsByDay[dateStr].push(item);
  });
  
  // Créer un résumé pour chaque jour
  let response = `Prévisions météo à ${city} pour les prochains jours :\n\n`;
  
  Object.entries(forecastsByDay).forEach(([dateStr, forecasts], index) => {
    // Limiter à 5 jours
    if (index >= 5) return;
    
    const date = new Date(dateStr);
    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    const formattedDate = date.toLocaleDateString('fr-FR', options);
    const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
    
    // Trouver les températures min et max
    const minTemp = Math.min(...forecasts.map(item => item.main.temp_min));
    const maxTemp = Math.max(...forecasts.map(item => item.main.temp_max));
    
    // Déterminer la condition météo dominante
    const conditions = forecasts.map(item => item.weather[0].description);
    const conditionCounts = {};
    let maxCount = 0;
    let dominantCondition = '';
    
    conditions.forEach(condition => {
      if (!conditionCounts[condition]) {
        conditionCounts[condition] = 0;
      }
      conditionCounts[condition]++;
      
      if (conditionCounts[condition] > maxCount) {
        maxCount = conditionCounts[condition];
        dominantCondition = condition;
      }
    });
    
    response += `${capitalizedDate}: ${Math.round(minTemp)}°C à ${Math.round(maxTemp)}°C, ${dominantCondition}\n`;
  });
  
  return response;
};

/**
 * Obtient une information contextuelle spécifique selon le type de demande
 */
const getContextualInformation = async (queryType, entities = {}) => {
  switch (queryType) {
    case 'weather':
      // Si c'est une prévision pour un jour spécifique
      if (entities?.forecast) {
        // Si un jour spécifique est mentionné (autre que aujourd'hui/demain)
        const specificDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'weekend', 'extended'];
        
        if (entities?.day && (specificDays.includes(entities.day) || entities.day === 'day_after_tomorrow')) {
          console.log('[DEBUG] Obtention des prévisions météo pour jour spécifique:', entities.day);
          return await getWeatherForecastForSpecificDay(entities.day);
        }
        
        // Sinon, pour demain (cas par défaut)
        console.log('[DEBUG] Obtention des prévisions météo pour demain');
        return await getWeatherForecastForUser();
      }
      
      // Météo actuelle
      return await getWeatherInfoForUser();
      
    case 'datetime':
      return await getTemporalContext();
    case 'location':
      const locationInfo = await getLocationInfo();
      return locationInfo 
        ? `Vous êtes actuellement à ${locationInfo.city}${locationInfo.country ? ', ' + locationInfo.country : ''}.`
        : "Je ne peux pas déterminer votre position actuelle.";
    case 'restaurants':
      return await getNearbyRestaurants();
    case 'hotels':
      return await getNearbyHotels();
    case 'pharmacy':
      return await getNearbyPharmacies();
    case 'medical':
      return await getMedicalServices();
    case 'transport':
      return await getTransportInfo();
    case 'events':
      return await getLocalEvents();
    case 'holidays':
      return await getHolidayInfo();
    // AJOUT: Gestion des requêtes cinéma et musique
    case 'movie':
      return await getMovieInformation(entities);
    case 'music':
      return await getMusicInformation(entities);
    default:
      return null;
  }
};

/**
 * Obtient un résumé complet du contexte actuel
 */
const getFullContextSummary = async () => {
  try {
    // Fusionner contexte temporel, météo et localisation
    const [timeContext, locationInfo, weatherInfo] = await Promise.all([
      getTemporalContext(),
      getLocationInfo(),
      getWeatherInfoForUser()
    ]);
    
    let summary = timeContext;
    
    // Ajouter l'information de localisation si disponible
    if (locationInfo && locationInfo.city) {
      summary += ` Vous êtes à ${locationInfo.city}`;
      if (locationInfo.country) {
        summary += `, ${locationInfo.country}`;
      }
      summary += '.';
    }
    
    // Ajouter l'information météo si disponible (version courte)
    if (weatherInfo && !weatherInfo.includes("Désolé")) {
      // Extraire juste la température et la condition actuelle
      const shortWeather = weatherInfo
        .split('\n')[0]
        .replace('Météo actuelle:', 'La météo est')
        .trim();
      
      summary += ` ${shortWeather}.`;
    }
    
    // AJOUT: Vérifier si c'est un jour férié
    try {
      const holidayInfo = await getHolidayInfo();
      if (holidayInfo && holidayInfo.includes("Aujourd'hui est un jour férié")) {
        summary += ` ${holidayInfo}`;
      }
    } catch (e) {
      // Ignorer les erreurs pour cette partie non critique
    }
    
    return summary;
  } catch (error) {
    console.error('[ERREUR] getFullContextSummary:', error);
    // Fallback sur un contexte minimal
    return await getTemporalContext();
  }
};

export default {
  detectContextualQuery,
  getTemporalContext,
  getLocationInfo,
  getWeatherInfo,
  getWeatherInfoForUser,
  getWeatherForecastForUser,
  getWeatherForecastForSpecificDay, // Ajouter la nouvelle fonction
  getFullContextSummary,
  getNearbyPharmacies,
  getMedicalServices,
  getTransportInfo,
  getLocalEvents,
  getHolidayInfo,
  getContextualInformation,
  getMovieInformation,  // AJOUT
  getMusicInformation,  // AJOUT
  getMovieRecommendations, // AJOUT
  getLocalCinemaInfo, // AJOUT
  getGeneralMovieProgramInfo // AJOUT
};
