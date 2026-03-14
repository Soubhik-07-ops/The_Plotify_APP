import React, { createContext, useContext, ReactNode, useState, useEffect, useMemo, useCallback, useRef } from "react";
import { getCurrentUser, signOut as supabaseSignOut, onAuthStateChange } from "@/lib/supabase-auth";
import { getUserFavorites, addUserFavorite, removeUserFavorite } from "@/lib/supabase-db";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationService } from "@/lib/notifications";
import Constants from 'expo-constants';
import { Language } from '@/lib/i18n/translations';

interface GlobalContextType {
  isLogged: boolean;
  user: User | null;
  loading: boolean;
  refetch: () => void;
  login: (userData: User) => void;
  logout: () => void;
  lastLogin: number | null;
  setLastLogin: (time: number) => void;
  favorites: string[];
  addFavorite: (id: string) => void;
  removeFavorite: (id: string) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
}

interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

interface GlobalProviderProps {
  children: ReactNode;
}

export const GlobalProvider = ({ children }: GlobalProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastLogin, setLastLoginState] = useState<number | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [language, setLanguageState] = useState<Language>('English');

  // Use refs to track current values and prevent unnecessary updates
  const currentUserIdRef = useRef<string | null>(null);
  const favoritesLoadedRef = useRef<string | null>(null);
  const isProcessingAuthRef = useRef(false);

  // Load favorites for a specific user from user_favorites table
  const loadUserFavorites = useCallback(async (userId: string) => {
    try {
      const newFavorites = await getUserFavorites(userId);

      // Only update if favorites actually changed
      setFavorites((prevFavorites) => {
        if (
          prevFavorites.length === newFavorites.length &&
          prevFavorites.every((fav, index) => fav === newFavorites[index])
        ) {
          // Favorites haven't changed, return previous array to maintain reference
          return prevFavorites;
        }
        // Favorites changed, return new array
        return newFavorites;
      });
    } catch (error) {
      console.error('Error loading user favorites:', error);
      // Only set empty array if current favorites is not empty
      setFavorites((prevFavorites) => {
        if (prevFavorites.length === 0) {
          return prevFavorites;
        }
        return [];
      });
    }
  }, []);

  // Clear favorites when user logs out - memoized to prevent recreation
  const clearFavorites = useCallback(() => {
    setFavorites([]);
  }, []);

  // Load language preference on mount
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem('selectedLanguage');
        if (savedLanguage && (['English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Hindi', 'Arabic', 'Portuguese', 'Russian'].includes(savedLanguage))) {
          setLanguageState(savedLanguage as Language);
        }
      } catch (error) {
        console.error('Error loading language preference:', error);
      }
    };
    loadLanguage();
  }, []);

  // Set language function that also saves to AsyncStorage
  const setLanguage = useCallback(async (lang: Language) => {
    try {
      setLanguageState(lang);
      await AsyncStorage.setItem('selectedLanguage', lang);
    } catch (error) {
      console.error('Error saving language preference:', error);
    }
  }, []);

  useEffect(() => {
    AsyncStorage.getItem('lastLogin').then(val => {
      if (val) setLastLoginState(Number(val));
    });

    // Initialize notification service only if not in Expo Go
    // Expo Go doesn't support push notifications
    const isExpoGo = Constants.executionEnvironment === 'storeClient';
    if (!isExpoGo) {
      notificationService.initialize().catch(err => {
        console.warn('Notification initialization failed:', err);
      });
    }

    // Initial user load
    const loadInitialUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          currentUserIdRef.current = currentUser.id;
          await loadUserFavorites(currentUser.id);

          // Save push token for notifications only if not in Expo Go
          if (!isExpoGo) {
            notificationService.savePushToken(currentUser.id).catch(err => {
              console.warn('Failed to save push token:', err);
            });
          }
        }
      } catch (error) {
        console.error('Error loading initial user:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialUser();

    // Listen to auth state changes (using AsyncStorage polling)
    const unsubscribe = onAuthStateChange(async (appUser) => {
      // Prevent concurrent processing of auth state changes
      if (isProcessingAuthRef.current) {
        return;
      }

      isProcessingAuthRef.current = true;

      try {
        if (appUser) {
          // Only update if user ID changed or user data is different
          const userId = appUser.id;

          // Skip if we already have this user loaded with same ID
          if (currentUserIdRef.current === userId) {
            // User already loaded, just ensure loading is false
            setLoading((prevLoading) => {
              if (prevLoading) {
                return false;
              }
              return prevLoading;
            });
            isProcessingAuthRef.current = false;
            return;
          }

          // Update user - only if data actually changed
          setUser((prevUser) => {
            if (
              prevUser &&
              prevUser.id === userId &&
              prevUser.name === appUser.name &&
              prevUser.email === appUser.email &&
              prevUser.avatar === appUser.avatar
            ) {
              // User data hasn't changed, return previous object to maintain reference
              return prevUser;
            }

            // User data changed, return new object
            return appUser;
          });

          // Update refs
          currentUserIdRef.current = userId;

          // Only load favorites if not already loaded for this user
          if (favoritesLoadedRef.current !== userId) {
            favoritesLoadedRef.current = userId;
            await loadUserFavorites(userId);
          }

          // Save push token for notifications only if not in Expo Go
          if (!isExpoGo) {
            notificationService.savePushToken(userId).catch(err => {
              console.warn('Failed to save push token:', err);
            });
          }
        } else {
          // User logged out
          if (currentUserIdRef.current !== null) {
            currentUserIdRef.current = null;
            favoritesLoadedRef.current = null;
            setUser(null);
            clearFavorites();
          }
        }

        // Only set loading to false if it's currently true
        setLoading((prevLoading) => {
          if (prevLoading) {
            return false;
          }
          return prevLoading;
        });
      } finally {
        isProcessingAuthRef.current = false;
      }
    });

    // Cleanup function
    return () => {
      unsubscribe();
      // Cleanup notification service when component unmounts
      if (!isExpoGo) {
        notificationService.cleanup();
      }
    };
  }, [loadUserFavorites, clearFavorites]);

  const isLogged = !!user;

  const login = useCallback((userData: User) => {
    setUser((prevUser) => {
      // Only update if user data actually changed
      if (
        prevUser &&
        prevUser.id === userData.id &&
        prevUser.name === userData.name &&
        prevUser.email === userData.email &&
        prevUser.avatar === userData.avatar
      ) {
        return prevUser;
      }
      return userData;
    });
    // Load user-specific favorites when logging in
    if (currentUserIdRef.current !== userData.id) {
      currentUserIdRef.current = userData.id;
      favoritesLoadedRef.current = null;
      loadUserFavorites(userData.id);
    }
  }, [loadUserFavorites]);

  const logout = useCallback(async () => {
    await supabaseSignOut();
    setUser(null);
    clearFavorites();
  }, [clearFavorites]);

  const refetch = useCallback(() => {
    // For now, just return the current user state
    // In the future, this could fetch user data from Firebase Auth
  }, []);

  const setLastLogin = useCallback((time: number) => {
    setLastLoginState(time);
    AsyncStorage.setItem('lastLogin', String(time));
  }, []);

  const addFavorite = useCallback(async (id: string) => {
    if (!user) return; // Don't add favorites if no user is logged in

    try {
      await addUserFavorite(user.id, id);
      // Update local state
      setFavorites((prev) => {
        const updated = prev.includes(id) ? prev : [...prev, id];
        return updated;
      });
    } catch (error) {
      console.error('Error adding favorite:', error);
    }
  }, [user]);

  const removeFavorite = useCallback(async (id: string) => {
    if (!user) return; // Don't remove favorites if no user is logged in

    try {
      await removeUserFavorite(user.id, id);
      // Update local state
      setFavorites((prev) => {
        const updated = prev.filter(fav => fav !== id);
        return updated;
      });
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  }, [user]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    isLogged,
    user,
    loading,
    refetch,
    login,
    logout,
    lastLogin,
    setLastLogin,
    favorites,
    addFavorite,
    removeFavorite,
    language,
    setLanguage,
  }), [isLogged, user, loading, lastLogin, favorites, language, refetch, login, logout, setLastLogin, addFavorite, removeFavorite, setLanguage]);

  return (
    <GlobalContext.Provider value={contextValue}>
      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobalContext = (): GlobalContextType => {
  const context = useContext(GlobalContext);
  if (!context)
    throw new Error("useGlobalContext must be used within a GlobalProvider");

  return context;
};

export default GlobalProvider;
