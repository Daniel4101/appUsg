import React, { useState, useEffect } from 'react';
import { Search, CheckCircle, PlusCircle, AlertCircle } from 'lucide-react';
import GroupTemplatesService from '../services/GroupTemplatesService';

/**
 * TemplateSelector component for applying predefined templates to create application groups
 */
const TemplateSelector = ({ availableApps, onTemplateApplied }) => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredTemplates, setFilteredTemplates] = useState([]);
  const [previewResults, setPreviewResults] = useState(null);
  const [groupName, setGroupName] = useState('');
  const [groupingInProgress, setGroupingInProgress] = useState(false);

  // Initialize the templates service
  const templatesService = new GroupTemplatesService();

  // Load templates on component mount
  useEffect(() => {
    const allTemplates = templatesService.getAllTemplates();
    setTemplates(allTemplates);
    setFilteredTemplates(allTemplates);
  }, []);

  // Filter templates when search term changes
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredTemplates(templates);
      return;
    }

    const filtered = templates.filter(template => 
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    setFilteredTemplates(filtered);
  }, [searchTerm, templates]);

  // Generate preview when a template is selected
  useEffect(() => {
    if (!selectedTemplate || !availableApps || availableApps.length === 0) {
      setPreviewResults(null);
      return;
    }

    // Default the group name if it's empty
    if (!groupName) {
      setGroupName(selectedTemplate.name);
    }

    // Apply the template to get matching applications
    const result = templatesService.applyTemplate(selectedTemplate.id, availableApps);
    setPreviewResults(result);
  }, [selectedTemplate, availableApps]);

  // Handle template selection
  const handleTemplateClick = (template) => {
    setSelectedTemplate(template);
    setGroupName(template.name);
  };

  // Apply the template to create a new group
  const applyTemplate = () => {
    if (!previewResults || !groupName.trim()) return;

    setGroupingInProgress(true);

    // Create the group definition
    const newGroup = {
      name: groupName.trim(),
      applications: previewResults.applications,
      description: previewResults.description,
      templateId: previewResults.templateId,
      createdAt: new Date().toISOString()
    };

    // Notify parent component
    if (onTemplateApplied) {
      onTemplateApplied(newGroup);
    }

    // Reset the form
    setSelectedTemplate(null);
    setGroupName('');
    setPreviewResults(null);
    setGroupingInProgress(false);
  };

  // Group templates by category
  const getTemplatesByCategory = () => {
    const grouped = {};
    
    filteredTemplates.forEach(template => {
      if (!grouped[template.category]) {
        grouped[template.category] = [];
      }
      grouped[template.category].push(template);
    });
    
    return grouped;
  };

  const templatesByCategory = getTemplatesByCategory();

  return (
    <div className="bg-white p-6 rounded-lg shadow mb-8">
      <h2 className="text-xl font-semibold mb-4">Create Group from Template</h2>
      
      <div className="mb-6">
        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search templates..."
            className="pl-10 w-full px-4 py-2 border rounded-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {Object.entries(templatesByCategory).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(templatesByCategory).map(([category, categoryTemplates]) => (
              <div key={category} className="border rounded-lg p-3">
                <h3 className="font-medium text-gray-700 mb-2">{category}</h3>
                <div className="space-y-2">
                  {categoryTemplates.map(template => (
                    <div
                      key={template.id}
                      className={`p-2 rounded cursor-pointer transition-colors ${
                        selectedTemplate?.id === template.id
                          ? 'bg-blue-100 border border-blue-300'
                          : 'hover:bg-gray-100 border border-gray-200'
                      }`}
                      onClick={() => handleTemplateClick(template)}
                    >
                      <div className="font-medium">{template.name}</div>
                      <div className="text-sm text-gray-600">{template.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center p-4 text-gray-500">
            No templates match your search. Try different keywords.
          </div>
        )}
      </div>
      
      {selectedTemplate && (
        <div className="border rounded-lg p-4 mb-6">
          <h3 className="font-medium mb-3">Template Preview: {selectedTemplate.name}</h3>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Group Name
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Enter group name..."
            />
          </div>
          
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Matching Applications
              </label>
              {previewResults && (
                <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {previewResults.applications.length} matches
                </span>
              )}
            </div>
            
            <div className="border rounded-lg h-48 overflow-y-auto p-2">
              {previewResults && previewResults.applications.length > 0 ? (
                <div className="space-y-1">
                  {previewResults.applications.map((app, index) => (
                    <div key={index} className="flex items-center p-1 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      <span className="truncate">{app}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <AlertCircle className="w-8 h-8 mb-2" />
                  <p>No matching applications found</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex justify-end">
            <button
              onClick={() => setSelectedTemplate(null)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors mr-2"
            >
              Cancel
            </button>
            <button
              onClick={applyTemplate}
              disabled={!previewResults || previewResults.applications.length === 0 || !groupName.trim() || groupingInProgress}
              className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                !previewResults || previewResults.applications.length === 0 || !groupName.trim() || groupingInProgress
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              Create Group
            </button>
          </div>
        </div>
      )}
      
      <p className="text-sm text-gray-500">
        Templates automatically identify and group applications based on common patterns.
        Select a template to preview matching applications before creating the group.
      </p>
    </div>
  );
};

export default TemplateSelector;