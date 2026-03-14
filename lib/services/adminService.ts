/**
 * Admin Service
 * 
 * Handles all admin operations for the Plotify admin panel.
 * Matches functionality from the website admin panel.
 */

import { supabase } from '../supabase';
import { getCurrentUser } from '../supabase-auth';
import { approvePendingProperty, rejectPendingProperty } from '../supabase-db';

// Types matching the website admin panel
export type Home = {
    id: number;
    title: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    price: string | number | null;
    description: string | null;
    created_at: string;
    archived_at: string | null;
    images?: string[] | null;
    sqft?: string | number | null;
    categories?: string[] | null;
};

export type PendingHome = {
    id: number;
    title: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    price: string | number | null;
    description: string | null;
    created_at: string;
    status: string;
    approved_at?: string | null;
    rejected_at?: string | null;
    admin_notes?: string | null;
    images?: { url: string }[] | null;
    sqft?: number | null;
    categories?: string[] | null;
    userDetails?: {
        id: string;
        name: string;
        email: string;
        phone?: string | null;
    };
};

export type UserProfile = {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
    role?: string | null; // Stored in metadata.role
    is_active: boolean | null;
    is_verified: boolean | null;
    last_login: string | null;
    created_at: string;
    metadata?: any;
};

export type Subscription = {
    id: number;
    email: string;
    plan: string;
    status: string;
    expires_at: string;
    created_at: string;
};

export type Contact = {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    message: string;
    created_at: string;
};

export type RemovalRequest = {
    id: number;
    user_id: string;
    property_id: number;
    property_title: string;
    removal_reason: string;
    request_status: string;
    created_at: string;
    processed_at?: string | null;
    processed_by?: string | null;
    admin_notes?: string | null;
    users?: {
        name: string | null;
        email: string | null;
        phone: string | null;
    };
    pending_homes?: {
        title: string | null;
        city: string | null;
        country: string | null;
        price: number | null;
    };
};

/**
 * Check if current user is admin
 * Checks both database role and environment variable admin email
 */
export const checkIsAdmin = async (userId?: string, userEmail?: string): Promise<boolean> => {
    try {
        // Check if email exists in admin_users table
        if (userEmail) {
            const normalizedEmail = userEmail.toLowerCase().trim();
            const { data: adminData, error: adminError } = await supabase
                .from('admin_users')
                .select('id, email, is_active')
                .eq('email', normalizedEmail)
                .eq('is_active', true)
                .single();

            if (!adminError && adminData) {
                return true;
            }
        }

        // If userId is provided, check by ID (for admin_users table)
        if (userId) {
            const { data: adminData, error: adminError } = await supabase
                .from('admin_users')
                .select('id, is_active')
                .eq('id', userId)
                .eq('is_active', true)
                .single();

            if (!adminError && adminData) {
                return true;
            }
        }

        return false;
    } catch (error) {
        console.error('Error checking admin status:', error);
        return false;
    }
};

/**
 * Get published homes (non-archived)
 */
export const getPublishedHomes = async (searchQuery?: string): Promise<Home[]> => {
    try {
        let query = supabase
            .from('homes')
            .select('*')
            .is('archived_at', null)
            .order('created_at', { ascending: false });

        if (searchQuery) {
            query = query.ilike('title', `%${searchQuery}%`);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching published homes:', error);
        throw error;
    }
};

/**
 * Get archived homes
 */
export const getArchivedHomes = async (searchQuery?: string): Promise<Home[]> => {
    try {
        let query = supabase
            .from('homes')
            .select('*')
            .not('archived_at', 'is', null)
            .order('archived_at', { ascending: false });

        if (searchQuery) {
            query = query.ilike('title', `%${searchQuery}%`);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching archived homes:', error);
        throw error;
    }
};

/**
 * Get pending homes with user details
 */
export const getPendingHomes = async (searchQuery?: string): Promise<PendingHome[]> => {
    try {
        let query = supabase
            .from('pending_homes')
            .select(`
        *,
        users:user_id (
          id,
          name,
          email,
          phone
        )
      `)
            .order('created_at', { ascending: false });

        if (searchQuery) {
            query = query.ilike('title', `%${searchQuery}%`);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Process images for each pending home
        if (data) {
            const homesWithImages = await Promise.all(
                data.map(async (home) => {
                    // Try to get images from pending_home_images table first
                    let imageData = null;
                    try {
                        const { data: images } = await supabase
                            .from('pending_home_images')
                            .select('url')
                            .eq('home_id', home.id);
                        imageData = images;
                    } catch (error) {
                        console.log('pending_home_images table not found, using images from pending_homes table');
                    }

                    // If no images in pending_home_images, use the images array from pending_homes
                    const images = imageData && imageData.length > 0
                        ? imageData
                        : (home.images || []).map((url: string) => ({ url }));

                    // Convert image URLs to full Supabase URLs
                    const processedImages = images.map((img: any) => {
                        const url = typeof img === 'string' ? img : img.url;
                        if (url.startsWith('http')) {
                            return { url };
                        }
                        const { data: { publicUrl } } = supabase.storage
                            .from('KanpurRealty')
                            .getPublicUrl(url);
                        return { url: publicUrl };
                    });

                    return {
                        ...home,
                        images: processedImages,
                        userDetails: home.users
                    };
                })
            );
            return homesWithImages;
        }

        return [];
    } catch (error) {
        console.error('Error fetching pending homes:', error);
        throw error;
    }
};

/**
 * Approve a pending home using the TypeScript function (includes bedrooms/bathrooms)
 * adminId is optional; if omitted, approvePendingProperty will record a null admin_id.
 */
export const approvePendingHome = async (pendingHomeId: number, adminId?: string): Promise<void> => {
    try {
        await approvePendingProperty(pendingHomeId, adminId);
    } catch (error) {
        console.error('Error approving pending home:', error);
        throw error;
    }
};

/**
 * Reject a pending home
 */
export const rejectPendingHome = async (
    pendingHomeId: number,
    rejectionReason: string,
    adminId?: string
): Promise<void> => {
    try {
        // Use rejectPendingProperty which handles notifications; adminId is optional
        await rejectPendingProperty(pendingHomeId, adminId, rejectionReason);
    } catch (error) {
        console.error('Error rejecting pending home:', error);
        throw error;
    }
};

/**
 * Archive a home
 */
export const archiveHome = async (homeId: number): Promise<void> => {
    try {
        const { error } = await supabase
            .from('homes')
            .update({ archived_at: new Date().toISOString() })
            .eq('id', homeId);

        if (error) throw error;
    } catch (error) {
        console.error('Error archiving home:', error);
        throw error;
    }
};

/**
 * Unarchive a home
 */
export const unarchiveHome = async (homeId: number): Promise<void> => {
    try {
        const { error } = await supabase
            .from('homes')
            .update({ archived_at: null })
            .eq('id', homeId);

        if (error) throw error;
    } catch (error) {
        console.error('Error unarchiving home:', error);
        throw error;
    }
};

/**
 * Delete a home and its images
 */
export const deleteHome = async (homeId: number): Promise<void> => {
    try {
        // First delete the images associated with the home
        const { error: deleteImagesError } = await supabase
            .from('home_images')
            .delete()
            .eq('home_id', homeId);

        if (deleteImagesError) {
            console.warn('Error deleting home images:', deleteImagesError);
            // Continue with home deletion even if image deletion fails
        }

        // Then delete the home itself
        const { error } = await supabase
            .from('homes')
            .delete()
            .eq('id', homeId);

        if (error) throw error;
    } catch (error) {
        console.error('Error deleting home:', error);
        throw error;
    }
};

/**
 * Get all users
 */
export const getUsers = async (searchQuery?: string): Promise<UserProfile[]> => {
    try {
        let query = supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (searchQuery) {
            query = query.ilike('email', `%${searchQuery}%`);
        }

        const { data, error } = await query;
        if (error) throw error;
        
        // Extract role from metadata for each user
        return (data || []).map(user => ({
            ...user,
            role: user.metadata?.role || null,
        }));
    } catch (error) {
        console.error('Error fetching users:', error);
        throw error;
    }
};

/**
 * Delete a user
 */
export const deleteUser = async (userId: string): Promise<void> => {
    try {
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', userId);

        if (error) throw error;
    } catch (error) {
        console.error('Error deleting user:', error);
        throw error;
    }
};

/**
 * Get subscriptions
 */
export const getSubscriptions = async (
    searchQuery?: string,
    statusFilter?: string,
    dateRange?: string
): Promise<Subscription[]> => {
    try {
        let query = supabase
            .from('subscriptions')
            .select('*')
            .order('created_at', { ascending: false });

        if (searchQuery) {
            query = query.ilike('email', `%${searchQuery}%`);
        }

        if (statusFilter && statusFilter !== 'all') {
            query = query.eq('status', statusFilter);
        }

        if (dateRange && dateRange !== 'all') {
            const now = new Date();
            let startDate = new Date();

            if (dateRange === 'week') {
                startDate.setDate(now.getDate() - 7);
            } else if (dateRange === 'month') {
                startDate.setMonth(now.getMonth() - 1);
            } else if (dateRange === 'year') {
                startDate.setFullYear(now.getFullYear() - 1);
            }

            query = query.gte('created_at', startDate.toISOString());
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching subscriptions:', error);
        throw error;
    }
};

/**
 * Get contacts
 */
export const getContacts = async (searchQuery?: string): Promise<Contact[]> => {
    try {
        let query = supabase
            .from('contacts')
            .select('*')
            .order('created_at', { ascending: false });

        if (searchQuery) {
            query = query.ilike('email', `%${searchQuery}%`);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching contacts:', error);
        throw error;
    }
};

/**
 * Get removal requests
 */
export const getRemovalRequests = async (searchQuery?: string): Promise<RemovalRequest[]> => {
    try {
        let query = supabase
            .from('property_removal_requests')
            .select('*')
            .order('created_at', { ascending: false });

        if (searchQuery) {
            query = query.ilike('property_title', `%${searchQuery}%`);
        }

        const { data, error } = await query;
        if (error) {
            console.error('Error loading removal requests:', error);
            return [];
        }

        // Enrich with user and property details
        if (data && data.length > 0) {
            const enrichedData = await Promise.all(
                data.map(async (request) => {
                    // Try to get user details
                    const { data: userData } = await supabase
                        .from('users')
                        .select('name, email, phone')
                        .eq('id', request.user_id)
                        .single();

                    // Try to get property details
                    const { data: propertyData } = await supabase
                        .from('pending_homes')
                        .select('title, city, country, price')
                        .eq('id', request.property_id)
                        .single();

                    return {
                        ...request,
                        users: userData || undefined,
                        pending_homes: propertyData || undefined
                    };
                })
            );
            return enrichedData;
        }

        return [];
    } catch (error) {
        console.error('Error fetching removal requests:', error);
        return [];
    }
};

/**
 * Approve removal request
 */
export const approveRemovalRequest = async (
    requestId: number,
    propertyId: number
): Promise<void> => {
    try {
        // Get current user from AsyncStorage session for processed_by field
        const currentUser = await getCurrentUser();
        const processedBy = currentUser?.id || null;

        // Update removal request status
        const { error: updateError } = await supabase
            .from('property_removal_requests')
            .update({
                request_status: 'approved',
                processed_at: new Date().toISOString(),
                processed_by: processedBy,
                admin_notes: 'Property removal approved and deleted by admin'
            })
            .eq('id', requestId);

        if (updateError) throw updateError;

        // Try to find the property in pending_homes first
        const { data: propertyData } = await supabase
            .from('pending_homes')
            .select('*')
            .eq('id', propertyId)
            .single();

        if (propertyData) {
            // Delete from pending_homes table
            const { error: deletePendingError } = await supabase
                .from('pending_homes')
                .delete()
                .eq('id', propertyId);

            if (deletePendingError) {
                console.error('Error deleting from pending_homes:', deletePendingError);
            }

            // If the property was approved and moved to homes table, delete it
            if (propertyData.status === 'approved') {
                const { error: deleteHomesError } = await supabase
                    .from('homes')
                    .delete()
                    .eq('title', propertyData.title)
                    .eq('user_id', propertyData.user_id);

                if (deleteHomesError) {
                    console.error('Error deleting from homes table:', deleteHomesError);
                }
            }
        } else {
            // Try deleting directly from homes table by ID
            const { error: deleteHomesError } = await supabase
                .from('homes')
                .delete()
                .eq('id', propertyId);

            if (deleteHomesError) {
                console.error('Error deleting from homes table:', deleteHomesError);
            }
        }
    } catch (error) {
        console.error('Error approving removal request:', error);
        throw error;
    }
};

/**
 * Reject removal request
 */
export const rejectRemovalRequest = async (
    requestId: number,
    reason?: string
): Promise<void> => {
    try {
        // Get current user from AsyncStorage session for processed_by field
        const currentUser = await getCurrentUser();
        const processedBy = currentUser?.id || null;

        const { error } = await supabase
            .from('property_removal_requests')
            .update({
                request_status: 'rejected',
                processed_at: new Date().toISOString(),
                processed_by: processedBy,
                admin_notes: reason || 'Removal request rejected by admin'
            })
            .eq('id', requestId);

        if (error) throw error;
    } catch (error) {
        console.error('Error rejecting removal request:', error);
        throw error;
    }
};

