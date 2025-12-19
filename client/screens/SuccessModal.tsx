import React, { useEffect } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withDelay,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Colors, Spacing } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SuccessModal() {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const scale = useSharedValue(0);
  const checkScale = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 100 });
    checkScale.value = withDelay(
      200,
      withSequence(
        withSpring(1.2, { damping: 10 }),
        withSpring(1, { damping: 15 })
      )
    );

    const timer = setTimeout(() => {
      navigation.reset({
        index: 0,
        routes: [{ name: "Main" }],
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigation, scale, checkScale]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const handleDismiss = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "Main" }],
    });
  };

  return (
    <Pressable style={styles.overlay} onPress={handleDismiss}>
      <Animated.View
        style={[
          styles.modal,
          { backgroundColor: theme.backgroundRoot },
          containerStyle,
        ]}
      >
        <Animated.View
          style={[
            styles.iconContainer,
            { backgroundColor: Colors.light.success },
            checkStyle,
          ]}
        >
          <Feather name="check" size={48} color="#FFFFFF" />
        </Animated.View>

        <ThemedText type="h3" style={styles.title}>
          Photo Submitted!
        </ThemedText>

        <ThemedText
          type="body"
          style={[styles.message, { color: theme.textSecondary }]}
        >
          Your photo has been sent to the agency and will be posted to social
          media soon.
        </ThemedText>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  modal: {
    width: "100%",
    maxWidth: 320,
    borderRadius: BorderRadius.lg,
    padding: Spacing["3xl"],
    alignItems: "center",
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  title: {
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  message: {
    textAlign: "center",
  },
});
