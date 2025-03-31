// services/chargesService.js
class ChargesDataService extends BaseEntityService {
    constructor(entityType) {
      super(entityType);
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
  
    // Helper method to build filters
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
  
  // Example usage in React component
  const ApplicationUsage = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
  
    // Initialize services
    const cloudService = new ChargesDataService('its_cloud');
    const hostingService = new ChargesDataService('its_hosting');
  
    useEffect(() => {
      const fetchData = async () => {
        setLoading(true);
        try {
          // Example: Fetch cloud service usage with filters
          const cloudData = await cloudService.fetchApplicationUsage({
            filter: cloudService.buildFilters({
              businessArea: 'IT',
              application: 'Microsoft Teams'
            }),
            top: 100
          });
  
          // Process the data
          const processedData = processODataResponse(cloudData);
          setData(processedData);
        } catch (error) {
          setError(error.message);
        } finally {
          setLoading(false);
        }
      };
  
      fetchData();
    }, []);
  
    // Helper to process OData response
    const processODataResponse = (response) => {
      if (!response || !response.value) {
        throw new Error('Invalid response format');
      }
  
      return {
        applications: _.groupBy(response.value, 'application'),
        businessAreas: _.groupBy(response.value, 'businessArea'),
        totalRecords: response['@odata.count']
      };
    };
  
    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;
    if (!data) return <div>No data available</div>;
  
    //return (
      // Your existing dashboard UI
    //);
    
  };

  eyJraWQiOiJsX3d5cS10bExqQkhsd294MFFINXAyMkRDdExlbGlGN3lxWTVWTHZ5LWRvIiwiYWxnIjoiUlMyNTYifQ.eyJ2ZXIiOjEsImp0aSI6IkFULlkxMl9ONXFsejF5ZkdyYTJJZlE4dmJFTkVlSEtZRnZDdmVTeXJpajloQm8ub2FyMWo4MmtwelZHUVpnOEg0MTciLCJpc3MiOiJodHRwczovL3NlY3VyZS5mbGV4ZXJhLmV1L29hdXRoMi9hdXM2Ym14aXpUcE5aYW54RTQxNiIsImF1ZCI6ImFwaS5mbGV4ZXJhLmV1IiwiaWF0IjoxNzQwMzQyODM3LCJleHAiOjE3NDAzNDY0MzcsImNpZCI6IjBvYTZibjlscHV5UDZ4MndYNDE2IiwidWlkIjoiMDB1amQ1cmFzZmNMdlNyWVA0MTciLCJzY3AiOlsib2ZmbGluZV9hY2Nlc3MiXSwiYXV0aF90aW1lIjoxNzQwMzI4Mjg5LCJzdWIiOiJ1LTIwNjI5MSIsInNzb28iOltdLCJ1c2VyIjoyMDYyOTF9.cG9B6sQI36Q0UeXYC9BhNfGv0lTsuaK2U2GvyOTJCqq-yU2hgw0-1oPFDYivn9mO5XhLxZ0ylQloMH-Zz8XSWUL8YChluSiIwLRPrpk7AJDMt3sCgYG9biVatnjmgdP4NW-IxM0Uv4LpEEXh-yFe1vTy6E0po25UJ6llf2iF9QH8V2Yq8iiRrbvR4wFZbku6KzW6lzWswhOQx44dG7ErsMBN0TYz-58S1G3Rt-OlhFDzW7jsLMprMlYbSLfXG-6Hd6EmoEg9dM5K2BySlCy-HzggQMelm_Jzx7yiyARq9hNg-nC1IijRzLjdntjdHI2fMaCWvp0rYqP4L3QHijbe0w