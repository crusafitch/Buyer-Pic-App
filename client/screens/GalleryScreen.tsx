import React, { useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Dimensions,
  RefreshControl,
} from "react-native";
import { Image } from "expo-image";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Colors, Spacing } from "@/constants/theme";
import { useSubmissions, Submission } from "@/hooks/useSubmissions";
import { Feather } from "@expo/vector-icons";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - Spacing.xl * 3) / 2;

function StatusBadge({ status }: { status: "pending" | "posted" }) {
  const isPending = status === "pending";
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: isPending
            ? Colors.light.secondary
            : Colors.light.success,
        },
      ]}
    >
      <ThemedText style={styles.badgeText}>
        {isPending ? "Pending" : "Posted"}
      </ThemedText>
    </View>
  );
}

function SubmissionCard({ item }: { item: Submission }) {
  const { theme } = useTheme();
  const date = new Date(item.createdAt);
  const formattedDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
      <Image source={{ uri: item.photoUri }} style={styles.cardImage} />
      <View style={styles.cardContent}>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {formattedDate}
        </ThemedText>
        <StatusBadge status={item.status} />
      </View>
    </View>
  );
}

function EmptyState() {
  const { theme } = useTheme();
  return (
    <View style={styles.emptyContainer}>
      <View
        style={[
          styles.emptyIconContainer,
          { backgroundColor: theme.backgroundSecondary },
        ]}
      >
        <Feather name="camera" size={48} color={theme.textSecondary} />
      </View>
      <ThemedText type="h4" style={styles.emptyTitle}>
        No submissions yet
      </ThemedText>
      <ThemedText
        type="body"
        style={[styles.emptyText, { color: theme.textSecondary }]}
      >
        Tap Create to take a photo and get started!
      </ThemedText>
    </View>
  );
}

export default function GalleryScreen() {
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { submissions, refreshSubmissions, isLoading } = useSubmissions();

  useFocusEffect(
    useCallback(() => {
      refreshSubmissions();
    }, [refreshSubmissions])
  );

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={submissions}
        keyExtractor={(item) => item.id}
        numColumns={2}
        renderItem={({ item }) => <SubmissionCard item={item} />}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
        ]}
        columnWrapperStyle={styles.row}
        ListEmptyComponent={<EmptyState />}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refreshSubmissions}
            tintColor={theme.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
    flexGrow: 1,
  },
  row: {
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
  },
  cardImage: {
    width: "100%",
    aspectRatio: 1,
  },
  cardContent: {
    padding: Spacing.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing["3xl"],
    paddingTop: Spacing["5xl"],
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  emptyText: {
    textAlign: "center",
  },
});
