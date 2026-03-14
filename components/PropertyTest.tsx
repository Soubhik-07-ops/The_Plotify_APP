import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  runPropertyTests,
  testPropertyCount,
  testPropertyTypes,
  testPropertyPriceRange,
  testAddProperty,
  testGetProperties,
  propertyLogger,
  testRegisterAndSignInUser
} from '@/lib/test-utils';

const PropertyTest = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);

  const runFullTest = async () => {
    setIsRunning(true);
    setLogs([]);

    try {
      await runPropertyTests();
      setLogs(propertyLogger.getLogs());
      Alert.alert('Success', 'All tests completed successfully!');
    } catch (error) {
      Alert.alert('Error', 'Some tests failed. Check console for details.');
    } finally {
      setIsRunning(false);
    }
  };

  const runIndividualTests = async () => {
    setIsRunning(true);
    setLogs([]);

    try {
      console.log('\n🧪 RUNNING INDIVIDUAL TESTS');
      console.log('=============================\n');

      // Test 1: Count properties
      await testPropertyCount();

      // Test 2: Get property types
      await testPropertyTypes();

      // Test 3: Get price range
      await testPropertyPriceRange();

      // Test 4: Add a property
      await testAddProperty({
        name: "Test Property - " + new Date().toLocaleTimeString(),
        address: "456 Test Avenue, Test City",
        price: "4,200",
        rating: 4.7,
        type: "House",
        bedrooms: 3,
        bathrooms: 2,
        area: 1800,
        image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop",
        agent: {
          name: "Test Agent",
          email: "test@realestate.com",
          avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
        },
        facilities: ["Garden", "Car Parking", "Wifi"],
        description: "This is a test property for individual testing.",
        reviews: [],
        gallery: [
          {
            id: "test-gallery-2",
            image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop"
          }
        ]
      });

      // Test 5: Get filtered properties
      await testGetProperties('Apartment');

      // Test 6: Get searched properties
      await testGetProperties(undefined, 'Downtown');

      setLogs(propertyLogger.getLogs());
      Alert.alert('Success', 'Individual tests completed!');
    } catch (error) {
      Alert.alert('Error', 'Some tests failed. Check console for details.');
    } finally {
      setIsRunning(false);
    }
  };

  const runAuthTest = async () => {
    setIsRunning(true);
    setLogs([]);
    const testEmail = `testuser_${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    try {
      const result = await testRegisterAndSignInUser(testEmail, testPassword);
      setLogs(propertyLogger.getLogs());
      if (result) {
        Alert.alert('Success', 'User registration and sign-in test passed!');
      } else {
        Alert.alert('Failure', 'User registration and sign-in test failed.');
      }
    } catch (error) {
      Alert.alert('Error', 'Test failed. Check logs for details.');
    } finally {
      setIsRunning(false);
    }
  };

  const runAddPropertyTest = async () => {
    setIsRunning(true);
    setLogs([]);
    try {
      await testAddProperty({
        name: "Manual Test Property - " + new Date().toLocaleTimeString(),
        address: "789 Debug Avenue, Debug City",
        price: "5,000",
        rating: 4.9,
        type: "Villa",
        bedrooms: 4,
        bathrooms: 3,
        area: 2500,
        image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400&h=300&fit=crop",
        agent: {
          name: "Debug Agent",
          email: "debug@realestate.com",
          avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
        },
        facilities: ["Wifi", "Garden"],
        description: "This is a debug property for testing add functionality.",
        reviews: [],
        gallery: [
          {
            id: "debug-gallery-1",
            image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400&h=300&fit=crop"
          }
        ]
      });
      setLogs(propertyLogger.getLogs());
      Alert.alert('Success', 'Add Property test completed!');
    } catch (error) {
      setLogs(propertyLogger.getLogs());
      Alert.alert('Error', 'Add Property test failed. Check logs for details.');
    } finally {
      setIsRunning(false);
    }
  };

  const clearLogs = () => {
    propertyLogger.clearLogs();
    setLogs([]);
  };

  const showSummary = () => {
    propertyLogger.printSummary();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.title}>Property Test Suite</Text>
        <Text style={styles.subtitle}>Test your property operations step by step</Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={runFullTest}
            disabled={isRunning}
          >
            <Text style={styles.buttonText}>
              {isRunning ? 'Running Tests...' : 'Run Full Test Suite'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={runIndividualTests}
            disabled={isRunning}
          >
            <Text style={styles.buttonText}>
              {isRunning ? 'Running...' : 'Run Individual Tests'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.infoButton]}
            onPress={runAddPropertyTest}
            disabled={isRunning}
          >
            <Text style={styles.buttonText}>
              {isRunning ? 'Running...' : 'Test Add Property Only'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={runAuthTest}
            disabled={isRunning}
          >
            <Text style={styles.buttonText}>
              {isRunning ? 'Running...' : 'Test User Registration & Sign-In'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.clearButton]}
            onPress={clearLogs}
            disabled={isRunning}
          >
            <Text style={styles.buttonText}>Clear Logs</Text>
          </TouchableOpacity>
        </View>

        {logs.length > 0 && (
          <View style={styles.logsContainer}>
            <Text style={styles.logsTitle}>Test Logs ({logs.length} entries)</Text>
            {logs.map((log, index) => (
              <View key={index} style={styles.logEntry}>
                <Text style={styles.logTimestamp}>
                  {new Date(log.timestamp).toLocaleTimeString()}
                </Text>
                <Text style={[
                  styles.logOperation,
                  log.success ? styles.successText : styles.errorText
                ]}>
                  {log.success ? '✅' : '❌'} {log.operation}
                </Text>
                <Text style={styles.logDetails}>
                  {JSON.stringify(log.details, null, 2)}
                </Text>
                {log.error && (
                  <Text style={styles.errorText}>Error: {log.error}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>How to Use:</Text>
          <Text style={styles.instructionText}>
            1. Press &quot;Run Full Test Suite&quot; to run all tests at once
          </Text>
          <Text style={styles.instructionText}>
            2. Press &quot;Run Individual Tests&quot; to run tests one by one
          </Text>
          <Text style={styles.instructionText}>
            3. Check the console for detailed step-by-step logs
          </Text>
          <Text style={styles.instructionText}>
            4. Use &quot;Show Summary&quot; to see operation statistics
          </Text>
          <Text style={styles.instructionText}>
            5. Use &quot;Clear Logs&quot; to reset the test logs
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  buttonContainer: {
    gap: 15,
    marginBottom: 30,
  },
  button: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#34C759',
  },
  infoButton: {
    backgroundColor: '#FF9500',
  },
  clearButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  logsContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  logsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  logEntry: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 10,
  },
  logTimestamp: {
    fontSize: 12,
    color: '#999',
    marginBottom: 5,
  },
  logOperation: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
  },
  logDetails: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  successText: {
    color: '#34C759',
  },
  errorText: {
    color: '#FF3B30',
  },
  instructions: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
});

export default PropertyTest; 