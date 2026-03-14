import React, { memo, useCallback, useMemo } from "react";
import { Image, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import AppText from "@/components/ui/AppText";
import { BodyMuted, Caption, HeadingSmall } from "@/components/ui/Typography";
import CardShell from "@/components/ui/Card";
import { palette, shadows, spacing } from "@/constants/theme";
import { formatPriceINR } from "@/lib/formatters";
import { useGlobalContext } from "@/lib/global-provider";
import { getAverageRating, type Property } from "@/lib/supabase-db";

interface Props {
  item: Property;
  onPress?: () => void;
  index?: number;
}

const FavoriteButton = ({
  isFavorited,
  onPress,
}: {
  isFavorited: boolean;
  onPress: (event: any) => void;
}) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.8}
    style={{
      position: "absolute",
      top: 12,
      right: 12,
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255,255,255,0.96)",
      ...shadows.card,
    }}
  >
    <Ionicons
      name={isFavorited ? "heart" : "heart-outline"}
      size={18}
      color={isFavorited ? palette.danger : palette.textPrimary}
    />
  </TouchableOpacity>
);

const PropertyTypeBadge = ({ label }: { label: string }) => (
  <View
    style={{
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: "rgba(255,255,255,0.92)",
      alignSelf: "flex-start",
    }}
  >
    <Caption style={{ color: palette.textPrimary }}>{label}</Caption>
  </View>
);

const RatingBadge = ({ item, rating }: { item: Property; rating: number }) => (
  <View
    style={{
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 999,
      backgroundColor: "rgba(255,255,255,0.92)",
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
    }}
  >
    <Ionicons name="star" size={12} color={palette.primary} />
    <Caption style={{ marginLeft: 4, color: palette.textPrimary }}>
      {item.reviews?.length ? `${Math.round(rating)} / 5` : "New"}
    </Caption>
  </View>
);

export const FeaturedCard = memo((props: Props) => <Card {...props} />);

FeaturedCard.displayName = "FeaturedCard";

export const Card = memo(({ item, onPress }: Props) => {
  const avgRating = useMemo(() => getAverageRating(item), [item]);
  const { favorites, addFavorite, removeFavorite } = useGlobalContext();
  const isFavorited = useMemo(
    () => (item.id ? favorites.includes(String(item.id)) : false),
    [favorites, item.id]
  );

  const handleFavoritePress = useCallback(
    (event: any) => {
      event.stopPropagation();
      if (!item.id) return;
      const itemId = String(item.id);
      if (isFavorited) {
        removeFavorite(itemId);
      } else {
        addFavorite(itemId);
      }
    },
    [addFavorite, isFavorited, item.id, removeFavorite]
  );

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.92} style={{ width: "100%" }}>
      <CardShell
        padded={false}
        style={{
          width: "100%",
          borderRadius: 18,
          overflow: "hidden",
          backgroundColor: palette.surface,
          ...shadows.card,
        }}
      >
        <View style={{ position: "relative" }}>
          <Image
            source={{ uri: item.image || "https://via.placeholder.com/400x300?text=No+Image" }}
            style={{ width: "100%", height: 210 }}
            resizeMode="cover"
          />
          <LinearGradient
            colors={["transparent", "rgba(20,18,14,0.7)"]}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: 112,
            }}
          />
          <View style={{ position: "absolute", top: 12, left: 12 }}>
            <PropertyTypeBadge label={item.type || "Property"} />
          </View>
          <FavoriteButton isFavorited={isFavorited} onPress={handleFavoritePress} />
          <View style={{ position: "absolute", bottom: 14, left: 16, right: 16 }}>
            <HeadingSmall
              numberOfLines={1}
              style={{ color: palette.surface, marginBottom: 4 }}
            >
              {item.name}
            </HeadingSmall>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.74)" />
              <BodyMuted
                numberOfLines={1}
                style={{ color: "rgba(255,255,255,0.84)", marginLeft: 6 }}
              >
                {item.address || "No address provided"}
              </BodyMuted>
            </View>
          </View>
        </View>
        <View style={{ padding: spacing.lg }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <AppText
              style={{ color: palette.primary, flex: 1, marginRight: spacing.sm, fontSize: 18, fontWeight: "700" }}
              weight="bold"
            >
              {formatPriceINR(item.price)}
            </AppText>
            <RatingBadge item={item} rating={avgRating} />
          </View>
        </View>
      </CardShell>
    </TouchableOpacity>
  );
});

Card.displayName = "Card";
