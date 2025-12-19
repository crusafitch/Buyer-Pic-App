import React from "react";
import { View, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Spacing } from "@/constants/theme";

const bigtimeLogo = require("@assets/images/bigtime-logo.png");

export function BrandHeader() {
  return (
    <View style={styles.container}>
      <Image source={bigtimeLogo} style={styles.logo} contentFit="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 120,
    height: 40,
  },
});
