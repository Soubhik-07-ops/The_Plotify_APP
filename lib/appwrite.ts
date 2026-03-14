import {
  Client,
  Account,
  ID,
  Databases,
  OAuthProvider,
  Avatars,
  Query,
  Storage,
} from "react-native-appwrite";
import * as Linking from "expo-linking";
import { openAuthSessionAsync } from "expo-web-browser";

export const config = {
  platform: "com.jsm.restate",
  endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1",
  projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || "demo-project",
  databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID || "demo-database",
  galleriesCollectionId:
    process.env.EXPO_PUBLIC_APPWRITE_GALLERIES_COLLECTION_ID || "demo-galleries",
  reviewsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_REVIEWS_COLLECTION_ID || "demo-reviews",
  agentsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_AGENTS_COLLECTION_ID || "demo-agents",
  propertiesCollectionId:
    process.env.EXPO_PUBLIC_APPWRITE_PROPERTIES_COLLECTION_ID || "demo-properties",
  bucketId: process.env.EXPO_PUBLIC_APPWRITE_BUCKET_ID || "demo-bucket",
};

export const client = new Client();

// Only initialize client if we have valid configuration
if (config.endpoint && config.projectId) {
  try {
    client
      .setEndpoint(config.endpoint)
      .setProject(config.projectId)
      .setPlatform(config.platform);
  } catch (error) {
    console.warn("Failed to initialize Appwrite client:", error);
  }
}

export const avatar = new Avatars(client);
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

// Add a simple state to track if user is logged in
let isUserLoggedIn = false;

// Mock properties storage
let mockProperties = [
  {
    $id: "1",
    name: "Modern Downtown Apartment",
    address: "123 Main St, Downtown",
    price: "2,500",
    rating: 4.8,
    type: "Apartment",
    bedrooms: 2,
    bathrooms: 2,
    area: 1200,
    image: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400&h=300&fit=crop",
    agent: {
      name: "Sarah Johnson",
      email: "sarah.johnson@realestate.com",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face"
    },
    facilities: ["Wifi", "Gym", "Swimming pool", "Car Parking"],
    description: "Beautiful modern apartment in the heart of downtown with stunning city views.",
    reviews: [
      {
        $id: "review1",
        rating: 5,
        comment: "Amazing place! Highly recommended.",
        user: {
          name: "Mike Smith",
          avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
        }
      }
    ],
    gallery: [
      {
        $id: "gallery1",
        image: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400&h=300&fit=crop"
      },
      {
        $id: "gallery2", 
        image: "https://images.unsplash.com/photo-1600585153490-76fb20a32601?w=400&h=300&fit=crop"
      }
    ]
  },
  {
    $id: "2",
    name: "Luxury Villa with Pool",
    address: "456 Oak Ave, Suburbs",
    price: "5,200",
    rating: 4.9,
    type: "Villa",
    bedrooms: 4,
    bathrooms: 3,
    area: 2800,
    image: "https://images.unsplash.com/photo-1600585153490-76fb20a32601?w=400&h=300&fit=crop",
    agent: {
      name: "David Wilson",
      email: "david.wilson@realestate.com",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
    },
    facilities: ["Swimming pool", "Gym", "Wifi", "Laundry"],
    description: "Stunning luxury villa with private pool and beautiful garden.",
    reviews: [
      {
        $id: "review2",
        rating: 5,
        comment: "Perfect family home with amazing amenities.",
        user: {
          name: "Lisa Brown",
          avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face"
        }
      }
    ],
    gallery: [
      {
        $id: "gallery3",
        image: "https://images.unsplash.com/photo-1600585153490-76fb20a32601?w=400&h=300&fit=crop"
      },
      {
        $id: "gallery4",
        image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop"
      }
    ]
  },
  {
    $id: "3",
    name: "Cozy Studio in City Center",
    address: "789 Pine St, City Center",
    price: "1,800",
    rating: 4.5,
    type: "Studio",
    bedrooms: 1,
    bathrooms: 1,
    area: 650,
    image: "https://images.unsplash.com/photo-1560185009-dddeb820c7b7?w=400&h=300&fit=crop",
    agent: {
      name: "Emma Davis",
      email: "emma.davis@realestate.com",
      avatar: "https://images.unsplash.com/photo-1544723495-432537d12f6c?w=150&h=150&fit=crop&crop=face"
    },
    facilities: ["Wifi", "Laundry"],
    description: "Perfect studio apartment for young professionals in the city center.",
    reviews: [
      {
        $id: "review3",
        rating: 4,
        comment: "Great location and good value for money.",
        user: {
          name: "Alex Chen",
          avatar: "https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=150&h=150&fit=crop&crop=face"
        }
      }
    ],
    gallery: [
      {
        $id: "gallery5",
        image: "https://images.unsplash.com/photo-1560185009-dddeb820c7b7?w=400&h=300&fit=crop"
      },
      {
        $id: "gallery6",
        image: "https://images.unsplash.com/photo-1605276373954-0c4a0dac5b12?w=400&h=300&fit=crop"
      }
    ]
  }
];

export async function login() {
  try {
    // For demo purposes, bypass actual Google authentication
    console.log("Demo mode: Bypassing Google authentication");
    isUserLoggedIn = true; // Set user as logged in
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

export async function logout() {
  try {
    isUserLoggedIn = false; // Set user as logged out
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

export async function getCurrentUser() {
  try {
    // For demo purposes, return mock user only if logged in
    if (!isUserLoggedIn) {
      console.log("Demo mode: User not logged in");
      return null;
    }
    
    console.log("Demo mode: Returning mock user");
    return {
      $id: "demo-user-id",
      name: "John Doe",
      email: "john.doe@example.com",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    };
  } catch (error) {
    console.log(error);
    return null;
  }
}

export async function getLatestProperties() {
  try {
    // For demo purposes, return mock properties
    console.log("Demo mode: Returning mock latest properties");
    return mockProperties.slice(0, 3); // Return first 3 properties as featured
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function getProperties({
  filter,
  query,
  limit,
}: {
  filter: string;
  query: string;
  limit?: number;
}) {
  try {
    // For demo purposes, return mock properties
    console.log("Demo mode: Returning mock properties");
    
    // Filter by type if specified
    let filteredProperties = mockProperties;
    if (filter && filter !== "All") {
      filteredProperties = mockProperties.filter(property => property.type === filter);
    }

    // Search by query if specified
    if (query) {
      const searchTerm = query.toLowerCase();
      filteredProperties = filteredProperties.filter(property => 
        property.name.toLowerCase().includes(searchTerm) ||
        property.address.toLowerCase().includes(searchTerm) ||
        property.type.toLowerCase().includes(searchTerm)
      );
    }

    // Apply limit if specified
    if (limit) {
      filteredProperties = filteredProperties.slice(0, limit);
    }

    return filteredProperties;
  } catch (error) {
    console.error(error);
    return [];
  }
}

// write function to get property by id
export async function getPropertyById({ id }: { id: string }) {
  try {
    // For demo purposes, return mock property based on ID
    console.log("Demo mode: Returning mock property by ID:", id);
    
    const property = mockProperties.find(p => p.$id === id);
    return property || null;
  } catch (error) {
    console.error(error);
    return null;
  }
}

// Add new property function
export async function addProperty(propertyData: any) {
  try {
    console.log("Demo mode: Adding new property");
    const newProperty = {
      $id: (mockProperties.length + 1).toString(),
      ...propertyData,
      $createdAt: new Date(),
      $updatedAt: new Date(),
      $collectionId: "properties",
      $databaseId: "demo-database",
      $permissions: []
    };
    
    mockProperties.unshift(newProperty); // Add to beginning of array
    console.log("Demo mode: Property added successfully");
    return newProperty;
  } catch (error) {
    console.error("Demo mode: Error adding property:", error);
    throw error;
  }
}
