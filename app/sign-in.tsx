import * as React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  ImageBackground,
} from "react-native";

import { useGlobalContext } from "@/lib/global-provider";
import { useState, useRef, useEffect } from "react";
import { signIn as supabaseSignIn } from "@/lib/supabase-auth";
import { adminSignIn, isAdminEmail } from "@/lib/admin-auth";
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { palette } from "@/constants/theme";

const { height } = Dimensions.get('window');

export default function SignIn() {
  const { login, loading, isLogged } = useGlobalContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signInLoading, setSignInLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);

  // Animation values
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideUpAnim = useRef(new Animated.Value(0)).current; // Start at 0 (visible) instead of height (off-screen)
  const loadingOpacity = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    // Start loading screen animations
    startLoadingAnimations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startLoadingAnimations = () => {
    // Skip loading screen during navigation - show sign-in form immediately
    // Only show loading screen on initial app load (not during navigation)
    setShowLoadingScreen(false);
    // Ensure sign-in form is visible (slideUpAnim starts at 0, so it's already visible)
    
    // Original animation code kept but disabled - can be re-enabled if needed for initial load
    // Logo entrance animation
    // Animated.sequence([
    //   Animated.parallel([
    //     Animated.timing(logoOpacity, {
    //       toValue: 1,
    //       duration: 800,
    //       useNativeDriver: true,
    //     }),
    //     Animated.spring(logoScale, {
    //       toValue: 1,
    //       tension: 50,
    //       friction: 7,
    //       useNativeDriver: true,
    //     }),
    //   ]),
    //   // Pulse animation
    //   Animated.loop(
    //     Animated.sequence([
    //       Animated.timing(pulseAnim, {
    //         toValue: 1.1,
    //         duration: 1000,
    //         useNativeDriver: true,
    //       }),
    //       Animated.timing(pulseAnim, {
    //         toValue: 1,
    //         duration: 1000,
    //         useNativeDriver: true,
    //       }),
    //     ])
    //   ),
    // ]).start();

    // Auto transition immediately (no delay)
    // setTimeout(() => {
    //   transitionToSignIn();
    // }, 3000);
  };

  const transitionToSignIn = () => {
    Animated.parallel([
      Animated.timing(loadingOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideUpAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowLoadingScreen(false);
    });
  };

  const hasRedirected = useRef(false);

  useEffect(() => {
    if (!loading && isLogged && !hasRedirected.current) {
      hasRedirected.current = true;
      router.replace("/(root)/(tabs)");
    }
  }, [loading, isLogged, router]);

  // Don't return null - always render the sign-in UI
  // The redirect will happen via useEffect without blocking the UI

  const handleSignIn = async () => {
    setSignInLoading(true);
    try {
      // First, check if this is an admin email
      const isAdmin = await isAdminEmail(email);
      
      if (isAdmin) {
        // Try admin authentication
        try {
          const admin = await adminSignIn(email, password);
          // Admin login successful - redirect to admin panel
          // Note: We don't use the regular login() function for admin
          // Admin session is stored separately in AsyncStorage
          router.replace("/(admin)/" as any);
          return;
        } catch (adminError: any) {
          // Admin login failed, but might be a regular user with same email
          // Try regular user login as fallback
          console.log('Admin login failed, trying regular user login:', adminError.message);
        }
      }

      // Regular user authentication
      const user = await supabaseSignIn(email, password);
      login(user);
      router.replace("/(root)/(tabs)");
    } catch (error: any) {
      Alert.alert("Sign In Error", error.message || "Failed to sign in");
    } finally {
      setSignInLoading(false);
    }
  };

  const handleSignUp = () => {
    router.replace("/sign-up");
  };


  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      {/* Loading Screen */}
      {showLoadingScreen && (
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000,
            opacity: loadingOpacity,
          }}
        >
          <ImageBackground
            source={{ uri: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&h=1200&fit=crop' }}
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
            resizeMode="cover"
          >
            <LinearGradient
              colors={['rgba(248, 246, 243, 0.85)', 'rgba(248, 246, 243, 0.95)']}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />

            {/* Main Logo Content */}
            <Animated.View
              style={{
                transform: [
                  { scale: logoScale },
                  { scale: pulseAnim },
                ],
                opacity: logoOpacity,
                alignItems: 'center',
                zIndex: 10,
              }}
            >
              {/* Logo Icon */}
              <View
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  backgroundColor: palette.surface,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 30,
                  shadowColor: palette.shadow,
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.15,
                  shadowRadius: 16,
                  elevation: 8,
                  borderWidth: 1,
                  borderColor: palette.border,
                }}
              >
                <MaterialIcons name="home" size={60} color={palette.primary} />
              </View>

              {/* App Name */}
              <Text
                style={{
                  fontSize: 42,
                  fontWeight: '700',
                  color: palette.textPrimary,
                  textAlign: 'center',
                  letterSpacing: 1,
                  fontFamily: 'Rubik-Bold',
                }}
              >
                The Plotify
              </Text>

              {/* Tagline */}
              <Text
                style={{
                  fontSize: 16,
                  color: palette.textSecondary,
                  textAlign: 'center',
                  marginTop: 10,
                  letterSpacing: 0.5,
                  fontFamily: 'Rubik-Regular',
                }}
              >
                Find Your Perfect Space
              </Text>

              {/* Loading Indicator */}
              <View style={{ marginTop: 50, alignItems: 'center' }}>
                <View
                  style={{
                    width: 40,
                    height: 4,
                    backgroundColor: palette.border,
                    borderRadius: 2,
                    overflow: 'hidden',
                  }}
                >
                  <Animated.View
                    style={{
                      width: '100%',
                      height: '100%',
                      backgroundColor: palette.primary,
                      borderRadius: 2,
                      transform: [
                        {
                          translateX: pulseAnim.interpolate({
                            inputRange: [1, 1.1],
                            outputRange: [-40, 0],
                          }),
                        },
                      ],
                    }}
                  />
                </View>
                <Text
                  style={{
                    color: palette.textMuted,
                    fontSize: 14,
                    marginTop: 15,
                    letterSpacing: 0.5,
                    fontFamily: 'Rubik-Regular',
                  }}
                >
                  Loading...
                </Text>
              </View>
            </Animated.View>
          </ImageBackground>
        </Animated.View>
      )}

      {/* Main Sign In Screen */}
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: palette.background,
          transform: [{ translateY: slideUpAnim }],
        }}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
          >
            <ScrollView
              contentContainerStyle={{
                flexGrow: 1,
                justifyContent: 'center',
                paddingHorizontal: 24,
                paddingVertical: 40
              }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Logo/Brand Section */}
              <View style={{ alignItems: 'center', marginBottom: 48 }}>
                <Text
                  style={{
                    fontSize: 48,
                    fontWeight: '700',
                    marginBottom: 8,
                    color: palette.primary,
                    fontFamily: 'Rubik-Bold',
                    letterSpacing: 1,
                  }}
                >
                  The Plotify
                </Text>
                <Text
                  style={{
                    fontSize: 16,
                    color: palette.textSecondary,
                    fontFamily: 'Rubik-Regular',
                  }}
                >
                  Welcome back
                </Text>
              </View>

              {/* Main Content Card */}
              <View
                style={{
                  borderRadius: 24,
                  padding: 32,
                  backgroundColor: palette.surface,
                  shadowColor: palette.shadow,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 16,
                  elevation: 4,
                  borderWidth: 1,
                  borderColor: palette.border,
                }}
              >
                {/* Header */}
                <View style={{ marginBottom: 32 }}>
                  <Text
                    style={{
                      fontSize: 28,
                      fontWeight: '700',
                      textAlign: 'center',
                      marginBottom: 8,
                      color: palette.textPrimary,
                      fontFamily: 'Rubik-Bold',
                    }}
                  >
                    Login to your Account
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      color: palette.textSecondary,
                      textAlign: 'center',
                      fontFamily: 'Rubik-Regular',
                    }}
                  >
                    Enter your credentials to continue
                  </Text>
                </View>

                {/* Email Input */}
                <View style={{ marginBottom: 20 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      marginBottom: 8,
                      marginLeft: 4,
                      color: palette.textSecondary,
                      fontWeight: '500',
                      fontFamily: 'Rubik-Medium',
                    }}
                  >
                    Email
                  </Text>
                  <View
                    style={{
                      borderWidth: 1,
                      borderColor: palette.border,
                      borderRadius: 16,
                      paddingHorizontal: 16,
                      paddingVertical: 16,
                      backgroundColor: palette.surfaceMuted,
                    }}
                  >
                    <TextInput
                      placeholder="Enter your email"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      style={{
                        fontSize: 16,
                        color: palette.textPrimary,
                        fontFamily: 'Rubik-Regular',
                      }}
                      placeholderTextColor={palette.textMuted}
                    />
                  </View>
                </View>

                {/* Password Input */}
                <View style={{ marginBottom: 24 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      marginBottom: 8,
                      marginLeft: 4,
                      color: palette.textSecondary,
                      fontWeight: '500',
                      fontFamily: 'Rubik-Medium',
                    }}
                  >
                    Password
                  </Text>
                  <View
                    style={{
                      borderWidth: 1,
                      borderColor: palette.border,
                      borderRadius: 16,
                      paddingHorizontal: 16,
                      paddingVertical: 16,
                      backgroundColor: palette.surfaceMuted,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                  >
                    <TextInput
                      placeholder="Enter your password"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      style={{
                        flex: 1,
                        fontSize: 16,
                        color: palette.textPrimary,
                        fontFamily: 'Rubik-Regular',
                      }}
                      placeholderTextColor={palette.textMuted}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword((prev) => !prev)}
                      style={{ marginLeft: 8, padding: 4 }}
                    >
                      <MaterialIcons
                        name={showPassword ? "visibility" : "visibility-off"}
                        size={22}
                        color={palette.textMuted}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Sign In Button */}
                <TouchableOpacity
                  onPress={handleSignIn}
                  style={{
                    borderRadius: 16,
                    paddingVertical: 16,
                    marginBottom: 24,
                    backgroundColor: signInLoading ? palette.primary + '80' : palette.primary,
                    shadowColor: palette.primary,
                    shadowOpacity: 0.2,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 4,
                  }}
                  activeOpacity={0.9}
                  disabled={signInLoading}
                >
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: '600',
                      textAlign: 'center',
                      color: palette.surface,
                      fontFamily: 'Rubik-SemiBold',
                    }}
                  >
                    {signInLoading ? "Signing in..." : "Sign in"}
                  </Text>
                </TouchableOpacity>


                {/* Sign Up Link */}
                <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 16, color: palette.textSecondary, fontFamily: 'Rubik-Regular' }}>
                    Don&apos;t have an account?{' '}
                  </Text>
                  <TouchableOpacity onPress={handleSignUp}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: '600',
                        color: palette.primary,
                        fontFamily: 'Rubik-SemiBold',
                      }}
                    >
                      Sign up
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}
