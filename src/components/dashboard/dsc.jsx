import DSCMappingService from '../services/DataProcessingService';

// Initialize the service
const mappingService = new DSCMappingService();

// Example usage in an async function
async function processData(dscContent, flexeraData, quarter = '2024_Q4') {
  // Load DSC structure
  mappingService.loadDSCData(dscContent, quarter);

  // Process Flexera data
  const result = mappingService.processFlexeraData(flexeraData, quarter);

  // Access the grouped data
  console.log('Summary:', result.summary);
  
  // Access specific group
  const sapGroup = result.structure['SAP'];
  if (sapGroup) {
    console.log('SAP Group Metrics:', sapGroup.metrics);
    console.log('SAP Subgroups:', Object.keys(sapGroup.subgroups));
  }

  return result;
}

// Example of adding custom mapping rules
mappingService.addMappingRule('Microsoft Excel', {
  serviceGroup: 'Microsoft',
  serviceSubgroup: 'Office 365',
  service: 'Excel'
});