import React from 'react';

/**
 * CostSummary component displays high-level cost metrics and KPIs
 * @param {Object} props - Component props
 * @param {Object} props.data - Application data containing cost and usage metrics
 * @param {Object} props.chartData - Processed chart data for visualization
 */
const CostSummary = ({ data, chartData }) => {
  // Calculate summary metrics
  const calculateSummaryMetrics = () => {
    if (!data?.structure || !chartData) {
      return {
        totalCost: 0,
        totalUBCCost: 0,
        totalApplications: 0,
        totalUsers: 0,
        averageCostPerUser: 0,
        averageCostPerApp: 0,
        costBreakdown: []
      };
    }

    // Initialize summary values
    let totalCost = 0;
    let totalUBCCost = 0;
    let totalApplications = 0;
    let totalUsers = new Set();
    const businessUnitCosts = {};

    // Process structure data
    Object.entries(data.structure).forEach(([groupName, groupData]) => {
      if (groupData.flexeraData) {
        // Add to total cost - prioritize UBC cost if available
        const groupCost = groupData.flexeraData.metrics?.totalCost || 0;
        const groupUBCCost = groupData.flexeraData.metrics?.totalUBCCost || 0;

        totalCost += groupCost;
        totalUBCCost += groupUBCCost;

        // Track business unit costs
        const businessUnit = groupName.split('>')[0].trim();
        if (!businessUnitCosts[businessUnit]) {
          businessUnitCosts[businessUnit] = {
            dscCost: 0,
            ubcCost: 0
          };
        }
        businessUnitCosts[businessUnit].dscCost += groupCost;
        businessUnitCosts[businessUnit].ubcCost += groupUBCCost;

        // Add unique users to set
        if (Array.isArray(groupData.flexeraData.items)) {
          groupData.flexeraData.items.forEach(item => {
            const email = item['Assigned user - Email'];
            if (email) totalUsers.add(email);
          });

          // Count unique applications
          const uniqueApps = new Set();
          groupData.flexeraData.items.forEach(item => {
            const appName = item['Application - Product'];
            if (appName) uniqueApps.add(appName);
          });
          totalApplications += uniqueApps.size;
        }
      }
    });

    // Calculate averages
    const userCount = totalUsers.size;
    const averageCostPerUser = userCount > 0 ? totalCost / userCount : 0;
    const averageCostPerApp = totalApplications > 0 ? totalCost / totalApplications : 0;
    const averageUBCCostPerUser = userCount > 0 ? totalUBCCost / userCount : 0;

    // Prepare cost breakdown for visualization
    const costBreakdown = Object.entries(businessUnitCosts).map(([unit, costs]) => ({
      name: unit,
      value: costs.dscCost,
      ubcValue: costs.ubcCost,
      percentage: totalCost > 0 ? (costs.dscCost / totalCost) * 100 : 0,
      ubcPercentage: totalUBCCost > 0 ? (costs.ubcCost / totalUBCCost) * 100 : 0
    })).sort((a, b) => b.value - a.value);

    return {
      totalCost,
      totalUBCCost,
      totalApplications,
      totalUsers: userCount,
      averageCostPerUser,
      averageUBCCostPerUser,
      averageCostPerApp,
      costBreakdown
    };
  };

  const metrics = calculateSummaryMetrics();

  // Find most efficient and least efficient applications
  const getEfficiencyInsights = () => {
    const allApps = [...chartData.top, ...chartData.least, ...chartData.costliest]
      .filter((app, index, self) =>
        index === self.findIndex(a => a.name === app.name)
      )
      .filter(app => app.users > 5); // Filter out very small use cases

    const mostEfficient = [...allApps]
      .filter(app => app.totalCost > 0)
      .sort((a, b) => (a.totalCost / a.users) - (b.totalCost / b.users))
      .slice(0, 3);

    const leastEfficient = [...allApps]
      .filter(app => app.totalCost > 1000) // Filter out very low cost apps
      .sort((a, b) => (b.totalCost / b.users) - (a.totalCost / a.users))
      .slice(0, 3);

    return { mostEfficient, leastEfficient };
  };

  const { mostEfficient, leastEfficient } = getEfficiencyInsights();

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="text-sm text-blue-700">Total DSC Cost</h4>
        <p className="text-2xl font-bold">${metrics.totalCost.toLocaleString()}</p>
      </div>
      <div className="bg-purple-50 p-4 rounded-lg">
        <h4 className="text-sm text-purple-700">Total UBC Cost</h4>
        <p className="text-2xl font-bold">${metrics.totalUBCCost.toLocaleString()}</p>
      </div>
      <div className="bg-green-50 p-4 rounded-lg">
        <h4 className="text-sm text-green-700">Applications</h4>
        <p className="text-2xl font-bold">{metrics.totalApplications.toLocaleString()}</p>
      </div>
      <div className="bg-yellow-50 p-4 rounded-lg">
        <h4 className="text-sm text-yellow-700">Total Users</h4>
        <p className="text-2xl font-bold">{metrics.totalUsers.toLocaleString()}</p>
      </div>
      <div className="bg-amber-50 p-4 rounded-lg">
        <h4 className="text-sm text-amber-700">Avg DSC Cost/User</h4>
        <p className="text-2xl font-bold">${metrics.averageCostPerUser.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
      </div>
      <div className="bg-red-50 p-4 rounded-lg">
        <h4 className="text-sm text-red-700">Avg UBC Cost/User</h4>
        <p className="text-2xl font-bold">${metrics.averageUBCCostPerUser.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
      </div>
      <div className="bg-indigo-50 p-4 col-span-2 rounded-lg">
        <h4 className="text-sm text-indigo-700">Avg Cost/Application</h4>
        <p className="text-2xl font-bold">${metrics.averageCostPerApp.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
      </div>
    

      {/* Efficiency Insights */ }
  <div className="bg-white p-6 rounded-lg shadow">
    <h3 className="text-lg font-semibold mb-4">Cost Efficiency Insights</h3>

    <div className="mb-6">
      <h4 className="text-md font-semibold mb-2">Most Cost-Efficient Applications</h4>
      <div className="space-y-2">
        {mostEfficient.map((app, index) => (
          <div key={index} className="p-3 bg-green-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium">{app.name}</span>
              <span className="text-green-700 font-bold">
                ${(app.totalCost / app.users).toLocaleString(undefined, { maximumFractionDigits: 2 })}/user
              </span>
            </div>
            <div className="text-sm text-gray-600 mt-1">
              ${app.totalCost.toLocaleString()} total cost | {app.users} users | {app.accesses} accesses
            </div>
          </div>
        ))}
      </div>
    </div>

    <div>
      <h4 className="text-md font-semibold mb-2">Least Cost-Efficient Applications</h4>
      <div className="space-y-2">
        {leastEfficient.map((app, index) => (
          <div key={index} className="p-3 bg-red-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium">{app.name}</span>
              <span className="text-red-700 font-bold">
                ${(app.totalCost / app.users).toLocaleString(undefined, { maximumFractionDigits: 2 })}/user
              </span>
            </div>
            <div className="text-sm text-gray-600 mt-1">
              ${app.totalCost.toLocaleString()} total cost | {app.users} users | {app.accesses} accesses
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
    </div >
  );
};

export default CostSummary;