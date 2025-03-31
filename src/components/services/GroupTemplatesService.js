/**
 * Service for managing predefined application group templates
 */
class GroupTemplatesService {
    constructor() {
      this.templates = this.getDefaultTemplates();
    }
  
    /**
     * Get all available templates
     */
    getAllTemplates() {
      return this.templates;
    }
  
    /**
     * Get a specific template by ID
     */
    getTemplateById(templateId) {
      return this.templates.find(t => t.id === templateId);
    }
  
    /**
     * Apply a template to an application list
     * Returns a new group definition with matched applications
     */
    applyTemplate(templateId, applications = []) {
      const template = this.getTemplateById(templateId);
      if (!template) return null;
  
      // Get all application names
      const appNames = applications.map(app => 
        typeof app === 'string' ? app : app.name
      );
  
      // Match applications against template patterns
      const matchedApps = [];
      appNames.forEach(appName => {
        if (!appName) return;
        
        const normalizedName = appName.toLowerCase();
        const matches = template.patterns.some(pattern => {
          if (pattern.startsWith('*') && pattern.endsWith('*')) {
            // Contains match *pattern*
            const term = pattern.slice(1, -1).toLowerCase();
            return normalizedName.includes(term);
          } else if (pattern.startsWith('*')) {
            // Ends with match *pattern
            const term = pattern.slice(1).toLowerCase();
            return normalizedName.endsWith(term);
          } else if (pattern.endsWith('*')) {
            // Starts with match pattern*
            const term = pattern.slice(0, -1).toLowerCase();
            return normalizedName.startsWith(term);
          } else {
            // Exact match
            return normalizedName === pattern.toLowerCase();
          }
        });
  
        if (matches) {
          matchedApps.push(appName);
        }
      });
  
      return {
        name: template.name,
        description: template.description,
        applications: matchedApps,
        templateId: template.id
      };
    }
  
    /**
     * Returns default predefined templates
     */
    getDefaultTemplates() {
      return [
        {
          id: 'office-productivity',
          name: 'Microsoft Office Suite',
          description: 'Microsoft Office applications including Word, Excel, PowerPoint, etc.',
          patterns: [
            'Microsoft Word',
            'Microsoft Excel',
            'Microsoft PowerPoint',
            'Microsoft Outlook',
            'Microsoft Access',
            'Microsoft OneNote',
            'Microsoft Office*',
            '*Office 365*',
            'Microsoft 365*',
            'MS Office*',
            'Office Pro*',
            '*Microsoft Teams*'
          ],
          category: 'Productivity',
          icon: 'file-text'
        },
        {
          id: 'adobe-creative',
          name: 'Adobe Creative Suite',
          description: 'Adobe Creative Cloud applications like Photoshop, Illustrator, etc.',
          patterns: [
            'Adobe Photoshop*',
            'Adobe Illustrator*',
            'Adobe InDesign*',
            'Adobe Premiere*',
            'Adobe After Effects*',
            'Adobe Acrobat*',
            'Adobe XD*',
            'Adobe Lightroom*',
            '*Creative Cloud*',
            '*Creative Suite*',
            'Adobe CC*'
          ],
          category: 'Design',
          icon: 'pen-tool'
        },
        {
          id: 'cloud-infra',
          name: 'Cloud Infrastructure',
          description: 'Cloud infrastructure and DevOps tools',
          patterns: [
            '*AWS*',
            '*Amazon Web Services*',
            '*Azure*',
            '*Microsoft Azure*',
            '*Google Cloud*',
            '*GCP*',
            'Terraform*',
            'Docker*',
            'Kubernetes*',
            '*CloudFormation*',
            '*Ansible*',
            '*Jenkins*'
          ],
          category: 'IT',
          icon: 'cloud'
        },
        {
          id: 'data-analytics',
          name: 'Data Analytics Tools',
          description: 'Data analysis, BI, and visualization tools',
          patterns: [
            '*Tableau*',
            '*Power BI*',
            '*Qlik*',
            '*Looker*',
            '*Alteryx*',
            '*SAS*',
            '*SPSS*',
            '*Stata*',
            '*RStudio*',
            '*Jupyter*',
            '*Python*',
            '*Anaconda*',
            '*Databricks*',
            '*Snowflake*'
          ],
          category: 'Analytics',
          icon: 'bar-chart'
        },
        {
          id: 'crm-sales',
          name: 'CRM & Sales Tools',
          description: 'Customer relationship management and sales applications',
          patterns: [
            '*Salesforce*',
            '*HubSpot*',
            '*Dynamics CRM*',
            '*Microsoft Dynamics*',
            '*Zoho CRM*',
            '*SugarCRM*',
            '*SAP CRM*',
            '*Oracle CRM*',
            '*Zendesk*',
            '*Pipedrive*'
          ],
          category: 'Sales',
          icon: 'users'
        },
        {
          id: 'design-tools',
          name: 'Design & UX Tools',
          description: 'Design, prototyping, and UX tools',
          patterns: [
            '*Figma*',
            '*Sketch*',
            '*InVision*',
            '*Adobe XD*',
            '*Axure*',
            '*Balsamiq*',
            '*Miro*',
            '*Marvel*',
            '*Zeplin*',
            '*Framer*'
          ],
          category: 'Design',
          icon: 'layout'
        },
        {
          id: 'databases',
          name: 'Database Software',
          description: 'Database systems and management tools',
          patterns: [
            '*SQL Server*',
            '*Oracle Database*',
            '*MySQL*',
            '*PostgreSQL*',
            '*MongoDB*',
            '*MariaDB*',
            '*SQLite*',
            '*DynamoDB*',
            '*Cosmos DB*',
            '*Cassandra*',
            '*Neo4j*',
            '*Redis*',
            '*Elasticsearch*',
            '*IBM Db2*'
          ],
          category: 'IT',
          icon: 'database'
        },
        {
          id: 'video-conf',
          name: 'Video Conferencing',
          description: 'Video conferencing and communication tools',
          patterns: [
            '*Zoom*',
            '*Microsoft Teams*',
            '*Webex*',
            '*Cisco Webex*',
            '*Google Meet*',
            '*GoToMeeting*',
            '*BlueJeans*',
            '*Slack*',
            '*Discord*',
            '*Skype*'
          ],
          category: 'Communication',
          icon: 'video'
        },
        {
          id: 'project-mgmt',
          name: 'Project Management',
          description: 'Project management and collaboration tools',
          patterns: [
            '*Jira*',
            '*Asana*',
            '*Trello*',
            '*Monday.com*',
            '*ClickUp*',
            '*Microsoft Project*',
            '*Smartsheet*',
            '*Basecamp*',
            '*Wrike*',
            '*Notion*'
          ],
          category: 'Productivity',
          icon: 'clipboard'
        },
        {
          id: 'hr-systems',
          name: 'HR & Payroll Systems',
          description: 'Human resources and payroll management systems',
          patterns: [
            '*Workday*',
            '*ADP*',
            '*SAP SuccessFactors*',
            '*Oracle HCM*',
            '*UKG*',
            '*BambooHR*',
            '*Paylocity*',
            '*Paychex*',
            '*Gusto*',
            '*Zenefits*'
          ],
          category: 'HR',
          icon: 'user-check'
        }
      ];
    }
  }
  
  export default GroupTemplatesService;