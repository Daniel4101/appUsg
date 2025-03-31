// RecommendationEngine.jsx
import React from 'react';
import _ from 'lodash';
    // Helper function to safely access array elements
    const safeGet = (array, index, defaultValue = '') => {
      return array && array[index] !== undefined ? array[index] : defaultValue;
    };
const RecommendationEngine = ({ data: rawData, filter }) => {
  const applyFilter = (data) => {
    if (!filter) return data;
    
    return data.filter(row => {
      const regionMatch = !filter.region || safeGet(row, 16) === filter.region;
      const divisionMatch = !filter.division || safeGet(row, 1).substring(0, 2) === filter.division;
      const searchMatch = !filter.searchQuery || 
        safeGet(row, 4).toLowerCase().includes(filter.searchQuery.toLowerCase()) ||
        safeGet(row, 5).toLowerCase().includes(filter.searchQuery.toLowerCase()) ||
        safeGet(row, 6).toLowerCase().includes(filter.searchQuery.toLowerCase());
      return regionMatch && divisionMatch && searchMatch;
    });
  };
  const generateInsights = () => {
    // Parse data if needed
    const data = Array.isArray(rawData) ? rawData : [];
    
    // Guard against empty data
    if (data.length === 0) {
      return [{
        type: 'warning',
        category: 'Data Validation',
        title: 'No Data Available',
        description: 'Unable to generate insights due to missing data.',
        impact: 'high',
        actions: ['Verify data source', 'Check data loading process', 'Ensure proper data format']
      }];
    }

    const insights = [];
    const today = new Date();
 
    // Helper function to parse dates consistently
    const parseDate = (dateStr) => {
      if (!dateStr) return null;
      try {
        const [day, month, year] = dateStr.split('.');
        return new Date(year, month - 1, day);
      } catch {
        return null;
      }
    };



    try {
      // 1. License Expiration Analysis
      const usersWithExpiry = data.filter(row => safeGet(row, 23));
      const expiringLicenses = usersWithExpiry.filter(row => {
        const expiryDate = parseDate(safeGet(row, 23));
        if (!expiryDate) return false;
        const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
        return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
      });

      if (expiringLicenses.length > 0) {
        insights.push({
          type: 'critical',
          category: 'License Management',
          title: `${expiringLicenses.length} Licenses Expiring Soon`,
          description: 'Immediate action required for license renewal',
          impact: 'high',
          actions: [
            'Schedule license renewal reviews',
            'Contact division managers for renewal authorization',
            'Prepare budget allocation for renewals'
          ]
        });
      }

      // 2. Division-level Compliance Analysis
      const divisionCompliance = _.chain(data)
        .groupBy(row => safeGet(row, 1, '').substring(0, 2))
        .mapValues(group => ({
          total: _.uniqBy(group, row => safeGet(row, 4)).length,
          compliant: _.uniqBy(
            group.filter(row => safeGet(row, 22) === 'Yes'),
            row => safeGet(row, 4)
          ).length
        }))
        .value();

      Object.entries(divisionCompliance).forEach(([division, stats]) => {
        if (stats.total > 0) {
          const complianceRate = (stats.compliant / stats.total) * 100;
          if (complianceRate < 50) {
            insights.push({
              type: 'warning',
              category: 'Compliance',
              title: `Low Compliance in ${division} Division`,
              description: `Only ${complianceRate.toFixed(1)}% compliance rate in ${division}`,
              impact: 'high',
              actions: [
                'Schedule compliance training sessions',
                'Set up automated compliance reminders',
                'Review division-specific barriers to compliance'
              ]
            });
          }
        }
      });

      // 3. User Activity Analysis
      const inactiveUsers = data.filter(row => {
        const lastActivity = parseDate(safeGet(row, 21));
        if (!lastActivity) return false;
        const daysSinceActivity = Math.ceil((today - lastActivity) / (1000 * 60 * 60 * 24));
        return daysSinceActivity > 90;
      });

      if (inactiveUsers.length > 0) {
        insights.push({
          type: 'warning',
          category: 'User Activity',
          title: `${inactiveUsers.length} Inactive Users Detected`,
          description: 'Users with no activity in past 90 days',
          impact: 'medium',
          actions: [
            'Review inactive user accounts',
            'Send re-engagement communications',
            'Consider account deactivation for prolonged inactivity'
          ]
        });
      }

      // 4. Regional Analysis
      const regionalData = _.groupBy(data, row => safeGet(row, 16, 'Unknown Region'));
      Object.entries(regionalData).forEach(([region, users]) => {
        if (users.length > 0) {
          const regionalCompliance = users.filter(u => safeGet(u, 22) === 'Yes').length / users.length;
          if (regionalCompliance < 0.4) {
            insights.push({
              type: 'info',
              category: 'Regional Analysis',
              title: `Low Adoption in ${region}`,
              description: `Regional compliance rate: ${(regionalCompliance * 100).toFixed(1)}%`,
              impact: 'medium',
              actions: [
                'Investigate regional compliance challenges',
                'Schedule region-specific training sessions',
                'Review regional policy implementation'
              ]
            });
          }
        }
      });

      // 5. Trend Analysis
      const validDates = data
        .map(row => parseDate(safeGet(row, 21)))
        .filter(date => date !== null);

      if (validDates.length > 0) {
        const latestDate = new Date(Math.max(...validDates));
        const recentData = data.filter(row => {
          const date = parseDate(safeGet(row, 21));
          return date && ((latestDate - date) / (1000 * 60 * 60 * 24) <= 30);
        });

        const recentCompliance = recentData.filter(row => safeGet(row, 22) === 'Yes').length / recentData.length;
        
        if (recentCompliance < 0.5) {
          insights.push({
            type: 'info',
            category: 'Trend Analysis',
            title: 'Declining Compliance Trend',
            description: `Recent compliance rate: ${(recentCompliance * 100).toFixed(1)}%`,
            impact: 'medium',
            actions: [
              'Review recent compliance challenges',
              'Implement short-term improvement plan',
              'Schedule immediate training sessions'
            ]
          });
        }
      }

    } catch (error) {
      console.error('Error generating insights:', error);
      insights.push({
        type: 'critical',
        category: 'System Error',
        title: 'Error Generating Insights',
        description: 'An error occurred while analyzing the data.',
        impact: 'high',
        actions: ['Contact system administrator', 'Verify data format', 'Check data integrity']
      });
    }

    return insights;
  };

  const insights = generateInsights();

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">AI-Powered Insights</h3>
          <p className="text-sm text-gray-500">{insights.length} actionable recommendations found</p>
        </div>
      </div>

      <div className="space-y-4">
        {insights.map((insight, index) => (
          <div 
            key={index}
            className={`p-4 rounded-lg ${
              insight.type === 'critical' ? 'bg-red-50 border-l-4 border-red-400' :
              insight.type === 'warning' ? 'bg-yellow-50 border-l-4 border-yellow-400' :
              'bg-blue-50 border-l-4 border-blue-400'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-semibold text-gray-900">{insight.title}</h4>
                <p className="text-sm text-gray-600">{insight.description}</p>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                insight.impact === 'high' ? 'bg-red-100 text-red-800' :
                insight.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {insight.impact.toUpperCase()}
              </span>
            </div>

            <div className="mt-3">
              <h5 className="text-sm font-medium text-gray-700 mb-2">Recommended Actions:</h5>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                {insight.actions.map((action, i) => (
                  <li key={i}>{action}</li>
                ))}
              </ul>
            </div>

            <div className="mt-2 flex gap-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                {insight.category}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecommendationEngine;