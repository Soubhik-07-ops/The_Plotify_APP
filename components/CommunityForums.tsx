import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Share,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import Button from "@/components/ui/Button";
import BackButton from "@/components/ui/BackButton";
import Card from "@/components/ui/Card";
import Chip from "@/components/ui/Chip";
import Section from "@/components/ui/Section";
import { Body, BodyMuted, Caption, HeadingMedium, HeadingSmall } from "@/components/ui/Typography";
import { palette, spacing } from "@/constants/theme";
import { useGlobalContext } from "@/lib/global-provider";
import {
  addForumComment,
  createForumPost,
  getForumPostById,
  getForumPosts,
  hasUserLikedPost,
  toggleForumPostLike,
  type ForumComment,
  type ForumPost,
} from "@/lib/supabase-db";

type TabKey = "forums" | "qa" | "neighborhoods" | "trending";

const tabLabels: Record<TabKey, string> = {
  forums: "Forums",
  qa: "Q&A",
  neighborhoods: "Neighborhoods",
  trending: "Trending",
};

const categoryFilters = [
  { id: "all", name: "All" },
  { id: "buying", name: "Buying" },
  { id: "selling", name: "Selling" },
  { id: "investing", name: "Investing" },
];

const newPostCategories = [
  { id: "buying", name: "Buying" },
  { id: "selling", name: "Selling" },
  { id: "investing", name: "Investing" },
  { id: "neighborhood", name: "Neighborhoods" },
  { id: "expert", name: "Expert Q&A" },
];

export default function CommunityForums({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { user } = useGlobalContext();
  const [activeTab, setActiveTab] = useState<TabKey>("forums");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [forumPosts, setForumPosts] = useState<ForumPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postLikes, setPostLikes] = useState<Record<string, boolean>>({});
  const [selectedPost, setSelectedPost] = useState<(ForumPost & { comments?: ForumComment[] }) | null>(null);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newReply, setNewReply] = useState("");
  const [newPost, setNewPost] = useState({
    title: "",
    content: "",
    category: "buying",
  });

  useEffect(() => {
    if (visible) {
      void loadForumPosts();
    }
  }, [selectedCategory, visible]);

  useEffect(() => {
    if (visible && user && forumPosts.length) {
      void loadPostLikes();
    }
  }, [forumPosts, user, visible]);

  const loadForumPosts = async () => {
    setPostsLoading(true);
    try {
      const category = selectedCategory === "all" ? undefined : selectedCategory;
      const posts = await getForumPosts(category, 50);
      setForumPosts(posts);
    } catch (error) {
      console.error("Error loading forum posts:", error);
      setForumPosts([]);
    } finally {
      setPostsLoading(false);
    }
  };

  const loadPostLikes = async () => {
    if (!user) return;
    const likes: Record<string, boolean> = {};
    for (const post of forumPosts) {
      try {
        likes[post.id] = await hasUserLikedPost(post.id, user.id);
      } catch {
        likes[post.id] = false;
      }
    }
    setPostLikes(likes);
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  const filteredPosts = useMemo(() => {
    const base = forumPosts.filter((post) => {
      if (activeTab === "qa") return post.category === "expert";
      if (activeTab === "neighborhoods") return post.category === "neighborhood";
      if (activeTab === "trending") return post.is_trending;
      return true;
    });

    if (!searchQuery.trim()) return base;

    const query = searchQuery.toLowerCase();
    return base.filter(
      (post) =>
        post.title.toLowerCase().includes(query) ||
        post.content.toLowerCase().includes(query)
    );
  }, [activeTab, forumPosts, searchQuery]);

  const handleCreatePost = async () => {
    if (!newPost.title.trim() || !newPost.content.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    if (!user) {
      Alert.alert("Error", "You must be logged in to create a post");
      return;
    }
    try {
      await createForumPost({
        title: newPost.title,
        content: newPost.content,
        category: newPost.category as any,
        tags: [],
      });
      setShowNewPost(false);
      setNewPost({ title: "", content: "", category: "buying" });
      await loadForumPosts();
    } catch (error) {
      console.error("Error creating post:", error);
      Alert.alert("Error", "Failed to create post. Please try again.");
    }
  };

  const handleViewPost = async (post: ForumPost) => {
    try {
      const fullPost = await getForumPostById(post.id);
      setSelectedPost(fullPost || post);
    } catch (error) {
      console.error("Error loading post details:", error);
      setSelectedPost(post);
    }
  };

  const handleLikePost = async (postId: string) => {
    if (!user) {
      Alert.alert("Error", "You must be logged in to like a post");
      return;
    }
    try {
      const liked = await toggleForumPostLike(postId);
      setPostLikes((prev) => ({ ...prev, [postId]: liked }));
      await loadForumPosts();
      if (selectedPost?.id === postId) {
        const fullPost = await getForumPostById(postId);
        if (fullPost) setSelectedPost(fullPost);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const handleAddReply = async () => {
    if (!newReply.trim()) {
      Alert.alert("Error", "Please enter a reply");
      return;
    }
    if (!selectedPost || !user) {
      Alert.alert("Error", "You must be logged in to add a reply");
      return;
    }
    try {
      await addForumComment(selectedPost.id, newReply);
      setNewReply("");
      const updated = await getForumPostById(selectedPost.id);
      if (updated) setSelectedPost(updated);
    } catch (error) {
      console.error("Error adding reply:", error);
      Alert.alert("Error", "Failed to add reply. Please try again.");
    }
  };

  const handleShare = async () => {
    if (!selectedPost) return;
    try {
      await Share.share({
        message: `${selectedPost.title}\n\n${selectedPost.content}`,
      });
    } catch {
      Alert.alert("Error", "Could not share the post.");
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={() => {
        setSelectedPost(null);
        onClose();
      }}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
        <View
          style={{
            paddingHorizontal: spacing.xl,
            paddingVertical: spacing.md,
            borderBottomWidth: 1,
            borderBottomColor: palette.border,
            backgroundColor: palette.surface,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <BackButton
            onPress={() => {
              if (selectedPost) {
                setSelectedPost(null);
              } else {
                onClose();
              }
            }}
          />
          <HeadingSmall>{selectedPost ? "Post Details" : "Community Forums"}</HeadingSmall>
          <TouchableOpacity onPress={selectedPost ? handleShare : () => setShowNewPost(true)} style={{ width: 40, alignItems: "flex-end" }}>
            <Ionicons
              name={selectedPost ? "share-social-outline" : "add"}
              size={22}
              color={palette.primary}
            />
          </TouchableOpacity>
        </View>

        {selectedPost ? (
          <PostDetailView
            selectedPost={selectedPost}
            newReply={newReply}
            onChangeReply={setNewReply}
            onLike={handleLikePost}
            onReply={handleAddReply}
            liked={postLikes[selectedPost.id]}
            formatTimeAgo={formatTimeAgo}
          />
        ) : (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}
            >
              {(Object.keys(tabLabels) as TabKey[]).map((tab) => (
                <Pressable key={tab} onPress={() => setActiveTab(tab)} style={{ marginRight: spacing.sm }}>
                  <Chip label={tabLabels[tab]} active={activeTab === tab} />
                </Pressable>
              ))}
            </ScrollView>

            <View style={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.md }}>
              <Card style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="search-outline" size={18} color={palette.textMuted} />
                  <TextInput
                    placeholder="Search discussions..."
                    placeholderTextColor={palette.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    style={{
                      flex: 1,
                      color: palette.textPrimary,
                      marginLeft: spacing.sm,
                      fontFamily: "PlayfairDisplay-Regular",
                      fontSize: 15,
                    }}
                  />
                </View>
              </Card>
            </View>

            {activeTab === "forums" ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}
              >
                {categoryFilters.map((category) => (
                  <Pressable key={category.id} onPress={() => setSelectedCategory(category.id)} style={{ marginRight: spacing.sm }}>
                    <Chip label={category.name} active={selectedCategory === category.id} />
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <View style={{ paddingHorizontal: spacing.xl }}>
                <Card style={{ backgroundColor: palette.surfaceElevated, marginBottom: spacing.lg }}>
                  <HeadingSmall style={{ marginBottom: spacing.xs }}>
                    {activeTab === "qa"
                      ? "Ask an Expert"
                      : activeTab === "neighborhoods"
                      ? "Neighborhood Guides"
                      : "Trending Topics"}
                  </HeadingSmall>
                  <BodyMuted>
                    {activeTab === "qa"
                      ? "Get answers from real estate professionals."
                      : activeTab === "neighborhoods"
                      ? "Discover local insights and community information."
                      : "See the conversations drawing the most attention right now."}
                  </BodyMuted>
                </Card>
              </View>
            )}

            {postsLoading ? (
              <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" color={palette.primary} />
              </View>
            ) : filteredPosts.length === 0 ? (
              <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: spacing.xl }}>
                <HeadingSmall style={{ marginBottom: spacing.sm }}>No posts yet</HeadingSmall>
                <BodyMuted align="center">
                  Be the first to start a discussion in this category.
                </BodyMuted>
              </View>
            ) : (
              <FlatList
                data={filteredPosts}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <PostCard
                    post={item}
                    liked={postLikes[item.id]}
                    onPress={() => handleViewPost(item)}
                    onLike={() => handleLikePost(item.id)}
                    formatTimeAgo={formatTimeAgo}
                  />
                )}
                contentContainerStyle={{ paddingBottom: 96, paddingTop: 4 }}
                refreshing={postsLoading}
                onRefresh={loadForumPosts}
                showsVerticalScrollIndicator={false}
              />
            )}

            <TouchableOpacity
              onPress={() => setShowNewPost(true)}
              style={{
                position: "absolute",
                right: spacing.xl,
                bottom: spacing["3xl"],
                width: 56,
                height: 56,
                borderRadius: 28,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: palette.primary,
                shadowColor: "#000",
                shadowOpacity: 0.16,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 6 },
                elevation: 6,
              }}
            >
              <Ionicons name="add" size={26} color={palette.surface} />
            </TouchableOpacity>
          </>
        )}

        <Modal visible={showNewPost} animationType="slide" transparent>
          <View style={{ flex: 1, backgroundColor: palette.overlay, justifyContent: "center", padding: spacing.xl }}>
            <Card style={{ maxHeight: "84%" }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg }}>
                <HeadingSmall>Create New Post</HeadingSmall>
                <TouchableOpacity onPress={() => setShowNewPost(false)}>
                  <Ionicons name="close" size={22} color={palette.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <Section title="Post Details" subtitle="Write a clear title and a concise body.">
                  <Card style={{ marginBottom: spacing.md }}>
                    <TextInput
                      value={newPost.title}
                      onChangeText={(text) => setNewPost((prev) => ({ ...prev, title: text }))}
                      placeholder="Post title..."
                      placeholderTextColor={palette.textMuted}
                      style={{ fontFamily: "PlayfairDisplay-Regular", fontSize: 15, color: palette.textPrimary }}
                    />
                  </Card>
                  <Card style={{ marginBottom: spacing.md }}>
                    <TextInput
                      value={newPost.content}
                      onChangeText={(text) => setNewPost((prev) => ({ ...prev, content: text }))}
                      placeholder="Share your thoughts..."
                      placeholderTextColor={palette.textMuted}
                      multiline
                      style={{ minHeight: 120, textAlignVertical: "top", fontFamily: "PlayfairDisplay-Regular", fontSize: 15, color: palette.textPrimary }}
                    />
                  </Card>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: spacing.lg }}>
                    {newPostCategories.map((category) => (
                      <Pressable key={category.id} onPress={() => setNewPost((prev) => ({ ...prev, category: category.id }))} style={{ marginRight: 8, marginBottom: 8 }}>
                        <Chip label={category.name} active={newPost.category === category.id} />
                      </Pressable>
                    ))}
                  </View>
                  <View style={{ flexDirection: "row" }}>
                    <Button variant="secondary" onPress={() => setShowNewPost(false)} style={{ flex: 1, marginRight: spacing.sm }}>
                      <Body>Cancel</Body>
                    </Button>
                    <Button onPress={handleCreatePost} style={{ flex: 1, marginLeft: spacing.sm }}>
                      <Body style={{ color: palette.surface }}>Create</Body>
                    </Button>
                  </View>
                </Section>
              </ScrollView>
            </Card>
          </View>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
}

function Metric({ icon, value }: { icon: keyof typeof Ionicons.glyphMap; value: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginRight: spacing.lg }}>
      <Ionicons name={icon} size={15} color={palette.textMuted} />
      <Caption style={{ marginLeft: 6 }}>{value}</Caption>
    </View>
  );
}

function PostCard({
  post,
  liked,
  onPress,
  onLike,
  formatTimeAgo,
}: {
  post: ForumPost;
  liked?: boolean;
  onPress: () => void;
  onLike: () => void;
  formatTimeAgo: (date: Date) => string;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Card style={{ marginHorizontal: spacing.lg, marginBottom: spacing.lg }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: spacing.lg }}>
          <Image
            source={{ uri: post.author?.avatar || "https://via.placeholder.com/44" }}
            style={{ width: 44, height: 44, borderRadius: 22, marginRight: 12 }}
          />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 2 }}>
              <Body>{post.author?.name || "Anonymous"}</Body>
              {post.is_pinned ? <Chip label="Pinned" compact style={{ marginLeft: 8, backgroundColor: `${palette.secondary}18` }} /> : null}
            </View>
            <Caption>{formatTimeAgo(new Date(post.created_at))}</Caption>
          </View>
        </View>

        <HeadingSmall style={{ marginBottom: spacing.sm }}>{post.title}</HeadingSmall>
        <BodyMuted numberOfLines={3} style={{ marginBottom: spacing.lg }}>
          {post.content}
        </BodyMuted>

        {post.tags.length ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: spacing.lg }}>
            {post.tags.slice(0, 3).map((tag) => (
              <Chip key={tag} label={`#${tag}`} compact style={{ marginRight: 8, marginBottom: 8 }} />
            ))}
          </View>
        ) : null}

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: palette.border }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Metric icon="chatbubble-ellipses-outline" value={post.replies_count || 0} />
            <Metric icon="eye-outline" value={post.views || 0} />
            <TouchableOpacity onPress={onLike} style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name={liked ? "heart" : "heart-outline"} size={15} color={liked ? palette.danger : palette.textMuted} />
              <Caption style={{ marginLeft: 6 }}>{post.likes_count || 0}</Caption>
            </TouchableOpacity>
          </View>
          {post.is_trending ? <Chip label="Trending" compact style={{ backgroundColor: `${palette.danger}14` }} /> : null}
        </View>
      </Card>
    </TouchableOpacity>
  );
}

function PostDetailView({
  selectedPost,
  newReply,
  onChangeReply,
  onLike,
  onReply,
  liked,
  formatTimeAgo,
}: {
  selectedPost: ForumPost & { comments?: ForumComment[] };
  newReply: string;
  onChangeReply: (text: string) => void;
  onLike: (postId: string) => void;
  onReply: () => void;
  liked?: boolean;
  formatTimeAgo: (date: Date) => string;
}) {
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing["4xl"] }}>
      <Card style={{ marginBottom: spacing.lg }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: spacing.md }}>
          <Image
            source={{ uri: selectedPost.author?.avatar || "https://via.placeholder.com/48" }}
            style={{ width: 48, height: 48, borderRadius: 24, marginRight: 12 }}
          />
          <View style={{ flex: 1 }}>
            <Body>{selectedPost.author?.name || "Anonymous"}</Body>
            <Caption>{formatTimeAgo(new Date(selectedPost.created_at))}</Caption>
          </View>
        </View>

        <HeadingMedium style={{ fontSize: 22, lineHeight: 30, marginBottom: spacing.md }}>
          {selectedPost.title}
        </HeadingMedium>
        <BodyMuted style={{ marginBottom: spacing.lg }}>{selectedPost.content}</BodyMuted>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity onPress={() => onLike(selectedPost.id)} style={{ flexDirection: "row", alignItems: "center", marginRight: spacing.lg }}>
            <Ionicons name={liked ? "heart" : "heart-outline"} size={16} color={liked ? palette.danger : palette.textMuted} />
            <Caption style={{ marginLeft: 6 }}>{selectedPost.likes_count || 0}</Caption>
          </TouchableOpacity>
          <Metric icon="chatbubble-ellipses-outline" value={selectedPost.replies_count || 0} />
          <Metric icon="eye-outline" value={selectedPost.views || 0} />
        </View>
      </Card>

      {selectedPost.comments?.length ? (
        <Section title="Comments">
          {selectedPost.comments.map((comment) => (
            <Card key={comment.id} style={{ marginBottom: spacing.md }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: spacing.sm }}>
                <Image
                  source={{ uri: comment.author?.avatar || "https://via.placeholder.com/32" }}
                  style={{ width: 32, height: 32, borderRadius: 16, marginRight: 8 }}
                />
                <View style={{ flex: 1 }}>
                  <Body>{comment.author?.name || "Anonymous"}</Body>
                  <Caption>{formatTimeAgo(new Date(comment.created_at))}</Caption>
                </View>
              </View>
              <BodyMuted>{comment.comment}</BodyMuted>
            </Card>
          ))}
        </Section>
      ) : null}

      <Section title="Add Reply">
        <Card style={{ marginBottom: spacing.md }}>
          <TextInput
            value={newReply}
            onChangeText={onChangeReply}
            placeholder="Share your thoughts..."
            placeholderTextColor={palette.textMuted}
            multiline
            style={{ minHeight: 90, textAlignVertical: "top", fontFamily: "PlayfairDisplay-Regular", fontSize: 15, color: palette.textPrimary }}
          />
        </Card>
        <Button onPress={onReply}>
          <Body style={{ color: palette.surface }}>Post Reply</Body>
        </Button>
      </Section>
    </ScrollView>
  );
}
