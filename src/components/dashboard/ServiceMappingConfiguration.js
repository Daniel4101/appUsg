import _ from 'lodash';

class ServiceMappingConfiguration {
  constructor() {
    // Define the base mapping structure
    this.mappingRules = {
      // Direct Software Charges (DSC) mappings
      dscMappings: {
        "ABACUS Analyzer": {
          category: "Infrastructure Software",
          subCategory: "Financial Planning",
          chargeType: "DSC",
          flexeraIdentifiers: ["ABACUS", "Abacus Analyzer", "ABB ABACUS"]
        },
        "Azure DevOps": {
          category: "Infrastructure Software",
          subCategory: "Development Tools",
          chargeType: "DSC",
          flexeraIdentifiers: ["Azure DevOps", "AzureDevOps", "Azure DevOps Global"]
        }
      },

      // User Based Charges (UBC) mappings
      ubcMappings: {
        "ALUSTA": {
          category: "Business Applications",
          subCategory: "Document Management",
          chargeType: "UBC",
          flexeraIdentifiers: ["ALUSTA", "ABB Alusta"]
        },
        "Audit Suite": {
          category: "Business Applications",
          subCategory: "Compliance",
          chargeType: "UBC",
          flexeraIdentifiers: ["Audit Suite", "AuditSuite"]
        }
      }
    };

    // Define category hierarchies
    this.categoryHierarchy = {
      "Infrastructure Software": {
        subCategories: ["Financial Planning", "Development Tools", "Database", "Security"],
        description: "Global licensing and infrastructure tools"
      },
      "Business Applications": {
        subCategories: ["Document Management", "Compliance", "Finance", "HR"],
        description: "Business-specific applications and platforms"
      }
    };
  }

  /**
   * Find the appropriate mapping for a Flexera application
   * @param {string} flexeraAppName - Application name from Flexera
   * @returns {Object|null} Mapping information if found
   */
  findMapping(flexeraAppName) {
    const normalizedName = this._normalizeAppName(flexeraAppName);
    
    // Check DSC mappings
    const dscMatch = this._findInMappings(normalizedName, this.mappingRules.dscMappings);
    if (dscMatch) return { ...dscMatch, type: 'DSC' };
    
    // Check UBC mappings
    const ubcMatch = this._findInMappings(normalizedName, this.mappingRules.ubcMappings);
    if (ubcMatch) return { ...ubcMatch, type: 'UBC' };
    
    return null;
  }

  /**
   * Find matching mapping in the specified mapping set
   * @private
   */
  _findInMappings(normalizedName, mappings) {
    return Object.entries(mappings).find(([key, mapping]) => {
      return mapping.flexeraIdentifiers.some(identifier => 
        this._normalizeAppName(identifier).includes(normalizedName) ||
        normalizedName.includes(this._normalizeAppName(identifier))
      );
    })?.[1];
  }

  /**
   * Normalize application names for comparison
   * @private
   */
  _normalizeAppName(name) {
    return name.toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  /**
   * Add a new mapping rule
   * @param {string} serviceName - The service name
   * @param {Object} mappingInfo - Mapping information
   */
  addMapping(serviceName, mappingInfo) {
    const { chargeType, ...info } = mappingInfo;
    
    if (chargeType === 'DSC') {
      this.mappingRules.dscMappings[serviceName] = info;
    } else if (chargeType === 'UBC') {
      this.mappingRules.ubcMappings[serviceName] = info;
    }
  }

  /**
   * Group applications by category and subcategory
   * @param {Array} applications - List of applications with mapping info
   * @returns {Object} Grouped applications
   */
  groupApplications(applications) {
    return _.groupBy(applications, app => {
      const mapping = this.findMapping(app.name);
      if (mapping) {
        return `${mapping.category} > ${mapping.subCategory}`;
      }
      return 'Unclassified';
    });
  }

  /**
   * Validate if a category and subcategory combination is valid
   */
  isValidCategoryPair(category, subcategory) {
    return this.categoryHierarchy[category]?.subCategories.includes(subcategory) || false;
  }
}

export default ServiceMappingConfiguration;