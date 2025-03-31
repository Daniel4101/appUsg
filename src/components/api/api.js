/**
 * IS Charges OData Service Architecture
 * ===================================
 * 
 * 1. Service Architecture Overview
 * -------------------------------
 * - OData v4.0 compliant service
 * - Entity-based architecture with multiple service endpoints
 * - Role-based authorization with granular permissions
 * - API key authentication
 */

// Base Configuration
const serviceConfig = {
  baseUrl: {
    production: 'https://api.ischarges.abb.com/odata/integration',
    test: 'https://test.api.ischarges.abb.com/odata/integration'
  },
  version: '1.0',
  pageSize: 10000
};

/**
 * 2. Entity Service Layer
 * ----------------------
 * Abstract base class for all entity services
 */
class BaseEntityService {
  /**
   * @param {string} entityName - The name of the OData entity.
   * @param {string} [apiKey=''] - The API key used for authentication.
   */
  constructor(entityName, apiKey = '') {
    this.entityName = entityName;
    this.baseUrl = serviceConfig.baseUrl.production;
    this.apiKey = '2EF8C5D9-FECD-45B4-994D-C72FEF9B66D1';
  }

  /**
   * Build the query URL using URLSearchParams for proper encoding.
   *
   * @param {object} params - Query parameters (select, filter, orderby, top, skip, count).
   * @returns {string} - The complete URL with query string.
   */
  buildQueryUrl(params = {}) {
    const { select, filter, orderby, top, skip, count = true } = params;
    const queryParams = new URLSearchParams();

    if (select) queryParams.set('$select', select);
    if (filter) queryParams.set('$filter', filter);
    if (orderby) queryParams.set('$orderby', orderby);
    if (top) queryParams.set('$top', top);
    if (skip) queryParams.set('$skip', skip);
    if (count) queryParams.set('$count', 'true');

    return `${this.baseUrl}/${this.entityName}?${queryParams.toString()}`;
  }

  /**
   * Fetch data from the service using built query parameters.
   *
   * @param {object} params - The query parameters.
   * @returns {Promise<object>} - The JSON response from the API.
   */
  async getData(params = {}) {
    const url = this.buildQueryUrl(params);
    return await this.makeRequest(url);
  }

  /**
   * Make an HTTP GET request using fetch.
   *
   * @param {string} url - The URL to request.
   * @returns {Promise<object>} - The JSON response.
   * @throws {ODataError} - When the response is not OK.
   */
  async makeRequest(url) {
    try {
      const response = await fetch(url, {
        headers: this.getHeaders(this.apiKey)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new ODataError(
          errorData.error?.message || 'Request failed',
          response.status,
          errorData.error?.code || 'REQUEST_FAILED'
        );
      }
      return await response.json();
    } catch (error) {
      if (error instanceof ODataError) {
        throw error;
      }
      throw new ODataError(
        error.message,
        error.statusCode || 500,
        error.errorCode || 'UNKNOWN_ERROR'
      );
    }
  }

  /**
   * Build the headers for the API request.
   *
   * @param {string} apiKey - The API key for authentication.
   * @returns {object} - The headers object.
   */
  getHeaders(apiKey) {
    return {
      'X-API-KEY': apiKey,
      'Accept': 'application/json'
    };
  }
}

/**
 * 3. Permission Management
 * -----------------------
 */
class PermissionManager {
  constructor() {
    this.permissionAttributes = [
      'Folder',
      'RevenueStream',
      'Country',
      'Company',
      'Business'
    ];
  }

  /**
   * Build an OData-compatible permission filter.
   *
   * @param {object} permissions - Permission attributes (e.g., folder, country).
   * @returns {string} - The combined filter string.
   */
  buildPermissionFilter(permissions) {
    const filters = [];

    if (permissions.folder) {
      filters.push(`folder eq '${permissions.folder}'`);
    }
    if (permissions.country) {
      filters.push(`country eq '${permissions.country}'`);
    }
    // Add other permission attributes as needed...

    return filters.join(' and ');
  }
}

/**
 * 4. Specific Entity Services
 * --------------------------
 */
class ISUserService extends BaseEntityService {
  /**
   * @param {string} apiKey - The API key for authentication.
   */
  constructor(apiKey) {
    super('isuser', apiKey);
  }

  // Specialized method for IS User data
  async getUsersByCountry(country) {
    return await this.getData({
      filter: `country eq '${country}'`,
      orderby: 'modifiedDate desc'
    });
  }
}

class ITSCloudService extends BaseEntityService {
  /**
   * @param {string} apiKey - The API key for authentication.
   */
  constructor(apiKey) {
    super('its_cloud', apiKey);
  }

  // Specialized method for cloud service data
  async getMonthlyUsage(month) {
    return await this.getData({
      filter: `reportingMonth eq '${month}'`,
      orderby: 'modifiedDate desc'
    });
  }
}

/**
 * 5. Security Implementation
 * ------------------------
 */
const securityConfig = {
  auth: {
    headerName: 'X-API-KEY',
    keyRotationDays: 90
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100
  },
  ssl: {
    required: true,
    minVersion: 'TLSv1.2'
  }
};

/**
 * 6. Error Handling
 * ----------------
 */
class ODataError extends Error {
  /**
   * @param {string} message - Error message.
   * @param {number} statusCode - HTTP status code.
   * @param {string} errorCode - Application-specific error code.
   */
  constructor(message, statusCode, errorCode) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }

  /**
   * Log and return a standardized error response.
   *
   * @param {ODataError} error - The error instance.
   * @returns {object} - The standardized error response.
   */
  static handleError(error) {
    console.error({
      message: error.message,
      statusCode: error.statusCode,
      errorCode: error.errorCode,
      timestamp: new Date().toISOString()
    });

    return {
      error: {
        code: error.errorCode,
        message: error.message,
        details: error.details
      },
      timestamp: new Date().toISOString()
    };
  }
}

// services/chargesService.js
class ChargesDataService extends BaseEntityService {
  /**
   * @param {string} entityType - The entity name for charges data.
   * @param {string} apiKey - The API key for authentication.
   */
  constructor(entityType, apiKey) {
    super(entityType, apiKey);
    this.permissionManager = new PermissionManager();
  }

  async fetchApplicationUsage(params = {}) {
    try {
      const queryParams = {
        select: 'reportingMonth,application,email,firstName,lastName,businessArea,lastAccess,accessCount',
        orderby: 'modifiedDate desc',
        ...params
      };

      const response = await this.getData(queryParams);
      return response;
    } catch (error) {
      throw new ODataError('Failed to fetch application usage', 500, 'FETCH_ERROR');
    }
  }

  async getLatestByMonth(month) {
    try {
      return await this.getData({
        filter: `reportingMonth eq '${month}'`,
        orderby: 'modifiedDate desc'
      });
    } catch (error) {
      throw new ODataError('Failed to fetch month data', 500, 'MONTH_FETCH_ERROR');
    }
  }

  // Helper method to build filters for queries
  buildFilters(filters = {}) {
    const filterParts = [];

    if (filters.businessArea) {
      filterParts.push(`businessArea eq '${filters.businessArea}'`);
    }
    if (filters.application) {
      filterParts.push(`application eq '${filters.application}'`);
    }
    if (filters.email) {
      filterParts.push(`contains(email, '${filters.email}')`);
    }

    return filterParts.join(' and ');
  }
}

// Example usage in a React component (commented out)
// import { useState, useEffect } from 'react';
// const ApplicationUsage = () => {
//   const [data, setData] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);

//   // Initialize services with your API key
//   const apiKey = 'YOUR_API_KEY';
//   const cloudService = new ChargesDataService('cloudEntity', apiKey);

//   useEffect(() => {
//     const fetchData = async () => {
//       setLoading(true);
//       try {
//         // Example: Fetch cloud service usage with filters
//         const cloudData = await cloudService.fetchApplicationUsage({
//           filter: cloudService.buildFilters({
//             businessArea: 'IT',
//             application: 'Microsoft Teams'
//           }),
//           top: 100
//         });

//         // Process the data
//         const processedData = processODataResponse(cloudData);
//         setData(processedData);
//       } catch (error) {
//         setError(error.message);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchData();
//   }, []);

//   // Helper to process OData response
//   const processODataResponse = (response) => {
//     if (!response || !response.value) {
//       throw new Error('Invalid response format');
//     }

//     return {
//       applications: _.groupBy(response.value, 'application'),
//       businessAreas: _.groupBy(response.value, 'businessArea'),
//       totalRecords: response['@odata.count']
//     };
//   };

//   if (loading) return <div>Loading...</div>;
//   if (error) return <div>Error: {error}</div>;
//   if (!data) return <div>No data available</div>;

//   return (
//     // Your existing dashboard UI
//   );
// };

export default ChargesDataService;
