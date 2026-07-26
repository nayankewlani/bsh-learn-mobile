import { useEffect } from "react";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useAuthStore } from "../stores/authStore";
import { COLORS } from "../constants";
import { registerPushToken, setupNotificationListeners } from "../services/notificationService";

export default function RootLayout() {
  const { loadUser, user } = useAuthStore();

  useEffect(() => { loadUser(); }, []);

  useEffect(() => {
    if (user) registerPushToken();
  }, [user]);

  useEffect(() => {
    return setupNotificationListeners(undefined, (response) => {
      const data = response.notification.request.content.data as { classId?: string; type?: string };
      if (data?.type === "live_session_started" && data.classId) {
        // Session is live right now — go straight into the call
        router.push({ pathname: "/live-room" as any, params: { classId: data.classId } });
      } else if (data?.type === "session_scheduled") {
        // Session confirmed but not live yet — show the Live tab so they can see it
        router.push("/(tabs)/live" as any);
      }
    });
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerStyle: { backgroundColor: COLORS.surface }, headerTintColor: COLORS.text, contentStyle: { backgroundColor: COLORS.bg } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
        <Stack.Screen name="course/[id]" options={{ title: "Course" }} />
        <Stack.Screen name="watch/[lessonId]" options={{ headerShown: false }} />
        <Stack.Screen name="consultation" options={{ headerShown: false }} />
        <Stack.Screen name="educator/[slug]" options={{ headerShown: false }} />
        <Stack.Screen name="coming-soon" options={{ headerShown: false }} />
        <Stack.Screen name="program/[slug]" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
