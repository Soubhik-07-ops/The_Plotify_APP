import { useEffect, useLayoutEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  ScrollView,
  Share,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import Button from "@/components/ui/Button";
import AppText from "@/components/ui/AppText";
import BackButton from "@/components/ui/BackButton";
import Card from "@/components/ui/Card";
import Chip from "@/components/ui/Chip";
import Section from "@/components/ui/Section";
import { Body, BodyMuted, HeadingMedium, HeadingSmall } from "@/components/ui/Typography";
import {
  AnimatedModal,
  AnimatedSkeleton,
} from "@/components/AnimatedComponents";
import icons from "@/constants/icons";
import { palette, spacing } from "@/constants/theme";
import { formatPriceINR } from "@/lib/formatters";
import { useGlobalContext } from "@/lib/global-provider";
import { getPropertyById, type Property } from "@/lib/supabase-db";
import MortgageCalculator from "@/components/MortgageCalculator";
import PropertyReviews from "@/components/PropertyReviews";

const { width } = Dimensions.get("window");

export default function PropertyDetail() {
  const { id } = useLocalSearchParams();
  const navigation = useNavigation();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const { favorites, addFavorite, removeFavorite } = useGlobalContext();
  const [showMortgageCalculator, setShowMortgageCalculator] = useState(false);
  const [showPropertyReviews, setShowPropertyReviews] = useState(false);

  const headerOpacity = useSharedValue(1);
  const contentOpacity = useSharedValue(1);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getPropertyById(id as string)
      .then((data) => {
        setProperty(data);
        setError(null);
        headerOpacity.value = 1;
        contentOpacity.value = 1;
      })
      .catch(() => {
        setError("Failed to load property");
        setProperty(null);
      })
      .finally(() => setLoading(false));
  }, [contentOpacity, headerOpacity, id]);

  const isFavorited = property?.id ? favorites.includes(String(property.id)) : false;

  useLayoutEffect(() => {
    if (!property) {
      navigation.setOptions({
        title: "Property Details",
        headerRight: undefined,
      });
      return;
    }

    navigation.setOptions({
      title: "",
      headerTitleAlign: "left",
      headerBackVisible: false,
      headerLeftContainerStyle: { paddingLeft: spacing.sm },
      headerTitleContainerStyle: { left: 48, right: 64 },
      headerLeft: () => <BackButton />,
      headerTitle: () => (
        <AppText
          numberOfLines={1}
          style={{ color: palette.textPrimary, fontSize: 18, fontWeight: "700", marginLeft: 20 }}
          weight="bold"
        >
          {property.name || "Property Details"}
        </AppText>
      ),
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
          style={{ marginRight: spacing.lg }}
        >
          <Ionicons
            name={isFavorited ? "heart" : "heart-outline"}
            size={24}
            color={isFavorited ? palette.danger : palette.textPrimary}
          />
        </TouchableOpacity>
      ),
    });
  }, [addFavorite, isFavorited, navigation, property, removeFavorite]);

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  const handleShareProperty = async () => {
    if (!property) return;
    try {
      await Share.share({
        message: `Check out this property: ${property.name}\n\n${property.address}\nPrice: ${property.price}`,
        title: property.name,
      });
    } catch (shareError) {
      console.error("Error sharing property:", shareError);
      Alert.alert("Error", "Failed to share property. Please try again.");
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <AnimatedSkeleton width={width - 40} height={320} style={{ borderRadius: 24, marginBottom: 20 }} />
        <AnimatedSkeleton width={width - 40} height={220} style={{ borderRadius: 16, marginBottom: 16 }} />
        <AnimatedSkeleton width={width - 40} height={180} style={{ borderRadius: 16 }} />
      </View>
    );
  }

  if (error || !property) {
    return (
      <View style={styles.centered}>
        <HeadingSmall style={{ marginBottom: spacing.sm }}>
          {error || "Property not found."}
        </HeadingSmall>
        <BodyMuted align="center">
          Try returning to the property list and opening the listing again.
        </BodyMuted>
      </View>
    );
  }

  const cleanedDescription = property.description
    ? property.description
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/`(.*?)`/g, "$1")
      .trim()
    : "No description available";

  return (
    <ScrollView style={{ flex: 1, backgroundColor: palette.background }} contentContainerStyle={{ paddingBottom: spacing["4xl"] }}>
      <Animated.View style={headerAnimatedStyle}>
        <View style={styles.galleryContainer}>
          <FlatList
            data={property.gallery && property.gallery.length > 0 ? property.gallery : [{ id: "fallback", image: property.image }]}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, index) => item.id || String(index)}
            renderItem={({ item }) => (
              <Image
                source={{ uri: item.image || "https://via.placeholder.com/400x300?text=No+Image" }}
                style={styles.galleryImage}
                resizeMode="cover"
                defaultSource={require("@/assets/images/no-result.png")}
              />
            )}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / width);
              setGalleryIndex(index);
            }}
          />
          <LinearGradient colors={["transparent", "rgba(20,18,14,0.82)"]} style={styles.headerOverlay} />
          <View style={styles.headerContent}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: spacing.sm }}>
              <Chip label={property.type || "Property"} compact />
            </View>
            <HeadingMedium style={{ color: palette.surface, marginBottom: spacing.xs }}>
              {property.name}
            </HeadingMedium>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: spacing.sm }}>
              <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.76)" />
              <BodyMuted style={{ color: "rgba(255,255,255,0.82)", marginLeft: 6 }}>
                {property.address || "No address provided"}
              </BodyMuted>
            </View>
            <HeadingSmall style={{ color: palette.surface }}>
              {formatPriceINR(property.price)}
            </HeadingSmall>
          </View>
          <View style={styles.dotsRow}>
            {(property.gallery && property.gallery.length > 0 ? property.gallery : [property]).map((_, index) => (
              <View
                key={String(index)}
                style={[
                  styles.dot,
                  { backgroundColor: galleryIndex === index ? palette.surface : "rgba(255,255,255,0.4)" },
                ]}
              />
            ))}
          </View>
        </View>
      </Animated.View>

      <Animated.View style={[styles.contentContainer, contentAnimatedStyle]}>
        <View style={styles.quickActions}>
          <Button onPress={() => setShowMortgageCalculator(true)} style={{ flex: 1, marginRight: spacing.sm }}>
            <Ionicons name="calculator-outline" size={18} color={palette.surface} style={{ marginRight: 8 }} />
            <Body style={{ color: palette.surface }}>Mortgage</Body>
          </Button>
          <Button onPress={() => setShowPropertyReviews(true)} variant="secondary" style={{ flex: 1, marginLeft: spacing.sm }}>
            <Ionicons name="star-outline" size={18} color={palette.textPrimary} style={{ marginRight: 8 }} />
            <Body>Reviews</Body>
          </Button>
        </View>

        <Section title="Property Details" subtitle="Clean summary cards for the most important listing information.">
          <View style={styles.detailsGrid}>
            <InfoCard icon={icons.home} label={`Property Type: ${property.type || "N/A"}`} />
            <InfoCard icon={icons.bed} label={`${property.bedrooms} Bedrooms`} />
            <InfoCard icon={icons.bath} label={`${property.bathrooms} Bathrooms`} />
            <InfoCard icon={icons.area} label={`${property.area} sq ft`} />
            <InfoCard icon={icons.location} label={property.address || "No address provided"} fullWidth />
          </View>
        </Section>

        <Section title="Description">
          <Card>
            <Body style={{ lineHeight: 24 }}>{cleanedDescription}</Body>
          </Card>
        </Section>

        {property.facilities && property.facilities.length > 0 ? (
          <Section title="Facilities" subtitle="Amenities presented as lightweight chips for fast scanning.">
            <View style={styles.facilitiesWrap}>
              {property.facilities.map((facility, index) => (
                <Chip key={`${facility}-${index}`} label={facility} compact style={{ marginRight: 8, marginBottom: 8 }} />
              ))}
            </View>
          </Section>
        ) : null}

        <Section title="Actions">
          <Button onPress={handleShareProperty} variant="secondary">
            <Ionicons name="share-social-outline" size={18} color={palette.textPrimary} style={{ marginRight: 8 }} />
            <Body>Share Property</Body>
          </Button>
        </Section>
      </Animated.View>

      <AnimatedModal visible={showMortgageCalculator} onClose={() => setShowMortgageCalculator(false)}>
        <MortgageCalculator visible={showMortgageCalculator} onClose={() => setShowMortgageCalculator(false)} />
      </AnimatedModal>

      <AnimatedModal visible={showPropertyReviews} onClose={() => setShowPropertyReviews(false)}>
        <PropertyReviews
          visible={showPropertyReviews}
          onClose={() => setShowPropertyReviews(false)}
          property={property}
          onReviewAdded={() => {
            void getPropertyById(String(property.id!)).then(setProperty);
          }}
        />
      </AnimatedModal>
    </ScrollView>
  );
}

function InfoCard({
  icon,
  label,
  fullWidth,
}: {
  icon: any;
  label: string;
  fullWidth?: boolean;
}) {
  return (
    <Card style={{ width: fullWidth ? "100%" : "48%", marginBottom: spacing.md }}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Image source={icon} style={{ width: 20, height: 20, marginRight: 8, tintColor: palette.primary }} />
        <Body style={{ flex: 1 }}>{label}</Body>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    backgroundColor: palette.background,
  },
  galleryContainer: {
    width: "100%",
    height: 320,
    marginBottom: spacing.lg,
    position: "relative",
  },
  galleryImage: {
    width,
    height: 320,
  },
  headerOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 160,
  },
  headerContent: {
    position: "absolute",
    left: spacing.xl,
    right: spacing.xl,
    bottom: spacing.xl,
  },
  dotsRow: {
    position: "absolute",
    bottom: spacing.sm,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  contentContainer: {
    paddingHorizontal: spacing.xl,
  },
  quickActions: {
    flexDirection: "row",
    marginBottom: spacing["2xl"],
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  facilitiesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
});
