import React, { useState, useEffect, useRef } from 'react';
import { ActivityIndicator } from 'react-native';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  Alert,
  FlatList,
  Dimensions,
  Share,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  interpolateColor,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGlobalContext } from '@/lib/global-provider';
import icons from '@/constants/icons';
import { palette } from '@/constants/theme';
import { getForumPosts, createForumPost, getForumPostById, addForumComment, toggleForumPostLike, hasUserLikedPost, type ForumPost, type ForumComment } from '@/lib/supabase-db';

const { width } = Dimensions.get('window');

// ForumPost and ForumComment types are imported from supabase-db

const CommunityForums = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
  const { user } = useGlobalContext();
  const [activeTab, setActiveTab] = useState<'forums' | 'qa' | 'neighborhoods' | 'trending'>('forums');
  const [showNewPost, setShowNewPost] = useState(false);
  const [selectedPost, setSelectedPost] = useState<(ForumPost & { comments?: ForumComment[] }) | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    category: 'general' as const,
    tags: [] as string[],
  });
  const [newReply, setNewReply] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [forumPosts, setForumPosts] = useState<ForumPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postLikes, setPostLikes] = useState<Record<string, boolean>>({});
  // Load forum posts when modal opens or category changes
  useEffect(() => {
    if (visible) {
      loadForumPosts();
    }
  }, [visible, selectedCategory]);

  // Load likes for current user
  useEffect(() => {
    if (visible && user && forumPosts.length > 0) {
      loadPostLikes();
    }
  }, [visible, user, forumPosts]);

  const loadForumPosts = async () => {
    setPostsLoading(true);
    try {
      const category = selectedCategory === 'all' ? undefined : selectedCategory;
      const posts = await getForumPosts(category, 50);
      setForumPosts(posts);
    } catch (error) {
      console.error('Error loading forum posts:', error);
      setForumPosts([]);
    } finally {
      setPostsLoading(false);
    }
  };

  const loadPostLikes = async () => {
    if (!user) return;
    const likesMap: Record<string, boolean> = {};
    for (const post of forumPosts) {
      try {
        const liked = await hasUserLikedPost(post.id, user.id);
        likesMap[post.id] = liked;
      } catch {
        likesMap[post.id] = false;
      }
    }
    setPostLikes(likesMap);
  };

  // Main filter categories (matching the UI image)
  const filterCategories = [
    { id: 'all', name: 'All', icon: '🏠' },
    { id: 'buying', name: 'Buying', icon: '💰' },
    { id: 'selling', name: 'Selling', icon: '📈' },
    { id: 'investing', name: 'Investing', icon: '📊' },
  ];

  // All categories for other uses (new post modal, etc.)
  const categories = [
    { id: 'all', name: 'All', icon: '🏠' },
    { id: 'buying', name: 'Buying', icon: '💰' },
    { id: 'selling', name: 'Selling', icon: '📈' },
    { id: 'investing', name: 'Investing', icon: '📊' },
    { id: 'neighborhood', name: 'Neighborhoods', icon: '🏘️' },
    { id: 'expert', name: 'Expert Q&A', icon: '👨‍💼' },
  ];

  const handleCreatePost = async () => {
    if (!newPost.title.trim() || !newPost.content.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (!user) {
      Alert.alert('Error', 'You must be logged in to create a post');
      return;
    }

    try {
      await createForumPost({
        title: newPost.title,
        content: newPost.content,
        category: newPost.category,
        tags: newPost.tags,
      });
      Alert.alert('Success', 'Post created successfully!');
      setShowNewPost(false);
      setNewPost({ title: '', content: '', category: 'general', tags: [] });
      await loadForumPosts(); // Reload posts
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'Failed to create post. Please try again.');
    }
  };

  const handleAddReply = async () => {
    if (!newReply.trim()) {
      Alert.alert('Error', 'Please enter a reply');
      return;
    }
    if (!selectedPost || !user) {
      Alert.alert('Error', 'You must be logged in to add a reply');
      return;
    }

    try {
      await addForumComment(selectedPost.id, newReply);
      Alert.alert('Success', 'Reply added successfully!');
      setNewReply('');
      // Reload post with comments
      const updatedPost = await getForumPostById(selectedPost.id);
      if (updatedPost) {
        setSelectedPost(updatedPost);
      }
    } catch (error) {
      console.error('Error adding reply:', error);
      Alert.alert('Error', 'Failed to add reply. Please try again.');
    }
  };

  const handleLikePost = async (postId: string) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to like a post');
      return;
    }

    try {
      const isLiked = await toggleForumPostLike(postId);
      setPostLikes(prev => ({ ...prev, [postId]: isLiked }));
      // Reload posts to update like counts
      await loadForumPosts();
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleViewPost = async (post: ForumPost) => {
    try {
      const fullPost = await getForumPostById(post.id);
      if (fullPost) {
        setSelectedPost(fullPost);
      } else {
        setSelectedPost(post);
      }
    } catch (error) {
      console.error('Error loading post details:', error);
      setSelectedPost(post);
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleShare = async () => {
    if (!selectedPost) return;
    try {
      await Share.share({
        message: `${selectedPost.title}\n\n${selectedPost.content}`,
      });
    } catch (error) {
      Alert.alert('Error', 'Could not share the post.');
    }
  };

  // Animated Filter Chip Component
  const AnimatedFilterChip = ({
    category,
    index,
    isSelected,
    onPress,
  }: {
    category: { id: string; name: string; icon: string };
    index: number;
    isSelected: boolean;
    onPress: () => void;
  }) => {
    const scale = useSharedValue(1);
    const backgroundColor = useSharedValue(isSelected ? 1 : 0);
    const borderWidth = useSharedValue(isSelected ? 0 : 1);
    const textColor = useSharedValue(isSelected ? 1 : 0);
    const hasAnimated = useRef(false);

    // Animate color transitions when selection changes
    useEffect(() => {
      backgroundColor.value = withTiming(isSelected ? 1 : 0, {
        duration: 250,
        easing: Easing.out(Easing.ease),
      });
      borderWidth.value = withTiming(isSelected ? 0 : 1, {
        duration: 250,
        easing: Easing.out(Easing.ease),
      });
      textColor.value = withTiming(isSelected ? 1 : 0, {
        duration: 250,
        easing: Easing.out(Easing.ease),
      });
    }, [isSelected]);

    // Initial mount animation
    useEffect(() => {
      if (!hasAnimated.current) {
        hasAnimated.current = true;
        const delay = index * 50;
        scale.value = withSpring(1, { damping: 18, stiffness: 120 });
      }
    }, [index]);

    const handlePress = () => {
      // Subtle scale animation on press
      scale.value = withSequence(
        withSpring(0.96, { damping: 15, stiffness: 400 }),
        withSpring(1, { damping: 15, stiffness: 400 })
      );
      onPress();
    };

    // Animated background color interpolation
    const animatedBackgroundColor = useAnimatedStyle(() => {
      return {
        backgroundColor: interpolateColor(
          backgroundColor.value,
          [0, 1],
          [palette.surfaceMuted, palette.primary] // inactive -> active (light -> dark brown)
        ),
      };
    });

    // Animated border
    const animatedBorder = useAnimatedStyle(() => ({
      borderWidth: borderWidth.value,
      borderColor: palette.border,
    }));

    // Animated text color
    const animatedTextColor = useAnimatedStyle(() => {
      return {
        color: interpolateColor(
          textColor.value,
          [0, 1],
          [palette.textPrimary, palette.surface] // inactive -> active (dark -> white)
        ),
      };
    });

    // Animated icon opacity (slightly dimmed when inactive)
    const animatedIconOpacity = useAnimatedStyle(() => {
      // Interpolate opacity: 0.8 when inactive (textColor = 0), 1.0 when active (textColor = 1)
      const opacity = textColor.value * 0.2 + 0.8; // Maps 0 -> 0.8, 1 -> 1.0
      return { opacity };
    });

    // Scale animation
    const animatedScale = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    return (
      <Animated.View
        style={[
          {
            marginRight: 12,
            flexShrink: 0,
          },
          animatedScale,
        ]}
      >
        <Pressable
          onPress={handlePress}
          android_ripple={{ color: 'rgba(0,0,0,0.05)', borderless: false }}
        >
          <Animated.View
            style={[
              {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 18,
                paddingVertical: 10,
                borderRadius: 24, // Full pill shape
                minWidth: 60,
                flexShrink: 0,
                shadowColor: palette.shadow,
                shadowOpacity: isSelected ? 0.15 : 0.05,
                shadowRadius: isSelected ? 8 : 4,
                shadowOffset: { width: 0, height: isSelected ? 4 : 2 },
                elevation: isSelected ? 4 : 2,
              },
              animatedBackgroundColor,
              animatedBorder,
            ]}
          >
            <Animated.Text
              style={[
                {
                  fontSize: 16,
                  marginRight: 6,
                },
                animatedIconOpacity,
              ]}
            >
              {category.icon}
            </Animated.Text>
            <Animated.Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[
                {
                  fontSize: 14,
                  fontWeight: '500',
                  fontFamily: 'Rubik-Medium',
                },
                animatedTextColor,
              ]}
            >
              {category.name}
            </Animated.Text>
          </Animated.View>
        </Pressable>
      </Animated.View>
    );
  };

  const renderCategoryFilter = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginBottom: 0 }}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingVertical: 12,
        alignItems: 'center',
        flexGrow: 0,
      }}
      bounces={false}
      decelerationRate="fast"
    >
      {filterCategories.map((category, index) => (
        <AnimatedFilterChip
          key={category.id}
          category={category}
          index={index}
          isSelected={selectedCategory === category.id}
          onPress={() => setSelectedCategory(category.id)}
        />
      ))}
    </ScrollView>
  );

  const renderPostCard = (props: { item: ForumPost } | ForumPost) => {
    // Handle both FlatList format ({ item: post }) and direct format (post)
    const post = 'item' in props ? props.item : props;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => handleViewPost(post)}
        style={{
          backgroundColor: palette.surface,
          borderRadius: 20,
          padding: 20,
          marginHorizontal: 16,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: palette.border,
          shadowColor: palette.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        {/* Author Row - Clean and Simple */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <Image
            source={{ uri: post.author?.avatar || 'https://via.placeholder.com/44' }}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              marginRight: 12,
              borderWidth: 2,
              borderColor: palette.border,
            }}
          />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: '600',
                  color: palette.textPrimary,
                  fontFamily: 'Rubik-SemiBold',
                }}
              >
                {post.author?.name || 'Anonymous'}
              </Text>
              {post.is_pinned && (
                <View
                  style={{
                    backgroundColor: palette.secondary + '20',
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 12,
                    marginLeft: 6,
                  }}
                >
                  <Text
                    style={{
                      color: palette.secondary,
                      fontSize: 10,
                      fontWeight: '600',
                      fontFamily: 'Rubik-SemiBold',
                    }}
                  >
                    📌 Pinned
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={{
                fontSize: 13,
                color: palette.textMuted,
                fontFamily: 'Rubik-Regular',
              }}
            >
              {formatTimeAgo(new Date(post.created_at))}
            </Text>
          </View>
        </View>

        {/* Title - Strong and Prominent */}
        <Text
          style={{
            fontSize: 18,
            fontWeight: '700',
            color: palette.textPrimary,
            marginBottom: 10,
            lineHeight: 24,
            fontFamily: 'Rubik-Bold',
          }}
          numberOfLines={2}
        >
          {post.title}
        </Text>

        {/* Content - Lighter Description */}
        <Text
          style={{
            fontSize: 15,
            color: palette.textSecondary,
            marginBottom: 16,
            lineHeight: 22,
            fontFamily: 'Rubik-Regular',
          }}
          numberOfLines={3}
        >
          {post.content}
        </Text>

        {/* Tags - Pill Chips */}
        {post.tags.length > 0 && (
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              marginBottom: 16,
              gap: 8,
            }}
          >
            {post.tags.slice(0, 3).map((tag) => (
              <View
                key={tag}
                style={{
                  backgroundColor: palette.surfaceMuted,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: palette.border,
                }}
              >
                <Text
                  style={{
                    color: palette.textSecondary,
                    fontSize: 12,
                    fontFamily: 'Rubik-Medium',
                  }}
                >
                  #{tag}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Footer Row - Structured Metrics */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: palette.border,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
            {/* Comments */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text
                style={{
                  color: palette.textMuted,
                  fontSize: 14,
                  marginRight: 6,
                  fontFamily: 'Rubik-Regular',
                }}
              >
                💬
              </Text>
              <Text
                style={{
                  color: palette.textSecondary,
                  fontSize: 14,
                  fontFamily: 'Rubik-Medium',
                }}
              >
                {post.replies_count || 0}
              </Text>
            </View>

            {/* Views */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text
                style={{
                  color: palette.textMuted,
                  fontSize: 14,
                  marginRight: 6,
                  fontFamily: 'Rubik-Regular',
                }}
              >
                👁️
              </Text>
              <Text
                style={{
                  color: palette.textSecondary,
                  fontSize: 14,
                  fontFamily: 'Rubik-Medium',
                }}
              >
                {post.views || 0}
              </Text>
            </View>

            {/* Likes */}
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center' }}
              onPress={() => handleLikePost(post.id)}
            >
              <Text
                style={{
                  color: postLikes[post.id] ? palette.danger : palette.textMuted,
                  fontSize: 14,
                  marginRight: 6,
                  fontFamily: 'Rubik-Regular',
                }}
              >
                ❤️
              </Text>
              <Text
                style={{
                  color: palette.textSecondary,
                  fontSize: 14,
                  fontFamily: 'Rubik-Medium',
                }}
              >
                {post.likes_count || 0}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Trending Badge */}
          {post.is_trending && (
            <View
              style={{
                backgroundColor: palette.danger + '15',
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: palette.danger + '40',
              }}
            >
              <Text
                style={{
                  color: palette.danger,
                  fontSize: 12,
                  fontWeight: '600',
                  fontFamily: 'Rubik-SemiBold',
                }}
              >
                🔥 Trending
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Animated Floating Action Button
  const AnimatedFAB = () => {
    const scale = useSharedValue(1);

    const handlePress = () => {
      scale.value = withSequence(
        withSpring(0.9, { damping: 15, stiffness: 400 }),
        withSpring(1, { damping: 15, stiffness: 400 })
      );
      setShowNewPost(true);
    };

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    return (
      <Animated.View
        style={[
          {
            position: 'absolute',
            bottom: 24,
            right: 24,
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: palette.primary,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: palette.shadow,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 12,
            elevation: 8,
            zIndex: 10,
          },
          animatedStyle,
        ]}
      >
        <Pressable onPress={handlePress} android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: true }}>
          <Text
            style={{
              color: palette.surface,
              fontSize: 28,
              fontWeight: '300',
              fontFamily: 'Rubik-Light',
            }}
          >
            +
          </Text>
        </Pressable>
      </Animated.View>
    );
  };

  const renderForumsTab = () => {
    // Filter posts based on search query (category already filtered by API)
    const filteredPosts = forumPosts
      .filter(post => !searchQuery || post.title.toLowerCase().includes(searchQuery.toLowerCase()) || post.content.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
      <View style={{ flex: 1, backgroundColor: palette.background }}>
        {/* Sticky Header - Search + Filters */}
        <View
          style={{
            backgroundColor: palette.background,
            paddingBottom: 8,
            borderBottomWidth: 1,
            borderBottomColor: palette.border,
            shadowColor: palette.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
            zIndex: 1,
          }}
        >
          {/* Search Bar */}
          <View
            style={{
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: 12,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: palette.surface,
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderWidth: 1,
                borderColor: palette.border,
                shadowColor: palette.shadow,
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 1,
              }}
            >
              <Text
                style={{
                  color: palette.textMuted,
                  marginRight: 10,
                  fontSize: 18,
                }}
              >
                🔍
              </Text>
              <TextInput
                placeholder="Search forums..."
                placeholderTextColor={palette.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={{
                  flex: 1,
                  color: palette.textPrimary,
                  fontSize: 15,
                  fontFamily: 'Rubik-Regular',
                }}
              />
            </View>
          </View>

          {/* Category Filters */}
          {renderCategoryFilter()}
        </View>

        {/* Posts List */}
        {postsLoading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 }}>
            <ActivityIndicator size="large" color={palette.primary} />
          </View>
        ) : filteredPosts.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>💬</Text>
            <Text style={{ fontSize: 18, fontWeight: '500', color: palette.textSecondary, marginBottom: 8 }}>
              No posts yet
            </Text>
            <Text style={{ color: palette.textMuted, textAlign: 'center', paddingHorizontal: 32 }}>
              Be the first to start a discussion!
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredPosts}
            renderItem={renderPostCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              paddingTop: 0,
              paddingBottom: 100, // Space for FAB
            }}
            showsVerticalScrollIndicator={false}
            refreshing={postsLoading}
            onRefresh={loadForumPosts}
          />
        )}
        <AnimatedFAB />
      </View>
    );
  };

  const renderQATab = () => {
    const expertPosts = forumPosts.filter(post => post.category === 'expert');
    return (
      <View style={{ flex: 1, paddingHorizontal: 16 }}>
        <LinearGradient colors={[palette.primary, palette.secondary]} style={{ borderRadius: 16, padding: 24, marginBottom: 24 }}>
          <Text style={{ color: '#0B0F17', fontSize: 20, fontWeight: 'bold', marginBottom: 8 }}>Ask an Expert</Text>
          <Text style={{ color: '#0B0F17', opacity: 0.9 }}>Get answers from real estate professionals</Text>
        </LinearGradient>

        {postsLoading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={palette.primary} />
          </View>
        ) : expertPosts.length === 0 ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <Text style={{ color: palette.textMuted }}>No expert posts yet</Text>
          </View>
        ) : (
          <ScrollView>
            {expertPosts.map((post) => (
              <React.Fragment key={post.id}>{renderPostCard(post)}</React.Fragment>
            ))}
          </ScrollView>
        )}
      </View>
    );
  };

  const renderNeighborhoodsTab = () => {
    const neighborhoodPosts = forumPosts.filter(post => post.category === 'neighborhood');
    return (
      <View style={{ flex: 1, paddingHorizontal: 16 }}>
        <LinearGradient colors={[palette.primary, palette.secondary]} style={{ borderRadius: 16, padding: 24, marginBottom: 24 }}>
          <Text style={{ color: '#0B0F17', fontSize: 20, fontWeight: 'bold', marginBottom: 8 }}>Neighborhood Guides</Text>
          <Text style={{ color: '#0B0F17', opacity: 0.9 }}>Discover local insights and community info</Text>
        </LinearGradient>

        {postsLoading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={palette.primary} />
          </View>
        ) : neighborhoodPosts.length === 0 ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <Text style={{ color: palette.textMuted }}>No neighborhood posts yet</Text>
          </View>
        ) : (
          <ScrollView>
            {neighborhoodPosts.map((post) => (
              <React.Fragment key={post.id}>{renderPostCard(post)}</React.Fragment>
            ))}
          </ScrollView>
        )}
      </View>
    );
  };

  const renderTrendingTab = () => {
    const trendingPosts = forumPosts.filter(post => post.is_trending);
    return (
      <View style={{ flex: 1, paddingHorizontal: 16 }}>
        <LinearGradient colors={[palette.primary, palette.secondary]} style={{ borderRadius: 16, padding: 24, marginBottom: 24 }}>
          <Text style={{ color: '#0B0F17', fontSize: 20, fontWeight: 'bold', marginBottom: 8 }}>Trending Topics</Text>
          <Text style={{ color: '#0B0F17', opacity: 0.9 }}>What&apos;s hot in the community right now</Text>
        </LinearGradient>

        {postsLoading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={palette.primary} />
          </View>
        ) : trendingPosts.length === 0 ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <Text style={{ color: palette.textMuted }}>No trending posts yet</Text>
          </View>
        ) : (
          <ScrollView>
            {trendingPosts.map((post) => (
              <React.Fragment key={post.id}>{renderPostCard(post)}</React.Fragment>
            ))}
          </ScrollView>
        )}
      </View>
    );
  };

  const renderPostDetail = () => (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: palette.border, backgroundColor: palette.surface }}>
        <TouchableOpacity onPress={() => setSelectedPost(null)}>
          <Text style={{ color: palette.secondary, fontWeight: 'bold' }}>← Back</Text>
        </TouchableOpacity>
        <Text style={{ fontWeight: 'bold', color: palette.textPrimary }}>Post Details</Text>
        <TouchableOpacity onPress={handleShare}>
          <Text style={{ color: palette.secondary, fontWeight: 'bold' }}>Share</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1, padding: 16 }}>
        <View style={{ backgroundColor: palette.surfaceMuted, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: palette.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Image source={{ uri: selectedPost?.author?.avatar || 'https://via.placeholder.com/48' }} style={{ width: 48, height: 48, borderRadius: 24, marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontWeight: 'bold', color: palette.textPrimary }}>{selectedPost?.author?.name || 'Anonymous'}</Text>
              </View>
              <Text style={{ color: palette.textMuted, fontSize: 14 }}>{selectedPost && formatTimeAgo(new Date(selectedPost.created_at))}</Text>
            </View>
          </View>

          <Text style={{ fontWeight: 'bold', fontSize: 20, color: palette.textPrimary, marginBottom: 12 }}>{selectedPost?.title}</Text>
          <Text style={{ color: palette.textSecondary, fontSize: 16, lineHeight: 24, marginBottom: 16 }}>{selectedPost?.content}</Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center' }}
                onPress={() => selectedPost && handleLikePost(selectedPost.id)}
              >
                <Text style={{ color: (selectedPost && postLikes[selectedPost.id]) ? palette.danger : palette.textMuted, marginRight: 4 }}>❤️</Text>
                <Text style={{ color: palette.textSecondary }}>{selectedPost?.likes_count || 0}</Text>
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ color: palette.textMuted, marginRight: 4 }}>💬</Text>
                <Text style={{ color: palette.textSecondary }}>{selectedPost?.replies_count || 0}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ color: palette.textMuted, marginRight: 4 }}>👁️</Text>
                <Text style={{ color: palette.textSecondary }}>{selectedPost?.views || 0}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Comments List */}
        {selectedPost?.comments && selectedPost.comments.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontWeight: 'bold', color: palette.textPrimary, marginBottom: 12, fontSize: 18 }}>Comments</Text>
            {selectedPost.comments.map((comment) => (
              <View key={comment.id} style={{ backgroundColor: palette.surfaceMuted, borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: palette.border }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Image source={{ uri: comment.author?.avatar || 'https://via.placeholder.com/32' }} style={{ width: 32, height: 32, borderRadius: 16, marginRight: 8 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '500', color: palette.textPrimary }}>{comment.author?.name || 'Anonymous'}</Text>
                    <Text style={{ color: palette.textMuted, fontSize: 12 }}>{formatTimeAgo(new Date(comment.created_at))}</Text>
                  </View>
                </View>
                <Text style={{ color: palette.textSecondary, lineHeight: 20 }}>{comment.comment}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Reply Section */}
        <View style={{ backgroundColor: palette.surfaceMuted, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: palette.border }}>
          <Text style={{ fontWeight: 'bold', color: palette.textPrimary, marginBottom: 12 }}>Add Reply</Text>
          <TextInput
            value={newReply}
            onChangeText={setNewReply}
            placeholder="Share your thoughts..."
            placeholderTextColor={palette.textMuted}
            multiline
            style={{ backgroundColor: palette.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: palette.border, marginBottom: 12, minHeight: 80, color: palette.textPrimary }}
          />
          <TouchableOpacity
            onPress={handleAddReply}
            style={{ backgroundColor: palette.primary, borderRadius: 12, paddingVertical: 12 }}
          >
            <Text style={{ color: '#0B0F17', fontWeight: 'bold', textAlign: 'center' }}>Post Reply</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={() => {
      setSelectedPost(null);
      onClose();
    }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: palette.surface, borderBottomWidth: 1, borderBottomColor: palette.border }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: palette.textPrimary }}>Community Forums</Text>
          <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
            <Text style={{ fontSize: 24, color: palette.textMuted }}>✕</Text>
          </TouchableOpacity>
        </View>

        {selectedPost ? (
          renderPostDetail()
        ) : (
          <>
            {/* Tabs */}
            <View style={{ flexDirection: 'row', backgroundColor: palette.surface, borderBottomWidth: 1, borderBottomColor: palette.border }}>
              <TouchableOpacity
                onPress={() => setActiveTab('forums')}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderBottomWidth: activeTab === 'forums' ? 2 : 0,
                  borderBottomColor: palette.primary,
                }}
              >
                <Text style={{
                  textAlign: 'center',
                  fontWeight: '500',
                  color: activeTab === 'forums' ? palette.primary : palette.textMuted,
                }}>
                  Forums
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveTab('qa')}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderBottomWidth: activeTab === 'qa' ? 2 : 0,
                  borderBottomColor: palette.primary,
                }}
              >
                <Text style={{
                  textAlign: 'center',
                  fontWeight: '500',
                  color: activeTab === 'qa' ? palette.primary : palette.textMuted,
                }}>
                  Q&A
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveTab('neighborhoods')}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderBottomWidth: activeTab === 'neighborhoods' ? 2 : 0,
                  borderBottomColor: palette.primary,
                }}
              >
                <Text style={{
                  textAlign: 'center',
                  fontWeight: '500',
                  color: activeTab === 'neighborhoods' ? palette.primary : palette.textMuted,
                }}>
                  Neighborhoods
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveTab('trending')}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderBottomWidth: activeTab === 'trending' ? 2 : 0,
                  borderBottomColor: palette.primary,
                }}
              >
                <Text style={{
                  textAlign: 'center',
                  fontWeight: '500',
                  color: activeTab === 'trending' ? palette.primary : palette.textMuted,
                }}>
                  Trending
                </Text>
              </TouchableOpacity>
            </View>

            {/* Content */}
            {activeTab === 'forums' && renderForumsTab()}
            {activeTab === 'qa' && renderQATab()}
            {activeTab === 'neighborhoods' && renderNeighborhoodsTab()}
            {activeTab === 'trending' && renderTrendingTab()}
          </>
        )}

        {/* New Post Modal */}
        <Modal visible={showNewPost} animationType="slide" transparent>
          <View style={{ flex: 1, backgroundColor: palette.overlay, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ backgroundColor: palette.surfaceMuted, borderRadius: 24, padding: 24, width: '92%', maxHeight: '80%', borderWidth: 1, borderColor: palette.border }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: palette.textPrimary }}>Create New Post</Text>
                <TouchableOpacity onPress={() => setShowNewPost(false)}>
                  <Text style={{ fontSize: 24, color: palette.textMuted }}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView>
                <TextInput
                  value={newPost.title}
                  onChangeText={(text) => setNewPost({ ...newPost, title: text })}
                  placeholder="Post title..."
                  placeholderTextColor={palette.textMuted}
                  style={{ borderWidth: 1, borderColor: palette.border, borderRadius: 12, padding: 12, marginBottom: 16, color: palette.textPrimary, backgroundColor: palette.surface }}
                />

                <TextInput
                  value={newPost.content}
                  onChangeText={(text) => setNewPost({ ...newPost, content: text })}
                  placeholder="Share your thoughts..."
                  placeholderTextColor={palette.textMuted}
                  multiline
                  style={{ borderWidth: 1, borderColor: palette.border, borderRadius: 12, padding: 12, marginBottom: 16, minHeight: 120, color: palette.textPrimary, backgroundColor: palette.surface }}
                />

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                  {categories.slice(1).map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      onPress={() => setNewPost({ ...newPost, category: category.id as any })}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 20,
                        backgroundColor: newPost.category === category.id ? palette.primary : palette.surface,
                        borderWidth: 1,
                        borderColor: newPost.category === category.id ? palette.primary : palette.border,
                      }}
                    >
                      <Text style={{
                        fontWeight: '500',
                        color: newPost.category === category.id ? '#0B0F17' : palette.textPrimary,
                      }}>
                        {category.icon} {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity
                    onPress={() => setShowNewPost(false)}
                    style={{ flex: 1, backgroundColor: palette.surface, borderRadius: 12, paddingVertical: 12, borderWidth: 1, borderColor: palette.border }}
                  >
                    <Text style={{ textAlign: 'center', fontWeight: 'bold', color: palette.textPrimary }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleCreatePost}
                    style={{ flex: 1, backgroundColor: palette.primary, borderRadius: 12, paddingVertical: 12 }}
                  >
                    <Text style={{ textAlign: 'center', fontWeight: 'bold', color: '#0B0F17' }}>Create Post</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
};

export default CommunityForums; 