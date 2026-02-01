// app/properties/[id].tsx
import { useEffect, useState, useLayoutEffect } from "react";
import { Text, View, ScrollView, Image, StyleSheet, Dimensions, FlatList, TouchableOpacity, Share, Alert } from "react-native";
import { useLocalSearchParams, router, useNavigation } from "expo-router";
import { getPropertyById, Property, addReviewToProperty } from "@/lib/supabase-db";
import icons from "@/constants/icons";
import { useGlobalContext } from '@/lib/global-provider';
import MortgageCalculator from "@/components/MortgageCalculator";
import PropertyReviews from "@/components/PropertyReviews";
import {
  AnimatedSkeleton,
  AnimatedButton,
  AnimatedModal
} from "@/components/AnimatedComponents";
import Animated, {
  useSharedValue,
  useAnimatedStyle
} from 'react-native-reanimated';
import { palette } from "@/constants/theme";
import { formatPriceINR } from '@/lib/formatters';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get("window");

export default function PropertyDetail() {
  const { id } = useLocalSearchParams();
  const navigation = useNavigation();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const { user, favorites, addFavorite, removeFavorite } = useGlobalContext();
  const [showMortgageCalculator, setShowMortgageCalculator] = useState(false);
  const [showPropertyReviews, setShowPropertyReviews] = useState(false);
  const [showPropertySharing, setShowPropertySharing] = useState(false);

  // Animation values
  const headerOpacity = useSharedValue(1); // No fade-in
  const headerTranslateY = useSharedValue(0); // No slide
  const contentOpacity = useSharedValue(1); // No fade-in
  const contentTranslateY = useSharedValue(0); // No slide

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getPropertyById(id as string)
      .then((data) => {
        setProperty(data);
        setError(null);
        // Remove heavy animations for mobile
        headerOpacity.value = 1;
        headerTranslateY.value = 0;
        contentOpacity.value = 1;
        contentTranslateY.value = 0;
      })
      .catch(() => {
        setError("Failed to load property");
        setProperty(null);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Update navigation header title and add favorite button when property loads
  useLayoutEffect(() => {
    if (!property) {
      navigation.setOptions({
        title: 'Property Details',
        headerRight: undefined,
      });
      return;
    }

    const isFavorited = property.id ? favorites.includes(String(property.id)) : false;
    
    navigation.setOptions({
      title: property.name || 'Property Details',
      headerRight: () => (
        <TouchableOpacity
          onPress={() => {
            if (!property.id) return;
            const propertyId = String(property.id);
            if (isFavorited) {
              removeFavorite(propertyId);
            } else {
              addFavorite(propertyId);
            }
          }}
          style={{ marginRight: 16 }}
        >
          <Image
            source={icons.heart}
            style={{
              width: 24,
              height: 24,
              tintColor: isFavorited ? '#FF3B30' : '#000',
            }}
          />
        </TouchableOpacity>
      ),
    });
  }, [property?.name, property?.id, favorites, navigation, addFavorite, removeFavorite]);

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslateY.value }],
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  if (loading) {
    return (
      <View style={styles.centered}>
        <AnimatedSkeleton width={width - 40} height={300} style={{ borderRadius: 20, marginBottom: 20 }} />
        <AnimatedSkeleton width={width - 40} height={200} style={{ borderRadius: 16, marginBottom: 16 }} />
        <AnimatedSkeleton width={width - 40} height={150} style={{ borderRadius: 16 }} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text>{error}</Text>
      </View>
    );
  }

  if (!property) {
    return (
      <View style={styles.centered}>
        <Text>Property not found.</Text>
      </View>
    );
  }

  // Check if property is favorited
  const isFavorited = property && property.id ? favorites.includes(String(property.id)) : false;

  const handleFavoritePress = () => {
    if (!property.id) return;
    const propertyId = String(property.id);
    if (isFavorited) {
      removeFavorite(propertyId);
    } else {
      addFavorite(propertyId);
    }
  };

  const handleShareProperty = async () => {
    if (!property) return;

    try {
      const shareMessage = `Check out this property: ${property.name}\n\n${property.address}\nPrice: ${property.price}\n\nI thought you might be interested in this property!`;

      await Share.share({
        message: shareMessage,
        title: property.name,
      });
    } catch (error) {
      console.error('Error sharing property:', error);
      Alert.alert('Error', 'Failed to share property. Please try again.');
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: palette.background }}>
      {/* Property Gallery (Multiple Photos) */}
      {property.gallery && property.gallery.length > 0 && (
        <View style={{ width: '100%', height: 260, marginBottom: 8, position: 'relative' }}>
          <FlatList
            data={property.gallery}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, idx) => item.id || idx.toString()}
            renderItem={({ item }) => (
              <Image
                source={{ uri: item.image || 'https://via.placeholder.com/400x300?text=No+Image' }}
                style={{ width, height: 260, resizeMode: 'cover' }}
                onError={(e) => {
                  console.error('Image load error:', item.image);
                }}
                defaultSource={require('@/assets/images/no-result.png')}
              />
            )}
            onMomentumScrollEnd={e => {
              const index = Math.round(e.nativeEvent.contentOffset.x / width);
              setGalleryIndex(index);
            }}
          />
          {/* Gradient Overlay */}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.7)"]}
            style={styles.headerOverlay}
          />
          {/* Property Title and Price */}
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>{property.name}</Text>
            <Text style={styles.headerPrice}>{formatPriceINR(property.price)}</Text>
          </View>
          {/* Dots indicator */}
          <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 8, position: 'absolute', bottom: 10, left: 0, right: 0 }}>
            {property.gallery.map((_, idx) => (
              <View
                key={idx}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  marginHorizontal: 4,
                  backgroundColor: galleryIndex === idx ? palette.primary : palette.textMuted,
                }}
              />
            ))}
          </View>
        </View>
      )}
      {/* Header Image with Overlay (fallback if no gallery) */}
      {(!property.gallery || property.gallery.length === 0) && (
        <Animated.View style={[styles.headerImageContainer, headerAnimatedStyle]}>
          <Image
            source={{ uri: property.image || 'https://via.placeholder.com/400x300?text=No+Image' }}
            style={styles.headerImage}
            onError={(e) => {
              console.error('Image load error:', property.image);
            }}
            defaultSource={require('@/assets/images/no-result.png')}
          />
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.7)"]}
            style={styles.headerOverlay}
          />
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>{property.name}</Text>
            <Text style={styles.headerPrice}>{formatPriceINR(property.price)}</Text>
          </View>
        </Animated.View>
      )}
      {/* Content */}
      <Animated.View style={[styles.contentContainer, contentAnimatedStyle]}>
        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <AnimatedButton
            onPress={() => setShowMortgageCalculator(true)}
            variant="primary"
            style={{ flex: 1, marginRight: 8 }}
          >
            <Text style={{ color: palette.surface, fontWeight: 'bold', marginRight: 8 }}>💰</Text>
            <Text style={{ color: palette.surface, fontWeight: 'bold' }}>Calculate Mortgage</Text>
          </AnimatedButton>

          <AnimatedButton
            onPress={() => setShowPropertyReviews(true)}
            variant="secondary"
            style={{ flex: 1, marginLeft: 8 }}
          >
            <Text style={{ fontWeight: 'bold', marginRight: 8 }}>⭐</Text>
            <Text style={{ fontWeight: 'bold' }}>Reviews</Text>
          </AnimatedButton>
        </View>

        {/* Property Details */}
        <View style={styles.section}>
          <SectionTitle title="Property Details" />
          <View style={styles.detailsGrid}>
            <InfoItem icon={icons.home} label={`Property Type: ${property.type || 'N/A'}`} />
            <InfoItem icon={icons.bed} label={`${property.bedrooms} Bedrooms`} />
            <InfoItem icon={icons.bath} label={`${property.bathrooms} Bathrooms`} />
            <InfoItem icon={icons.area} label={`${property.area} sq ft`} />
            <InfoItem icon={icons.location} label={property.address} />
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <SectionTitle title="Description" />
          <Text style={styles.description}>
            {property.description
              ? property.description
                .replace(/<[^>]*>/g, '') // Remove HTML tags
                .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
                .replace(/&amp;/g, '&') // Replace &amp; with &
                .replace(/&lt;/g, '<') // Replace &lt; with <
                .replace(/&gt;/g, '>') // Replace &gt; with >
                .replace(/&quot;/g, '"') // Replace &quot; with "
                .replace(/&#39;/g, "'") // Replace &#39; with '
                .replace(/\*\*(.*?)\*\*/g, '$1') // Remove markdown bold
                .replace(/\*(.*?)\*/g, '$1') // Remove markdown italic
                .replace(/`(.*?)`/g, '$1') // Remove markdown code
                .trim()
              : 'No description available'}
          </Text>
        </View>

        {/* Facilities */}
        {property.facilities && property.facilities.length > 0 && (
          <View style={styles.section}>
            <SectionTitle title="Facilities" />
            <View style={styles.amenitiesGrid}>
              {property.facilities.map((facility, index) => (
                <View key={index} style={styles.amenityItem}>
                  <Text style={styles.amenityText}>{facility}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Share */}
        <View style={styles.section}>
          <SectionTitle title="Share" />
          <View style={styles.socialButtons}>
            <AnimatedButton
              onPress={handleShareProperty}
              variant="outline"
              style={{ flex: 1 }}
            >
              <Text style={{ color: palette.secondary, fontWeight: 'bold' }}>Share Property</Text>
            </AnimatedButton>
          </View>
        </View>
      </Animated.View>

      {/* Modals */}
      <AnimatedModal
        visible={showMortgageCalculator}
        onClose={() => setShowMortgageCalculator(false)}
      >
        <MortgageCalculator
          visible={showMortgageCalculator}
          onClose={() => setShowMortgageCalculator(false)}
        />
      </AnimatedModal>

      <AnimatedModal
        visible={showPropertyReviews}
        onClose={() => setShowPropertyReviews(false)}
      >
        <PropertyReviews
          visible={showPropertyReviews}
          onClose={() => setShowPropertyReviews(false)}
          property={property}
          onReviewAdded={() => {
            // Refresh property data to show new review
            getPropertyById(String(property.id!)).then(setProperty);
          }}
        />
      </AnimatedModal>

      {/* Property sharing now uses simple OS share sheet directly from the page (no extra modal). */}
    </ScrollView>
  );
}

function InfoItem({ icon, label }: { icon: any; label: string }) {
  return (
    <View style={styles.infoItem}>
      <Image source={icon} style={styles.infoIcon} />
      <Text style={styles.infoLabel}>{label}</Text>
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <Text style={styles.sectionTitle}>{title}</Text>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerImageContainer: {
    position: 'relative',
    height: 300,
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  headerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  headerTextContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: palette.surface,
    marginBottom: 8,
  },
  headerPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: palette.surface,
  },
  contentContainer: {
    padding: 20,
    backgroundColor: palette.surface,
  },
  quickActions: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: palette.textPrimary,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  infoItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surfaceMuted,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: palette.shadow,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    borderWidth: 1,
    borderColor: palette.border,
  },
  infoIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
    tintColor: palette.primary,
  },
  infoLabel: {
    fontSize: 14,
    color: palette.textPrimary,
    flex: 1,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: palette.textPrimary,
    backgroundColor: palette.surfaceMuted,
    padding: 16,
    borderRadius: 12,
    shadowColor: palette.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    borderWidth: 1,
    borderColor: palette.border,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  amenityItem: {
    backgroundColor: palette.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    shadowColor: palette.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    borderWidth: 1,
    borderColor: palette.border,
  },
  amenityText: {
    fontSize: 14,
    color: palette.textPrimary,
  },
  socialButtons: {
    flexDirection: 'row',
  },
});
