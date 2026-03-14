import React, { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import Button from "@/components/ui/Button";
import BackButton from "@/components/ui/BackButton";
import Card from "@/components/ui/Card";
import Section from "@/components/ui/Section";
import { BodyMuted, Caption, HeadingSmall } from "@/components/ui/Typography";
import { palette, spacing } from "@/constants/theme";
import { useGlobalContext } from "@/lib/global-provider";
import { notificationService, type NotificationData } from "@/lib/notifications";

interface NotificationCenterProps {
  visible: boolean;
  onClose: () => void;
}

const typeIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  newProperty: "home-outline",
  priceDrop: "trending-down-outline",
  openHouse: "calendar-outline",
  marketUpdate: "stats-chart-outline",
  agentMessage: "chatbubble-ellipses-outline",
  savedSearch: "search-outline",
};

const typeColors: Record<string, string> = {
  newProperty: palette.primary,
  priceDrop: "#FF9800",
  openHouse: palette.secondary,
  marketUpdate: palette.secondary,
  agentMessage: palette.primary,
  savedSearch: palette.secondary,
};

export default function NotificationCenter({ visible, onClose }: NotificationCenterProps) {
  const { user } = useGlobalContext();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && user) {
      void loadData();
    }
  }, [user, visible]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const notificationsData = await notificationService.getUserNotifications(user.id);
      setNotifications(notificationsData);
    } catch (error) {
      console.error("Error loading notification data:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await notificationService.markNotificationAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId ? { ...notification, read: true } : notification
        )
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter((notification) => !notification.read);
      await Promise.all(
        unreadNotifications.map((notification) =>
          notificationService.markNotificationAsRead(notification.id!)
        )
      );
      setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })));
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const deleteNotification = (notificationId: string) => {
    Alert.alert("Delete this notification?", undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          if (!user?.id) return;
          const previous = notifications;
          setNotifications((prev) => prev.filter((notification) => notification.id !== notificationId));
          try {
            await notificationService.deleteNotification(notificationId, user.id);
          } catch (error) {
            console.error("Error deleting notification:", error);
            setNotifications(previous);
            Alert.alert("Error", "Could not delete notification. Please try again.");
          }
        },
      },
    ]);
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
        <View
          style={{
            paddingHorizontal: spacing.xl,
            paddingVertical: spacing.md,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottomWidth: 1,
            borderBottomColor: palette.border,
          }}
        >
          <BackButton onPress={onClose} />
          <HeadingSmall>Notifications</HeadingSmall>
          <View style={{ width: 36, alignItems: "flex-end" }}>
            {unreadCount > 0 ? (
              <TouchableOpacity onPress={markAllAsRead}>
                <Caption style={{ color: palette.primary }}>Mark all</Caption>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing["4xl"] }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} tintColor={palette.primary} />}
        >
          <Section
            title={unreadCount ? `${unreadCount} unread update${unreadCount === 1 ? "" : "s"}` : "All caught up"}
            subtitle="Property alerts, saved search matches, admin updates, and messages appear here."
          >
            {notifications.length ? (
              <View style={{ gap: spacing.lg }}>
                {notifications.map((notification) => {
                  const tint = typeColors[notification.type] || palette.primary;
                  return (
                    <TouchableOpacity
                      key={notification.id}
                      activeOpacity={0.88}
                      onPress={() => !notification.read && markAsRead(notification.id!)}
                    >
                      <Card
                        style={{
                          backgroundColor: notification.read ? palette.surface : palette.surfaceElevated,
                        }}
                      >
                        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                          <View
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 22,
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor: `${tint}18`,
                              marginRight: spacing.md,
                            }}
                          >
                            <Ionicons
                              name={typeIcons[notification.type] || "notifications-outline"}
                              size={20}
                              color={tint}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <View
                              style={{
                                flexDirection: "row",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                                marginBottom: spacing.xs,
                              }}
                            >
                              <HeadingSmall style={{ flex: 1, marginRight: spacing.sm, fontSize: 16, lineHeight: 22 }}>
                                {notification.title}
                              </HeadingSmall>
                              {!notification.read ? (
                                <View
                                  style={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: 5,
                                    backgroundColor: palette.primary,
                                    marginTop: 6,
                                  }}
                                />
                              ) : null}
                            </View>
                            <BodyMuted style={{ marginBottom: spacing.sm }}>{notification.body}</BodyMuted>
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "space-between",
                              }}
                            >
                              <Caption>{formatDate(notification.createdAt)}</Caption>
                              <Button
                                label="Delete"
                                variant="secondary"
                                fullWidth={false}
                                onPress={() => deleteNotification(notification.id!)}
                                style={{ minHeight: 36, paddingHorizontal: spacing.md }}
                              />
                            </View>
                          </View>
                        </View>
                      </Card>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <Card style={{ alignItems: "center", paddingVertical: spacing["4xl"] }}>
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: palette.surfaceMuted,
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: spacing.lg,
                  }}
                >
                  <Ionicons name="notifications-outline" size={28} color={palette.textMuted} />
                </View>
                <HeadingSmall style={{ marginBottom: spacing.sm }}>No notifications yet</HeadingSmall>
                <BodyMuted align="center">
                  You&apos;ll see new property matches, price drops, announcements, and activity updates here.
                </BodyMuted>
              </Card>
            )}
          </Section>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
