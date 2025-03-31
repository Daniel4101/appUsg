import React, { useState, useEffect } from 'react';
import _ from 'lodash';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

/**
 * ClassificationDashboard displays statistics and tools for application classification
 */
const ClassificationDashboard = ({ data, onReclassify, classificationService }) => {
  const [stats, setStats] = useState({
    total: 0,
    classified: 0,
    unclassified: 0,
    byGroup: {},
    classificationRate: 0
  });
  
  const [unclassifiedApps, setUnclassifiedApps] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [targetGroup, setTargetGroup] = useState('');
  const [customGroups, setCustomGroups] = useState({});
  const [chartData, setChartData] = useState([]);
  
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', 
                 '#82ca9d', '#8dd1e1', '#a4de6c', '#d0ed57', '#ffc658'];
  
  // Process data to extract classification statistics
  useEffect(() => {
    if (!data?.structure) return;
    
    const appsByGroup = {};
    const unclassified = [];
    let totalApps = 0;
    
    // Process all apps across all groups
    Object.entries(data.structure).forEach(([groupName, groupData]) => {
      if (!groupData?.flexeraData?.items) return;
      
      const items = groupData.flexeraData.items;
      totalApps += items.length;
      
      // Group by application name
      const uniqueApps = {};
      items.forEach(item => {
        const appName = item['Application - Product'] || 'Unknown';
        const path = item.groupPath || groupName;
        
        if (!uniqueApps[appName]) {
          uniqueApps[appName] = {
            name: appName,
            count: 1,
            groupPath: path,
            confidence: item.classificationConfidence || 0
          };
        } else {
          uniqueApps[appName].count++;
        }
        
        // Track unclassified applications
        if (path === 'Unclassified') {
          const existingApp = unclassified.find(app => app.name === appName);
          if (!existingApp) {
            unclassified.push({
              name: appName,
              count: 1,
              suggestions: []
            });
          } else {
            existingApp.count++;
          }
        }
      });
      
      // Update group counts
      if (groupName !== 'Unclassified') {
        appsByGroup[groupName] = Object.values(uniqueApps).filter(app => 
          app.groupPath !== 'Unclassified'
        );
      }
    });
    
    // Generate suggestions for unclassified apps
    if (classificationService) {
      unclassified.forEach(app => {
        app.suggestions = generateSuggestionsForApp(app.name, classificationService);
      });
    }
    
    // Calculate statistics
    const classified = totalApps - unclassified.reduce((sum, app) => sum + app.count, 0);
    const classificationRate = totalApps > 0 ? (classified / totalApps) * 100 : 0;
    
    // Sort unclassified apps by count (most common first)
    const sortedUnclassified = _.sortBy(unclassified, app => -app.count);
    
    // Prepare chart data
    const groupCountData = Object.entries(appsByGroup).map(([group, apps]) => ({
      name: group.split(' > ').pop(), // Get last part of path for display
      fullPath: group,
      value: apps.length,
      itemCount: apps.reduce((sum, app) => sum + app.count, 0)
    }));
    
    // Add unclassified to chart data
    if (sortedUnclassified.length > 0) {
      groupCountData.push({
        name: 'Unclassified',
        fullPath: 'Unclassified',
        value: sortedUnclassified.length,
        itemCount: sortedUnclassified.reduce((sum, app) => sum + app.count, 0)
      });
    }
    
    // Sort and limit to top 9 groups + Others
    const sortedChartData = _.sortBy(groupCountData, entry => -entry.itemCount);
    let finalChartData;
    
    if (sortedChartData.length > 10) {
      const topGroups = sortedChartData.slice(0, 9);
      const otherGroups = sortedChartData.slice(9);
      
      const otherCount = otherGroups.reduce((sum, group) => sum + group.itemCount, 0);
      finalChartData = [
        ...topGroups,
        {
          name: 'Others',
          fullPath: 'Others',
          value: otherGroups.length,
          itemCount: otherCount
        }
      ];
    } else {
      finalChartData = sortedChartData;
    }
    
    setChartData(finalChartData);
    setStats({
      total: totalApps,
      classified,
      unclassified: totalApps - classified,
      byGroup: appsByGroup,
      classificationRate
    });
    setUnclassifiedApps(sortedUnclassified);
  }, [data, classificationService]);
  
  /**
   * Generate classification suggestions for an application
   */
  const generateSuggestionsForApp = (appName, service) => {
    // Get predefined groups from the keywordMappings
    const predefinedGroups = Object.keys(service.keywordMappings || {});
    
    // Generate potential matches with confidence scores
    return predefinedGroups.map(group => {
      const confidence = service.getClassificationConfidence(appName, group);
      return { group, confidence };
    })
    .filter(suggestion => suggestion.confidence > 0.2) // Filter by minimum confidence
    .sort((a, b) => b.confidence - a.confidence) // Sort by confidence
    .slice(0, 3); // Take top 3 suggestions
  };
  
  /**
   * Handle reclassification of an application
   */
  const handleReclassify = () => {
    if (!selectedApp || !targetGroup) return;
    
    // Call parent component's reclassify handler
    if (onReclassify) {
      onReclassify(selectedApp.name, targetGroup);
    }
    
    // Update local state
    const updatedUnclassified = unclassifiedApps.filter(app => app.name !== selectedApp.name);
    setUnclassifiedApps(updatedUnclassified);
    setSelectedApp(null);
    setTargetGroup('');
    
    // Store custom classification for future reference
    setCustomGroups(prev => ({
      ...prev,
      [selectedApp.name]: targetGroup
    }));
  };
  
  /**
   * Handle selection of a suggestion
   */
  const handleSelectSuggestion = (suggestion) => {
    setTargetGroup(suggestion.group);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
      <h2 className="text-xl font-semibold mb-4">Application Classification Dashboard</h2>
      
      {/* Classification statistics */}
      <div className="mb-6">
  <h3 className="text-lg font-semibold mb-3">Application Classification</h3>
</div>
      
      {/* Classification distribution chart and unclassified applications */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Chart */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Classification Distribution</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="itemCount"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  label
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name, props) => {
                    return [`${value} instances (${props.payload.value} unique apps)`, props.payload.fullPath];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Unclassified applications */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Unclassified Applications</h3>
          <div className="h-80 overflow-y-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left p-2">Application</th>
                  <th className="text-right p-2">Instances</th>
                  <th className="text-center p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {unclassifiedApps.map((app, index) => (
                  <tr 
                    key={index} 
                    className={selectedApp?.name === app.name ? "bg-blue-50" : (index % 2 === 0 ? "bg-gray-50" : "")}
                    onClick={() => setSelectedApp(app)}
                  >
                    <td className="p-2">{app.name}</td>
                    <td className="p-2 text-right">{app.count}</td>
                    <td className="p-2 text-center">
                      <button 
                        className="text-blue-600 hover:text-blue-800"
                        onClick={() => setSelectedApp(app)}
                      >
                        Select
                      </button>
                    </td>
                  </tr>
                ))}
                {unclassifiedApps.length === 0 && (
                  <tr>
                    <td colSpan="3" className="p-4 text-center text-gray-500">
                      No unclassified applications found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Application reclassification panel */}
      {selectedApp && (
        <div className="mt-6 border p-4 rounded-lg bg-gray-50">
          <h3 className="text-lg font-semibold mb-3">Reclassify Application</h3>
          <div className="mb-4">
            <span className="font-medium">Selected Application:</span> {selectedApp.name}
          </div>
          
          {/* Suggestions */}
          {selectedApp.suggestions && selectedApp.suggestions.length > 0 && (
            <div className="mb-4">
              <div className="font-medium mb-2">Suggestions:</div>
              <div className="flex flex-wrap gap-2">
                {selectedApp.suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    className={`px-3 py-1 rounded-full text-xs ${
                      targetGroup === suggestion.group
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                    }`}
                    onClick={() => handleSelectSuggestion(suggestion)}
                  >
                    {suggestion.group} ({(suggestion.confidence * 100).toFixed(0)}%)
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Target group selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Group
              </label>
              <input
                type="text"
                className="w-full border rounded-lg px-3 py-2"
                value={targetGroup}
                onChange={(e) => setTargetGroup(e.target.value)}
                placeholder="Infrastructure Software > Web Browsers"
              />
            </div>
            
            <div className="md:col-span-2 flex items-end">
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                onClick={handleReclassify}
                disabled={!targetGroup}
              >
                Reclassify Application
              </button>
              <button
                className="ml-2 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400"
                onClick={() => {
                  setSelectedApp(null);
                  setTargetGroup('');
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassificationDashboard;