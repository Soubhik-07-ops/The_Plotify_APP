import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { router } from "expo-router";
import { signUp as supabaseSignUp } from "@/lib/supabase-auth";
import { palette } from "@/constants/theme";
import { useGlobalContext } from "@/lib/global-provider";
import { MaterialIcons } from '@expo/vector-icons';

const SignUp = () => {
  const { login } = useGlobalContext();
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signup');
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [signedUpUser, setSignedUpUser] = useState<{ id: string; name: string; email: string; avatar: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSignUp = async () => {
    // Validation
    if (!fullName.trim()) {
      Alert.alert("Error", "Please enter your full name");
      return;
    }
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }
    if (!password) {
      Alert.alert("Error", "Please enter a password");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      console.log("Attempting sign up with:", email, password);
      const user = await supabaseSignUp(email, password, fullName, mobile || undefined);
      console.log("User created:", user);
      // Store user data for success screen
      setSignedUpUser(user);
      // Log the user in (Supabase already signed them in, just update global state)
      login(user);
      setSuccess(true);
    } catch (error: unknown) {
      console.log("Sign up error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create account";
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGetStarted = () => {
    // Navigate directly to the app since user is already logged in
    router.replace("/(root)/(tabs)");
  };

  const handleSignInRedirect = () => {
    router.replace("/sign-in");
  };

  if (success) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
        <View style={{ width: '85%', alignItems: 'center', justifyContent: 'center', flex: 1, alignSelf: 'center' }}>
          <Text style={{ color: palette.primary, fontSize: 28, fontWeight: '700', marginBottom: 16, textAlign: 'center', fontFamily: 'Rubik-Bold' }}>Welcome to Plotify!</Text>
          <Text style={{ color: palette.textSecondary, fontSize: 16, marginBottom: 8, textAlign: 'center', fontFamily: 'Rubik-Regular' }}>
            Your account has been created successfully.
          </Text>
          <Text style={{ color: palette.textSecondary, fontSize: 16, marginBottom: 32, textAlign: 'center', fontFamily: 'Rubik-Regular' }}>
            Let's start exploring properties!
          </Text>
          <TouchableOpacity
            onPress={handleGetStarted}
            style={{ backgroundColor: palette.primary, borderRadius: 16, paddingVertical: 16, width: '100%' }}
          >
            <Text style={{ color: palette.surface, fontSize: 18, fontWeight: '600', textAlign: 'center', fontFamily: 'Rubik-SemiBold' }}>Let's Get Started</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
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
              Create your account
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
                Create Account
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: palette.textSecondary,
                  textAlign: 'center',
                  fontFamily: 'Rubik-Regular',
                }}
              >
                Sign up to get started
              </Text>
            </View>

            {/* Full Name Input */}
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
                Full Name
              </Text>
              <TextInput
                placeholder="Enter your full name"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
                placeholderTextColor={palette.textMuted}
                style={{
                  borderWidth: 1,
                  borderColor: palette.border,
                  borderRadius: 16,
                  padding: 16,
                  color: palette.textPrimary,
                  backgroundColor: palette.surfaceMuted,
                  fontSize: 16,
                  fontFamily: 'Rubik-Regular',
                }}
              />
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
                Email address
              </Text>
              <TextInput
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholderTextColor={palette.textMuted}
                style={{
                  borderWidth: 1,
                  borderColor: palette.border,
                  borderRadius: 16,
                  padding: 16,
                  color: palette.textPrimary,
                  backgroundColor: palette.surfaceMuted,
                  fontSize: 16,
                  fontFamily: 'Rubik-Regular',
                }}
              />
            </View>

            {/* Mobile Number Input (Optional) */}
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
                Mobile Number <Text style={{ color: palette.textMuted, fontSize: 12 }}>(Optional)</Text>
              </Text>
              <TextInput
                placeholder="Enter your mobile number"
                value={mobile}
                onChangeText={setMobile}
                keyboardType="phone-pad"
                placeholderTextColor={palette.textMuted}
                style={{
                  borderWidth: 1,
                  borderColor: palette.border,
                  borderRadius: 16,
                  padding: 16,
                  color: palette.textPrimary,
                  backgroundColor: palette.surfaceMuted,
                  fontSize: 16,
                  fontFamily: 'Rubik-Regular',
                }}
              />
            </View>

            {/* Password Input */}
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
                  placeholderTextColor={palette.textMuted}
                  style={{
                    flex: 1,
                    fontSize: 16,
                    color: palette.textPrimary,
                    fontFamily: 'Rubik-Regular',
                  }}
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

            {/* Confirm Password Input */}
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
                Confirm Password
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
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  placeholderTextColor={palette.textMuted}
                  style={{
                    flex: 1,
                    fontSize: 16,
                    color: palette.textPrimary,
                    fontFamily: 'Rubik-Regular',
                  }}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword((prev) => !prev)}
                  style={{ marginLeft: 8, padding: 4 }}
                >
                  <MaterialIcons
                    name={showConfirmPassword ? "visibility" : "visibility-off"}
                    size={22}
                    color={palette.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Create Account Button */}
            <TouchableOpacity
              onPress={handleSignUp}
              style={{
                backgroundColor: loading ? palette.primary + '80' : palette.primary,
                borderRadius: 16,
                paddingVertical: 16,
                marginBottom: 24,
                shadowColor: palette.primary,
                shadowOpacity: 0.2,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 4 },
                elevation: 4,
              }}
              disabled={loading}
            >
              <Text style={{
                color: palette.surface,
                fontSize: 18,
                fontWeight: '600',
                textAlign: 'center',
                fontFamily: 'Rubik-SemiBold',
              }}>
                {loading ? "Creating Account..." : "Create Account"}
              </Text>
            </TouchableOpacity>

            {/* Sign In Link */}
            <TouchableOpacity
              onPress={handleSignInRedirect}
              style={{ alignItems: 'center' }}
            >
              <Text style={{
                fontSize: 16,
                color: palette.textSecondary,
                fontFamily: 'Rubik-Regular',
              }}>
                Already have an account?{' '}
                <Text style={{
                  color: palette.primary,
                  fontWeight: '600',
                  fontFamily: 'Rubik-SemiBold',
                }}>
                  Sign In
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SignUp;
