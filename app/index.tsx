import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    ImageBackground,
    Dimensions,
    StyleSheet,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useGlobalContext } from '@/lib/global-provider';
import { palette } from '@/constants/theme';
import images from '@/constants/images';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withRepeat,
    withSequence,
    withDelay,
    runOnJS,
} from 'react-native-reanimated';
import {
    Gesture,
    GestureDetector,
    GestureHandlerRootView,
} from 'react-native-gesture-handler';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const TRACK_WIDTH = SCREEN_WIDTH - 80;
const CIRCULAR_BUTTON_SIZE = 60;
const SLIDE_THRESHOLD = TRACK_WIDTH - CIRCULAR_BUTTON_SIZE - 20; // Slide almost to the end

export default function OnboardingScreen() {
    const { loading, isLogged } = useGlobalContext();

    // Animation values
    const slideProgress = useSharedValue(0);
    const buttonScale = useSharedValue(1);
    const textOpacity = useSharedValue(1);
    const headingOpacity = useSharedValue(0);
    const headingTranslateY = useSharedValue(30);
    const subtitleOpacity = useSharedValue(0);
    const subtitleTranslateY = useSharedValue(20);
    const isSliding = useRef(false);
    const hasNavigated = useRef(false);
    const arrowPulse = useSharedValue(1);
    const hasRedirected = useRef(false);

    // Handle redirect when logged in - use useEffect to prevent render-time redirect loops
    useEffect(() => {
        if (!loading && isLogged && !hasRedirected.current) {
            hasRedirected.current = true;
            // Redirect to home tab (same as sign-in does)
            router.replace('/(root)/(tabs)');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading, isLogged]);

    // Entrance animations
    useEffect(() => {
        headingOpacity.value = withTiming(1, { duration: 800 });
        headingTranslateY.value = withSpring(0, { damping: 15, stiffness: 100 });

        setTimeout(() => {
            subtitleOpacity.value = withTiming(1, { duration: 600 });
            subtitleTranslateY.value = withSpring(0, { damping: 15, stiffness: 100 });
        }, 300);

        // Subtle pulse animation for arrow hint - using withRepeat instead of callback
        arrowPulse.value = withDelay(
            2000,
            withRepeat(
                withSequence(
                    withTiming(1.1, { duration: 1000 }),
                    withTiming(1, { duration: 1000 })
                ),
                -1, // Infinite repeat
                false // Don't reverse
            )
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const navigateToSignIn = () => {
        if (!hasNavigated.current) {
            hasNavigated.current = true;
            router.replace('/sign-in');
        }
    };

    // Pan gesture for sliding
    const panGesture = Gesture.Pan()
        .onStart(() => {
            isSliding.current = true;
            buttonScale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
        })
        .onUpdate((event) => {
            // Only allow horizontal sliding to the right
            if (event.translationX > 0) {
                const maxTranslation = TRACK_WIDTH - CIRCULAR_BUTTON_SIZE;
                slideProgress.value = Math.min(event.translationX, maxTranslation);
            }
        })
        .onEnd((event) => {
            isSliding.current = false;

            // Check if slide threshold is reached
            if (slideProgress.value >= SLIDE_THRESHOLD) {
                // Complete the slide animation
                slideProgress.value = withSpring(TRACK_WIDTH - CIRCULAR_BUTTON_SIZE, {
                    damping: 15,
                    stiffness: 200,
                });
                textOpacity.value = withTiming(0, { duration: 200 });

                // Navigate after animation completes
                setTimeout(() => {
                    runOnJS(navigateToSignIn)();
                }, 300);
            } else {
                // Spring back to start
                slideProgress.value = withSpring(0, { damping: 15, stiffness: 200 });
                buttonScale.value = withSpring(1, { damping: 15, stiffness: 300 });
            }
        });

    // Animated styles
    const slideButtonStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: slideProgress.value }, { scale: buttonScale.value }],
    }));

    const slideTrackStyle = useAnimatedStyle(() => ({
        width: slideProgress.value + CIRCULAR_BUTTON_SIZE,
    }));

    const textStyle = useAnimatedStyle(() => ({
        opacity: textOpacity.value,
    }));

    const arrowStyle = useAnimatedStyle(() => ({
        transform: [{ scale: arrowPulse.value }],
        opacity: textOpacity.value,
    }));

    const headingStyle = useAnimatedStyle(() => ({
        opacity: headingOpacity.value,
        transform: [{ translateY: headingTranslateY.value }],
    }));

    const subtitleStyle = useAnimatedStyle(() => ({
        opacity: subtitleOpacity.value,
        transform: [{ translateY: subtitleTranslateY.value }],
    }));

    // Don't show blank screen - always render the onboarding UI
    // The redirect will happen via useEffect without blocking the UI

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <StatusBar barStyle="light-content" />
            <ImageBackground
                source={images.onboarding}
                style={styles.background}
                resizeMode="cover"
            >
                <SafeAreaView style={styles.container}>
                    {/* Header with logo */}
                    <View style={styles.header}>
                        <Text style={styles.logo}>PLOTIFY</Text>
                    </View>

                    {/* Main content */}
                    <View style={styles.content}>
                        <Animated.View style={headingStyle}>
                            <Text style={styles.heading}>PERFECT</Text>
                            <Text style={styles.heading}>PLACE</Text>
                        </Animated.View>
                    </View>

                    {/* Slide to Start Button */}
                    <View style={styles.buttonContainer}>
                        {/* Text label below */}
                        <Animated.Text style={[styles.buttonText, textStyle]}>
                            Swipe to Start
                        </Animated.Text>

                        {/* Container for track and button */}
                        <View style={styles.slideContainer}>
                            {/* Horizontal track */}
                            <View style={styles.buttonTrack}>
                                <Animated.View style={[styles.buttonTrackFill, slideTrackStyle]} />
                            </View>

                            {/* Circular slidable button */}
                            <GestureDetector gesture={panGesture}>
                                <Animated.View style={[styles.circularButton, slideButtonStyle]}>
                                    <Animated.View style={[styles.arrowIcon, arrowStyle]}>
                                        <Text style={styles.arrow}>→</Text>
                                    </Animated.View>
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
    background: {
        flex: 1,
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
    },
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    logo: {
        fontSize: 24,
        fontWeight: '700',
        color: '#FFFFFF',
        fontFamily: 'Rubik-Bold',
        letterSpacing: 2,
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 6,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingTop: 60,
    },
    heading: {
        fontSize: 56,
        fontWeight: '700',
        color: '#FFFFFF',
        fontFamily: 'Rubik-Bold',
        letterSpacing: 2,
        textTransform: 'uppercase',
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 0, height: 3 },
        textShadowRadius: 12,
        lineHeight: 64,
    },
    subtitleContainer: {
        marginTop: 'auto',
        marginBottom: 40,
    },
    overlay: {
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: 20,
        borderRadius: 16,
        backdropFilter: 'blur(10px)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    subtitle: {
        fontSize: 16,
        color: '#FFFFFF',
        fontFamily: 'Rubik-Regular',
        lineHeight: 24,
        textAlign: 'left',
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    buttonContainer: {
        paddingHorizontal: 40,
        paddingBottom: 40,
        alignItems: 'center',
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
        fontFamily: 'Rubik-SemiBold',
        marginBottom: 24,
        textAlign: 'center',
        textShadowColor: 'rgba(0, 0, 0, 0.6)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 6,
        letterSpacing: 0.5,
    },
    slideContainer: {
        width: TRACK_WIDTH,
        height: CIRCULAR_BUTTON_SIZE,
        position: 'relative',
        justifyContent: 'center',
    },
    buttonTrack: {
        width: TRACK_WIDTH,
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 2,
        overflow: 'hidden',
        position: 'absolute',
        alignSelf: 'center',
    },
    buttonTrackFill: {
        height: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        borderRadius: 2,
    },
    circularButton: {
        width: CIRCULAR_BUTTON_SIZE,
        height: CIRCULAR_BUTTON_SIZE,
        borderRadius: CIRCULAR_BUTTON_SIZE / 2,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        position: 'absolute',
        left: 0,
    },
    arrowIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: palette.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    arrow: {
        fontSize: 20,
        color: '#FFFFFF',
        fontWeight: '700',
    },
});

