import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  interpolate,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { palette } from "@/constants/theme";

const { width: screenWidth } = Dimensions.get('window');

// Animated Card Component with entrance animation
export const AnimatedCard = ({ 
  children, 
  index = 0, 
  onPress, 
  style = {} 
}: {
  children: React.ReactNode;
  index?: number;
  onPress?: () => void;
  style?: any;
}) => {
  const translateY = useSharedValue(50);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);

  useEffect(() => {
    const delay = index * 100;
    translateY.value = withDelay(delay, withSpring(0, {
      damping: 15,
      stiffness: 100,
    }));
    opacity.value = withDelay(delay, withTiming(1, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    }));
    scale.value = withDelay(delay, withSpring(1, {
      damping: 15,
      stiffness: 100,
    }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.92}
        style={{ transform: [{ scale: 1 }] }}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

// Animated Button with press animation
export const AnimatedButton = ({ 
  children, 
  onPress, 
  style = {}, 
  variant = 'primary' 
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: any;
  variant?: 'primary' | 'secondary' | 'outline';
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
    opacity.value = withTiming(0.8, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    opacity.value = withTiming(1, { duration: 100 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const getButtonStyle = () => {
    const baseStyle = {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      flexDirection: 'row' as const,
    };

    switch (variant) {
      case 'primary':
        return { ...baseStyle, backgroundColor: palette.primary };
      case 'secondary':
        return { ...baseStyle, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border };
      case 'outline':
        return { ...baseStyle, backgroundColor: 'transparent', borderWidth: 2, borderColor: palette.primary };
      default:
        return baseStyle;
    }
  };

  return (
    <Animated.View style={[animatedStyle, getButtonStyle(), style]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={{ width: '100%', alignItems: 'center' }}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

// Animated Header with entrance animation
export const AnimatedHeader = ({ 
  title, 
  subtitle, 
  avatar, 
  notificationCount = 0,
  onNotificationPress 
}: {
  title: string;
  subtitle: string;
  avatar: any;
  notificationCount?: number;
  onNotificationPress?: () => void;
}) => {
  const translateY = useSharedValue(-20);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withSpring(0, { damping: 15, stiffness: 100 });
    opacity.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[animatedStyle]} className="flex flex-row items-center justify-between mt-5">
      <View className="flex flex-row">
        <Animated.View
          style={{
            transform: [{ scale: 1 }],
          }}
        >
          <Image source={avatar} className="size-12 rounded-full" />
        </Animated.View>
        <View className="flex flex-col items-start ml-3 justify-center">
          <Text className="text-xs font-rubik text-black-100 opacity-80">
            {title}
          </Text>
          <Text className="text-base font-rubik-medium text-black-300">
            {subtitle}
          </Text>
        </View>
      </View>
      
      {onNotificationPress && (
        <Animated.View className="flex flex-row items-center space-x-3 relative">
      <TouchableOpacity 
            onPress={onNotificationPress} 
            className="relative bg-surface-300 p-2 rounded-full shadow-sm border border-border-subtle"
            style={{ shadowColor: palette.shadow, shadowOpacity: 0.14, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}
          >
            <Image source={require('@/assets/icons/bell.png')} className="size-5" style={{ tintColor: palette.textPrimary }} />
            {notificationCount > 0 && (
              <Animated.View 
                className="absolute -top-1 -right-1 bg-primary-300 rounded-full min-w-5 h-5 items-center justify-center"
                style={{ paddingHorizontal: 4 }}
              >
                <Text className="text-black text-xs font-rubik-bold">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </Text>
              </Animated.View>
            )}
          </TouchableOpacity>
        </Animated.View>
      )}
    </Animated.View>
  );
};

// Animated Section Header
export const AnimatedSectionHeader = ({ 
  title, 
  subtitle, 
  actionText, 
  onActionPress,
  index = 0 
}: {
  title: string;
  subtitle?: string;
  actionText?: string;
  onActionPress?: () => void;
  index?: number;
}) => {
  const translateX = useSharedValue(-30);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const delay = index * 150;
    translateX.value = withDelay(delay, withSpring(0, { damping: 15, stiffness: 100 }));
    opacity.value = withDelay(delay, withTiming(1, { duration: 600 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[animatedStyle]} className="flex flex-row items-center justify-between my-4">
      <View className="flex-1">
        <Text className="text-xl font-rubik-bold text-black-300">
          {title}
        </Text>
        {subtitle && (
          <Text className="text-sm font-rubik text-black-100 mt-1">
            {subtitle}
          </Text>
        )}
      </View>
      {actionText && onActionPress && (
        <AnimatedButton
          variant="outline"
          onPress={onActionPress}
          style={{ paddingHorizontal: 12, paddingVertical: 6 }}
        >
          <Text className="text-sm font-rubik-medium text-primary-300">
            {actionText}
          </Text>
        </AnimatedButton>
      )}
    </Animated.View>
  );
};

// Animated Loading Skeleton
export const AnimatedSkeleton = ({ width, height, style = {} }: {
  width: number;
  height: number;
  style?: any;
}) => {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withSequence(
      withTiming(0.7, { duration: 1000 }),
      withTiming(0.3, { duration: 1000 })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: '#E9ECEF',
          borderRadius: 8,
        },
        animatedStyle,
        style,
      ]}
    />
  );
};

// Animated Modal with backdrop blur
export const AnimatedModal = ({ 
  visible, 
  onClose, 
  children 
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) => {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const translateY = useSharedValue(50);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 300 });
      scale.value = withSpring(1, { damping: 15, stiffness: 100 });
      translateY.value = withSpring(0, { damping: 15, stiffness: 100 });
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      scale.value = withTiming(0.8, { duration: 200 });
      translateY.value = withTiming(50, { duration: 200 });
    }
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const modalStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ],
  }));

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: palette.overlay,
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
        },
        backdropStyle,
      ]}
    >
      <TouchableOpacity
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        onPress={onClose}
        activeOpacity={1}
      />
      <Animated.View
        style={[
          {
            backgroundColor: palette.surfaceElevated,
            borderRadius: 20,
            padding: 20,
            margin: 20,
            maxWidth: screenWidth - 40,
            shadowColor: palette.shadow,
            shadowOpacity: 0.25,
            shadowRadius: 20,
            shadowOffset: { width: 0, height: 10 },
            elevation: 10,
            borderWidth: 1,
            borderColor: palette.border,
          },
          modalStyle,
        ]}
      >
        {children}
      </Animated.View>
    </Animated.View>
  );
};

// Animated Floating Action Button
export const AnimatedFAB = ({ 
  onPress, 
  icon, 
  style = {} 
}: {
  onPress: () => void;
  icon: any;
  style?: any;
}) => {
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  const handlePress = () => {
    scale.value = withSequence(
      withSpring(0.9, { damping: 15, stiffness: 300 }),
      withSpring(1, { damping: 15, stiffness: 300 })
    );
    rotation.value = withSequence(
      withTiming(180, { duration: 300 }),
      withTiming(360, { duration: 300 })
    );
    onPress();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          bottom: 100,
          right: 20,
          width: 56,
          height: 56,
          borderRadius: 28,
        backgroundColor: palette.primary,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOpacity: 0.25,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 5 },
          elevation: 8,
          zIndex: 1000,
        },
        animatedStyle,
        style,
      ]}
    >
      <TouchableOpacity
        onPress={handlePress}
        style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}
        activeOpacity={0.8}
      >
        <Image source={icon} className="size-6" style={{ tintColor: '#0B0F17' }} />
      </TouchableOpacity>
    </Animated.View>
  );
}; 