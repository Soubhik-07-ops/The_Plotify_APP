import {
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  View,
} from "react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card } from "@/components/Cards";
import NoResults from "@/components/NoResults";
import NotificationCenter from "@/components/NotificationCenter";
import SearchBar from "@/components/SearchBar";
import Filters from "@/components/Filters";
import BackButton from "@/components/ui/BackButton";
import Section from "@/components/ui/Section";
import { HeadingSmall } from "@/components/ui/Typography";
import { palette } from "@/constants/theme";
import {
  getProperties,
  type ExplorePropertyFilters,
  type Property,
} from "@/lib/supabase-db";
import { Ionicons } from "@expo/vector-icons";
import FilterPropertiesModal, {
  type ExploreFiltersState,
} from "@/components/FilterPropertiesModal";

const Explore = () => {
  const params = useLocalSearchParams<{ filter?: string; query?: string }>();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [searchQuery, setSearchQuery] = useState(params.query || "");
  const [categoryFilter, setCategoryFilter] = useState<string>(params.filter || "All");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState<ExploreFiltersState>({
    propertyMode: undefined,
    priceMin: undefined,
    priceMax: undefined,
    propertyType: undefined,
    bedrooms: undefined,
    bathrooms: undefined,
    amenities: [],
  });

  const hasActiveFilters = useMemo(() => {
    return Boolean(
      filters.propertyMode ||
        filters.propertyType ||
        filters.bedrooms ||
        filters.bathrooms ||
        (filters.amenities && filters.amenities.length > 0) ||
        filters.priceMin !== undefined ||
        filters.priceMax !== undefined
    );
  }, [filters]);

  const { minPrice, maxPrice } = useMemo(() => {
    if (!properties.length) {
      return { minPrice: 0, maxPrice: 100000000 };
    }

    let min = Number.POSITIVE_INFINITY;
    let max = 0;

    const getNumericPriceLocal = (price: string | number | null | undefined): number => {
      if (typeof price === "number") return price;
      if (!price) return 0;
      return parseFloat(String(price).replace(/[^0-9.]/g, "")) || 0;
    };

    for (const property of properties) {
      const value = getNumericPriceLocal(property.price);
      if (!value) continue;
      if (value < min) min = value;
      if (value > max) max = value;
    }

    if (!Number.isFinite(min) || min === 0) {
      min = 0;
    }
    if (max === 0) {
      max = 100000000;
    }

    return { minPrice: min, maxPrice: max };
  }, [properties]);

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    try {
      const supabaseFilters: ExplorePropertyFilters | undefined = (() => {
        const hasAnyFilter =
          filters.propertyMode ||
          filters.propertyType ||
          filters.bedrooms ||
          filters.bathrooms ||
          (filters.amenities && filters.amenities.length > 0) ||
          filters.priceMin !== undefined ||
          filters.priceMax !== undefined;

        if (!hasAnyFilter) return undefined;

        const purpose =
          filters.propertyMode === "rent"
            ? "rent"
            : filters.propertyMode === "buy"
            ? "sale"
            : undefined;

        return {
          purpose,
          minPrice: filters.priceMin,
          maxPrice: filters.priceMax,
          propertyType: filters.propertyType,
          bedrooms: filters.bedrooms,
          bathrooms: filters.bathrooms,
          amenities: filters.amenities,
        };
      })();

      const props = await getProperties(
        categoryFilter || "All",
        searchQuery || undefined,
        undefined,
        false,
        supabaseFilters
      );
      setProperties(props);
    } catch (error) {
      console.error("Error fetching properties:", error);
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, searchQuery, filters]);

  useEffect(() => {
    void fetchProperties();
  }, [fetchProperties]);

  const handleCardPress = useCallback((id: string) => {
    router.push(`/properties/${id}`);
  }, []);

  const renderCardItem = useCallback(({ item }: { item: Property }) => {
    return (
      <View style={{ width: "100%", marginBottom: 18 }}>
        <Card item={item} onPress={() => handleCardPress(String(item.id ?? ""))} />
      </View>
    );
  }, [handleCardPress]);

  const cardKeyExtractor = useCallback((item: Property) => String(item.id ?? ""), []);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
  }, []);

  const handleCategoryChange = useCallback(
    (value: string | undefined) => {
      const next = value || "All";
      setCategoryFilter(next);
      try {
        router.setParams({ filter: value || undefined, query: searchQuery || undefined });
      } catch {
        // ignore navigation errors
      }
    },
    [searchQuery]
  );

  const handleApplyFilters = useCallback((nextFilters: ExploreFiltersState) => {
    setFilters(nextFilters);
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters({
      propertyMode: undefined,
      priceMin: undefined,
      priceMax: undefined,
      propertyType: undefined,
      bedrooms: undefined,
      bathrooms: undefined,
      amenities: [],
    });
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
      <FlatList
        data={properties}
        numColumns={1}
        renderItem={renderCardItem}
        keyExtractor={cardKeyExtractor}
        contentContainerStyle={{ paddingBottom: 80, paddingTop: 12, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? (
            <View style={{ marginTop: 20, paddingHorizontal: 4 }}>
              {[1, 2, 3].map((key) => (
                <View
                  key={key}
                  style={{
                    width: "100%",
                    height: 210,
                    borderRadius: 18,
                    backgroundColor: palette.surfaceMuted,
                    marginBottom: 18,
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: palette.surface,
                      opacity: 0.6,
                    }}
                  />
                </View>
              ))}
            </View>
          ) : (
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                marginTop: 80,
                paddingHorizontal: 24,
              }}
            >
              <HeadingSmall
                style={{
                  marginBottom: 8,
                  textAlign: "center",
                }}
              >
                No properties found
              </HeadingSmall>
              <Section
                title=""
                subtitle="Try searching with different keywords."
                style={{ marginTop: 0 }}
              />
            </View>
          )
        }
        ListHeaderComponent={useMemo(() => {
          const HeaderComponent = () => (
            <View style={{ paddingHorizontal: 20 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 12,
                  columnGap: 12,
                  paddingVertical: 12,
                }}
              >
                <BackButton />

                <HeadingSmall
                  numberOfLines={1}
                  style={{
                    flex: 1,
                    textAlign: "center",
                  }}
                >
                  Explore Properties
                </HeadingSmall>

                <TouchableOpacity
                  onPress={() => setShowNotificationCenter(true)}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: palette.surfaceMuted,
                    borderWidth: 1,
                    borderColor: palette.border,
                  }}
                >
                  <Ionicons name="notifications-outline" size={20} color={palette.textMuted} />
                </TouchableOpacity>
              </View>

              <SearchBar
                value={searchQuery}
                onChange={handleSearchChange}
                rightElement={
                  <TouchableOpacity
                    onPress={() => setShowFilterModal(true)}
                    style={{
                      marginLeft: 8,
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: hasActiveFilters ? palette.primary : palette.surface,
                      borderWidth: 1,
                      borderColor: hasActiveFilters ? palette.primary : palette.border,
                      position: "relative",
                    }}
                  >
                    <Ionicons
                      name="options-outline"
                      size={18}
                      color={hasActiveFilters ? palette.surface : palette.textMuted}
                    />
                    {hasActiveFilters ? (
                      <View
                        style={{
                          position: "absolute",
                          top: 4,
                          right: 4,
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: palette.surface,
                        }}
                      />
                    ) : null}
                  </TouchableOpacity>
                }
              />

              <View style={{ marginTop: 20 }}>
                <Filters
                  initialValue={categoryFilter || "All"}
                  onFilterChange={handleCategoryChange}
                />

                <Section
                  title={`Found ${properties.length} Properties`}
                  subtitle="Refined, premium listings tailored to your selected filters."
                  style={{ marginTop: 20, marginBottom: 8 }}
                />
              </View>
            </View>
          );
          HeaderComponent.displayName = "ExploreHeader";
          return HeaderComponent;
        }, [categoryFilter, handleCategoryChange, handleSearchChange, properties.length, searchQuery])}
      />

      <NotificationCenter
        visible={showNotificationCenter}
        onClose={() => setShowNotificationCenter(false)}
      />

      <FilterPropertiesModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        initialFilters={filters}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
        minimumPrice={minPrice}
        maximumPrice={maxPrice}
      />
    </SafeAreaView>
  );
};

export default Explore;
