import React, { useState, useEffect } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { Upload, ChevronDown, ChevronUp, Download, Users, DollarSign, BarChart2, Layers, Grid } from 'lucide-react';
import DataProcessingService from '../services/DataProcessingService';
import EnhancedMappingService from './EnhancedMappingService';
import NestedTable from './NestedTable';
import buildNestedStructure from './buildNestedStructure';
import CostSummary from './CostSummary';
import OptimizationRecommendations from './OptimizationRecommendations';
import GroupManagement from './GroupManagement';
import AdvancedGroupingService from '../services/AdvancedGroupingService';
import GroupComparison from './GroupComparison';
import TemplateSelector from './TemplateSelector';
import GroupTemplatesService from '../services/GroupTemplatesService';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

/**
 * Final enhanced GroupedDataDashboard with complete group management system
 */
const GroupedDataDashboard = () => {
  // Core state variables
  const [data, setData] = useState(null);
  const [nestedData, setNestedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dscFile, setDscFile] = useState(null);
  const [flexeraFile, setFlexeraFile] = useState(null);
  const [ubcFile, setUbcFile] = useState(null);
  const [quarter, setQuarter] = useState('2024_Q4');
  const [chartData, setChartData] = useState({ 
    top: [], 
    least: [],
    costliest: [],
    costPerUser: [],
    allApps: []
  });
  const [filter, setFilter] = useState({
    businessArea: '',
    application: '',
    searchQuery: '',
    customGroup: ''
  });
  
  // UI state
  const [activeChart, setActiveChart] = useState('usage');
  const [showDetailedTable, setShowDetailedTable] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');  // 'dashboard', 'groups', 'templates', 'compare'
  const [groupMetrics, setGroupMetrics] = useState([]);
  
  // Initialize services
  const dataService = new DataProcessingService();
  const [mappingService] = useState(new EnhancedMappingService());
  const [groupingService] = useState(new AdvancedGroupingService());
  const [templatesService] = useState(new GroupTemplatesService());
  
  // Handle group creation via template
  const handleTemplateApplied = (groupDefinition) => {
    const createdGroup = groupingService.createGroup(groupDefinition);
    handleGroupChange();
  };

  // Process files useEffect
  useEffect(() => {
    const processFiles = async () => {
      if ((dscFile || ubcFile) && flexeraFile) {
        setLoading(true);
        setError(null);

        try {
          // Process DSC data if available
          if (dscFile) {
            console.log('Processing DSC file:', dscFile.name);
            await dataService.loadDSCData(dscFile, quarter);
          }

          // Process UBC data if available
          if (ubcFile) {
            console.log('Processing UBC file:', ubcFile.name);
            await mappingService.loadUBCData(ubcFile);
          }

          console.log('Processing Flexera file:', flexeraFile.name);
          await dataService.loadFlexeraData(flexeraFile);

          // Process Flexera data for UBC mapping
          if (ubcFile) {
            mappingService.processFlexeraData(dataService.flexeraData);
          }

          console.log('Generating combined data structure...');
          const processedData = dataService.processData(quarter);
          const ubcMappedData = ubcFile ? mappingService.getGroupedDataForDashboard() : null;

          if (!processedData || !processedData.structure) {
            throw new Error('Invalid data structure generated');
          }

          // Enhance the data structure with additional metrics
          Object.entries(processedData.structure).forEach(([groupName, groupData]) => {
            if (groupData.flexeraData && Array.isArray(groupData.flexeraData.items)) {
              // Ensure metrics object exists
              if (!groupData.flexeraData.metrics) {
                groupData.flexeraData.metrics = {};
              }
              
              // Set business unit
              groupData.flexeraData.metrics.businessUnit = groupName;
              
              // Calculate values if not already set
              if (!groupData.flexeraData.metrics.uniqueUsers) {
                const uniqueEmails = new Set(
                  groupData.flexeraData.items.map(item => item['Assigned user - Email'])
                );
                groupData.flexeraData.metrics.uniqueUsers = uniqueEmails.size;
              }
              
              if (!groupData.flexeraData.metrics.activeUsers) {
                const activeEmails = new Set(
                  groupData.flexeraData.items
                    .filter(item => item['Installations - Last used date']?.trim())
                    .map(item => item['Assigned user - Email'])
                );
                groupData.flexeraData.metrics.activeUsers = activeEmails.size;
              }
              
              if (!groupData.flexeraData.metrics.totalInstallations) {
                groupData.flexeraData.metrics.totalInstallations = groupData.flexeraData.items.length;
              }
              
              // Add cost data from DSC or UBC if available
              if (dscFile && groupData.dscData?.metrics?.totalCost) {
                groupData.flexeraData.metrics.totalCost = groupData.dscData.metrics.totalCost;
              } else if (ubcMappedData) {
                const businessUnit = groupName.split('>')[0].trim();
                const businessUnitCode = businessUnit.split('/')[0].trim();
                const ubcGroup = ubcMappedData.byBusinessUnit?.[businessUnitCode];

                if (ubcGroup) {
                  const totalUBCCost = ubcGroup.reduce((sum, item) => sum + (parseFloat(item.ubcCharge) || 0), 0);
                  groupData.flexeraData.metrics.totalUBCCost = totalUBCCost;
                }
                
              }
            }
          });

          setData(processedData);

          // Process data for charts
          const allApps = [];
          Object.entries(processedData.structure || {}).forEach(([groupName, groupData]) => {
            try {
              if (groupData.flexeraData && Array.isArray(groupData.flexeraData.items)) {
                // Group by application name
                const appGroups = {};
                groupData.flexeraData.items.forEach(item => {
                  const appName = item["Application - Product"] || "Unclassified";
                  if (!appGroups[appName]) {
                    appGroups[appName] = [];
                  }
                  appGroups[appName].push(item);
                });

                // Process each application group
                Object.entries(appGroups).forEach(([appName, instances]) => {
                  const ubcInfo = ubcMappedData?.applicationUsage?.[appName];
                  
                  // Calculate unique users
                  const uniqueEmails = new Set();
                  const activeEmails = new Set();
                  
                  instances.forEach(i => {
                    const email = i["Assigned user - Email"] || "no-email";
                    uniqueEmails.add(email);
                    
                    // Track active users
                    if (i["Installations - Last used date"]?.trim()) {
                      activeEmails.add(email);
                    }
                  });
                  
                  // Calculate UBC/DSC cost
                  let totalCost = groupData.flexeraData.metrics?.totalCost || 0;
                  if (ubcInfo) {
                    // If we have UBC info, try to be more precise with cost allocation
                    totalCost = ubcInfo.reduce((sum, item) => sum + (item.ubcCharge || 0), 0);
                  }
                  
                  // Get custom groups for this application
                  const customGroups = groupingService.getGroupsForApp(appName);
                  
                  allApps.push({
                    name: appName,
                    group: groupName || "Unclassified",
                    accesses: instances.length,
                    users: uniqueEmails.size,
                    activeUsers: activeEmails.size,
                    ubcMatches: ubcInfo?.length || 0,
                    businessUnit: groupData.flexeraData.metrics?.businessUnit || groupName,
                    totalCost: totalCost,
                    costPerUser: uniqueEmails.size > 0 ? totalCost / uniqueEmails.size : 0,
                    utilizationRate: uniqueEmails.size > 0 ? (activeEmails.size / uniqueEmails.size) * 100 : 0,
                    customGroups: customGroups.map(g => g.name)
                  });
                });
              }
            } catch (error) {
              console.error(`Error processing group ${groupName}:`, error);
            }
          });

          // Generate metrics for custom groups
          const customGroupMetrics = groupingService.getGroupMetrics(allApps);
          setGroupMetrics(customGroupMetrics);

          // Sort and slice for various charts
          const sortedByUsage = [...allApps].sort((a, b) => b.accesses - a.accesses);
          const topApps = sortedByUsage.slice(0, 10);
          
          const leastUsedApps = [...allApps]
            .filter(app => app.accesses > 0)
            .sort((a, b) => a.accesses - b.accesses)
            .slice(0, 10);
          
          const sortedByCost = [...allApps]
            .filter(app => app.totalCost > 0)
            .sort((a, b) => b.totalCost - a.totalCost)
            .slice(0, 10);
            
          const sortedByCostPerUser = [...allApps]
            .filter(app => app.costPerUser > 0 && app.users > 1) // Filter out very small use cases
            .sort((a, b) => b.costPerUser - a.costPerUser)
            .slice(0, 10);
          
          setChartData({
            top: topApps,
            least: leastUsedApps,
            costliest: sortedByCost,
            costPerUser: sortedByCostPerUser,
            allApps: allApps
          });

          const tree = buildNestedStructure(processedData.structure);
          setNestedData(tree);
        } catch (err) {
          console.error('Error processing files:', err);
          setError(err.message || 'Error processing files');
          setDscFile(null);
          setFlexeraFile(null);
          setUbcFile(null);
        } finally {
          setLoading(false);
        }
      }
    };

    processFiles();
  }, [dscFile, flexeraFile, ubcFile, quarter]);

  // Update group metrics when groups change
  const handleGroupChange = () => {
    if (chartData.allApps.length > 0) {
      // Refresh group assignments
      const updatedApps = chartData.allApps.map(app => ({
        ...app,
        customGroups: groupingService.getGroupsForApp(app.name).map(g => g.name)
      }));
      
      // Update metrics
      const customGroupMetrics = groupingService.getGroupMetrics(updatedApps);
      setGroupMetrics(customGroupMetrics);
      
      // Update chart data
      setChartData(prev => ({
        ...prev,
        allApps: updatedApps
      }));
    }
  };

  // Handle group creation
  const handleGroupCreate = (group) => {
    handleGroupChange();
  };

  // Handle group update
  const handleGroupUpdate = (group) => {
    handleGroupChange();
  };

  // Handle group deletion
  const handleGroupDelete = (group) => {
    handleGroupChange();
  };

  // Helper functions for filtering and business area lookup
  const getBusinessAreas = () => {
    if (!data?.structure) return [];
  
    // Focus on extracting standard business unit codes like EL, RA, MO, etc.
    const businessAreas = [];
    
    // Process all items in the structure to extract business areas
    Object.entries(data.structure).forEach(([groupName, groupData]) => {
      if (!groupData?.flexeraData?.items) return;
      
      groupData.flexeraData.items.forEach(item => {
        // Look for the business unit field that contains the 2-letter code
        const businessUnit = item['Business'] || item['BusinessUnit'] || item['business'] || '';
        
        // Extract 2-letter business unit code
        if (typeof businessUnit === 'string' && businessUnit.length >= 2) {
          const businessCode = businessUnit.substring(0, 2).toUpperCase();
          
          // Only add valid business codes that match the pattern (two uppercase letters)
          if (businessCode.match(/^[A-Z]{2}$/) && !businessAreas.includes(businessCode)) {
            businessAreas.push(businessCode);
          }
        }
      });
      
      // Also extract from group names which might contain business unit info
      const segments = groupName.split('>').map(s => s.trim());
      const topLevelGroup = segments[0];
      
      // Check if the top level group is a valid 2-letter business code
      if (topLevelGroup.length === 2 && topLevelGroup.match(/^[A-Z]{2}$/)) {
        if (!businessAreas.includes(topLevelGroup)) {
          businessAreas.push(topLevelGroup);
        }
      }
    });
    
    // Add default values in case none were found
    if (businessAreas.length === 0) {
      const defaultAreas = ['EL', 'RA', 'MO', 'IA'];
      businessAreas.push(...defaultAreas);
    }
    
    return businessAreas.sort();
  };  
  const calculateGroupMetrics = (groups, allApps) => {
    if (!groups || !allApps || !Array.isArray(groups) || !Array.isArray(allApps)) {
      return [];
    }
    
    return groups.map(group => {
      // Filter applications that belong to this group
      const groupApps = allApps.filter(app => 
        app.customGroups && app.customGroups.includes(group.name)
      );
      
      // Calculate group metrics
      const userSet = new Set();
      let totalCost = 0;
      let totalUBCCost = 0;
      let totalAccesses = 0;
      
      groupApps.forEach(app => {
        // Count unique users
        if (app.users) {
          // Since we can't access actual emails, we'll use a proxy
          for (let i = 0; i < app.users; i++) {
            userSet.add(`${app.name}-user-${i}`);
          }
        }
        
        // Sum up costs and accesses
        totalCost += app.totalCost || 0;
        totalUBCCost += app.ubcCost || 0;
        totalAccesses += app.accesses || 0;
      });
      
      const userCount = userSet.size;
      
      return {
        id: group.id,
        name: group.name,
        applications: groupApps.map(app => app.name),
        applicationCount: groupApps.length,
        userCount: userCount,
        totalCost: totalCost,
        totalUBCCost: totalUBCCost,
        totalAccesses: totalAccesses,
        avgCostPerUser: userCount > 0 ? totalCost / userCount : 0
      };
    });
  };
  const getCustomGroups = () => {
    return groupingService.getAllGroups().map(group => ({
      id: group.id,
      name: group.name
    }));
  };

  const getApplicationsForBusinessArea = (businessArea) => {
    // Return all applications across all business areas if no specific area is selected
    if (!businessArea && data?.structure) {
      const allApps = [];
      
      Object.entries(data.structure).forEach(([groupPath, groupData]) => {
        // Skip if there's no Flexera data
        if (!groupData?.flexeraData?.items) return;
        
        // Create a map to track unique applications
        const appGroups = {};
        
        // Group items by application name
        groupData.flexeraData.items.forEach(item => {
          const appName = item['Application - Product'] || 'Unclassified';
          if (!appGroups[appName]) {
            appGroups[appName] = [];
          }
          appGroups[appName].push(item);
        });
        
        // Create app objects and add to allApps if not already there
        Object.entries(appGroups).forEach(([name, items]) => {
          const uniqueEmails = new Set(items.map(i => i['Assigned user - Email'] || ''));
          const app = {
            name,
            count: items.length,
            users: uniqueEmails.size
          };
          
          // Only add if not already in the list
          if (!allApps.some(existingApp => existingApp.name === app.name)) {
            allApps.push(app);
          }
        });
      });
      
      return allApps.sort((a, b) => a.name.localeCompare(b.name));
    }
    
    // For a specific business area, find all matching groups
    if (!data?.structure) return [];
    
    const matchingGroups = Object.keys(data.structure).filter(groupPath => {
      const segments = groupPath.split('>').map(s => s.trim());
      return segments[0] === businessArea;
    });
    
    // Now collect applications from all matching groups
    const appGroups = {};
    
    matchingGroups.forEach(groupPath => {
      const groupData = data.structure[groupPath];
      if (!groupData?.flexeraData?.items) return;
      
      // Group items by application name
      groupData.flexeraData.items.forEach(item => {
        const appName = item['Application - Product'] || 'Unclassified';
        if (!appGroups[appName]) {
          appGroups[appName] = [];
        }
        appGroups[appName].push(item);
      });
    });
    
    // Convert to array of app objects
    const apps = Object.entries(appGroups).map(([name, items]) => {
      const uniqueEmails = new Set(items.map(i => i['Assigned user - Email'] || ''));
      return {
        name,
        count: items.length,
        users: uniqueEmails.size
      };
    });
    
    return apps.sort((a, b) => a.name.localeCompare(b.name));
  };

  const filterData = (chartData) => {
    if (!filter.businessArea && !filter.application && !filter.searchQuery && !filter.customGroup) {
      return chartData;
    }

    // Create a filter function for applications
    const applyFilter = (app) => {
      // Business area filter
      if (filter.businessArea) {
        const segments = app.group.split('>').map(s => s.trim());
        if (segments[0] !== filter.businessArea) return false;
      }
      
      // Application name filter
      if (filter.application && app.name !== filter.application) {
        return false;
      }
      
      // Search query filter
      if (filter.searchQuery && !app.name.toLowerCase().includes(filter.searchQuery.toLowerCase())) {
        return false;
      }
      
      // Custom group filter
      if (filter.customGroup) {
        if (!app.customGroups || !app.customGroups.includes(filter.customGroup)) {
          return false;
        }
      }
      
      return true;
    };

    // Filter each dataset
    return {
      top: chartData.top.filter(applyFilter),
      least: chartData.least.filter(applyFilter),
      costliest: chartData.costliest.filter(applyFilter),
      costPerUser: chartData.costPerUser.filter(applyFilter),
      allApps: chartData.allApps ? chartData.allApps.filter(applyFilter) : []
    };
  };

  // Export dashboard data as CSV
  const exportToCSV = () => {
    if (!chartData.allApps) return;
    
    const headers = [
      'Application Name',
      'Business Unit',
      'Group',
      'Users',
      'Active Users',
      'Accesses',
      'Total Cost',
      'Cost Per User',
      'Utilization Rate',
      'Custom Groups'
    ];
    
    const rows = chartData.allApps.map(app => [
      app.name,
      app.businessUnit?.split('>')[0] || 'Unclassified',
      app.group,
      app.users,
      app.activeUsers,
      app.accesses,
      app.totalCost ? `$${app.totalCost.toLocaleString()}` : '$0',
      app.costPerUser ? `$${app.costPerUser.toLocaleString(undefined, {maximumFractionDigits: 2})}` : '$0',
      `${app.utilizationRate.toFixed(1)}%`,
      (app.customGroups || []).join(', ')
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'application_dashboard.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Handle setting a filter for a specific group
  const handleFilterByGroup = (groupName) => {
    setFilter(prev => ({
      ...prev,
      customGroup: groupName
    }));
    setActiveTab('dashboard');
  };
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  // File upload UI
  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-xl w-full">
          <div className="bg-white p-8 rounded-lg shadow-lg text-center">
            <Upload className="w-16 h-16 mx-auto mb-4 text-blue-600" />
            <h2 className="text-2xl font-bold mb-4">Upload Data Files</h2>
            <p className="text-gray-600 mb-6">
              Upload your DSC/UBC and Flexera files to analyze usage patterns and optimize costs
            </p>
            <div className="space-y-4">
              <div className="flex flex-col gap-4">
                <div>
                  <label className="cursor-pointer block">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => setDscFile(e.target.files?.[0])}
                      className="hidden"
                    />
                    <span className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                      <Upload className="w-5 h-5 mr-2" />
                      Upload DSC File
                    </span>
                  </label>
                  {dscFile && (
                    <p className="mt-2 text-sm text-green-600">
                      DSC File: {dscFile.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="cursor-pointer block">
                    <input
                      type="file"
                      accept=".csv,.xlsx"
                      onChange={(e) => setUbcFile(e.target.files?.[0])}
                      className="hidden"
                    />
                    <span className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                      <Upload className="w-5 h-5 mr-2" />
                      Upload UBC File
                    </span>
                  </label>
                  {ubcFile && (
                    <p className="mt-2 text-sm text-green-600">
                      UBC File: {ubcFile.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="cursor-pointer block">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => setFlexeraFile(e.target.files?.[0])}
                      className="hidden"
                    />
                    <span className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                      <Upload className="w-5 h-5 mr-2" />
                      Upload Flexera File
                    </span>
                  </label>
                  {flexeraFile && (
                    <p className="mt-2 text-sm text-green-600">
                      Flexera File: {flexeraFile.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reporting Quarter
                  </label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg"
                    value={quarter}
                    onChange={(e) => setQuarter(e.target.value)}
                  >
                    <option value="2024_Q1">2024 Q1</option>
                    <option value="2024_Q2">2024 Q2</option>
                    <option value="2024_Q3">2024 Q3</option>
                    <option value="2024_Q4">2024 Q4</option>
                  </select>
                </div>

                {(dscFile || ubcFile || flexeraFile) && (
                  <button
                    onClick={() => {
                      setDscFile(null);
                      setUbcFile(null);
                      setFlexeraFile(null);
                      setData(null);
                      setChartData({ top: [], least: [], costliest: [], costPerUser: [], allApps: [] });
                      setNestedData(null);
                    }}
                    className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Reset Files
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const filteredChartData = filterData(chartData);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header with Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold">Application Portfolio Analysis</h1>
        <div className="flex gap-2 mt-2 md:mt-0">
          <button
            onClick={exportToCSV}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="flex flex-wrap">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center px-4 py-3 ${
              activeTab === 'dashboard'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <BarChart2 className="w-4 h-4 mr-2" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`flex items-center px-4 py-3 ${
              activeTab === 'groups'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Users className="w-4 h-4 mr-2" />
            Manage Groups
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`flex items-center px-4 py-3 ${
              activeTab === 'templates'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Layers className="w-4 h-4 mr-2" />
            Group Templates
          </button>
          <button
            onClick={() => setActiveTab('compare')}
            className={`flex items-center px-4 py-3 ${
              activeTab === 'compare'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Grid className="w-4 h-4 mr-2" />
            Compare Groups
          </button>
        </div>
      </div>

      {/* Group Management */}
      {activeTab === 'groups' && (
        <GroupManagement 
          data={data} 
          onGroupCreate={handleGroupCreate}
          onGroupUpdate={handleGroupUpdate}
          onGroupDelete={handleGroupDelete}
        />
      )}

      {/* Group Templates */}
      {activeTab === 'templates' && (
        <TemplateSelector 
          availableApps={chartData.allApps.map(app => app.name)} 
          onTemplateApplied={handleTemplateApplied} 
        />
      )}

      {/* Group Comparison */}
      {activeTab === 'compare' && (
        <GroupComparison 
          groupMetrics={groupMetrics} 
          onFilterByGroup={handleFilterByGroup} 
        />
      )}

      {/* Only show Dashboard content if activeTab is 'dashboard' */}
      {activeTab === 'dashboard' && (
        <>
          {/* Filters */}
          <div className="mb-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-lg shadow">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Area
                </label>
                <select
                  className="w-full px-3 py-2 border rounded-lg"
                  value={filter.businessArea}
                  onChange={(e) => {
                    const newBusinessArea = e.target.value;
                    setFilter(prev => ({
                      ...prev,
                      businessArea: newBusinessArea,
                      application: '' // Reset application when business area changes
                    }));
                  }}
                >
                  <option value="">All Business Areas</option>
                  {getBusinessAreas().map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Application
                </label>
                <select
                  className="w-full px-3 py-2 border rounded-lg"
                  value={filter.application}
                  onChange={(e) => setFilter(prev => ({ ...prev, application: e.target.value }))}
                >
                  <option value="">All Applications</option>
                  {getApplicationsForBusinessArea(filter.businessArea).map(app => (
                    <option key={app.name} value={app.name}>
                      {app.name} ({app.users} users)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Custom Group
                </label>
                <select
                  className="w-full px-3 py-2 border rounded-lg"
                  value={filter.customGroup}
                  onChange={(e) => setFilter(prev => ({ ...prev, customGroup: e.target.value }))}
                >
                  <option value="">All Groups</option>
                  {getCustomGroups().map(group => (
                    <option key={group.id} value={group.name}>{group.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search
                </label>
                <input
                  type="text"
                  placeholder="Search applications..."
                  className="w-full px-4 py-2 border rounded-lg"
                  value={filter.searchQuery}
                  onChange={(e) => setFilter(prev => ({ ...prev, searchQuery: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Group Metrics */}
          {groupMetrics.length > 0 && filter.customGroup && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4">Custom Group: {filter.customGroup}</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {groupMetrics
                  .filter(metric => metric.name === filter.customGroup)
                  .map(metric => (
                    <div 
                      key={metric.id} 
                      className="bg-white p-4 rounded-lg shadow col-span-4"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <div className="text-sm text-blue-700">Applications</div>
                          <div className="text-xl font-bold">{metric.applicationCount}</div>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg">
                          <div className="text-sm text-green-700">Users</div>
                          <div className="text-xl font-bold">{metric.userCount}</div>
                        </div>
                        <div className="bg-purple-50 p-3 rounded-lg">
                          <div className="text-sm text-purple-700">Total Cost</div>
                          <div className="text-xl font-bold">${metric.totalCost.toLocaleString()}</div>
                        </div>
                        <div className="bg-amber-50 p-3 rounded-lg">
                          <div className="text-sm text-amber-700">Cost Per User</div>
                          <div className="text-xl font-bold">${metric.avgCostPerUser.toLocaleString(undefined, {maximumFractionDigits: 2})}</div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Cost Summary Component */}
          <CostSummary data={data} chartData={filteredChartData} />

          {/* Optimization Recommendations */}
          {showRecommendations && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-semibold">Analysis & Recommendations</h2>
                <button
                  onClick={() => setShowRecommendations(!showRecommendations)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  {showRecommendations ? 'Hide' : 'Show'} Recommendations
                </button>
              </div>
              <OptimizationRecommendations data={data} chartData={filteredChartData} />
            </div>
          )}

          {/* Chart Type Selector */}
          <div className="mb-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">View Mode</h3>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setActiveChart('usage')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    activeChart === 'usage'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  Usage Analysis
                </button>
                <button
                  onClick={() => setActiveChart('cost')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    activeChart === 'cost'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  Cost Analysis
                </button>
                <button
                  onClick={() => setActiveChart('costPerUser')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    activeChart === 'costPerUser'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  Cost Efficiency
                </button>
              </div>
            </div>
          </div>

          {/* Usage Analysis Charts */}
          {activeChart === 'usage' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">
                  Top 10 Most Used Applications
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={filteredChartData.top}
                        dataKey="accesses"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        label={false}
                      >
                        {filteredChartData.top.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name, props) => {
                          const payload = props.payload || {};
                          const totalCost = payload.totalCost || 0;
                          return [
                            `Accesses: ${value || 0}
Users: ${payload.users || 0}
Active Users: ${payload.activeUsers || 0}
Business Unit: ${payload.businessUnit || 'N/A'}
Total Cost: $${totalCost.toLocaleString()}
${payload.customGroups?.length > 0 ? `Groups: ${payload.customGroups.join(', ')}` : ''}`,
                            payload.name || 'Unknown'
                          ];
                        }}
                      />
                      <Legend
                        layout="vertical"
                        align="right"
                        verticalAlign="middle"
                        wrapperStyle={{ fontSize: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">
                  Top 10 Least Used Applications
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={filteredChartData.least}
                        dataKey="accesses"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        label={false}
                      >
                        {filteredChartData.least.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name, props) => {
                          const payload = props.payload || {};
                          const totalCost = payload.totalCost || 0;
                          return [
                            `Accesses: ${value || 0}
Users: ${payload.users || 0}
Active Users: ${payload.activeUsers || 0}
Business Unit: ${payload.businessUnit || 'N/A'}
Total Cost: $${totalCost.toLocaleString()}
${payload.customGroups?.length > 0 ? `Groups: ${payload.customGroups.join(', ')}` : ''}`,
                            payload.name || 'Unknown'
                          ];
                        }}
                      />
                      <Legend
                        layout="vertical"
                        align="right"
                        verticalAlign="middle"
                        wrapperStyle={{ fontSize: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Cost Analysis Charts */}
          {activeChart === 'cost' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">
                  Top 10 Most Expensive Applications
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={filteredChartData.costliest}
                      layout="vertical"
                      margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 'auto']} tickFormatter={(value) => `$${value.toLocaleString()}`} />
                      <YAxis type="category" width={100} dataKey="name" tickFormatter={(value) => value.length > 10 ? `${value.substring(0, 10)}...` : value} />
                      <Tooltip 
                        formatter={(value, name, props) => {
                          if (name === "totalCost") {
                            return [`$${value.toLocaleString()}`, "Total Cost"];
                          }
                          return [value, name];
                        }}
                        labelFormatter={(label) => `${label}`}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white p-3 border rounded shadow-sm">
                                <p className="font-medium">{data.name}</p>
                                <p>Total Cost: ${data.totalCost.toLocaleString()}</p>
                                <p>Users: {data.users}</p>
                                <p>Cost Per User: ${(data.totalCost / data.users).toLocaleString(undefined, {maximumFractionDigits: 2})}</p>
                                <p>Business Unit: {data.businessUnit}</p>
                                {data.customGroups?.length > 0 && (
                                  <p>Groups: {data.customGroups.join(', ')}</p>
                                )}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="totalCost" fill="#0088FE" name="Total Cost" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">
                  Cost vs. User Count Analysis
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={filteredChartData.costliest}
                      margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={false} />
                      <YAxis yAxisId="left" orientation="left" tickFormatter={(value) => `$${value.toLocaleString()}`} />
                      <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `${value} users`} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white p-3 border rounded shadow-sm">
                                <p className="font-medium">{data.name}</p>
                                <p>Total Cost: ${data.totalCost.toLocaleString()}</p>
                                <p>Users: {data.users}</p>
                                <p>Cost Per User: ${(data.totalCost / data.users).toLocaleString(undefined, {maximumFractionDigits: 2})}</p>
                                {data.customGroups?.length > 0 && (
                                  <p>Groups: {data.customGroups.join(', ')}</p>
                                )}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend />
                      <Bar yAxisId="left" dataKey="totalCost" fill="#0088FE" name="Cost ($)" />
                      <Bar yAxisId="right" dataKey="users" fill="#00C49F" name="Users" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Cost Efficiency Analysis */}
          {activeChart === 'costPerUser' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">
                  Top 10 Applications by Cost per User
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={filteredChartData.costPerUser}
                      layout="vertical"
                      margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 'auto']} tickFormatter={(value) => `$${value.toLocaleString()}`} />
                      <YAxis type="category" width={100} dataKey="name" tickFormatter={(value) => value.length > 10 ? `${value.substring(0, 10)}...` : value} />
                      <Tooltip 
                        formatter={(value, name) => {
                          if (name === "costPerUser") {
                            return [`$${value.toLocaleString(undefined, {maximumFractionDigits: 2})}`, "Cost Per User"];
                          }
                          return [value, name];
                        }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white p-3 border rounded shadow-sm">
                                <p className="font-medium">{data.name}</p>
                                <p>Cost Per User: ${data.costPerUser.toLocaleString(undefined, {maximumFractionDigits: 2})}</p>
                                <p>Total Cost: ${data.totalCost.toLocaleString()}</p>
                                <p>Users: {data.users}</p>
                                <p>Business Unit: {data.businessUnit}</p>
                                {data.customGroups?.length > 0 && (
                                  <p>Groups: {data.customGroups.join(', ')}</p>
                                )}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="costPerUser" fill="#00C49F" name="Cost Per User" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">
                  Cost vs User Efficiency Matrix
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={filteredChartData.costliest}
                      margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={false} />
                      <YAxis yAxisId="left" orientation="left" tickFormatter={(value) => `$${value.toLocaleString()}`} />
                      <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `${value} users`} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white p-3 border rounded shadow-sm">
                                <p className="font-medium">{data.name}</p>
                                <p>Total Cost: ${data.totalCost.toLocaleString()}</p>
                                <p>Users: {data.users}</p>
                                <p>Cost Per User: ${(data.totalCost / data.users).toLocaleString(undefined, {maximumFractionDigits: 2})}</p>
                                {data.customGroups?.length > 0 && (
                                  <p>Groups: {data.customGroups.join(', ')}</p>
                                )}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend />
                      <Bar yAxisId="left" dataKey="totalCost" fill="#0088FE" name="Cost ($)" />
                      <Bar yAxisId="right" dataKey="users" fill="#00C49F" name="Users" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Hierarchical (Nested) Detailed Analysis Table */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Hierarchical Group Analysis</h2>
              <button
                onClick={() => setShowDetailedTable(!showDetailedTable)}
                className="flex items-center text-blue-600 hover:text-blue-800"
              >
                {showDetailedTable ? (
                  <>
                    <ChevronUp className="w-4 h-4 mr-1" /> Hide Details
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 mr-1" /> Show Details
                  </>
                )}
              </button>
            </div>
            
            {showDetailedTable && nestedData ? (
              <NestedTable data={nestedData} />
            ) : (
              <p className="text-gray-500">Click "Show Details" to view the hierarchical breakdown of applications by business unit.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default GroupedDataDashboard;