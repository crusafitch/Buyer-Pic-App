import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { BorderRadius, Spacing } from "@/constants/theme";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

export default function LoginScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { login, biometricEnabled, authenticateWithBiometric, checkBiometricAvailable, isAuthenticated } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [canUseBiometric, setCanUseBiometric] = useState(false);

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    const available = await checkBiometricAvailable();
    setCanUseBiometric(available && biometricEnabled);
  };

  const handleBiometricLogin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const success = await authenticateWithBiometric();
    if (!success) {
      setError("Biometric authentication failed");
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsLoading(true);
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const result = await login(email.trim(), password);
    
    setIsLoading(false);
    if (!result.success) {
      setError(result.error || "Login failed");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollViewCompat
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + Spacing["4xl"],
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoContainer}>
          <Image
            source={require("@assets/images/bigtime-logo.png")}
            style={styles.logo}
            contentFit="contain"
          />
          <ThemedText type="h2" style={styles.appName}>
            Pic Portal
          </ThemedText>
          <ThemedText type="body" style={[styles.tagline, { color: theme.textSecondary }]}>
            Big Time Buyer Photos
          </ThemedText>
        </View>

        <View style={styles.formContainer}>
          {error ? (
            <View style={[styles.errorContainer, { backgroundColor: "rgba(239, 68, 68, 0.1)" }]}>
              <Feather name="alert-circle" size={20} color="#EF4444" />
              <ThemedText type="body" style={styles.errorText}>
                {error}
              </ThemedText>
            </View>
          ) : null}

          <View style={styles.inputContainer}>
            <ThemedText type="small" style={styles.inputLabel}>
              Email
            </ThemedText>
            <View style={[styles.inputWrapper, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
              <Feather name="mail" size={20} color={theme.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                editable={!isLoading}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <ThemedText type="small" style={styles.inputLabel}>
              Password
            </ThemedText>
            <View style={[styles.inputWrapper, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
              <Feather name="lock" size={20} color={theme.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="password"
                editable={!isLoading}
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                style={styles.showPasswordButton}
              >
                <Feather
                  name={showPassword ? "eye-off" : "eye"}
                  size={20}
                  color={theme.textSecondary}
                />
              </Pressable>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.loginButton,
              { backgroundColor: theme.primary, opacity: pressed || isLoading ? 0.8 : 1 },
            ]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Feather name="log-in" size={20} color="#FFFFFF" />
                <ThemedText type="body" style={styles.loginButtonText}>
                  Sign In
                </ThemedText>
              </>
            )}
          </Pressable>

          {canUseBiometric ? (
            <Pressable
              style={({ pressed }) => [
                styles.biometricButton,
                { borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
              ]}
              onPress={handleBiometricLogin}
              disabled={isLoading}
            >
              <Feather name="smartphone" size={20} color={theme.primary} />
              <ThemedText type="body" style={[styles.biometricButtonText, { color: theme.primary }]}>
                Use Face ID / Touch ID
              </ThemedText>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.footer}>
          <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: "center" }}>
            Contact your administrator if you need{"\n"}account access or have forgotten your password.
          </ThemedText>
        </View>
      </KeyboardAwareScrollViewCompat>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: "center",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: Spacing["4xl"],
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 20,
    marginBottom: Spacing.lg,
  },
  appName: {
    marginBottom: Spacing.xs,
  },
  tagline: {
    textAlign: "center",
  },
  formContainer: {
    gap: Spacing.lg,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  errorText: {
    color: "#EF4444",
    flex: 1,
  },
  inputContainer: {
    gap: Spacing.xs,
  },
  inputLabel: {
    marginLeft: Spacing.xs,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.md,
    fontSize: 16,
  },
  showPasswordButton: {
    padding: Spacing.sm,
  },
  loginButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  biometricButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  biometricButtonText: {
    fontWeight: "600",
  },
  footer: {
    marginTop: Spacing["4xl"],
    paddingHorizontal: Spacing.lg,
  },
});
