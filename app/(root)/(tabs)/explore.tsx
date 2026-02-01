import {
  ActivityIndicator,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useEffect, useState, useCallback, useMemo } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import icons from "@/constants/icons";
import { Card } from "@/components/Cards";
import Filters from "@/components/Filters";
import NoResults from "@/components/NoResults";
import SearchBar from "@/components/SearchBar";

import { getProperties } from "@/lib/supabase-db";
import type { Property } from '@/lib/supabase-db';
import NotificationCenter from "@/components/NotificationCenter";
import { useGlobalContext } from "@/lib/global-provider";
import { palette } from "@/constants/theme";

const Explore = () => {
  const { user } = useGlobalContext();
  const params = useLocalSearchParams<{ filter?: string; query?: string }>();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [searchQuery, setSearchQuery] = useState(params.query || '');

  const fetchProperties = async () => {
    setLoading(true);
    console.log('🔍 Fetching properties for explore with filter:', params.filter, 'query:', searchQuery);
    try {
      // Always fetch all properties first, then filter client-side for accuracy
      // This ensures filters work correctly regardless of server-side filtering issues
      let props = await getProperties('All', searchQuery || undefined, undefined, false); // includeSold = false

      // Apply client-side filtering based on selected filter
      if (params.filter && params.filter !== 'All') {
        const filterValue = params.filter; // Keep original case for exact matching
        const filterLower = filterValue.toLowerCase();

        props = props.filter(property => {
          // Check if property type matches exactly (case-insensitive)
          if (property.type && property.type.toLowerCase() === filterLower) {
            return true;
          }

          // Check if facilities/categories array contains the filter (exact match, case-insensitive)
          if (property.facilities && Array.isArray(property.facilities)) {
            const hasMatch = property.facilities.some(cat => {
              if (!cat) return false;
              const catStr = String(cat);
              // Exact match (case-insensitive)
              if (catStr.toLowerCase() === filterLower) {
                return true;
              }
              // Also check if category contains the filter word (for partial matches)
              if (catStr.toLowerCase().includes(filterLower)) {
                return true;
              }
              return false;
            });
            if (hasMatch) return true;
          }

          return false;
        });
        console.log('🔍 After client-side filtering:', props.length, 'properties match filter:', params.filter);
      }

      console.log('📊 Fetched properties for explore:', props.length, 'properties');
      setProperties(props);
    } catch (error) {
      console.error('Error fetching properties:', error);
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.filter, searchQuery]);

  const handleCardPress = useCallback((id: string) => {
    console.log('Navigating to property detail with id:', id);
    router.push(`/properties/${id}`);
  }, []);

  const renderCardItem = useCallback(({ item }: { item: Property }) => {
    return <Card item={item} onPress={() => handleCardPress(String(item.id ?? ''))} />;
  }, [handleCardPress]);

  const cardKeyExtractor = useCallback((item: Property) => String(item.id ?? ''), []);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
      <FlatList
        data={properties}
        numColumns={2}
        renderItem={renderCardItem}
        keyExtractor={cardKeyExtractor}
        contentContainerStyle={{ paddingBottom: 128, paddingTop: 12 }}
        columnWrapperStyle={{ gap: 20, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? (
            <View style={{ marginTop: 20 }}>
              <ActivityIndicator size="large" color={palette.primary} />
            </View>
          ) : (
            <NoResults />
          )
        }
        ListHeaderComponent={useMemo(() => {
          const HeaderComponent = () => (
            <View style={{ paddingHorizontal: 20 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 12,
                  columnGap: 12,
                }}
              >
                <TouchableOpacity
                  onPress={() => router.back()}
                  style={{
                    flexDirection: 'row',
                    backgroundColor: palette.surfaceMuted,
                    borderRadius: 22,
                    width: 44,
                    height: 44,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: palette.border,
                    flexShrink: 0,
                  }}
                >
                  <Image source={icons.backArrow} style={{ width: 20, height: 20, tintColor: palette.textPrimary }} />
                </TouchableOpacity>

                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.9}
                  style={{
                    flex: 1,
                    fontSize: 16,
                    textAlign: 'center',
                    fontWeight: '500',
                    color: palette.textPrimary,
                  }}
                >
                  Search for Your Ideal Home
                </Text>

                <TouchableOpacity
                  onPress={() => setShowNotificationCenter(true)}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: palette.surfaceMuted,
                    borderWidth: 1,
                    borderColor: palette.border,
                    flexShrink: 0,
                  }}
                >
                  <Image source={icons.bell} style={{ width: 20, height: 20, tintColor: palette.textMuted }} />
                </TouchableOpacity>
              </View>

              <SearchBar
                value={searchQuery}
                onChange={handleSearchChange}
              />

              <View style={{ marginTop: 20 }}>
                <Filters
                  initialValue={params.filter || 'All'}
                  onFilterChange={(value) => {
                    try {
                      // Update params to trigger re-fetch via useEffect
                      router.setParams({ filter: value || undefined });
                    } catch (error) {
                      console.error('Error updating filter:', error);
                    }
                  }}
                />

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 8 }}>
                  <Text style={{ fontSize: 20, fontWeight: 'bold', color: palette.textPrimary }}>
                    Found {properties?.length} Properties
                  </Text>
                </View>
              </View>
            </View>
          );
          HeaderComponent.displayName = 'ExploreHeader';
          return HeaderComponent;
        }, [user, properties?.length, params.filter])}
      />

      {/* Notification Center */}
      <NotificationCenter
        visible={showNotificationCenter}
        onClose={() => setShowNotificationCenter(false)}
      />
    </SafeAreaView>
  );
};

export default Explore;
