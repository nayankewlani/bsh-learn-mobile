import { Tabs } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { FaHome, FaBook, FaVideo, FaUserGraduate } from "react-icons/fa";
import { COLORS } from "../../constants";

// Use emoji icons to avoid react-icons in native context
function TabIcon({ emoji, color }: { emoji: string; color: string }) {
  return <Text style={{ fontSize: 20, opacity: color === COLORS.primaryLight ? 1 : 0.5 }}>{emoji}</Text>;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: "#13122a",
          borderTopColor: "#1e1b4b",
          borderTopWidth: 1,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingBottom: 8,
          paddingTop: 6,
          height: 64,
          position: "absolute",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -8 },
          shadowOpacity: 0.4,
          shadowRadius: 16,
          elevation: 20,
        },
        tabBarActiveTintColor: COLORS.primaryLight,
        tabBarInactiveTintColor: "#6b7280",
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600", letterSpacing: 0.3 },
        headerStyle: { backgroundColor: "#13122a", borderBottomWidth: 0 },
        headerTintColor: COLORS.text,
        headerTitleStyle: { fontWeight: "800", fontSize: 16 },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          headerTitle: "BSHLearn",
          tabBarIcon: ({ color }) => <TabIcon emoji="🏠" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Courses",
          tabBarIcon: ({ color }) => <TabIcon emoji="📚" color={color} />,
        }}
      />
      <Tabs.Screen
        name="live"
        options={{
          title: "Live",
          tabBarIcon: ({ color }) => <TabIcon emoji="🔴" color={color} />,
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "My Learning",
          tabBarIcon: ({ color }) => <TabIcon emoji="🎓" color={color} />,
        }}
      />
    </Tabs>
  );
}
