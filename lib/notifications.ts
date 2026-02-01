import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getProperties } from './supabase-db';
import {
  getUserSavedSearches,
  updateSavedSearchLastChecked,
  saveSearch as saveSearchToDb,
  createNotification,
  getUserNotifications as getUserNotificationsFromDb,
  markNotificationAsRead as markNotificationAsReadInDb,
  deleteNotification as deleteNotificationInDb,
  type SavedSearch as SavedSearchType,
  type NotificationData as NotificationDataType
} from './supabase-db';
import { formatPriceINR } from './formatters';
import { supabase } from './supabase';

// Check if running in Expo Go (notifications not supported)
const isExpoGo = Constants.executionEnvironment === 'storeClient';

// Lazy load notifications to avoid errors in Expo Go
let Notifications: any = null;
let Device: any = null;

// Function to safely load notification modules
const loadNotificationModules = () => {
  if (isExpoGo) return false;
  if (Notifications && Device) return true;

  try {
    Notifications = require('expo-notifications');
    Device = require('expo-device');

    // Configure notification behavior only if not in Expo Go
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
    return true;
  } catch (error) {
    console.warn('Failed to load notifications module:', error);
    return false;
  }
};

export interface NotificationPreferences {
  newProperties: boolean;
  priceDrops: boolean;
  openHouses: boolean;
  marketUpdates: boolean;
  agentMessages: boolean;
  savedSearches: boolean;
}

export interface SavedSearch {
  id?: string;
  userId: string;
  name: string;
  criteria: {
    minPrice?: number;
    maxPrice?: number;
    bedrooms?: number;
    bathrooms?: number;
    propertyType?: string;
    location?: string;
  };
  isActive: boolean;
  lastChecked: Date;
}

export interface NotificationData {
  id?: string;
  userId: string | null; // null = broadcast
  title: string;
  body: string;
  data?: any;
  type:
    | 'announcement'
    | 'property'
    | 'system'
    | 'review'
    | 'newProperty'
    | 'priceDrop'
    | 'openHouse'
    | 'marketUpdate'
    | 'agentMessage'
    | 'savedSearch'
    | string;
  read: boolean;
  createdAt: Date;
  propertyId?: string;
}

class NotificationService {
  private expoPushToken: string | null = null;
  private backgroundCheckInterval: number | null = null;
  private notificationListeners: { remove: () => void }[] = [];
  private isInitialized: boolean = false;

  // Initialize notification service
  async initialize() {
    // Prevent multiple initializations
    if (this.isInitialized) {
      return;
    }

    // Skip initialization in Expo Go (notifications not supported)
    if (isExpoGo || !loadNotificationModules()) {
      console.log('Notifications disabled: Running in Expo Go');
      this.isInitialized = true;
      return;
    }

    try {
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        this.isInitialized = true;
        return;
      }

      // Get push token
      if (Device && Device.isDevice) {
        const token = await Notifications.getExpoPushTokenAsync({
          projectId: Constants.expoConfig?.extra?.eas?.projectId,
        });
        this.expoPushToken = token.data;
        console.log('Push token:', this.expoPushToken);
      } else {
        console.log('Must use physical device for Push Notifications');
      }

      // Configure notification channels for Android
      if (Platform.OS === 'android' && Notifications) {
        Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });

        // Create specific channels for different notification types
        Notifications.setNotificationChannelAsync('new-properties', {
          name: 'New Properties',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4CAF50',
        });

        Notifications.setNotificationChannelAsync('price-drops', {
          name: 'Price Drops',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF9800',
        });

        Notifications.setNotificationChannelAsync('open-houses', {
          name: 'Open Houses',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#2196F3',
        });
      }

      // Set up notification listeners
      this.setupNotificationListeners();

      // Start background checking for saved searches
      this.startBackgroundChecking();

      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing notifications:', error);
      this.isInitialized = true;
    }
  }

  // Cleanup method to remove all listeners and intervals
  cleanup() {
    // Clear background check interval
    if (this.backgroundCheckInterval) {
      clearInterval(this.backgroundCheckInterval);
      this.backgroundCheckInterval = null;
    }

    // Remove notification listeners
    this.notificationListeners.forEach(listener => {
      try {
        listener.remove();
      } catch (error) {
        console.warn('Error removing notification listener:', error);
      }
    });
    this.notificationListeners = [];

    this.isInitialized = false;
  }

  // Start background checking for saved searches
  private startBackgroundChecking() {
    // Clear any existing interval
    if (this.backgroundCheckInterval) {
      clearInterval(this.backgroundCheckInterval);
    }

    // Check for new properties every 30 minutes
    this.backgroundCheckInterval = setInterval(async () => {
      try {
        // Get all users with saved searches
        const usersWithSearches = await this.getUsersWithSavedSearches();

        for (const userId of usersWithSearches) {
          await this.checkSavedSearches(userId);
          await this.checkPriceDrops(userId);
        }
      } catch (error) {
        console.error('Error in background checking:', error);
      }
    }, 30 * 60 * 1000); // 30 minutes
  }

  // Get users who have saved searches
  private async getUsersWithSavedSearches(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('saved_searches')
        .select('user_id')
        .eq('is_active', true);

      if (error) throw error;

      const userIds = new Set<string>();
      (data || []).forEach((item: any) => {
        if (item.user_id) {
          userIds.add(String(item.user_id));
        }
      });

      return Array.from(userIds);
    } catch (error) {
      console.error('Error getting users with saved searches:', error);
      return [];
    }
  }

  // Set up notification listeners
  private setupNotificationListeners() {
    if (isExpoGo || !loadNotificationModules()) return;

    // Remove existing listeners first
    this.notificationListeners.forEach(listener => {
      try {
        listener.remove();
      } catch (error) {
        console.warn('Error removing existing listener:', error);
      }
    });
    this.notificationListeners = [];

    // Handle notification received while app is running
    const notificationListener = Notifications.addNotificationReceivedListener((notification: any) => {
      console.log('Notification received:', notification);
    });

    // Handle notification response (user taps notification)
    const responseListener = Notifications.addNotificationResponseReceivedListener((response: any) => {
      console.log('Notification response:', response);
      this.handleNotificationResponse(response);
    });

    // Store listeners for cleanup
    this.notificationListeners.push(notificationListener, responseListener);
  }

  // Handle notification response
  private handleNotificationResponse(response: any) {
    const data = response.notification.request.content.data;

    // Navigate based on notification type
    if (data?.type === 'newProperty' && data?.propertyId) {
      // Navigate to property detail
      // You can implement navigation logic here
      console.log('Navigate to property:', data.propertyId);
    } else if (data?.type === 'openHouse' && data?.propertyId) {
      // Navigate to open house details
      console.log('Navigate to open house:', data.propertyId);
    }
  }

  // Get push token
  getPushToken(): string | null {
    return this.expoPushToken;
  }

  // Save push token to user profile
  async savePushToken(userId: string) {
    if (!this.expoPushToken) return;

    try {
      // Update user metadata in public.users table
      const { error } = await supabase
        .from('users')
        .update({
          metadata: {
            pushToken: this.expoPushToken,
            notificationPreferences: {
              newProperties: true,
              priceDrops: true,
              openHouses: true,
              marketUpdates: true,
              agentMessages: true,
              savedSearches: true,
            },
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving push token:', error);
    }
  }

  // Send local notification
  async sendLocalNotification(
    title: string,
    body: string,
    data?: any,
    channelId: string = 'default'
  ) {
    // Skip in Expo Go
    if (isExpoGo || !loadNotificationModules()) {
      console.log('Local notification skipped (Expo Go):', title);
      return;
    }

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
        },
        trigger: null, // Send immediately
      });
    } catch (error) {
      console.error('Error sending local notification:', error);
    }
  }

  // Save notification to database
  async saveNotification(notification: Omit<NotificationData, 'id' | 'createdAt'>) {
    try {
      await createNotification({
        user_id: notification.userId,
        title: notification.title,
        message: notification.body, // Map body to message
        data: {
          ...(notification.data || {}),
          ...(notification.propertyId ? { propertyId: notification.propertyId } : {}),
        },
        type: notification.type,
        is_read: notification.read, // Map read to is_read
      });
    } catch (error) {
      console.error('Error saving notification:', error);
    }
  }

  // Get user notifications
  async getUserNotifications(userId: string): Promise<NotificationData[]> {
    try {
      const notifications = await getUserNotificationsFromDb(userId);

      // Convert to NotificationData format (with createdAt as Date)
      return notifications.map((n: NotificationDataType) => ({
        id: n.id,
        userId: n.user_id,
        title: n.title,
        body: n.message, // Map message to body
        data: n.data || {},
        type: n.type,
        read: n.is_read, // Map is_read to read
        createdAt: n.created_at ? new Date(n.created_at) : new Date(),
      }));
    } catch (error) {
      console.error('Error getting user notifications:', error);
      return [];
    }
  }

  // Mark notification as read
  async markNotificationAsRead(notificationId: string) {
    try {
      await markNotificationAsReadInDb(notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  // Delete notification for the current user (user-specific: delete row; broadcast: hide via deleted_notifications)
  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    try {
      await deleteNotificationInDb(notificationId, userId);
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  // Save search criteria
  async saveSearch(userId: string, search: Omit<SavedSearch, 'id' | 'userId' | 'lastChecked'>) {
    try {
      await saveSearchToDb({
        user_id: userId,
        name: search.name,
        criteria: search.criteria,
        is_active: search.isActive,
        last_checked: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error saving search:', error);
    }
  }

  // Get user saved searches
  async getSavedSearches(userId: string, activeOnly: boolean = false): Promise<SavedSearch[]> {
    try {
      const savedSearches = await getUserSavedSearches(userId);

      // Convert to SavedSearch format
      return savedSearches.map((search: SavedSearchType) => ({
        id: search.id,
        userId: search.user_id,
        name: search.name,
        criteria: search.criteria,
        isActive: search.is_active,
        lastChecked: search.last_checked ? new Date(search.last_checked) : new Date(),
      }));
    } catch (error) {
      console.error('Error getting saved searches:', error);
      return [];
    }
  }

  // Toggle saved search active status
  async toggleSavedSearchActive(searchId: string, isActive: boolean): Promise<void> {
    try {
      const { error } = await supabase
        .from('saved_searches')
        .update({ is_active: isActive })
        .eq('id', searchId);

      if (error) throw error;
    } catch (error) {
      console.error('Error toggling saved search active status:', error);
      throw error;
    }
  }

  // Check for new properties matching saved searches
  async checkSavedSearches(userId: string) {
    try {
      const savedSearches = await this.getSavedSearches(userId, true);

      for (const search of savedSearches) {
        // Find properties that match the search criteria
        const matchingProperties = await this.findMatchingProperties(search.criteria);

        // Filter for properties created after the last check
        const newProperties = matchingProperties.filter(property => {
          const createdAt = property.created_at || property.createdAt;
          if (!createdAt) return false;
          const propertyDate = new Date(createdAt);
          const lastCheckDate = new Date(search.lastChecked);
          return propertyDate > lastCheckDate;
        });

        if (newProperties.length > 0) {
          // Create detailed notification message
          const propertyDetails = newProperties.slice(0, 3).map(p =>
            `• ${p.name} - ${formatPriceINR(p.price)}`
          ).join('\n');

          const notificationBody = newProperties.length === 1
            ? `New property found: ${newProperties[0].name} - ${formatPriceINR(newProperties[0].price)}`
            : `${newProperties.length} new properties found matching your "${search.name}" search:\n${propertyDetails}${newProperties.length > 3 ? '\n...and more!' : ''}`;

          // Send notification for new matching properties
          await this.sendLocalNotification(
            'New Properties Found! 🏠',
            notificationBody,
            {
              type: 'savedSearch',
              searchId: search.id,
              propertyCount: newProperties.length,
              properties: newProperties.map(p => ({ id: p.id, name: p.name, price: p.price }))
            },
            'new-properties'
          );

          // Save notification to database
          await this.saveNotification({
            userId,
            title: 'New Properties Found! 🏠',
            body: notificationBody,
            type: 'savedSearch',
            read: false,
            data: {
              searchId: search.id,
              propertyCount: newProperties.length,
              properties: newProperties.map(p => ({ id: p.id, name: p.name, price: p.price }))
            },
          });

          // Update the last checked time for this search
          if (search.id) {
            await updateSavedSearchLastChecked(search.id);
          }
        }
      }
    } catch (error) {
      console.error('Error checking saved searches:', error);
    }
  }

  // Check for price drops on properties matching saved searches
  async checkPriceDrops(userId: string) {
    try {
      const savedSearches = await this.getSavedSearches(userId, true);

      for (const search of savedSearches) {
        const matchingProperties = await this.findMatchingProperties(search.criteria);

        // For each matching property, check if price has dropped
        for (const property of matchingProperties) {
          // This would typically check against a price history collection
          // For now, we'll simulate price drop detection
          // In a real implementation, you'd store price history and compare
          const hasPriceDropped = await this.checkPropertyPriceDrop(property.id);

          if (hasPriceDropped) {
            await this.sendPriceDropNotification(
              userId,
              property.id!,
              hasPriceDropped.oldPrice,
              hasPriceDropped.newPrice
            );
          }
        }
      }
    } catch (error) {
      console.error('Error checking price drops:', error);
    }
  }

  // Check if a property's price has dropped (placeholder implementation)
  private async checkPropertyPriceDrop(propertyId: string | undefined): Promise<{ oldPrice: number; newPrice: number } | null> {
    // This is a placeholder - in real implementation, you'd:
    // 1. Query a price history collection
    // 2. Compare current price with previous price
    // 3. Return price drop data if detected

    // For demo purposes, return null (no price drop)
    return null;
  }

  // Find properties matching saved search criteria
  private async findMatchingProperties(criteria: any): Promise<any[]> {
    try {
      // Get all properties (we'll filter them in memory for better matching)
      const allProperties = await getProperties();

      // Filter properties based on criteria
      const matchingProperties = allProperties.filter(property => {
        // Check if property is sold - we don't want to notify about sold properties
        if (property.sold) return false;

        let matches = true;

        // Check location match (case-insensitive partial match)
        if (criteria.location && criteria.location.trim()) {
          const searchLocation = criteria.location.toLowerCase().trim();
          const propertyLocation = property.address.toLowerCase();
          const propertyName = property.name.toLowerCase();

          if (!propertyLocation.includes(searchLocation) &&
            !propertyName.includes(searchLocation)) {
            matches = false;
          }
        }

        // Check property type match
        if (criteria.propertyType && criteria.propertyType.trim()) {
          const searchType = criteria.propertyType.toLowerCase().trim();
          const propertyType = property.type.toLowerCase();

          if (searchType !== 'all' && propertyType !== searchType) {
            matches = false;
          }
        }

        // Check price range match
        if (criteria.minPrice || criteria.maxPrice) {
          const propertyPrice = parseFloat(property.price.replace(/[^0-9.]/g, ''));

          if (criteria.minPrice && propertyPrice < criteria.minPrice) {
            matches = false;
          }

          if (criteria.maxPrice && propertyPrice > criteria.maxPrice) {
            matches = false;
          }
        }

        // Check bedrooms match
        if (criteria.bedrooms && property.bedrooms < criteria.bedrooms) {
          matches = false;
        }

        // Check bathrooms match
        if (criteria.bathrooms && property.bathrooms < criteria.bathrooms) {
          matches = false;
        }

        return matches;
      });

      return matchingProperties;
    } catch (error) {
      console.error('Error finding matching properties:', error);
      return [];
    }
  }

  // Send price drop notification
  async sendPriceDropNotification(userId: string, propertyId: string, oldPrice: number, newPrice: number) {
    const priceDrop = oldPrice - newPrice;
    const percentageDrop = ((priceDrop / oldPrice) * 100).toFixed(1);

    await this.sendLocalNotification(
      'Price Drop Alert! 💰',
      `A property you're watching dropped by ${formatPriceINR(priceDrop)} (${percentageDrop}%)`,
      {
        type: 'priceDrop',
        propertyId,
        oldPrice,
        newPrice,
        priceDrop,
      },
      'price-drops'
    );

    await this.saveNotification({
      userId,
      title: 'Price Drop Alert! 💰',
      body: `A property you're watching dropped by ${formatPriceINR(priceDrop)} (${percentageDrop}%)`,
      type: 'priceDrop',
      read: false,
      propertyId,
      data: {
        oldPrice,
        newPrice,
        priceDrop,
      },
    });
  }

  // Send open house notification
  async sendOpenHouseNotification(userId: string, propertyId: string, date: Date, address: string) {
    const formattedDate = date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    await this.sendLocalNotification(
      'Open House Reminder 🏠',
      `Open house at ${address} on ${formattedDate}`,
      {
        type: 'openHouse',
        propertyId,
        date: date.toISOString(),
        address,
      },
      'open-houses'
    );

    await this.saveNotification({
      userId,
      title: 'Open House Reminder 🏠',
      body: `Open house at ${address} on ${formattedDate}`,
      type: 'openHouse',
      read: false,
      propertyId,
      data: {
        date: date.toISOString(),
        address,
      },
    });
  }

  // Send new property notification
  async sendNewPropertyNotification(userId: string, propertyId: string, propertyName: string, price: number) {
    await this.sendLocalNotification(
      'New Property Alert! 🆕',
      `${propertyName} - ${formatPriceINR(price)}`,
      {
        type: 'newProperty',
        propertyId,
        propertyName,
        price,
      },
      'new-properties'
    );

    await this.saveNotification({
      userId,
      title: 'New Property Alert! 🆕',
      body: `${propertyName} - ${formatPriceINR(price)}`,
      type: 'newProperty',
      read: false,
      propertyId,
      data: {
        propertyName,
        price,
      },
    });
  }

  // Send market update notification
  async sendMarketUpdateNotification(userId: string, update: string) {
    await this.sendLocalNotification(
      'Market Update 📊',
      update,
      {
        type: 'marketUpdate',
        update,
      },
      'default'
    );

    await this.saveNotification({
      userId,
      title: 'Market Update 📊',
      body: update,
      type: 'marketUpdate',
      read: false,
      data: { update },
    });
  }

  // Send agent message notification
  async sendAgentMessageNotification(userId: string, agentName: string, message: string) {
    await this.sendLocalNotification(
      `Message from ${agentName} 💬`,
      message.length > 50 ? message.substring(0, 50) + '...' : message,
      {
        type: 'agentMessage',
        agentName,
        message,
      },
      'default'
    );

    await this.saveNotification({
      userId,
      title: `Message from ${agentName} 💬`,
      body: message.length > 50 ? message.substring(0, 50) + '...' : message,
      type: 'agentMessage',
      read: false,
      data: {
        agentName,
        message,
      },
    });
  }

  // Manually trigger saved search checking for a user
  async triggerSavedSearchCheck(userId: string) {
    try {
      console.log('🔍 Triggering saved search check for user:', userId);
      await this.checkSavedSearches(userId);
      await this.checkPriceDrops(userId);
      console.log('✅ Saved search check completed for user:', userId);
    } catch (error) {
      console.error('Error triggering saved search check:', error);
    }
  }

  // Get saved searches count for a user
  async getSavedSearchesCount(userId: string): Promise<number> {
    try {
      const searches = await this.getSavedSearches(userId, true); // Count only active searches
      return searches.length;
    } catch (error) {
      console.error('Error getting saved searches count:', error);
      return 0;
    }
  }
}

// Create singleton instance
export const notificationService = new NotificationService(); 