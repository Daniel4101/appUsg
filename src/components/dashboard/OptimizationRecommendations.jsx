import React from 'react';

/**
 * OptimizationRecommendations component analyzes application data
 * and provides cost-saving and efficiency recommendations.
 */
const OptimizationRecommendations = ({ data, chartData }) => {
  // Generate recommendations based on application data
  const generateRecommendations = () => {
    if (!data?.structure || !chartData) {
      return {
        consolidationOpportunities: [],
        underutilizedApps: [],
        highCostReview: [],
        licenseOptimization: []
      };
    }

    // Consolidation opportunities (similar apps in same business unit)
    const consolidationOpportunities = [];
    const appsByBusinessUnit = {};
    const appsByFunction = {};
    
    // Identify similar applications and group them
    Object.entries(data.structure).forEach(([groupPath, groupData]) => {
      if (!groupData?.flexeraData?.items) return;
      
      const businessUnit = groupPath.split('>')[0].trim();
      if (!appsByBusinessUnit[businessUnit]) {
        appsByBusinessUnit[businessUnit] = {};
      }
      
      // Group by application type/category
      groupData.flexeraData.items.forEach(item => {
        const appName = item['Application - Product'] || 'Unclassified';
        // Simplify app name to detect similar apps (e.g. "Adobe Photoshop CC 2022" -> "adobe photoshop")
        const simplifiedName = appName.toLowerCase()
          .replace(/[0-9]/g, '')
          .replace(/\s+/g, ' ')
          .replace(/\s+(pro|premium|cc|cs|suite|enterprise|standard|professional|version)(\s+|$)/g, ' ')
          .trim();
          
        // Skip if too generic
        if (simplifiedName.length < 5) return;
          
        if (!appsByBusinessUnit[businessUnit][simplifiedName]) {
          appsByBusinessUnit[businessUnit][simplifiedName] = [];
        }
        
        // Only add unique apps
        if (!appsByBusinessUnit[businessUnit][simplifiedName].includes(appName)) {
          appsByBusinessUnit[businessUnit][simplifiedName].push(appName);
        }
        
        // Also track apps by function across business units
        if (!appsByFunction[simplifiedName]) {
          appsByFunction[simplifiedName] = {
            businessUnits: {},
            apps: []
          };
        }
        if (!appsByFunction[simplifiedName].businessUnits[businessUnit]) {
          appsByFunction[simplifiedName].businessUnits[businessUnit] = true;
        }
        if (!appsByFunction[simplifiedName].apps.includes(appName)) {
          appsByFunction[simplifiedName].apps.push(appName);
        }
      });
    });
    
    // Find opportunities for consolidation within business units
    Object.entries(appsByBusinessUnit).forEach(([businessUnit, appGroups]) => {
      Object.entries(appGroups).forEach(([simplifiedName, apps]) => {
        if (apps.length > 1) {
          consolidationOpportunities.push({
            type: 'internal',
            businessUnit,
            category: simplifiedName,
            applications: apps,
            count: apps.length
          });
        }
      });
    });
    
    // Find opportunities for consolidation across business units
    Object.entries(appsByFunction).forEach(([simplifiedName, data]) => {
      const businessUnitCount = Object.keys(data.businessUnits).length;
      if (businessUnitCount > 1 && data.apps.length > 1) {
        consolidationOpportunities.push({
          type: 'cross-unit',
          category: simplifiedName,
          applications: data.apps,
          businessUnits: Object.keys(data.businessUnits),
          count: data.apps.length
        });
      }
    });
    
    // Sort by number of apps (largest consolidation opportunities first)
    consolidationOpportunities.sort((a, b) => b.count - a.count);
    
    // Find underutilized applications (low usage but high cost)
    const underutilizedApps = [];
    
    // Get all apps with their usage and cost data
    const allApps = [];
    [...chartData.top, ...chartData.least, ...chartData.costliest].forEach(app => {
      if (!allApps.some(a => a.name === app.name)) {
        allApps.push(app);
      }
    });
    
    // Calculate utilization metrics
    allApps.forEach(app => {
      const utilization = app.activeUsers / app.users;
      const costPerActiveUser = app.activeUsers > 0 ? app.totalCost / app.activeUsers : app.totalCost;
      
      // Flag apps with low utilization but significant cost
      if (app.totalCost > 1000 && app.users > 5 && utilization < 0.5) {
        underutilizedApps.push({
          ...app,
          utilization,
          costPerActiveUser,
          potentialSavings: app.totalCost * (1 - utilization)
        });
      }
    });
    
    // Sort by potential savings (highest first)
    underutilizedApps.sort((a, b) => b.potentialSavings - a.potentialSavings);
    
    // Identify high-cost applications for review
    const highCostReview = allApps
      .filter(app => app.totalCost > 5000)
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 5);
      
    // License optimization opportunities (examine apps with high cost per user)
    const licenseOptimization = allApps
      .filter(app => app.users > 5 && app.totalCost > 1000)
      .sort((a, b) => (b.totalCost / b.users) - (a.totalCost / a.users))
      .slice(0, 5)
      .map(app => ({
        ...app,
        costPerUser: app.totalCost / app.users,
        potentialUserReduction: Math.round(app.users * 0.1), // Assume 10% reduction is possible
        potentialSavings: (app.totalCost / app.users) * Math.round(app.users * 0.1)
      }));
      
    return {
      consolidationOpportunities: consolidationOpportunities.slice(0, 5),
      underutilizedApps: underutilizedApps.slice(0, 3),
      highCostReview,
      licenseOptimization
    };
  };
  
  const recommendations = generateRecommendations();
  
  // Calculate total potential savings
  const calculateTotalSavings = () => {
    let total = 0;
    
    // Consolidation (assume 30% savings from consolidation)
    recommendations.consolidationOpportunities.forEach(opportunity => {
      // Find the total cost of these applications
      const apps = opportunity.applications;
      const totalCost = apps.reduce((sum, appName) => {
        const app = [...chartData.top, ...chartData.costliest, ...chartData.least]
          .find(a => a.name === appName);
        return sum + (app?.totalCost || 0);
      }, 0);
      
      total += totalCost * 0.3; // 30% savings estimate
    });
    
    // Underutilized apps
    recommendations.underutilizedApps.forEach(app => {
      total += app.potentialSavings;
    });
    
    // License optimization
    recommendations.licenseOptimization.forEach(app => {
      total += app.potentialSavings;
    });
    
    return total;
  };
  
  const totalPotentialSavings = calculateTotalSavings();
  
  return (
    <div className="bg-white p-6 rounded-lg shadow mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Optimization Recommendations</h2>
        <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg flex items-center">
          <span className="font-medium">Potential Annual Savings:</span>
          <span className="text-xl font-bold ml-2">${totalPotentialSavings.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Consolidation Opportunities */}
        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3">Application Consolidation</h3>
          {recommendations.consolidationOpportunities.length > 0 ? (
            <div className="space-y-3">
              {recommendations.consolidationOpportunities.map((opportunity, index) => (
                <div key={index} className="bg-blue-50 p-3 rounded">
                  <div className="font-medium flex justify-between">
                    <span>{opportunity.category} ({opportunity.count} apps)</span>
                    <span className="text-blue-700">{opportunity.type === 'internal' ? opportunity.businessUnit : 'Cross-BU'}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {opportunity.applications.slice(0, 3).join(', ')}
                    {opportunity.applications.length > 3 ? ` and ${opportunity.applications.length - 3} more...` : ''}
                  </p>
                  <div className="text-xs text-gray-500 mt-1">
                    Recommendation: Standardize on a single solution across {opportunity.type === 'internal' ? 'the business unit' : 'business units'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No consolidation opportunities found.</p>
          )}
        </div>
        
        {/* Underutilized Applications */}
        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3">Underutilized Applications</h3>
          {recommendations.underutilizedApps.length > 0 ? (
            <div className="space-y-3">
              {recommendations.underutilizedApps.map((app, index) => (
                <div key={index} className="bg-amber-50 p-3 rounded">
                  <div className="font-medium flex justify-between">
                    <span>{app.name}</span>
                    <span className="text-amber-700">${app.potentialSavings.toLocaleString(undefined, {maximumFractionDigits: 0})} potential savings</span>
                  </div>
                  <div className="text-sm mt-1 flex justify-between">
                    <span>Utilization: {(app.utilization * 100).toFixed(1)}%</span>
                    <span>Total cost: ${app.totalCost.toLocaleString()}</span>
                  </div>
                  <div className="text-sm">
                    <span>{app.users} licensed users, only {app.activeUsers} active</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Recommendation: Reduce licenses or implement user training
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No underutilized applications found.</p>
          )}
        </div>
        
        {/* High Cost Review */}
        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3">High Cost Applications Review</h3>
          {recommendations.highCostReview.length > 0 ? (
            <div className="space-y-3">
              {recommendations.highCostReview.map((app, index) => (
                <div key={index} className="bg-purple-50 p-3 rounded">
                  <div className="font-medium flex justify-between">
                    <span>{app.name}</span>
                    <span className="text-purple-700">${app.totalCost.toLocaleString()}</span>
                  </div>
                  <div className="text-sm mt-1">
                    <span>Users: {app.users} | Cost per user: ${(app.totalCost / app.users).toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Recommendation: Contract negotiation and vendor management review
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No high cost applications to review.</p>
          )}
        </div>
        
        {/* License Optimization */}
        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3">License Optimization</h3>
          {recommendations.licenseOptimization.length > 0 ? (
            <div className="space-y-3">
              {recommendations.licenseOptimization.map((app, index) => (
                <div key={index} className="bg-green-50 p-3 rounded">
                  <div className="font-medium flex justify-between">
                    <span>{app.name}</span>
                    <span className="text-green-700">${app.potentialSavings.toLocaleString(undefined, {maximumFractionDigits: 0})} potential savings</span>
                  </div>
                  <div className="text-sm mt-1">
                    <span>Current licenses: {app.users} | Recommended reduction: {app.potentialUserReduction}</span>
                  </div>
                  <div className="text-sm">
                    <span>Cost per user: ${app.costPerUser.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Recommendation: Right-size licenses based on actual usage patterns
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No license optimization opportunities found.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default OptimizationRecommendations;