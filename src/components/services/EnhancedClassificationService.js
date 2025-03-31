/**
 * Enhanced Application Classification System
 * 
 * This module improves application grouping by:
 * 1. Using fuzzy matching for application names
 * 2. Implementing keyword-based classification
 * 3. Providing a fallback classification system based on vendor/publisher
 * 4. Adding machine learning-inspired scoring for classification confidence
 */

class EnhancedClassificationService {
    constructor(groupDefinitions) {
      this.groupDefinitions = groupDefinitions;
      this.vendorMappings = this._buildVendorMappings();
      this.keywordMappings = this._buildKeywordMappings();
      this.cache = new Map(); // For performance optimization
    }
  
    /**
     * Normalize application name for comparison
     */
    normalizeName(name) {
      if (!name) return '';
      return name.toLowerCase()
        .replace(/[^a-z0-9]/g, ' ')  // Replace non-alphanumeric with spaces
        .replace(/\s+/g, ' ')        // Replace multiple spaces with single space
        .trim();
    }
  
    /**
     * Extract vendor/publisher from application name
     */
    extractVendor(appName) {
      const normalized = this.normalizeName(appName);
      
      // Common vendor prefixes
      const vendorPrefixes = [
        'microsoft', 'ms ', 'adobe', 'autodesk', 'ibm', 'oracle', 'sap',
        'google', 'atlassian', 'salesforce', 'vmware', 'cisco', 'siemens',
        'bentley', 'dassault', 'ptc', 'hexagon', 'aveva', 'ansys', 'tableau',
        'symantec', 'mcafee', 'kaspersky', 'trend micro', 'sophos', 'avast'
      ];
      
      for (const prefix of vendorPrefixes) {
        if (normalized.startsWith(prefix)) {
          return prefix.trim();
        }
        // Check for format "Product by Vendor"
        const byVendorMatch = normalized.match(/ by ([\w\s]+)/);
        if (byVendorMatch) {
          return byVendorMatch[1].trim();
        }
      }
      
      // Extract first word as potential vendor
      const firstWord = normalized.split(' ')[0];
      if (firstWord && firstWord.length > 2) {
        return firstWord;
      }
      
      return null;
    }
  
    /**
     * Build mappings from vendors to group paths
     */
    _buildVendorMappings() {
      const vendorMap = new Map();
      
      // Traverse the group definitions to extract vendor-to-group mappings
      const traverseGroups = (nodes, currentPath) => {
        for (const node of nodes) {
          const path = currentPath ? `${currentPath} > ${node.name}` : node.name;
          
          if (node.members && Array.isArray(node.members)) {
            for (const member of node.members) {
              const vendor = this.extractVendor(member);
              if (vendor) {
                vendorMap.set(vendor, path);
              }
            }
          }
          
          if (node.children) {
            traverseGroups(node.children, path);
          }
        }
      };
      
      traverseGroups(this.groupDefinitions.groups, '');
      
      // Add explicit vendor mappings for common categories
      const explicitMappings = {
        // Microsoft products
        'microsoft': 'Infrastructure Software > MS Applications',
        'ms': 'Infrastructure Software > MS Applications',
        'office': 'Infrastructure Software > MS Applications',
        'excel': 'Infrastructure Software > MS Applications',
        'word': 'Infrastructure Software > MS Applications',
        'powerpoint': 'Infrastructure Software > MS Applications',
        'outlook': 'Infrastructure Software > MS Applications',
        'teams': 'Infrastructure Software > MS Applications',
        'onedrive': 'Infrastructure Software > MS Applications',
        'sharepoint': 'Infrastructure Software > MS Applications',
        'skype': 'Infrastructure Software > MS Applications',
        'windows': 'Infrastructure Software > Operating Systems',
        
        // Adobe products
        'adobe': 'Engineering Software > Design Tools',
        'photoshop': 'Engineering Software > Design Tools',
        'illustrator': 'Engineering Software > Design Tools',
        'indesign': 'Engineering Software > Design Tools',
        'acrobat': 'Infrastructure Software > Document Management',
        
        // Engineering tools
        'autocad': 'Engineering Software > CAD Tools',
        'solidworks': 'Engineering Software > CAD Tools',
        'ansys': 'Engineering Software > Simulation',
        'matlab': 'Engineering Software > Simulation',
        'siemens': 'Engineering Software > PLM',
        'ptc': 'Engineering Software > PLM',
        
        // Database and analytics
        'sql': 'Infrastructure Software > Database',
        'oracle': 'Infrastructure Software > Database',
        'tableau': 'Infrastructure Software > Business Intelligence',
        'power bi': 'Infrastructure Software > Business Intelligence',
        
        // Security tools
        'antivirus': 'Infrastructure Software > Security',
        'vpn': 'Infrastructure Software > Security',
        'firewall': 'Infrastructure Software > Security',
        'symantec': 'Infrastructure Software > Security',
        'mcafee': 'Infrastructure Software > Security',
        
        // Messaging and communication
        'zoom': 'Infrastructure Software > Communication',
        'slack': 'Infrastructure Software > Communication',
        'webex': 'Infrastructure Software > Communication',
        
        // Browsers
        'chrome': 'Infrastructure Software > Web Browsers',
        'firefox': 'Infrastructure Software > Web Browsers',
        'edge': 'Infrastructure Software > Web Browsers',
        'safari': 'Infrastructure Software > Web Browsers',
        
        // Project management
        'jira': 'Infrastructure Software > Project Management',
        'asana': 'Infrastructure Software > Project Management',
        'trello': 'Infrastructure Software > Project Management',
        'atlassian': 'Infrastructure Software > Project Management',
        
        // ERP and CRM
        'sap': 'ERP > SAP',
        'salesforce': 'CRM > Salesforce',
        'dynamics': 'ERP > Microsoft Dynamics'
      };
      
      for (const [vendor, path] of Object.entries(explicitMappings)) {
        vendorMap.set(vendor, path);
      }
      
      return vendorMap;
    }
  
    /**
     * Build keyword-to-group mappings
     */
    _buildKeywordMappings() {
      // Define keywords associated with each group path
      return {
        'Infrastructure Software > MS Applications': [
          'microsoft', 'ms', 'office', 'excel', 'word', 'powerpoint', 'outlook', 
          'teams', 'onedrive', 'sharepoint', 'skype', 'visio', 'access', 'onenote'
        ],
        'Infrastructure Software > Operating Systems': [
          'windows', 'linux', 'ubuntu', 'redhat', 'centos', 'macos', 'os', 'operating system'
        ],
        'Infrastructure Software > Database': [
          'sql', 'oracle', 'db', 'database', 'mysql', 'postgresql', 'mongodb', 'mariadb', 'nosql', 'data warehouse'
        ],
        'Infrastructure Software > Web Browsers': [
          'chrome', 'firefox', 'edge', 'safari', 'opera', 'browser', 'internet explorer'
        ],
        'Infrastructure Software > Business Intelligence': [
          'bi', 'tableau', 'power bi', 'qlik', 'looker', 'analytics', 'dashboard', 'reporting', 'data visualization'
        ],
        'Infrastructure Software > Security': [
          'antivirus', 'vpn', 'firewall', 'security', 'encryption', 'malware', 'protection', 'endpoint', 'symantec', 'mcafee'
        ],
        'Infrastructure Software > Communication': [
          'zoom', 'slack', 'webex', 'chat', 'meeting', 'conference', 'video', 'voip', 'voice', 'call'
        ],
        'Infrastructure Software > Document Management': [
          'pdf', 'acrobat', 'document', 'reader', 'writer', 'editor', 'ocr', 'scanner'
        ],
        'Infrastructure Software > Project Management': [
          'jira', 'asana', 'trello', 'project', 'task', 'kanban', 'scrum', 'agile', 'portfolio', 'planning'
        ],
        'Engineering Software > CAD Tools': [
          'cad', 'autocad', 'solidworks', 'inventor', 'revit', 'fusion', 'drawing', '3d', 'modeling', 'design'
        ],
        'Engineering Software > Simulation': [
          'simulation', 'ansys', 'abaqus', 'nastran', 'fea', 'cfd', 'fem', 'matlab', 'simulink', 'analysis'
        ],
        'Engineering Software > PLM': [
          'plm', 'pdm', 'teamcenter', 'windchill', 'enovia', 'product lifecycle', 'data management', 'siemens', 'ptc'
        ],
        'Engineering Software > Design Tools': [
          'design', 'adobe', 'photoshop', 'illustrator', 'indesign', 'xd', 'creative cloud', 'sketching'
        ],
        'ERP > SAP': [
          'sap', 'erp', 'resource planning', 'hana', 'fiori'
        ],
        'ERP > Microsoft Dynamics': [
          'dynamics', 'ax', 'nav', 'crm', 'erp', 'microsoft'
        ],
        'CRM > Salesforce': [
          'salesforce', 'crm', 'customer relationship', 'sales cloud', 'service cloud', 'marketing cloud'
        ]
      };
    }
  
    /**
     * Find group for application using enhanced matching techniques
     */
    findGroupForSoftware(softwareName, fallbackToKeywords = true, fallbackToVendor = true) {
      if (!softwareName) {
        return "Unclassified";
      }
      
      // Check cache first for performance
      const cacheKey = softwareName;
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }
      
      const normalizedSoftware = this.normalizeName(softwareName);
      
      // Try exact match in group definitions first
      const exactMatchPath = this._findExactMatchInDefinitions(normalizedSoftware);
      if (exactMatchPath) {
        this.cache.set(cacheKey, exactMatchPath);
        return exactMatchPath;
      }
      
      // Then try fuzzy matching in group definitions
      const fuzzyMatchPath = this._findFuzzyMatchInDefinitions(normalizedSoftware);
      if (fuzzyMatchPath) {
        this.cache.set(cacheKey, fuzzyMatchPath);
        return fuzzyMatchPath;
      }
      
      // Try keyword-based classification
      if (fallbackToKeywords) {
        const keywordMatchPath = this._findKeywordMatch(normalizedSoftware);
        if (keywordMatchPath) {
          this.cache.set(cacheKey, keywordMatchPath);
          return keywordMatchPath;
        }
      }
      
      // Use vendor-based classification as last resort
      if (fallbackToVendor) {
        const vendor = this.extractVendor(softwareName);
        if (vendor && this.vendorMappings.has(vendor)) {
          const vendorMatchPath = this.vendorMappings.get(vendor);
          this.cache.set(cacheKey, vendorMatchPath);
          return vendorMatchPath;
        }
      }
      
      // Default to unclassified if all methods fail
      this.cache.set(cacheKey, "Unclassified");
      return "Unclassified";
    }
  
    /**
     * Find exact match in group definitions
     */
    _findExactMatchInDefinitions(normalizedSoftware) {
      const findExactMatch = (nodes, parentPath = "") => {
        for (const node of nodes) {
          const currentPath = parentPath ? `${parentPath} > ${node.name}` : node.name;
          
          if (node.members && Array.isArray(node.members)) {
            for (const member of node.members) {
              const normalizedMember = this.normalizeName(member);
              if (normalizedSoftware === normalizedMember) {
                return currentPath;
              }
            }
          }
          
          if (node.children) {
            const childMatch = findExactMatch(node.children, currentPath);
            if (childMatch) {
              return childMatch;
            }
          }
        }
        return null;
      };
      
      return findExactMatch(this.groupDefinitions.groups);
    }
  
    /**
     * Find fuzzy match in group definitions
     */
    _findFuzzyMatchInDefinitions(normalizedSoftware) {
      let bestMatch = null;
      let highestScore = 0;
      
      const findFuzzyMatch = (nodes, parentPath = "") => {
        for (const node of nodes) {
          const currentPath = parentPath ? `${parentPath} > ${node.name}` : node.name;
          
          if (node.members && Array.isArray(node.members)) {
            for (const member of node.members) {
              const normalizedMember = this.normalizeName(member);
              
              // Check for partial match and calculate similarity score
              if (normalizedSoftware.includes(normalizedMember) || 
                  normalizedMember.includes(normalizedSoftware)) {
                
                const score = this._calculateSimilarityScore(normalizedSoftware, normalizedMember);
                if (score > highestScore) {
                  highestScore = score;
                  bestMatch = currentPath;
                }
              }
            }
          }
          
          if (node.children) {
            findFuzzyMatch(node.children, currentPath);
          }
        }
      };
      
      findFuzzyMatch(this.groupDefinitions.groups);
      
      // Only return match if score is above threshold
      return highestScore > 0.5 ? bestMatch : null;
    }
  
    /**
     * Calculate similarity score between two strings
     */
    _calculateSimilarityScore(str1, str2) {
      // Simple Jaccard similarity for words
      const words1 = str1.split(' ').filter(word => word.length > 1);
      const words2 = str2.split(' ').filter(word => word.length > 1);
      
      const set1 = new Set(words1);
      const set2 = new Set(words2);
      
      const intersection = new Set([...set1].filter(word => set2.has(word)));
      const union = new Set([...set1, ...set2]);
      
      // Calculate Jaccard similarity
      const jaccardSimilarity = intersection.size / union.size;
      
      // If one string contains the other completely, boost the score
      if (str1.includes(str2) || str2.includes(str1)) {
        return Math.max(jaccardSimilarity, 0.7);
      }
      
      return jaccardSimilarity;
    }
  
    /**
     * Find keyword match for software
     */
    _findKeywordMatch(normalizedSoftware) {
      let bestMatchPath = null;
      let highestScore = 0;
      
      for (const [groupPath, keywords] of Object.entries(this.keywordMappings)) {
        for (const keyword of keywords) {
          // Check if software contains keyword or vice versa
          if (normalizedSoftware.includes(keyword) || 
              (keyword.length > 3 && keyword.includes(normalizedSoftware))) {
            
            const score = keyword.length / normalizedSoftware.length;
            if (score > highestScore) {
              highestScore = score;
              bestMatchPath = groupPath;
            }
          }
        }
      }
      
      // Only return match if score is above threshold
      return highestScore > 0.2 ? bestMatchPath : null;
    }
  
    /**
     * Get confidence score for the classification
     */
    getClassificationConfidence(softwareName, groupPath) {
      if (groupPath === "Unclassified") {
        return 0;
      }
      
      const normalizedSoftware = this.normalizeName(softwareName);
      
      // Check for exact match in definitions
      const exactMatchPath = this._findExactMatchInDefinitions(normalizedSoftware);
      if (exactMatchPath === groupPath) {
        return 1.0; // 100% confidence for exact matches
      }
      
      // Check for fuzzy match
      const fuzzyMatchPath = this._findFuzzyMatchInDefinitions(normalizedSoftware);
      if (fuzzyMatchPath === groupPath) {
        return 0.8; // 80% confidence for fuzzy matches
      }
      
      // Check for keyword match
      let keywordMatchScore = 0;
      if (this.keywordMappings[groupPath]) {
        for (const keyword of this.keywordMappings[groupPath]) {
          if (normalizedSoftware.includes(keyword)) {
            keywordMatchScore = Math.max(keywordMatchScore, 
              Math.min(0.7, keyword.length / normalizedSoftware.length));
          }
        }
      }
      
      // Check for vendor match
      const vendor = this.extractVendor(softwareName);
      if (vendor && this.vendorMappings.get(vendor) === groupPath) {
        return Math.max(0.6, keywordMatchScore); // At least 60% confidence for vendor matches
      }
      
      return keywordMatchScore;
    }
    updateDefinitions(newDefinitions) {
        this.groupDefinitions = newDefinitions;
        
        // Rebuild internal mappings
        this.vendorMappings = this._buildVendorMappings();
        this.keywordMappings = this._buildKeywordMappings();
        
        // Clear cache to ensure fresh classifications
        this.cache.clear();
        
        return true;
      }
    /*
      * Get costs per application from UBC data
 * @returns {Object} Map of application names to cost data*/
getApplicationCosts() {
  if (!this.ubcData) {
    throw new Error('UBC data must be loaded first');
  }
  
  // Group UBC data by application name
  const costsByApp = {};
  
  this.ubcData.forEach(item => {
    const appName = item.ApplicationName || 'Unknown';
    const charge = parseFloat(item.StatutoryCharge) || 0;
    
    if (!costsByApp[appName]) {
      costsByApp[appName] = {
        totalCost: 0,
        instances: 0,
        users: new Set(),
        details: []
      };
    }
    
    costsByApp[appName].totalCost += charge;
    costsByApp[appName].instances++;
    
    if (item.Email) {
      costsByApp[appName].users.add(item.Email);
    }
    
    // Add detail record
    costsByApp[appName].details.push({
      email: item.Email,
      charge: charge,
      serviceType: item.ServiceType,
      revenueStream: item.RevenueStream,
      businessCode: item.BusinessCode
    });
  });
  
  // Convert Sets to counts
  Object.keys(costsByApp).forEach(app => {
    costsByApp[app].userCount = costsByApp[app].users.size;
    delete costsByApp[app].users; // Remove the Set to make it JSON-serializable
  });
  
  return costsByApp;
}
applyUBCCostsToStructure(appStructure) {
    if (!this.ubcData || !appStructure) {
      return appStructure;
    }
    
    try {
      // Get application costs
      const appCosts = this.getApplicationCosts();
      
      // Apply costs to the structure
      Object.entries(appStructure).forEach(([groupPath, groupData]) => {
        if (!groupData?.flexeraData?.items) return;
        
        // Track group total cost
        let groupTotalCost = 0;
        
        // Update cost data for each application in the group
        groupData.flexeraData.items.forEach(item => {
          const appName = item["Application - Product"];
          
          // Find matching cost data
          let costData = null;
          
          // Try exact match first
          if (appCosts[appName]) {
            costData = appCosts[appName];
          } else {
            // Try fuzzy matching
            const normalizedAppName = this._normalizeAppName(appName);
            
            // Find best match
            let bestMatch = null;
            let highestScore = 0;
            
            Object.keys(appCosts).forEach(costAppName => {
              const normalizedCostApp = this._normalizeAppName(costAppName);
              
              // Calculate similarity
              let score = 0;
              
              // Exact substring match
              if (normalizedCostApp.includes(normalizedAppName) || 
                  normalizedAppName.includes(normalizedCostApp)) {
                
                // Calculate score based on length ratio
                const lengthRatio = Math.min(normalizedAppName.length, normalizedCostApp.length) / 
                                   Math.max(normalizedAppName.length, normalizedCostApp.length);
                
                score = 0.5 + (0.5 * lengthRatio);
              } else {
                // Word-level similarity
                const appWords = normalizedAppName.split(' ');
                const costWords = normalizedCostApp.split(' ');
                
                // Count matching words
                const matchingWords = appWords.filter(word => 
                  costWords.some(costWord => costWord.includes(word) || word.includes(costWord))
                ).length;
                
                // Calculate score
                if (appWords.length > 0 && costWords.length > 0) {
                  score = matchingWords / Math.max(appWords.length, costWords.length);
                }
              }
              
              // Update best match if score is higher
              if (score > 0.3 && score > highestScore) {
                highestScore = score;
                bestMatch = costAppName;
              }
            });
            
            if (bestMatch) {
              costData = appCosts[bestMatch];
              
              // Add matching confidence
              costData.matchConfidence = highestScore;
              costData.matchedWith = bestMatch;
            }
          }
          
          // Apply cost data to the item
          if (costData) {
            item.ubcCost = costData.totalCost;
            item.ubcInstances = costData.instances;
            item.ubcUserCount = costData.userCount;
            item.ubcMatchConfidence = costData.matchConfidence || 1.0;
            
            // Update group total
            groupTotalCost += costData.totalCost;
          }
        });
        
        // Update group metrics with UBC cost data
        if (groupData.flexeraData.metrics) {
          groupData.flexeraData.metrics.totalUBCCost = groupTotalCost;
        }
      });
      
      return appStructure;
    } catch (error) {
      console.error('Error applying UBC costs:', error);
      return appStructure;
    }
  }
  }
  
  export default EnhancedClassificationService;