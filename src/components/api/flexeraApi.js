import _ from 'lodash';

/**
 * Service to handle Flexera API data processing and caching
 */
class FlexeraDataProcessingService {
  constructor() {
    this.cache = new Map();
    this.CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
    this.PAGE_SIZE = 10000;
  }

  /**
   * Process a batch of Flexera data and transform it to match DSC format
   * @param {Array} flexeraData - Raw data from Flexera API
   * @returns {Object} Processed and grouped data
   */
  processFlexeraData(flexeraData) {
    return _.chain(flexeraData)
      .groupBy(item => {
        const email = item.R3_89ab5105110ae6c27f20bd79bd7bf388_ComputerToAssignedUser_Email;
        const product = item.R2_51a71253efbabf8e3d6d91e83e042599_InstallationToApplication_ProductName;
        return `${email}|${product}`;
      })
      .map((group, key) => {
        const [email, application] = key.split('|');
        const firstItem = group[0];
        
        return {
          email,
          application,
          firstName: firstItem.R3_89ab5105110ae6c27f20bd79bd7bf388_ComputerToAssignedUser_GivenName,
          lastName: firstItem.R3_89ab5105110ae6c27f20bd79bd7bf388_ComputerToAssignedUser_Surname,
          businessArea: firstItem.R3_89ab5105110ae6c27f20bd79bd7bf388_ComputerToAssignedUser_ABB_BusinessUnit,
          lastAccess: this._getLatestDate(group.map(item => 
            item.R3_8b3c31effc7070495b526d61668a6d12_ComputerToInstallation_LastUsedDate
          )),
          accessCount: this._calculateAccessCount(group),
          reportingMonth: this._getCurrentReportingMonth(),
          modifiedDate: new Date().toISOString()
        };
      })
      .value();
  }

  /**
   * Get the latest valid date from an array of date strings
   * @param {Array<string>} dates - Array of date strings
   * @returns {string} Latest valid date or null
   */
  _getLatestDate(dates) {
    const validDates = dates
      .filter(date => date)
      .map(date => new Date(date))
      .filter(date => !isNaN(date));
    
    return validDates.length > 0 
      ? new Date(Math.max(...validDates)).toISOString()
      : null;
  }

  /**
   * Calculate total access count from a group of installations
   * @param {Array} group - Group of installations for the same user/application
   * @returns {number} Total access count
   */
  _calculateAccessCount(group) {
    return group.reduce((total, item) => {
      const isUsed = item.R3_8b3c31effc7070495b526d61668a6d12_ComputerToInstallation_IsUsed;
      const period = item.R4_53a9b41ff3076579d63377bffa17a352_InstallationToApplication_UsagePeriod || 0;
      return total + (isUsed ? period : 0);
    }, 0);
  }

  /**
   * Get current reporting month in format YYYY_MMA
   * @returns {string} Reporting month
   */
  _getCurrentReportingMonth() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}_${month}A`;
  }

  /**
   * Cache the processed data with timestamp
   * @param {string} key - Cache key
   * @param {Array} data - Processed data to cache
   */
  cacheData(key, data) {
    this.cache.set(key, {
      timestamp: Date.now(),
      data
    });
  }

  /**
   * Check if cached data is still valid
   * @param {string} key - Cache key
   * @returns {boolean} True if cache is valid
   */
  isCacheValid(key) {
    const cached = this.cache.get(key);
    if (!cached) return false;
    
    const age = Date.now() - cached.timestamp;
    return age < this.CACHE_DURATION;
  }

  /**
   * Get cached data
   * @param {string} key - Cache key
   * @returns {Array|null} Cached data or null
   */
  getCachedData(key) {
    return this.isCacheValid(key) ? this.cache.get(key).data : null;
  }
}

/**
 * Service to integrate with IS Charges API
 */
class ISChargesIntegrationService {
  constructor(apiKey) {
    this.baseUrl = 'https://api.ischarges.abb.com/odata/integration';
    this.apiKey = apiKey;
    this.dataProcessor = new FlexeraDataProcessingService();
  }

  /**
   * Fetch and process all pages from Flexera API
   * @param {string} flexeraUrl - Flexera API URL
   * @returns {Promise<Array>} Processed data
   */
  async fetchAllFlexeraData(flexeraUrl) {
    const cacheKey = `flexera_${this._getCurrentReportingMonth()}`;
    
    // Check cache first
    const cachedData = this.dataProcessor.getCachedData(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    let allData = [];
    let nextPageUrl = flexeraUrl;

    while (nextPageUrl) {
      const response = await this._fetchFlexeraPage(nextPageUrl);
      allData = [...allData, ...response.values];
      nextPageUrl = response.nextPage;

      // Process and cache data in chunks
      if (allData.length >= this.dataProcessor.PAGE_SIZE) {
        const processedChunk = this.dataProcessor.processFlexeraData(allData);
        this.dataProcessor.cacheData(cacheKey, processedChunk);
        await this._sendToISCharges(processedChunk);
        allData = [];
      }
    }

    // Process remaining data
    if (allData.length > 0) {
      const processedChunk = this.dataProcessor.processFlexeraData(allData);
      this.dataProcessor.cacheData(cacheKey, processedChunk);
      await this._sendToISCharges(processedChunk);
    }

    return this.dataProcessor.getCachedData(cacheKey);
  }

  /**
   * Send processed data to IS Charges API
   * @param {Array} data - Processed data
   * @returns {Promise<void>}
   */
  async _sendToISCharges(data) {
    const batchSize = 1000;
    const batches = _.chunk(data, batchSize);

    for (const batch of batches) {
      try {
        await fetch(`${this.baseUrl}/its_cloud`, {
          method: 'POST',
          headers: {
            'X-API-KEY': this.apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(batch)
        });
      } catch (error) {
        console.error('Error sending data to IS Charges:', error);
        // Implement retry logic here
      }
    }
  }

  /**
   * Fetch a single page from Flexera API
   * @param {string} url - Page URL
   * @returns {Promise<Object>} Page data
   */
  async _fetchFlexeraPage(url) {
    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json'
        }
      });
      return await response.json();
    } catch (error) {
      console.error('Error fetching Flexera data:', error);
      throw error;
    }
  }

  /**
   * Get current reporting month
   * @returns {string} Reporting month
   */
  _getCurrentReportingMonth() {
    const date = new Date();
    return `${date.getFullYear()}_${String(date.getMonth() + 1).padStart(2, '0')}A`;
  }
}

export { FlexeraDataProcessingService, ISChargesIntegrationService };