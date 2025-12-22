import React from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from "react-native";
import { Image } from "expo-image";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useHeaderHeight } from "@react-navigation/elements";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";

interface BlogPost {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  imageUrl?: string;
}

export default function NewsScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const headerHeight = useHeaderHeight();

  const {
    data: posts,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery<BlogPost[]>({
    queryKey: ["/api/news"],
    staleTime: 5 * 60 * 1000,
  });

  const handleOpenPost = async (url: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Linking.openURL(url);
    } catch (error) {
      // Silent fail if can't open
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const stripHtml = (html: string) => {
    return html.replace(/<[^>]*>/g, "").trim();
  };

  const renderPost = ({ item }: { item: BlogPost }) => (
    <Pressable onPress={() => handleOpenPost(item.link)}>
      <Card style={styles.postCard}>
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.postImage}
            contentFit="cover"
          />
        ) : null}
        <View style={styles.postContent}>
          <View style={styles.postHeader}>
            <ThemedText type="h4" style={styles.postTitle} numberOfLines={2}>
              {item.title}
            </ThemedText>
            <Feather name="external-link" size={16} color={theme.textSecondary} />
          </View>
          <ThemedText
            type="body"
            style={[styles.postDescription, { color: theme.textSecondary }]}
            numberOfLines={3}
          >
            {stripHtml(item.description)}
          </ThemedText>
          <ThemedText
            type="small"
            style={[styles.postDate, { color: theme.textSecondary }]}
          >
            {formatDate(item.pubDate)}
          </ThemedText>
        </View>
      </Card>
    </Pressable>
  );

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <ThemedText
            type="body"
            style={[styles.loadingText, { color: theme.textSecondary }]}
          >
            Loading news...
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (error || !posts) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.emptyContainer}>
          <View
            style={[
              styles.emptyIconContainer,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <Feather name="alert-circle" size={48} color={theme.textSecondary} />
          </View>
          <ThemedText type="h4" style={styles.emptyTitle}>
            Could not load news
          </ThemedText>
          <ThemedText
            type="body"
            style={[styles.emptyText, { color: theme.textSecondary }]}
          >
            Please check your connection and try again.
          </ThemedText>
          <Pressable
            style={[styles.retryButton, { backgroundColor: theme.primary }]}
            onPress={() => refetch()}
          >
            <ThemedText style={{ color: "#FFFFFF", fontWeight: "600" }}>
              Try Again
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  if (posts.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.emptyContainer}>
          <View
            style={[
              styles.emptyIconContainer,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <Feather name="file-text" size={48} color={theme.textSecondary} />
          </View>
          <ThemedText type="h4" style={styles.emptyTitle}>
            No news yet
          </ThemedText>
          <ThemedText
            type="body"
            style={[styles.emptyText, { color: theme.textSecondary }]}
          >
            Check back later for updates from Big Time.
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item, index) => item.link || index.toString()}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={theme.primary}
            progressViewOffset={headerHeight}
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
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
  },
  loadingText: {
    marginTop: Spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  emptyText: {
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  retryButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  postCard: {
    overflow: "hidden",
  },
  postImage: {
    width: "100%",
    height: 180,
  },
  postContent: {
    padding: Spacing.lg,
  },
  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  postTitle: {
    flex: 1,
  },
  postDescription: {
    marginBottom: Spacing.sm,
    lineHeight: 20,
  },
  postDate: {
    marginTop: Spacing.xs,
  },
});
