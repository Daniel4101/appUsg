import React, { useState, useEffect } from 'react';
import { Plus, Trash, Edit, Save, X, Check, AlertTriangle } from 'lucide-react';
import StorageService from '../services/StorageService';

/**
 * GroupManagement component for creating and managing application groups with improved persistence
 */
const GroupManagement = ({ data, onGroupCreate, onGroupUpdate, onGroupDelete }) => {
  const [groups, setGroups] = useState([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [selectedApps, setSelectedApps] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [availableApps, setAvailableApps] = useState([]);
  const [feedback, setFeedback] = useState({ message: '', type: '' });
  const [saveAttempted, setSaveAttempted] = useState(false);

  // Extract all unique applications from the data
  useEffect(() => {
    if (data?.structure) {
      const apps = new Set();
      
      Object.values(data.structure).forEach(group => {
        if (group.flexeraData?.items) {
          group.flexeraData.items.forEach(item => {
            const appName = item['Application - Product'];
            if (appName) apps.add(appName);
          });
        }
      });
      
      setAvailableApps(Array.from(apps).sort());
    }
  }, [data]);

  // Load existing groups from localStorage with improved error handling
  useEffect(() => {
    try {
      console.log('Loading application groups in component...');
      const savedGroups = StorageService.loadData('applicationGroups', []);
      console.log('Loaded groups in component:', savedGroups);
      setGroups(savedGroups);
      
      // Display feedback if groups were loaded
      if (savedGroups.length > 0) {
        setFeedback({
          message: `Loaded ${savedGroups.length} existing groups`,
          type: 'success'
        });
        setTimeout(() => setFeedback({ message: '', type: '' }), 3000);
      }
    } catch (error) {
      console.error('Error loading application groups in component:', error);
      setFeedback({
        message: 'Error loading saved groups',
        type: 'error'
      });
    }
  }, []);

  // Save groups to localStorage when they change
  useEffect(() => {
    // Only save if save has been attempted at least once
    // This prevents overwriting on initial load
    if (saveAttempted) {
      try {
        console.log('Saving groups in component:', groups);
        const success = StorageService.saveData('applicationGroups', groups);
        
        if (success) {
          setFeedback({
            message: 'Groups saved successfully',
            type: 'success'
          });
        } else {
          setFeedback({
            message: 'Failed to save groups',
            type: 'error'
          });
        }
        
        // Clear feedback after 3 seconds
        setTimeout(() => setFeedback({ message: '', type: '' }), 3000);
      } catch (error) {
        console.error('Error saving application groups in component:', error);
        setFeedback({
          message: 'Error saving groups: ' + error.message,
          type: 'error'
        });
      }
    }
  }, [groups, saveAttempted]);

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;
    
    setSaveAttempted(true);
    
    const newGroup = {
      id: Date.now().toString(),
      name: newGroupName.trim(),
      applications: Object.keys(selectedApps).filter(appId => selectedApps[appId]),
      createdAt: new Date().toISOString()
    };
    
    const updatedGroups = [...groups, newGroup];
    setGroups(updatedGroups);
    setNewGroupName('');
    setSelectedApps({});
    
    if (onGroupCreate) {
      onGroupCreate(newGroup);
    }
    
    setFeedback({
      message: `Group "${newGroup.name}" created with ${newGroup.applications.length} applications`,
      type: 'success'
    });
  };

  const handleUpdateGroup = (groupId) => {
    setSaveAttempted(true);
    
    const updatedGroups = groups.map(group => {
      if (group.id === groupId) {
        const updatedGroup = {
          ...group,
          name: editGroupName,
          applications: Object.keys(selectedApps).filter(appId => selectedApps[appId]),
          updatedAt: new Date().toISOString()
        };
        
        if (onGroupUpdate) {
          onGroupUpdate(updatedGroup);
        }
        
        setFeedback({
          message: `Group "${updatedGroup.name}" updated`,
          type: 'success'
        });
        
        return updatedGroup;
      }
      return group;
    });
    
    setGroups(updatedGroups);
    setEditingGroupId(null);
    setEditGroupName('');
    setSelectedApps({});
  };

  const handleDeleteGroup = (groupId) => {
    setSaveAttempted(true);
    
    const groupToDelete = groups.find(g => g.id === groupId);
    const updatedGroups = groups.filter(group => group.id !== groupId);
    setGroups(updatedGroups);
    
    if (onGroupDelete && groupToDelete) {
      onGroupDelete(groupToDelete);
    }
    
    setFeedback({
      message: `Group "${groupToDelete?.name}" deleted`,
      type: 'success'
    });
  };

  const startEditingGroup = (group) => {
    setEditingGroupId(group.id);
    setEditGroupName(group.name);
    
    const initialSelection = {};
    group.applications.forEach(app => {
      initialSelection[app] = true;
    });
    
    setSelectedApps(initialSelection);
  };

  const cancelEditing = () => {
    setEditingGroupId(null);
    setEditGroupName('');
    setSelectedApps({});
  };

  const toggleAppSelection = (appName) => {
    setSelectedApps(prev => ({
      ...prev,
      [appName]: !prev[appName]
    }));
  };

  const filteredApps = availableApps.filter(app => 
    app.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Force a save of the current groups to ensure they're persisted
  const forceSave = () => {
    setSaveAttempted(true);
    console.log('Force saving groups:', groups);
    const success = StorageService.saveData('applicationGroups', groups);
    
    if (success) {
      setFeedback({
        message: 'Groups saved successfully',
        type: 'success'
      });
    } else {
      setFeedback({
        message: 'Failed to save groups',
        type: 'error'
      });
    }
  };

  const selectedCount = Object.values(selectedApps).filter(Boolean).length;

  return (
    <div className="bg-white p-6 rounded-lg shadow mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Application Groups</h2>
        <button 
          onClick={forceSave}
          className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          <Save className="w-4 h-4 mr-1" />
          Save Groups
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback.message && (
        <div className={`mb-4 p-3 rounded-lg flex items-center ${
          feedback.type === 'success' ? 'bg-green-100 text-green-800' : 
          feedback.type === 'error' ? 'bg-red-100 text-red-800' : 
          'bg-blue-100 text-blue-800'
        }`}>
          {feedback.type === 'success' ? (
            <Check className="w-5 h-5 mr-2" />
          ) : feedback.type === 'error' ? (
            <AlertTriangle className="w-5 h-5 mr-2" />
          ) : null}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Create/Edit Group Form */}
      <div className="border rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold mb-2">
          {editingGroupId ? 'Edit Group' : 'Create New Group'}
        </h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Group Name
          </label>
          <input
            type="text"
            value={editingGroupId ? editGroupName : newGroupName}
            onChange={(e) => editingGroupId ? setEditGroupName(e.target.value) : setNewGroupName(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="Enter group name..."
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search Applications
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="Search applications..."
          />
        </div>
        
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Select Applications
            </label>
            <span className="text-xs text-gray-500">
              {selectedCount} selected
            </span>
          </div>
          
          <div className="border rounded-lg h-48 overflow-y-auto p-2">
            {filteredApps.length > 0 ? (
              filteredApps.map(app => (
                <div key={app} className="flex items-center p-1 hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={!!selectedApps[app]}
                    onChange={() => toggleAppSelection(app)}
                    className="mr-2"
                  />
                  <span className="text-sm truncate">{app}</span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm p-2">No applications found</p>
            )}
          </div>
        </div>
        
        <div className="flex justify-end gap-2">
          {editingGroupId && (
            <button
              onClick={cancelEditing}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          )}
          
          <button
            onClick={editingGroupId ? () => handleUpdateGroup(editingGroupId) : handleCreateGroup}
            disabled={!(editingGroupId ? editGroupName : newGroupName).trim()}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
              (editingGroupId ? editGroupName : newGroupName).trim()
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {editingGroupId ? (
              <>
                <Save className="w-4 h-4 mr-2" /> Update Group
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" /> Create Group
              </>
            )}
          </button>
        </div>
      </div>

      {/* Group List */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Existing Groups</h3>
        
        {groups.length > 0 ? (
          <div className="space-y-3">
            {groups.map(group => (
              <div key={group.id} className="border rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium">{group.name}</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEditingGroup(group)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteGroup(group.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="text-sm text-gray-600">
                  {group.applications.length} applications
                </div>
                
                <div className="mt-2">
                  <div className="text-xs text-gray-500 flex flex-wrap gap-1">
                    {group.applications.slice(0, 5).map(app => (
                      <span key={app} className="bg-gray-100 px-2 py-1 rounded">
                        {app}
                      </span>
                    ))}
                    {group.applications.length > 5 && (
                      <span className="bg-gray-100 px-2 py-1 rounded">
                        +{group.applications.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No groups defined yet. Create your first group above.</p>
        )}
      </div>

      {/* Debug Info (only in development) */}
      <div className="mt-8 pt-4 border-t border-gray-200">
        <details className="text-xs text-gray-500">
          <summary className="cursor-pointer">Storage Diagnostic</summary>
          <div className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
            <p>Storage Available: {StorageService.isAvailable() ? 'Yes' : 'No'}</p>
            <p>Groups in Component State: {groups.length}</p>
            <p>Selected Apps Count: {selectedCount}</p>
            <p>Save Attempted: {saveAttempted ? 'Yes' : 'No'}</p>
            <p>localStorage Groups: {localStorage.getItem('applicationGroups') ? 'Present' : 'Not Present'}</p>
          </div>
        </details>
      </div>
    </div>
  );
};

export default GroupManagement;