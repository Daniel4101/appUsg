/**
 * Builds a nested hierarchical structure from grouped data
 * @param {Object} groupedData - Flat data structure with hierarchical paths as keys
 * @returns {Object} A nested tree structure
 */
function buildNestedStructure(groupedData) {
    const root = {};
  
    // Extract business units first (top-level categories)
    const businessUnits = new Set();
    for (const fullPath of Object.keys(groupedData)) {
      const segments = fullPath.split('>').map(s => s.trim());
      businessUnits.add(segments[0]);
    }
  
    // Create top-level business unit nodes
    businessUnits.forEach(unit => {
      root[unit] = {
        __meta: {
          metrics: {
            uniqueUsers: 0,
            activeUsers: 0,
            totalInstallations: 0,
            businessUnit: unit,
            totalCost: 0,
            totalUBCCost: 0  // Added UBC cost metric
          },
          items: [],
          applications: [],
          children: {}
        }
      };
    });
  
    // Collect all apps to add to appropriate business units
    const appsByBusinessUnit = {};
  
    // Now add all groups to their respective business units
    for (const [fullPath, groupObj] of Object.entries(groupedData)) {
      const segments = fullPath.split('>').map(s => s.trim());
      const businessUnit = segments[0];
      
      // Skip if somehow we don't have this business unit (shouldn't happen)
      if (!root[businessUnit]) continue;
  
      // Extract applications from this group
      const applications = [];
      if (groupObj.flexeraData && Array.isArray(groupObj.flexeraData.items)) {
        // Group items by application
        const appGroups = {};
        groupObj.flexeraData.items.forEach(item => {
          const appName = item["Application - Product"] || "Unclassified";
          if (!appGroups[appName]) {
            appGroups[appName] = [];
          }
          appGroups[appName].push(item);
        });
  
        // Create application objects
        Object.entries(appGroups).forEach(([appName, items]) => {
          const uniqueUsers = new Set(items.map(i => i["Assigned user - Email"] || "")).size;
          const activeUsers = new Set(
            items
              .filter(i => i["Installations - Last used date"]?.trim())
              .map(i => i["Assigned user - Email"] || "")
          ).size;
          
          // Calculate total UBC cost for this application
          const ubcCost = items.reduce((sum, item) => sum + (parseFloat(item.ubcCost) || 0), 0);

          applications.push({
            name: appName,
            users: uniqueUsers,
            activeUsers: activeUsers,
            accesses: items.length,
            businessUnit: businessUnit,
            totalCost: groupObj.flexeraData.metrics?.totalCost || 0,
            ubcCost: ubcCost,  // Add UBC cost for applications
            items: items
          });
        });
  
        // Track apps by business unit
        if (!appsByBusinessUnit[businessUnit]) {
          appsByBusinessUnit[businessUnit] = [];
        }
        appsByBusinessUnit[businessUnit] = appsByBusinessUnit[businessUnit].concat(applications);
      }
  
      // Skip adding if there's only one segment (it's just the business unit)
      if (segments.length === 1) {
        // Update business unit metrics
        const metrics = groupObj.metrics || groupObj.flexeraData?.metrics || {};
        root[businessUnit].__meta.metrics.uniqueUsers += metrics.uniqueUsers || 0;
        root[businessUnit].__meta.metrics.activeUsers += metrics.activeUsers || 0;
        root[businessUnit].__meta.metrics.totalInstallations += metrics.totalInstallations || 0;
        root[businessUnit].__meta.metrics.totalCost += metrics.totalCost || 0;
        root[businessUnit].__meta.metrics.totalUBCCost += metrics.totalUBCCost || 0;  // Add UBC cost for business units
        root[businessUnit].__meta.items = root[businessUnit].__meta.items.concat(groupObj.items || []);
        root[businessUnit].__meta.applications = root[businessUnit].__meta.applications.concat(applications);
        continue;
      }
  
      // For nested groups, build the hierarchy
      let currentNode = root[businessUnit].__meta.children;
      for (let i = 1; i < segments.length; i++) {
        const segment = segments[i];
        if (!currentNode[segment]) {
          currentNode[segment] = {
            __meta: {
              metrics: {
                uniqueUsers: 0,
                activeUsers: 0,
                totalInstallations: 0,
                businessUnit: businessUnit,
                totalCost: 0,
                totalUBCCost: 0  // Add UBC cost for nested groups
              },
              items: [],
              applications: [],
              children: {}
            }
          };
        }
  
        if (i === segments.length - 1) {
          // This is the leaf node - add metrics and items
          const metrics = groupObj.metrics || groupObj.flexeraData?.metrics || {};
          currentNode[segment].__meta.metrics.uniqueUsers += metrics.uniqueUsers || 0;
          currentNode[segment].__meta.metrics.activeUsers += metrics.activeUsers || 0;
          currentNode[segment].__meta.metrics.totalInstallations += metrics.totalInstallations || 0;
          currentNode[segment].__meta.metrics.totalCost += metrics.totalCost || 0;
          currentNode[segment].__meta.metrics.totalUBCCost += metrics.totalUBCCost || 0;  // Add UBC cost for leaf nodes
          currentNode[segment].__meta.items = currentNode[segment].__meta.items.concat(groupObj.items || []);
          currentNode[segment].__meta.applications = currentNode[segment].__meta.applications.concat(applications);
          
          // Also roll up metrics to business unit
          root[businessUnit].__meta.metrics.uniqueUsers += metrics.uniqueUsers || 0;
          root[businessUnit].__meta.metrics.activeUsers += metrics.activeUsers || 0;
          root[businessUnit].__meta.metrics.totalInstallations += metrics.totalInstallations || 0;
          root[businessUnit].__meta.metrics.totalCost += metrics.totalCost || 0;
          root[businessUnit].__meta.metrics.totalUBCCost += metrics.totalUBCCost || 0; // Add roll-up of UBC costs
        }
        
        currentNode = currentNode[segment].__meta.children;
      }
    }
  
    // Add applications to business units
    Object.entries(appsByBusinessUnit).forEach(([businessUnit, apps]) => {
      if (root[businessUnit]) {
        // Deduplicate applications by name
        const uniqueApps = {};
        apps.forEach(app => {
          if (!uniqueApps[app.name]) {
            uniqueApps[app.name] = app;
          } else {
            // Merge metrics
            uniqueApps[app.name].users += app.users;
            uniqueApps[app.name].activeUsers += app.activeUsers;
            uniqueApps[app.name].accesses += app.accesses;
            uniqueApps[app.name].totalCost += app.totalCost;
            uniqueApps[app.name].ubcCost = (uniqueApps[app.name].ubcCost || 0) + (app.ubcCost || 0);  // Merge UBC costs
            uniqueApps[app.name].items = uniqueApps[app.name].items.concat(app.items || []);
          }
        });
        
        root[businessUnit].__meta.applications = Object.values(uniqueApps);
      }
    });
  
    return root;
  }
  
  export default buildNestedStructure;