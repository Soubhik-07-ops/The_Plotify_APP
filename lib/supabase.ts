/**
 * Supabase Client Initialization
 * 
 * This module initializes the Supabase client for the Plotify app.
 * Uses environment variables for configuration.
 */

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase Config:', {
    url: supabaseUrl ? '✅ Set' : '❌ Missing',
    anonKey: supabaseAnonKey ? '✅ Set' : '❌ Missing',
  });
  throw new Error('Supabase URL and Anon Key must be set in environment variables');
}

console.log('✅ Supabase Config:', {
  url: supabaseUrl ? '✅ Set' : '❌ Missing',
  anonKey: supabaseAnonKey ? '✅ Set' : '❌ Missing',
});

/**
 * Supabase client instance
 * 
 * Uses AsyncStorage for session persistence in React Native
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

console.log('✅ Supabase client initialized successfully');

export default supabase;

