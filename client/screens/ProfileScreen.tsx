import React from "react";
import { View, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";
import { useSubmissions } from "@/hooks/useSubmissions";

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
  const { submissions, clearSubmissions } = useSubmissions();

  const totalSubmissions = submissions.length;
  const pendingCount = submissions.filter((s) => s.status === "pending").length;
  const postedCount = submissions.filter((s) => s.status === "posted").length;

  const handleContactSupport = async () => {
    await WebBrowser.openBrowserAsync("mailto:support@agency.com");
  };

  const handleClearData = () => {
    Alert.alert(
      "Clear All Data",
      "This will delete all your local submissions. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            clearSubmissions();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
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
          <View
            style={[
              styles.avatar,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <Feather name="user" size={40} color={theme.primary} />
          </View>
          <ThemedText type="h3" style={styles.name}>
            Agency Client
          </ThemedText>
          <ThemedText
            type="small"
            style={[styles.company, { color: theme.textSecondary }]}
          >
            Your Company Name
          </ThemedText>
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

        <View style={styles.section}>
          <ThemedText
            type="small"
            style={[styles.sectionTitle, { color: theme.textSecondary }]}
          >
            DATA
          </ThemedText>
          <SettingsRow
            icon="trash-2"
            label="Clear All Data"
            onPress={handleClearData}
            destructive
            showChevron={false}
          />
        </View>

        <ThemedText
          type="small"
          style={[styles.version, { color: theme.textSecondary }]}
        >
          Photo Portal v1.0.0
        </ThemedText>
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
  profileHeader: {
    alignItems: "center",
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  name: {
    marginBottom: Spacing.xs,
  },
  company: {},
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
