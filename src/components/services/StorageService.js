/**
 * Service to handle persistent storage operations with robust error handling
 */
class StorageService {
    /**
     * Save data to localStorage with error handling
     * @param {string} key - Storage key
     * @param {any} data - Data to store (will be stringified)
     * @returns {boolean} Success status
     */
    static saveData(key, data) {
      try {
        console.log(`Saving ${key} data:`, data);
        const serialized = JSON.stringify(data);
        localStorage.setItem(key, serialized);
        
        // Verify data was saved correctly
        const verification = localStorage.getItem(key);
        if (!verification) {
          console.error(`Failed to verify ${key} data was saved`);
          return false;
        }
        
        console.log(`Successfully saved ${key} data`);
        return true;
      } catch (error) {
        console.error(`Error saving ${key} data:`, error);
        // Try fallback approach - maybe localStorage is full
        try {
          // Remove any old data for this key
          localStorage.removeItem(key);
          // Try again with fresh storage
          localStorage.setItem(key, JSON.stringify(data));
          console.log(`Saved ${key} data after recovery`);
          return true;
        } catch (fallbackError) {
          console.error(`Complete failure saving ${key} data:`, fallbackError);
          return false;
        }
      }
    }
  
    /**
     * Load data from localStorage with error handling
     * @param {string} key - Storage key
     * @param {any} defaultValue - Default value if not found or error
     * @returns {any} Parsed data or default value
     */
    static loadData(key, defaultValue = null) {
      try {
        console.log(`Loading ${key} data...`);
        const serialized = localStorage.getItem(key);
        if (serialized === null) {
          console.log(`No ${key} data found, using default`);
          return defaultValue;
        }
        
        const data = JSON.parse(serialized);
        console.log(`Successfully loaded ${key} data`);
        return data;
      } catch (error) {
        console.error(`Error loading ${key} data:`, error);
        return defaultValue;
      }
    }
  
    /**
     * Remove data from localStorage
     * @param {string} key - Storage key
     * @returns {boolean} Success status
     */
    static removeData(key) {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (error) {
        console.error(`Error removing ${key} data:`, error);
        return false;
      }
    }
  
    /**
     * Check if localStorage is available in the current environment
     * @returns {boolean} True if localStorage is available
     */
    static isAvailable() {
      const testKey = '__storage_test__';
      try {
        localStorage.setItem(testKey, testKey);
        localStorage.removeItem(testKey);
        return true;
      } catch (e) {
        return false;
      }
    }
  }
  
  export default StorageService;