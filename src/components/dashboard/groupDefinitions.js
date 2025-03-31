/**
 * Default group definitions for application classification
 * This can be used if you don't have an existing groupDefinitions file
 */

const groupDefinitions = {
  groups: [
    {
      name: "Infrastructure Software",
      children: [
        {
          name: "MS Applications",
          members: [
            "Microsoft Office",
            "Microsoft Excel",
            "Microsoft Word",
            "Microsoft PowerPoint",
            "Microsoft Outlook",
            "Microsoft Teams",
            "Microsoft Access",
            "Microsoft OneNote",
            "Microsoft Visio",
            "Microsoft Project"
          ]
        },
        {
          name: "Web Browsers",
          members: [
            "Google Chrome",
            "Mozilla Firefox",
            "Microsoft Edge",
            "Safari",
            "Opera",
            "Internet Explorer"
          ]
        },
        {
          name: "Operating Systems",
          members: [
            "Microsoft Windows",
            "Windows 10",
            "Windows 11",
            "macOS",
            "Linux",
            "Ubuntu",
            "Red Hat",
            "CentOS"
          ]
        },
        {
          name: "Security",
          members: [
            "Symantec",
            "McAfee",
            "Norton",
            "Kaspersky",
            "Trend Micro",
            "Bitdefender",
            "Malwarebytes",
            "Avast",
            "AVG",
            "Windows Defender"
          ]
        },
        {
          name: "Communication",
          members: [
            "Zoom",
            "Slack",
            "Microsoft Teams",
            "WebEx",
            "Skype",
            "Google Meet",
            "Cisco Jabber",
            "Discord"
          ]
        },
        {
          name: "Database",
          members: [
            "Microsoft SQL Server",
            "MySQL",
            "Oracle Database",
            "PostgreSQL",
            "MongoDB",
            "SQLite",
            "MariaDB",
            "Redis",
            "Microsoft Access"
          ]
        },
        {
          name: "Business Intelligence",
          members: [
            "Tableau",
            "Power BI",
            "Qlik",
            "Looker",
            "SAP BusinessObjects",
            "MicroStrategy",
            "SAS Business Intelligence",
            "Oracle BI"
          ]
        },
        {
          name: "Document Management",
          members: [
            "Adobe Acrobat",
            "Adobe Reader",
            "PDF Creator",
            "Microsoft SharePoint",
            "Documentum",
            "OpenText",
            "Box",
            "Dropbox",
            "Google Drive",
            "OneDrive"
          ]
        },
        {
          name: "Project Management",
          members: [
            "Microsoft Project",
            "Jira",
            "Asana",
            "Trello",
            "Monday.com",
            "Smartsheet",
            "Basecamp",
            "Wrike"
          ]
        }
      ]
    },
    {
      name: "Engineering Software",
      children: [
        {
          name: "CAD Tools",
          members: [
            "AutoCAD",
            "SolidWorks",
            "Revit",
            "Inventor",
            "Fusion 360",
            "CATIA",
            "Creo",
            "NX",
            "Rhino",
            "SketchUp"
          ]
        },
        {
          name: "Simulation",
          members: [
            "ANSYS",
            "MATLAB",
            "Simulink",
            "COMSOL",
            "Abaqus",
            "NASTRAN",
            "Fluent",
            "SolidWorks Simulation",
            "Altair HyperWorks"
          ]
        },
        {
          name: "PLM",
          members: [
            "Teamcenter",
            "Windchill",
            "Enovia",
            "Aras",
            "Agile PLM",
            "SAP PLM",
            "Oracle PLM"
          ]
        },
        {
          name: "Design Tools",
          members: [
            "Adobe Photoshop",
            "Adobe Illustrator",
            "Adobe InDesign",
            "Adobe XD",
            "Sketch",
            "Figma",
            "CorelDRAW",
            "GIMP",
            "Inkscape"
          ]
        }
      ]
    },
    {
      name: "ERP",
      children: [
        {
          name: "SAP",
          members: [
            "SAP ERP",
            "SAP S/4HANA",
            "SAP Business One",
            "SAP ByDesign",
            "SAP Fiori"
          ]
        },
        {
          name: "Microsoft Dynamics",
          members: [
            "Microsoft Dynamics 365",
            "Microsoft Dynamics AX",
            "Microsoft Dynamics NAV",
            "Microsoft Dynamics GP",
            "Microsoft Dynamics CRM"
          ]
        },
        {
          name: "Oracle",
          members: [
            "Oracle ERP Cloud",
            "Oracle E-Business Suite",
            "Oracle JD Edwards",
            "Oracle PeopleSoft",
            "NetSuite"
          ]
        }
      ]
    },
    {
      name: "CRM",
      children: [
        {
          name: "Salesforce",
          members: [
            "Salesforce Sales Cloud",
            "Salesforce Service Cloud",
            "Salesforce Marketing Cloud",
            "Salesforce Platform"
          ]
        },
        {
          name: "Microsoft",
          members: [
            "Microsoft Dynamics CRM",
            "Microsoft Dynamics 365 Customer Engagement"
          ]
        },
        {
          name: "Other CRM",
          members: [
            "HubSpot",
            "Zoho CRM",
            "Oracle CRM",
            "SAP CRM",
            "SugarCRM",
            "Pipedrive"
          ]
        }
      ]
    },
    {
      name: "Development Tools",
      children: [
        {
          name: "IDEs",
          members: [
            "Visual Studio",
            "Visual Studio Code",
            "IntelliJ IDEA",
            "PyCharm",
            "Eclipse",
            "Android Studio",
            "Xcode",
            "WebStorm",
            "Atom",
            "Sublime Text"
          ]
        },
        {
          name: "Version Control",
          members: [
            "Git",
            "GitHub Desktop",
            "GitLab",
            "Bitbucket",
            "SVN",
            "Perforce",
            "TFS"
          ]
        },
        {
          name: "Collaboration",
          members: [
            "Confluence",
            "Jira",
            "GitHub",
            "GitLab",
            "Azure DevOps",
            "Slack",
            "Microsoft Teams"
          ]
        }
      ]
    }
  ]
};

export default groupDefinitions;