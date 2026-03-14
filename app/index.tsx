import React, { useEffect, useRef } from 'react';
import {
  Dimensions,
  ImageBackground,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';

import AppText from '@/components/ui/AppText';
import images from '@/constants/images';
import { palette } from '@/constants/theme';
import { useGlobalContext } from '@/lib/global-provider';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_HEIGHT = 60;
const SWIPE_KNOB_SIZE = 46;
const SWIPE_HORIZONTAL_MARGIN = 24;
const SWIPE_PADDING = 7;
const SWIPE_WIDTH = SCREEN_WIDTH - SWIPE_HORIZONTAL_MARGIN * 2;
const MAX_TRANSLATE_X = SWIPE_WIDTH - SWIPE_KNOB_SIZE - SWIPE_PADDING * 2;
const SWIPE_THRESHOLD = MAX_TRANSLATE_X * 0.9;

export default function OnboardingScreen() {
  const { loading, isLogged } = useGlobalContext();
  const hasNavigated = useRef(false);
  const hasRedirected = useRef(false);

  const slideProgress = useSharedValue(0);
  const buttonScale = useSharedValue(1);
  const logoOpacity = useSharedValue(0);
  const logoTranslateY = useSharedValue(18);
  const hintPulse = useSharedValue(1);

  useEffect(() => {
    if (!loading && isLogged && !hasRedirected.current) {
      hasRedirected.current = true;
      router.replace('/(root)/(tabs)');
    }
  }, [isLogged, loading]);

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 700 });
    logoTranslateY.value = withSpring(0, { damping: 16, stiffness: 120 });
    hintPulse.value = withDelay(
      1200,
      withRepeat(
        withSequence(
          withTiming(1.04, { duration: 900 }),
          withTiming(1, { duration: 900 })
        ),
        -1,
        false
      )
    );
  }, [hintPulse, logoOpacity, logoTranslateY]);

  const navigateToSignIn = () => {
    if (!hasNavigated.current) {
      hasNavigated.current = true;
      router.push('/sign-in');
    }
  };

  const panGesture = Gesture.Pan()
    .onStart(() => {
      buttonScale.value = withSpring(0.98, { damping: 14, stiffness: 260 });
    })
    .onUpdate((event) => {
      const nextValue = Math.min(Math.max(event.translationX, 0), MAX_TRANSLATE_X);
      slideProgress.value = nextValue;
    })
    .onEnd(() => {
      if (slideProgress.value >= SWIPE_THRESHOLD) {
        slideProgress.value = withTiming(MAX_TRANSLATE_X, { duration: 180 }, (finished) => {
          if (finished) {
            runOnJS(navigateToSignIn)();
          }
        });
      } else {
        slideProgress.value = withSpring(0, { damping: 16, stiffness: 180 });
        buttonScale.value = withSpring(1, { damping: 14, stiffness: 260 });
      }
    });

  const swipeKnobStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: slideProgress.value },
      { scale: buttonScale.value * hintPulse.value },
    ],
  }));

  const swipeLabelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(slideProgress.value, [0, MAX_TRANSLATE_X * 0.7], [1, 0.3]),
    transform: [
      {
        translateX: interpolate(slideProgress.value, [0, MAX_TRANSLATE_X], [0, 14]),
      },
    ],
  }));

  const swipeFillStyle = useAnimatedStyle(() => ({
    width: slideProgress.value + SWIPE_KNOB_SIZE + SWIPE_PADDING * 2,
  }));

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar barStyle="light-content" />
      <ImageBackground source={images.onboarding} style={styles.background} resizeMode="cover">
        <BlurView intensity={18} tint="dark" style={styles.blurOverlay}>
          <View style={styles.dimOverlay} />
        </BlurView>

        <SafeAreaView style={styles.container}>

          <View style={styles.flexSpacer} />

          <View style={styles.swipeSection}>
            <View style={styles.swipeOuter}>
              <Animated.View style={[styles.swipeFill, swipeFillStyle]} />

              <Animated.View style={[styles.swipeLabelWrap, swipeLabelStyle]}>
                <AppText style={styles.swipeLabel} weight="semibold">
                  Start Exploring
                </AppText>
              </Animated.View>

              <GestureDetector gesture={panGesture}>
                <Animated.View style={[styles.swipeKnob, swipeKnobStyle]}>
                  <Ionicons name="arrow-forward" size={22} color={palette.surface} />
                </Animated.View>
              </GestureDetector>
            </View>
          </View>
        </SafeAreaView>
      </ImageBackground>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  background: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  dimOverlay: {
    flex: 1,
    backgroundColor: 'rgba(9, 9, 9, 0.16)',
  },
  container: {
    flex: 1,
  },

  flexSpacer: {
    flex: 1,
  },
  swipeSection: {
    paddingHorizontal: SWIPE_HORIZONTAL_MARGIN,
    paddingBottom: 40,
  },
  swipeOuter: {
    height: SWIPE_HEIGHT,
    borderRadius: 30,
    backgroundColor: palette.surface,
    paddingHorizontal: SWIPE_PADDING,
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 5,
  },
  swipeFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    borderRadius: 30,
  },
  swipeLabelWrap: {
    paddingLeft: 60,
    paddingRight: SWIPE_KNOB_SIZE + 18,
  },
  swipeLabel: {
    fontSize: 16,
    color: palette.primary,
    letterSpacing: 0.2,
  },
  swipeKnob: {
    position: 'absolute',
    top: SWIPE_PADDING,
    left: SWIPE_PADDING,
    width: SWIPE_KNOB_SIZE,
    height: SWIPE_KNOB_SIZE,
    borderRadius: 23,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 4,
  },
});
