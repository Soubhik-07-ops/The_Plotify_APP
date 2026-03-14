import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import AppText from '@/components/ui/AppText';
import icons from '@/constants/icons';
import { palette } from '@/constants/theme';
import { useGlobalContext } from '@/lib/global-provider';
import { addReviewToProperty, getPropertyReviews, Property } from '@/lib/supabase-db';

interface PropertyReviewsProps {
  visible: boolean;
  onClose: () => void;
  property: Property;
  onReviewAdded: () => void;
}

type ReviewCategory = 'overall' | 'location' | 'value' | 'condition';

interface Review {
  id: string;
  rating: number;
  comment: string;
  user: {
    name: string;
    avatar: string;
    email: string;
  };
  helpful?: number;
  category?: ReviewCategory;
}

const categoryOptions: {
  id: ReviewCategory;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { id: 'overall', label: 'Overall', icon: 'star-outline' },
  { id: 'location', label: 'Location', icon: 'location-outline' },
  { id: 'value', label: 'Value', icon: 'cash-outline' },
  { id: 'condition', label: 'Condition', icon: 'home-outline' },
];

const tabOptions = [
  { id: 'reviews', label: 'Reviews', icon: 'star-outline' as const },
  { id: 'neighborhood', label: 'Area', icon: 'location-outline' as const },
];

const PropertyReviews = ({ visible, onClose, property, onReviewAdded }: PropertyReviewsProps) => {
  const { user } = useGlobalContext();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'reviews' | 'neighborhood'>('reviews');
  const [showAddReview, setShowAddReview] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [propertyReviews, setPropertyReviews] = useState<Review[]>(property.reviews || []);
  const [newReview, setNewReview] = useState({
    rating: 0,
    comment: '',
    category: 'overall' as ReviewCategory,
  });

  const bottomPadding = Math.max(insets.bottom, 20) + 16;
  const averageRating =
    propertyReviews.length > 0
      ? propertyReviews.reduce((sum, review) => sum + review.rating, 0) / propertyReviews.length
      : 0;

  const loadReviews = useCallback(async () => {
    if (!property.id) return;

    setReviewsLoading(true);
    try {
      const reviews = await getPropertyReviews(String(property.id));
      setPropertyReviews(reviews as Review[]);
    } catch (error) {
      console.error('Error loading reviews:', error);
      setPropertyReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  }, [property.id]);

  useEffect(() => {
    if (visible && property.id) {
      void loadReviews();
    }
  }, [visible, property.id, loadReviews]);

  const handleAddReview = async () => {
    if (!user || !newReview.rating || !newReview.comment.trim()) {
      Alert.alert('Error', 'Please provide both rating and comment');
      return;
    }

    try {
      await addReviewToProperty(String(property.id!), {
        rating: newReview.rating,
        comment: newReview.comment,
        user: {
          name: user.name,
          avatar: user.avatar,
          email: user.email,
        },
      });

      setNewReview({ rating: 0, comment: '', category: 'overall' });
      setShowAddReview(false);
      await loadReviews();
      onReviewAdded();
      Alert.alert('Success', 'Review added successfully');
    } catch (error) {
      console.error('Error adding review:', error);
      Alert.alert('Error', 'Failed to add review. Please try again.');
    }
  };

  const renderStars = (
    rating: number,
    size: number = 20,
    interactive: boolean = false,
    onPress?: (star: number) => void
  ) => (
    <View style={{ flexDirection: 'row' }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => interactive && onPress?.(star)}
          disabled={!interactive}
          style={{ marginRight: 4 }}
        >
          <Ionicons
            name={rating >= star ? 'star' : 'star-outline'}
            size={size}
            color={rating >= star ? '#F1C40F' : '#D9D6D1'}
          />
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderReviewsTab = () => (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 16, paddingBottom: bottomPadding }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ gap: 24 }}>
        <View
          style={{
            backgroundColor: palette.surfaceMuted,
            borderRadius: 12,
            padding: 16,
            borderWidth: 1,
            borderColor: palette.border,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            <AppText style={{ fontSize: 20, fontWeight: 'bold', color: palette.textPrimary }} weight="bold">
              Property Reviews
            </AppText>
            <TouchableOpacity
              onPress={() => setShowAddReview(true)}
              style={{
                backgroundColor: palette.primary,
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 12,
              }}
            >
              <AppText style={{ color: palette.surface, fontWeight: '500' }} weight="medium">
                Write Review
              </AppText>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View style={{ alignItems: 'center' }}>
              <AppText style={{ fontSize: 32, fontWeight: 'bold', color: palette.textPrimary }} weight="bold">
                {averageRating.toFixed(1)}
              </AppText>
              {renderStars(averageRating, 24)}
              <AppText style={{ fontSize: 14, color: palette.textMuted, marginTop: 4 }}>
                {propertyReviews.length} reviews
              </AppText>
            </View>

            <View style={{ flex: 1 }}>
              {[5, 4, 3, 2, 1].map((star) => {
                const count = propertyReviews.filter((review) => review.rating === star).length;
                const percentage = propertyReviews.length > 0 ? (count / propertyReviews.length) * 100 : 0;

                return (
                  <View key={star} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <AppText style={{ fontSize: 14, color: palette.textSecondary, width: 32 }}>{star}</AppText>
                    <View
                      style={{
                        flex: 1,
                        backgroundColor: palette.surface,
                        borderRadius: 4,
                        height: 8,
                        marginHorizontal: 8,
                      }}
                    >
                      <View
                        style={{
                          backgroundColor: '#F1C40F',
                          height: 8,
                          borderRadius: 4,
                          width: `${percentage}%`,
                        }}
                      />
                    </View>
                    <AppText style={{ fontSize: 14, color: palette.textSecondary, width: 32 }}>{count}</AppText>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        <View style={{ gap: 16 }}>
          <AppText
            style={{
              fontSize: 18,
              fontWeight: '700',
              color: palette.textPrimary,
              marginBottom: 16,
            }}
            weight="bold"
          >
            Recent Reviews
          </AppText>

          {reviewsLoading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={palette.primary} />
            </View>
          ) : propertyReviews.length > 0 ? (
            propertyReviews.map((review, index) => (
              <View
                key={review.id || index}
                style={{
                  backgroundColor: palette.surfaceMuted,
                  borderRadius: 12,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: palette.border,
                  marginBottom: 12,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Image
                      source={review.user.avatar ? { uri: review.user.avatar } : icons.person}
                      style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }}
                    />
                    <View style={{ flex: 1 }}>
                      <AppText style={{ fontWeight: '500', color: palette.textPrimary }}>{review.user.name}</AppText>
                      <AppText style={{ fontSize: 14, color: palette.textMuted }}>Recently</AppText>
                    </View>
                  </View>
                  {renderStars(review.rating)}
                </View>

                <AppText style={{ color: palette.textSecondary, lineHeight: 20 }}>{review.comment}</AppText>

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginTop: 12,
                    paddingTop: 12,
                    borderTopWidth: 1,
                    borderTopColor: palette.border,
                  }}
                >
                  <Ionicons name="thumbs-up-outline" size={16} color={palette.secondary} style={{ marginRight: 6 }} />
                  <AppText style={{ fontSize: 14, color: palette.textMuted }}>
                    Helpful ({review.helpful || 0})
                  </AppText>
                </View>
              </View>
            ))
          ) : (
            <View
              style={{
                backgroundColor: palette.surfaceMuted,
                borderRadius: 12,
                padding: 32,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: palette.border,
              }}
            >
              <Ionicons name="star-outline" size={32} color={palette.textMuted} style={{ marginBottom: 8 }} />
              <AppText style={{ fontSize: 18, fontWeight: '500', color: palette.textSecondary, marginBottom: 8 }}>
                No reviews yet
              </AppText>
              <AppText style={{ color: palette.textMuted, textAlign: 'center', marginBottom: 16 }}>
                Be the first to share your experience with this property
              </AppText>
              <TouchableOpacity
                onPress={() => setShowAddReview(true)}
                style={{ backgroundColor: palette.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
              >
                <AppText style={{ color: palette.surface, fontWeight: '500' }} weight="medium">
                  Write First Review
                </AppText>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View
          style={{
            backgroundColor: palette.surfaceMuted,
            borderRadius: 12,
            padding: 16,
            borderWidth: 1,
            borderColor: palette.border,
            marginTop: 24,
          }}
        >
          <AppText style={{ fontSize: 18, fontWeight: 'bold', color: palette.textPrimary, marginBottom: 8 }} weight="bold">
            Add a Review
          </AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            {renderStars(newReview.rating, 28, true, (star) => setNewReview({ ...newReview, rating: star }))}
          </View>
          <TextInput
            value={newReview.comment}
            onChangeText={(text) => setNewReview({ ...newReview, comment: text })}
            placeholder="Write your review..."
            placeholderTextColor={palette.textMuted}
            multiline
            style={{
              borderWidth: 1,
              borderColor: palette.border,
              borderRadius: 12,
              padding: 12,
              marginBottom: 8,
              minHeight: 60,
              color: palette.textPrimary,
              backgroundColor: palette.surface,
              fontFamily: 'PlayfairDisplay-Regular',
            }}
          />
          <TouchableOpacity
            onPress={handleAddReview}
            style={{ backgroundColor: palette.primary, borderRadius: 12, paddingVertical: 12 }}
          >
            <AppText
              style={{
                color: palette.surface,
                fontWeight: 'bold',
                textAlign: 'center',
              }}
              weight="bold"
            >
              Submit Review
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  const renderNeighborhoodTab = () => (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 16, paddingBottom: bottomPadding }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ gap: 24 }}>
        <View
          style={{
            backgroundColor: palette.surfaceMuted,
            borderRadius: 12,
            padding: 16,
            borderWidth: 1,
            borderColor: palette.border,
            marginBottom: 16,
          }}
        >
          <AppText style={{ fontSize: 20, fontWeight: 'bold', color: palette.textPrimary, marginBottom: 16 }} weight="bold">
            Neighborhood Insights
          </AppText>

          <View style={{ gap: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <AppText style={{ color: palette.textSecondary }}>Walkability Score</AppText>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <AppText style={{ fontWeight: 'bold', color: palette.primary, marginRight: 8 }}>85</AppText>
                <AppText style={{ fontSize: 14, color: palette.textMuted }}>/100</AppText>
              </View>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <AppText style={{ color: palette.textSecondary }}>Transit Score</AppText>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <AppText style={{ fontWeight: 'bold', color: palette.secondary, marginRight: 8 }}>72</AppText>
                <AppText style={{ fontSize: 14, color: palette.textMuted }}>/100</AppText>
              </View>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <AppText style={{ color: palette.textSecondary }}>Safety Rating</AppText>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <AppText style={{ fontWeight: 'bold', color: palette.primary, marginRight: 8 }}>A+</AppText>
                <AppText style={{ fontSize: 14, color: palette.textMuted }}>Very Safe</AppText>
              </View>
            </View>
          </View>
        </View>

        <View
          style={{
            backgroundColor: palette.surfaceMuted,
            borderRadius: 12,
            padding: 16,
            borderWidth: 1,
            borderColor: palette.border,
            marginBottom: 16,
          }}
        >
          <AppText style={{ fontSize: 18, fontWeight: 'bold', color: palette.textPrimary, marginBottom: 16 }} weight="bold">
            Nearby Amenities
          </AppText>

          <View style={{ gap: 12 }}>
            {[
              { name: 'Coffee Shops', count: 8, distance: '0.2 mi' },
              { name: 'Restaurants', count: 23, distance: '0.3 mi' },
              { name: 'Grocery Stores', count: 3, distance: '0.5 mi' },
              { name: 'Schools', count: 5, distance: '0.8 mi' },
              { name: 'Parks', count: 2, distance: '0.4 mi' },
            ].map((amenity, index) => (
              <View key={index} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <AppText style={{ color: palette.textSecondary }}>{amenity.name}</AppText>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <AppText style={{ fontSize: 14, color: palette.textMuted, marginRight: 8 }}>
                    {amenity.count} places
                  </AppText>
                  <AppText style={{ fontSize: 14, color: palette.secondary }}>{amenity.distance}</AppText>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <>
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: palette.border,
              backgroundColor: palette.surface,
            }}
          >
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={palette.textPrimary} />
            </TouchableOpacity>
            <AppText style={{ fontSize: 20, fontWeight: '700', color: palette.textPrimary }} weight="bold">
              Reviews & Insights
            </AppText>
            <View style={{ width: 24 }} />
          </View>

          <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: palette.border, backgroundColor: palette.surface }}>
            {tabOptions.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id as 'reviews' | 'neighborhood')}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 8,
                  borderBottomWidth: activeTab === tab.id ? 2 : 0,
                  borderBottomColor: palette.primary,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Ionicons
                    name={tab.icon}
                    size={14}
                    color={activeTab === tab.id ? palette.primary : palette.textMuted}
                  />
                  <AppText
                    style={{
                      fontWeight: '500',
                      color: activeTab === tab.id ? palette.primary : palette.textMuted,
                    }}
                  >
                    {tab.label}
                  </AppText>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {activeTab === 'reviews' ? renderReviewsTab() : renderNeighborhoodTab()}
        </SafeAreaView>
      </Modal>

      <Modal visible={showAddReview} animationType="slide" transparent>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: palette.overlay }}>
          <View
            style={{
              backgroundColor: palette.surfaceMuted,
              borderRadius: 16,
              padding: 24,
              width: '92%',
              maxHeight: '96%',
              borderWidth: 1,
              borderColor: palette.border,
            }}
          >
            <AppText style={{ fontSize: 20, fontWeight: 'bold', color: palette.textPrimary, marginBottom: 16 }} weight="bold">
              Write a Review
            </AppText>

            <View style={{ marginBottom: 16 }}>
              <AppText style={{ fontSize: 16, fontWeight: '500', color: palette.textPrimary, marginBottom: 8 }}>
                Rating
              </AppText>
              <View style={{ alignItems: 'center' }}>
                {renderStars(newReview.rating, 32, true, (star) => setNewReview({ ...newReview, rating: star }))}
              </View>
            </View>

            <View style={{ marginBottom: 16 }}>
              <AppText style={{ fontSize: 16, fontWeight: '500', color: palette.textPrimary, marginBottom: 8 }}>
                Category
              </AppText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {categoryOptions.map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      onPress={() => setNewReview({ ...newReview, category: category.id })}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: newReview.category === category.id ? palette.primary : palette.border,
                        backgroundColor: newReview.category === category.id ? palette.primary : palette.surface,
                      }}
                    >
                      <Ionicons
                        name={category.icon}
                        size={14}
                        color={newReview.category === category.id ? palette.surface : palette.textSecondary}
                      />
                      <AppText
                        style={{
                          fontSize: 14,
                          color: newReview.category === category.id ? palette.surface : palette.textSecondary,
                        }}
                      >
                        {category.label}
                      </AppText>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={{ marginBottom: 24 }}>
              <AppText style={{ fontSize: 16, fontWeight: '500', color: palette.textPrimary, marginBottom: 8 }}>
                Comment
              </AppText>
              <TextInput
                value={newReview.comment}
                onChangeText={(text) => setNewReview({ ...newReview, comment: text })}
                placeholder="Share your experience with this property..."
                placeholderTextColor={palette.textMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                style={{
                  borderWidth: 1,
                  borderColor: palette.border,
                  borderRadius: 12,
                  padding: 12,
                  fontSize: 16,
                  color: palette.textPrimary,
                  backgroundColor: palette.surface,
                  minHeight: 100,
                  fontFamily: 'PlayfairDisplay-Regular',
                }}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => setShowAddReview(false)}
                style={{
                  flex: 1,
                  backgroundColor: palette.surface,
                  paddingVertical: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: palette.border,
                }}
              >
                <AppText style={{ textAlign: 'center', fontWeight: '500', color: palette.textPrimary }} weight="medium">
                  Cancel
                </AppText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddReview}
                style={{ flex: 1, backgroundColor: palette.primary, paddingVertical: 12, borderRadius: 12 }}
              >
                <AppText style={{ textAlign: 'center', fontWeight: '500', color: palette.surface }} weight="medium">
                  Submit
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default PropertyReviews;

