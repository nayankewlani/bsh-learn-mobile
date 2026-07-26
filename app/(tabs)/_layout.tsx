import React, { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated } from "react-native";
import { Tabs, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "../../stores/authStore";
import { useThemeStore } from "../../stores/themeStore";
import { tabBarY } from "../../stores/tabBarStore";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

type IonName = React.ComponentProps<typeof Ionicons>["name"];

interface TabCfg {
  name: string;
  label: string;
  icon: IonName;
  iconFocused: IonName;
  special?: boolean;
  adminOnly?: boolean;
}

const TABS: TabCfg[] = [
  { name:"index",        label:"Home",    icon:"home-outline",                iconFocused:"home"                },
  { name:"consultation", label:"Consult", icon:"chatbubble-ellipses-outline", iconFocused:"chatbubble-ellipses", special:true },
  { name:"explore",      label:"Courses", icon:"book-outline",                iconFocused:"book"                },
  { name:"live",         label:"Live",    icon:"radio-outline",               iconFocused:"radio"               },
  { name:"dashboard",    label:"Learning",icon:"school-outline",              iconFocused:"school"              },
  { name:"store",        label:"Store",   icon:"bag-outline",                 iconFocused:"bag"                 },
  { name:"admin",        label:"Admin",   icon:"shield-outline",              iconFocused:"shield",  adminOnly:true },
];

// ── Custom Animated Tab Bar ───────────────────────────────────────────────────
function BSHTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { isDark } = useThemeStore();
  const isAdmin = user?.role === "admin";
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Continuous pulse for the special Consult button ring
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue:1.25, duration:1100, useNativeDriver:true }),
        Animated.timing(pulseAnim, { toValue:1,    duration:1100, useNativeDriver:true }),
      ])
    ).start();
    // Glow opacity fade
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue:1, duration:1400, useNativeDriver:true }),
        Animated.timing(glowAnim, { toValue:0.3, duration:1400, useNativeDriver:true }),
      ])
    ).start();
  }, []);

  const visibleTabs = TABS.filter(tab => !tab.adminOnly || isAdmin);
  const BAR_H = 62;
  const BOTTOM = insets.bottom + 10;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        tb.bar,
        {
          bottom: BOTTOM,
          height: BAR_H,
          backgroundColor: isDark ? "rgba(13,11,31,0.97)" : "rgba(255,255,255,0.97)",
          borderColor: isDark ? "rgba(124,58,237,0.28)" : "rgba(124,58,237,0.18)",
          transform: [{ translateY: tabBarY }],
        },
      ]}
    >
      {/* Subtle top accent line */}
      <View style={[tb.accentLine, { backgroundColor: isDark ? "rgba(124,58,237,0.5)" : "rgba(124,58,237,0.3)" }]} />

      {visibleTabs.map((tab) => {
        const routeIndex = state.routes.findIndex(r => r.name === tab.name);
        if (routeIndex === -1) return null;
        const route = state.routes[routeIndex];
        const focused = state.index === routeIndex;
        const { options } = descriptors[route.key];
        if (options.href === null) return null;

        const onPress = () => {
          const event = navigation.emit({ type:"tabPress", target:route.key, canPreventDefault:true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        // ── Special "Consult" button ──────────────────────────────────────────
        if (tab.special) {
          return (
            <TouchableOpacity
              key={tab.name}
              style={tb.specialWrap}
              onPress={onPress}
              activeOpacity={0.8}
            >
              {/* Pulsing glow ring */}
              <Animated.View
                style={[
                  tb.pulseRing,
                  {
                    transform: [{ scale: pulseAnim }],
                    opacity: glowAnim,
                    borderColor: focused ? "#a78bfa" : "rgba(124,58,237,0.45)",
                  },
                ]}
              />
              {/* Main button */}
              <View
                style={[
                  tb.specialBtn,
                  {
                    backgroundColor: focused ? "#7c3aed" : "#6d28d9",
                    shadowColor: "#7c3aed",
                    shadowOpacity: focused ? 0.75 : 0.45,
                    shadowRadius: focused ? 14 : 8,
                    elevation: focused ? 12 : 7,
                  },
                ]}
              >
                <Ionicons name={focused ? tab.iconFocused : tab.icon} size={21} color="#fff" />
              </View>
              <Text style={[tb.specialLabel, { color: focused ? "#a78bfa" : isDark ? "rgba(167,139,250,0.55)" : "rgba(124,58,237,0.55)" }]}
                numberOfLines={1}>
                {tab.label}
              </Text>
              {/* "NEW" badge */}
              {!focused && (
                <View style={tb.newBadge}>
                  <Text style={tb.newBadgeTxt}>FREE</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }

        // ── Regular tab ───────────────────────────────────────────────────────
        const color = focused
          ? "#a78bfa"
          : isDark ? "#6b7280" : "#9ca3af";

        return (
          <TouchableOpacity
            key={tab.name}
            style={tb.tab}
            onPress={onPress}
            activeOpacity={0.7}
          >
            <View style={[tb.iconWrap, focused && { backgroundColor: isDark ? "rgba(124,58,237,0.16)" : "rgba(124,58,237,0.1)" }]}>
              <Ionicons name={focused ? tab.iconFocused : tab.icon} size={20} color={color} />
              {/* Live red dot on Live tab */}
              {tab.name === "live" && (
                <View style={[tb.liveDot, { borderColor: isDark ? "#0d0b1f" : "#fff" }]} />
              )}
            </View>
            <Text style={[tb.label, { color }]} numberOfLines={1}>{tab.label}</Text>
            {/* Active underline dot */}
            {focused && <View style={tb.activeDot} />}
          </TouchableOpacity>
        );
      })}
    </Animated.View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const tb = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 14,
    right: 14,
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 6,
    paddingBottom: 10,
    paddingTop: 6,
    borderRadius: 26,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 24,
    overflow: "visible",
  },
  accentLine: {
    position: "absolute",
    top: 0,
    left: 40,
    right: 40,
    height: 2,
    borderRadius: 1,
  },

  // Regular tabs
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 0,
    gap: 2,
  },
  iconWrap: {
    width: 36,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  label: {
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 0.2,
    lineHeight: 11,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#a78bfa",
    marginTop: 2,
  },
  liveDot: {
    position: "absolute",
    top: 3,
    right: 2,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#ef4444",
    borderWidth: 1.5,
  },

  // Special Consult tab
  specialWrap: {
    flex: 1.3,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 0,
    position: "relative",
  },
  pulseRing: {
    position: "absolute",
    top: -22,
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1.5,
  },
  specialBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -18,
    marginBottom: 3,
    shadowOffset: { width: 0, height: 5 },
  },
  specialLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.3,
    lineHeight: 11,
  },
  newBadge: {
    position: "absolute",
    top: -20,
    right: 6,
    backgroundColor: "#22c55e",
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  newBadgeTxt: {
    color: "#fff",
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
});

// ── Layout ────────────────────────────────────────────────────────────────────
export default function TabLayout() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin";

  return (
    <Tabs
      tabBar={(props) => <BSHTabBar {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: "#13122a", borderBottomWidth: 0 },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "800", fontSize: 16 },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen name="index"        options={{ headerShown: false }} />
      <Tabs.Screen name="consultation" options={{ headerShown: false }} />
      <Tabs.Screen name="explore"      options={{ title: "Courses" }} />
      <Tabs.Screen name="live"         options={{ headerShown: false }} />
      <Tabs.Screen name="dashboard"    options={{ title: "My Learning" }} />
      <Tabs.Screen name="store"        options={{ title: "Store" }} />
      <Tabs.Screen name="admin"        options={{ title: "Admin", href: isAdmin ? undefined : null }} />
    </Tabs>
  );
}
