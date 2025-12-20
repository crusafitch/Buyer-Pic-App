import React, { useState, useRef } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  TextInput,
  ActivityIndicator,
  Pressable,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import ViewShot from "react-native-view-shot";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Colors, Spacing } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useSubmissions } from "@/hooks/useSubmissions";
import { useProfile } from "@/hooks/useProfile";
import { getApiUrl } from "@/lib/query-client";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteType = RouteProp<RootStackParamList, "Preview">;

const { width } = Dimensions.get("window");
const PREVIEW_SIZE = width - Spacing.xl * 2;

export default function PreviewScreen() {
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { mediaUri, mediaType, overlayId, overlayUrl } = route.params;

  const [caption, setCaption] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
  const viewShotRef = useRef<ViewShot>(null);
  const { addSubmission } = useSubmissions();
  const { profile } = useProfile();

  const videoPlayer = useVideoPlayer(mediaType === "video" ? mediaUri : null, player => {
    player.loop = true;
    player.play();
  });

  const handleGenerateCaption = async () => {
    if (isGeneratingCaption || mediaType !== "photo") return;

    setIsGeneratingCaption(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const formData = new FormData();
      
      if (Platform.OS === "web") {
        const response = await fetch(mediaUri);
        const blob = await response.blob();
        formData.append("image", blob, "photo.jpg");
      } else {
        const imageFile = {
          uri: mediaUri,
          name: "photo.jpg",
          type: "image/jpeg",
        } as unknown as Blob;
        formData.append("image", imageFile);
      }
      
      formData.append("companyName", profile.companyName);
      formData.append("userName", profile.username);

      const apiUrl = new URL("/api/generate-caption", getApiUrl());
      const res = await fetch(apiUrl.toString(), {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to generate caption");
      }

      const data = await res.json();
      if (data.caption) {
        setCaption(data.caption);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error("Failed to generate caption:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsGeneratingCaption(false);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      let finalMediaUri = mediaUri;

      if (mediaType === "photo" && viewShotRef.current && overlayUrl) {
        try {
          const capturedUri = await viewShotRef.current.capture?.();
          if (capturedUri) {
            finalMediaUri = capturedUri;
          }
        } catch (captureError) {
          console.warn("Could not capture composite image:", captureError);
        }
      }

      await addSubmission(finalMediaUri, overlayId, caption, mediaType, profile.username, profile.companyName);

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
      {mediaType === "video" ? (
        <View style={styles.previewContainer}>
          <VideoView
            player={videoPlayer}
            style={styles.videoPlayer}
            contentFit="cover"
            nativeControls={true}
          />
        </View>
      ) : (
        <ViewShot
          ref={viewShotRef}
          options={{ format: "jpg", quality: 0.9 }}
          style={styles.previewContainer}
        >
          <Image source={{ uri: mediaUri }} style={styles.previewImage} />
          {overlayUrl ? (
            <Image
              source={{ uri: overlayUrl }}
              style={styles.overlayImage}
              contentFit="cover"
            />
          ) : null}
        </ViewShot>
      )}

      <View style={styles.captionContainer}>
        <View style={styles.captionHeader}>
          <ThemedText
            type="body"
            style={[styles.label, { color: theme.textSecondary }]}
          >
            Add a caption (optional)
          </ThemedText>
          {mediaType === "photo" ? (
            <Pressable
              style={[
                styles.aiButton,
                { 
                  backgroundColor: isGeneratingCaption ? theme.backgroundSecondary : Colors.light.primary,
                  opacity: isGeneratingCaption ? 0.7 : 1,
                },
              ]}
              onPress={handleGenerateCaption}
              disabled={isGeneratingCaption}
            >
              {isGeneratingCaption ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Feather name="zap" size={14} color="#FFFFFF" />
                  <ThemedText style={styles.aiButtonText}>AI Caption</ThemedText>
                </>
              )}
            </Pressable>
          ) : null}
        </View>
        <TextInput
          style={[
            styles.captionInput,
            {
              backgroundColor: theme.backgroundDefault,
              color: theme.text,
              borderColor: theme.border,
            },
          ]}
          placeholder={mediaType === "video" ? "Describe this video..." : "Describe this customer success..."}
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
          "Submit to Big Time"
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
  videoPlayer: {
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
  captionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  label: {},
  aiButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  aiButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
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
