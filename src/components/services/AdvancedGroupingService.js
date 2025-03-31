import _ from 'lodash';
import StorageService from './StorageService';

/**
 * Service to handle advanced application grouping functionality with improved storage
 */
class AdvancedGroupingService {
  constructor() {
    // Initialize with empty groups array if storage fails
    this.customGroups = [];
    this.groupMatchCache = {};
    
    // Load saved groups with logging
    this.loadGroups();
  }

  /**
   * Load custom groups from localStorage with improved error handling
   */
  loadGroups() {
    try {
      console.log('Loading application groups...');
      this.customGroups = StorageService.loadData('applicationGroups', []);
      console.log(`Loaded ${this.customGroups.length} groups:`, this.customGroups);
      return this.customGroups;
    } catch (error) {
      console.error('Error loading application groups:', error);
      this.customGroups = [];
      return [];
    }
  }

  /**
   * Save custom groups to localStorage with verification
   */
  saveGroups(groups) {
    console.log('Saving application groups:', groups);
    const success = StorageService.saveData('applicationGroups', groups);
    
    if (success) {
      this.customGroups = groups;
      this.groupMatchCache = {}; // Clear cache after changes
      return true;
    }
    
    console.error('Failed to save application groups');
    return false;
  }

  /**
   * Create a new custom application group
   */
  createGroup(groupData) {
    console.log('Creating new group with data:', groupData);
    const newGroup = {
      id: Date.now().toString(),
      name: groupData.name,
      applications: groupData.applications || [],
      description: groupData.description || '',
      createdAt: new Date().toISOString()
    };
    
    // Make a copy of the current groups to avoid mutation issues
    const updatedGroups = [...this.customGroups, newGroup];
    
    // Save groups and return the newly created group
    const saved = this.saveGroups(updatedGroups);
    
    // Force reload to ensure consistency
    if (saved) {
      this.loadGroups();
      return newGroup;
    }
    
    return null;
  }

  /**
   * Update an existing custom group
   */
  updateGroup(groupData) {
    console.log('Updating group:', groupData);
    
    // Make sure we have the latest groups
    this.loadGroups();
    
    const updatedGroups = this.customGroups.map(group => {
      if (group.id === groupData.id) {
        return {
          ...group,
          name: groupData.name,
          applications: groupData.applications || [],
          description: groupData.description || group.description || '',
          updatedAt: new Date().toISOString()
        };
      }
      return group;
    });
    
    // Save groups and return the updated group
    const saved = this.saveGroups(updatedGroups);
    
    if (saved) {
      // Force reload to ensure consistency
      this.loadGroups();
      return updatedGroups.find(g => g.id === groupData.id);
    }
    
    return null;
  }

  /**
   * Delete a custom group
   */
  deleteGroup(groupId) {
    console.log('Deleting group:', groupId);
    
    // Make sure we have the latest groups
    this.loadGroups();
    
    const groupToDelete = this.customGroups.find(g => g.id === groupId);
    if (!groupToDelete) {
      console.warn(`Group with ID ${groupId} not found for deletion`);
      return false;
    }
    
    const updatedGroups = this.customGroups.filter(group => group.id !== groupId);
    
    // Save groups
    const saved = this.saveGroups(updatedGroups);
    
    if (saved) {
      // Force reload to ensure consistency
      this.loadGroups();
      return true;
    }
    
    return false;
  }

  /**
   * Get all custom groups
   */
  getAllGroups() {
    // Always refresh from storage to ensure consistency
    return this.loadGroups();
  }

  /**
   * Get a specific group by ID
   */
  getGroupById(groupId) {
    // Make sure we have the latest groups
    this.loadGroups();
    return this.customGroups.find(group => group.id === groupId);
  }

  /**
   * Check if an application belongs to a group
   */
  isAppInGroup(appName, groupId) {
    // Make sure we have the latest groups
    this.loadGroups();
    
    const cacheKey = `${appName}|${groupId}`;
    
    // Check cache first
    if (this.groupMatchCache[cacheKey] !== undefined) {
      return this.groupMatchCache[cacheKey];
    }
    
    const group = this.getGroupById(groupId);
    if (!group) return false;
    
    const result = group.applications.includes(appName);
    this.groupMatchCache[cacheKey] = result;
    return result;
  }

  /**
   * Get all groups that an application belongs to
   */
  getGroupsForApp(appName) {
    // Make sure we have the latest groups
    this.loadGroups();
    return this.customGroups.filter(group => group.applications.includes(appName));
  }

  /**
   * Apply custom grouping to an application data structure
   */
  applyGroupingToData(appData) {
    if (!appData || !Array.isArray(appData)) return appData;
    
    // Make sure we have the latest groups
    this.loadGroups();
    
    return appData.map(app => {
      const appGroups = this.getGroupsForApp(app.name);
      return {
        ...app,
        customGroups: appGroups.map(g => g.name)
      };
    });
  }

  /**
   * Group data by custom groups
   */
  groupDataByCustomGroups(appData) {
    if (!appData || !Array.isArray(appData)) return {};
    
    // Make sure we have the latest groups
    this.loadGroups();
    
    const result = {};
    
    // Initialize with empty arrays for each group
    this.customGroups.forEach(group => {
      result[group.name] = [];
    });
    
    // Add apps to their respective groups
    appData.forEach(app => {
      this.customGroups.forEach(group => {
        if (group.applications.includes(app.name)) {
          result[group.name].push(app);
        }
      });
    });
    
    return result;
  }

  /**
   * Get metrics for each custom group based on app data
   */
  getGroupMetrics(appData) {
    if (!appData || !Array.isArray(appData)) return [];
    
    // Make sure we have the latest groups
    this.loadGroups();
    
    const groupedData = this.groupDataByCustomGroups(appData);
    
    return this.customGroups.map(group => {
      const apps = groupedData[group.name] || [];
      const userSet = new Set();
      let totalCost = 0;
      let totalAccesses = 0;
      
      apps.forEach(app => {
        if (app.users) {
          totalAccesses += app.accesses || 0;
          totalCost += app.totalCost || 0;
          
          // We don't have actual user emails here, so we'll use a proxy count
          for (let i = 0; i < app.users; i++) {
            userSet.add(`${app.name}-user-${i}`);
          }
        }
      });
      
      return {
        id: group.id,
        name: group.name,
        applications: apps.map(a => a.name),
        applicationCount: apps.length,
        userCount: userSet.size,
        totalCost,
        totalAccesses,
        avgCostPerUser: userSet.size > 0 ? totalCost / userSet.size : 0
      };
    });
  }
}

export default AdvancedGroupingService;