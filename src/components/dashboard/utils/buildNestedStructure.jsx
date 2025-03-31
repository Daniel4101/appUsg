import React, { useState } from 'react';

/**
 * Renders a nested table for the given data structure.
 * @param {Object} data - The nested object from buildNestedStructure()
 */
function NestedTable({ data }) {
  const [expandedPaths, setExpandedPaths] = useState({});

  // Toggles whether a given path is expanded or collapsed
  function togglePath(path) {
    setExpandedPaths(prev => ({
      ...prev,
      [path]: !prev[path]  // flip the boolean
    }));
  }

  /**
   * Recursively generates <tr> elements for each node in the tree.
   * @param {Object} node - The current level in the nested structure
   * @param {Array<string>} pathSoFar - Array of path segments leading here
   * @returns {JSX.Element[]} - Array of <tr> elements
   */
  function renderRows(node, pathSoFar = []) {
    const rows = [];

    // Each key in `node` is a group name at this level
    for (const [groupName, groupData] of Object.entries(node)) {
      const fullPathSegments = [...pathSoFar, groupName];
      const fullPath = fullPathSegments.join(' > ');

      // Check if this node has children
      const hasChildren = Object.keys(groupData.__meta.children).length > 0;

      // Is the current node expanded?
      const isExpanded = !!expandedPaths[fullPath];

      // Build a table row for the current node
      rows.push(
        <tr key={fullPath}>
          {/* Indent child rows by multiplying the level */}
          <td style={{ paddingLeft: 20 * pathSoFar.length }}>
            {/* Render a toggle button only if there are children */}
            {hasChildren && (
              <button onClick={() => togglePath(fullPath)} style={{ marginRight: 8 }}>
                {isExpanded ? '−' : '+'}
              </button>
            )}
            {groupName}
          </td>
          <td>{groupData.__meta.metrics?.uniqueUsers || 0}</td>
          <td>{groupData.__meta.metrics?.activeUsers || 0}</td>
          <td>{groupData.__meta.metrics?.totalInstallations || 0}</td>
        </tr>
      );

      // If expanded, recursively render child rows
      if (isExpanded) {
        const childRows = renderRows(groupData.__meta.children, fullPathSegments);
        rows.push(...childRows);
      }
    }

    return rows;
  }

  const tableRows = renderRows(data);

  return (
    <table className="min-w-full border">
      <thead className="bg-gray-100">
        <tr>
          <th className="p-2 text-left">Group Name</th>
          <th className="p-2 text-left">Unique Users</th>
          <th className="p-2 text-left">Active Users</th>
          <th className="p-2 text-left">Installations</th>
        </tr>
      </thead>
      <tbody>
        {tableRows}
      </tbody>
    </table>
  );
}

export default NestedTable;
