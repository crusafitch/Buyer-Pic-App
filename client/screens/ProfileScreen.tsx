import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
  Alert,
  Linking,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";
import { useSubmissions } from "@/hooks/useSubmissions";
import { useProfile } from "@/hooks/useProfile";
import { PoweredByFooter } from "@/components/PoweredByFooter";

function SettingsRow({
  icon,
  label,
  onPress,
  showChevron = true,
  destructive = false,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  showChevron?: boolean;
  destructive?: boolean;
}) {
  const { theme } = useTheme();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.settingsRow,
        { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.7 : 1 },
      ]}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
    >
      <View style={styles.settingsRowLeft}>
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: destructive
                ? "rgba(239, 68, 68, 0.1)"
                : theme.backgroundSecondary,
            },
          ]}
        >
          <Feather
            name={icon}
            size={20}
            color={destructive ? "#EF4444" : theme.primary}
          />
        </View>
        <ThemedText
          type="body"
          style={destructive ? { color: "#EF4444" } : undefined}
        >
          {label}
        </ThemedText>
      </View>
      {showChevron ? (
        <Feather name="chevron-right" size={20} color={theme.textSecondary} />
      ) : null}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { submissions } = useSubmissions();
  const { profile, updateUsername, updateCompanyName, updatePhoto } = useProfile();

  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [tempUsername, setTempUsername] = useState(profile.username);
  const [tempCompany, setTempCompany] = useState(profile.companyName);

  const totalSubmissions = submissions.length;
  const pendingCount = submissions.filter((s) => s.status === "pending").length;
  const postedCount = submissions.filter((s) => s.status === "posted").length;

  const handleContactSupport = async () => {
    await WebBrowser.openBrowserAsync("mailto:support@bigtimeadvertising.com");
  };

  const handlePickPhoto = async () => {
    Haptics.selectionAsync();

    if (Platform.OS === "web") {
      Alert.alert(
        "Photo Upload",
        "Run in Expo Go to use this feature"
      );
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permission.granted) {
      if (permission.status === "denied" && !permission.canAskAgain) {
        Alert.alert(
          "Permission Required",
          "Please enable photo library access in your device settings.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Open Settings",
              onPress: async () => {
                try {
                  await Linking.openSettings();
                } catch (error) {
                  // Settings not available
                }
              },
            },
          ]
        );
      } else {
        Alert.alert(
          "Permission Required",
          "Please allow access to your photo library to upload a profile photo."
        );
      }
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await updatePhoto(result.assets[0].uri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleSaveUsername = async () => {
    if (tempUsername.trim()) {
      await updateUsername(tempUsername.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setIsEditingName(false);
  };

  const handleSaveCompany = async () => {
    if (tempCompany.trim()) {
      await updateCompanyName(tempCompany.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setIsEditingCompany(false);
  };

  const startEditingName = () => {
    setTempUsername(profile.username);
    setIsEditingName(true);
    Haptics.selectionAsync();
  };

  const startEditingCompany = () => {
    setTempCompany(profile.companyName);
    setIsEditingCompany(true);
    Haptics.selectionAsync();
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.profileHeader,
            { backgroundColor: theme.backgroundDefault },
          ]}
        >
          <Pressable onPress={handlePickPhoto} style={styles.avatarContainer}>
            {profile.photoUri ? (
              <Image
                source={{ uri: profile.photoUri }}
                style={styles.avatarImage}
                contentFit="cover"
              />
            ) : (
              <View
                style={[
                  styles.avatar,
                  { backgroundColor: theme.backgroundSecondary },
                ]}
              >
                <Feather name="user" size={40} color={theme.primary} />
              </View>
            )}
            <View style={[styles.editBadge, { backgroundColor: theme.primary }]}>
              <Feather name="camera" size={12} color="white" />
            </View>
          </Pressable>

          {isEditingName ? (
            <View style={styles.editRow}>
              <TextInput
                style={[
                  styles.editInput,
                  {
                    color: theme.text,
                    backgroundColor: theme.backgroundSecondary,
                    borderColor: theme.primary,
                  },
                ]}
                value={tempUsername}
                onChangeText={setTempUsername}
                placeholder="Enter your name"
                placeholderTextColor={theme.textSecondary}
                autoFocus
                onSubmitEditing={handleSaveUsername}
                returnKeyType="done"
              />
              <Pressable
                onPress={handleSaveUsername}
                style={[styles.saveButton, { backgroundColor: theme.primary }]}
              >
                <Feather name="check" size={18} color="white" />
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={startEditingName} style={styles.editableRow}>
              <ThemedText type="h3" style={styles.name}>
                {profile.username}
              </ThemedText>
              <Feather name="edit-2" size={16} color={theme.textSecondary} />
            </Pressable>
          )}

          {isEditingCompany ? (
            <View style={styles.editRow}>
              <TextInput
                style={[
                  styles.editInput,
                  styles.editInputSmall,
                  {
                    color: theme.text,
                    backgroundColor: theme.backgroundSecondary,
                    borderColor: theme.primary,
                  },
                ]}
                value={tempCompany}
                onChangeText={setTempCompany}
                placeholder="Enter company name"
                placeholderTextColor={theme.textSecondary}
                autoFocus
                onSubmitEditing={handleSaveCompany}
                returnKeyType="done"
              />
              <Pressable
                onPress={handleSaveCompany}
                style={[styles.saveButton, { backgroundColor: theme.primary }]}
              >
                <Feather name="check" size={18} color="white" />
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={startEditingCompany} style={styles.editableRow}>
              <ThemedText
                type="small"
                style={[styles.company, { color: theme.textSecondary }]}
              >
                {profile.companyName}
              </ThemedText>
              <Feather name="edit-2" size={12} color={theme.textSecondary} />
            </Pressable>
          )}
        </View>

        <View style={styles.statsContainer}>
          <View
            style={[styles.statCard, { backgroundColor: theme.backgroundDefault }]}
          >
            <ThemedText type="h2" style={{ color: theme.primary }}>
              {totalSubmissions}
            </ThemedText>
            <ThemedText
              type="small"
              style={{ color: theme.textSecondary }}
            >
              Total
            </ThemedText>
          </View>
          <View
            style={[styles.statCard, { backgroundColor: theme.backgroundDefault }]}
          >
            <ThemedText type="h2" style={{ color: theme.secondary }}>
              {pendingCount}
            </ThemedText>
            <ThemedText
              type="small"
              style={{ color: theme.textSecondary }}
            >
              Pending
            </ThemedText>
          </View>
          <View
            style={[styles.statCard, { backgroundColor: theme.backgroundDefault }]}
          >
            <ThemedText type="h2" style={{ color: theme.success }}>
              {postedCount}
            </ThemedText>
            <ThemedText
              type="small"
              style={{ color: theme.textSecondary }}
            >
              Posted
            </ThemedText>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText
            type="small"
            style={[styles.sectionTitle, { color: theme.textSecondary }]}
          >
            SUPPORT
          </ThemedText>
          <SettingsRow
            icon="help-circle"
            label="Help & FAQ"
            onPress={handleContactSupport}
          />
          <SettingsRow
            icon="mail"
            label="Contact Support"
            onPress={handleContactSupport}
          />
        </View>

        <PoweredByFooter />

        <ThemedText
          type="small"
          style={[styles.version, { color: theme.textSecondary }]}
        >
          Big Time Buyer Pic Portal v1.0.0
        </ThemedText>
      </KeyboardAwareScrollViewCompat>
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
  profileHeader: {
    alignItems: "center",
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  name: {
    marginBottom: Spacing.xs,
  },
  company: {},
  editableRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  editRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    width: "100%",
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  editInput: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    fontSize: 18,
    fontWeight: "600",
    borderWidth: 2,
  },
  editInputSmall: {
    fontSize: 14,
    fontWeight: "400",
    height: 40,
  },
  saveButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  statsContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
    marginLeft: Spacing.sm,
    fontWeight: "600",
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xs,
  },
  settingsRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  version: {
    textAlign: "center",
    marginTop: Spacing.xl,
  },
});
