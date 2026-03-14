/**
 * Admin Authentication Service
 * 
 * Handles admin authentication using separate admin_users table.
 * Completely separate from regular user authentication.
 */

import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
}

const ADMIN_SESSION_KEY = '@plotify_admin_session';

/**
 * Sign in as admin
 * Validates against admin_users table
 */
export const adminSignIn = async (email: string, password: string): Promise<AdminUser> => {
  try {
    const normalizedEmail = email.toLowerCase().trim();

    // Find admin by email
    const { data: admin, error: findError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', normalizedEmail)
      .single();

    if (findError || !admin) {
      throw new Error('Invalid admin credentials');
    }

    // Check if admin is active
    if (!admin.is_active) {
      throw new Error('Admin account is inactive. Please contact support.');
    }

    // Validate password_hash exactly
    if (admin.password_hash !== password) {
      throw new Error('Invalid admin credentials');
    }

    // Update last_login
    const { error: updateError } = await supabase
      .from('admin_users')
      .update({
        last_login: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', admin.id);

    if (updateError) {
      console.error('Error updating admin last_login:', updateError);
      // Don't throw - sign in is still successful
    }

    // Create session and store in AsyncStorage
    const sessionAdmin: AdminUser = {
      id: admin.id,
      email: admin.email,
      name: admin.name,
    };

    await AsyncStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(sessionAdmin));

    return sessionAdmin;
  } catch (error: any) {
    console.error('Admin sign in error:', error);
    throw error;
  }
};

/**
 * Get current admin session
 * Returns admin from AsyncStorage
 */
export const getCurrentAdmin = async (): Promise<AdminUser | null> => {
  try {
    const sessionData = await AsyncStorage.getItem(ADMIN_SESSION_KEY);
    if (!sessionData) {
      return null;
    }

    const admin: AdminUser = JSON.parse(sessionData);

    // Verify admin still exists and is active in database
    const { data: dbAdmin, error } = await supabase
      .from('admin_users')
      .select('id, is_active')
      .eq('id', admin.id)
      .single();

    if (error || !dbAdmin || !dbAdmin.is_active) {
      // Admin no longer exists or is inactive, clear session
      await AsyncStorage.removeItem(ADMIN_SESSION_KEY);
      return null;
    }

    return admin;
  } catch (error: any) {
    console.error('Get current admin error:', error);
    return null;
  }
};

/**
 * Sign out admin
 * Removes session from AsyncStorage
 */
export const adminSignOut = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(ADMIN_SESSION_KEY);
  } catch (error: any) {
    console.error('Admin sign out error:', error);
    throw error;
  }
};

/**
 * Check if email is an admin email
 * Useful for checking if a user should be redirected to admin panel
 */
export const isAdminEmail = async (email: string): Promise<boolean> => {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    const { data, error } = await supabase
      .from('admin_users')
      .select('id')
      .eq('email', normalizedEmail)
      .eq('is_active', true)
      .single();

    return !error && !!data;
  } catch (error) {
    return false;
  }
};

