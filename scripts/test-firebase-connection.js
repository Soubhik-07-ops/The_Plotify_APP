const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

// Load environment variables
require('dotenv').config();

console.log('🔧 Firebase Connection Test');
console.log('==========================\n');

// Check environment variables
console.log('📋 Environment Variables Check:');
const requiredVars = [
    'EXPO_PUBLIC_FIREBASE_API_KEY',
    'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
    'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'EXPO_PUBLIC_FIREBASE_APP_ID'
];

let missingVars = [];
requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
        console.log(`✅ ${varName}: ${value.substring(0, 10)}...`);
    } else {
        console.log(`❌ ${varName}: Missing`);
        missingVars.push(varName);
    }
});

if (missingVars.length > 0) {
    console.log(`\n❌ Missing environment variables: ${missingVars.join(', ')}`);
    console.log('Please check your .env file or environment configuration.');
    process.exit(1);
}

console.log('\n✅ All environment variables are set');

// Firebase config
const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

console.log('\n🔥 Firebase Configuration:');
console.log(`Project ID: ${firebaseConfig.projectId}`);
console.log(`Auth Domain: ${firebaseConfig.authDomain}`);

try {
    console.log('\n🚀 Initializing Firebase...');
    const app = initializeApp(firebaseConfig);
    console.log('✅ Firebase app initialized successfully');

    console.log('\n📊 Testing Firestore connection...');
    const db = getFirestore(app);
    console.log('✅ Firestore instance created');

    // Test a simple query
    console.log('\n🔍 Testing database query...');
    const testQuery = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, 'properties'));
            console.log(`✅ Query successful! Found ${querySnapshot.size} properties`);
            return true;
        } catch (error) {
            console.log('❌ Query failed:', error.message);
            console.log('Error code:', error.code);
            console.log('Error details:', error);
            return false;
        }
    };

    const success = await testQuery();

    if (success) {
        console.log('\n🎉 Firebase connection test PASSED!');
        console.log('Your Firebase configuration is working correctly.');
    } else {
        console.log('\n❌ Firebase connection test FAILED!');
        console.log('Please check your Firebase project settings and security rules.');
    }

} catch (error) {
    console.log('\n❌ Firebase initialization failed:', error.message);
    console.log('Please check your Firebase configuration.');
    process.exit(1);
} 