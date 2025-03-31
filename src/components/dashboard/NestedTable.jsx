import React, { useState } from 'react';

/**
 * NestedTable component for displaying hierarchical data with expandable rows
 * @param {Object} props - Component props
 * @param {Object} props.data - Hierarchical data structure to display
 */
const NestedTable = ({ data }) => {
  const [expandedPaths, setExpandedPaths] = useState({});
  const [expandedUsers, setExpandedUsers] = useState({});

  const togglePath = (path) => {
    setExpandedPaths(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  const toggleUsers = (path) => {
    setExpandedUsers(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  const renderUserRows = (users, parentPath) => {
    if (!users || users.length === 0) return [];
    
    return users.map((user, index) => (
      <tr key={`${parentPath}-user-${index}`} className="bg-blue-50">
        <td colSpan="7" className="p-2 border">
          <div style={{ paddingLeft: "40px" }} className="flex items-center">
            <span className="text-sm">{user.email || user['Assigned user - Email'] || 'Unknown'}</span>
            {user.ubcCost > 0 && (
              <span className="ml-2 text-xs text-blue-600">
                UBC Cost: ${user.ubcCost.toLocaleString()}
              </span>
            )}
          </div>
        </td>
      </tr>
    ));
  };

  const renderApplicationRows = (applications, parentPath, level) => {
    if (!applications || applications.length === 0) return [];
    
    return applications.map((app, index) => (
      <tr key={`${parentPath}-app-${index}`} className="bg-green-50">
        <td className="p-2 border">
          <div style={{ paddingLeft: `${(level + 1) * 20}px` }} className="flex items-center">
            <span className="text-sm font-medium">{app.name || 'Unknown Application'}</span>
          </div>
        </td>
        <td className="p-2 border text-right">{app.users || 0}</td>
        <td className="p-2 border text-right">{app.activeUsers || 0}</td>
        <td className="p-2 border text-right">{app.accesses || 0}</td>
        <td className="p-2 border">{app.businessUnit || 'N/A'}</td>
        <td className="p-2 border text-right">
          {app.totalCost > 0 ? `$${app.totalCost.toLocaleString()}` : 'N/A'}
        </td>
        <td className="p-2 border text-right">
          {app.ubcCost > 0 ? `$${app.ubcCost.toLocaleString()}` : 'N/A'}
        </td>
      </tr>
    ));
  };

  const extractBusinessUnit = (groupName, fullPath) => {
    // For business areas, we want to use the raw business unit code (EL, RA, MO, etc.)

    // Check if this is a top-level business unit
    if (groupName.includes('/')) {
      return groupName.split('/')[0].trim();
    }
    const segments = fullPath.split(' > ');
    
    if (segments.length <= 1) {
      // This is a top-level business unit, return as is (should be EL, RA, MO, etc.)
      const standardBusinessUnitMatch = groupName.match(/^(EL|RA|MO|IA|PA)/i);
      if (standardBusinessUnitMatch) {
        return standardBusinessUnitMatch[0].toUpperCase();
      }
      return groupName;
    }
    
    // For children, use the parent business unit (first segment of path)
    const parentBU = segments[0];
    const standardBusinessUnitMatch = parentBU.match(/^(EL|RA|MO|IA|PA)/i);
    if (standardBusinessUnitMatch) {
      return standardBusinessUnitMatch[0].toUpperCase();
    }
    
    return parentBU;  
  };

const renderRows = (node, pathSoFar = [], level = 0) => {
  let rows = [];
  
  // Sort groups by name for consistent display
  const sortedGroups = Object.entries(node).sort((a, b) => a[0].localeCompare(b[0]));
  
  for (const [groupName, groupData] of sortedGroups) {
    const fullPathSegments = [...pathSoFar, groupName];
    const fullPath = fullPathSegments.join(' > ');
    const hasChildren = Object.keys(groupData.__meta?.children || {}).length > 0;
    const isExpanded = !!expandedPaths[fullPath];
    
    // Determine if this row is expandable (nested applications or children exist)
    const isExpandable = hasChildren || (groupData.__meta?.applications && groupData.__meta.applications.length > 0);
    
    // Get metrics with defaults
    const metrics = groupData.__meta?.metrics || {};
    const uniqueUsers = metrics.uniqueUsers || 0;
    const activeUsers = metrics.activeUsers || 0;
    const totalInstallations = metrics.totalInstallations || 0;
    
    // Extract business unit code from groupName (assuming format like "EL/ELSP")
    // For business areas, use the first segment which should be like EL, RA, MO, etc.
    const businessUnit = level === 0 ? groupName : extractBusinessUnit(groupName, fullPath);
    
    const totalCost = metrics.totalCost || 0;
    const totalUBCCost = metrics.totalUBCCost || 0;
    
    // Get users list and applications
    const users = groupData.__meta?.items || [];
    const hasUsers = users.length > 0;
    const applications = groupData.__meta?.applications || [];
    
    // Style rows differently based on level for better hierarchy visualization
    const rowClassName = level === 0 
      ? 'bg-gray-100 font-semibold' 
      : level === 1 
        ? 'bg-gray-50' 
        : 'bg-white';

    rows.push(
      <tr key={fullPath} className={rowClassName}>
        <td
          className="p-2 border"
          onClick={isExpandable ? () => togglePath(fullPath) : undefined}
          style={{ cursor: isExpandable ? 'pointer' : 'default' }}
        >
          <div style={{ paddingLeft: `${level * 20}px` }} className="flex items-center">
            {isExpandable && (
              <span className="mr-2">
                {isExpanded ? 'v' : '>'}
              </span>
            )}
            <span className="font-medium">{groupName}</span>
            {hasUsers && (
              <button
                onClick={(e) => { e.stopPropagation(); toggleUsers(fullPath); }}
                className="ml-2 px-2 text-xs text-blue-600 border border-blue-300 rounded hover:bg-blue-100"
              >
                {expandedUsers[fullPath] ? 'Hide Users' : 'Show Users'}
              </button>
            )}
          </div>
        </td>
        <td className="p-2 border text-right">{uniqueUsers}</td>
        <td className="p-2 border text-right">{activeUsers}</td>
        <td className="p-2 border text-right">{totalInstallations}</td>
        <td className="p-2 border">{businessUnit}</td>
        <td className="p-2 border text-right">
          {totalCost > 0 ? `$${totalCost.toLocaleString()}` : 'N/A'}
        </td>
        <td className="p-2 border text-right">
          {totalUBCCost > 0 ? `$${totalUBCCost.toLocaleString()}` : 'N/A'}
        </td>
      </tr>
    );

    // If expanded, add child rows
    if (isExpanded) {
      // Add application rows if any
      if (applications && applications.length > 0) {
        rows = rows.concat(renderApplicationRows(applications, fullPath, level));
      }

      // Add user rows if expanded (users toggled separately)
      if (hasUsers && expandedUsers[fullPath]) {
        rows = rows.concat(renderUserRows(users, fullPath));
      }

      // Add children rows if there are any
      if (hasChildren) {
        rows = rows.concat(renderRows(groupData.__meta.children, fullPathSegments, level + 1));
      }
    }
  }
  return rows;
};


  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 text-left border">Group Name</th>
            <th className="p-2 text-right border">Unique Users</th>
            <th className="p-2 text-right border">Active Users</th>
            <th className="p-2 text-right border">Installations</th>
            <th className="p-2 text-left border">Business Unit</th>
            <th className="p-2 text-right border">DSC Cost</th>
            <th className="p-2 text-right border">UBC Cost</th>
          </tr>
        </thead>
        <tbody>{renderRows(data, [], 0)}</tbody>
      </table>
    </div>
  );
};

export default NestedTable;