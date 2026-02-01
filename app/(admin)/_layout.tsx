/**
 * Admin Layout
 * 
 * Protected route that checks if user is admin before allowing access.
 * Redirects to sign-in if not logged in, or to home if not admin.
 */

import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCurrentAdmin } from '@/lib/admin-auth';
import { palette } from '@/constants/theme';

export default function AdminLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  useEffect(() => {
    const checkAdminAccess = async () => {
      setCheckingAdmin(true);
      try {
        // Check if admin session exists
        const admin = await getCurrentAdmin();
        
        if (!admin) {
          // No admin session, redirect to sign-in
          setIsAdmin(false);
          router.replace('/sign-in');
          return;
        }

        // Admin session exists
        setIsAdmin(true);
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
        router.replace('/sign-in');
      } finally {
        setCheckingAdmin(false);
      }
    };

    checkAdminAccess();
  }, [router]);

  // Show loading screen while checking admin status
  if (checkingAdmin || isAdmin === null) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={palette.primary} />
          <Text style={{ marginTop: 16, color: palette.textSecondary, fontSize: 16 }}>
            Checking access...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // If not admin, don't render (redirect will happen)
  if (!isAdmin) {
    return null;
  }

  // Render admin stack
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: palette.background },
      }}
    />
  );
}

