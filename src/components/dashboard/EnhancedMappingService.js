import Papa from 'papaparse';
import _ from 'lodash';

class EnhancedMappingService {
  constructor() {
    this.ubcData = null;
    this.flexeraData = null;
    this.mappings = new Map();
  }

  /**
   * Normalize application names for comparison
   */
  _normalizeAppName(name) {
    return name?.toLowerCase()
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || '';
  }

  /**
   * Normalize email addresses for comparison
   */
  _normalizeEmail(email) {
    return email?.toLowerCase().trim() || '';
  }

  /**
   * Create a unique key for application-user combination
   */
  _createMappingKey(appName, email) {
    return `${this._normalizeAppName(appName)}|${this._normalizeEmail(email)}`;
  }

  /**
   * Load and process UBC data
   */
  async loadUBCData(file) {
    try {
      const content = await file.text();
      const results = await new Promise((resolve, reject) => {
        Papa.parse(content, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: resolve,
          error: reject
        });
      });

      this.ubcData = results.data.map(row => ({
        ...row,
        normalizedAppName: this._normalizeAppName(row.ApplicationName),
        normalizedEmail: this._normalizeEmail(row.Email),
        mappingKey: this._createMappingKey(row.ApplicationName, row.Email)
      }));

      // Group by application name for easier lookup
      this.ubcGrouped = _.groupBy(this.ubcData, 'normalizedAppName');
      
      return this.ubcData;
    } catch (error) {
      console.error('Error loading UBC data:', error);
      throw error;
    }
  }

  /**
   * Process Flexera data and create mappings
   */
  processFlexeraData(flexeraData) {
    this.flexeraData = flexeraData.map(item => ({
      ...item,
      normalizedAppName: this._normalizeAppName(item['Application - Product']),
      normalizedEmail: this._normalizeEmail(item['Assigned user - Email']),
      mappingKey: this._createMappingKey(
        item['Application - Product'],
        item['Assigned user - Email']
      )
    }));

    // Create mappings between Flexera and UBC data
    this.createMappings();
    
    return this.flexeraData;
  }

  /**
   * Create mappings between UBC and Flexera data
   */
  createMappings() {
    this.mappings.clear();
    
    // First pass: exact matches on application name and email
    this.flexeraData.forEach(flexeraItem => {
      const ubcMatch = this.ubcData?.find(ubcItem => 
        ubcItem.mappingKey === flexeraItem.mappingKey
      );
      
      if (ubcMatch) {
        this.mappings.set(flexeraItem.mappingKey, {
          flexera: flexeraItem,
          ubc: ubcMatch,
          matchType: 'exact'
        });
      }
    });

    // Second pass: fuzzy application name matching for unmatched items
    this.flexeraData.forEach(flexeraItem => {
      if (!this.mappings.has(flexeraItem.mappingKey)) {
        const appMatches = this.ubcGrouped[flexeraItem.normalizedAppName];
        if (appMatches?.length > 0) {
          // Find best match based on email similarity or other criteria
          const bestMatch = appMatches.reduce((best, current) => {
            if (!best) return current;
            
            const currentEmailMatch = current.normalizedEmail === flexeraItem.normalizedEmail;
            const bestEmailMatch = best.normalizedEmail === flexeraItem.normalizedEmail;
            
            if (currentEmailMatch && !bestEmailMatch) return current;
            if (!currentEmailMatch && bestEmailMatch) return best;
            
            return current;
          }, null);

          if (bestMatch) {
            this.mappings.set(flexeraItem.mappingKey, {
              flexera: flexeraItem,
              ubc: bestMatch,
              matchType: 'partial'
            });
          }
        }
      }
    });
  }

  /**
   * Get enriched data for dashboard
   */
  getEnrichedData() {
    if (!this.flexeraData || !this.ubcData) {
      throw new Error('Both Flexera and UBC data must be loaded first');
    }

    const enrichedData = Array.from(this.mappings.values()).map(mapping => ({
      applicationName: mapping.flexera['Application - Product'],
      email: mapping.flexera['Assigned user - Email'],
      flexeraLastUsed: mapping.flexera['Installations - Last used date'],
      ubcServiceType: mapping.ubc.ServiceType,
      ubcRevenueStream: mapping.ubc.RevenueStream,
      ubcQuantity: mapping.ubc.Quantity,
      ubcCharge: mapping.ubc.StatutoryCharge,
      matchType: mapping.matchType,
      businessCode: mapping.ubc.BusinessCode,
      businessLineCode: mapping.ubc.BusinessLineCode,
      productGroupCode: mapping.ubc.ProductGroupCode
    }));

    return {
      enrichedData,
      summary: {
        totalMappings: this.mappings.size,
        exactMatches: Array.from(this.mappings.values()).filter(m => m.matchType === 'exact').length,
        partialMatches: Array.from(this.mappings.values()).filter(m => m.matchType === 'partial').length,
        unmatchedFlexera: this.flexeraData.length - this.mappings.size,
        unmatchedUBC: this.ubcData.length - this.mappings.size
      }
    };
  }

  /**
   * Get grouped data for dashboard visualization
   */
  getGroupedDataForDashboard() {
    const enrichedData = this.getEnrichedData().enrichedData;
    
    // Process UBC cost data
    const processUBCCosts = (data) => {
      // Create a mapping of application -> costs
      const appCosts = {};
      
      data.forEach(item => {
        const app = item.applicationName;
        if (!app) return;
        
        if (!appCosts[app]) {
          appCosts[app] = {
            totalCost: 0,
            instances: 0,
            users: new Set()
          };
        }
        
        const charge = parseFloat(item.ubcCharge) || 0;
        appCosts[app].totalCost += charge;
        appCosts[app].instances++;
        
        if (item.email) {
          appCosts[app].users.add(item.email);
        }
      });
      
      // Add userCount property
      Object.keys(appCosts).forEach(app => {
        appCosts[app].userCount = appCosts[app].users.size;
        delete appCosts[app].users; // Remove the Set to make it JSON-serializable
      });
      
      return appCosts;
    };
    
    // Process UBC costs
    const appCosts = processUBCCosts(this.ubcData);

    
    return {
      byBusinessUnit: _.groupBy(enrichedData, 'businessCode'),
      byRevenueStream: _.groupBy(enrichedData, 'ubcRevenueStream'),
      byMatchType: _.groupBy(enrichedData, 'matchType'),
      applicationUsage: _.groupBy(enrichedData, 'applicationName'),
      appCosts: appCosts
    };
  }
}

export default EnhancedMappingService;