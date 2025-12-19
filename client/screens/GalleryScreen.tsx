import React, { useCallback, useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Dimensions,
  RefreshControl,
  Pressable,
  Modal,
} from "react-native";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Colors, Spacing } from "@/constants/theme";
import { useSubmissions, Submission, getSubmissionPhotoUrl } from "@/hooks/useSubmissions";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

const { width, height } = Dimensions.get("window");
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

function VideoPlayerModal({ 
  videoUrl, 
  visible, 
  onClose 
}: { 
  videoUrl: string; 
  visible: boolean; 
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  
  const player = useVideoPlayer(visible ? videoUrl : null, player => {
    player.loop = false;
    player.play();
  });

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <Pressable 
          style={[styles.closeButton, { top: insets.top + Spacing.lg }]}
          onPress={onClose}
        >
          <Feather name="x" size={28} color="#FFFFFF" />
        </Pressable>
        <VideoView
          player={player}
          style={styles.fullscreenVideo}
          contentFit="contain"
          nativeControls={true}
        />
      </View>
    </Modal>
  );
}

function SubmissionCard({ 
  item, 
  onPress 
}: { 
  item: Submission;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const date = new Date(item.createdAt);
  const formattedDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  const isVideo = item.mediaType === "video";

  const handlePress = () => {
    Haptics.selectionAsync();
    onPress();
  };

  return (
    <Pressable 
      style={[styles.card, { backgroundColor: theme.backgroundDefault }]}
      onPress={handlePress}
    >
      <View style={styles.cardImageContainer}>
        <Image 
          source={{ uri: getSubmissionPhotoUrl(item.photoUrl) }} 
          style={styles.cardImage} 
        />
        {isVideo ? (
          <View style={styles.videoOverlay}>
            <View style={styles.playButton}>
              <Feather name="play" size={24} color="#FFFFFF" />
            </View>
          </View>
        ) : null}
      </View>
      <View style={styles.cardContent}>
        <View style={styles.cardMeta}>
          {isVideo ? (
            <Feather name="video" size={12} color={theme.textSecondary} style={{ marginRight: 4 }} />
          ) : null}
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {formattedDate}
          </ThemedText>
        </View>
        <StatusBadge status={item.status} />
      </View>
    </Pressable>
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
        Tap Create to take a photo or video and get started!
      </ThemedText>
    </View>
  );
}

export default function GalleryScreen() {
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { submissions, refreshSubmissions, isLoading } = useSubmissions();
  
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      refreshSubmissions();
    }, [refreshSubmissions])
  );

  const handleCardPress = (item: Submission) => {
    if (item.mediaType === "video") {
      setSelectedVideo(getSubmissionPhotoUrl(item.photoUrl));
    }
  };

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={submissions}
        keyExtractor={(item) => item.id}
        numColumns={2}
        renderItem={({ item }) => (
          <SubmissionCard 
            item={item} 
            onPress={() => handleCardPress(item)}
          />
        )}
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
      
      {selectedVideo ? (
        <VideoPlayerModal
          videoUrl={selectedVideo}
          visible={true}
          onClose={() => setSelectedVideo(null)}
        />
      ) : null}
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
  cardImageContainer: {
    position: "relative",
  },
  cardImage: {
    width: "100%",
    aspectRatio: 1,
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 4,
  },
  cardContent: {
    padding: Spacing.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardMeta: {
    flexDirection: "row",
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
  modalContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
  },
  closeButton: {
    position: "absolute",
    right: Spacing.lg,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  fullscreenVideo: {
    width: width,
    height: height * 0.7,
  },
});
