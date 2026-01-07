import React, { useState, useRef } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  TextInput,
  ActivityIndicator,
  Pressable,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import * as VideoThumbnails from "expo-video-thumbnails";
import { File } from "expo-file-system";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import ViewShot from "react-native-view-shot";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { DraggableText, StaticTextOverlay, TextOverlay } from "@/components/DraggableText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Colors, Spacing } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useSubmissions } from "@/hooks/useSubmissions";
import { useProfile } from "@/hooks/useProfile";
import { getApiUrl } from "@/lib/query-client";

const TEXT_COLORS = ["#FFFFFF", "#000000", "#FF3B30", "#FF9500", "#FFCC00", "#34C759", "#007AFF", "#AF52DE", "#FF2D55"];
const FONT_STYLES: Array<"normal" | "bold" | "italic"> = ["normal", "bold", "italic"];

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
  const [eventContext, setEventContext] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [isAddingText, setIsAddingText] = useState(false);
  const [newTextValue, setNewTextValue] = useState("");
  const [videoThumbnail, setVideoThumbnail] = useState<string | null>(null);
  const [isEditingVideoOverlay, setIsEditingVideoOverlay] = useState(false);
  const [isProcessingVideo, setIsProcessingVideo] = useState(false);
  const viewShotRef = useRef<ViewShot>(null);
  const { addSubmission } = useSubmissions();
  const { profile, isLoading: isProfileLoading } = useProfile();

  const selectedText = textOverlays.find(t => t.id === selectedTextId);
  const hasVideoOverlays = overlayUrl || textOverlays.length > 0;

  const videoPlayer = useVideoPlayer(mediaType === "video" ? mediaUri : null, player => {
    player.loop = false;
  });

  React.useEffect(() => {
    if (mediaType === "video") {
      VideoThumbnails.getThumbnailAsync(mediaUri, { time: 1000 })
        .then(result => setVideoThumbnail(result.uri))
        .catch(err => console.warn("Failed to get video thumbnail:", err));
    }
  }, [mediaUri, mediaType]);

  const handleAddText = () => {
    if (!newTextValue.trim()) return;
    
    const newOverlay: TextOverlay = {
      id: Date.now().toString(),
      text: newTextValue.trim(),
      x: PREVIEW_SIZE / 4,
      y: PREVIEW_SIZE / 2,
      color: "#FFFFFF",
      fontStyle: "bold",
      fontSize: 24,
    };
    
    setTextOverlays(prev => [...prev, newOverlay]);
    setSelectedTextId(newOverlay.id);
    setNewTextValue("");
    setIsAddingText(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePositionChange = (id: string, x: number, y: number) => {
    setTextOverlays(prev =>
      prev.map(t => (t.id === id ? { ...t, x, y } : t))
    );
  };

  const handleColorChange = (color: string) => {
    if (!selectedTextId) return;
    setTextOverlays(prev =>
      prev.map(t => (t.id === selectedTextId ? { ...t, color } : t))
    );
    Haptics.selectionAsync();
  };

  const handleFontStyleChange = (fontStyle: "normal" | "bold" | "italic") => {
    if (!selectedTextId) return;
    setTextOverlays(prev =>
      prev.map(t => (t.id === selectedTextId ? { ...t, fontStyle } : t))
    );
    Haptics.selectionAsync();
  };

  const handleDeleteText = () => {
    if (!selectedTextId) return;
    Alert.alert("Delete Text", "Remove this text from the photo?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          setTextOverlays(prev => prev.filter(t => t.id !== selectedTextId));
          setSelectedTextId(null);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  const handleGenerateCaption = async () => {
    if (isGeneratingCaption || isProfileLoading) return;

    setIsGeneratingCaption(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    console.log("Generating caption with profile:", profile.username, profile.companyName);

    try {
      const formData = new FormData();
      
      let imageUri = mediaUri;
      
      if (mediaType === "video") {
        try {
          const thumbnail = await VideoThumbnails.getThumbnailAsync(mediaUri, {
            time: 1000,
          });
          imageUri = thumbnail.uri;
        } catch (thumbError) {
          console.error("Failed to get video thumbnail:", thumbError);
          throw new Error("Could not extract frame from video");
        }
      }
      
      if (Platform.OS === "web") {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        formData.append("image", blob, "photo.jpg");
      } else {
        const imageFile = {
          uri: imageUri,
          name: "photo.jpg",
          type: "image/jpeg",
        } as unknown as Blob;
        formData.append("image", imageFile);
      }
      
      formData.append("companyName", profile.companyName);
      formData.append("userName", profile.username);
      if (eventContext.trim()) {
        formData.append("context", eventContext.trim());
      }

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

  const processVideoWithOverlays = async (): Promise<string> => {
    const formData = new FormData();
    
    if (Platform.OS === "web") {
      const response = await fetch(mediaUri);
      const blob = await response.blob();
      formData.append("video", blob, "video.mp4");
    } else {
      const videoFile = new File(mediaUri);
      formData.append("video", videoFile as unknown as Blob);
    }
    
    if (overlayUrl) {
      formData.append("overlayUrl", overlayUrl);
    }
    
    if (textOverlays.length > 0) {
      formData.append("textOverlays", JSON.stringify(textOverlays));
    }
    
    formData.append("videoSize", String(PREVIEW_SIZE));
    
    const apiUrl = new URL("/api/process-video", getApiUrl());
    const res = await fetch(apiUrl.toString(), {
      method: "POST",
      body: formData,
    });
    
    if (!res.ok) {
      throw new Error("Failed to process video");
    }
    
    const data = await res.json();
    return `${getApiUrl()}${data.processedVideoUrl}`;
  };

  const handleSubmit = async () => {
    if (isSubmitting || isProfileLoading) return;

    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    console.log("Submitting with profile:", profile.username, profile.companyName);

    try {
      let finalMediaUri = mediaUri;

      if (mediaType === "photo" && viewShotRef.current && (overlayUrl || textOverlays.length > 0)) {
        try {
          const capturedUri = await viewShotRef.current.capture?.();
          if (capturedUri) {
            finalMediaUri = capturedUri;
          }
        } catch (captureError) {
          console.warn("Could not capture composite image:", captureError);
        }
      } else if (mediaType === "video" && hasVideoOverlays) {
        setIsProcessingVideo(true);
        try {
          finalMediaUri = await processVideoWithOverlays();
        } catch (processError) {
          console.error("Failed to process video:", processError);
          Alert.alert("Processing Error", "Failed to apply overlays to video. Submitting original video.");
        } finally {
          setIsProcessingVideo(false);
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
        <View style={styles.previewWrapper}>
          {isEditingVideoOverlay && videoThumbnail ? (
            <GestureHandlerRootView style={{ flex: 1 }}>
              <View style={styles.previewContainer}>
                <Image source={{ uri: videoThumbnail }} style={styles.previewImage} />
                {overlayUrl ? (
                  <Image
                    source={{ uri: overlayUrl }}
                    style={styles.overlayImage}
                    contentFit="cover"
                  />
                ) : null}
                {textOverlays.map(overlay => (
                  <DraggableText
                    key={overlay.id}
                    overlay={overlay}
                    onPositionChange={handlePositionChange}
                    onSelect={setSelectedTextId}
                    isSelected={overlay.id === selectedTextId}
                    containerSize={PREVIEW_SIZE}
                  />
                ))}
              </View>
              <Pressable
                style={[styles.editOverlayButton, { backgroundColor: Colors.light.primary }]}
                onPress={() => setIsEditingVideoOverlay(false)}
              >
                <Feather name="play" size={16} color="#FFFFFF" />
                <ThemedText style={styles.editOverlayButtonText}>Preview Video</ThemedText>
              </Pressable>
            </GestureHandlerRootView>
          ) : (
            <View>
              <View style={styles.previewContainer}>
                <VideoView
                  player={videoPlayer}
                  style={styles.videoPlayer}
                  contentFit="cover"
                  nativeControls={true}
                />
                {hasVideoOverlays ? (
                  <View style={styles.overlayIndicator}>
                    <Feather name="layers" size={14} color="#FFFFFF" />
                    <ThemedText style={styles.overlayIndicatorText}>Overlays will be applied</ThemedText>
                  </View>
                ) : null}
              </View>
              <Pressable
                style={[styles.editOverlayButton, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, borderWidth: 1 }]}
                onPress={() => setIsEditingVideoOverlay(true)}
              >
                <Feather name="edit-2" size={16} color={theme.text} />
                <ThemedText style={{ marginLeft: Spacing.sm }}>Edit Overlays</ThemedText>
              </Pressable>
            </View>
          )}
        </View>
      ) : (
        <GestureHandlerRootView style={styles.previewWrapper}>
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
            {textOverlays.map(overlay => (
              <DraggableText
                key={overlay.id}
                overlay={overlay}
                onPositionChange={handlePositionChange}
                onSelect={setSelectedTextId}
                isSelected={overlay.id === selectedTextId}
                containerSize={PREVIEW_SIZE}
              />
            ))}
          </ViewShot>
        </GestureHandlerRootView>
      )}

      {(mediaType === "photo" || isEditingVideoOverlay) ? (
        <View style={styles.textControlsSection}>
          {isAddingText ? (
            <View style={styles.addTextRow}>
              <TextInput
                style={[
                  styles.newTextInput,
                  {
                    backgroundColor: theme.backgroundDefault,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                placeholder="Enter your text..."
                placeholderTextColor={theme.textSecondary}
                value={newTextValue}
                onChangeText={setNewTextValue}
                autoFocus
                maxLength={50}
              />
              <Pressable
                style={[styles.addTextButton, { backgroundColor: Colors.light.primary }]}
                onPress={handleAddText}
              >
                <Feather name="check" size={20} color="#FFFFFF" />
              </Pressable>
              <Pressable
                style={[styles.addTextButton, { backgroundColor: theme.backgroundSecondary }]}
                onPress={() => {
                  setIsAddingText(false);
                  setNewTextValue("");
                }}
              >
                <Feather name="x" size={20} color={theme.text} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={[styles.addTextTrigger, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}
              onPress={() => setIsAddingText(true)}
            >
              <Feather name="type" size={18} color={theme.text} />
              <ThemedText style={{ marginLeft: Spacing.sm }}>Add Text</ThemedText>
            </Pressable>
          )}

          {selectedText ? (
            <View style={styles.textEditorPanel}>
              <View style={styles.editorRow}>
                <ThemedText type="small" style={{ color: theme.textSecondary, marginRight: Spacing.sm }}>Color:</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorPicker}>
                  {TEXT_COLORS.map(color => (
                    <Pressable
                      key={color}
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: color },
                        selectedText.color === color && styles.selectedSwatch,
                      ]}
                      onPress={() => handleColorChange(color)}
                    />
                  ))}
                </ScrollView>
              </View>
              <View style={styles.editorRow}>
                <ThemedText type="small" style={{ color: theme.textSecondary, marginRight: Spacing.sm }}>Style:</ThemedText>
                {FONT_STYLES.map(style => (
                  <Pressable
                    key={style}
                    style={[
                      styles.styleButton,
                      { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
                      selectedText.fontStyle === style && { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
                    ]}
                    onPress={() => handleFontStyleChange(style)}
                  >
                    <ThemedText
                      style={[
                        styles.styleButtonText,
                        { color: selectedText.fontStyle === style ? "#FFFFFF" : theme.text },
                        style === "bold" && { fontWeight: "bold" },
                        style === "italic" && { fontStyle: "italic" },
                      ]}
                    >
                      {style.charAt(0).toUpperCase() + style.slice(1)}
                    </ThemedText>
                  </Pressable>
                ))}
                <Pressable
                  style={[styles.deleteButton, { backgroundColor: "#FF3B30" }]}
                  onPress={handleDeleteText}
                >
                  <Feather name="trash-2" size={16} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.contextContainer}>
        <ThemedText
          type="body"
          style={[styles.label, { color: theme.textSecondary }]}
        >
          Event or Promotion (for AI caption)
        </ThemedText>
        <TextInput
          style={[
            styles.contextInput,
            {
              backgroundColor: theme.backgroundDefault,
              color: theme.text,
              borderColor: theme.border,
            },
          ]}
          placeholder="e.g., Red White and Blue Sales Event, Memorial Day Sale..."
          placeholderTextColor={theme.textSecondary}
          value={eventContext}
          onChangeText={setEventContext}
          maxLength={100}
        />
      </View>

      <View style={styles.captionContainer}>
        <View style={styles.captionHeader}>
          <ThemedText
            type="body"
            style={[styles.label, { color: theme.textSecondary }]}
          >
            Add a caption (optional)
          </ThemedText>
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

      <Button onPress={handleSubmit} disabled={isSubmitting || isProcessingVideo}>
        {isSubmitting || isProcessingVideo ? (
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <ActivityIndicator color="#FFFFFF" size="small" />
            {isProcessingVideo ? (
              <ThemedText style={{ color: "#FFFFFF", marginLeft: Spacing.sm }}>Processing video...</ThemedText>
            ) : null}
          </View>
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
  previewWrapper: {
    marginBottom: Spacing.lg,
  },
  previewContainer: {
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
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
  editOverlayButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
  },
  editOverlayButtonText: {
    color: "#FFFFFF",
    marginLeft: Spacing.sm,
    fontWeight: "600",
  },
  overlayIndicator: {
    position: "absolute",
    bottom: Spacing.sm,
    left: Spacing.sm,
    right: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  overlayIndicatorText: {
    color: "#FFFFFF",
    fontSize: 12,
    marginLeft: Spacing.xs,
  },
  textControlsSection: {
    marginBottom: Spacing.lg,
  },
  addTextRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  newTextInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    fontSize: 16,
  },
  addTextButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  addTextTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    borderStyle: "dashed",
  },
  textEditorPanel: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  editorRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  colorPicker: {
    flexDirection: "row",
  },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: Spacing.xs,
    borderWidth: 2,
    borderColor: "transparent",
  },
  selectedSwatch: {
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  styleButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginRight: Spacing.xs,
  },
  styleButtonText: {
    fontSize: 12,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: "auto",
  },
  contextContainer: {
    marginBottom: Spacing.lg,
  },
  contextInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    fontSize: 16,
    marginTop: Spacing.sm,
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
