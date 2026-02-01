import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
  Modal,
  Dimensions,
  ScrollView,
} from "react-native";
import { useEffect, useState, useRef, useCallback, useMemo, memo } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import icons from "@/constants/icons";

import Filters from "@/components/Filters";
import NoResults from "@/components/NoResults";
import { Card, FeaturedCard } from "@/components/Cards";
import MortgageCalculator from "@/components/MortgageCalculator";
import AddPropertyModal from "@/components/AddPropertyModal";

import { useGlobalContext } from "@/lib/global-provider";
import { getLatestProperties, getProperties } from "@/lib/supabase-db";
import type { Property } from '@/lib/supabase-db';
import NotificationCenter from "@/components/NotificationCenter";
import { notificationService } from "@/lib/notifications";
import { palette } from "@/constants/theme";
import { fetchNews, type NewsArticle, clearNewsCache, getNewsCacheInfo } from "@/lib/news";
import { getActiveAnnouncements, subscribeToAnnouncements, type Announcement } from "@/lib/announcements";

const { width: screenWidth } = Dimensions.get('window');

const Home = () => {
  const homeRenderCount = useRef(0);
  const { user, lastLogin, favorites } = useGlobalContext();

  homeRenderCount.current += 1;
  if (homeRenderCount.current <= 10 || homeRenderCount.current % 10 === 0) {
    console.log(`[Home] Component render #${homeRenderCount.current}`, {
      userId: user?.id,
      favoritesCount: favorites?.length || 0,
    });
  }
  const params = useLocalSearchParams<{ filter?: string }>();
  const [properties, setProperties] = useState<Property[]>([]);
  const [latestProperties, setLatestProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [latestLoading, setLatestLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Extract params values to prevent object reference changes
  const paramFilter = params.filter;

  const [filter, setFilter] = useState(paramFilter || 'All');
  const [newPropertyCount, setNewPropertyCount] = useState(0);
  const [showNewPropModal, setShowNewPropModal] = useState(false);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showMortgageCalculator, setShowMortgageCalculator] = useState(false);
  const [showAddPropertyModal, setShowAddPropertyModal] = useState(false);
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0);
  const newsScrollX = useRef(0);
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [showArticleModal, setShowArticleModal] = useState(false);
  const newsScrollRef = useRef(null);
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [showAllAnnouncementsModal, setShowAllAnnouncementsModal] = useState(false);

  // Calculate time of day greeting
  const timeOfDay = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  })();

  // Memoize fetch functions to prevent recreation on every render
  const fetchProperties = useCallback(async () => {
    // Only set loading if not already loading
    setLoading(prev => prev ? prev : true);
    console.log('📋 Fetching properties with filter:', filter);
    try {
      const props = await getProperties(filter, undefined, 6);
      const unsoldProps = props.filter(p => !p.sold);
      console.log('📊 Fetched properties:', unsoldProps.length, 'unsold properties');
      // Only update if properties actually changed
      setProperties(prevProps => {
        if (prevProps.length !== unsoldProps.length) return unsoldProps;
        // Check if any property IDs changed
        const propsChanged = prevProps.some((prop, idx) => prop.id !== unsoldProps[idx]?.id) ||
          unsoldProps.some((prop, idx) => prop.id !== prevProps[idx]?.id);
        return propsChanged ? unsoldProps : prevProps;
      });
    } catch (error) {
      console.error('Error fetching properties:', error);
      setProperties(prevProps => prevProps.length === 0 ? prevProps : []);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  // Fetch latest properties - only once on mount
  const fetchLatest = useCallback(async () => {
    // Only set loading if not already loading
    setLatestLoading(prev => prev ? prev : true);
    try {
      const latest = await getLatestProperties();
      const unsoldLatest = latest.filter((p) => !p.sold);
      // Only update if properties actually changed
      setLatestProperties(prevProps => {
        if (prevProps.length !== unsoldLatest.length) return unsoldLatest;
        // Check if any property IDs changed
        const propsChanged = prevProps.some((prop, idx) => prop.id !== unsoldLatest[idx]?.id) ||
          unsoldLatest.some((prop, idx) => prop.id !== prevProps[idx]?.id);
        return propsChanged ? unsoldLatest : prevProps;
      });
    } catch (error) {
      console.error('Error fetching latest properties:', error);
      setLatestProperties(prevProps => prevProps.length === 0 ? prevProps : []);
    } finally {
      setLatestLoading(false);
    }
  }, []);

  // Listen to parameter changes - use specific values instead of whole object
  // Only update if values actually changed to prevent unnecessary re-renders
  useEffect(() => {
    const newFilter = paramFilter || 'All';

    // Use functional updates to avoid dependency on current state values
    setFilter(prevFilter => {
      if (prevFilter !== newFilter) {
        return newFilter;
      }
      return prevFilter;
    });
  }, [paramFilter]); // Only depend on the actual param values

  // Fetch properties when filter or search changes
  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  // Fetch latest only once on mount
  useEffect(() => {
    fetchLatest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Fetch news articles
  useEffect(() => {
    const loadNews = async () => {
      setNewsLoading(true);
      try {
        console.log('🔄 Loading news articles...');

        // Debug: Check cache status
        const cacheInfo = await getNewsCacheInfo();
        if (cacheInfo) {
          console.log('📦 Cache status:', {
            exists: cacheInfo.exists,
            ageMinutes: cacheInfo.age,
            expiresInMinutes: cacheInfo.expiresIn,
          });
        }

        const news = await fetchNews();
        console.log('✅ News loaded:', news.length, 'articles');
        if (news.length > 0) {
          console.log('📰 First article:', news[0].title);
        }
        setNewsArticles(news);
      } catch (error) {
        console.error('❌ Error loading news:', error);
        setNewsArticles([]);
      } finally {
        setNewsLoading(false);
      }
    };
    loadNews();
  }, []);

  // Fetch announcements once and subscribe for realtime updates
  useEffect(() => {
    let isMounted = true;

    const loadAnnouncements = async () => {
      setAnnouncementsLoading(true);
      try {
        const items = await getActiveAnnouncements(10);
        if (isMounted) {
          setAnnouncements(items);
        }
      } catch (error) {
        console.error('❌ Error loading announcements:', error);
        if (isMounted) {
          setAnnouncements([]);
        }
      } finally {
        if (isMounted) {
          setAnnouncementsLoading(false);
        }
      }
    };

    loadAnnouncements();

    const unsubscribe = subscribeToAnnouncements((items) => {
      setAnnouncements(items);
    }, 10);

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Check for new properties since last login - only run once when lastLogin is set
  useEffect(() => {
    if (!lastLogin) return;

    let isMounted = true;
    const checkNewProperties = async () => {
      try {
        const latest = await getLatestProperties();
        if (!isMounted) return;

        const newProps = latest.filter(p => {
          const propertyDate = new Date(p.createdAt || Date.now());
          return propertyDate.getTime() > lastLogin && !p.sold;
        });

        if (isMounted) {
          setNewPropertyCount(newProps.length);
          if (newProps.length > 0) {
            setShowNewPropModal(true);
          }
        }
      } catch (error) {
        console.error('Error checking new properties:', error);
      }
    };

    checkNewProperties();

    return () => {
      isMounted = false;
    };
  }, [lastLogin]);

  const handleCardPress = useCallback((id: string) => {
    router.push(`/properties/${id}`);
  }, []);

  // Handle news article click
  const handleNewsClick = useCallback((article: NewsArticle) => {
    setSelectedArticle(article);
    setShowArticleModal(true);
  }, []);

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays <= 0) {
      if (diffHours <= 0) {
        if (diffMinutes <= 1) return 'Just now';
        return `${diffMinutes} min ago`;
      }
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    }

    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    // Fallback to date string for older announcements
    return date.toLocaleDateString();
  };

  // Memoize renderItem functions to prevent FlatList re-renders
  const renderPropertyItem = useCallback(({ item, index }: { item: Property; index: number }) => {
    return <Card item={item} onPress={() => handleCardPress(String(item.id ?? ''))} index={index} />;
  }, [handleCardPress]);

  const renderFeaturedItem = useCallback(({ item, index }: { item: Property; index: number }) => {
    const itemId = String(item.id ?? '');
    // Create stable onPress handler
    const onPressHandler = () => handleCardPress(itemId);
    return <FeaturedCard item={item} onPress={onPressHandler} index={index} />;
  }, [handleCardPress]);

  const renderNewsItem = useCallback(({ item, index }: { item: NewsArticle; index: number }) => {
    if (!item) return null;
    return (
      <TouchableOpacity
        onPress={() => handleNewsClick(item)}
        activeOpacity={0.7}
        style={{ width: screenWidth - 40 }}
      >
        <View style={{ backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: 20, shadowColor: palette.shadow, shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4, overflow: 'hidden' }}>
          <View style={{ padding: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <Text style={{ fontSize: 32, marginRight: 12 }}>{item.image}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: palette.textPrimary, marginBottom: 8, fontFamily: 'Rubik-Bold' }}>
                  {item.title}
                </Text>
                <Text style={{ fontSize: 14, fontFamily: 'Rubik-Regular', color: palette.textSecondary, marginBottom: 12, lineHeight: 20 }}>
                  {item.summary}
                </Text>
                <Text style={{ fontSize: 12, fontFamily: 'Rubik-Regular', color: palette.textMuted }}>
                  {item.date}
                </Text>
              </View>
            </View>
            <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: palette.border }}>
              <Text style={{ color: palette.primary, fontWeight: '500', fontFamily: 'Rubik-Medium', textAlign: 'center' }}>
                Read More →
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [handleNewsClick]);

  // Memoize keyExtractor functions
  const propertyKeyExtractor = useCallback((item: Property) => String(item.id ?? ''), []);
  const newsKeyExtractor = useCallback((item: NewsArticle) => item.id || Math.random().toString(), []);

  // Memoize properties array to prevent unnecessary re-renders
  const memoizedProperties = useMemo(() => properties, [properties]);
  const memoizedLatestProperties = useMemo(() => latestProperties, [latestProperties]);

  // Ref to maintain Featured Properties FlatList identity - created ONCE and never changes
  const featuredListRef = useRef<FlatList<Property> | null>(null);

  // Create a completely stable Featured Properties component that won't be recreated
  // This component is created ONCE and maintains its identity across re-renders
  const FeaturedPropertiesSection = useMemo(() => {
    const Component = memo(({
      loading,
      properties,
      renderItem,
      keyExtractor,
      listRef,
      favoritesData
    }: {
      loading: boolean;
      properties: Property[];
      renderItem: (info: { item: Property; index: number }) => React.ReactElement | null;
      keyExtractor: (item: Property) => string;
      listRef: React.RefObject<FlatList<Property> | null>;
      favoritesData: string[];
    }) => {

      // Calculate responsive spacing based on screen width (shared across all states)
      const horizontalPadding = Math.max(20, Math.min(screenWidth * 0.05, 24)); // 5% of screen width, min 20px, max 24px
      const cardGap = Math.max(16, Math.min(screenWidth * 0.04, 20)); // 4% of screen width, min 16px, max 20px

      if (loading) {
        return (
          <View className="my-6">
            <View className="flex flex-row items-center justify-between" style={{ paddingHorizontal: horizontalPadding }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: palette.textPrimary, fontFamily: 'Rubik-Bold' }}>Featured Properties</Text>
              <TouchableOpacity onPress={() => router.push('/explore')}>
                <Text style={{ color: palette.primary, fontWeight: '500', fontFamily: 'Rubik-Medium' }}>View All</Text>
              </TouchableOpacity>
            </View>
            <View className="mt-4" style={{ paddingHorizontal: horizontalPadding }}>
              <ActivityIndicator size="large" color={palette.primary} />
            </View>
          </View>
        );
      }

      if (!properties || properties.length === 0) {
        return (
          <View className="my-6">
            <View className="flex flex-row items-center justify-between" style={{ paddingHorizontal: horizontalPadding }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: palette.textPrimary, fontFamily: 'Rubik-Bold' }}>Featured Properties</Text>
              <TouchableOpacity onPress={() => router.push('/explore')}>
                <Text style={{ color: palette.primary, fontWeight: '500', fontFamily: 'Rubik-Medium' }}>View All</Text>
              </TouchableOpacity>
            </View>
            <NoResults />
          </View>
        );
      }

      const cardWidth = 240; // Fixed card width
      const itemLength = cardWidth + cardGap;

      return (
        <View className="my-6">
          <View className="flex flex-row items-center justify-between" style={{ paddingHorizontal: horizontalPadding }}>
            <Text className="text-xl font-rubik-bold text-black-300">Featured Properties</Text>
            <TouchableOpacity onPress={() => router.push('/explore')}>
              <Text className="text-primary-300 font-rubik-medium">View All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            ref={listRef}
            key="featured-properties-flatlist-stable"
            data={properties}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingLeft: horizontalPadding,
              paddingRight: horizontalPadding,
              gap: cardGap,
              marginTop: 8,
            }}
            getItemLayout={(data, index) => ({
              length: itemLength,
              offset: itemLength * index,
              index,
            })}
            removeClippedSubviews={false}
            initialNumToRender={3}
            maxToRenderPerBatch={3}
            windowSize={5}
            extraData={favoritesData}
            scrollEventThrottle={16}
          />
        </View>
      );
    }, (prevProps, nextProps) => {
      // Custom comparison: Return true to SKIP re-render (props equal), false to re-render (props changed)
      // Only check essential props that affect FlatList identity
      if (prevProps.loading !== nextProps.loading) return false;
      if (prevProps.properties?.length !== nextProps.properties?.length) return false;
      // For arrays, check reference equality - if same reference, skip re-render
      // If different reference but same length, check if content changed
      if (prevProps.properties !== nextProps.properties && prevProps.properties?.length === nextProps.properties?.length) {
        // Check if any property ID changed
        const contentChanged = prevProps.properties.some((prop, idx) =>
          prop.id !== nextProps.properties[idx]?.id
        );
        if (contentChanged) return false;
      }
      // Function references must be stable (they should be with useCallback)
      if (prevProps.renderItem !== nextProps.renderItem) return false;
      if (prevProps.keyExtractor !== nextProps.keyExtractor) return false;
      // Ref must be stable (it is with useRef)
      if (prevProps.listRef !== nextProps.listRef) return false;
      // Favorites array - check length and reference
      if (prevProps.favoritesData?.length !== nextProps.favoritesData?.length) return false;
      if (prevProps.favoritesData !== nextProps.favoritesData &&
        prevProps.favoritesData?.length === nextProps.favoritesData?.length) {
        // Check if favorites content changed
        const favsChanged = prevProps.favoritesData.some((fav, idx) =>
          fav !== nextProps.favoritesData[idx]
        );
        if (favsChanged) return false;
      }
      // All props are effectively equal - skip re-render to preserve FlatList identity
      return true;
    });
    Component.displayName = 'FeaturedPropertiesSection';
    return Component;
  }, []); // Empty deps - component created once and never recreated

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([fetchProperties(), fetchLatest()]).finally(() => {
      setTimeout(() => setRefreshing(false), 1000);
    });
  }, [fetchProperties, fetchLatest]);

  const handleNotificationPress = useCallback(() => {
    setShowNotificationCenter(true);
  }, []);

  const loadUnreadCount = useCallback(async () => {
    try {
      if (user?.id) {
        const notifications = await notificationService.getUserNotifications(user.id);
        const unreadCount = notifications.filter(n => !n.read).length;
        setUnreadNotifications((prevCount) => {
          // Only update if count actually changed
          if (prevCount !== unreadCount) {
            return unreadCount;
          }
          return prevCount;
        });
      }
    } catch (error) {
      console.error('Error loading unread count:', error);
      // Don't show error to user, just set count to 0
      setUnreadNotifications((prevCount) => {
        if (prevCount !== 0) {
          return 0;
        }
        return prevCount;
      });
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setUnreadNotifications(0);
      return;
    }

    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);


  // Auto-rotate news - only update if value actually changes
  useEffect(() => {
    if (newsArticles.length === 0) return;
    const interval = setInterval(() => {
      setCurrentNewsIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % newsArticles.length;
        return nextIndex !== prevIndex ? nextIndex : prevIndex;
      });
    }, 4000); // Rotate every 4 seconds
    return () => clearInterval(interval);
  }, [newsArticles.length]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
      {/* New Properties Modal */}
      <Modal
        visible={showNewPropModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNewPropModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: palette.overlay, justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: palette.surface, borderRadius: 24, padding: 24, marginHorizontal: 20, maxWidth: 400, borderWidth: 1, borderColor: palette.border, shadowColor: palette.shadow, shadowOpacity: 0.15, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 }}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View style={{ backgroundColor: palette.primarySoft, padding: 12, borderRadius: 999, marginBottom: 12 }}>
                <Text style={{ fontSize: 32 }}>🎉</Text>
              </View>
              <Text style={{ fontSize: 20, fontWeight: '700', color: palette.textPrimary, textAlign: 'center', fontFamily: 'Rubik-Bold' }}>
                New Properties Available!
              </Text>
              <Text style={{ fontSize: 14, fontFamily: 'Rubik-Regular', color: palette.textSecondary, textAlign: 'center', marginTop: 8 }}>
                {newPropertyCount} new properties have been added since your last visit.
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => setShowNewPropModal(false)}
                style={{ flex: 1, backgroundColor: palette.surfaceMuted, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: palette.border }}
              >
                <Text style={{ textAlign: 'center', fontWeight: '500', color: palette.textPrimary, fontFamily: 'Rubik-Medium' }}>
                  Dismiss
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setShowNewPropModal(false);
                  router.push('/explore');
                }}
                style={{ flex: 1, backgroundColor: palette.primary, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 16 }}
              >
                <Text style={{ textAlign: 'center', fontWeight: '500', color: palette.surface, fontFamily: 'Rubik-Medium' }}>
                  View All
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Notification Center */}
      <NotificationCenter
        visible={showNotificationCenter}
        onClose={() => {
          setShowNotificationCenter(false);
          loadUnreadCount(); // Refresh count when closing
        }}
      />

      {/* News Article Modal */}
      <Modal
        visible={showArticleModal}
        animationType="slide"
        onRequestClose={() => setShowArticleModal(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: palette.border }}>
            <TouchableOpacity onPress={() => setShowArticleModal(false)}>
              <Text style={{ color: palette.primary, fontWeight: '500', fontSize: 18, fontFamily: 'Rubik-Medium' }}>← Back</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: '700', color: palette.textPrimary, fontFamily: 'Rubik-Bold' }}>News Article</Text>
            <View style={{ width: 60 }} />
          </View>
          {selectedArticle && (
            <ScrollView
              style={{ flex: 1, paddingHorizontal: 20, paddingVertical: 16 }}
              contentContainerStyle={{ paddingBottom: 32 }}
              showsVerticalScrollIndicator={true}
            >
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 48, marginBottom: 16 }}>{selectedArticle.image}</Text>
                <Text style={{ fontSize: 24, fontWeight: '700', color: palette.textPrimary, marginBottom: 8, fontFamily: 'Rubik-Bold' }}>
                  {selectedArticle.title}
                </Text>
                <Text style={{ fontSize: 14, fontFamily: 'Rubik-Regular', color: palette.textSecondary, marginBottom: 16 }}>
                  {selectedArticle.date}
                  {selectedArticle.source ? ` · ${selectedArticle.source}` : ''}
                </Text>
              </View>
              <View style={{ marginBottom: 24 }}>
                {(selectedArticle.content || '')
                  .replace(/\s*\[\+\d+\s*chars\]\s*$/i, '')
                  .split('\n')
                  .map((paragraph: string, index: number) => {
                    if (paragraph.startsWith('# ')) {
                      return (
                        <Text key={index} style={{ fontSize: 24, fontWeight: '700', color: palette.textPrimary, marginBottom: 16, marginTop: 24, fontFamily: 'Rubik-Bold' }}>
                          {paragraph.replace('# ', '')}
                        </Text>
                      );
                    } else if (paragraph.startsWith('## ')) {
                      return (
                        <Text key={index} style={{ fontSize: 20, fontWeight: '700', color: palette.textPrimary, marginBottom: 12, marginTop: 16, fontFamily: 'Rubik-Bold' }}>
                          {paragraph.replace('## ', '')}
                        </Text>
                      );
                    } else if (paragraph.startsWith('### ')) {
                      return (
                        <Text key={index} style={{ fontSize: 18, fontWeight: '700', color: palette.textPrimary, marginBottom: 8, marginTop: 12, fontFamily: 'Rubik-Bold' }}>
                          {paragraph.replace('### ', '')}
                        </Text>
                      );
                    } else if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                      return (
                        <Text key={index} style={{ fontSize: 16, fontWeight: '700', color: palette.textPrimary, marginBottom: 8, fontFamily: 'Rubik-Bold' }}>
                          {paragraph.replace(/\*\*/g, '')}
                        </Text>
                      );
                    } else if (paragraph.startsWith('*') && paragraph.endsWith('*')) {
                      return (
                        <Text key={index} style={{ fontSize: 16, fontFamily: 'Rubik-Regular', fontStyle: 'italic', color: palette.textSecondary, marginBottom: 16, marginTop: 16 }}>
                          {paragraph.replace(/\*/g, '')}
                        </Text>
                      );
                    } else if (paragraph.startsWith('- ')) {
                      return (
                        <Text key={index} style={{ fontSize: 16, fontFamily: 'Rubik-Regular', color: palette.textSecondary, marginBottom: 4, marginLeft: 16 }}>
                          • {paragraph.replace('- ', '')}
                        </Text>
                      );
                    } else if (paragraph.trim() !== '') {
                      return (
                        <Text key={index} style={{ fontSize: 16, fontFamily: 'Rubik-Regular', color: palette.textSecondary, marginBottom: 12, lineHeight: 24 }}>
                          {paragraph}
                        </Text>
                      );
                    }
                    return null;
                  })}
              </View>
              {selectedArticle.url ? (
                <TouchableOpacity
                  onPress={() => {
                    try {
                      Linking.openURL(selectedArticle.url!);
                    } catch (_) { }
                  }}
                  style={{
                    marginTop: 8,
                    marginBottom: 24,
                    paddingVertical: 14,
                    paddingHorizontal: 20,
                    backgroundColor: palette.primary,
                    borderRadius: 12,
                    alignItems: 'center',
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: palette.surface, fontWeight: '600', fontSize: 16 }}>
                    Read full article
                  </Text>
                </TouchableOpacity>
              ) : null}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Announcement Modal */}
      <Modal
        visible={showAnnouncementModal && !!selectedAnnouncement}
        animationType="slide"
        onRequestClose={() => setShowAnnouncementModal(false)}
        transparent={false}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: palette.border }}>
            <TouchableOpacity onPress={() => setShowAnnouncementModal(false)}>
              <Text style={{ color: palette.primary, fontWeight: '500', fontSize: 18 }}>← Back</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: '700', color: palette.textPrimary }}>Announcement</Text>
            <View style={{ width: 60 }} />
          </View>
          {selectedAnnouncement && (
            <ScrollView
              style={{ flex: 1, paddingHorizontal: 20, paddingVertical: 16 }}
              contentContainerStyle={{ paddingBottom: 32 }}
              showsVerticalScrollIndicator={true}
            >
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 22, fontWeight: '700', color: palette.textPrimary, marginBottom: 8 }}>
                  {selectedAnnouncement.title}
                </Text>
                <Text style={{ fontSize: 14, color: palette.textMuted, marginBottom: 16 }}>
                  {formatRelativeTime(selectedAnnouncement.created_at)}
                </Text>
              </View>
              <Text style={{ fontSize: 16, color: palette.textSecondary, lineHeight: 24 }}>
                {selectedAnnouncement.message}
              </Text>
              {selectedAnnouncement.link && (
                <TouchableOpacity
                  onPress={() => {
                    try {
                      Linking.openURL(selectedAnnouncement.link!);
                    } catch (_) {}
                  }}
                  style={{
                    marginTop: 24,
                    paddingVertical: 12,
                    paddingHorizontal: 20,
                    backgroundColor: palette.primary,
                    borderRadius: 12,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: palette.surface, fontWeight: '600' }}>Open Link</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* View All Announcements Modal */}
      <Modal
        visible={showAllAnnouncementsModal}
        animationType="slide"
        onRequestClose={() => setShowAllAnnouncementsModal(false)}
        transparent={false}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: palette.border }}>
            <TouchableOpacity onPress={() => setShowAllAnnouncementsModal(false)}>
              <Text style={{ color: palette.primary, fontWeight: '500', fontSize: 18 }}>← Back</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: '700', color: palette.textPrimary }}>All Announcements</Text>
            <View style={{ width: 60 }} />
          </View>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
            showsVerticalScrollIndicator={true}
          >
            {announcements.length === 0 ? (
              <View style={{ alignItems: 'center', marginTop: 60, paddingHorizontal: 20 }}>
                <Text style={{ fontSize: 16, color: palette.textMuted, textAlign: 'center', marginBottom: 8 }}>
                  No announcements available
                </Text>
              </View>
            ) : (
              <View style={{ gap: 16 }}>
                {announcements.map((announcement) => (
                  <TouchableOpacity
                    key={announcement.id}
                    activeOpacity={0.9}
                    onPress={() => {
                      setSelectedAnnouncement(announcement);
                      setShowAllAnnouncementsModal(false);
                      setShowAnnouncementModal(true);
                    }}
                  >
                    <View
                      style={{
                        backgroundColor: palette.surfaceMuted,
                        borderRadius: 18,
                        padding: 16,
                        borderWidth: 1,
                        borderColor: palette.border,
                        shadowColor: palette.shadow,
                        shadowOpacity: 0.08,
                        shadowRadius: 10,
                        shadowOffset: { width: 0, height: 4 },
                        elevation: 3,
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: '600', color: palette.secondary, marginBottom: 6 }}>
                            Announcement
                          </Text>
                          <Text style={{ fontSize: 18, fontWeight: '700', color: palette.textPrimary, marginBottom: 8 }}>
                            {announcement.title}
                          </Text>
                        </View>
                        {announcement.priority > 0 && (
                          <View
                            style={{
                              backgroundColor: palette.primary,
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              borderRadius: 8,
                              marginLeft: 8,
                            }}
                          >
                            <Text style={{ fontSize: 11, color: palette.surface, fontWeight: '600' }}>
                              Priority {announcement.priority}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text
                        style={{ fontSize: 14, color: palette.textSecondary, marginBottom: 10, lineHeight: 20 }}
                        numberOfLines={3}
                        ellipsizeMode="tail"
                      >
                        {announcement.message}
                      </Text>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 12, color: palette.textMuted }}>
                          {formatRelativeTime(announcement.created_at)}
                        </Text>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: palette.primary,
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 999,
                          }}
                        >
                          <Text style={{ fontSize: 12, color: palette.surface, fontWeight: '600' }}>
                            View
                          </Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.primary} />
        }
        contentContainerStyle={{ paddingBottom: 128 }}
      >
        {/* Header Section */}
        <View style={{ paddingHorizontal: 20 }}>
          {/* Simple Header */}
          <View style={{ marginTop: 20, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: 20, padding: 16, shadowColor: palette.shadow, shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row' }}>
                {user?.avatar ? (
                  <Image source={{ uri: user.avatar }} style={{ width: 48, height: 48, borderRadius: 24 }} />
                ) : (
                  <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: palette.surfaceMuted, alignItems: 'center', justifyContent: 'center' }}>
                    <Image source={icons.person} style={{ width: 24, height: 24, tintColor: palette.textMuted }} />
                  </View>
                )}
                <View style={{ flexDirection: 'column', alignItems: 'flex-start', marginLeft: 12, justifyContent: 'center' }}>
                  <Text style={{ fontSize: 12, fontFamily: 'Rubik-Regular', color: palette.textSecondary }}>{`Good ${timeOfDay}`}</Text>
                  <Text style={{ fontSize: 16, fontWeight: '500', fontFamily: 'Rubik-Medium', color: palette.textPrimary }}>{user?.name || 'User'}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={handleNotificationPress} style={{ position: 'relative', backgroundColor: palette.surfaceMuted, borderWidth: 1, borderColor: palette.border, padding: 8, borderRadius: 999 }}>
                <Image source={icons.bell} style={{ width: 20, height: 20, tintColor: palette.textPrimary }} />
                {unreadNotifications > 0 && (
                  <View style={{ position: 'absolute', top: -4, right: -4, backgroundColor: palette.primary, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}>
                    <Text style={{ color: palette.surface, fontSize: 10, fontWeight: 'bold' }}>{unreadNotifications}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Announcements Section (below header) */}
        {announcements.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingHorizontal: 20 }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: palette.textPrimary, fontFamily: 'Rubik-Bold' }}>Announcements</Text>
              {announcements.length > 1 && (
                <TouchableOpacity onPress={() => setShowAllAnnouncementsModal(true)}>
                  <Text style={{ color: palette.primary, fontWeight: '500', fontFamily: 'Rubik-Medium' }}>View All</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={{ paddingHorizontal: 20 }}>
              {announcementsLoading ? (
                <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={palette.primary} />
                </View>
              ) : announcements.length > 0 ? (
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => {
                    setSelectedAnnouncement(announcements[0]);
                    setShowAnnouncementModal(true);
                  }}
                >
                  <View
                    style={{
                      backgroundColor: palette.surfaceMuted,
                      borderRadius: 18,
                      padding: 16,
                      borderWidth: 1,
                      borderColor: palette.border,
                      shadowColor: palette.shadow,
                      shadowOpacity: 0.08,
                      shadowRadius: 10,
                      shadowOffset: { width: 0, height: 4 },
                      elevation: 3,
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '600', color: palette.secondary, marginBottom: 6 }}>
                      Announcement
                    </Text>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: palette.textPrimary, marginBottom: 8 }}>
                      {announcements[0].title}
                    </Text>
                    <Text
                      style={{ fontSize: 14, color: palette.textSecondary, marginBottom: 10, lineHeight: 20 }}
                      numberOfLines={3}
                      ellipsizeMode="tail"
                    >
                      {announcements[0].message}
                    </Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 12, color: palette.textMuted }}>
                        {formatRelativeTime(announcements[0].created_at)}
                      </Text>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: palette.primary,
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 999,
                        }}
                      >
                        <Text style={{ fontSize: 12, color: palette.surface, fontWeight: '600' }}>
                          View
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        )}

        {/* Featured Section - Now outside of nested FlatList */}
        <FeaturedPropertiesSection
          loading={latestLoading}
          properties={memoizedLatestProperties}
          renderItem={renderFeaturedItem}
          keyExtractor={propertyKeyExtractor}
          listRef={featuredListRef}
          favoritesData={favorites}
        />

        {/* Newsletter Section */}
        <View style={{ marginTop: 32, marginBottom: 32 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingHorizontal: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: palette.textPrimary, fontFamily: 'Rubik-Bold' }}>Latest News</Text>
            <View style={{ flexDirection: 'row' }}>
              {newsArticles.map((_, index) => (
                <View
                  key={index}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    marginHorizontal: 4,
                    backgroundColor: index === currentNewsIndex ? palette.primary : palette.border,
                  }}
                />
              ))}
            </View>
          </View>
          {newsLoading ? (
            <View style={{ paddingHorizontal: 20, paddingVertical: 40 }}>
              <ActivityIndicator size="large" color={palette.primary} />
            </View>
          ) : newsArticles.length === 0 ? (
            <View style={{ paddingHorizontal: 20, paddingVertical: 40 }}>
              <Text style={{ color: palette.textMuted, textAlign: 'center' }}>No news available</Text>
            </View>
          ) : (
            <FlatList
              ref={newsScrollRef}
              data={newsArticles}
              horizontal
              pagingEnabled={false}
              showsHorizontalScrollIndicator={false}
              renderItem={renderNewsItem}
              keyExtractor={newsKeyExtractor}
              onScroll={(event) => {
                const itemWidth = screenWidth - 40; // Account for padding (20 on each side)
                const offsetX = event.nativeEvent.contentOffset.x;
                newsScrollX.current = offsetX;
                const index = Math.round(offsetX / itemWidth);
                const clampedIndex = Math.max(0, Math.min(index, newsArticles.length - 1));
                // Only update if index actually changed to prevent unnecessary re-renders
                setCurrentNewsIndex(prevIndex => {
                  if (prevIndex !== clampedIndex) {
                    return clampedIndex;
                  }
                  return prevIndex;
                });
              }}
              onMomentumScrollEnd={(event) => {
                const itemWidth = screenWidth - 40;
                const offsetX = event.nativeEvent.contentOffset.x;
                newsScrollX.current = offsetX;
                const index = Math.round(offsetX / itemWidth);
                const clampedIndex = Math.max(0, Math.min(index, newsArticles.length - 1));
                setCurrentNewsIndex(clampedIndex);
              }}
              onScrollEndDrag={(event) => {
                const itemWidth = screenWidth - 40;
                const offsetX = event.nativeEvent.contentOffset.x;
                newsScrollX.current = offsetX;
                const index = Math.round(offsetX / itemWidth);
                const clampedIndex = Math.max(0, Math.min(index, newsArticles.length - 1));
                setCurrentNewsIndex(clampedIndex);
              }}
              getItemLayout={(data, index) => {
                const itemWidth = screenWidth - 40; // Account for padding
                return {
                  length: itemWidth,
                  offset: itemWidth * index,
                  index,
                };
              }}
              scrollEnabled={true}
              nestedScrollEnabled={true}
              decelerationRate={0.9}
              snapToInterval={screenWidth - 40}
              snapToAlignment="start"
              contentContainerStyle={{ paddingHorizontal: 20 }}
              disableIntervalMomentum={false}
              scrollEventThrottle={16}
            />
          )}
        </View>

        {/* Recommendations Section */}
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: palette.textPrimary, fontFamily: 'Rubik-Bold', marginBottom: 12 }}>Our Recommendations</Text>
          <Filters
            initialValue={paramFilter || 'All'}
            onFilterChange={(value) => {
              try {
                router.setParams({ filter: value || undefined });
              } catch {
                // Silently handle navigation errors
              }
            }}
          />
        </View>

        {/* Properties Grid Section */}
        {loading ? (
          <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
            <ActivityIndicator size="large" color={palette.primary} />
          </View>
        ) : memoizedProperties.length === 0 ? (
          <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
            <NoResults />
          </View>
        ) : (
          <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              {memoizedProperties.map((item, index) => {
                const rendered = renderPropertyItem({ item, index });
                return rendered ? (
                  <View
                    key={propertyKeyExtractor(item)}
                    style={{
                      width: (screenWidth - 40 - 12) / 2, // 40 = padding (20*2), 12 = gap between cards
                      marginBottom: 16
                    }}
                  >
                    {rendered}
                  </View>
                ) : null;
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Mortgage Calculator Modal */}
      <MortgageCalculator
        visible={showMortgageCalculator}
        onClose={() => setShowMortgageCalculator(false)}
      />

      {/* Floating Action Button for Add Property */}
      {user && (
        <TouchableOpacity
          onPress={() => setShowAddPropertyModal(true)}
          style={{ position: 'absolute', bottom: 100, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: palette.primary, justifyContent: 'center', alignItems: 'center', shadowColor: palette.shadow, shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8, zIndex: 1000 }}
          activeOpacity={0.8}
        >
          <Image source={icons.edit} style={{ width: 24, height: 24, tintColor: palette.surface }} />
        </TouchableOpacity>
      )}

      {/* Add Property Modal */}
      {user && (
        <AddPropertyModal
          visible={showAddPropertyModal}
          onClose={() => setShowAddPropertyModal(false)}
          onPropertyAdded={() => {
            setShowAddPropertyModal(false);
            // Refresh properties
            fetchProperties();
            fetchLatest();
          }}
          ownerId={user.id}
        />
      )}
    </SafeAreaView>
  );
};

export default Home;