import React, { useState, useEffect, memo, useRef } from "react";
import { Text, ScrollView, TouchableOpacity, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  Easing,
  withSequence,
  interpolateColor
} from 'react-native-reanimated';

import { categories } from "@/constants/data";
import { palette } from "@/constants/theme";

const AnimatedFilterButton = ({
  item,
  index,
  isSelected,
  onPress
}: {
  item: any;
  index: number;
  isSelected: boolean;
  onPress: () => void;
}) => {
  // Animation values for smooth transitions
  const scale = useSharedValue(1);
  const backgroundColor = useSharedValue(isSelected ? 1 : 0);
  const borderWidth = useSharedValue(isSelected ? 0 : 1);
  const shadowOpacity = useSharedValue(isSelected ? 0.15 : 0.05);
  const shadowRadius = useSharedValue(isSelected ? 8 : 4);
  const shadowOffset = useSharedValue(isSelected ? 4 : 2);
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
    shadowOpacity.value = withTiming(isSelected ? 0.15 : 0.05, {
      duration: 250,
      easing: Easing.out(Easing.ease),
    });
    shadowRadius.value = withTiming(isSelected ? 8 : 4, {
      duration: 250,
      easing: Easing.out(Easing.ease),
    });
    shadowOffset.value = withTiming(isSelected ? 4 : 2, {
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
      scale.value = withDelay(delay, withSpring(1, { damping: 18, stiffness: 120 }));
    }
  }, [index]);

  const handlePress = () => {
    // Subtle scale animation on press (premium feel)
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
        [palette.surfaceMuted, palette.primary] // unselected -> selected
      ),
    };
  });

  // Animated border width
  const animatedBorder = useAnimatedStyle(() => ({
    borderWidth: borderWidth.value,
    borderColor: palette.border,
  }));

  // Animated shadow
  const animatedShadow = useAnimatedStyle(() => ({
    shadowOpacity: shadowOpacity.value,
    shadowRadius: shadowRadius.value,
    shadowOffset: { width: 0, height: shadowOffset.value },
  }));

  // Animated text color
  const animatedTextColor = useAnimatedStyle(() => {
    return {
      color: interpolateColor(
        textColor.value,
        [0, 1],
        [palette.textPrimary, palette.surface] // unselected -> selected
      ),
    };
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
              elevation: isSelected ? 4 : 2,
            },
            animatedBackgroundColor,
            animatedBorder,
            animatedShadow,
          ]}
        >
          <Animated.Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[
              {
                fontSize: 14,
                fontWeight: '500',
                fontFamily: 'Rubik-Medium',
                flexShrink: 1,
                maxWidth: 100,
              },
              animatedTextColor,
            ]}
          >
            {item.title}
          </Animated.Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
};

interface FiltersProps {
  initialValue?: string;
  onFilterChange?: (value: string | undefined) => void;
}

const Filters = ({ initialValue = 'All', onFilterChange }: FiltersProps) => {
  const [selectedCategory, setSelectedCategory] = useState(initialValue || "All");

  // Sync with initialValue prop changes
  useEffect(() => {
    if (initialValue !== undefined) {
      const newCategory = initialValue || "All";
      if (newCategory !== selectedCategory) {
        setSelectedCategory(newCategory);
      }
    }
  }, [initialValue]);

  const handleCategoryPress = (category: string) => {
    if (selectedCategory === category) {
      setSelectedCategory("All");
      if (onFilterChange) {
        onFilterChange(undefined);
      }
      return;
    }

    setSelectedCategory(category);
    if (onFilterChange) {
      onFilterChange(category);
    }
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginTop: 12, marginBottom: 8 }}
      contentContainerStyle={{
        paddingRight: 20,
        alignItems: 'center',
        // Prevent container from compressing children
        flexGrow: 0,
      }}
      // Prevent bouncing which can cause layout issues
      bounces={false}
      // Ensure smooth scrolling
      decelerationRate="fast"
    >
      {categories.map((item, index) => (
        <AnimatedFilterButton
          key={index}
          item={item}
          index={index}
          isSelected={selectedCategory === item.category}
          onPress={() => handleCategoryPress(item.category)}
        />
      ))}
    </ScrollView>
  );
};

export default memo(Filters);
