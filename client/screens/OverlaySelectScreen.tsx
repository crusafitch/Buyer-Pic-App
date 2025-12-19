import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  ActivityIndicator,
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
import { useOverlays, getOverlayImageUrl } from "@/hooks/useOverlays";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteType = RouteProp<RootStackParamList, "OverlaySelect">;

const { width } = Dimensions.get("window");
const PREVIEW_SIZE = width - Spacing.xl * 2;

export default function OverlaySelectScreen() {
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { photoUri } = route.params;

  const { data: overlays, isLoading } = useOverlays();
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);

  const handleSelectOverlay = (overlayId: string) => {
    Haptics.selectionAsync();
    setSelectedOverlayId(selectedOverlayId === overlayId ? null : overlayId);
  };

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const selectedOverlay = overlays?.find((o) => o.id === selectedOverlayId);
    navigation.navigate("Preview", {
      photoUri,
      overlayId: selectedOverlayId,
      overlayUrl: selectedOverlay ? getOverlayImageUrl(selectedOverlay.imageUrl) : undefined,
    });
  };

  const handleSkip = () => {
    navigation.navigate("Preview", {
      photoUri,
      overlayId: null,
      overlayUrl: undefined,
    });
  };

  const selectedOverlay = overlays?.find((o) => o.id === selectedOverlayId);

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
          {selectedOverlay ? (
            <Image
              source={{ uri: getOverlayImageUrl(selectedOverlay.imageUrl) }}
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

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.primary} />
            <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
              Loading overlays...
            </ThemedText>
          </View>
        ) : overlays && overlays.length > 0 ? (
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
                      selectedOverlayId === overlay.id
                        ? theme.primary
                        : theme.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
                onPress={() => handleSelectOverlay(overlay.id)}
              >
                <View style={[styles.overlayThumbnailContainer, { backgroundColor: theme.backgroundDefault }]}>
                  <Image
                    source={{ uri: getOverlayImageUrl(overlay.imageUrl) }}
                    style={styles.overlayThumbnail}
                    contentFit="contain"
                  />
                </View>
                <ThemedText type="small" style={styles.overlayName} numberOfLines={2}>
                  {overlay.name}
                </ThemedText>
                {selectedOverlayId === overlay.id ? (
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
        ) : (
          <View style={styles.emptyContainer}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              No overlays available yet
            </ThemedText>
          </View>
        )}

        <View style={styles.buttonContainer}>
          <Button onPress={handleNext}>
            {selectedOverlayId ? "Next" : "Continue without overlay"}
          </Button>
          {selectedOverlayId ? (
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
  loadingContainer: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
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
  overlayThumbnailContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.xs,
    marginBottom: Spacing.xs,
    overflow: "hidden",
  },
  overlayThumbnail: {
    width: "100%",
    height: "100%",
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
