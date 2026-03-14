/**
 * Supabase Storage Service
 * 
 * Handles file uploads to Supabase Storage.
 * Replaces Firebase Storage functionality.
 */

import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Helper function to read file as base64 (Expo compatible)
 */
const readFileAsBase64 = async (uri: string): Promise<string> => {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64' as any,
    });
    return base64;
  } catch (error) {
    console.error('Error reading file as base64:', error);
    throw error;
  }
};

/**
 * Upload a property image to Supabase Storage
 * @param imageUri - Local file URI from ImagePicker
 * @returns Public URL of the uploaded image
 */
export const uploadPropertyImage = async (imageUri: string): Promise<string> => {
  try {
    console.log('✅ Supabase Storage: Uploading property image:', imageUri);

    // Read file as base64
    const base64 = await readFileAsBase64(imageUri);

    // Get file extension
    const fileExt = imageUri.split('.').pop() || 'jpg';
    const fileName = `properties/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    // Convert base64 to blob
    const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Upload to Supabase Storage (using existing KanpurRealty bucket)
    const { data, error } = await supabase.storage
      .from('KanpurRealty')
      .upload(fileName, bytes, {
        contentType: `image/${fileExt}`,
        upsert: false,
      });

    if (error) throw error;
    if (!data) throw new Error('Upload failed');

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('KanpurRealty')
      .getPublicUrl(data.path);

    const publicUrl = urlData.publicUrl;
    console.log('✅ Supabase Storage: Image uploaded successfully:', publicUrl);

    return publicUrl;
  } catch (error: any) {
    console.error('❌ Supabase Storage: Error uploading property image:', error);
    throw error;
  }
};

/**
 * Upload a user avatar to Supabase Storage
 * @param imageUri - Local file URI from ImagePicker
 * @param userId - User ID for unique file naming
 * @returns Public URL of the uploaded avatar
 */
export const uploadUserAvatar = async (imageUri: string, userId: string): Promise<string> => {
  try {
    console.log('✅ Supabase Storage: Uploading user avatar:', imageUri, 'for user:', userId);

    // Read file as base64
    const base64 = await readFileAsBase64(imageUri);

    // Get file extension
    const fileExt = imageUri.split('.').pop() || 'jpg';
    const fileName = `avatars/${userId}-${Date.now()}.${fileExt}`;

    // Convert base64 to blob
    const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(fileName, bytes, {
        contentType: `image/${fileExt}`,
        upsert: true, // Overwrite if exists
      });

    if (error) throw error;
    if (!data) throw new Error('Upload failed');

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(data.path);

    const publicUrl = urlData.publicUrl;
    console.log('✅ Supabase Storage: Avatar uploaded successfully:', publicUrl);

    return publicUrl;
  } catch (error: any) {
    console.error('❌ Supabase Storage: Error uploading user avatar:', error);
    throw error;
  }
};

/**
 * Upload multiple property images
 * @param uris - Array of local file URIs from ImagePicker
 * @returns Array of public URLs
 */
export const uploadImagesToSupabase = async (uris: string[]): Promise<string[]> => {
  const urls: string[] = [];

  for (const uri of uris) {
    try {
      const url = await uploadPropertyImage(uri);
      urls.push(url);
    } catch (error) {
      console.error('❌ Supabase Storage: Error uploading image:', uri, error);
      // Continue with other images even if one fails
    }
  }

  return urls;
};

