import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { notificationService, NotificationData } from '@/lib/notifications';
import { useGlobalContext } from '@/lib/global-provider';
import icons from '@/constants/icons';
import { Image } from 'react-native';
import { palette } from "@/constants/theme";

interface NotificationCenterProps {
  visible: boolean;
  onClose: () => void;
}

const NotificationCenter = ({ visible, onClose }: NotificationCenterProps) => {
  const { user } = useGlobalContext();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && user) {
      loadData();
    }
  }, [visible, user]);

  const loadData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const notificationsData = await notificationService.getUserNotifications(user.id);

      setNotifications(notificationsData);
    } catch (error) {
      console.error('Error loading notification data:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await notificationService.markNotificationAsRead(notificationId);
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      await Promise.all(
        unreadNotifications.map(n =>
          notificationService.markNotificationAsRead(n.id!)
        )
      );
      setNotifications(prev =>
        prev.map(notification => ({ ...notification, read: true }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = (notificationId: string) => {
    Alert.alert(
      'Delete this notification?',
      undefined,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!user?.id) return;
            const previous = notifications;
            setNotifications(prev => prev.filter(n => n.id !== notificationId));
            try {
              await notificationService.deleteNotification(notificationId, user.id);
            } catch (error) {
              console.error('Error deleting notification:', error);
              setNotifications(previous);
              Alert.alert('Error', 'Could not delete notification. Please try again.');
            }
          },
        },
      ]
    );
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'newProperty':
        return '🆕';
      case 'priceDrop':
        return '💰';
      case 'openHouse':
        return '🏠';
      case 'marketUpdate':
        return '📊';
      case 'agentMessage':
        return '💬';
      case 'savedSearch':
        return '🔍';
      default:
        return '📢';
    }
  };

  const getNotificationColor = (type: string) => {
    // Use theme colors for consistency
    switch (type) {
      case 'newProperty':
        return palette.primary; // Soft neon green
      case 'priceDrop':
        return '#FF9800'; // Orange for price drops (kept for semantic meaning)
      case 'openHouse':
        return palette.secondary; // Muted slate blue
      case 'marketUpdate':
        return palette.secondary; // Muted slate blue
      case 'agentMessage':
        return palette.primary; // Soft neon green
      case 'savedSearch':
        return palette.secondary; // Muted slate blue
      default:
        return palette.textMuted; // Muted gray
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  const renderNotification = (notification: NotificationData) => (
    <View
      key={notification.id}
      style={{
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: palette.border,
        backgroundColor: !notification.read ? palette.surfaceMuted : palette.surface,
      }}
    >
      <TouchableOpacity
        onPress={() => !notification.read && markAsRead(notification.id!)}
        activeOpacity={0.7}
        style={{ flexDirection: 'row', alignItems: 'flex-start' }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
            backgroundColor: getNotificationColor(notification.type) + '20',
          }}
        >
          <Text style={{ fontSize: 18 }}>{getNotificationIcon(notification.type)}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontWeight: '700', color: palette.textPrimary, fontSize: 16, fontFamily: 'Rubik-Bold' }}>
              {notification.title}
            </Text>
            {!notification.read && (
              <View style={{ width: 8, height: 8, backgroundColor: palette.primary, borderRadius: 4 }} />
            )}
          </View>

          <Text style={{ fontFamily: 'Rubik-Regular', color: palette.textSecondary, fontSize: 14, marginTop: 4 }}>
            {notification.body}
          </Text>

          <Text style={{ fontFamily: 'Rubik-Regular', color: palette.textMuted, fontSize: 12, marginTop: 8 }}>
            {formatDate(notification.createdAt)}
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => deleteNotification(notification.id!)}
        style={{
          marginTop: 10,
          alignSelf: 'flex-end',
          paddingVertical: 6,
          paddingHorizontal: 12,
          borderRadius: 8,
          backgroundColor: palette.danger + '15',
          borderWidth: 1,
          borderColor: palette.danger,
        }}
        activeOpacity={0.8}
      >
        <Text style={{ fontSize: 13, fontWeight: '600', color: palette.danger, fontFamily: 'Rubik-Medium' }}>
          Delete notification
        </Text>
      </TouchableOpacity>
    </View>
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: palette.border, backgroundColor: palette.surface }}>
          <TouchableOpacity onPress={onClose}>
            <Image source={icons.backArrow} style={{ width: 24, height: 24, tintColor: palette.textPrimary }} />
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: '700', color: palette.textPrimary, fontFamily: 'Rubik-Bold' }}>Notifications</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Content */}
        <ScrollView
          style={{ flex: 1, backgroundColor: palette.background }}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={loadData} tintColor={palette.primary} />
          }
        >
          <View>
            {notifications.length > 0 ? (
              <>
                {unreadCount > 0 && (
                  <TouchableOpacity
                    onPress={markAllAsRead}
                    style={{ padding: 12, backgroundColor: palette.surfaceMuted, borderBottomWidth: 1, borderBottomColor: palette.border }}
                  >
                    <Text style={{ textAlign: 'center', fontWeight: '500', color: palette.primary, fontFamily: 'Rubik-Medium' }}>
                      Mark all as read
                    </Text>
                  </TouchableOpacity>
                )}

                {notifications.map(renderNotification)}
              </>
            ) : (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80 }}>
                <Text style={{ fontSize: 64, marginBottom: 16 }}>🔔</Text>
                <Text style={{ fontWeight: '700', color: palette.textSecondary, fontSize: 18, marginBottom: 8, fontFamily: 'Rubik-Bold' }}>
                  No notifications yet
                </Text>
                <Text style={{ fontFamily: 'Rubik-Regular', color: palette.textMuted, textAlign: 'center', paddingHorizontal: 32 }}>
                  You&apos;ll see notifications here when new properties match your criteria or when there are important updates.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

export default NotificationCenter; 