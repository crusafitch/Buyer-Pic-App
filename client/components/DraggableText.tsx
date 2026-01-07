import React from "react";
import { StyleSheet, Text } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from "react-native-reanimated";

export interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  fontStyle: "normal" | "bold" | "italic";
  fontSize: number;
}

interface DraggableTextProps {
  overlay: TextOverlay;
  onPositionChange: (id: string, x: number, y: number) => void;
  onSelect: (id: string) => void;
  isSelected: boolean;
  containerSize: number;
}

export function DraggableText({
  overlay,
  onPositionChange,
  onSelect,
  isSelected,
  containerSize,
}: DraggableTextProps) {
  const translateX = useSharedValue(overlay.x);
  const translateY = useSharedValue(overlay.y);
  const savedX = useSharedValue(overlay.x);
  const savedY = useSharedValue(overlay.y);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
      runOnJS(onSelect)(overlay.id);
    })
    .onUpdate((event) => {
      const newX = savedX.value + event.translationX;
      const newY = savedY.value + event.translationY;
      translateX.value = Math.max(0, Math.min(newX, containerSize - 50));
      translateY.value = Math.max(0, Math.min(newY, containerSize - 30));
    })
    .onEnd(() => {
      runOnJS(onPositionChange)(overlay.id, translateX.value, translateY.value);
    });

  const tapGesture = Gesture.Tap().onEnd(() => {
    runOnJS(onSelect)(overlay.id);
  });

  const composedGesture = Gesture.Simultaneous(panGesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[
          styles.textContainer,
          animatedStyle,
          isSelected && styles.selected,
        ]}
      >
        <Text
          style={[
            styles.text,
            {
              color: overlay.color,
              fontSize: overlay.fontSize,
              fontWeight: overlay.fontStyle === "bold" ? "bold" : "normal",
              fontStyle: overlay.fontStyle === "italic" ? "italic" : "normal",
            },
          ]}
        >
          {overlay.text}
        </Text>
      </Animated.View>
    </GestureDetector>
  );
}

export function StaticTextOverlay({ overlay }: { overlay: TextOverlay }) {
  return (
    <Text
      style={[
        styles.staticText,
        {
          left: overlay.x,
          top: overlay.y,
          color: overlay.color,
          fontSize: overlay.fontSize,
          fontWeight: overlay.fontStyle === "bold" ? "bold" : "normal",
          fontStyle: overlay.fontStyle === "italic" ? "italic" : "normal",
        },
      ]}
    >
      {overlay.text}
    </Text>
  );
}

const styles = StyleSheet.create({
  textContainer: {
    position: "absolute",
    padding: 4,
  },
  selected: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    borderStyle: "dashed",
  },
  text: {
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  staticText: {
    position: "absolute",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
