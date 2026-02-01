/**
 * Announcements Service
 *
 * Handles fetching and managing announcements from Supabase.
 * - User side: getActiveAnnouncements, realtime subscription.
 * - Admin side: full CRUD helpers.
 */

import { supabase } from './supabase';
import { createNotification } from './supabase-db';

export interface Announcement {
  id: string;
  title: string;
  message: string;
  is_active: boolean;
  priority: number;
  created_at: string;
  expires_at: string | null;
  created_by: string | null;
  link: string | null;
  image_url: string | null;
}

// Map raw row into Announcement type
const mapAnnouncement = (row: any): Announcement => ({
  id: row.id,
  title: row.title,
  message: row.message,
  is_active: row.is_active ?? true,
  priority: typeof row.priority === 'number' ? row.priority : 0,
  created_at: row.created_at,
  expires_at: row.expires_at ?? null,
  created_by: row.created_by ?? null,
  link: row.link ?? null,
  image_url: row.image_url ?? null,
});

/**
 * Get active announcements for end users
 * - Only is_active = true
 * - expires_at is null OR expires_at > now()
 * - Ordered by priority DESC, created_at DESC
 */
export const getActiveAnnouncements = async (limit: number = 10): Promise<Announcement[]> => {
  try {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('is_active', true)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Supabase: Error fetching active announcements:', error);
      return [];
    }

    return (data || []).map(mapAnnouncement);
  } catch (err) {
    console.error('❌ Error in getActiveAnnouncements:', err);
    return [];
  }
};

/**
 * Realtime subscription to announcements changes.
 * Re-fetches the active announcements on any insert/update/delete.
 */
export const subscribeToAnnouncements = (
  onChange: (announcements: Announcement[]) => void,
  limit: number = 10
): (() => void) => {
  const channel = supabase
    .channel('announcements-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'announcements' },
      async () => {
        const latest = await getActiveAnnouncements(limit);
        onChange(latest);
      }
    )
    .subscribe();

  // Initial load is left to the caller; this is only for subsequent changes.

  return () => {
    try {
      supabase.removeChannel(channel);
    } catch {
      // Ignore unsubscribe errors
    }
  };
};

// ==========================
// Admin helpers
// ==========================

export const getAllAnnouncements = async (searchQuery?: string): Promise<Announcement[]> => {
  try {
    let query = supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim();
      query = query.or(`title.ilike.%${q}%,message.ilike.%${q}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Supabase: Error fetching all announcements:', error);
      return [];
    }

    return (data || []).map(mapAnnouncement);
  } catch (err) {
    console.error('❌ Error in getAllAnnouncements:', err);
    return [];
  }
};

interface AnnouncementInput {
  title: string;
  message: string;
  is_active?: boolean;
  priority?: number;
  expires_at?: string | null;
  link?: string | null;
  image_url?: string | null;
}

export const createAnnouncement = async (input: AnnouncementInput): Promise<Announcement | null> => {
  try {
    const payload: any = {
      title: input.title.trim(),
      message: input.message.trim(),
      is_active: input.is_active ?? true,
      priority: input.priority ?? 0,
      expires_at: input.expires_at ?? null,
      link: input.link ?? null,
      image_url: input.image_url ?? null,
    };

    const { data, error } = await supabase
      .from('announcements')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      console.error('❌ Supabase: Error creating announcement:', error);
      throw error;
    }

    if (data) {
      // Broadcast notification about new announcement
      try {
        await createNotification({
          user_id: null,
          title: data.title,
          message: data.message,
          type: 'announcement',
          data: {
            announcementId: data.id,
            link: data.link,
          },
          is_read: false,
        });
      } catch (notifyError) {
        console.error('❌ Error creating announcement notification:', notifyError);
      }
    }

    return data ? mapAnnouncement(data) : null;
  } catch (err: any) {
    console.error('❌ Error in createAnnouncement:', err);
    throw err;
  }
};

export const updateAnnouncementStatus = async (
  id: string,
  isActive: boolean
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('announcements')
      .update({ is_active: isActive })
      .eq('id', id);

    if (error) {
      console.error('❌ Supabase: Error updating announcement status:', error);
      throw error;
    }
  } catch (err: any) {
    console.error('❌ Error in updateAnnouncementStatus:', err);
    throw err;
  }
};

export const deleteAnnouncement = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Supabase: Error deleting announcement:', error);
      throw error;
    }
  } catch (err: any) {
    console.error('❌ Error in deleteAnnouncement:', err);
    throw err;
  }
};

