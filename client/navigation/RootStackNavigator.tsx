import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import OverlaySelectScreen from "@/screens/OverlaySelectScreen";
import PreviewScreen from "@/screens/PreviewScreen";
import SuccessModal from "@/screens/SuccessModal";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type RootStackParamList = {
  Main: undefined;
  OverlaySelect: { photoUri: string };
  Preview: { photoUri: string; overlayId: string | null };
  Success: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Main"
        component={MainTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="OverlaySelect"
        component={OverlaySelectScreen}
        options={{
          headerTitle: "Choose Overlay",
        }}
      />
      <Stack.Screen
        name="Preview"
        component={PreviewScreen}
        options={{
          headerTitle: "Review",
        }}
      />
      <Stack.Screen
        name="Success"
        component={SuccessModal}
        options={{
          presentation: "transparentModal",
          headerShown: false,
          animation: "fade",
        }}
      />
    </Stack.Navigator>
  );
}
