import React, { useState, useRef } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Platform,
  Linking,
  ActivityIndicator,
} from "react-native";
import { CameraView, useCameraPermissions, CameraType } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withTiming,
  cancelAnimation,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Colors, Spacing } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type MediaMode = "photo" | "video";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function CaptureButton({ 
  onPress, 
  onLongPressStart, 
  onLongPressEnd, 
  isRecording,
  mode 
}: { 
  onPress: () => void;
  onLongPressStart?: () => void;
  onLongPressEnd?: () => void;
  isRecording: boolean;
  mode: MediaMode;
}) {
  const scale = useSharedValue(1);
  const recordingScale = useSharedValue(1);

  React.useEffect(() => {
    if (isRecording) {
      recordingScale.value = withRepeat(
        withTiming(1.2, { duration: 800 }),
        -1,
        true
      );
    } else {
      cancelAnimation(recordingScale);
      recordingScale.value = withSpring(1);
    }
  }, [isRecording]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * recordingScale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 15 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLongPress={mode === "video" ? onLongPressStart : undefined}
      delayLongPress={200}
      style={[styles.captureButton, animatedStyle]}
    >
      <View 
        style={[
          styles.captureButtonInner, 
          isRecording && styles.captureButtonRecording,
          mode === "video" && !isRecording && styles.captureButtonVideo
        ]} 
      />
    </AnimatedPressable>
  );
}

function ModeToggle({ mode, onToggle }: { mode: MediaMode; onToggle: () => void }) {
  const { theme } = useTheme();

  return (
    <Pressable 
      style={[styles.modeToggle, { backgroundColor: "rgba(0,0,0,0.5)" }]}
      onPress={onToggle}
    >
      <View style={[styles.modeOption, mode === "photo" && styles.modeOptionActive]}>
        <Feather name="camera" size={16} color={mode === "photo" ? "#000" : "#FFF"} />
        <ThemedText style={[styles.modeText, { color: mode === "photo" ? "#000" : "#FFF" }]}>
          Photo
        </ThemedText>
      </View>
      <View style={[styles.modeOption, mode === "video" && styles.modeOptionActive]}>
        <Feather name="video" size={16} color={mode === "video" ? "#000" : "#FFF"} />
        <ThemedText style={[styles.modeText, { color: mode === "video" ? "#000" : "#FFF" }]}>
          Video
        </ThemedText>
      </View>
    </Pressable>
  );
}

function PermissionRequest({
  permission,
  requestPermission,
}: {
  permission: any;
  requestPermission: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const canOpenSettings =
    permission?.status === "denied" && !permission?.canAskAgain;

  const handleOpenSettings = async () => {
    if (Platform.OS !== "web") {
      try {
        await Linking.openSettings();
      } catch (error) {
        // Settings not available
      }
    }
  };

  return (
    <ThemedView
      style={[
        styles.permissionContainer,
        { paddingTop: insets.top + Spacing.xl },
      ]}
    >
      <View style={styles.permissionContent}>
        <View
          style={[
            styles.permissionIconContainer,
            { backgroundColor: theme.backgroundSecondary },
          ]}
        >
          <Feather name="camera" size={48} color={theme.primary} />
        </View>
        <ThemedText type="h3" style={styles.permissionTitle}>
          Camera Access Required
        </ThemedText>
        <ThemedText
          type="body"
          style={[styles.permissionText, { color: theme.textSecondary }]}
        >
          Photo Portal needs camera access to take photos and videos.
        </ThemedText>
        {canOpenSettings ? (
          Platform.OS !== "web" ? (
            <Button onPress={handleOpenSettings}>Open Settings</Button>
          ) : (
            <ThemedText
              type="small"
              style={{ color: theme.textSecondary, textAlign: "center" }}
            >
              Please use Expo Go on your mobile device to use the camera.
            </ThemedText>
          )
        ) : (
          <Button onPress={requestPermission}>Enable Camera</Button>
        )}
      </View>
    </ThemedView>
  );
}

function WebFallback() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const handlePickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const mediaType = asset.type === "video" ? "video" : "photo";
      navigation.navigate("OverlaySelect", { mediaUri: asset.uri, mediaType });
    }
  };

  return (
    <ThemedView
      style={[
        styles.permissionContainer,
        { paddingTop: insets.top + Spacing.xl },
      ]}
    >
      <View style={styles.permissionContent}>
        <View
          style={[
            styles.permissionIconContainer,
            { backgroundColor: theme.backgroundSecondary },
          ]}
        >
          <Feather name="image" size={48} color={theme.primary} />
        </View>
        <ThemedText type="h3" style={styles.permissionTitle}>
          Camera Not Available
        </ThemedText>
        <ThemedText
          type="body"
          style={[styles.permissionText, { color: theme.textSecondary }]}
        >
          Run in Expo Go on your mobile device to use the camera. For now, you
          can select media from your gallery.
        </ThemedText>
        <Button onPress={handlePickMedia}>Select from Gallery</Button>
      </View>
    </ThemedView>
  );
}

export default function CreateScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>("back");
  const [flash, setFlash] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mode, setMode] = useState<MediaMode>("photo");
  const [recordingDuration, setRecordingDuration] = useState(0);
  const cameraRef = useRef<CameraView>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NavigationProp>();

  if (Platform.OS === "web") {
    return <WebFallback />;
  }

  if (!permission) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </ThemedView>
    );
  }

  if (!permission.granted) {
    return (
      <PermissionRequest
        permission={permission}
        requestPermission={requestPermission}
      />
    );
  }

  const handleCapture = async () => {
    if (mode === "video") {
      if (isRecording) {
        handleStopRecording();
      } else {
        handleStartRecording();
      }
      return;
    }

    if (cameraRef.current && !isCapturing) {
      setIsCapturing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
        });
        if (photo) {
          navigation.navigate("OverlaySelect", { mediaUri: photo.uri, mediaType: "photo" });
        }
      } catch (error) {
        console.error("Failed to capture photo:", error);
      } finally {
        setIsCapturing(false);
      }
    }
  };

  const handleStartRecording = async () => {
    if (cameraRef.current && !isRecording) {
      setIsRecording(true);
      setRecordingDuration(0);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(d => d + 1);
      }, 1000);

      try {
        const video = await cameraRef.current.recordAsync({
          maxDuration: 60,
        });
        if (video) {
          navigation.navigate("OverlaySelect", { mediaUri: video.uri, mediaType: "video" });
        }
      } catch (error) {
        console.error("Failed to record video:", error);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } finally {
        setIsRecording(false);
        setRecordingDuration(0);
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
      }
    }
  };

  const handleStopRecording = () => {
    if (cameraRef.current && isRecording) {
      cameraRef.current.stopRecording();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handlePickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: mode === "video" 
        ? ImagePicker.MediaTypeOptions.Videos 
        : ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const mediaType = asset.type === "video" ? "video" : "photo";
      navigation.navigate("OverlaySelect", { mediaUri: asset.uri, mediaType });
    }
  };

  const toggleFlash = () => {
    setFlash(!flash);
    Haptics.selectionAsync();
  };

  const toggleFacing = () => {
    setFacing(facing === "back" ? "front" : "back");
    Haptics.selectionAsync();
  };

  const toggleMode = () => {
    setMode(mode === "photo" ? "video" : "photo");
    Haptics.selectionAsync();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        flash={flash ? "on" : "off"}
        mode={mode === "video" ? "video" : "picture"}
      >
        <View style={[styles.topControls, { top: insets.top + Spacing.lg }]}>
          <Pressable
            style={styles.controlButton}
            onPress={toggleFlash}
            hitSlop={12}
          >
            <Feather
              name={flash ? "zap" : "zap-off"}
              size={24}
              color="#FFFFFF"
            />
          </Pressable>
          
          {isRecording ? (
            <View style={styles.recordingIndicator}>
              <View style={styles.recordingDot} />
              <ThemedText style={styles.recordingTime}>
                {formatDuration(recordingDuration)}
              </ThemedText>
            </View>
          ) : null}

          <Pressable
            style={styles.controlButton}
            onPress={toggleFacing}
            hitSlop={12}
          >
            <Feather name="refresh-cw" size={24} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={[styles.modeContainer, { bottom: tabBarHeight + Spacing["3xl"] + 100 }]}>
          <ModeToggle mode={mode} onToggle={toggleMode} />
        </View>

        <View
          style={[
            styles.bottomControls,
            { bottom: tabBarHeight + Spacing["3xl"] },
          ]}
        >
          <Pressable style={styles.galleryButton} onPress={handlePickMedia}>
            <Feather name={mode === "video" ? "film" : "image"} size={28} color="#FFFFFF" />
          </Pressable>

          <CaptureButton 
            onPress={handleCapture} 
            onLongPressStart={handleStartRecording}
            onLongPressEnd={handleStopRecording}
            isRecording={isRecording}
            mode={mode}
          />

          <View style={styles.placeholder} />
        </View>
      </CameraView>

      {isCapturing ? (
        <View style={styles.capturingOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  camera: {
    flex: 1,
  },
  topControls: {
    position: "absolute",
    left: Spacing.xl,
    right: Spacing.xl,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  recordingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FF3B30",
  },
  recordingTime: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  modeContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  modeToggle: {
    flexDirection: "row",
    borderRadius: BorderRadius.full,
    padding: 4,
  },
  modeOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  modeOptionActive: {
    backgroundColor: "#FFFFFF",
  },
  modeText: {
    fontSize: 14,
    fontWeight: "600",
  },
  bottomControls: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: Spacing["3xl"],
  },
  galleryButton: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.sm,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.full,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.full,
    backgroundColor: "#FFFFFF",
    borderWidth: 3,
    borderColor: Colors.light.primary,
  },
  captureButtonVideo: {
    borderColor: "#FF3B30",
  },
  captureButtonRecording: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.xs,
    backgroundColor: "#FF3B30",
    borderWidth: 0,
  },
  placeholder: {
    width: 52,
    height: 52,
  },
  capturingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  permissionContainer: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  permissionContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 100,
  },
  permissionIconContainer: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  permissionTitle: {
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  permissionText: {
    textAlign: "center",
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
});
