import React from "react";
import { View, StyleSheet, Pressable, Linking } from "react-native";
import { Image } from "expo-image";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";

const bestUsedCarsLogo = require("@assets/images/bestusedcars-logo.png");
const daraCoreAILogo = require("@assets/images/daracoreai-logo.png");

export function PoweredByFooter() {
  const { theme } = useTheme();

  const openBestUsedCars = () => {
    Linking.openURL("https://getbestusedcars.com/");
  };

  const openDaraCoreAI = () => {
    Linking.openURL("https://daracoreai.com/");
  };

  return (
    <View style={styles.container}>
      <ThemedText type="small" style={[styles.poweredByText, { color: theme.textSecondary }]}>
        Powered by
      </ThemedText>
      <View style={styles.logosContainer}>
        <Pressable onPress={openBestUsedCars}>
          <Image source={bestUsedCarsLogo} style={styles.partnerLogo} contentFit="contain" />
        </Pressable>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <Pressable onPress={openDaraCoreAI}>
          <Image source={daraCoreAILogo} style={styles.partnerLogo} contentFit="contain" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  poweredByText: {
    textTransform: "uppercase",
    letterSpacing: 1,
    fontSize: 10,
  },
  logosContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
  },
  partnerLogo: {
    width: 100,
    height: 36,
  },
  divider: {
    width: 1,
    height: 24,
  },
});
