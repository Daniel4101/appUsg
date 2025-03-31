import React, { useState, useEffect, useCallback } from 'react';
import _ from 'lodash';

/**
 * GroupMappingsEditor component allows editing of application group definitions
 */
const GroupMappingsEditor = ({ groupDefinitions, onSave }) => {
  const [groups, setGroups] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [newApplications, setNewApplications] = useState('');
  const [bulkImport, setBulkImport] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupPath, setNewGroupPath] = useState('');

  // Convert flat group definitions to hierarchical structure for editing
  useEffect(() => {
    if (!groupDefinitions || !groupDefinitions.groups) {
      setGroups([]);
      return;
    }
    
    // Initialize expanded state for group tree
    const expanded = {};
    const initializeExpanded = (nodes, path = '') => {
      nodes.forEach(node => {
        const nodePath = path ? `${path} > ${node.name}` : node.name;
        expanded[nodePath] = false;
        if (node.children) {
          initializeExpanded(node.children, nodePath);
        }
      });
    };
    
    initializeExpanded(groupDefinitions.groups);
    setExpandedGroups(expanded);
    setGroups(groupDefinitions.groups);
  }, [groupDefinitions]);

  /**
   * Toggle expanded state of a group
   */
  const toggleGroup = (path) => {
    setExpandedGroups(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  /**
   * Select a group for editing
   */
  const handleSelectGroup = (group, path) => {
    setSelectedGroup({ group, path });
    setNewApplications('');
  };

  /**
   * Add applications to a group
   */
  const handleAddApplications = () => {
    if (!selectedGroup || !newApplications.trim()) return;
    
    // Parse applications (comma or newline separated)
    const appsToAdd = newApplications
      .split(/[\n,]/)
      .map(app => app.trim())
      .filter(app => app);
    
    if (appsToAdd.length === 0) return;
    
    // Clone the current groups structure
    const updatedGroups = _.cloneDeep(groups);
    
    // Find the selected group in the structure
    const findGroupByPath = (nodes, pathParts) => {
      if (pathParts.length === 0) return null;
      
      const currentPart = pathParts[0];
      const remainingParts = pathParts.slice(1);
      
      for (const node of nodes) {
        if (node.name === currentPart) {
          if (remainingParts.length === 0) {
            return node; // Found the target group
          } else if (node.children) {
            return findGroupByPath(node.children, remainingParts);
          }
          return null; // Path doesn't exist
        }
      }
      
      return null; // Group not found
    };
    
    const pathParts = selectedGroup.path.split(' > ');
    const targetGroup = findGroupByPath(updatedGroups, pathParts);
    
    if (targetGroup) {
      // Initialize members array if it doesn't exist
      if (!targetGroup.members) {
        targetGroup.members = [];
      }
      
      // Add applications that aren't already in the group
      appsToAdd.forEach(app => {
        if (!targetGroup.members.includes(app)) {
          targetGroup.members.push(app);
        }
      });
      
      // Sort members alphabetically
      targetGroup.members.sort();
      
      // Update state
      setGroups(updatedGroups);
      setNewApplications('');
      
      // Call save callback
      if (onSave) {
        onSave({ ...groupDefinitions, groups: updatedGroups });
      }
    }
  };

  /**
   * Handle bulk import of mapping definitions
   */
  const handleBulkImport = () => {
    if (!bulkImport.trim()) return;
    
    try {
      // Parse CSV or JSON format
      let mappings = [];
      
      if (bulkImport.includes(',')) {
        // Assume CSV format: Application,Group Path
        mappings = bulkImport
          .split('\n')
          .map(line => {
            const [app, path] = line.split(',').map(s => s.trim());
            return { app, path };
          })
          .filter(mapping => mapping.app && mapping.path);
      } else {
        // Try to parse as JSON
        try {
          const parsed = JSON.parse(bulkImport);
          if (Array.isArray(parsed)) {
            mappings = parsed
              .filter(item => item.app && item.path)
              .map(item => ({ app: item.app, path: item.path }));
          }
        } catch (e) {
          // Not valid JSON, try newline-delimited format: App|Path
          mappings = bulkImport
            .split('\n')
            .map(line => {
              const [app, path] = line.split('|').map(s => s.trim());
              return { app, path };
            })
            .filter(mapping => mapping.app && mapping.path);
        }
      }
      
      if (mappings.length === 0) {
        alert('No valid mappings found in the input data');
        return;
      }
      
      // Clone current groups structure
      const updatedGroups = _.cloneDeep(groups);
      
      // Add mappings
      mappings.forEach(({ app, path }) => {
        const pathParts = path.split(' > ').map(p => p.trim());
        
        // Create path if it doesn't exist
        let currentLevel = updatedGroups;
        let currentPath = '';
        
        for (let i = 0; i < pathParts.length; i++) {
          const part = pathParts[i];
          currentPath = currentPath ? `${currentPath} > ${part}` : part;
          
          // Find or create the group at this level
          let group = currentLevel.find(g => g.name === part);
          
          if (!group) {
            // Create new group
            group = { name: part };
            if (i < pathParts.length - 1) {
              group.children = [];
            } else {
              group.members = [];
            }
            currentLevel.push(group);
            
            // Expand the new group
            setExpandedGroups(prev => ({
              ...prev,
              [currentPath]: true
            }));
          }
          
          // Initialize children if needed
          if (i < pathParts.length - 1) {
            if (!group.children) {
              group.children = [];
            }
            currentLevel = group.children;
          } else {
            // Add the app to the leaf group
            if (!group.members) {
              group.members = [];
            }
            if (!group.members.includes(app)) {
              group.members.push(app);
            }
          }
        }
      });
      
      // Update state
      setGroups(updatedGroups);
      setBulkImport('');
      setShowBulkImport(false);
      
      // Call save callback
      if (onSave) {
        onSave({ ...groupDefinitions, groups: updatedGroups });
      }
      
      alert(`Successfully imported ${mappings.length} mappings`);
    } catch (error) {
      console.error('Error importing mappings:', error);
      alert(`Error importing mappings: ${error.message}`);
    }
  };

  /**
   * Create a new group
   */
  const handleCreateGroup = () => {
    if (!newGroupPath.trim() || !newGroupName.trim()) return;
    
    // Parse path and create the group structure
    const pathParts = newGroupPath.split(' > ').map(p => p.trim());
    const updatedGroups = _.cloneDeep(groups);
    
    // Create path if it doesn't exist
    let currentLevel = updatedGroups;
    let currentPath = '';
    
    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];
      currentPath = currentPath ? `${currentPath} > ${part}` : part;
      
      // Find or create the group at this level
      let group = currentLevel.find(g => g.name === part);
      
      if (!group) {
        // Create new group
        group = { name: part };
        if (i < pathParts.length - 1) {
          group.children = [];
        }
        currentLevel.push(group);
        
        // Expand the new group
        setExpandedGroups(prev => ({
          ...prev,
          [currentPath]: true
        }));
      }
      
      // Initialize children if needed
      if (i < pathParts.length - 1) {
        if (!group.children) {
          group.children = [];
        }
        currentLevel = group.children;
      }
    }
    
    // Add the new leaf group
    if (newGroupName) {
      let parentGroup = currentLevel;
      const existingGroup = parentGroup.find(g => g.name === newGroupName);
      
      if (!existingGroup) {
        parentGroup.push({
          name: newGroupName,
          members: []
        });
      }
    }
    
    // Update state
    setGroups(updatedGroups);
    setNewGroupName('');
    setNewGroupPath('');
    
    // Call save callback
    if (onSave) {
      onSave({ ...groupDefinitions, groups: updatedGroups });
    }
  };

  /**
   * Remove application from a group
   */
  const handleRemoveApplication = (app) => {
    if (!selectedGroup) return;
    
    // Clone the current groups structure
    const updatedGroups = _.cloneDeep(groups);
    
    // Find the selected group in the structure
    const findGroupByPath = (nodes, pathParts) => {
      if (pathParts.length === 0) return null;
      
      const currentPart = pathParts[0];
      const remainingParts = pathParts.slice(1);
      
      for (const node of nodes) {
        if (node.name === currentPart) {
          if (remainingParts.length === 0) {
            return node; // Found the target group
          } else if (node.children) {
            return findGroupByPath(node.children, remainingParts);
          }
          return null; // Path doesn't exist
        }
      }
      
      return null; // Group not found
    };
    
    const pathParts = selectedGroup.path.split(' > ');
    const targetGroup = findGroupByPath(updatedGroups, pathParts);
    
    if (targetGroup && targetGroup.members) {
      // Remove the application
      targetGroup.members = targetGroup.members.filter(a => a !== app);
      
      // Update state
      setGroups(updatedGroups);
      
      // Update the selected group to reflect changes
      setSelectedGroup({
        ...selectedGroup,
        group: {
          ...selectedGroup.group,
          members: targetGroup.members
        }
      });
      
      // Call save callback
      if (onSave) {
        onSave({ ...groupDefinitions, groups: updatedGroups });
      }
    }
  };

  /**
   * Delete a group
   */
  const handleDeleteGroup = () => {
    if (!selectedGroup) return;
    
    if (!confirm(`Are you sure you want to delete the group "${selectedGroup.path}"?`)) {
      return;
    }
    
    // Clone the current groups structure
    const updatedGroups = _.cloneDeep(groups);
    
    // Find and remove the selected group
    const pathParts = selectedGroup.path.split(' > ');
    
    const removeGroupByPath = (nodes, parts, depth = 0) => {
      if (depth === parts.length - 1) {
        // Remove the target group from this level
        const index = nodes.findIndex(node => node.name === parts[depth]);
        if (index !== -1) {
          nodes.splice(index, 1);
          return true;
        }
        return false;
      }
      
      // Find the parent group
      const parentGroup = nodes.find(node => node.name === parts[depth]);
      if (!parentGroup || !parentGroup.children) {
        return false;
      }
      
      return removeGroupByPath(parentGroup.children, parts, depth + 1);
    };
    
    const removed = removeGroupByPath(updatedGroups, pathParts);
    
    if (removed) {
      // Update state
      setGroups(updatedGroups);
      setSelectedGroup(null);
      
      // Call save callback
      if (onSave) {
        onSave({ ...groupDefinitions, groups: updatedGroups });
      }
    }
  };

  /**
   * Rename a group
   */
  const handleRenameGroup = () => {
    if (!editingGroup || !newGroupName.trim()) return;
    
    // Clone the current groups structure
    const updatedGroups = _.cloneDeep(groups);
    
    // Find the group to rename
    const pathParts = editingGroup.path.split(' > ');
    
    const renameGroupByPath = (nodes, parts, depth = 0) => {
      if (depth === parts.length - 1) {
        // Rename the target group
        const group = nodes.find(node => node.name === parts[depth]);
        if (group) {
          group.name = newGroupName;
          return true;
        }
        return false;
      }
      
      // Find the parent group
      const parentGroup = nodes.find(node => node.name === parts[depth]);
      if (!parentGroup || !parentGroup.children) {
        return false;
      }
      
      return renameGroupByPath(parentGroup.children, parts, depth + 1);
    };
    
    const renamed = renameGroupByPath(updatedGroups, pathParts);
    
    if (renamed) {
      // Update expanded groups mapping
      const newExpandedGroups = {};
      Object.entries(expandedGroups).forEach(([path, isExpanded]) => {
        const pathParts = path.split(' > ');
        if (pathParts.length >= editingGroup.path.split(' > ').length) {
          // Replace the renamed part in the path
          pathParts[editingGroup.depth] = newGroupName;
          newExpandedGroups[pathParts.join(' > ')] = isExpanded;
        } else {
          newExpandedGroups[path] = isExpanded;
        }
      });
      
      // Update state
      setGroups(updatedGroups);
      setExpandedGroups(newExpandedGroups);
      setEditingGroup(null);
      setNewGroupName('');
      
      // Update selected group if it was renamed
      if (selectedGroup && selectedGroup.path === editingGroup.path) {
        const newPath = selectedGroup.path.split(' > ');
        newPath[newPath.length - 1] = newGroupName;
        setSelectedGroup({
          ...selectedGroup,
          path: newPath.join(' > '),
          group: {
            ...selectedGroup.group,
            name: newGroupName
          }
        });
      }
      
      // Call save callback
      if (onSave) {
        onSave({ ...groupDefinitions, groups: updatedGroups });
      }
    }
  };

  /**
   * Render the group tree recursively
   */
  const renderGroupTree = (nodes, parentPath = '', depth = 0) => {
    if (!nodes || nodes.length === 0) return null;
    
    return (
      <ul className={`pl-${depth > 0 ? '4' : '0'}`}>
        {nodes.map((node, index) => {
          const path = parentPath ? `${parentPath} > ${node.name}` : node.name;
          const isExpanded = expandedGroups[path];
          const hasChildren = node.children && node.children.length > 0;
          const isSelected = selectedGroup && selectedGroup.path === path;
          
          // Filter by search term if provided
          if (searchTerm && !path.toLowerCase().includes(searchTerm.toLowerCase()) &&
              !node.members?.some(m => m.toLowerCase().includes(searchTerm.toLowerCase()))) {
            return null;
          }
          
          return (
            <li key={index} className="py-1">
              <div className={`flex items-center ${isSelected ? 'bg-blue-100 rounded-md px-1' : ''}`}>
                {hasChildren && (
                  <button
                    onClick={() => toggleGroup(path)}
                    className="w-5 h-5 flex items-center justify-center text-gray-500"
                  >
                    {isExpanded ? '▼' : '►'}
                  </button>
                )}
                
                {!hasChildren && <span className="w-5"></span>}
                
                <span
                  className={`ml-1 cursor-pointer ${isSelected ? 'font-semibold' : ''}`}
                  onClick={() => handleSelectGroup(node, path)}
                >
                  {node.name} {node.members?.length > 0 ? `(${node.members.length})` : ''}
                </span>
                
                <div className="ml-auto flex space-x-1">
                  <button
                    onClick={() => {
                      setEditingGroup({ path, depth, node });
                      setNewGroupName(node.name);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Rename
                  </button>
                </div>
              </div>
              
              {isExpanded && hasChildren && (
                renderGroupTree(node.children, path, depth + 1)
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-xl font-semibold mb-4">Application Group Mappings Editor</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Group Tree */}
        <div className="md:col-span-1 border rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Group Structure</h3>
            <button
              onClick={() => {
                setNewGroupPath('');
                setNewGroupName('');
              }}
              className="text-sm px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              New Group
            </button>
          </div>
          
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search groups or applications..."
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="overflow-y-auto max-h-96">
            {renderGroupTree(groups)}
          </div>
        </div>
        
        {/* Group Details / Editor */}
        <div className="md:col-span-2 border rounded-lg p-4">
          {selectedGroup ? (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">{selectedGroup.path}</h3>
                <button
                  onClick={handleDeleteGroup}
                  className="text-sm px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Delete Group
                </button>
              </div>
              
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2">Applications in this group:</h4>
                {selectedGroup.group.members && selectedGroup.group.members.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedGroup.group.members.map((app, index) => (
                      <div
                        key={index}
                        className="bg-gray-100 rounded-full px-3 py-1 text-sm flex items-center"
                      >
                        <span>{app}</span>
                        <button
                          onClick={() => handleRemoveApplication(app)}
                          className="ml-2 text-red-600 hover:text-red-800"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No applications in this group.</p>
                )}
              </div>
              
              <div className="border-t pt-4 mt-4">
                <h4 className="text-sm font-medium mb-2">Add Applications:</h4>
                <textarea
                  placeholder="Enter application names (comma or newline separated)"
                  className="w-full border rounded-lg px-3 py-2 text-sm h-32"
                  value={newApplications}
                  onChange={(e) => setNewApplications(e.target.value)}
                ></textarea>
                <div className="flex justify-end mt-2">
                  <button
                    onClick={handleAddApplications}
                    disabled={!newApplications.trim()}
                    className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                  >
                    Add to Group
                  </button>
                </div>
              </div>
            </div>
          ) : newGroupPath || newGroupName ? (
            <div>
              <h3 className="font-semibold mb-4">Create New Group</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parent Path (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Infrastructure Software"
                    className="w-full border rounded-lg px-3 py-2"
                    value={newGroupPath}
                    onChange={(e) => setNewGroupPath(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty to create a top-level group
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Group Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Web Browsers"
                    className="w-full border rounded-lg px-3 py-2"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                  />
                </div>
                
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      setNewGroupPath('');
                      setNewGroupName('');
                    }}
                    className="px-3 py-1 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 mr-2 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateGroup}
                    disabled={!newGroupName.trim()}
                    className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                  >
                    Create Group
                  </button>
                </div>
              </div>
            </div>
          ) : editingGroup ? (
            <div>
              <h3 className="font-semibold mb-4">Rename Group</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Path
                  </label>
                  <input
                    type="text"
                    className="w-full border rounded-lg px-3 py-2 bg-gray-50"
                    value={editingGroup.path}
                    readOnly
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Name
                  </label>
                  <input
                    type="text"
                    placeholder="Enter new group name"
                    className="w-full border rounded-lg px-3 py-2"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                  />
                </div>
                
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      setEditingGroup(null);
                      setNewGroupName('');
                    }}
                    className="px-3 py-1 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 mr-2 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRenameGroup}
                    disabled={!newGroupName.trim()}
                    className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                  >
                    Rename Group
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h3 className="font-semibold mb-4">Group Mappings</h3>
              
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">
                  Select a group to view or edit its applications, or create a new group structure.
                </p>
                
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={() => setShowBulkImport(!showBulkImport)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    {showBulkImport ? 'Cancel Bulk Import' : 'Bulk Import Mappings'}
                  </button>
                </div>
              </div>
              
              {showBulkImport && (
                <div className="mt-4 border-t pt-4">
                  <h4 className="font-medium mb-2">Bulk Import Mappings</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    Enter mappings in one of these formats:
                    <br />- CSV: Application,Group Path
                    <br />- Newline-delimited: Application|Group Path
                    <br />- JSON Array: [{"{app:'App',path:'Path'}"}]
                  </p>
                  
                  <textarea
                    placeholder="Enter mappings in any supported format..."
                    className="w-full border rounded-lg px-3 py-2 h-40"
                    value={bulkImport}
                    onChange={(e) => setBulkImport(e.target.value)}
                  ></textarea>
                  
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={handleBulkImport}
                      disabled={!bulkImport.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      Import Mappings
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupMappingsEditor;