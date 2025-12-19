import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteType = RouteProp<RootStackParamList, "OverlaySelect">;

const { width } = Dimensions.get("window");
const PREVIEW_SIZE = width - Spacing.xl * 2;

interface OverlayOption {
  id: string;
  name: string;
  source: any;
}

const overlays: OverlayOption[] = [
  { id: "confetti", name: "Celebration", source: require("../../assets/overlays/confetti.png") },
  { id: "frame", name: "Classic Frame", source: require("../../assets/overlays/frame.png") },
  { id: "star", name: "Star", source: require("../../assets/overlays/star.png") },
  { id: "ribbon", name: "Ribbon", source: require("../../assets/overlays/ribbon.png") },
  { id: "geometric", name: "Modern", source: require("../../assets/overlays/geometric.png") },
];

export default function OverlaySelectScreen() {
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { photoUri } = route.params;

  const [selectedOverlay, setSelectedOverlay] = useState<string | null>(null);

  const handleSelectOverlay = (overlayId: string) => {
    Haptics.selectionAsync();
    setSelectedOverlay(selectedOverlay === overlayId ? null : overlayId);
  };

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("Preview", {
      photoUri,
      overlayId: selectedOverlay,
    });
  };

  const handleSkip = () => {
    navigation.navigate("Preview", {
      photoUri,
      overlayId: null,
    });
  };

  const selectedOverlayData = overlays.find((o) => o.id === selectedOverlay);

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.previewContainer}>
          <Image source={{ uri: photoUri }} style={styles.previewImage} />
          {selectedOverlayData ? (
            <Image
              source={selectedOverlayData.source}
              style={styles.overlayImage}
              contentFit="cover"
            />
          ) : null}
        </View>

        <ThemedText
          type="body"
          style={[styles.sectionTitle, { color: theme.textSecondary }]}
        >
          Select an overlay (optional)
        </ThemedText>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.overlayList}
        >
          {overlays.map((overlay) => (
            <Pressable
              key={overlay.id}
              style={({ pressed }) => [
                styles.overlayOption,
                {
                  backgroundColor: theme.backgroundDefault,
                  borderColor:
                    selectedOverlay === overlay.id
                      ? theme.primary
                      : theme.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              onPress={() => handleSelectOverlay(overlay.id)}
            >
              <Image source={overlay.source} style={styles.overlayThumbnail} />
              <ThemedText type="small" style={styles.overlayName}>
                {overlay.name}
              </ThemedText>
              {selectedOverlay === overlay.id ? (
                <View
                  style={[
                    styles.checkmark,
                    { backgroundColor: theme.primary },
                  ]}
                >
                  <Feather name="check" size={12} color="#FFFFFF" />
                </View>
              ) : null}
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.buttonContainer}>
          <Button onPress={handleNext}>
            {selectedOverlay ? "Next" : "Continue without overlay"}
          </Button>
          {selectedOverlay ? (
            <Pressable
              style={styles.skipButton}
              onPress={handleSkip}
              hitSlop={12}
            >
              <ThemedText
                type="body"
                style={{ color: theme.textSecondary }}
              >
                Skip overlay
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
  },
  previewContainer: {
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
    marginBottom: Spacing.xl,
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  overlayImage: {
    ...StyleSheet.absoluteFillObject,
  },
  sectionTitle: {
    marginBottom: Spacing.lg,
  },
  overlayList: {
    gap: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  overlayOption: {
    width: 100,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    padding: Spacing.sm,
    alignItems: "center",
  },
  overlayThumbnail: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.xs,
    marginBottom: Spacing.xs,
  },
  overlayName: {
    textAlign: "center",
  },
  checkmark: {
    position: "absolute",
    top: Spacing.xs,
    right: Spacing.xs,
    width: 20,
    height: 20,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonContainer: {
    marginTop: Spacing.lg,
    gap: Spacing.lg,
    alignItems: "center",
  },
  skipButton: {
    paddingVertical: Spacing.sm,
  },
});
