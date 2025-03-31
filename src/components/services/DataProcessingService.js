import Papa from 'papaparse';
import _ from 'lodash';
import groupDefinitions from '../dashboard/groupDefinitions';
import EnhancedClassificationService from './EnhancedClassificationService';

class DataProcessingService {
  constructor() {
    this.dscStructure = null;
    this.flexeraData = null;
    this.quarterData = new Map();
    this.groupDefinitions = groupDefinitions;
    this.classificationService = new EnhancedClassificationService(groupDefinitions);

  }

  /**
   * Recursively search the group definitions for a matching softwareName.
   * Returns a full path like "Infrastructure Software > MS Applications"
   * or null if no match.
   */
  findGroupForSoftware(softwareName, groupNodes, parentPath = "") {
    const normalizedSoftware = this.normalizeName(softwareName);
  
    for (const node of groupNodes) {
      const currentPath = parentPath ? `${parentPath} > ${node.name}` : node.name;
      if (node.members && node.members.some(m => {
        const normalizedMember = this.normalizeName(m);
        const sim = this.similarity(normalizedSoftware, normalizedMember);
        return normalizedSoftware === normalizedMember ||
               normalizedSoftware.includes(normalizedMember) ||
               normalizedMember.includes(normalizedSoftware) ||
               sim >= 0.7; // Fuzzy matching threshold (70% similarity)
      })) {
        return currentPath;
      }
      if (node.children) {
        const result = this.findGroupForSoftware(softwareName, node.children, currentPath);
        if (result !== null) {
          return result;
        }
      }
    }
    return null; // No match found
  }

  _assignGroupToItem(softwareName) {
    return this.classificationService.findGroupForSoftware(softwareName);
  }

  findGroupForSoftware(softwareName, groupNodes, parentPath = "") {
    return this.classificationService.findGroupForSoftware(softwareName);
  }
  /**
   * Load DSC data from CSV.
   */
  loadDSCData(file, quarter) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          Papa.parse(event.target.result, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              try {
                console.log('Parsed DSC data (first rows):', results.data.slice(0, 5));
                const quarterData = results.data.filter(row => row.ReportingQuarter === quarter);
                this.quarterData.set(quarter, quarterData);
                this.dscStructure = this._createDSCStructure(quarterData);
                resolve(this.dscStructure);
              } catch (error) {
                console.error('Error processing DSC data:', error);
                reject(new Error('Error processing DSC data: ' + error.message));
              }
            },
            error: (error) => {
              console.error('Error parsing DSC file:', error);
              reject(new Error('Error parsing DSC file: ' + error.message));
            }
          });
        } catch (error) {
          console.error('Error reading DSC file:', error);
          reject(new Error('Error reading DSC file: ' + error.message));
        }
      };

      reader.onerror = () => {
        console.error('FileReader error while reading DSC file');
        reject(new Error('Error reading DSC file'));
      };

      reader.readAsText(file);
    });
  }

  /**
   * Load Flexera data from CSV.
   */
  loadFlexeraData(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        Papa.parse(event.target.result, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            try {
              console.log('Parsed Flexera data (first rows):', results.data.slice(0, 5));
              // Enrich each row with a groupPath
              const enrichedData = results.data.map(row => {
                const rawName = row["Application - Product"] || "";
                const softwareName = rawName.trim();
                const groupPath = this._assignGroupToItem(softwareName);

                const confidence = this.classificationService.getClassificationConfidence(
                  softwareName, groupPath
                );
                return {
                  ...row,
                  groupPath,
                  classificationConfidence: confidence
                };
              });
              console.log("First enriched Flexera row:", enrichedData[0]);
              this._logClassificationStats(enrichedData);

              this.flexeraData = enrichedData;
              resolve(this.flexeraData);
            } catch (error) {
              console.error('Error processing Flexera data:', error);
              reject(new Error('Error processing Flexera data: ' + error.message));
            }
          },
          error: (error) => {
            console.error('Error parsing Flexera file:', error);
            reject(new Error('Error parsing Flexera file: ' + error.message));
          }
        });
      };

      reader.onerror = () => {
        console.error('FileReader error while reading Flexera file');
        reject(new Error('Error reading Flexera file'));
      };

      reader.readAsText(file);
    });
  }

  /**
   * Process DSC and Flexera data and combine into one structure.
   */
  processData(quarter) {
    if (!this.flexeraData) {
      throw new Error('Flexera data must be loaded first');
    }
    
    const groupedFlexeraData = this._groupFlexeraData(this.flexeraData);
    let dscData = [];
    let structure = {};
    
    if (this.dscStructure) {
      dscData = this.quarterData.get(quarter) || [];
      structure = this._createCombinedStructure(groupedFlexeraData, dscData);
    } else {
      // If no DSC data, just use Flexera data
      structure = Object.entries(groupedFlexeraData).reduce((acc, [groupName, groupData]) => {
        acc[groupName] = {
          flexeraData: groupData,
          dscData: {
            metrics: { totalUsers: 0, totalQuantity: 0, totalCost: 0 },
            subgroups: {},
            services: {}
          },
          comparison: {
            userDifference: groupData.metrics.uniqueUsers,
            utilizationRate: 0,
            installationRatio: 0
          }
        };
        return acc;
      }, {});
    }
    
    const summary = this._createSummary(dscData, this.flexeraData);
    return { structure, summary };
  }
  _logClassificationStats(enrichedData) {
    const groupCounts = {};
    let totalItems = enrichedData.length;
    let unclassifiedCount = 0;
    let classifiedCount = 0;
    let highConfidenceCount = 0;
    
    enrichedData.forEach(item => {
      const groupPath = item.groupPath;
      
      if (!groupCounts[groupPath]) {
        groupCounts[groupPath] = 1;
      } else {
        groupCounts[groupPath]++;
      }
      
      if (groupPath === "Unclassified") {
        unclassifiedCount++;
      } else {
        classifiedCount++;
        if (item.classificationConfidence >= 0.7) {
          highConfidenceCount++;
        }
      }
    });
    
    console.log("Classification Statistics:");
    console.log(`Total items: ${totalItems}`);
    console.log(`Classified: ${classifiedCount} (${(classifiedCount/totalItems*100).toFixed(2)}%)`);
    console.log(`Unclassified: ${unclassifiedCount} (${(unclassifiedCount/totalItems*100).toFixed(2)}%)`);
    console.log(`High confidence classifications: ${highConfidenceCount} (${(highConfidenceCount/totalItems*100).toFixed(2)}%)`);
    console.log("Group distribution:", groupCounts);
    
    if (unclassifiedCount > 0) {
      // Log some unclassified items to help improve the classification logic
      const sampleUnclassified = enrichedData
        .filter(item => item.groupPath === "Unclassified")
        .slice(0, 10)
        .map(item => item["Application - Product"]);
      
      console.log("Sample unclassified applications:", sampleUnclassified);
    }
  }
  /**
   * Create DSC structure by grouping DSC data by ServiceGroup.
   */
  _createDSCStructure(data) {
    return _.chain(data)
      .groupBy('ServiceGroup')
      .mapValues((groupData) => ({
        metrics: {
          totalUsers: _.uniqBy(groupData, 'PerUser_Email').length,
          totalQuantity: _.sumBy(groupData, row => parseFloat(row.Quantity) || 0),
          totalCost: _.sumBy(groupData, row =>
            parseFloat(row.UnitPrice) * parseFloat(row.Quantity) || 0
          )
        },
        subgroups: _.groupBy(groupData, 'ServiceSubgroup'),
        services: _.groupBy(groupData, 'Service')
      }))
      .value();
  }
  normalizeName(name) {
    return this.classificationService.normalizeName(name);
  }
  
  /**
   * Group Flexera data by the enriched groupPath.
   */
  _groupFlexeraData(data) {
    return _.chain(data)
      .groupBy(item => item.groupPath || "Unclassified")
      .mapValues(group => {
        const uniqueUsers = _.uniqBy(group, 'Assigned user - Email').length;
        const activeUsers = _.uniqBy(
          group.filter(item => item["Installations - Last used date"] && item["Installations - Last used date"].trim() !== ""),
          'Assigned user - Email'
        ).length;
        const totalInstallations = group.length;
              // Calculate average classification confidence
        const avgConfidence = group.reduce((sum, item) =>  sum + (item.classificationConfidence || 0), 0) / group.length;
        return {
          metrics: { uniqueUsers, activeUsers, totalInstallations, classificationConfidence: avgConfidence },
          items: group
        };
      })
      .value();
  }
  levenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
  
    const matrix = [];
  
    // Initialize the first row and column of the matrix.
    for (let i = 0; i <= a.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= b.length; j++) {
      matrix[0][j] = j;
    }
  
    // Fill in the rest of the matrix.
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        if (a[i - 1] === b[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j] + 1,    // Deletion
            matrix[i][j - 1] + 1,    // Insertion
            matrix[i - 1][j - 1] + 1 // Substitution
          );
        }
      }
    }
    return matrix[a.length][b.length];
  }
  similarity(a, b) {
    const distance = this.levenshteinDistance(a, b);
    return 1 - distance / Math.max(a.length, b.length);
  }
  /**
   * Combine DSC and Flexera data into a structure keyed by group name.
   */
  _createCombinedStructure(flexeraGroups, dscData) {
    const structure = {};

    if (this.dscStructure) {
      Object.entries(this.dscStructure).forEach(([groupName, groupData]) => {
        structure[groupName] = {
          dscData: groupData,
          flexeraData: flexeraGroups[groupName] || { 
            metrics: { uniqueUsers: 0, activeUsers: 0, totalInstallations: 0 }, 
            items: [] 
          },
          comparison: this._createComparison(flexeraGroups[groupName], groupData)
        };
      });
    }

    // Add Flexera groups that aren't in DSC
    Object.entries(flexeraGroups).forEach(([groupName, groupData]) => {
      if (!structure[groupName]) {
        structure[groupName] = {
          dscData: {
            metrics: { totalUsers: 0, totalQuantity: 0, totalCost: 0 },
            subgroups: {},
            services: {}
          },
          flexeraData: groupData,
          comparison: this._createComparison(groupData, { metrics: { totalUsers: 0, totalQuantity: 0, totalCost: 0 } })
        };
      }
    });
    return structure;
  }

  /**
   * Compare DSC vs. Flexera usage.
   */
  _createComparison(flexeraGroup, dscGroup) {
    const flexeraMetrics = flexeraGroup?.metrics || { uniqueUsers: 0, activeUsers: 0, totalInstallations: 0 };
    const dscMetrics = dscGroup.metrics;
    return {
      userDifference: flexeraMetrics.uniqueUsers - dscMetrics.totalUsers,
      utilizationRate: dscMetrics.totalUsers ? (flexeraMetrics.activeUsers / dscMetrics.totalUsers) * 100 : 0,
      installationRatio: dscMetrics.totalQuantity ? (flexeraMetrics.totalInstallations / dscMetrics.totalQuantity) : 0
    };
  }

  /**
   * Create summary information for DSC and Flexera.
   */
  _createSummary(dscData, flexeraData) {
    const flexeraSummary = {
      uniqueUsers: _.uniqBy(flexeraData, 'Assigned user - Email').length,
      activeUsers: _.uniqBy(
        flexeraData.filter(item => item["Installations - Last used date"] && item["Installations - Last used date"].trim() !== ""),
        'Assigned user - Email'
      ).length,
      totalInstallations: flexeraData.length,
      serviceGroups: Object.keys(this._groupFlexeraData(flexeraData)).length
    };

    // Calculate classification statistics
    const classified = flexeraData.filter(item => item.groupPath !== 'Unclassified').length;
    const unclassified = flexeraData.length - classified;
    const highConfidence = flexeraData.filter(item => (item.classificationConfidence || 0) >= 0.7).length;

    flexeraSummary.classifications = {
      classified,
      unclassified,
      highConfidence,
      classificationRate: (classified / flexeraData.length) * 100,
      highConfidenceRate: (highConfidence / flexeraData.length) * 100
    };

    // Get DSC summary if available
    let dscSummary = {
      uniqueUsers: 0,
      serviceGroups: 0,
      totalQuantity: 0,
      totalCost: 0
    };

    if (dscData && dscData.length > 0) {
      dscSummary = {
        uniqueUsers: _.uniqBy(dscData, 'PerUser_Email').length,
        serviceGroups: Object.keys(this.dscStructure || {}).length,
        totalQuantity: _.sumBy(dscData, row => parseFloat(row.Quantity) || 0),
        totalCost: _.sumBy(dscData, row =>
          parseFloat(row.UnitPrice) * parseFloat(row.Quantity) || 0
        )
      };
    }

    return {
      dsc: dscSummary,
      flexera: flexeraSummary
    };
  }
}

export default DataProcessingService;
