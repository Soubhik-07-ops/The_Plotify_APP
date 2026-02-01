/**
 * Supabase Authentication Service
 * 
 * Handles user authentication using ONLY public.users table.
 * NO Supabase Auth (auth.users) is used.
 * Session management via AsyncStorage.
 */

import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  avatar_url?: string | null;
  is_verified: boolean;
  is_active: boolean;
  last_login?: string | null;
  created_at: string;
  updated_at: string;
  metadata?: any;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

const SESSION_KEY = '@plotify_user_session';

/**
 * Sign up a new user
 * Creates user record directly in public.users table
 */
export const signUp = async (
  email: string,
  password: string,
  name: string,
  phone?: string
): Promise<AppUser> => {
  try {
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', normalizedEmail)
      .single();

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Store password_hash exactly as provided (plain text, matching existing DB records)
    const userData = {
      email: normalizedEmail,
      password_hash: password, // Store password as-is (matching existing DB records)
      name: name.trim(),
      phone: phone?.trim() || null,
      avatar_url: null,
      is_verified: false,
      is_active: true,
      metadata: {},
    };

    // Insert user into public.users
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single();

    if (insertError) {
      console.error('Sign up error:', insertError);
      
      // Provide helpful error message for RLS policy issues
      if (insertError.code === '42501' || insertError.message?.includes('row-level security')) {
        throw new Error(
          'Database security policy error. Please contact the administrator to set up Row Level Security (RLS) policies. ' +
          'See RLS_POLICY_FIX.sql file for the required SQL policies.'
        );
      }
      
      throw new Error(insertError.message || 'Failed to create account');
    }

    if (!newUser) {
      throw new Error('Failed to create user');
    }

    // Create session and store in AsyncStorage
    const sessionUser: AppUser = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      avatar: newUser.avatar_url || '',
    };

    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));

    return sessionUser;
  } catch (error: any) {
    console.error('Sign up error:', error);
    throw error;
  }
};

/**
 * Sign in an existing user
 * Validates against public.users table
 * Updates last_login on successful login
 */
export const signIn = async (email: string, password: string): Promise<AppUser> => {
  try {
    const normalizedEmail = email.toLowerCase().trim();

    // Find user by email
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('email', normalizedEmail)
      .single();

    if (findError || !user) {
      throw new Error('Invalid email or password');
    }

    // Check if user is active
    if (!user.is_active) {
      throw new Error('Account is inactive. Please contact support.');
    }

    // Validate password_hash exactly (matching existing DB records)
    if (user.password_hash !== password) {
      throw new Error('Invalid email or password');
    }

    // Update last_login
    const { error: updateError } = await supabase
      .from('users')
      .update({
        last_login: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating last_login:', updateError);
      // Don't throw - sign in is still successful
    }

    // Create session and store in AsyncStorage
    const sessionUser: AppUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar_url || '',
      };

    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));

    return sessionUser;
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  }
};

/**
 * Sign out current user
 * Removes session from AsyncStorage
 */
export const signOut = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(SESSION_KEY);
  } catch (error: any) {
    console.error('Sign out error:', error);
    throw error;
  }
};

/**
 * Get current authenticated user
 * Returns user from AsyncStorage session
 */
export const getCurrentUser = async (): Promise<AppUser | null> => {
  try {
    const sessionData = await AsyncStorage.getItem(SESSION_KEY);
    if (!sessionData) {
      return null;
    }

    const user: AppUser = JSON.parse(sessionData);

    // Verify user still exists and is active in database
    const { data: dbUser, error } = await supabase
      .from('users')
      .select('id, is_active')
      .eq('id', user.id)
      .single();

    if (error) {
      // Transient DB / network error: do NOT clear session or log the user out
      console.error('Get current user DB error (keeping session):', error);
      return user;
    }

    if (!dbUser || !dbUser.is_active) {
      // User no longer exists or is inactive, clear session
      await AsyncStorage.removeItem(SESSION_KEY);
      return null;
    }

    return user;
  } catch (error: any) {
    console.error('Get current user error:', error);
    return null;
  }
};

/**
 * Update user profile
 * Updates public.users table
 */
export const updateUserProfile = async (updates: {
  name?: string;
  phone?: string;
  avatar_url?: string;
  metadata?: any;
}): Promise<AppUser> => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.avatar_url !== undefined) updateData.avatar_url = updates.avatar_url;
    if (updates.metadata !== undefined) updateData.metadata = updates.metadata;

    const { data: profile, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', currentUser.id)
      .select()
      .single();

    if (updateError) throw updateError;
    if (!profile) throw new Error('Failed to update profile');

    // Update session
    const updatedUser: AppUser = {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      avatar: profile.avatar_url || '',
    };

    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));

    return updatedUser;
  } catch (error: any) {
    console.error('Update user profile error:', error);
    throw error;
  }
};

/**
 * Listen to auth state changes
 * Since we're using AsyncStorage, we'll poll for changes
 * Returns a function to unsubscribe
 */
export const onAuthStateChange = (
  callback: (user: AppUser | null) => void
): (() => void) => {
  let isSubscribed = true;
  let lastUser: AppUser | null = null;

  const checkAuthState = async () => {
    if (!isSubscribed) return;

    try {
      const currentUser = await getCurrentUser();
      
      // Only call callback if user state changed
      if (
        (currentUser && !lastUser) ||
        (!currentUser && lastUser) ||
        (currentUser && lastUser && currentUser.id !== lastUser.id)
      ) {
        lastUser = currentUser;
        callback(currentUser);
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
    }

    // Check again after a delay
    if (isSubscribed) {
      setTimeout(checkAuthState, 1000);
    }
  };

  // Initial check
  checkAuthState();

  return () => {
    isSubscribed = false;
  };
};
