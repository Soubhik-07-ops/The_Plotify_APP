/**
 * Supabase Database Service
 * 
 * Replaces all Firestore operations with Supabase Postgres queries.
 * Uses actual Supabase schema: homes, user_favorites, user_notifications, pending_homes, contacts, etc.
 * Auth: uses custom session (supabase-auth) not Supabase Auth (auth.users).
 */

import { supabase } from './supabase';
import { getCurrentUser } from './supabase-auth';

// Database schema types (matches Supabase tables)
interface HomeRow {
  id: number; // bigint
  created_at: string;
  user_id: string | null; // uuid
  title: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  price: string | null;
  description: string | null;
  categories: string[] | null;
  images: string[] | null;
  sqft: string | null;
  bedrooms: number | null; // integer in DB
  bathrooms: number | null; // integer in DB
  archived_at: string | null;
}

// Property interface (app-facing, with compatibility fields)
export interface Property {
  id?: string | number;
  name: string; // Maps from title
  address: string; // Constructed from country, state, city
  price: string;
  rating?: number; // Not in DB, calculated from reviews if available
  type: string; // Maps from categories[0] or 'Property'
  bedrooms: number; // Not in DB, default to 0
  bathrooms: number; // Not in DB, default to 0
  area: number; // Maps from sqft (parsed)
  image: string; // Maps from images[0]
  agent: {
    name: string;
    email: string;
    avatar: string;
  }; // Not in DB, default values
  facilities: string[]; // Maps from categories
  description: string;
  reviews: Array<{
    id: string;
    rating: number;
    comment: string;
    public?: boolean;
    user: {
      name: string;
      avatar: string;
      email: string;
    };
  }>; // Not in DB, empty array
  gallery: Array<{
    id: string;
    image: string;
  }>; // Maps from images array
  created_at?: string;
  createdAt?: string | Date;
  sold?: boolean; // Maps from archived_at (if archived_at is not null, sold = true)
  owner_id?: string; // Maps from user_id
  owner?: {
    name: string;
    email: string;
    avatar?: string;
  };
}

/**
 * Helper to convert storage path to public URL
 * If the image is already a full URL, return it as-is
 * If it's a storage path, convert it to a public URL
 */
const getImageUrl = (imagePath: string | null | undefined): string => {
  if (!imagePath || imagePath.trim() === '') return '';

  // If it's already a full URL (http/https), return as-is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  // If it's a storage path, convert to public URL
  // Try KanpurRealty bucket first (most likely case)
  try {
    const { data: urlData } = supabase.storage
      .from('KanpurRealty')
      .getPublicUrl(imagePath);

    if (urlData?.publicUrl) {
      console.log('✅ Converted image path to URL:', imagePath, '→', urlData.publicUrl);
      return urlData.publicUrl;
    }
  } catch (error) {
    console.warn('⚠️ Error getting public URL from KanpurRealty:', error);
  }

  // Fallback: try with uppercase bucket name
  try {
    const { data: urlData } = supabase.storage
      .from('KANPURREALTY')
      .getPublicUrl(imagePath);

    if (urlData?.publicUrl) {
      console.log('✅ Converted image path to URL (uppercase):', imagePath, '→', urlData.publicUrl);
      return urlData.publicUrl;
    }
  } catch (error) {
    console.warn('⚠️ Error getting public URL from KANPURREALTY:', error);
  }

  // If both fail, log and return original (might be a valid external URL)
  console.warn('⚠️ Could not convert image path to URL, returning as-is:', imagePath);
  return imagePath;
};

/**
 * Convert HomeRow from database to Property for app
 */
const homeToProperty = (home: HomeRow): Property => {
  // Construct address from location fields
  const addressParts = [home.city, home.state, home.country].filter(Boolean);
  const address = addressParts.length > 0 ? addressParts.join(', ') : 'Address not specified';

  // Parse sqft to number
  const area = home.sqft ? parseInt(home.sqft.replace(/[^0-9]/g, '')) || 0 : 0;

  // Get first image and convert to full URL if needed
  const firstImage = home.images && home.images.length > 0 ? home.images[0] : '';
  const image = getImageUrl(firstImage);

  // Debug: Log image data
  if (home.images && home.images.length > 0) {
    console.log('📸 Property images from DB:', {
      count: home.images.length,
      firstImage: firstImage,
      convertedUrl: image,
      allImages: home.images.slice(0, 3), // Log first 3
    });
  } else {
    console.log('⚠️ No images found for property:', home.id, home.title);
  }

  // Convert images array to gallery format with full URLs
  const gallery = (home.images || []).map((img, idx) => ({
    id: `${idx + 1}`,
    image: getImageUrl(img),
  }));

  // Get type from categories or default
  const type = home.categories && home.categories.length > 0 ? home.categories[0] : 'Property';

  // Facilities should exclude the property type (first element) if it exists
  // This ensures facilities only contains actual facility names, not the property type
  const facilities = home.categories && home.categories.length > 1
    ? home.categories.slice(1) // Skip first element (property type)
    : home.categories && home.categories.length === 1 && home.categories[0] !== type
      ? home.categories // If only one element and it's not the type, use it
      : []; // Empty if no facilities

  // Log full home object to see what columns exist
  console.log('🏠 Property from DB - Full row keys:', Object.keys(home));
  console.log('🏠 Property from DB - Bedrooms:', home.bedrooms, 'Bathrooms:', home.bathrooms);
  console.log('🏠 Property from DB - Raw bedrooms value:', (home as any).bedrooms, 'Raw bathrooms value:', (home as any).bathrooms);

  return {
    id: home.id.toString(), // Convert bigint to string for compatibility
    name: home.title || 'Untitled Property',
    address,
    price: home.price || '0',
    type,
    bedrooms: home.bedrooms ?? 0, // Read from database, default to 0 if null
    bathrooms: home.bathrooms ?? 0, // Read from database, default to 0 if null
    area,
    image,
    agent: {
      name: 'Property Agent',
      email: 'agent@plotify.com',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    },
    facilities,
    description: home.description || '',
    reviews: [], // Not in schema
    gallery,
    created_at: home.created_at,
    createdAt: home.created_at ? new Date(home.created_at) : undefined,
    sold: home.archived_at !== null, // If archived, it's sold
    owner_id: home.user_id || undefined,
    owner: undefined,
    rating: undefined,
  };
};

/**
 * Convert Property to HomeRow for database insert/update
 */
const propertyToHome = (property: Property | any): Partial<HomeRow> => {
  // Parse address into location components (basic parsing)
  const addressParts = property.address.split(',').map((s: string) => s.trim());
  const city = addressParts[0] || null;
  const state = addressParts.length > 1 ? addressParts[1] : null;
  const country = addressParts.length > 2 ? addressParts[2] : null;

  // Convert gallery to images array
  const images = property.gallery && property.gallery.length > 0
    ? property.gallery.map((g: any) => g.image)
    : property.image ? [property.image] : [];

  // Handle both ownerId and owner_id for compatibility
  const userId = property.owner_id || property.ownerId || null;

  return {
    title: property.name,
    country,
    state,
    city,
    price: property.price,
    description: property.description,
    categories: property.facilities || [],
    images,
    sqft: property.area ? property.area.toString() : null,
    user_id: userId,
    archived_at: property.sold ? new Date().toISOString() : null,
  };
};

/**
 * Get properties with filters
 */
export const getProperties = async (
  filter?: string,
  searchQuery?: string,
  limitCount?: number,
  includeSold?: boolean
): Promise<Property[]> => {
  try {
    console.log('✅ Supabase: Getting homes with filter:', filter, 'search:', searchQuery, 'limit:', limitCount);

    let query = supabase
      .from('homes')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply category filter if provided
    if (filter && filter !== 'All') {
      query = query.contains('categories', [filter]);
    }

    // Filter out archived (sold) properties unless includeSold is true
    if (!includeSold) {
      query = query.is('archived_at', null);
    }

    // Apply limit if provided and no search query
    if (!searchQuery && limitCount) {
      query = query.limit(limitCount);
    }

    const { data, error } = await query;

    if (error) throw error;

    let properties: Property[] = (data || []).map((home: HomeRow) => homeToProperty(home));

    // Apply search filter if provided
    if (searchQuery) {
      const searchTerm = searchQuery.toLowerCase();
      properties = properties.filter(property =>
        property.name.toLowerCase().includes(searchTerm) ||
        property.address.toLowerCase().includes(searchTerm) ||
        property.type.toLowerCase().includes(searchTerm)
      );
    }

    console.log('✅ Supabase: Returning', properties.length, 'properties');
    return properties;
  } catch (error) {
    console.error('❌ Supabase: Error getting properties:', error);
    throw error;
  }
};

/**
 * Get property by ID
 * Checks both homes and pending_homes tables
 */
export const getPropertyById = async (id: string): Promise<Property | null> => {
  try {
    console.log('✅ Supabase: Getting home by ID:', id);

    // Convert string ID to number for bigint
    const homeId = parseInt(id);
    if (isNaN(homeId)) {
      console.error('Invalid property ID:', id);
      return null;
    }

    // First, try to get from homes table (approved properties)
    const { data: homeData, error: homeError } = await supabase
      .from('homes')
      .select('*')
      .eq('id', homeId)
      .single();

    if (!homeError && homeData) {
      // Debug: Log the actual database response
      console.log('📊 Raw database response for property ID', homeId, ':', JSON.stringify(homeData, null, 2));
      const property = homeToProperty(homeData as HomeRow);
      // Fetch reviews for this property
      const reviews = await getPropertyReviews(id);
      property.reviews = reviews;
      return property;
    }

    // If not found in homes, check pending_homes table
    console.log('⚠️ Property not found in homes, checking pending_homes...');
    const { data: pendingData, error: pendingError } = await supabase
      .from('pending_homes')
      .select('*')
      .eq('id', homeId)
      .single();

    if (pendingError) {
      if (pendingError.code === 'PGRST116') {
        // Not found in either table
        console.log('❌ Property not found in homes or pending_homes');
        return null;
      }
      throw pendingError;
    }

    if (!pendingData) return null;

    // Convert pending_home to Property format
    const addressParts = [pendingData.city, pendingData.state, pendingData.country].filter(Boolean);
    const address = addressParts.length > 0 ? addressParts.join(', ') : 'Address not specified';
    const area = pendingData.sqft ? parseInt(String(pendingData.sqft).replace(/[^0-9]/g, '')) || 0 : 0;

    // Get first image and convert to full URL if needed
    const firstImage = pendingData.images && pendingData.images.length > 0
      ? getImageUrl(pendingData.images[0])
      : 'https://via.placeholder.com/400x300?text=No+Image';

    // Convert images array to gallery format
    const gallery = (pendingData.images || []).map((img: string, idx: number) => ({
      id: `${idx + 1}`,
      image: getImageUrl(img),
    }));

    // Get type from categories or default
    const type = pendingData.categories && pendingData.categories.length > 0 ? pendingData.categories[0] : 'Property';

    // Facilities should exclude the property type (first element) if it exists
    const facilities = pendingData.categories && pendingData.categories.length > 1
      ? pendingData.categories.slice(1) // Skip first element (property type)
      : pendingData.categories && pendingData.categories.length === 1 && pendingData.categories[0] !== type
        ? pendingData.categories // If only one element and it's not the type, use it
        : []; // Empty if no facilities

    // Log full pendingData object to see what columns exist
    console.log('⏳ Pending property from DB - Full row keys:', Object.keys(pendingData));
    console.log('⏳ Pending property from DB - Bedrooms:', pendingData.bedrooms, 'Bathrooms:', pendingData.bathrooms);
    console.log('⏳ Pending property from DB - Raw bedrooms value:', (pendingData as any).bedrooms, 'Raw bathrooms value:', (pendingData as any).bathrooms);

    return {
      id: pendingData.id,
      name: pendingData.title || 'Untitled Property',
      address: address,
      price: String(pendingData.price || '0'),
      rating: 0,
      type,
      bedrooms: pendingData.bedrooms ?? 0, // Read from database, default to 0 if null
      bathrooms: pendingData.bathrooms ?? 0, // Read from database, default to 0 if null
      area: area,
      image: firstImage,
      agent: {
        name: 'Property Agent',
        email: 'agent@example.com',
        avatar: '',
      },
      facilities,
      description: pendingData.description || 'No description available',
      reviews: [],
      gallery: gallery,
      created_at: pendingData.created_at,
      createdAt: pendingData.created_at,
      sold: false,
      owner_id: pendingData.user_id || undefined,
    };
  } catch (error) {
    console.error('❌ Supabase: Error getting property by ID:', error);
    throw error;
  }
};

/**
 * Get latest properties
 */
export const getLatestProperties = async (): Promise<Property[]> => {
  try {
    console.log('✅ Supabase: Getting latest homes');

    const { data, error } = await supabase
      .from('homes')
      .select('*')
      .is('archived_at', null) // Only non-archived
      .order('created_at', { ascending: false })
      .limit(3);

    if (error) throw error;

    const properties: Property[] = (data || []).map((home: HomeRow) => homeToProperty(home));

    console.log('✅ Supabase: Returning', properties.length, 'latest properties');
    return properties;
  } catch (error) {
    console.error('❌ Supabase: Error getting latest properties:', error);
    throw error;
  }
};

/**
 * Add a new property
 */
export const addProperty = async (propertyData: Omit<Property, 'id' | 'created_at'>): Promise<Property> => {
  try {
    console.log('✅ Supabase: Adding home');

    const homeData = propertyToHome(propertyData as Property);

    const { data, error } = await supabase
      .from('homes')
      .insert(homeData)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create property');

    return homeToProperty(data as HomeRow);
  } catch (error) {
    console.error('❌ Supabase: Error adding property:', error);
    throw error;
  }
};

/**
 * Delete a property
 */
export const deleteProperty = async (id: string): Promise<void> => {
  try {
    console.log('✅ Supabase: Deleting home:', id);

    const homeId = parseInt(id);
    if (isNaN(homeId)) {
      throw new Error('Invalid property ID');
    }

    const { error } = await supabase
      .from('homes')
      .delete()
      .eq('id', homeId);

    if (error) throw error;
  } catch (error) {
    console.error('❌ Supabase: Error deleting property:', error);
    throw error;
  }
};

/**
 * Mark property as sold (archive it)
 */
export const markPropertyAsSold = async (
  id: string,
  owner: { name: string; email: string; avatar?: string }
): Promise<void> => {
  try {
    const homeId = parseInt(id);
    if (isNaN(homeId)) {
      throw new Error('Invalid property ID');
    }

    const { error } = await supabase
      .from('homes')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', homeId);

    if (error) throw error;
  } catch (error) {
    console.error('❌ Supabase: Error marking property as sold:', error);
    throw error;
  }
};

/**
 * Mark property as unsold (unarchive it)
 */
export const markPropertyAsUnsold = async (id: string): Promise<void> => {
  try {
    const homeId = parseInt(id);
    if (isNaN(homeId)) {
      throw new Error('Invalid property ID');
    }

    const { error } = await supabase
      .from('homes')
      .update({ archived_at: null })
      .eq('id', homeId);

    if (error) throw error;
  } catch (error) {
    console.error('❌ Supabase: Error marking property as unsold:', error);
    throw error;
  }
};

/**
 * Add review to property
 * Inserts review into property_reviews table
 */
export const addReviewToProperty = async (
  propertyId: string,
  review: {
    rating: number;
    comment: string;
    user: { name: string; avatar: string; email: string };
  }
): Promise<void> => {
  try {
    console.log('✅ Supabase: Adding review to property:', propertyId);

    // Get current user from custom auth (AsyncStorage session), not Supabase Auth
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('User must be authenticated to add a review');
    }

    // Convert propertyId to number (bigint)
    const homeId = parseInt(propertyId);
    if (isNaN(homeId)) {
      throw new Error('Invalid property ID');
    }

    // Validate rating
    if (review.rating < 1 || review.rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    // Insert review
    const { error } = await supabase
      .from('property_reviews')
      .insert({
        property_id: homeId,
        user_id: user.id,
        rating: review.rating,
        comment: review.comment,
        helpful_count: 0,
      });

    if (error) {
      console.error('❌ Supabase: Error inserting review:', error);
      throw error;
    }

    // Notify property owner about new review
    try {
      const { data: home } = await supabase
        .from('homes')
        .select('id, title, user_id')
        .eq('id', homeId)
        .single();

      if (home?.user_id && home.user_id !== user.id) {
        await createNotification({
          user_id: home.user_id,
          title: 'New review on your property ⭐',
          message: `Your property \"${home.title}\" received a new ${review.rating}-star review.`,
          type: 'review',
          data: {
            homeId: home.id,
            rating: review.rating,
          },
          is_read: false,
        });
      }
    } catch (notifyError) {
      console.error('❌ Error creating review notification:', notifyError);
    }

    console.log('✅ Review added successfully');
  } catch (error) {
    console.error('❌ Supabase: Error adding review:', error);
    throw error;
  }
};

/**
 * Approve a review
 * Note: Reviews are not in the homes table schema
 */
export const approveReview = async (propertyId: string, reviewId: string): Promise<void> => {
  try {
    // TODO: Implement if reviews table exists
    console.warn('Reviews not supported in current schema');
  } catch (error) {
    console.error('❌ Supabase: Error approving review:', error);
    throw error;
  }
};

/**
 * Get reviews for a property from property_reviews table
 */
export const getPropertyReviews = async (propertyId: string): Promise<Array<{
  id: string;
  rating: number;
  comment: string;
  public?: boolean;
  user: {
    name: string;
    avatar: string;
    email: string;
  };
  createdAt?: Date;
  helpful?: number;
}>> => {
  try {
    const homeId = parseInt(propertyId);
    if (isNaN(homeId)) {
      return [];
    }

    const { data, error } = await supabase
      .from('property_reviews')
      .select(`
        id,
        rating,
        comment,
        helpful_count,
        created_at,
        user_id
      `)
      .eq('property_id', homeId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching reviews:', error);
      return [];
    }

    // Get unique user IDs
    const userIds = [...new Set((data || []).map((r: any) => r.user_id).filter(Boolean))];

    // Fetch user profiles from public.users for all unique user IDs
    let usersById: Record<string, { id: string; name: string | null; email: string | null; avatar_url: string | null }> = {};

    if (userIds.length > 0) {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, name, email, avatar_url')
        .in('id', userIds);

      if (usersError) {
        console.error('❌ Error fetching user profiles for reviews:', usersError);
      } else if (usersData) {
        usersById = usersData.reduce((acc: typeof usersById, user: any) => {
          if (user && user.id) {
            acc[user.id] = {
              id: user.id,
              name: user.name ?? null,
              email: user.email ?? null,
              avatar_url: user.avatar_url ?? null,
            };
          }
          return acc;
        }, {} as typeof usersById);
      }
    }

    // Transform to Property.reviews format
    const reviews = (data || []).map((review: any) => {
      let userName = 'Anonymous';
      let userAvatar = '';
      let userEmail = '';

      const userProfile = review.user_id ? usersById[review.user_id] : undefined;

      if (userProfile) {
        userName =
          userProfile.name ||
          (userProfile.email ? userProfile.email.split('@')[0] : 'Anonymous');
        userAvatar = userProfile.avatar_url || '';
        userEmail = userProfile.email || '';
      } else if (review.user_id) {
        // Fallback to generic name based on user_id when profile not found
        userName = `User ${review.user_id.substring(0, 8)}`;
      }

      return {
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        public: true,
        helpful: review.helpful_count || 0,
        user: {
          name: userName,
          avatar: userAvatar,
          email: userEmail,
        },
        createdAt: review.created_at ? new Date(review.created_at) : undefined,
      };
    });

    return reviews;
  } catch (error) {
    console.error('❌ Error getting property reviews:', error);
    return [];
  }
};

/**
 * Calculate average rating from reviews
 */
export const getAverageRating = (property: Property): number => {
  if (!property.reviews || property.reviews.length === 0) return 0;
  const publicReviews = property.reviews.filter((r) => r.public !== false);
  if (publicReviews.length === 0) return 0;
  const ratings = publicReviews.map((r) => r.rating);
  return ratings.reduce((a, b) => a + b, 0) / ratings.length;
};

// User Favorites
/**
 * Get user favorites from user_favorites table
 */
export const getUserFavorites = async (userId: string): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('user_favorites')
      .select('property_id')
      .eq('user_id', userId);

    if (error) throw error;

    // Convert bigint property_id to string for compatibility
    return (data || []).map((fav: any) => fav.property_id.toString());
  } catch (error) {
    console.error('❌ Supabase: Error getting user favorites:', error);
    return [];
  }
};

/**
 * Add favorite to user_favorites table
 */
export const addUserFavorite = async (userId: string, propertyId: string): Promise<void> => {
  try {
    const homeId = parseInt(propertyId);
    if (isNaN(homeId)) {
      throw new Error('Invalid property ID');
    }

    const { error } = await supabase
      .from('user_favorites')
      .insert({
        user_id: userId,
        property_id: homeId,
      });

    if (error) {
      // Ignore duplicate key errors (already favorited)
      if (error.code !== '23505') {
        throw error;
      }
    }
  } catch (error) {
    console.error('❌ Supabase: Error adding favorite:', error);
    throw error;
  }
};

/**
 * Remove favorite from user_favorites table
 */
export const removeUserFavorite = async (userId: string, propertyId: string): Promise<void> => {
  try {
    const homeId = parseInt(propertyId);
    if (isNaN(homeId)) {
      throw new Error('Invalid property ID');
    }

    const { error } = await supabase
      .from('user_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('property_id', homeId);

    if (error) throw error;
  } catch (error) {
    console.error('❌ Supabase: Error removing favorite:', error);
    throw error;
  }
};

// Saved Searches
export interface SavedSearch {
  id?: string;
  user_id: string;
  name: string;
  criteria: {
    minPrice?: number;
    maxPrice?: number;
    bedrooms?: number;
    bathrooms?: number;
    propertyType?: string;
    location?: string;
  };
  is_active: boolean;
  last_checked?: string;
  created_at?: string;
}

/**
 * Save a search
 * Note: saved_searches table may need to be created if it doesn't exist
 */
export const saveSearch = async (search: Omit<SavedSearch, 'id' | 'created_at'>): Promise<SavedSearch> => {
  try {
    const { data, error } = await supabase
      .from('saved_searches')
      .insert({
        ...search,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ Supabase: Error saving search:', error);
    throw error;
  }
};

/**
 * Get user's saved searches
 */
export const getUserSavedSearches = async (userId: string): Promise<SavedSearch[]> => {
  try {
    const { data, error } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ Supabase: Error getting saved searches:', error);
    throw error;
  }
};

/**
 * Update saved search last checked time
 */
export const updateSavedSearchLastChecked = async (searchId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('saved_searches')
      .update({ last_checked: new Date().toISOString() })
      .eq('id', searchId);

    if (error) throw error;
  } catch (error) {
    console.error('❌ Supabase: Error updating saved search:', error);
    throw error;
  }
};

// Notifications (public.notifications table)
export interface NotificationData {
  id?: string;
  user_id: string | null; // null = broadcast
  title: string;
  message: string; // Maps to 'body' in app
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
  is_read: boolean; // Maps to 'read' in app
  created_at?: string;
}

/**
 * Create a notification
 */
export const createNotification = async (
  notification: Omit<NotificationData, 'id' | 'created_at'>
): Promise<NotificationData> => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: notification.user_id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        data: notification.data ?? {},
        is_read: notification.is_read,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ Supabase: Error creating notification:', error);
    throw error;
  }
};

/**
 * Get user notifications (excludes those in deleted_notifications for this user)
 */
export const getUserNotifications = async (userId: string): Promise<NotificationData[]> => {
  try {
    const { data: notificationsData, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .or(`user_id.eq.${userId},user_id.is.null`)
      .order('created_at', { ascending: false });

    if (notifError) throw notifError;

    const { data: deletedData, error: deletedError } = await supabase
      .from('deleted_notifications')
      .select('notification_id')
      .eq('user_id', userId);

    if (deletedError) {
      console.warn('❌ Supabase: deleted_notifications may not exist:', deletedError);
      // If table doesn't exist yet, return all notifications (no filtering)
      return (notificationsData || []).map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        title: item.title,
        message: item.message,
        data: item.data || {},
        type: item.type,
        is_read: item.is_read,
        created_at: item.created_at,
      }));
    }

    const deletedIds = new Set((deletedData || []).map((d: { notification_id: string }) => d.notification_id));
    const filtered = (notificationsData || []).filter((item: any) => !deletedIds.has(item.id));

    return filtered.map((item: any) => ({
      id: item.id,
      user_id: item.user_id,
      title: item.title,
      message: item.message,
      data: item.data || {},
      type: item.type,
      is_read: item.is_read,
      created_at: item.created_at,
    }));
  } catch (error) {
    console.error('❌ Supabase: Error getting notifications:', error);
    return [];
  }
};

/**
 * Delete a notification for the current user.
 * - User-specific (user_id = userId): delete row from notifications.
 * - Broadcast (user_id = null): insert into deleted_notifications so it's hidden for this user only.
 */
export const deleteNotification = async (notificationId: string, userId: string): Promise<void> => {
  try {
    const { data: notification, error: fetchError } = await supabase
      .from('notifications')
      .select('id, user_id')
      .eq('id', notificationId)
      .single();

    if (fetchError || !notification) {
      throw new Error('Notification not found');
    }

    if (notification.user_id === userId) {
      const { error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (deleteError) throw deleteError;
      return;
    }

    if (notification.user_id === null) {
      const { error: insertError } = await supabase
        .from('deleted_notifications')
        .upsert(
          { notification_id: notificationId, user_id: userId },
          { onConflict: 'notification_id,user_id' }
        );

      if (insertError) throw insertError;
      return;
    }

    throw new Error('You can only delete your own or broadcast notifications');
  } catch (error) {
    console.error('❌ Supabase: Error deleting notification:', error);
    throw error;
  }
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
      })
      .eq('id', notificationId);

    if (error) throw error;
  } catch (error) {
    console.error('❌ Supabase: Error marking notification as read:', error);
    throw error;
  }
};

// ==================== CONTACTS ====================
export interface ContactSubmission {
  id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  message: string;
  services: string[]; // JSONB array
  created_at?: string;
}

/**
 * Submit a contact form
 */
export const submitContact = async (contact: Omit<ContactSubmission, 'id' | 'created_at'>): Promise<ContactSubmission> => {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .insert({
        first_name: contact.first_name,
        last_name: contact.last_name,
        email: contact.email,
        phone: contact.phone,
        message: contact.message,
        services: contact.services,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ Supabase: Error submitting contact:', error);
    throw error;
  }
};

// ==================== PENDING HOMES (Property Approval Workflow) ====================
export interface PendingHome {
  id?: number;
  title: string;
  country: string;
  state: string;
  city: string;
  price: number; // numeric in DB
  sqft: number; // numeric in DB
  bedrooms?: number | null; // integer in DB
  bathrooms?: number | null; // integer in DB
  description: string;
  categories: string[];
  images: string[];
  status: 'pending' | 'approved' | 'rejected' | 'needs_revision';
  admin_notes?: string;
  user_id: string;
  created_at?: string;
  updated_at?: string;
  approved_at?: string;
  rejected_at?: string;
  rejection_reason?: string;
  rejection_category?: string;
  admin_id?: string;
}

/**
 * Submit property to pending_homes for approval
 */
export const submitPendingProperty = async (property: Omit<PendingHome, 'id' | 'created_at' | 'updated_at' | 'status'>): Promise<PendingHome> => {
  try {
    // Log what we're about to insert
    const insertData = {
      ...property,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    console.log('💾 Inserting into pending_homes:', JSON.stringify(insertData, null, 2));
    console.log('🛏️ Bedrooms in insert:', insertData.bedrooms, '🚿 Bathrooms in insert:', insertData.bathrooms);

    const { data, error } = await supabase
      .from('pending_homes')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('❌ Error inserting pending property:', error);
      throw error;
    }

    console.log('✅ Successfully inserted pending property. Returned data:', JSON.stringify(data, null, 2));
    console.log('🛏️ Bedrooms in returned data:', data?.bedrooms, '🚿 Bathrooms in returned data:', data?.bathrooms);
    return data;
  } catch (error) {
    console.error('❌ Supabase: Error submitting pending property:', error);
    throw error;
  }
};

/**
 * Get pending properties for a user
 */
export const getUserPendingProperties = async (userId: string): Promise<PendingHome[]> => {
  try {
    const { data, error } = await supabase
      .from('pending_homes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ Supabase: Error getting user pending properties:', error);
    throw error;
  }
};

/**
 * Get all pending properties (admin)
 */
export const getAllPendingProperties = async (status?: 'pending' | 'approved' | 'rejected' | 'needs_revision'): Promise<PendingHome[]> => {
  try {
    let query = supabase
      .from('pending_homes')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ Supabase: Error getting pending properties:', error);
    throw error;
  }
};

/**
 * Approve a pending property (moves to homes table)
 * adminId is optional; if not provided, admin_id will be null in pending_homes.
 */
export const approvePendingProperty = async (
  pendingId: number,
  adminId?: string
): Promise<void> => {
  try {
    // Get the pending property
    const { data: pending, error: fetchError } = await supabase
      .from('pending_homes')
      .select('*')
      .eq('id', pendingId)
      .single();

    if (fetchError) throw fetchError;
    if (!pending) throw new Error('Pending property not found');

    // Debug: Log what we fetched from pending_homes
    console.log('📋 Fetched pending property for approval:', JSON.stringify(pending, null, 2));
    console.log('🛏️ Pending property - Bedrooms:', pending.bedrooms, '🚿 Bathrooms:', pending.bathrooms);
    console.log('🛏️ Pending property - Raw bedrooms:', (pending as any).bedrooms, 'Raw bathrooms:', (pending as any).bathrooms);

    // Ensure the user exists in public.users
    if (pending.user_id) {
      try {
        // Check if user exists in public.users
        const { data: userCheck, error: userCheckError } = await supabase
          .from('users')
          .select('id, email')
          .eq('id', pending.user_id)
          .single();

        if (userCheckError || !userCheck) {
          // User doesn't exist in public.users - this should not happen with new auth system
          console.error('❌ User not found in public.users:', pending.user_id);
          throw new Error(`User not found in public.users. All users must be created via sign-up in public.users table.`);
        }
      } catch (userError: any) {
        // If we can't verify the user, throw an error
        throw new Error(`User validation failed: ${userError.message}`);
      }
    }

    // Insert into homes table
    // Ensure bedrooms/bathrooms are integers or null (not undefined)
    const bedroomsValue = pending.bedrooms != null ? Number(pending.bedrooms) : null;
    const bathroomsValue = pending.bathrooms != null ? Number(pending.bathrooms) : null;

    const homesInsertData = {
      title: pending.title,
      country: pending.country,
      state: pending.state,
      city: pending.city,
      price: pending.price.toString(),
      sqft: pending.sqft.toString(),
      bedrooms: bedroomsValue,
      bathrooms: bathroomsValue,
      description: pending.description,
      categories: pending.categories,
      images: pending.images,
      user_id: pending.user_id,
      created_at: new Date().toISOString(),
    };

    console.log('✅ Approving property - Inserting into homes:', JSON.stringify(homesInsertData, null, 2));
    console.log('🛏️ Bedrooms being copied:', homesInsertData.bedrooms, 'Type:', typeof homesInsertData.bedrooms);
    console.log('🚿 Bathrooms being copied:', homesInsertData.bathrooms, 'Type:', typeof homesInsertData.bathrooms);

    const { data: insertedData, error: insertError } = await supabase
      .from('homes')
      .insert(homesInsertData)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error inserting into homes:', insertError);
      console.error('❌ Insert data that failed:', JSON.stringify(homesInsertData, null, 2));
      throw insertError;
    }

    console.log('✅ Successfully inserted into homes. Returned data:', JSON.stringify(insertedData, null, 2));
    console.log('🛏️ Bedrooms in inserted home:', insertedData?.bedrooms, '🚿 Bathrooms in inserted home:', insertedData?.bathrooms);

    // Update pending_homes status
    const { error: updateError } = await supabase
      .from('pending_homes')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        admin_id: adminId || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pendingId);

    if (updateError) throw updateError;
  } catch (error) {
    console.error('❌ Supabase: Error approving property:', error);
    throw error;
  }
};

/**
 * Reject a pending property
 */
export const rejectPendingProperty = async (
  pendingId: number,
  adminId: string | undefined,
  rejectionReason: string,
  rejectionCategory?: string
): Promise<void> => {
  try {
    const { data: pending, error: fetchError } = await supabase
      .from('pending_homes')
      .select('*')
      .eq('id', pendingId)
      .single();

    if (fetchError) throw fetchError;

    const { error } = await supabase
      .from('pending_homes')
      .update({
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        rejection_reason: rejectionReason,
        rejection_category: rejectionCategory || null,
        admin_id: adminId || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pendingId);

    if (error) throw error;
  } catch (error) {
    console.error('❌ Supabase: Error rejecting property:', error);
    throw error;
  }
};

/**
 * Get property status for user (using user_property_status view)
 */
export interface PropertyStatus {
  id: number;
  title: string;
  status: string;
  created_at: string;
  approved_at?: string;
  rejected_at?: string;
  rejection_reason?: string;
  rejection_category?: string;
  admin_notes?: string;
  rejection_category_description?: string;
  status_message: string;
  images?: string[];
  city?: string;
  state?: string;
  country?: string;
  price?: string | number;
  description?: string;
}

export const getUserPropertyStatus = async (userId: string): Promise<PropertyStatus[]> => {
  try {
    // Query the user_property_status view directly, which already includes the join
    // But we need to filter by user_id, so we'll query pending_homes and manually get rejection category descriptions
    const { data: pendingHomes, error: pendingError } = await supabase
      .from('pending_homes')
      .select(`
        id,
        title,
        status,
        created_at,
        approved_at,
        rejected_at,
        rejection_reason,
        rejection_category,
        admin_notes,
        user_id,
        images,
        city,
        state,
        country,
        price,
        description
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (pendingError) throw pendingError;

    // Get unique rejection category names that we need descriptions for
    const rejectionCategoryNames = [...new Set(
      (pendingHomes || [])
        .filter(item => item.rejection_category)
        .map(item => item.rejection_category)
    )] as string[];

    // Fetch rejection category descriptions if needed
    let rejectionCategoriesMap: Record<string, string> = {};
    if (rejectionCategoryNames.length > 0) {
      const { data: categories, error: categoriesError } = await supabase
        .from('rejection_categories')
        .select('name, description')
        .in('name', rejectionCategoryNames);

      if (!categoriesError && categories) {
        categories.forEach(cat => {
          if (cat.name) {
            rejectionCategoriesMap[cat.name] = cat.description || '';
          }
        });
      }
    }

    // Map to PropertyStatus format
    return (pendingHomes || []).map((item: any) => {
      let statusMessage = 'Status unknown';
      if (item.status === 'approved') {
        statusMessage = 'Your property has been approved and is now live!';
      } else if (item.status === 'rejected') {
        statusMessage = item.rejection_reason
          ? `Rejected: ${item.rejection_reason}`
          : 'Your property was rejected. Please review and resubmit with corrections.';
      } else if (item.status === 'pending') {
        statusMessage = 'Your property is under review. We will notify you once it is processed.';
      }

      // Process images - convert storage paths to public URLs
      const processedImages = (item.images || []).map((img: string) => {
        if (!img) return '';
        // If already a full URL, return as-is
        if (img.startsWith('http://') || img.startsWith('https://')) {
          return img;
        }
        // Convert storage path to public URL
        try {
          const { data: urlData } = supabase.storage
            .from('KanpurRealty')
            .getPublicUrl(img);
          return urlData?.publicUrl || img;
        } catch {
          return img;
        }
      });

      return {
        id: item.id,
        title: item.title,
        status: item.status,
        created_at: item.created_at,
        approved_at: item.approved_at,
        rejected_at: item.rejected_at,
        rejection_reason: item.rejection_reason,
        rejection_category: item.rejection_category,
        admin_notes: item.admin_notes,
        rejection_category_description: item.rejection_category
          ? rejectionCategoriesMap[item.rejection_category] || undefined
          : undefined,
        status_message: statusMessage,
        images: processedImages,
        city: item.city,
        state: item.state,
        country: item.country,
        price: item.price,
        description: item.description,
      };
    });
  } catch (error) {
    console.error('❌ Supabase: Error getting property status:', error);
    throw error;
  }
};

// ==================== REJECTION CATEGORIES ====================
export interface RejectionCategory {
  id?: number;
  name: string;
  description?: string;
  is_active?: boolean;
  created_at?: string;
}

/**
 * Get all active rejection categories
 */
export const getRejectionCategories = async (): Promise<RejectionCategory[]> => {
  try {
    const { data, error } = await supabase
      .from('rejection_categories')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ Supabase: Error getting rejection categories:', error);
    throw error;
  }
};

// ==================== PROPERTY REMOVAL REQUESTS ====================
export interface PropertyRemovalRequest {
  id?: number;
  property_id: number;
  user_id: string;
  property_title: string;
  removal_reason: string;
  request_status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string;
  created_at?: string;
  updated_at?: string;
  processed_at?: string;
  processed_by?: string;
}

/**
 * Create a property removal request
 */
export const createPropertyRemovalRequest = async (
  request: Omit<PropertyRemovalRequest, 'id' | 'created_at' | 'updated_at' | 'request_status'>
): Promise<PropertyRemovalRequest> => {
  try {
    const { data, error } = await supabase
      .from('property_removal_requests')
      .insert({
        ...request,
        request_status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ Supabase: Error creating removal request:', error);
    throw error;
  }
};

/**
 * Get user's property removal requests
 */
export const getUserRemovalRequests = async (userId: string): Promise<PropertyRemovalRequest[]> => {
  try {
    const { data, error } = await supabase
      .from('property_removal_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ Supabase: Error getting removal requests:', error);
    throw error;
  }
};

/**
 * Get all property removal requests (admin)
 */
export const getAllRemovalRequests = async (
  status?: 'pending' | 'approved' | 'rejected'
): Promise<PropertyRemovalRequest[]> => {
  try {
    let query = supabase
      .from('property_removal_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('request_status', status);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ Supabase: Error getting removal requests:', error);
    throw error;
  }
};

/**
 * Process a property removal request (admin)
 */
export const processRemovalRequest = async (
  requestId: number,
  adminId: string,
  action: 'approved' | 'rejected',
  adminNotes?: string
): Promise<void> => {
  try {
    if (action === 'approved') {
      // Get the request to find property_id
      const { data: request, error: fetchError } = await supabase
        .from('property_removal_requests')
        .select('property_id')
        .eq('id', requestId)
        .single();

      if (fetchError) throw fetchError;

      // Archive the property (set archived_at)
      const { error: archiveError } = await supabase
        .from('homes')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', request.property_id);

      if (archiveError) throw archiveError;
    }

    // Update request status
    const { error: updateError } = await supabase
      .from('property_removal_requests')
      .update({
        request_status: action,
        processed_at: new Date().toISOString(),
        processed_by: adminId,
        admin_notes: adminNotes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (updateError) throw updateError;
  } catch (error) {
    console.error('❌ Supabase: Error processing removal request:', error);
    throw error;
  }
};

// ==================== FORUM POSTS ====================
export interface ForumPost {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category: 'general' | 'buying' | 'selling' | 'investing' | 'neighborhood' | 'expert';
  tags: string[];
  views: number;
  likes_count: number;
  replies_count: number;
  is_pinned: boolean;
  is_trending: boolean;
  created_at: string;
  updated_at: string;
  author?: {
    name: string;
    avatar: string;
    email: string;
  };
}

export interface ForumComment {
  id: string;
  post_id: string;
  user_id: string;
  comment: string;
  likes_count: number;
  created_at: string;
  updated_at: string;
  author?: {
    name: string;
    avatar: string;
    email: string;
  };
}

/**
 * Get forum posts with optional filtering
 */
export const getForumPosts = async (
  category?: string,
  limit?: number,
  offset?: number
): Promise<ForumPost[]> => {
  try {
    let query = supabase
      .from('forum_posts')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    if (limit) {
      query = query.limit(limit);
    }

    if (offset) {
      query = query.range(offset, offset + (limit || 20) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Get current user for comparison
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    // Transform to include author info
    return (data || []).map((post: any) => {
      // If this post is from current user, use their metadata
      let userName = 'Anonymous';
      let userAvatar = '';
      let userEmail = '';

      if (post.user_id === currentUser?.id && currentUser) {
        const meta = currentUser.user_metadata || {};
        userName = meta.name || meta.full_name || currentUser.email?.split('@')[0] || 'Anonymous';
        userAvatar = meta.avatar_url || meta.picture || '';
        userEmail = currentUser.email || '';
      } else {
        // For other users, use generic name
        userName = `User ${post.user_id.substring(0, 8)}`;
      }

      return {
        id: post.id,
        user_id: post.user_id,
        title: post.title,
        content: post.content,
        category: post.category,
        tags: post.tags || [],
        views: post.views || 0,
        likes_count: post.likes_count || 0,
        replies_count: post.replies_count || 0,
        is_pinned: post.is_pinned || false,
        is_trending: post.is_trending || false,
        created_at: post.created_at,
        updated_at: post.updated_at,
        author: {
          name: userName,
          avatar: userAvatar,
          email: userEmail,
        },
      };
    });
  } catch (error) {
    console.error('❌ Supabase: Error getting forum posts:', error);
    throw error;
  }
};

/**
 * Create a new forum post
 */
export const createForumPost = async (
  post: Omit<ForumPost, 'id' | 'user_id' | 'views' | 'likes_count' | 'replies_count' | 'is_pinned' | 'is_trending' | 'created_at' | 'updated_at' | 'author'>
): Promise<ForumPost> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated to create a post');
    }

    const { data, error } = await supabase
      .from('forum_posts')
      .insert({
        user_id: user.id,
        title: post.title,
        content: post.content,
        category: post.category,
        tags: post.tags || [],
        views: 0,
        likes_count: 0,
        replies_count: 0,
        is_pinned: false,
        is_trending: false,
      })
      .select()
      .single();

    if (error) throw error;

    // Fetch with user data
    const posts = await getForumPosts(undefined, 1);
    return posts[0];
  } catch (error) {
    console.error('❌ Supabase: Error creating forum post:', error);
    throw error;
  }
};

/**
 * Get forum post by ID with comments
 */
export const getForumPostById = async (postId: string): Promise<ForumPost & { comments: ForumComment[] } | null> => {
  try {
    // Get post (without join to auth.users)
    const { data: postData, error: postError } = await supabase
      .from('forum_posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (postError) throw postError;
    if (!postData) return null;

    // Increment views
    await supabase
      .from('forum_posts')
      .update({ views: (postData.views || 0) + 1 })
      .eq('id', postId);

    // Get comments (without join to auth.users)
    const { data: commentsData, error: commentsError } = await supabase
      .from('forum_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (commentsError) {
      console.error('Error fetching comments:', commentsError);
    }

    // Get current user for comparison
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    // Build post author info
    let postUserName = 'Anonymous';
    let postUserAvatar = '';
    let postUserEmail = '';

    if (postData.user_id === currentUser?.id && currentUser) {
      const meta = currentUser.user_metadata || {};
      postUserName = meta.name || meta.full_name || currentUser.email?.split('@')[0] || 'Anonymous';
      postUserAvatar = meta.avatar_url || meta.picture || '';
      postUserEmail = currentUser.email || '';
    } else {
      postUserName = `User ${postData.user_id.substring(0, 8)}`;
    }

    const post: ForumPost = {
      id: postData.id,
      user_id: postData.user_id,
      title: postData.title,
      content: postData.content,
      category: postData.category,
      tags: postData.tags || [],
      views: (postData.views || 0) + 1,
      likes_count: postData.likes_count || 0,
      replies_count: postData.replies_count || 0,
      is_pinned: postData.is_pinned || false,
      is_trending: postData.is_trending || false,
      created_at: postData.created_at,
      updated_at: postData.updated_at,
      author: {
        name: postUserName,
        avatar: postUserAvatar,
        email: postUserEmail,
      },
    };

    // Build comment authors info
    const comments: ForumComment[] = (commentsData || []).map((comment: any) => {
      let commentUserName = 'Anonymous';
      let commentUserAvatar = '';
      let commentUserEmail = '';

      if (comment.user_id === currentUser?.id && currentUser) {
        const meta = currentUser.user_metadata || {};
        commentUserName = meta.name || meta.full_name || currentUser.email?.split('@')[0] || 'Anonymous';
        commentUserAvatar = meta.avatar_url || meta.picture || '';
        commentUserEmail = currentUser.email || '';
      } else {
        commentUserName = `User ${comment.user_id.substring(0, 8)}`;
      }

      return {
        id: comment.id,
        post_id: comment.post_id,
        user_id: comment.user_id,
        comment: comment.comment,
        likes_count: comment.likes_count || 0,
        created_at: comment.created_at,
        updated_at: comment.updated_at,
        author: {
          name: commentUserName,
          avatar: commentUserAvatar,
          email: commentUserEmail,
        },
      };
    });

    return { ...post, comments };
  } catch (error) {
    console.error('❌ Supabase: Error getting forum post:', error);
    throw error;
  }
};

/**
 * Add comment to forum post
 */
export const addForumComment = async (
  postId: string,
  comment: string
): Promise<ForumComment> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated to add a comment');
    }

    const { data, error } = await supabase
      .from('forum_comments')
      .insert({
        post_id: postId,
        user_id: user.id,
        comment: comment,
        likes_count: 0,
      })
      .select('*')
      .single();

    if (error) throw error;

    // Get user metadata from current user
    const meta = user.user_metadata || {};
    return {
      id: data.id,
      post_id: data.post_id,
      user_id: data.user_id,
      comment: data.comment,
      likes_count: data.likes_count || 0,
      created_at: data.created_at,
      updated_at: data.updated_at,
      author: {
        name: meta.name || meta.full_name || user.email?.split('@')[0] || 'Anonymous',
        avatar: meta.avatar_url || meta.picture || '',
        email: user.email || '',
      },
    };
  } catch (error) {
    console.error('❌ Supabase: Error adding forum comment:', error);
    throw error;
  }
};

/**
 * Like/unlike a forum post
 */
export const toggleForumPostLike = async (postId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated to like a post');
    }

    // Check if already liked
    const { data: existingLike } = await supabase
      .from('forum_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .single();

    if (existingLike) {
      // Unlike
      const { error } = await supabase
        .from('forum_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id);

      if (error) throw error;
      return false; // Now unliked
    } else {
      // Like
      const { error } = await supabase
        .from('forum_likes')
        .insert({
          post_id: postId,
          user_id: user.id,
        });

      if (error) throw error;
      return true; // Now liked
    }
  } catch (error) {
    console.error('❌ Supabase: Error toggling forum post like:', error);
    throw error;
  }
};

/**
 * Check if user has liked a post
 */
export const hasUserLikedPost = async (postId: string, userId: string): Promise<boolean> => {
  try {
    const { data } = await supabase
      .from('forum_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();

    return !!data;
  } catch {
    return false;
  }
};

// ==================== MORTGAGE LEADS ====================
export interface MortgageLead {
  id?: string;
  user_id?: string;
  property_id?: number;
  name: string;
  email?: string;
  phone?: string;
  message?: string;
  property_price?: number;
  down_payment?: number;
  interest_rate?: number;
  loan_term?: number;
  created_at?: string;
}

/**
 * Create a mortgage lead
 */
export const createMortgageLead = async (
  lead: Omit<MortgageLead, 'id' | 'created_at'>
): Promise<MortgageLead> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    const leadData: any = {
      ...lead,
      user_id: user?.id || null,
    };

    const { data, error } = await supabase
      .from('mortgage_leads')
      .insert(leadData)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ Supabase: Error creating mortgage lead:', error);
    throw error;
  }
};
