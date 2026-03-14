const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, query, where, getDocs } = require('firebase/firestore');

// Check if environment variables are available
console.log('🔧 Environment Check:');
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
    if (!process.env[varName]) {
        missingVars.push(varName);
    }
});

if (missingVars.length > 0) {
    console.log(`❌ Missing environment variables: ${missingVars.join(', ')}`);
    console.log('Please ensure your environment variables are set correctly.');
    console.log('You can set them in your .env file or export them in your terminal.');
    process.exit(1);
}

// Firebase config
const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Test data for properties
const testProperties = [
    {
        name: "Downtown Luxury Apartment",
        address: "123 Main St, Downtown",
        price: "$450,000",
        type: "Apartment",
        bedrooms: 2,
        bathrooms: 2,
        area: 1200,
        image: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?q=60&w=640&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        agent: {
            name: "John Smith",
            email: "john@example.com",
            avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=60&w=640&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
        },
        facilities: ["Wifi", "Gym", "Pool"],
        description: "Beautiful luxury apartment in the heart of downtown",
        reviews: [],
        gallery: [],
        createdAt: new Date(),
        sold: false
    },
    {
        name: "Suburban Family House",
        address: "456 Oak Ave, Suburbs",
        price: "$650,000",
        type: "House",
        bedrooms: 4,
        bathrooms: 3,
        area: 2500,
        image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=60&w=640&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        agent: {
            name: "Sarah Johnson",
            email: "sarah@example.com",
            avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?q=60&w=640&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
        },
        facilities: ["Garden", "Garage", "Wifi"],
        description: "Perfect family home in quiet suburban neighborhood",
        reviews: [],
        gallery: [],
        createdAt: new Date(),
        sold: false
    },
    {
        name: "Beachfront Condo",
        address: "789 Beach Blvd, Coastal Area",
        price: "$850,000",
        type: "Condos",
        bedrooms: 3,
        bathrooms: 2,
        area: 1800,
        image: "https://images.unsplash.com/photo-1600585153490-76fb20a32601?q=60&w=640&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        agent: {
            name: "Mike Wilson",
            email: "mike@example.com",
            avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=60&w=640&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
        },
        facilities: ["Beach Access", "Pool", "Gym"],
        description: "Stunning beachfront condo with ocean views",
        reviews: [],
        gallery: [],
        createdAt: new Date(),
        sold: false
    }
];

// Test saved searches
const testSavedSearches = [
    {
        userId: "test-user-1",
        name: "Downtown Apartments",
        criteria: {
            location: "Downtown",
            propertyType: "Apartment",
            minPrice: 400000,
            maxPrice: 500000
        },
        isActive: true,
        lastChecked: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
    },
    {
        userId: "test-user-2",
        name: "Family Homes",
        criteria: {
            propertyType: "House",
            bedrooms: 3,
            minPrice: 500000,
            maxPrice: 700000
        },
        isActive: true,
        lastChecked: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
    },
    {
        userId: "test-user-3",
        name: "Beach Properties",
        criteria: {
            location: "Beach",
            propertyType: "Condos",
            minPrice: 800000
        },
        isActive: true,
        lastChecked: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
    }
];

async function addTestData() {
    try {
        console.log('🚀 Starting test data setup...');

        // Add test properties
        console.log('📝 Adding test properties...');
        for (const property of testProperties) {
            const docRef = await addDoc(collection(db, 'properties'), property);
            console.log(`✅ Added property: ${property.name} (ID: ${docRef.id})`);
        }

        // Add test saved searches
        console.log('🔍 Adding test saved searches...');
        for (const search of testSavedSearches) {
            const docRef = await addDoc(collection(db, 'savedSearches'), search);
            console.log(`✅ Added saved search: ${search.name} (ID: ${docRef.id})`);
        }

        console.log('🎉 Test data setup completed successfully!');
        console.log('\n📊 Summary:');
        console.log(`- Added ${testProperties.length} properties`);
        console.log(`- Added ${testSavedSearches.length} saved searches`);
        console.log('\n🔔 Next steps:');
        console.log('1. Run the app and log in as a test user');
        console.log('2. The notification service will automatically check for matches');
        console.log('3. Users should receive notifications for matching properties');

    } catch (error) {
        console.error('❌ Error setting up test data:', error);
    }
}

async function checkExistingData() {
    try {
        console.log('🔍 Checking existing data...');

        // Check properties
        const propertiesSnapshot = await getDocs(collection(db, 'properties'));
        console.log(`📊 Found ${propertiesSnapshot.size} existing properties`);

        // Check saved searches
        const searchesSnapshot = await getDocs(collection(db, 'savedSearches'));
        console.log(`🔍 Found ${searchesSnapshot.size} existing saved searches`);

        // Check notifications
        const notificationsSnapshot = await getDocs(collection(db, 'notifications'));
        console.log(`🔔 Found ${notificationsSnapshot.size} existing notifications`);

    } catch (error) {
        console.error('❌ Error checking existing data:', error);
    }
}

// Main execution
async function main() {
    console.log('🧪 Save Search Test Script');
    console.log('========================\n');

    await checkExistingData();
    console.log('\n');

    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question('Do you want to add test data? (y/n): ', async (answer) => {
        if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
            await addTestData();
        } else {
            console.log('Skipping test data addition.');
        }
        rl.close();
    });
}

// Run the script
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { addTestData, checkExistingData }; 