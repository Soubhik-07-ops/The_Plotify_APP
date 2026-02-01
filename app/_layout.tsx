import { useEffect } from "react";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaView, View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
} from "react-native-reanimated";

import GlobalProvider from "@/lib/global-provider";
import { palette } from "@/constants/theme";
import "./global.css";

// Prevent the native splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// --- Professional Animated Splash Screen Component ---
const PlotifySplashScreen = () => {
  // Animation values for opacity and scale
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);
  const pulse = useSharedValue(1);

  // Define the animation styles
  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const animatedLogoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { scale: pulse.value }],
  }));

  // Trigger animations on component mount
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 1000 });
    scale.value = withTiming(1, { duration: 1200 });

    // Create a subtle, continuous pulse effect for the logo
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1500 }),
        withTiming(1, { duration: 1500 })
      ),
      -1, // Loop indefinitely
      true // Reverse the animation on each iteration
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A simple, elegant logo made with Views
  const LogoIcon = () => (
    <View style={styles.logo}>
      <View style={styles.logoRoof} />
      <View style={styles.logoBase} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.content, animatedContainerStyle]}>
        <Animated.View style={animatedLogoStyle}>
          <LogoIcon />
        </Animated.View>
        <Text style={styles.title}>The Plotify</Text>
        <Text style={styles.subtitle}>Your Story&apos;s Next Chapter.</Text>
      </Animated.View>
    </SafeAreaView>
  );
};

// --- Main Root Layout ---
export default function RootLayout() {
  const [fontsLoaded, error] = useFonts({
    "Rubik-Bold": require("../assets/fonts/Rubik-Bold.ttf"),
    "Rubik-ExtraBold": require("../assets/fonts/Rubik-ExtraBold.ttf"),
    "Rubik-Light": require("../assets/fonts/Rubik-Light.ttf"),
    "Rubik-Medium": require("../assets/fonts/Rubik-Medium.ttf"),
    "Rubik-Regular": require("../assets/fonts/Rubik-Regular.ttf"),
    "Rubik-SemiBold": require("../assets/fonts/Rubik-SemiBold.ttf"),
  });

  useEffect(() => {
    // You can log the font loading error if it occurs
    if (error) {
      console.error("Font loading error:", error);
    }

    // When fonts are loaded, hide the native splash screen
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, error]);

  // If fonts are not yet loaded, show the custom animated splash screen
  if (!fontsLoaded) {
    return <PlotifySplashScreen />;
  }

  // Once fonts are loaded, render the main app
  return (
    <GlobalProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </GlobalProvider>
  );
}

// --- Styles for the Splash Screen ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoRoof: {
    width: 0,
    height: 0,
    borderLeftWidth: 45,
    borderRightWidth: 45,
    borderBottomWidth: 30,
    borderStyle: 'solid',
    backgroundColor: 'transparent',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: palette.primary,
    transform: [{ translateY: 1 }],
  },
  logoBase: {
    width: 70,
    height: 50,
    backgroundColor: palette.surfaceElevated,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  title: {
    fontSize: 40,
    fontFamily: "Rubik-Bold",
    color: palette.textPrimary,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Rubik-Light",
    color: palette.textSecondary,
    marginTop: 8,
  }
});