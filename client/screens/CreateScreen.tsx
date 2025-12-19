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
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Colors, Spacing } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function CaptureButton({ onPress }: { onPress: () => void }) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
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
      style={[styles.captureButton, animatedStyle]}
    >
      <View style={styles.captureButtonInner} />
    </AnimatedPressable>
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
          Photo Portal needs camera access to take photos of your customers.
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

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      navigation.navigate("OverlaySelect", { photoUri: result.assets[0].uri });
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
          can select an image from your gallery.
        </ThemedText>
        <Button onPress={handlePickImage}>Select from Gallery</Button>
      </View>
    </ThemedView>
  );
}

export default function CreateScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>("back");
  const [flash, setFlash] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);
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
    if (cameraRef.current && !isCapturing) {
      setIsCapturing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
        });
        if (photo) {
          navigation.navigate("OverlaySelect", { photoUri: photo.uri });
        }
      } catch (error) {
        console.error("Failed to capture photo:", error);
      } finally {
        setIsCapturing(false);
      }
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      navigation.navigate("OverlaySelect", { photoUri: result.assets[0].uri });
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

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        flash={flash ? "on" : "off"}
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
          <Pressable
            style={styles.controlButton}
            onPress={toggleFacing}
            hitSlop={12}
          >
            <Feather name="refresh-cw" size={24} color="#FFFFFF" />
          </Pressable>
        </View>

        <View
          style={[
            styles.bottomControls,
            { bottom: tabBarHeight + Spacing["3xl"] },
          ]}
        >
          <Pressable style={styles.galleryButton} onPress={handlePickImage}>
            <Feather name="image" size={28} color="#FFFFFF" />
          </Pressable>

          <CaptureButton onPress={handleCapture} />

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
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
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
