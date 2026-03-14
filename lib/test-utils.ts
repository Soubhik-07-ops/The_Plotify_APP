// Test utilities for tracking property operations
export interface TestLog {
  timestamp: string;
  operation: string;
  details: any;
  success: boolean;
  error?: string;
}

class PropertyTestLogger {
  private logs: TestLog[] = [];
  private isEnabled = true;

  enable() {
    this.isEnabled = true;
    console.log('🔍 Property Test Logger ENABLED');
  }

  disable() {
    this.isEnabled = false;
    console.log('🔍 Property Test Logger DISABLED');
  }

  log(operation: string, details: any, success: boolean = true, error?: string) {
    const logEntry: TestLog = {
      timestamp: new Date().toISOString(),
      operation,
      details,
      success,
      error
    };

    this.logs.push(logEntry);

    if (this.isEnabled) {
      const status = success ? '✅' : '❌';
      const errorMsg = error ? ` | Error: ${error}` : '';
      console.log(`${status} ${operation}${errorMsg}`);
      console.log('📊 Details:', details);
    }
  }

  getLogs() {
    return this.logs;
  }

  getLogsByOperation(operation: string) {
    return this.logs.filter(log => log.operation === operation);
  }

  clearLogs() {
    this.logs = [];
    console.log('🧹 Test logs cleared');
  }

  printSummary() {
    if (!this.isEnabled) return;

    console.log('\n📈 PROPERTY OPERATIONS SUMMARY');
    console.log('================================');
    
    const operationCounts = this.logs.reduce((acc, log) => {
      acc[log.operation] = (acc[log.operation] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(operationCounts).forEach(([operation, count]) => {
      console.log(`📊 ${operation}: ${count} times`);
    });

    const successCount = this.logs.filter(log => log.success).length;
    const errorCount = this.logs.filter(log => !log.success).length;
    
    console.log(`\n✅ Successful operations: ${successCount}`);
    console.log(`❌ Failed operations: ${errorCount}`);
    console.log(`📊 Total operations: ${this.logs.length}`);
  }
}

export const propertyLogger = new PropertyTestLogger();

// Enhanced property functions with logging
// NOTE: Test utils updated to use Supabase - Firebase auth functions removed
import { Property, addProperty, getProperties, getPropertyById, getLatestProperties } from './supabase-db';
import { signUp, signIn, signOut } from './supabase-auth';

export const testAddProperty = async (propertyData: Omit<Property, 'id' | 'createdAt'>) => {
  try {
    propertyLogger.log('ADD_PROPERTY_START', { 
      propertyName: propertyData.name,
      propertyType: propertyData.type,
      price: propertyData.price 
    });

    const result = await addProperty(propertyData);
    
    propertyLogger.log('ADD_PROPERTY_SUCCESS', {
      propertyId: result.id,
      propertyName: result.name
    });

    return result;
  } catch (error) {
    propertyLogger.log('ADD_PROPERTY_ERROR', { 
      propertyName: propertyData.name 
    }, false, error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
};

export const testGetProperties = async (filter?: string, searchQuery?: string, limitCount?: number) => {
  try {
    propertyLogger.log('GET_PROPERTIES_START', {
      filter,
      searchQuery,
      limitCount
    });

    const properties = await getProperties(filter, searchQuery, limitCount);
    
    propertyLogger.log('GET_PROPERTIES_SUCCESS', {
      totalProperties: properties.length,
      filter,
      searchQuery,
      limitCount,
      propertyTypes: [...new Set(properties.map(p => p.type))]
    });

    return properties;
  } catch (error) {
    propertyLogger.log('GET_PROPERTIES_ERROR', {
      filter,
      searchQuery,
      limitCount
    }, false, error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
};

export const testGetPropertyById = async (id: string) => {
  try {
    propertyLogger.log('GET_PROPERTY_BY_ID_START', { propertyId: id });

    const property = await getPropertyById(id);
    
    if (property) {
      propertyLogger.log('GET_PROPERTY_BY_ID_SUCCESS', {
        propertyId: property.id,
        propertyName: property.name,
        propertyType: property.type,
        price: property.price
      });
    } else {
      propertyLogger.log('GET_PROPERTY_BY_ID_NOT_FOUND', { propertyId: id }, false);
    }

    return property;
  } catch (error) {
    propertyLogger.log('GET_PROPERTY_BY_ID_ERROR', { propertyId: id }, false, error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
};

export const testGetLatestProperties = async () => {
  try {
    propertyLogger.log('GET_LATEST_PROPERTIES_START', {});

    const properties = await getLatestProperties();
    
    propertyLogger.log('GET_LATEST_PROPERTIES_SUCCESS', {
      totalProperties: properties.length,
      propertyNames: properties.map(p => p.name),
      propertyTypes: properties.map(p => p.type)
    });

    return properties;
  } catch (error) {
    propertyLogger.log('GET_LATEST_PROPERTIES_ERROR', {}, false, error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
};

export const testRegisterAndSignInUser = async (email: string, password: string) => {
  let createdUserId: string | null = null;
  try {
    propertyLogger.log('REGISTER_USER_START', { email });
    const user = await signUp(email, password);
    createdUserId = user.id;
    propertyLogger.log('REGISTER_USER_SUCCESS', { id: user.id, email: user.email });

    // Sign out after registration
    await signOut();

    propertyLogger.log('SIGNIN_USER_START', { email });
    const signedInUser = await signIn(email, password);
    propertyLogger.log('SIGNIN_USER_SUCCESS', { id: signedInUser.id, email: signedInUser.email });

    // Note: Supabase doesn't have a direct deleteUser function in client
    // User deletion should be handled via Supabase dashboard or admin API
    propertyLogger.log('TEST_COMPLETE', { id: signedInUser.id });

    return true;
  } catch (error: any) {
    propertyLogger.log('REGISTER_OR_SIGNIN_USER_ERROR', { email }, false, error.message);
    // Note: User cleanup would need to be done via Supabase admin API
    return false;
  }
};

// Test scenarios
export const runPropertyTests = async () => {
  console.log('\n🧪 RUNNING PROPERTY TESTS');
  console.log('==========================\n');

  propertyLogger.enable();
  propertyLogger.clearLogs();

  try {
    // Test 1: Get all properties
    console.log('\n📋 Test 1: Getting all properties');
    const allProperties = await testGetProperties();
    console.log(`Found ${allProperties.length} properties`);

    // Test 2: Get properties with filter
    console.log('\n📋 Test 2: Getting properties filtered by type');
    const apartmentProperties = await testGetProperties('Apartment');
    console.log(`Found ${apartmentProperties.length} apartment properties`);

    // Test 3: Get properties with search
    console.log('\n📋 Test 3: Getting properties with search query');
    const searchResults = await testGetProperties(undefined, 'Downtown');
    console.log(`Found ${searchResults.length} properties matching "Downtown"`);

    // Test 4: Get latest properties
    console.log('\n📋 Test 4: Getting latest properties');
    const latestProperties = await testGetLatestProperties();
    console.log(`Found ${latestProperties.length} latest properties`);

    // Test 5: Get specific property by ID
    console.log('\n📋 Test 5: Getting property by ID');
    if (allProperties.length > 0) {
      const firstProperty = await testGetPropertyById(String(allProperties[0].id!));
      console.log(`Retrieved property: ${firstProperty?.name}`);
    }

    // Test 6: Add a new property
    console.log('\n📋 Test 6: Adding a new property');
    const newProperty = await testAddProperty({
      name: "Test Property - " + new Date().toLocaleTimeString(),
      address: "123 Test Street, Test City",
      price: "3,500",
      rating: 4.5,
      type: "Apartment",
      bedrooms: 2,
      bathrooms: 2,
      area: 1200,
      image: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400&h=300&fit=crop",
      agent: {
        name: "Test Agent",
        email: "test@realestate.com",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
      },
      facilities: ["Wifi", "Gym", "Car Parking"],
      description: "This is a test property added for testing purposes.",
      reviews: [],
      gallery: [
        {
          id: "test-gallery-1",
          image: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400&h=300&fit=crop"
        }
      ]
    });
    console.log(`Added new property with ID: ${newProperty.id}`);

    // Test 7: Verify the new property was added
    console.log('\n📋 Test 7: Verifying new property was added');
    const updatedProperties = await testGetProperties();
    console.log(`Total properties after adding: ${updatedProperties.length}`);

    // Print summary
    propertyLogger.printSummary();

  } catch (error) {
    console.error('❌ Test suite failed:', error);
    propertyLogger.printSummary();
  }
};

// Individual test functions
export const testPropertyCount = async () => {
  const properties = await testGetProperties();
  console.log(`\n📊 Total properties in database: ${properties.length}`);
  return properties.length;
};

export const testPropertyTypes = async () => {
  const properties = await testGetProperties();
  const types = [...new Set(properties.map(p => p.type))];
  console.log(`\n📊 Property types available: ${types.join(', ')}`);
  return types;
};

export const testPropertyPriceRange = async () => {
  const properties = await testGetProperties();
  if (properties.length === 0) {
    console.log('\n📊 No properties found');
    return { minPrice: 0, maxPrice: 0 };
  }
  
  const prices = properties.map(p => parseInt(p.price.replace(/,/g, '')));
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  console.log(`\n📊 Price range: $${minPrice.toLocaleString()} - $${maxPrice.toLocaleString()}`);
  return { minPrice, maxPrice };
}; 