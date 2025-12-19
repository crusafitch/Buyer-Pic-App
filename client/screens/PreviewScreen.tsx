import React, { useState, useRef } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import ViewShot from "react-native-view-shot";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useSubmissions } from "@/hooks/useSubmissions";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteType = RouteProp<RootStackParamList, "Preview">;

const { width } = Dimensions.get("window");
const PREVIEW_SIZE = width - Spacing.xl * 2;

const overlayMap: Record<string, any> = {
  confetti: require("../../assets/overlays/confetti.png"),
  frame: require("../../assets/overlays/frame.png"),
  star: require("../../assets/overlays/star.png"),
  ribbon: require("../../assets/overlays/ribbon.png"),
  geometric: require("../../assets/overlays/geometric.png"),
};

export default function PreviewScreen() {
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { photoUri, overlayId } = route.params;

  const [caption, setCaption] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const viewShotRef = useRef<ViewShot>(null);
  const { addSubmission } = useSubmissions();

  const overlaySource = overlayId ? overlayMap[overlayId] : null;

  const handleSubmit = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      let finalPhotoUri = photoUri;

      if (viewShotRef.current && overlayId) {
        try {
          const capturedUri = await viewShotRef.current.capture?.();
          if (capturedUri) {
            finalPhotoUri = capturedUri;
          }
        } catch (captureError) {
          console.warn("Could not capture composite image:", captureError);
        }
      }

      await addSubmission(finalPhotoUri, overlayId, caption);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.navigate("Success");
    } catch (error) {
      console.error("Failed to submit:", error);
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
      contentContainerStyle={[
        styles.scrollContent,
        {
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: insets.bottom + Spacing.xl,
        },
      ]}
    >
      <ViewShot
        ref={viewShotRef}
        options={{ format: "jpg", quality: 0.9 }}
        style={styles.previewContainer}
      >
        <Image source={{ uri: photoUri }} style={styles.previewImage} />
        {overlaySource ? (
          <Image
            source={overlaySource}
            style={styles.overlayImage}
            contentFit="cover"
          />
        ) : null}
      </ViewShot>

      <View style={styles.captionContainer}>
        <ThemedText
          type="body"
          style={[styles.label, { color: theme.textSecondary }]}
        >
          Add a caption (optional)
        </ThemedText>
        <TextInput
          style={[
            styles.captionInput,
            {
              backgroundColor: theme.backgroundDefault,
              color: theme.text,
              borderColor: theme.border,
            },
          ]}
          placeholder="Describe this customer success..."
          placeholderTextColor={theme.textSecondary}
          value={caption}
          onChangeText={setCaption}
          multiline
          numberOfLines={3}
          maxLength={200}
        />
        <ThemedText
          type="small"
          style={[styles.charCount, { color: theme.textSecondary }]}
        >
          {caption.length}/200
        </ThemedText>
      </View>

      <Button onPress={handleSubmit} disabled={isSubmitting}>
        {isSubmitting ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          "Submit to Agency"
        )}
      </Button>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    flexGrow: 1,
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
  captionContainer: {
    marginBottom: Spacing.xl,
    flex: 1,
  },
  label: {
    marginBottom: Spacing.sm,
  },
  captionInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: "top",
  },
  charCount: {
    textAlign: "right",
    marginTop: Spacing.xs,
  },
});
