import icons from "@/constants/icons";
import { Image, Text, TouchableOpacity, View } from "react-native";
import React, { memo, useMemo, useCallback } from "react";
import type { Property } from '@/lib/supabase-db';
import { getAverageRating } from '@/lib/supabase-db';
import { LinearGradient } from 'expo-linear-gradient';
import { useGlobalContext } from '@/lib/global-provider';
import { palette } from "@/constants/theme";
import { formatPriceINR } from '@/lib/formatters';

interface Props {
  item: Property;
  onPress?: () => void;
  index?: number;
}

export const FeaturedCard = memo(({ item, onPress, index = 0 }: Props) => {
  // Memoize avgRating - use reviews length as dependency since reviews array reference might change
  const avgRating = useMemo(() => getAverageRating(item), [item]);
  const { favorites, addFavorite, removeFavorite } = useGlobalContext();
  // Check if property is favorited - memoize to prevent re-renders
  const isFavorited = useMemo(() =>
    item.id ? favorites.includes(String(item.id)) : false,
    [item.id, favorites]
  );

  const handleFavoritePress = useCallback((e: any) => {
    e.stopPropagation();
    if (!item.id) return;
    const itemId = String(item.id);
    if (isFavorited) {
      removeFavorite(itemId);
    } else {
      addFavorite(itemId);
    }
  }, [item.id, isFavorited, removeFavorite, addFavorite]);
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.92}
      style={{ width: 240, height: 320, marginRight: 16, borderRadius: 24, overflow: 'hidden', backgroundColor: palette.surface, shadowColor: palette.shadow, shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4, borderWidth: 1, borderColor: palette.border }}
    >
      <Image
        source={{ uri: item.image || 'https://via.placeholder.com/400x300?text=No+Image' }}
        style={{ width: '100%', height: '100%', borderRadius: 24, position: 'absolute' }}
        resizeMode="cover"
        onError={(e) => {
          console.error('Image load error for featured property:', item.id, item.image);
        }}
      />
      {/* Gradient overlay for text readability */}
      <LinearGradient colors={["transparent", "rgba(0,0,0,0.7)"]} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 110, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }} />
      {/* Property type badge */}
      <View style={{ position: 'absolute', top: 20, left: 20, backgroundColor: palette.surface, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16, zIndex: 10, borderWidth: 1, borderColor: palette.border }}>
        <Text style={{ color: palette.textPrimary, fontWeight: 'bold', fontSize: 12, textTransform: 'uppercase' }}>{item.type}</Text>
      </View>
      {/* Favorite heart icon */}
      <TouchableOpacity
        onPress={handleFavoritePress}
        style={{ position: 'absolute', top: 20, right: 20, backgroundColor: palette.surface, padding: 8, borderRadius: 16, zIndex: 10, borderWidth: 1, borderColor: palette.border }}
        activeOpacity={0.7}
      >
        <Image
          source={icons.heart}
          style={{ width: 16, height: 16, tintColor: isFavorited ? '#FF3B30' : palette.textMuted }}
        />
      </TouchableOpacity>
      {/* Rating badge */}
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: palette.surface, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, position: 'absolute', top: 60, right: 20, zIndex: 10, borderWidth: 1, borderColor: palette.border }}>
        <Image source={icons.star} style={{ width: 14, height: 14 }} />
        {item.reviews && item.reviews.length > 0 ? (
          <Text style={{ color: palette.secondary, fontWeight: 'bold', fontSize: 12, marginLeft: 4 }}>{Math.round(avgRating)} / 5 ({item.reviews.length})</Text>
        ) : (
          <Text style={{ color: palette.secondary, fontWeight: 'bold', fontSize: 12, marginLeft: 4 }}>New</Text>
        )}
      </View>
      <View style={{ position: 'absolute', bottom: 20, left: 20, right: 20 }}>
        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 20, marginBottom: 4 }} numberOfLines={1}>{item.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
          <Image source={icons.location} style={{ width: 16, height: 16, tintColor: '#fff', marginRight: 4 }} />
          <Text style={{ color: '#fff', fontSize: 14, backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 8, borderRadius: 8 }} numberOfLines={2}>{item.address || 'No address provided'}</Text>
        </View>
        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>{formatPriceINR(item.price)}</Text>
      </View>
    </TouchableOpacity>
  );
});
FeaturedCard.displayName = 'FeaturedCard';

export const Card = memo(({ item, onPress, index = 0 }: Props) => {
  // Memoize avgRating - use reviews length as dependency since reviews array reference might change
  const avgRating = useMemo(() => getAverageRating(item), [item]);
  const { favorites, addFavorite, removeFavorite } = useGlobalContext();
  const isFavorited = useMemo(() =>
    item.id ? favorites.includes(String(item.id)) : false,
    [item.id, favorites]
  );

  const handleFavoritePress = useCallback((e: any) => {
    e.stopPropagation();
    if (!item.id) return;
    const itemId = String(item.id);
    if (isFavorited) {
      removeFavorite(itemId);
    } else {
      addFavorite(itemId);
    }
  }, [item.id, isFavorited, removeFavorite, addFavorite]);
  return (
    <TouchableOpacity
      style={{ width: '100%', borderRadius: 20, backgroundColor: palette.surface, shadowColor: palette.shadow, shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4, borderWidth: 1, borderColor: palette.border, overflow: 'hidden' }}
      onPress={onPress}
      activeOpacity={0.92}
    >
      <View style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 8 }}>
        <Image
          source={{ uri: item.image || 'https://via.placeholder.com/400x300?text=No+Image' }}
          style={{ width: '100%', height: 160, borderRadius: 16 }}
          resizeMode="cover"
          onError={(e) => {
            console.error('Image load error for property:', item.id, item.image);
          }}
        />
        <LinearGradient colors={["transparent", "rgba(0,0,0,0.6)"]} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 60, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }} />
        {/* Favorite heart icon */}
        <TouchableOpacity
          onPress={handleFavoritePress}
          style={{ position: 'absolute', top: 12, right: 12, backgroundColor: palette.surface, padding: 6, borderRadius: 16, zIndex: 10, borderWidth: 1, borderColor: palette.border }}
          activeOpacity={0.7}
        >
          <Image
            source={icons.heart}
            style={{ width: 16, height: 16, tintColor: isFavorited ? '#FF3B30' : palette.textMuted }}
          />
        </TouchableOpacity>
        {/* Property type badge */}
        <View style={{ position: 'absolute', top: 12, left: 12, backgroundColor: palette.surface, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, zIndex: 10, borderWidth: 1, borderColor: palette.border }}>
          <Text style={{ color: palette.textPrimary, fontWeight: 'bold', fontSize: 10, textTransform: 'uppercase' }}>{item.type}</Text>
        </View>
      </View>
      <View style={{ paddingHorizontal: 12, paddingBottom: 12, paddingTop: 4 }}>
        <Text style={{ color: palette.textPrimary, fontWeight: 'bold', fontSize: 16, marginBottom: 6, letterSpacing: 0.2 }} numberOfLines={1} ellipsizeMode="tail">{item.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, minHeight: 32 }}>
          <Image source={icons.location} style={{ width: 14, height: 14, tintColor: palette.secondary, marginRight: 6, marginTop: 2, flexShrink: 0 }} />
          <Text style={{ color: palette.textSecondary, fontSize: 12, flex: 1, lineHeight: 16 }} numberOfLines={2} ellipsizeMode="tail">{item.address || 'No address provided'}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
          <Text style={{ color: palette.primary, fontWeight: 'bold', fontSize: 16, letterSpacing: 0.3, flexShrink: 1 }} numberOfLines={1} ellipsizeMode="tail">{formatPriceINR(item.price)}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: palette.surfaceMuted, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: palette.border, marginLeft: 8, flexShrink: 0 }}>
            <Image source={icons.star} style={{ width: 12, height: 12, tintColor: palette.secondary }} />
            {item.reviews && item.reviews.length > 0 ? (
              <Text style={{ color: palette.secondary, fontWeight: '600', fontSize: 11, marginLeft: 4 }}>{Math.round(avgRating)} / 5</Text>
            ) : (
              <Text style={{ color: palette.secondary, fontWeight: '600', fontSize: 11, marginLeft: 4 }}>New</Text>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});
Card.displayName = 'Card';
