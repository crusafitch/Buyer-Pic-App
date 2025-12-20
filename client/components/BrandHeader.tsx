import React from "react";
import { View, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Spacing } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";

const bigtimeLogo = require("@assets/images/bigtime-logo.png");

export function BrandHeader() {
  const { theme } = useTheme();
  
  return (
    <View style={styles.container}>
      <ThemedText type="small" style={[styles.broughtByText, { color: theme.textSecondary }]}>
        Brought to you by
      </ThemedText>
      <Image source={bigtimeLogo} style={styles.logo} contentFit="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  broughtByText: {
    marginBottom: Spacing.xs,
  },
  logo: {
    width: 120,
    height: 40,
  },
});
