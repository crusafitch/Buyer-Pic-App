import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View } from "react-native";
import GalleryScreen from "@/screens/GalleryScreen";
import CreateScreen from "@/screens/CreateScreen";
import ProfileScreen from "@/screens/ProfileScreen";
import NewsScreen from "@/screens/NewsScreen";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Colors, Spacing } from "@/constants/theme";
import { BrandHeader } from "@/components/BrandHeader";

export type MainTabParamList = {
  GalleryTab: undefined;
  CreateTab: undefined;
  NewsTab: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Tab.Navigator
      initialRouteName="GalleryTab"
      screenOptions={{
        headerTitleAlign: "center",
        headerTintColor: theme.text,
        headerStyle: {
          backgroundColor: theme.backgroundRoot,
        },
        tabBarActiveTintColor: "#FFFFFF",
        tabBarInactiveTintColor: "rgba(255, 255, 255, 0.6)",
        tabBarStyle: {
          position: "absolute",
          backgroundColor: Colors.light.primary,
          borderTopWidth: 0,
          elevation: 0,
          borderTopLeftRadius: BorderRadius.xl,
          borderTopRightRadius: BorderRadius.xl,
          paddingTop: Spacing.sm,
          height: 90,
        },
        tabBarLabelStyle: {
          marginTop: 6,
        },
        tabBarBackground: () => null,
      }}
    >
      <Tab.Screen
        name="GalleryTab"
        component={GalleryScreen}
        options={{
          title: "Submissions",
          headerTitle: () => <BrandHeader />,
          tabBarLabel: "Gallery",
          tabBarIcon: ({ focused, size }) => (
            <Feather name="image" size={size} color="#FFFFFF" />
          ),
        }}
      />
      <Tab.Screen
        name="CreateTab"
        component={CreateScreen}
        options={{
          title: "Create",
          headerShown: false,
          tabBarLabel: "Create",
          tabBarIcon: ({ color, size, focused }) => (
            <View
              style={[
                styles.createIconContainer,
                {
                  backgroundColor: Colors.light.secondary,
                },
              ]}
            >
              <Feather name="camera" size={size - 4} color="#FFFFFF" />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="NewsTab"
        component={NewsScreen}
        options={{
          title: "News",
          headerTitle: () => <BrandHeader />,
          tabBarLabel: "News",
          tabBarIcon: ({ focused, size }) => (
            <Feather name="file-text" size={size} color="#FFFFFF" />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: "Profile",
          headerTitle: "Profile",
          tabBarLabel: "Profile",
          tabBarIcon: ({ focused, size }) => (
            <Feather name="user" size={size} color="#FFFFFF" />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  createIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
});
