import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGlobalContext } from '@/lib/global-provider';
import { addReviewToProperty, Property, getAverageRating, getPropertyReviews } from '@/lib/supabase-db';
import icons from '@/constants/icons';
import { palette } from '@/constants/theme';

interface PropertyReviewsProps {
  visible: boolean;
  onClose: () => void;
  property: Property;
  onReviewAdded: () => void;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  public?: boolean;
  user: {
    name: string;
    avatar: string;
    email: string;
  };
  createdAt?: Date;
  helpful?: number;
  category?: 'overall' | 'location' | 'value' | 'condition';
}

const PropertyReviews = ({ visible, onClose, property, onReviewAdded }: PropertyReviewsProps) => {
  const { user } = useGlobalContext();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'reviews' | 'neighborhood'>('reviews');
  const [showAddReview, setShowAddReview] = useState(false);
  const [newReview, setNewReview] = useState({
    rating: 0,
    comment: '',
    category: 'overall' as const,
  });
  const [propertyReviews, setPropertyReviews] = useState(property.reviews || []);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // Calculate bottom padding: safe area inset + extra padding for content visibility
  const bottomPadding = Math.max(insets.bottom, 20) + 16;

  const categories = [
    { id: 'overall', label: 'Overall', icon: '⭐' },
    { id: 'location', label: 'Location', icon: '📍' },
    { id: 'value', label: 'Value', icon: '💰' },
    { id: 'condition', label: 'Condition', icon: '🏠' },
  ];

  // Load reviews when modal opens
  useEffect(() => {
    if (visible && property.id) {
      loadReviews();
    }
  }, [visible, property.id]);

  const loadReviews = async () => {
    if (!property.id) return;
    setReviewsLoading(true);
    try {
      const reviews = await getPropertyReviews(String(property.id));
      setPropertyReviews(reviews);
    } catch (error) {
      console.error('Error loading reviews:', error);
      setPropertyReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  };

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
      // Reload reviews
      await loadReviews();
      onReviewAdded();
      Alert.alert('Success', 'Review added successfully!');
    } catch (error) {
      console.error('Error adding review:', error);
      Alert.alert('Error', 'Failed to add review. Please try again.');
    }
  };

  const renderStars = (rating: number, size: number = 20, interactive: boolean = false, onPress?: (star: number) => void) => {
    return (
      <View style={{ flexDirection: 'row' }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => interactive && onPress?.(star)}
            disabled={!interactive}
            style={{ marginRight: 2 }}
          >
            <Text style={{
              fontSize: size,
              color: rating >= star ? '#FFD700' : '#ccc',
              textShadowColor: '#191D31',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 2,
            }}>
              ★
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderReviewsTab = () => (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        padding: 16,
        paddingBottom: bottomPadding,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ gap: 24 }}>
        {/* Review Summary */}
        <View style={{ backgroundColor: palette.surfaceMuted, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: palette.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: palette.textPrimary }}>Property Reviews</Text>
            <TouchableOpacity
              onPress={() => setShowAddReview(true)}
              style={{ backgroundColor: palette.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 }}
            >
              <Text style={{ color: palette.surface, fontWeight: '500', fontFamily: 'Rubik-Medium' }}>Write Review</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 32, fontWeight: 'bold', color: palette.textPrimary }}>
                {propertyReviews.length > 0 
                  ? (propertyReviews.reduce((sum, r) => sum + r.rating, 0) / propertyReviews.length).toFixed(1) 
                  : '0.0'}
              </Text>
              {renderStars(
                propertyReviews.length > 0 
                  ? propertyReviews.reduce((sum, r) => sum + r.rating, 0) / propertyReviews.length 
                  : 0, 
                24
              )}
              <Text style={{ fontSize: 14, color: palette.textMuted, marginTop: 4 }}>
                {propertyReviews.length} reviews
              </Text>
            </View>

            <View style={{ flex: 1 }}>
              {[5, 4, 3, 2, 1].map((star) => {
                const count = propertyReviews.filter(r => r.rating === star).length || 0;
                const percentage = propertyReviews.length > 0 ? (count / propertyReviews.length) * 100 : 0;
                return (
                  <View key={star} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ fontSize: 14, color: palette.textSecondary, width: 32 }}>{star}★</Text>
                    <View style={{ flex: 1, backgroundColor: palette.surface, borderRadius: 4, height: 8, marginHorizontal: 8 }}>
                      <View
                        style={{ backgroundColor: '#F1C40F', height: 8, borderRadius: 4, width: `${percentage}%` }}
                      />
                    </View>
                    <Text style={{ fontSize: 14, color: palette.textSecondary, width: 32 }}>{count}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* Reviews List */}
        <View style={{ gap: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: palette.textPrimary, fontFamily: 'Rubik-Bold', marginBottom: 16 }}>Recent Reviews</Text>

          {reviewsLoading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={palette.primary} />
            </View>
          ) : propertyReviews && propertyReviews.length > 0 ? (
            propertyReviews.map((review, index) => (
              <View key={review.id || index} style={{ backgroundColor: palette.surfaceMuted, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: palette.border, marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Image
                      source={review.user.avatar ? { uri: review.user.avatar } : icons.person}
                      style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }}
                    />
                    <View>
                      <Text style={{ fontWeight: '500', color: palette.textPrimary }}>{review.user.name}</Text>
                      <Text style={{ fontSize: 14, color: palette.textMuted }}>
                        Recently
                      </Text>
                    </View>
                  </View>
                  {renderStars(review.rating)}
                </View>

                <Text style={{ color: palette.textSecondary, lineHeight: 20 }}>{review.comment}</Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: palette.border }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
                    <Text style={{ color: palette.secondary, marginRight: 4 }}>👍</Text>
                    <Text style={{ fontSize: 14, color: palette.textMuted }}>
                      Helpful ({(review as any).helpful || 0})
                    </Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={{ backgroundColor: palette.surfaceMuted, borderRadius: 12, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: palette.border }}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>⭐</Text>
              <Text style={{ fontSize: 18, fontWeight: '500', color: palette.textSecondary, marginBottom: 8 }}>No reviews yet</Text>
              <Text style={{ color: palette.textMuted, textAlign: 'center', marginBottom: 16 }}>
                Be the first to share your experience with this property
              </Text>
              <TouchableOpacity
                onPress={() => setShowAddReview(true)}
                style={{ backgroundColor: palette.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
              >
                <Text style={{ color: palette.surface, fontWeight: '500', fontFamily: 'Rubik-Medium' }}>Write First Review</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Add Comment Section */}
        <View style={{ backgroundColor: palette.surfaceMuted, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: palette.border, marginTop: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: palette.textPrimary, marginBottom: 8 }}>Add a Review</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            {renderStars(newReview.rating, 28, true, (star) => setNewReview({ ...newReview, rating: star }))}
          </View>
          <TextInput
            value={newReview.comment}
            onChangeText={text => setNewReview({ ...newReview, comment: text })}
            placeholder="Write your review..."
            placeholderTextColor={palette.textMuted}
            multiline
            style={{ borderWidth: 1, borderColor: palette.border, borderRadius: 12, padding: 12, marginBottom: 8, minHeight: 60, color: palette.textPrimary, backgroundColor: palette.surface }}
          />
          <TouchableOpacity
            onPress={handleAddReview}
            style={{ backgroundColor: palette.primary, borderRadius: 12, paddingVertical: 12 }}
          >
            <Text style={{ color: palette.surface, fontWeight: 'bold', textAlign: 'center', fontFamily: 'Rubik-Bold' }}>Submit Review</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  const renderNeighborhoodTab = () => (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        padding: 16,
        paddingBottom: bottomPadding,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ gap: 24 }}>
        {/* Neighborhood Overview */}
        <View style={{ backgroundColor: palette.surfaceMuted, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: palette.border, marginBottom: 16 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: palette.textPrimary, marginBottom: 16 }}>Neighborhood Insights</Text>

          <View style={{ gap: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: palette.textSecondary }}>Walkability Score</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontWeight: 'bold', color: palette.primary, marginRight: 8 }}>85</Text>
                <Text style={{ fontSize: 14, color: palette.textMuted }}>/100</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: palette.textSecondary }}>Transit Score</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontWeight: 'bold', color: palette.secondary, marginRight: 8 }}>72</Text>
                <Text style={{ fontSize: 14, color: palette.textMuted }}>/100</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: palette.textSecondary }}>Safety Rating</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontWeight: 'bold', color: palette.primary, marginRight: 8 }}>A+</Text>
                <Text style={{ fontSize: 14, color: palette.textMuted }}>Very Safe</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Nearby Amenities */}
        <View style={{ backgroundColor: palette.surfaceMuted, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: palette.border, marginBottom: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: palette.textPrimary, marginBottom: 16 }}>Nearby Amenities</Text>

          <View style={{ gap: 12 }}>
            {[
              { name: 'Coffee Shops', count: 8, distance: '0.2 mi' },
              { name: 'Restaurants', count: 23, distance: '0.3 mi' },
              { name: 'Grocery Stores', count: 3, distance: '0.5 mi' },
              { name: 'Schools', count: 5, distance: '0.8 mi' },
              { name: 'Parks', count: 2, distance: '0.4 mi' },
            ].map((amenity, index) => (
              <View key={index} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: palette.textSecondary }}>{amenity.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, color: palette.textMuted, marginRight: 8 }}>{amenity.count} places</Text>
                  <Text style={{ fontSize: 14, color: palette.secondary }}>{amenity.distance}</Text>
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
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: palette.border, backgroundColor: palette.surface }}>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: palette.textPrimary, fontWeight: '500', fontSize: 20 }}>✕</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 20, fontWeight: '700', color: palette.textPrimary, fontFamily: 'Rubik-Bold' }}>Reviews & Insights</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Tab Navigation */}
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: palette.border, backgroundColor: palette.surface }}>
            {[
              { id: 'reviews', label: 'Reviews', icon: '⭐' },
              { id: 'neighborhood', label: 'Area', icon: '📍' }
            ].map((tab) => (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id as any)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 8,
                  borderBottomWidth: activeTab === tab.id ? 2 : 0,
                  borderBottomColor: palette.primary,
                }}
              >
                <Text style={{
                  textAlign: 'center',
                  fontWeight: '500',
                  color: activeTab === tab.id ? palette.primary : palette.textMuted,
                }}>
                  {tab.icon} {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab Content */}
          {activeTab === 'reviews' && renderReviewsTab()}
          {activeTab === 'neighborhood' && renderNeighborhoodTab()}
        </SafeAreaView>
      </Modal>

      {/* Add Review Modal */}
      <Modal
        visible={showAddReview}
        animationType="slide"
        transparent={true}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: palette.overlay }}>
          <View style={{ backgroundColor: palette.surfaceMuted, borderRadius: 16, padding: 24, width: '92%', maxHeight: '96%', borderWidth: 1, borderColor: palette.border }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: palette.textPrimary, marginBottom: 16 }}>Write a Review</Text>

            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '500', color: palette.textPrimary, marginBottom: 8 }}>Rating</Text>
              <View style={{ alignItems: 'center' }}>
                {renderStars(newReview.rating, 32, true, (star) =>
                  setNewReview({ ...newReview, rating: star })
                )}
              </View>
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '500', color: palette.textPrimary, marginBottom: 8 }}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      onPress={() => setNewReview({ ...newReview, category: category.id as any })}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: newReview.category === category.id ? palette.primary : palette.border,
                        backgroundColor: newReview.category === category.id ? palette.primary : palette.surface,
                      }}
                    >
                      <Text style={{
                        fontSize: 14,
                        color: newReview.category === category.id ? palette.surface : palette.textSecondary,
                      }}>
                        {category.icon} {category.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 16, fontWeight: '500', color: palette.textPrimary, marginBottom: 8 }}>Comment</Text>
              <TextInput
                value={newReview.comment}
                onChangeText={(text) => setNewReview({ ...newReview, comment: text })}
                placeholder="Share your experience with this property..."
                placeholderTextColor={palette.textMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                style={{ borderWidth: 1, borderColor: palette.border, borderRadius: 12, padding: 12, fontSize: 16, color: palette.textPrimary, backgroundColor: palette.surface, minHeight: 100 }}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => setShowAddReview(false)}
                style={{ flex: 1, backgroundColor: palette.surface, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: palette.border }}
              >
                <Text style={{ textAlign: 'center', fontWeight: '500', color: palette.textPrimary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddReview}
                style={{ flex: 1, backgroundColor: palette.primary, paddingVertical: 12, borderRadius: 12 }}
              >
                <Text style={{ textAlign: 'center', fontWeight: '500', color: palette.surface, fontFamily: 'Rubik-Medium' }}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default PropertyReviews; 