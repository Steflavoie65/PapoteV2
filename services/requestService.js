// Shared service to simulate a backend
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const REQUEST_KEY = 'seniorRequests';

// Interval in ms for polling
const POLLING_INTERVAL = 2000;

class RequestService {
  constructor() {
    this.listeners = [];
    this.isPolling = false;
    this.requests = [];
    this.loadInitialData();
  }
  
  async loadInitialData() {
    try {
      const storedRequests = await AsyncStorage.getItem(REQUEST_KEY);
      if (storedRequests) {
        this.requests = JSON.parse(storedRequests);
      }
    } catch (error) {
      console.error('Error loading requests:', error);
    }
  }
  
  // Add a listener for real-time updates
  addListener(callback) {
    this.listeners.push(callback);
    
    // Start polling if not already running
    if (!this.isPolling) {
      this.startPolling();
    }
    
    // Immediately notify with current data
    callback(this.requests);
    
    // Return cleanup function
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
      if (this.listeners.length === 0) {
        this.stopPolling();
      }
    };
  }
  
  // Start background polling
  startPolling() {
    this.isPolling = true;
    this.pollInterval = setInterval(() => {
      this.checkForUpdates();
    }, POLLING_INTERVAL);
  }
  
  stopPolling() {
    this.isPolling = false;
    clearInterval(this.pollInterval);
  }
  
  // Check for updates from AsyncStorage
  async checkForUpdates() {
    try {
      const storedRequests = await AsyncStorage.getItem(REQUEST_KEY);
      if (storedRequests) {
        const parsedRequests = JSON.parse(storedRequests);
        // Only update if different
        if (JSON.stringify(parsedRequests) !== JSON.stringify(this.requests)) {
          this.requests = parsedRequests;
          this.notifyListeners();
        }
      }
    } catch (error) {
      console.error('Error checking updates:', error);
    }
  }
  
  // Notify all listeners with current data
  notifyListeners() {
    this.listeners.forEach(callback => callback(this.requests));
  }
  
  // Add a new connection request
  async addRequest(request) {
    try {
      this.requests.push(request);
      await AsyncStorage.setItem(REQUEST_KEY, JSON.stringify(this.requests));
      this.notifyListeners();
      return true;
    } catch (error) {
      console.error('Error adding request:', error);
      return false;
    }
  }
  
  // Update a request (e.g., mark as seen)
  async updateRequest(requestId, updates) {
    try {
      this.requests = this.requests.map(req => 
        req.id === requestId ? {...req, ...updates} : req
      );
      await AsyncStorage.setItem(REQUEST_KEY, JSON.stringify(this.requests));
      this.notifyListeners();
      return true;
    } catch (error) {
      console.error('Error updating request:', error);
      return false;
    }
  }
  
  // Get requests for a specific senior
  getRequestsForSenior(seniorCode) {
    return this.requests.filter(req => 
      req.code && req.code.toLowerCase() === seniorCode?.toLowerCase()
    );
  }
}

// Create a singleton instance
const requestService = new RequestService();
export default requestService;
