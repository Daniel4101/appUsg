import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { DownloadCloud, ArrowUpDown, Filter } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#EF4444', '#7C3AED', '#10B981', '#F59E0B', '#6366F1'];

/**
 * GroupComparison component for visualizing and comparing metrics across different custom groups
 */
const GroupComparison = ({ groupMetrics, onFilterByGroup }) => {
  const [comparisonType, setComparisonType] = useState('cost'); // 'cost', 'users', 'efficiency'
  const [sortOrder, setSortOrder] = useState('desc');
  const [chartType, setChartType] = useState('bar'); // 'bar', 'pie', 'radar'
  const [filteredMetrics, setFilteredMetrics] = useState([]);
  const [metricTotals, setMetricTotals] = useState({
    totalCost: 0,
    totalUsers: 0,
    totalApps: 0
  });

  // Calculate totals and prepare data
  useEffect(() => {
    if (!groupMetrics || groupMetrics.length === 0) {
      setFilteredMetrics([]);
      setMetricTotals({
        totalCost: 0,
        totalUsers: 0,
        totalApps: 0
      });
      return;
    }

    // Sort metrics based on comparison type and order
    const sortedMetrics = [...groupMetrics].sort((a, b) => {
      let aValue, bValue;
      
      switch (comparisonType) {
        case 'cost':
          aValue = a.totalCost;
          bValue = b.totalCost;
          break;
        case 'users':
          aValue = a.userCount;
          bValue = b.userCount;
          break;
        case 'efficiency':
          aValue = a.avgCostPerUser;
          bValue = b.avgCostPerUser;
          break;
        case 'apps':
          aValue = a.applicationCount;
          bValue = b.applicationCount;
          break;
        default:
          aValue = a.totalCost;
          bValue = b.totalCost;
      }
      
      return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
    });

    // Calculate totals
    const totals = sortedMetrics.reduce((acc, metric) => {
      return {
        totalCost: acc.totalCost + (metric.totalCost || 0),
        totalUsers: acc.totalUsers + (metric.userCount || 0),
        totalApps: acc.totalApps + (metric.applicationCount || 0)
      };
    }, { totalCost: 0, totalUsers: 0, totalApps: 0 });

    setFilteredMetrics(sortedMetrics);
    setMetricTotals(totals);
  }, [groupMetrics, comparisonType, sortOrder]);

  // Format metrics for current chart type
  const getChartData = () => {
    // Don't proceed if no metrics
    if (!filteredMetrics || filteredMetrics.length === 0) return [];

    // Format data differently based on chart type
    switch (chartType) {
      case 'bar':
        return filteredMetrics.map(metric => {
          const dataPoint = {
            name: metric.name,
            value: 0,
            toolTip: {}
          };

          switch (comparisonType) {
            case 'cost':
              dataPoint.value = metric.totalCost;
              dataPoint.toolTip = {
                metric: 'Total Cost',
                value: `$${metric.totalCost.toLocaleString()}`,
                percentage: metricTotals.totalCost > 0 
                  ? `${((metric.totalCost / metricTotals.totalCost) * 100).toFixed(1)}%` 
                  : '0%'
              };
              break;
            case 'users':
              dataPoint.value = metric.userCount;
              dataPoint.toolTip = {
                metric: 'User Count',
                value: metric.userCount.toLocaleString(),
                percentage: metricTotals.totalUsers > 0 
                  ? `${((metric.userCount / metricTotals.totalUsers) * 100).toFixed(1)}%` 
                  : '0%'
              };
              break;
            case 'efficiency':
              dataPoint.value = metric.avgCostPerUser;
              dataPoint.toolTip = {
                metric: 'Avg Cost Per User',
                value: `$${metric.avgCostPerUser.toLocaleString(undefined, {maximumFractionDigits: 2})}`
              };
              break;
            case 'apps':
              dataPoint.value = metric.applicationCount;
              dataPoint.toolTip = {
                metric: 'Application Count',
                value: metric.applicationCount.toLocaleString(),
                percentage: metricTotals.totalApps > 0 
                  ? `${((metric.applicationCount / metricTotals.totalApps) * 100).toFixed(1)}%` 
                  : '0%'
              };
              break;
            default:
              dataPoint.value = metric.totalCost;
          }

          return dataPoint;
        });

      case 'pie':
        // For pie chart, limit to top 10 to avoid clutter
        return filteredMetrics.slice(0, 10).map((metric, index) => {
          const dataPoint = {
            name: metric.name,
            value: 0,
            color: COLORS[index % COLORS.length],
            toolTip: {}
          };

          switch (comparisonType) {
            case 'cost':
              dataPoint.value = metric.totalCost;
              dataPoint.toolTip = {
                metric: 'Total Cost',
                value: `$${metric.totalCost.toLocaleString()}`
              };
              break;
            case 'users':
              dataPoint.value = metric.userCount;
              dataPoint.toolTip = {
                metric: 'User Count',
                value: metric.userCount.toLocaleString()
              };
              break;
            case 'efficiency':
              dataPoint.value = metric.avgCostPerUser;
              dataPoint.toolTip = {
                metric: 'Avg Cost Per User',
                value: `$${metric.avgCostPerUser.toLocaleString(undefined, {maximumFractionDigits: 2})}`
              };
              break;
            case 'apps':
              dataPoint.value = metric.applicationCount;
              dataPoint.toolTip = {
                metric: 'Application Count',
                value: metric.applicationCount.toLocaleString()
              };
              break;
            default:
              dataPoint.value = metric.totalCost;
          }

          return dataPoint;
        });

      case 'radar':
        // For radar chart, pick top 8 groups for readability
        const topGroups = filteredMetrics.slice(0, 8).map(m => m.name);
        
        // Create data points for each metric type
        return topGroups.map(groupName => {
          const metric = filteredMetrics.find(m => m.name === groupName);
          
          // Normalize values for radar chart (0-100 scale)
          const maxCost = Math.max(...filteredMetrics.map(m => m.totalCost || 0));
          const maxUsers = Math.max(...filteredMetrics.map(m => m.userCount || 0));
          const maxApps = Math.max(...filteredMetrics.map(m => m.applicationCount || 0));
          const maxCostPerUser = Math.max(...filteredMetrics.map(m => m.avgCostPerUser || 0));
          
          return {
            name: groupName,
            cost: maxCost > 0 ? (metric.totalCost / maxCost) * 100 : 0,
            users: maxUsers > 0 ? (metric.userCount / maxUsers) * 100 : 0,
            apps: maxApps > 0 ? (metric.applicationCount / maxApps) * 100 : 0,
            efficiency: maxCostPerUser > 0 ? 100 - ((metric.avgCostPerUser / maxCostPerUser) * 100) : 0,
            rawMetrics: metric
          };
        });

      default:
        return filteredMetrics;
    }
  };

  // Export group comparison data as CSV
  const exportComparisonData = () => {
    if (!filteredMetrics || filteredMetrics.length === 0) return;
    
    const headers = [
      'Group Name',
      'Application Count',
      'User Count',
      'Total Cost',
      'Avg Cost Per User',
      'Applications'
    ];
    
    const rows = filteredMetrics.map(metric => [
      metric.name,
      metric.applicationCount,
      metric.userCount,
      `$${metric.totalCost.toLocaleString()}`,
      `$${metric.avgCostPerUser.toLocaleString(undefined, {maximumFractionDigits: 2})}`,
      (metric.applications || []).join(', ')
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'group_comparison.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Render functions for different chart types
  const renderBarChart = (data) => (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="name" 
          angle={-45} 
          textAnchor="end" 
          height={80} 
          interval={0} 
          tick={{ fontSize: 12 }}
        />
        <YAxis
          tickFormatter={(value) => {
            if (comparisonType === 'cost' || comparisonType === 'efficiency') {
              return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
            }
            return value.toLocaleString();
          }}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload;
              return (
                <div className="bg-white p-3 border rounded shadow-sm">
                  <p className="font-medium text-sm">{data.name}</p>
                  <p className="text-sm">{data.toolTip.metric}: {data.toolTip.value}</p>
                  {data.toolTip.percentage && (
                    <p className="text-sm">Percentage: {data.toolTip.percentage}</p>
                  )}
                  <p className="text-xs cursor-pointer text-blue-600 mt-1" onClick={() => onFilterByGroup(data.name)}>
                    Click to filter by this group
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Legend />
        <Bar 
          dataKey="value" 
          fill="#0088FE" 
          name={comparisonType === 'cost' ? 'Total Cost' :
                comparisonType === 'users' ? 'User Count' :
                comparisonType === 'efficiency' ? 'Cost per User' : 'App Count'} 
          onClick={(data) => onFilterByGroup(data.name)}
          cursor="pointer"
        />
      </BarChart>
    </ResponsiveContainer>
  );

  const renderPieChart = (data) => (
    <ResponsiveContainer width="100%" height={400}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={150}
          fill="#8884d8"
          label={(entry) => entry.name}
          onClick={(data) => onFilterByGroup(data.name)}
          cursor="pointer"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload;
              return (
                <div className="bg-white p-3 border rounded shadow-sm">
                  <p className="font-medium text-sm">{data.name}</p>
                  <p className="text-sm">{data.toolTip.metric}: {data.toolTip.value}</p>
                  {data.toolTip.percentage && (
                    <p className="text-sm">Percentage: {data.toolTip.percentage}</p>
                  )}
                  <p className="text-xs cursor-pointer text-blue-600 mt-1" onClick={() => onFilterByGroup(data.name)}>
                    Click to filter by this group
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Legend layout="vertical" align="right" verticalAlign="middle" />
      </PieChart>
    </ResponsiveContainer>
  );

  const renderRadarChart = (data) => (
    <ResponsiveContainer width="100%" height={400}>
      <RadarChart cx="50%" cy="50%" outerRadius={150} data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="name" />
        <PolarRadiusAxis domain={[0, 100]} />
        <Radar name="Cost" dataKey="cost" stroke="#0088FE" fill="#0088FE" fillOpacity={0.2} />
        <Radar name="Users" dataKey="users" stroke="#00C49F" fill="#00C49F" fillOpacity={0.2} />
        <Radar name="Apps" dataKey="apps" stroke="#FFBB28" fill="#FFBB28" fillOpacity={0.2} />
        <Radar name="Efficiency" dataKey="efficiency" stroke="#FF8042" fill="#FF8042" fillOpacity={0.2} />
        <Legend />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload;
              const rawMetrics = data.rawMetrics;
              return (
                <div className="bg-white p-3 border rounded shadow-sm">
                  <p className="font-medium">{data.name}</p>
                  <p>Total Cost: ${rawMetrics.totalCost.toLocaleString()}</p>
                  <p>Users: {rawMetrics.userCount}</p>
                  <p>Apps: {rawMetrics.applicationCount}</p>
                  <p>Cost per User: ${rawMetrics.avgCostPerUser.toLocaleString(undefined, {maximumFractionDigits: 2})}</p>
                  <p className="text-xs cursor-pointer text-blue-600 mt-1" onClick={() => onFilterByGroup(data.name)}>
                    Click to filter by this group
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );

  return (
    <div className="bg-white p-6 rounded-lg shadow mb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h2 className="text-xl font-semibold">Group Comparison</h2>
        <div className="flex gap-2 mt-2 md:mt-0">
          <button
            onClick={exportComparisonData}
            className="inline-flex items-center px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <DownloadCloud className="w-4 h-4 mr-1" />
            Export
          </button>
        </div>
      </div>

      {/* Chart Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Compare By
          </label>
          <select
            className="w-full px-3 py-2 border rounded-lg"
            value={comparisonType}
            onChange={(e) => setComparisonType(e.target.value)}
          >
            <option value="cost">Total Cost</option>
            <option value="users">User Count</option>
            <option value="efficiency">Cost per User</option>
            <option value="apps">Application Count</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Chart Type
          </label>
          <select
            className="w-full px-3 py-2 border rounded-lg"
            value={chartType}
            onChange={(e) => setChartType(e.target.value)}
          >
            <option value="bar">Bar Chart</option>
            <option value="pie">Pie Chart</option>
            <option value="radar">Radar Chart</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sort Order
          </label>
          <button
            className="w-full flex items-center justify-center px-3 py-2 border rounded-lg hover:bg-gray-50"
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
          >
            <ArrowUpDown className="w-4 h-4 mr-2" />
            {sortOrder === 'desc' ? 'Highest First' : 'Lowest First'}
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="text-sm text-blue-700">Total Cost</div>
          <div className="text-xl font-bold">${metricTotals.totalCost.toLocaleString()}</div>
        </div>
        <div className="bg-green-50 p-3 rounded-lg">
          <div className="text-sm text-green-700">Total Users</div>
          <div className="text-xl font-bold">{metricTotals.totalUsers.toLocaleString()}</div>
        </div>
        <div className="bg-amber-50 p-3 rounded-lg">
          <div className="text-sm text-amber-700">Total Applications</div>
          <div className="text-xl font-bold">{metricTotals.totalApps.toLocaleString()}</div>
        </div>
      </div>

      {/* Chart Display */}
      <div className="mb-4">
        {filteredMetrics.length > 0 ? (
          <div>
            {chartType === 'bar' && renderBarChart(getChartData())}
            {chartType === 'pie' && renderPieChart(getChartData())}
            {chartType === 'radar' && renderRadarChart(getChartData())}
          </div>
        ) : (
          <div className="text-center p-10 text-gray-500">
            No group data available. Create groups to see comparison.
          </div>
        )}
      </div>

      <p className="text-sm text-gray-500 mt-2">
        Click on any group in the chart to filter the dashboard to that group.
      </p>
    </div>
  );
};

export default GroupComparison;